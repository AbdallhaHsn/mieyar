using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.RecurringEntries;

public record CreateRecurringJournalEntryCommand(CreateRecurringEntryRequest Request) : IRequest<Result<RecurringEntryDto>>;

public class CreateRecurringJournalEntryCommandHandler : IRequestHandler<CreateRecurringJournalEntryCommand, Result<RecurringEntryDto>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IRecurringJournalEntryRepository _recurringRepo;

    public CreateRecurringJournalEntryCommandHandler(
        IAccountRepository accountRepo,
        IRecurringJournalEntryRepository recurringRepo)
    {
        _accountRepo = accountRepo;
        _recurringRepo = recurringRepo;
    }

    public async Task<Result<RecurringEntryDto>> Handle(CreateRecurringJournalEntryCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        if (string.IsNullOrWhiteSpace(req.Title))
        {
            return Result.Failure<RecurringEntryDto>(new Error("RecurringEntry.TitleRequired", "عنوان القيد الدوري إلزامي"));
        }

        if (req.Lines == null || req.Lines.Count < 2)
        {
            return Result.Failure<RecurringEntryDto>(new Error("RecurringEntry.MinimumLines", "يجب أن يحتوي القيد الدوري على سطرين على الأقل"));
        }

        var totalDebit = req.Lines.Sum(l => l.Debit);
        var totalCredit = req.Lines.Sum(l => l.Credit);

        if (Math.Abs(totalDebit - totalCredit) > 0.001m || totalDebit <= 0)
        {
            return Result.Failure<RecurringEntryDto>(new Error("RecurringEntry.Unbalanced", $"القيد الدوري غير متوازن (إجمالي المدين: {totalDebit} ≠ إجمالي الدائن: {totalCredit})"));
        }

        var companyId = req.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var tenantId = companyId;

        var recurring = RecurringJournalEntry.Create(
            tenantId,
            companyId,
            req.Title,
            req.DescriptionAr,
            req.DescriptionEn ?? req.DescriptionAr,
            req.Frequency,
            req.StartDate,
            req.EndDate,
            "System");

        foreach (var l in req.Lines)
        {
            recurring.AddLine(l.AccountId, l.Debit, l.Credit, l.Description, l.CostCenterId);
        }

        await _recurringRepo.AddAsync(recurring, cancellationToken);
        await _recurringRepo.SaveChangesAsync(cancellationToken);

        var accounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        var lineDtos = recurring.Lines.Select(l =>
        {
            var acc = accounts.FirstOrDefault(a => a.Id == l.AccountId);
            return new RecurringEntryLineDto(
                l.Id,
                l.AccountId,
                acc?.AccountCode ?? "",
                acc?.NameAr ?? "",
                l.Debit,
                l.Credit,
                l.Description,
                l.CostCenterId,
                null);
        }).ToList();

        var freqNameAr = recurring.Frequency switch
        {
            RecurringFrequency.Monthly => "شهري",
            RecurringFrequency.Quarterly => "ربع سنوي",
            RecurringFrequency.SemiAnnually => "نصف سنوي",
            RecurringFrequency.Annually => "سنوي",
            _ => "دوري"
        };

        return Result.Success(new RecurringEntryDto(
            recurring.Id,
            recurring.Title,
            recurring.DescriptionAr,
            recurring.DescriptionEn,
            recurring.Frequency,
            freqNameAr,
            recurring.StartDate,
            recurring.EndDate,
            recurring.NextRunDate,
            recurring.LastRunDate,
            recurring.ExecutionCount,
            recurring.IsActive,
            totalDebit,
            totalCredit,
            lineDtos));
    }
}
