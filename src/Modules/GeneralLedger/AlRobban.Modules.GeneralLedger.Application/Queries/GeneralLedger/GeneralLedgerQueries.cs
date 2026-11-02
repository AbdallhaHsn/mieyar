using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.GeneralLedger;

public record GetGeneralLedgerOverviewQuery(
    Guid? CompanyId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? SearchTerm = null,
    Guid? CostCenterId = null,
    bool IncludeZeroBalances = true
) : IRequest<Result<GeneralLedgerReportDto>>;

public class GetGeneralLedgerOverviewQueryHandler : IRequestHandler<GetGeneralLedgerOverviewQuery, Result<GeneralLedgerReportDto>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetGeneralLedgerOverviewQueryHandler(
        IAccountRepository accountRepo,
        IJournalEntryRepository journalRepo,
        ICurrentTenantContext tenantContext)
    {
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<GeneralLedgerReportDto>> Handle(GetGeneralLedgerOverviewQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var fromDate = request.FromDate ?? new DateTime(DateTime.UtcNow.Year, 1, 1);
        var toDate = request.ToDate ?? DateTime.UtcNow;

        var allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        var postableAccounts = allAccounts.Where(a => a.IsPostable).ToList();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            postableAccounts = postableAccounts.Where(a =>
                a.AccountCode.ToLower().Contains(term) ||
                a.NameAr.ToLower().Contains(term) ||
                a.NameEn.ToLower().Contains(term)
            ).ToList();
        }

        var periodLines = await _journalRepo.GetPostedLinesAsync(
            companyId,
            fromDate,
            toDate,
            request.CostCenterId,
            cancellationToken);

        var overviewList = new List<GeneralLedgerAccountOverviewDto>();

        foreach (var acc in postableAccounts)
        {
            var accLines = periodLines.Where(l => l.AccountId == acc.Id).ToList();

            var periodDebit = accLines.Sum(l => l.Debit);
            var periodCredit = accLines.Sum(l => l.Credit);

            var netMovement = acc.AccountNature == AccountNature.Debit
                ? periodDebit - periodCredit
                : periodCredit - periodDebit;

            var openingBalance = await _journalRepo.GetAccountOpeningBalanceAsync(
                companyId,
                acc.Id,
                fromDate,
                acc.AccountNature,
                cancellationToken);

            var closingBalance = openingBalance + netMovement;

            if (!request.IncludeZeroBalances && openingBalance == 0 && periodDebit == 0 && periodCredit == 0)
            {
                continue;
            }

            var lastActivity = accLines
                .OrderByDescending(l => l.JournalEntry?.EntryDate)
                .Select(l => (DateTime?)l.JournalEntry?.EntryDate)
                .FirstOrDefault();

            overviewList.Add(new GeneralLedgerAccountOverviewDto(
                acc.Id,
                acc.AccountCode,
                acc.NameAr,
                acc.NameEn,
                acc.AccountType,
                acc.AccountNature,
                openingBalance,
                periodDebit,
                periodCredit,
                netMovement,
                closingBalance,
                accLines.Count,
                lastActivity
            ));
        }

        var sortedList = overviewList.OrderBy(x => x.AccountCode).ToList();

        var report = new GeneralLedgerReportDto(
            sortedList,
            fromDate,
            toDate,
            sortedList.Sum(x => x.OpeningBalance),
            sortedList.Sum(x => x.PeriodDebit),
            sortedList.Sum(x => x.PeriodCredit),
            sortedList.Sum(x => x.ClosingBalance),
            sortedList.Count(x => x.TransactionCount > 0 || x.OpeningBalance != 0)
        );

        return Result.Success(report);
    }
}

public record GetAccountStatementQuery(
    Guid AccountId,
    Guid? CompanyId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    Guid? CostCenterId = null
) : IRequest<Result<AccountStatementDto>>;

public class GetAccountStatementQueryHandler : IRequestHandler<GetAccountStatementQuery, Result<AccountStatementDto>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;

    public GetAccountStatementQueryHandler(
        IAccountRepository accountRepo,
        IJournalEntryRepository journalRepo)
    {
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
    }

    public async Task<Result<AccountStatementDto>> Handle(GetAccountStatementQuery request, CancellationToken cancellationToken)
    {
        var account = await _accountRepo.GetByIdAsync(request.AccountId, cancellationToken);
        if (account == null)
        {
            return Result.Failure<AccountStatementDto>(new Error("Account.NotFound", "الحساب المحاسبي غير موجود"));
        }

        var companyId = request.CompanyId ?? account.CompanyId;
        var fromDate = request.FromDate ?? new DateTime(DateTime.UtcNow.Year, 1, 1);
        var toDate = request.ToDate ?? DateTime.UtcNow;

        var openingBalance = await _journalRepo.GetAccountOpeningBalanceAsync(
            companyId,
            request.AccountId,
            fromDate,
            account.AccountNature,
            cancellationToken);

        var lines = await _journalRepo.GetLinesByAccountAsync(
            companyId,
            request.AccountId,
            fromDate,
            toDate,
            request.CostCenterId,
            postedOnly: true,
            cancellationToken);

        var statementLines = new List<AccountStatementLineDto>();
        decimal runningBalance = openingBalance;

        foreach (var l in lines)
        {
            var movement = account.AccountNature == AccountNature.Debit
                ? l.Debit - l.Credit
                : l.Credit - l.Debit;

            runningBalance += movement;

            statementLines.Add(new AccountStatementLineDto(
                l.Id,
                l.JournalEntryId,
                l.JournalEntry?.EntryNumber ?? string.Empty,
                l.JournalEntry?.EntryDate ?? DateTime.UtcNow,
                l.JournalEntry?.EntryType ?? JournalEntryType.Daily,
                l.JournalEntry?.ReferenceNumber,
                string.IsNullOrWhiteSpace(l.Description) ? (l.JournalEntry?.DescriptionAr ?? string.Empty) : l.Description,
                l.CostCenterId,
                l.CostCenter?.NameAr,
                l.Debit,
                l.Credit,
                runningBalance
            ));
        }

        var totalDebit = statementLines.Sum(x => x.Debit);
        var totalCredit = statementLines.Sum(x => x.Credit);
        var netMovement = account.AccountNature == AccountNature.Debit
            ? totalDebit - totalCredit
            : totalCredit - totalDebit;

        var header = new AccountStatementAccountHeaderDto(
            account.Id,
            account.AccountCode,
            account.NameAr,
            account.NameEn,
            account.AccountType,
            account.AccountNature,
            account.CurrencyCode,
            account.ParentAccount?.NameAr
        );

        var dto = new AccountStatementDto(
            header,
            fromDate,
            toDate,
            openingBalance,
            totalDebit,
            totalCredit,
            netMovement,
            runningBalance,
            statementLines.Count,
            statementLines
        );

        return Result.Success(dto);
    }
}
