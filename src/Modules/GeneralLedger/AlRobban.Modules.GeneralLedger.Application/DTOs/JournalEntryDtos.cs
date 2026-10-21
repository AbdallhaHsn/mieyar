using AlRobban.Modules.GeneralLedger.Domain.Enums;

namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

public record JournalEntryLineDto(
    Guid Id,
    int LineNumber,
    Guid AccountId,
    string AccountCode,
    string AccountNameAr,
    string AccountNameEn,
    decimal Debit,
    decimal Credit,
    string Description,
    Guid? CostCenterId,
    string? CostCenterName);

public record JournalEntryDto(
    Guid Id,
    Guid CompanyId,
    string EntryNumber,
    DateTime EntryDate,
    Guid FiscalPeriodId,
    string FiscalPeriodNameAr,
    string FiscalPeriodNameEn,
    JournalEntryType EntryType,
    JournalEntryStatus Status,
    string? ReferenceNumber,
    string DescriptionAr,
    string DescriptionEn,
    decimal TotalDebit,
    decimal TotalCredit,
    Guid? ReversedEntryId,
    string? ReversalReason,
    DateTime? PostedAtUtc,
    string? PostedBy,
    DateTime CreatedAtUtc,
    string? CreatedBy,
    List<JournalEntryLineDto> Lines);

public record JournalEntrySummaryDto(
    Guid Id,
    string EntryNumber,
    DateTime EntryDate,
    string FiscalPeriodNameAr,
    JournalEntryType EntryType,
    JournalEntryStatus Status,
    string? ReferenceNumber,
    string DescriptionAr,
    string DescriptionEn,
    decimal TotalDebit,
    decimal TotalCredit,
    int LinesCount,
    DateTime? PostedAtUtc,
    string? PostedBy,
    DateTime CreatedAtUtc);

public record JournalEntryKpiDto(
    int TotalEntries,
    int PostedEntries,
    int DraftEntries,
    int ReversedEntries,
    decimal TotalDebitVolume,
    decimal TotalCreditVolume);

public record JournalEntriesListResultDto(
    List<JournalEntrySummaryDto> Items,
    int TotalCount,
    JournalEntryKpiDto Kpi);
