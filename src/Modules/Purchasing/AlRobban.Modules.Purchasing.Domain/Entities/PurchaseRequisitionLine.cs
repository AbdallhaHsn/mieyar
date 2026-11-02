using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class PurchaseRequisitionLine : Entity<Guid>, IMustHaveTenant
{
    public Guid TenantId { get; set; }
    public Guid RequisitionId { get; private set; }
    public int LineNumber { get; private set; }

    public Guid? ItemId { get; private set; }
    public string ItemCode { get; private set; } = string.Empty;
    public string ItemNameAr { get; private set; } = string.Empty;
    public string ItemNameEn { get; private set; } = string.Empty;
    public string UnitOfMeasure { get; private set; } = "حبة";

    public decimal QuantityRequested { get; private set; }
    public decimal EstimatedUnitPrice { get; private set; }
    public decimal EstimatedTotal => Math.Round(QuantityRequested * EstimatedUnitPrice, 4);

    public string? WarehouseCode { get; private set; }
    public Guid? CostCenterId { get; private set; }
    public string? Notes { get; private set; }

    private PurchaseRequisitionLine() { }

    public static PurchaseRequisitionLine Create(
        Guid tenantId,
        Guid requisitionId,
        int lineNumber,
        string itemNameAr,
        string itemNameEn,
        decimal quantityRequested,
        decimal estimatedUnitPrice,
        string unitOfMeasure = "حبة",
        Guid? itemId = null,
        string? itemCode = null,
        string? warehouseCode = null,
        Guid? costCenterId = null,
        string? notes = null)
    {
        if (quantityRequested <= 0)
        {
            throw new ArgumentException("الكمية المطلوبة يجب أن تكون أكبر من صفر.", nameof(quantityRequested));
        }

        return new PurchaseRequisitionLine
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            RequisitionId = requisitionId,
            LineNumber = lineNumber,
            ItemId = itemId,
            ItemCode = itemCode ?? string.Empty,
            ItemNameAr = itemNameAr.Trim(),
            ItemNameEn = itemNameEn?.Trim() ?? string.Empty,
            UnitOfMeasure = string.IsNullOrWhiteSpace(unitOfMeasure) ? "حبة" : unitOfMeasure.Trim(),
            QuantityRequested = quantityRequested,
            EstimatedUnitPrice = Math.Max(0, estimatedUnitPrice),
            WarehouseCode = warehouseCode,
            CostCenterId = costCenterId,
            Notes = notes?.Trim()
        };
    }
}
