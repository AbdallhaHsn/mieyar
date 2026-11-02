using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

public record FixedAssetDto(
    Guid Id,
    string AssetCode,
    string NameAr,
    string NameEn,
    Guid AssetAccountId,
    string AssetAccountCode,
    string AssetAccountNameAr,
    Guid AccumulatedDepreciationAccountId,
    string AccumulatedDepreciationAccountCode,
    string AccumulatedDepreciationAccountNameAr,
    Guid DepreciationExpenseAccountId,
    string DepreciationExpenseAccountCode,
    string DepreciationExpenseAccountNameAr,
    Guid? CostCenterId,
    string? CostCenterNameAr,
    DateTime PurchaseDate,
    DateTime DepreciationStartDate,
    decimal AcquisitionCost,
    decimal SalvageValue,
    int UsefulLifeMonths,
    DepreciationMethod DepreciationMethod,
    string DepreciationMethodNameAr,
    decimal DepreciationRate,
    decimal CurrentBookValue,
    decimal TotalAccumulatedDepreciation,
    DateTime? LastDepreciationDate,
    FixedAssetStatus Status,
    string StatusNameAr,
    string? SerialNumber,
    string? Location,
    string? Notes,
    decimal MonthlyDepreciationAmount,
    List<AssetDepreciationHistoryDto> Histories);

public record AssetDepreciationHistoryDto(
    Guid Id,
    DateTime DepreciationDate,
    int PeriodNumber,
    int FiscalYear,
    decimal DepreciationAmount,
    decimal BookValueBefore,
    decimal BookValueAfter,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    DateTime CreatedAtUtc,
    string CreatedBy);

public record CreateFixedAssetRequest(
    Guid? CompanyId,
    string NameAr,
    string? NameEn,
    Guid AssetAccountId,
    Guid AccumulatedDepreciationAccountId,
    Guid DepreciationExpenseAccountId,
    Guid? CostCenterId,
    DateTime PurchaseDate,
    DateTime? DepreciationStartDate,
    decimal AcquisitionCost,
    decimal SalvageValue,
    int UsefulLifeMonths,
    DepreciationMethod DepreciationMethod,
    decimal DepreciationRate,
    string? SerialNumber,
    string? Location,
    string? Notes);

public record RunDepreciationRequest(
    Guid? CompanyId,
    DateTime DepreciationDate,
    string? Notes);

public record DepreciationPreviewItemDto(
    Guid AssetId,
    string AssetCode,
    string NameAr,
    decimal AcquisitionCost,
    decimal CurrentBookValue,
    decimal MonthlyDepreciationAmount,
    decimal NewBookValue,
    string ExpenseAccountCode,
    string ExpenseAccountNameAr,
    string AccumAccountCode,
    string AccumAccountNameAr);

public record DepreciationPreviewDto(
    DateTime TargetDate,
    int EligibleAssetsCount,
    decimal TotalDepreciationAmount,
    List<DepreciationPreviewItemDto> Items);

public record RunDepreciationResultDto(
    Guid JournalEntryId,
    string JournalEntryNumber,
    DateTime DepreciationDate,
    int DepreciatedAssetsCount,
    decimal TotalDepreciationAmount,
    string Message);

public record DisposeFixedAssetRequest(
    Guid? CompanyId,
    DateTime DisposalDate,
    decimal SalePrice,
    Guid? ProceedsAccountId,
    Guid? GainLossAccountId,
    string Reason,
    string? Notes = null);

public record DisposeFixedAssetResultDto(
    Guid AssetId,
    string AssetCode,
    string NameAr,
    decimal AcquisitionCost,
    decimal TotalAccumulatedDepreciation,
    decimal BookValueAtDisposal,
    decimal SalePrice,
    decimal GainOrLossAmount,
    bool IsGain,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    string Message);

// Financial & Valuation Reports (IAS 16)
public record FixedAssetFinancialReportDto(
    Guid CompanyId,
    DateTime AsOfDate,
    int? FiscalYear,
    FixedAssetReportTotalsDto Totals,
    List<FixedAssetCategorySummaryDto> Categories,
    List<FixedAssetMovementCategoryDto> MovementSchedule,
    List<FixedAssetDisposalReportItemDto> Disposals);

public record FixedAssetReportTotalsDto(
    int TotalAssetsCount,
    int ActiveCount,
    int FullyDepreciatedCount,
    int DisposedCount,
    decimal TotalAcquisitionCost,
    decimal TotalSalvageValue,
    decimal TotalAccumulatedDepreciation,
    decimal TotalNetBookValue,
    decimal TotalPeriodDepreciation,
    decimal TotalGainsOnDisposals,
    decimal TotalLossesOnDisposals);

public record FixedAssetCategorySummaryDto(
    Guid AssetAccountId,
    string AccountCode,
    string AccountNameAr,
    int AssetCount,
    decimal TotalCost,
    decimal TotalSalvage,
    decimal TotalAccumulated,
    decimal NetBookValue,
    decimal DepreciationRatioPercent,
    List<FixedAssetDto> Assets);

public record FixedAssetMovementCategoryDto(
    string CategoryNameAr,
    string AccountCode,
    decimal OpeningCost,
    decimal AdditionsCost,
    decimal DisposalsCost,
    decimal ClosingCost,
    decimal OpeningAccumulated,
    decimal PeriodDepreciation,
    decimal DisposalsAccumulated,
    decimal ClosingAccumulated,
    decimal OpeningBookValue,
    decimal ClosingBookValue);

public record FixedAssetDisposalReportItemDto(
    Guid AssetId,
    string AssetCode,
    string NameAr,
    string NameEn,
    DateTime? DisposalDate,
    string? Reason,
    decimal AcquisitionCost,
    decimal AccumulatedDepreciationAtDisposal,
    decimal BookValueAtDisposal,
    decimal SalePrice,
    decimal GainOrLossAmount,
    bool IsGain,
    string? JournalEntryNumber);


