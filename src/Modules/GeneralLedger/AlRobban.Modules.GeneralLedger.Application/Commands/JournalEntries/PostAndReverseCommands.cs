using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;

public record PostJournalEntryCommand(Guid Id, string? PostedBy) : IRequest<Result<bool>>, AlRobban.Shared.Application.Abstractions.ITransactionalCommand
{
    public string TransactionModule => AlRobban.Shared.Application.Abstractions.TransactionModules.GeneralLedger;
}

public class PostJournalEntryCommandHandler : IRequestHandler<PostJournalEntryCommand, Result<bool>>
{
    private readonly IJournalEntryRepository _journalRepo;
    private readonly IFinancialSettingsRepository _settingsRepo;
    private readonly IAccountRepository _accountRepo;

    public PostJournalEntryCommandHandler(
        IJournalEntryRepository journalRepo,
        IFinancialSettingsRepository settingsRepo,
        IAccountRepository accountRepo)
    {
        _journalRepo = journalRepo;
        _settingsRepo = settingsRepo;
        _accountRepo = accountRepo;
    }

    public async Task<Result<bool>> Handle(PostJournalEntryCommand request, CancellationToken cancellationToken)
    {
        var entry = await _journalRepo.GetByIdAsync(request.Id, cancellationToken);
        if (entry == null)
        {
            return Result.Failure<bool>(new Error("JournalEntry.NotFound", "القيد غير موجود"));
        }

        if (entry.Status != JournalEntryStatus.Draft)
        {
            return Result.Failure<bool>(new Error("JournalEntry.NotDraft", "القيد ليس في حالة مسودة"));
        }

        var period = await _settingsRepo.GetPeriodByIdAsync(entry.FiscalPeriodId, cancellationToken);
        if (period == null || period.Status != FiscalPeriodStatus.Open)
        {
            return Result.Failure<bool>(new Error("JournalEntry.PeriodLocked", "لا يمكن ترحيل القيد لأن الفترة المحاسبية مغلقة أو مقفلة"));
        }

        entry.Post(request.PostedBy ?? "المدير المالي", isPeriodOpen: true);

        // Update account balances
        foreach (var line in entry.Lines)
        {
            var account = await _accountRepo.GetByIdAsync(line.AccountId, cancellationToken);
            if (account != null)
            {
                if (line.Debit > 0)
                {
                    account.UpdateBalance(line.Debit, AccountNature.Debit);
                }
                if (line.Credit > 0)
                {
                    account.UpdateBalance(line.Credit, AccountNature.Credit);
                }
            }
        }

        await _journalRepo.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public record ReverseJournalEntryCommand(Guid Id, string Reason, string? ReversedBy) : IRequest<Result<JournalEntryDto>>, AlRobban.Shared.Application.Abstractions.ITransactionalCommand
{
    public string TransactionModule => AlRobban.Shared.Application.Abstractions.TransactionModules.GeneralLedger;
}

public class ReverseJournalEntryCommandHandler : IRequestHandler<ReverseJournalEntryCommand, Result<JournalEntryDto>>
{
    private readonly IJournalEntryRepository _journalRepo;
    private readonly IFinancialSettingsRepository _settingsRepo;
    private readonly IAccountRepository _accountRepo;

    public ReverseJournalEntryCommandHandler(
        IJournalEntryRepository journalRepo,
        IFinancialSettingsRepository settingsRepo,
        IAccountRepository accountRepo)
    {
        _journalRepo = journalRepo;
        _settingsRepo = settingsRepo;
        _accountRepo = accountRepo;
    }

    public async Task<Result<JournalEntryDto>> Handle(ReverseJournalEntryCommand request, CancellationToken cancellationToken)
    {
        var originalEntry = await _journalRepo.GetByIdAsync(request.Id, cancellationToken);
        if (originalEntry == null)
        {
            return Result.Failure<JournalEntryDto>(new Error("JournalEntry.NotFound", "القيد غير موجود"));
        }

        if (originalEntry.Status != JournalEntryStatus.Posted)
        {
            return Result.Failure<JournalEntryDto>(new Error("JournalEntry.NotPosted", "لا يمكن عكس إلا القيود المرحلة فقط"));
        }

        var period = await _settingsRepo.GetPeriodByIdAsync(originalEntry.FiscalPeriodId, cancellationToken);
        if (period == null || period.Status != FiscalPeriodStatus.Open)
        {
            return Result.Failure<JournalEntryDto>(new Error("JournalEntry.PeriodLocked", "لا يمكن عكس القيد لأن الفترة المحاسبية مغلقة أو مقفلة"));
        }

        var revNumber = await _journalRepo.GenerateNextEntryNumberAsync(originalEntry.CompanyId, DateTime.UtcNow.Year, cancellationToken);
        var reversalEntry = originalEntry.CreateReversal(revNumber, request.ReversedBy ?? "المدير المالي", request.Reason);

        // Reverse account balances: original Debits become Credits (subtract) and original Credits become Debits (subtract)
        foreach (var line in reversalEntry.Lines)
        {
            var account = await _accountRepo.GetByIdAsync(line.AccountId, cancellationToken);
            if (account != null)
            {
                if (line.Debit > 0)
                {
                    account.UpdateBalance(line.Debit, AccountNature.Debit);
                }
                if (line.Credit > 0)
                {
                    account.UpdateBalance(line.Credit, AccountNature.Credit);
                }
            }
        }

        await _journalRepo.AddAsync(reversalEntry, cancellationToken);
        await _journalRepo.SaveChangesAsync(cancellationToken);

        var saved = await _journalRepo.GetByIdAsync(reversalEntry.Id, cancellationToken);
        var dto = new JournalEntryDto(
            saved!.Id,
            saved.CompanyId,
            saved.EntryNumber,
            saved.EntryDate,
            saved.FiscalPeriodId,
            period.PeriodNameAr,
            period.PeriodNameEn,
            saved.EntryType,
            saved.Status,
            saved.ReferenceNumber,
            saved.DescriptionAr,
            saved.DescriptionEn,
            saved.TotalDebit,
            saved.TotalCredit,
            saved.ReversedEntryId,
            saved.ReversalReason,
            saved.PostedAtUtc,
            saved.PostedBy,
            saved.CreatedAtUtc,
            saved.CreatedBy,
            saved.Lines.Select(l => new JournalEntryLineDto(
                l.Id,
                l.LineNumber,
                l.AccountId,
                l.Account?.AccountCode ?? string.Empty,
                l.Account?.NameAr ?? string.Empty,
                l.Account?.NameEn ?? string.Empty,
                l.Debit,
                l.Credit,
                l.Description,
                l.CostCenterId,
                l.CostCenter?.NameAr
            )).ToList()
        );

        return Result.Success(dto);
    }
}
