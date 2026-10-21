using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.JournalEntries;

public record GetJournalEntriesQuery(
    Guid? CompanyId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    JournalEntryStatus? Status = null,
    string? SearchTerm = null,
    int Skip = 0,
    int Take = 50) : IRequest<Result<JournalEntriesListResultDto>>;

public class GetJournalEntriesQueryHandler : IRequestHandler<GetJournalEntriesQuery, Result<JournalEntriesListResultDto>>
{
    private readonly IJournalEntryRepository _journalRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetJournalEntriesQueryHandler(
        IJournalEntryRepository journalRepo,
        ICurrentTenantContext tenantContext)
    {
        _journalRepo = journalRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<JournalEntriesListResultDto>> Handle(GetJournalEntriesQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");

        var entries = await _journalRepo.GetListAsync(
            companyId,
            request.FromDate,
            request.ToDate,
            request.Status,
            request.SearchTerm,
            request.Skip,
            request.Take,
            cancellationToken);

        var totalCount = await _journalRepo.GetCountAsync(
            companyId,
            request.FromDate,
            request.ToDate,
            request.Status,
            request.SearchTerm,
            cancellationToken);

        // Calculate KPIs across all company entries
        var allEntries = await _journalRepo.GetListAsync(
            companyId,
            skip: 0,
            take: 1000,
            cancellationToken: cancellationToken);

        var kpi = new JournalEntryKpiDto(
            TotalEntries: allEntries.Count,
            PostedEntries: allEntries.Count(x => x.Status == JournalEntryStatus.Posted),
            DraftEntries: allEntries.Count(x => x.Status == JournalEntryStatus.Draft),
            ReversedEntries: allEntries.Count(x => x.Status == JournalEntryStatus.Reversed),
            TotalDebitVolume: allEntries.Where(x => x.Status == JournalEntryStatus.Posted).Sum(x => x.TotalDebit),
            TotalCreditVolume: allEntries.Where(x => x.Status == JournalEntryStatus.Posted).Sum(x => x.TotalCredit));

        var items = entries.Select(e => new JournalEntrySummaryDto(
            e.Id,
            e.EntryNumber,
            e.EntryDate,
            e.FiscalPeriod?.PeriodNameAr ?? string.Empty,
            e.EntryType,
            e.Status,
            e.ReferenceNumber,
            e.DescriptionAr,
            e.DescriptionEn,
            e.TotalDebit,
            e.TotalCredit,
            e.Lines.Count,
            e.PostedAtUtc,
            e.PostedBy,
            e.CreatedAtUtc
        )).ToList();

        return Result.Success(new JournalEntriesListResultDto(items, totalCount, kpi));
    }
}

public record GetJournalEntryByIdQuery(Guid Id) : IRequest<Result<JournalEntryDto>>;

public class GetJournalEntryByIdQueryHandler : IRequestHandler<GetJournalEntryByIdQuery, Result<JournalEntryDto>>
{
    private readonly IJournalEntryRepository _journalRepo;

    public GetJournalEntryByIdQueryHandler(IJournalEntryRepository journalRepo)
    {
        _journalRepo = journalRepo;
    }

    public async Task<Result<JournalEntryDto>> Handle(GetJournalEntryByIdQuery request, CancellationToken cancellationToken)
    {
        var e = await _journalRepo.GetByIdAsync(request.Id, cancellationToken);
        if (e == null)
        {
            return Result.Failure<JournalEntryDto>(new Error("JournalEntry.NotFound", "القيد غير موجود"));
        }

        var dto = new JournalEntryDto(
            e.Id,
            e.CompanyId,
            e.EntryNumber,
            e.EntryDate,
            e.FiscalPeriodId,
            e.FiscalPeriod?.PeriodNameAr ?? string.Empty,
            e.FiscalPeriod?.PeriodNameEn ?? string.Empty,
            e.EntryType,
            e.Status,
            e.ReferenceNumber,
            e.DescriptionAr,
            e.DescriptionEn,
            e.TotalDebit,
            e.TotalCredit,
            e.ReversedEntryId,
            e.ReversalReason,
            e.PostedAtUtc,
            e.PostedBy,
            e.CreatedAtUtc,
            e.CreatedBy,
            e.Lines.Select(l => new JournalEntryLineDto(
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
