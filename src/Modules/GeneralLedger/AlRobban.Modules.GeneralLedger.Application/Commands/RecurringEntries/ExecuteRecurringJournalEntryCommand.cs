using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.RecurringEntries;

public record ExecuteRecurringJournalEntryCommand(Guid RecurringEntryId, DateTime? ExecutionDate = null) : IRequest<Result<ExecuteRecurringEntryResultDto>>;

public class ExecuteRecurringJournalEntryCommandHandler : IRequestHandler<ExecuteRecurringJournalEntryCommand, Result<ExecuteRecurringEntryResultDto>>
{
    private readonly IRecurringJournalEntryRepository _recurringRepo;
    private readonly IMediator _mediator;

    public ExecuteRecurringJournalEntryCommandHandler(
        IRecurringJournalEntryRepository recurringRepo,
        IMediator mediator)
    {
        _recurringRepo = recurringRepo;
        _mediator = mediator;
    }

    public async Task<Result<ExecuteRecurringEntryResultDto>> Handle(ExecuteRecurringJournalEntryCommand command, CancellationToken cancellationToken)
    {
        var recurring = await _recurringRepo.GetByIdAsync(command.RecurringEntryId, cancellationToken);

        if (recurring == null)
        {
            return Result.Failure<ExecuteRecurringEntryResultDto>(new Error("RecurringEntry.NotFound", "القيد الدوري المحدد غير موجود"));
        }

        if (!recurring.IsActive)
        {
            return Result.Failure<ExecuteRecurringEntryResultDto>(new Error("RecurringEntry.Inactive", "هذا القيد الدوري غير نشط أو انتهت فترة تكراره"));
        }

        var runDate = command.ExecutionDate?.Date ?? recurring.NextRunDate.Date;

        // Build Journal Entry Lines from Template
        var lines = recurring.Lines.Select(l => new CreateJournalEntryLineRequest(
            l.AccountId,
            l.Debit,
            l.Credit,
            l.Description,
            l.CostCenterId)).ToList();

        var refNum = $"REC-{recurring.Id.ToString()[..6].ToUpperInvariant()}-{recurring.ExecutionCount + 1}";
        var journalCommand = new CreateJournalEntryCommand(
            recurring.CompanyId,
            runDate,
            JournalEntryType.Daily,
            DescriptionAr: $"{recurring.DescriptionAr} (دورة {runDate:yyyy-MM})",
            DescriptionEn: $"{recurring.DescriptionEn} (Cycle {runDate:yyyy-MM})",
            ReferenceNumber: refNum,
            PostImmediately: true,
            Lines: lines);

        var journalResult = await _mediator.Send(journalCommand, cancellationToken);
        if (journalResult.IsFailure)
        {
            return Result.Failure<ExecuteRecurringEntryResultDto>(journalResult.Error);
        }

        // Advance NextRunDate
        recurring.RecordExecution(runDate, "System");
        await _recurringRepo.SaveChangesAsync(cancellationToken);

        var message = $"تم توليد وترحيل القيد الدوري بنجاح برقم [{journalResult.Value.EntryNumber}]، وموعد التشغيل القادم هو {recurring.NextRunDate:yyyy-MM-dd}.";

        return Result.Success(new ExecuteRecurringEntryResultDto(
            recurring.Id,
            journalResult.Value.Id,
            journalResult.Value.EntryNumber,
            runDate,
            recurring.NextRunDate,
            message));
    }
}
