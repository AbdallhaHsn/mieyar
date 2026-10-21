using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.BankReconciliation;

public record GetBankAccountsForReconciliationQuery(Guid? CompanyId = null) : IRequest<Result<List<BankAccountSummaryDto>>>;

public class GetBankAccountsForReconciliationQueryHandler : IRequestHandler<GetBankAccountsForReconciliationQuery, Result<List<BankAccountSummaryDto>>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;

    public GetBankAccountsForReconciliationQueryHandler(
        IAccountRepository accountRepo,
        IJournalEntryRepository journalRepo)
    {
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
    }

    public async Task<Result<List<BankAccountSummaryDto>>> Handle(GetBankAccountsForReconciliationQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);

        // Filter genuine bank accounts (under Current Assets / Cash & Banks and has Bank/مصرف/بنك or code 11102/11103)
        var bankAccounts = allAccounts.Where(a =>
            a.IsPostable && 
            a.AccountCode.StartsWith("1") && 
            !a.AccountCode.StartsWith("112") && // Exclude receivables
            (
                a.AccountCode.StartsWith("11102") ||
                a.AccountCode.StartsWith("11103") ||
                a.NameAr.Contains("بنك") ||
                a.NameAr.Contains("مصرف") ||
                a.NameEn.ToLower().Contains("bank")
            )).ToList();

        if (!bankAccounts.Any())
        {
            bankAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("111")).ToList();
        }

        var result = new List<BankAccountSummaryDto>();
        var now = DateTime.UtcNow;

        foreach (var acc in bankAccounts)
        {
            var lines = await _journalRepo.GetPostedLinesAsync(companyId, new DateTime(2020, 1, 1), now, null, cancellationToken);
            var accLines = lines.Where(l => l.AccountId == acc.Id).ToList();
            var debit = accLines.Sum(l => l.Debit);
            var credit = accLines.Sum(l => l.Credit);
            var currentBalance = debit - credit;

            result.Add(new BankAccountSummaryDto(
                acc.Id,
                acc.AccountCode,
                acc.NameAr,
                acc.NameEn,
                currentBalance));
        }

        return Result.Success(result);
    }
}
