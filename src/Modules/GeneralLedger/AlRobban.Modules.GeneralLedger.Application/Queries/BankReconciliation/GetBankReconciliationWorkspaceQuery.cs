using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.BankReconciliation;

public record GetBankReconciliationWorkspaceQuery(
    Guid CompanyId,
    Guid BankAccountId,
    DateTime StatementDate,
    decimal StatementEndingBalance) : IRequest<Result<BankReconciliationWorkspaceDto>>;

public class GetBankReconciliationWorkspaceQueryHandler : IRequestHandler<GetBankReconciliationWorkspaceQuery, Result<BankReconciliationWorkspaceDto>>
{
    private readonly IBankReconciliationRepository _recRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;

    public GetBankReconciliationWorkspaceQueryHandler(
        IBankReconciliationRepository recRepo,
        IAccountRepository accountRepo,
        IJournalEntryRepository journalRepo)
    {
        _recRepo = recRepo;
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
    }

    public async Task<Result<BankReconciliationWorkspaceDto>> Handle(GetBankReconciliationWorkspaceQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId != Guid.Empty ? request.CompanyId : Guid.Parse("11111111-2222-3333-4444-555555555555");
        var account = await _accountRepo.GetByIdAsync(request.BankAccountId, cancellationToken);
        if (account == null)
        {
            return Result.Failure<BankReconciliationWorkspaceDto>(new Error("BankReconciliation.AccountNotFound", "حساب البنك المحدد غير موجود"));
        }

        var endOfDay = request.StatementDate.Date.AddDays(1).AddTicks(-1);

        // 1. Fetch all posted journal lines for this bank account up to statement date
        var postedLines = await _journalRepo.GetPostedLinesAsync(
            companyId,
            new DateTime(2020, 1, 1),
            endOfDay,
            null,
            cancellationToken);

        var bankLines = postedLines.Where(l => l.AccountId == request.BankAccountId).ToList();

        // 2. Compute Book Balance (Debit - Credit)
        var totalDebits = bankLines.Sum(l => l.Debit);
        var totalCredits = bankLines.Sum(l => l.Credit);
        var bookBalance = totalDebits - totalCredits;

        // 3. Find journal lines already matched in COMPLETED reconciliations to exclude them
        var completedMatchedLineIds = await _recRepo.GetCompletedMatchedLineIdsAsync(request.BankAccountId, cancellationToken);

        var unReconciledLines = bankLines
            .Where(l => !completedMatchedLineIds.Contains(l.Id))
            .ToList();

        // 4. Check if there is an existing DRAFT reconciliation for this account & date
        var existingDraft = await _recRepo.GetDraftByAccountAndDateAsync(
            companyId,
            request.BankAccountId,
            request.StatementDate,
            cancellationToken);

        var draftMatchedLineIds = existingDraft?.Items
            .Where(i => i.IsMatched)
            .Select(i => i.JournalEntryLineId)
            .ToHashSet() ?? new HashSet<Guid>();

        // 5. Map transactions
        var transactions = unReconciledLines.Select(l =>
        {
            var isMatched = draftMatchedLineIds.Contains(l.Id);
            return new BankReconciliationTransactionDto(
                JournalEntryLineId: l.Id,
                TransactionDate: l.JournalEntry?.EntryDate ?? request.StatementDate,
                EntryNumber: l.JournalEntry?.EntryNumber ?? "",
                ReferenceNumber: l.JournalEntry?.ReferenceNumber,
                Description: string.IsNullOrWhiteSpace(l.Description) ? (l.JournalEntry?.DescriptionAr ?? "") : l.Description,
                Debit: l.Debit,
                Credit: l.Credit,
                NetAmount: l.Debit - l.Credit,
                IsMatched: isMatched);
        })
        .OrderByDescending(t => t.TransactionDate)
        .ThenByDescending(t => t.EntryNumber)
        .ToList();

        // 6. Calculate Totals
        var clearedDeposits = transactions.Where(t => t.IsMatched).Sum(t => t.Debit);
        var clearedWithdrawals = transactions.Where(t => t.IsMatched).Sum(t => t.Credit);
        var clearedBalance = clearedDeposits - clearedWithdrawals;

        // In standard reconciliation:
        // Outstanding / uncleared deposits = deposits not matched
        // Outstanding / uncleared cheques = withdrawals not matched
        // Adjusted Book Balance = BookBalance (transactions accounted for)
        // Difference = StatementEndingBalance - (BookBalance - UnclearedNet)
        var unclearedDeposits = transactions.Where(t => !t.IsMatched).Sum(t => t.Debit);
        var unclearedWithdrawals = transactions.Where(t => !t.IsMatched).Sum(t => t.Credit);
        var adjustedBankBalance = request.StatementEndingBalance + unclearedDeposits - unclearedWithdrawals;
        var difference = adjustedBankBalance - bookBalance;

        return Result.Success(new BankReconciliationWorkspaceDto(
            BankAccountId: account.Id,
            BankAccountCode: account.AccountCode,
            BankAccountNameAr: account.NameAr,
            StatementDate: request.StatementDate.Date,
            BookBalance: bookBalance,
            StatementEndingBalance: request.StatementEndingBalance,
            ClearedDeposits: clearedDeposits,
            ClearedWithdrawals: clearedWithdrawals,
            ClearedBalance: clearedBalance,
            Difference: difference,
            Transactions: transactions));
    }
}
