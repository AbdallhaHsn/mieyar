using AlRobban.Modules.GeneralLedger.Application.Common;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FinancialStatements;

public record GetEquityStatementQuery(
    Guid? CompanyId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null) : IRequest<Result<EquityStatementReportDto>>;

public class GetEquityStatementQueryHandler : IRequestHandler<GetEquityStatementQuery, Result<EquityStatementReportDto>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetEquityStatementQueryHandler(
        IAccountRepository accountRepo,
        IJournalEntryRepository journalRepo,
        ICurrentTenantContext tenantContext)
    {
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<EquityStatementReportDto>> Handle(GetEquityStatementQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var now = DateTime.UtcNow;

        var fromDate = request.FromDate ?? new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var toDate = request.ToDate ?? new DateTime(now.Year, now.Month, now.Day, 23, 59, 59, DateTimeKind.Utc);

        var allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);

        // Fetch lines up to fromDate (Beginning Balance)
        var beginningLines = await _journalRepo.GetPostedLinesAsync(companyId, null, fromDate.AddSeconds(-1), null, cancellationToken);

        // Fetch lines in period (fromDate to toDate)
        var periodLines = await _journalRepo.GetPostedLinesAsync(companyId, fromDate, toDate, null, cancellationToken);

        // Account mapping helpers
        var shareCapitalAccounts = allAccounts.Where(a => a.AccountCode.StartsWith("31") && a.IsPostable).Select(a => a.Id).ToHashSet();
        var statutoryReserveAccounts = allAccounts.Where(a => a.AccountCode == "32101" && a.IsPostable).Select(a => a.Id).ToHashSet();
        var retainedEarningsAccounts = allAccounts.Where(a => a.AccountCode == "32102" && a.IsPostable).Select(a => a.Id).ToHashSet();
        var revenueAccounts = allAccounts.Where(a => a.AccountType == AccountType.Revenue && a.IsPostable).Select(a => a.Id).ToHashSet();
        var expenseAccounts = allAccounts.Where(a => a.AccountType == AccountType.Expense && a.IsPostable).Select(a => a.Id).ToHashSet();

        decimal CalcEquityCreditBalance(HashSet<Guid> accIds, IEnumerable<JournalEntryLine> lines)
        {
            var matched = lines.Where(l => accIds.Contains(l.AccountId)).ToList();
            return matched.Sum(l => l.Credit) - matched.Sum(l => l.Debit);
        }

        // 1. Beginning Balances
        var begCapital = CalcEquityCreditBalance(shareCapitalAccounts, beginningLines);
        var begReserve = CalcEquityCreditBalance(statutoryReserveAccounts, beginningLines);
        var begRetained = CalcEquityCreditBalance(retainedEarningsAccounts, beginningLines);

        // Beginning Net Income from previous period prior to closing
        var begRev = beginningLines.Where(l => revenueAccounts.Contains(l.AccountId)).Sum(l => l.Credit - l.Debit);
        var begExp = beginningLines.Where(l => expenseAccounts.Contains(l.AccountId)).Sum(l => l.Debit - l.Credit);
        var begPriorIncome = begRev - begExp;
        begRetained += begPriorIncome;

        var begTotal = begCapital + begReserve + begRetained;

        // 2. Net Income for the period
        var pRev = periodLines.Where(l => revenueAccounts.Contains(l.AccountId)).Sum(l => l.Credit - l.Debit);
        var pExp = periodLines.Where(l => expenseAccounts.Contains(l.AccountId)).Sum(l => l.Debit - l.Credit);
        var periodNetIncome = pRev - pExp;

        // 3. Capital changes in period
        var pCapCredit = periodLines.Where(l => shareCapitalAccounts.Contains(l.AccountId)).Sum(l => l.Credit - l.Debit);

        // 4. Statutory Reserve transfer in period
        var pReserveTransfer = periodLines.Where(l => statutoryReserveAccounts.Contains(l.AccountId)).Sum(l => l.Credit - l.Debit);

        // 5. Dividends / Distributions in period (Debits to Retained Earnings)
        var pDividends = periodLines.Where(l => retainedEarningsAccounts.Contains(l.AccountId)).Sum(l => l.Debit - l.Credit);
        if (pDividends < 0) pDividends = 0;

        // Rows construction according to IAS 1
        var rows = new List<EquityStatementRowDto>();

        // Row 1: Beginning Balance
        rows.Add(new EquityStatementRowDto(
            $"الرصيد في {fromDate:yyyy/MM/dd} (بداية الفترة)",
            $"Beginning Balance as of {fromDate:yyyy-MM-dd}",
            begCapital,
            begReserve,
            begRetained,
            0m,
            begTotal,
            IsBold: true));

        // Row 2: Capital Injections / Additions
        if (pCapCredit != 0)
        {
            rows.Add(new EquityStatementRowDto(
                "زيادة / تعديل رأس المال المدفوع",
                "Capital Injections / Additions",
                pCapCredit,
                0m,
                0m,
                0m,
                pCapCredit,
                IsBold: false));
        }

        // Row 3: Net Profit / Loss for the period
        rows.Add(new EquityStatementRowDto(
            periodNetIncome >= 0 ? "صافي أرباح الفترة المالية (من قائمة الدخل)" : "صافي خسائر الفترة المالية (من قائمة الدخل)",
            periodNetIncome >= 0 ? "Net Profit for the Period" : "Net Loss for the Period",
            0m,
            0m,
            0m,
            periodNetIncome,
            periodNetIncome,
            IsBold: false));

        // Row 4: Transfers to Statutory Reserve
        if (pReserveTransfer != 0)
        {
            rows.Add(new EquityStatementRowDto(
                "المحول إلى الاحتياطي النظامي (10% نظام الشركات)",
                "Transfers to Statutory Reserve (10%)",
                0m,
                pReserveTransfer,
                -pReserveTransfer,
                0m,
                0m,
                IsBold: false));
        }

        // Row 5: Dividends
        if (pDividends > 0)
        {
            rows.Add(new EquityStatementRowDto(
                "توزيعات الأرباح النقدية المعتمدة",
                "Dividends Declared & Distributed",
                0m,
                0m,
                -pDividends,
                0m,
                -pDividends,
                IsBold: false));
        }

        // Ending Balances
        var endCapital = begCapital + pCapCredit;
        var endReserve = begReserve + pReserveTransfer;
        var endRetained = begRetained - (pReserveTransfer != 0 ? pReserveTransfer : 0m) - pDividends;
        var endProfit = periodNetIncome;
        var endTotal = endCapital + endReserve + endRetained + endProfit;

        // Row 6: Ending Balance
        rows.Add(new EquityStatementRowDto(
            $"الرصيد في {toDate:yyyy/MM/dd} (نهاية الفترة)",
            $"Ending Balance as of {toDate:yyyy-MM-dd}",
            endCapital,
            endReserve,
            endRetained,
            endProfit,
            endTotal,
            IsBold: true));

        var tafqeet = ArabicCurrencyTafqeet.Convert(endTotal);

        var report = new EquityStatementReportDto(
            CompanyId: companyId,
            CompanyNameAr: "شركة الربان للحلول الذكية",
            CompanyNameEn: "Al-Roban Smart Solutions Co.",
            CommercialRegistration: "1010789456",
            TaxNumber: "310245678900003",
            FromDate: fromDate,
            ToDate: toDate,
            Currency: "SAR",
            Rows: rows,
            EndingTotalEquity: endTotal,
            EndingEquityTafqeetAr: tafqeet,
            GeneratedAtUtc: DateTime.UtcNow);

        return Result.Success(report);
    }
}
