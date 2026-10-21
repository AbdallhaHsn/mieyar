using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

public record RecurringEntryDto(
    Guid Id,
    string Title,
    string DescriptionAr,
    string DescriptionEn,
    RecurringFrequency Frequency,
    string FrequencyNameAr,
    DateTime StartDate,
    DateTime? EndDate,
    DateTime NextRunDate,
    DateTime? LastRunDate,
    int ExecutionCount,
    bool IsActive,
    decimal TotalDebit,
    decimal TotalCredit,
    List<RecurringEntryLineDto> Lines);

public record RecurringEntryLineDto(
    Guid Id,
    Guid AccountId,
    string AccountCode,
    string AccountNameAr,
    decimal Debit,
    decimal Credit,
    string Description,
    Guid? CostCenterId,
    string? CostCenterNameAr);

public record CreateRecurringEntryRequest(
    Guid? CompanyId,
    string Title,
    string DescriptionAr,
    string? DescriptionEn,
    RecurringFrequency Frequency,
    DateTime StartDate,
    DateTime? EndDate,
    List<CreateRecurringLineRequest> Lines);

public record CreateRecurringLineRequest(
    Guid AccountId,
    decimal Debit,
    decimal Credit,
    string Description,
    Guid? CostCenterId);

public record ExecuteRecurringEntryResultDto(
    Guid RecurringEntryId,
    Guid JournalEntryId,
    string JournalEntryNumber,
    DateTime ExecutionDate,
    DateTime NextRunDate,
    string Message);
