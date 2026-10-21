using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.BankReconciliationCommands;

public record SaveBankReconciliationCommand(SaveBankReconciliationRequest Request) : IRequest<Result<BankReconciliationResultDto>>;

public class SaveBankReconciliationCommandHandler : IRequestHandler<SaveBankReconciliationCommand, Result<BankReconciliationResultDto>>
{
    private readonly IBankReconciliationRepository _recRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public SaveBankReconciliationCommandHandler(
        IBankReconciliationRepository recRepo,
        IAccountRepository accountRepo,
        IJournalEntryRepository journalRepo,
        ICurrentTenantContext tenantContext)
    {
        _recRepo = recRepo;
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<BankReconciliationResultDto>> Handle(SaveBankReconciliationCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = req.CompanyId != Guid.Empty ? req.CompanyId : Guid.Parse("11111111-2222-3333-4444-555555555555");

        var bankAccount = await _accountRepo.GetByIdAsync(req.BankAccountId, cancellationToken);
        if (bankAccount == null)
        {
            return Result.Failure<BankReconciliationResultDto>(new Error("BankReconciliation.AccountNotFound", "حساب البنك غير موجود"));
        }

        var endOfDay = req.StatementDate.Date.AddDays(1).AddTicks(-1);

        // Fetch lines for book balance
        var postedLines = await _journalRepo.GetPostedLinesAsync(companyId, new DateTime(2020, 1, 1), endOfDay, null, cancellationToken);
        var bankLines = postedLines.Where(l => l.AccountId == req.BankAccountId).ToList();
        var bookBalance = bankLines.Sum(l => l.Debit) - bankLines.Sum(l => l.Credit);

        // Check if existing draft exists
        var existing = await _recRepo.GetDraftByAccountAndDateAsync(
            companyId,
            req.BankAccountId,
            req.StatementDate,
            cancellationToken);

        Domain.Entities.BankReconciliation reconciliation;

        if (existing != null)
        {
            reconciliation = existing;
            _recRepo.RemoveItems(reconciliation.Items);
            reconciliation.Items.Clear();
        }
        else
        {
            // Sequential reconciliation number: e.g. BRC-2026-0001
            var count = await _recRepo.GetCountForYearAsync(companyId, req.StatementDate.Year, cancellationToken);

            var recNumber = $"BRC-{req.StatementDate.Year}-{(count + 1):D5}";

            reconciliation = Domain.Entities.BankReconciliation.Create(
                tenantId,
                companyId,
                req.BankAccountId,
                recNumber,
                req.StatementDate,
                req.StatementEndingBalance,
                bookBalance,
                req.Notes,
                "Admin / Accountant");

            await _recRepo.AddAsync(reconciliation, cancellationToken);
        }

        var matchedSet = req.MatchedJournalLineIds.ToHashSet();

        foreach (var line in bankLines)
        {
            var isMatched = matchedSet.Contains(line.Id);
            reconciliation.AddItem(
                line.Id,
                line.JournalEntry?.EntryDate ?? req.StatementDate,
                line.JournalEntry?.ReferenceNumber ?? line.JournalEntry?.EntryNumber,
                line.Description,
                line.Debit,
                line.Credit,
                isMatched);
        }

        reconciliation.RecalculateTotals();

        if (req.Finalize)
        {
            reconciliation.Complete("Admin / Accountant");
        }

        await _recRepo.SaveChangesAsync(cancellationToken);

        var statusAr = reconciliation.Status == BankReconciliationStatus.Completed ? "معتمدة ومطابقة" : "مسودة قيد المطابقة";

        return Result.Success(new BankReconciliationResultDto(
            ReconciliationId: reconciliation.Id,
            ReconciliationNumber: reconciliation.ReconciliationNumber,
            BankAccountId: bankAccount.Id,
            BankAccountCode: bankAccount.AccountCode,
            BankAccountNameAr: bankAccount.NameAr,
            StatementDate: reconciliation.StatementDate,
            StatementEndingBalance: reconciliation.StatementEndingBalance,
            BookBalance: reconciliation.BookBalance,
            ClearedDeposits: reconciliation.ClearedDeposits,
            ClearedWithdrawals: reconciliation.ClearedWithdrawals,
            Difference: reconciliation.Difference,
            Status: reconciliation.Status,
            StatusNameAr: statusAr,
            ReconciledAtUtc: reconciliation.ReconciledAtUtc,
            ReconciledBy: reconciliation.ReconciledBy,
            Notes: reconciliation.Notes));
    }
}
