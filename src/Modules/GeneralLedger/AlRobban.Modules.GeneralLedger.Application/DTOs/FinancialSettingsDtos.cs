using AlRobban.Modules.GeneralLedger.Domain.Enums;

namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

public record FiscalPeriodDto(
    Guid Id,
    int PeriodNumber,
    string PeriodNameAr,
    string PeriodNameEn,
    DateTime StartDate,
    DateTime EndDate,
    FiscalPeriodStatus Status,
    bool IsClosingPeriod);

public record FiscalYearDto(
    Guid Id,
    int YearNumber,
    string NameAr,
    string NameEn,
    DateTime StartDate,
    DateTime EndDate,
    bool IsActive,
    bool IsClosed,
    List<FiscalPeriodDto> Periods);

public record CostCenterDto(
    Guid Id,
    string Code,
    string NameAr,
    string NameEn,
    string? Description,
    Guid? ParentCostCenterId,
    bool IsActive,
    List<CostCenterDto> SubCostCenters);

public record CompanyFinancialSettingsDto(
    Guid Id,
    Guid CompanyId,
    string DefaultCurrency,
    CalendarType CalendarType,
    CostCenterPolicy CostCenterPolicy,
    bool AllowBackdatedEntries,
    int MaxBackdatedDays,
    bool RequireApprovalForEntries,
    bool Include13thClosingPeriod);

public record FinancialSettingsOverviewDto(
    CompanyFinancialSettingsDto Settings,
    FiscalYearDto? ActiveFiscalYear,
    List<FiscalYearDto> AllFiscalYears,
    List<CostCenterDto> CostCenters);
