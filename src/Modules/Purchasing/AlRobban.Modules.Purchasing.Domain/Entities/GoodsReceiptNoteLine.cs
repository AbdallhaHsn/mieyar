using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class GoodsReceiptNoteLine : Entity<Guid>, IMustHaveTenant
{
    public Guid TenantId { get; set; }
    public Guid GoodsReceiptNoteId { get; private set; }
    public int LineNumber { get; private set; }

    public Guid? PurchaseOrderLineId { get; private set; }
    public Guid? ItemId { get; private set; }
    public string ItemCode { get; private set; } = string.Empty;
    public string ItemNameAr { get; private set; } = string.Empty;
    public string ItemNameEn { get; private set; } = string.Empty;
    public string UnitOfMeasure { get; private set; } = "حبة";

    public decimal QuantityOrdered { get; private set; }
    public decimal QuantityReceived { get; private set; }
    public decimal QuantityAccepted { get; private set; }
    public decimal QuantityRejected { get; private set; }
    public string? RejectionReason { get; private set; }

    public decimal UnitCost { get; private set; }
    public decimal TotalValue => Math.Round(QuantityAccepted * UnitCost, 4);

    public string WarehouseCode { get; private set; } = "WH-01";
    public string? Notes { get; private set; }

    private GoodsReceiptNoteLine() { }

    public static GoodsReceiptNoteLine Create(
        Guid tenantId,
        Guid goodsReceiptNoteId,
        int lineNumber,
        string itemNameAr,
        string itemNameEn,
        decimal quantityOrdered,
        decimal quantityReceived,
        decimal quantityAccepted,
        decimal quantityRejected,
        decimal unitCost,
        string unitOfMeasure = "حبة",
        string warehouseCode = "WH-01",
        Guid? itemId = null,
        string? itemCode = null,
        Guid? purchaseOrderLineId = null,
        string? rejectionReason = null,
        string? notes = null)
    {
        return new GoodsReceiptNoteLine
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            GoodsReceiptNoteId = goodsReceiptNoteId,
            LineNumber = lineNumber,
            PurchaseOrderLineId = purchaseOrderLineId,
            ItemId = itemId,
            ItemCode = itemCode ?? string.Empty,
            ItemNameAr = itemNameAr.Trim(),
            ItemNameEn = itemNameEn?.Trim() ?? string.Empty,
            UnitOfMeasure = string.IsNullOrWhiteSpace(unitOfMeasure) ? "حبة" : unitOfMeasure.Trim(),
            QuantityOrdered = quantityOrdered,
            QuantityReceived = quantityReceived,
            QuantityAccepted = quantityAccepted,
            QuantityRejected = quantityRejected,
            RejectionReason = rejectionReason?.Trim(),
            UnitCost = Math.Max(0, unitCost),
            WarehouseCode = string.IsNullOrWhiteSpace(warehouseCode) ? "WH-01" : warehouseCode.Trim(),
            Notes = notes?.Trim()
        };
    }
}
