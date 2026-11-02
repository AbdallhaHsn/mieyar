using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class PurchaseOrderLine : Entity<Guid>, IMustHaveTenant
{
    public Guid TenantId { get; set; }
    public Guid PurchaseOrderId { get; private set; }
    public int LineNumber { get; private set; }

    public Guid? ItemId { get; private set; }
    public string ItemCode { get; private set; } = string.Empty;
    public string ItemNameAr { get; private set; } = string.Empty;
    public string ItemNameEn { get; private set; } = string.Empty;
    public string UnitOfMeasure { get; private set; } = "حبة";

    public decimal QuantityOrdered { get; private set; }
    public decimal QuantityReceived { get; private set; }
    public decimal QuantityBilled { get; private set; }

    public decimal UnitPrice { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal SubTotal => Math.Round(QuantityOrdered * UnitPrice, 4);
    public decimal TaxableAmount => Math.Max(0, SubTotal - DiscountAmount);
    public decimal VatRate { get; private set; } = 15.00m;
    public decimal VatAmount => Math.Round(TaxableAmount * (VatRate / 100m), 4);
    public decimal TotalAmount => Math.Round(TaxableAmount + VatAmount, 4);

    public string? WarehouseCode { get; private set; }
    public Guid? CostCenterId { get; private set; }
    public string? Notes { get; private set; }

    private PurchaseOrderLine() { }

    public static PurchaseOrderLine Create(
        Guid tenantId,
        Guid purchaseOrderId,
        int lineNumber,
        string itemNameAr,
        string itemNameEn,
        decimal quantityOrdered,
        decimal unitPrice,
        decimal discountAmount = 0,
        decimal vatRate = 15.00m,
        string unitOfMeasure = "حبة",
        Guid? itemId = null,
        string? itemCode = null,
        string? warehouseCode = null,
        Guid? costCenterId = null,
        string? notes = null)
    {
        if (quantityOrdered <= 0)
        {
            throw new ArgumentException("الكمية المطلوبة يجب أن تكون أكبر من صفر.", nameof(quantityOrdered));
        }

        return new PurchaseOrderLine
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PurchaseOrderId = purchaseOrderId,
            LineNumber = lineNumber,
            ItemId = itemId,
            ItemCode = itemCode ?? string.Empty,
            ItemNameAr = itemNameAr.Trim(),
            ItemNameEn = itemNameEn?.Trim() ?? string.Empty,
            QuantityOrdered = quantityOrdered,
            QuantityReceived = 0,
            QuantityBilled = 0,
            UnitPrice = Math.Max(0, unitPrice),
            DiscountAmount = Math.Max(0, discountAmount),
            VatRate = vatRate,
            UnitOfMeasure = string.IsNullOrWhiteSpace(unitOfMeasure) ? "حبة" : unitOfMeasure.Trim(),
            WarehouseCode = warehouseCode,
            CostCenterId = costCenterId,
            Notes = notes?.Trim()
        };
    }

    public void RecordReceivedQuantity(decimal additionalQty)
    {
        QuantityReceived += additionalQty;
    }

    public void RecordBilledQuantity(decimal additionalQty)
    {
        QuantityBilled += additionalQty;
    }
}
