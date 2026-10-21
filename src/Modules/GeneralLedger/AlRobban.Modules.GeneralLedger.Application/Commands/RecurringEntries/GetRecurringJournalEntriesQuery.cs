using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.RecurringEntries;

public record GetRecurringJournalEntriesQuery(Guid? CompanyId) : IRequest<Result<List<RecurringEntryDto>>>;

public class GetRecurringJournalEntriesQueryHandler : IRequestHandler<GetRecurringJournalEntriesQuery, Result<List<RecurringEntryDto>>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IRecurringJournalEntryRepository _recurringRepo;

    public GetRecurringJournalEntriesQueryHandler(
        IAccountRepository accountRepo,
        IRecurringJournalEntryRepository recurringRepo)
    {
        _accountRepo = accountRepo;
        _recurringRepo = recurringRepo;
    }

    public async Task<Result<List<RecurringEntryDto>>> Handle(GetRecurringJournalEntriesQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        var entries = await _recurringRepo.GetListAsync(companyId, cancellationToken);

        var accounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);

        var dtos = entries.Select(recurring =>
        {
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

            return new RecurringEntryDto(
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
                lineDtos.Sum(l => l.Debit),
                lineDtos.Sum(l => l.Credit),
                lineDtos);
        }).ToList();

        return Result.Success(dtos);
    }
}
