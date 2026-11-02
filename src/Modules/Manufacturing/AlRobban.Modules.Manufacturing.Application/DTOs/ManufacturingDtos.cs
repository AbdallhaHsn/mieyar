using AlRobban.Modules.Manufacturing.Domain.Enums;

namespace AlRobban.Modules.Manufacturing.Application.DTOs;

public record BomComponentDto(
    Guid Id,
    Guid? ItemId,
    string ItemCode,
    string ItemNameAr,
    string ItemNameEn,
    decimal QuantityRequired,
    string UnitOfMeasure,
    decimal ScrapPercentage,
    decimal UnitCost,
    decimal TotalCost);

public record BomOperationDto(
    Guid Id,
    string OperationNameAr,
    string OperationNameEn,
    Guid? WorkstationId,
    string WorkstationName,
    decimal StandardTimeMinutes,
    decimal HourlyLaborRate,
    decimal HourlyOverheadRate,
    decimal TotalOperationCost);

public record BillOfMaterialsDto(
    Guid Id,
    Guid CompanyId,
    string Code,
    string NameAr,
    string NameEn,
    string FinishedProductId,
    string FinishedProductCode,
    string FinishedProductNameAr,
    string FinishedProductNameEn,
    decimal OutputQuantity,
    string UnitOfMeasure,
    Guid? RawMaterialsWarehouseId,
    string RawMaterialsWarehouseName,
    Guid? FinishedGoodsWarehouseId,
    string FinishedGoodsWarehouseName,
    decimal TotalMaterialCost,
    decimal TotalLaborCost,
    decimal TotalOverheadCost,
    decimal TotalUnitCost,
    bool IsActive,
    string Version,
    string? Notes,
    List<BomComponentDto> Components,
    List<BomOperationDto> Operations);

public record WorkOrderComponentConsumptionDto(
    Guid Id,
    Guid? ItemId,
    string ItemCode,
    string ItemNameAr,
    decimal Quantity,
    string Unit,
    decimal TotalCost);

public record WorkOrderDto(
    Guid Id,
    Guid CompanyId,
    string WorkOrderNumber,
    Guid BomId,
    string BomCode,
    string FinishedProductId,
    string FinishedProductCode,
    string FinishedProductNameAr,
    string FinishedProductNameEn,
    decimal PlannedQuantity,
    decimal CompletedQuantity,
    decimal RejectedQuantity,
    string UnitOfMeasure,
    string StartDate,
    string DueDate,
    string? CompletedDate,
    string Status,
    string Priority,
    string AssignedSupervisor,
    string AssignedWorkstation,
    string RawMaterialsWarehouseName,
    string FinishedGoodsWarehouseName,
    decimal EstimatedTotalCost,
    decimal ActualMaterialCost,
    decimal ActualLaborCost,
    decimal ActualOverheadCost,
    decimal TotalActualCost,
    decimal UnitActualCost,
    string? Notes,
    List<WorkOrderComponentConsumptionDto> ComponentsConsumed);

public record WorkstationDto(
    Guid Id,
    Guid CompanyId,
    string Code,
    string NameAr,
    string NameEn,
    string Type,
    decimal HourlyCost,
    decimal CapacityPerDayHours,
    decimal EfficiencyPercentage,
    string Status,
    string Location);

public record RawMaterialItemDto(
    Guid Id,
    Guid? CompanyId,
    string ItemCode,
    string NameAr,
    string NameEn,
    string Category,
    string CategoryAr,
    string CategoryEn,
    string UnitOfMeasure,
    decimal UnitCost,
    decimal CurrentStock,
    string WarehouseName,
    decimal? MinStockLevel,
    string? Notes);

public record ManufacturingMetricsDto(
    int TotalWorkOrders,
    int ActiveWorkOrders,
    int CompletedWorkOrders,
    int TotalBoms,
    decimal TotalProductionCost,
    decimal EfficiencyRate,
    int TotalRawMaterials,
    decimal RawMaterialsInventoryValue);
