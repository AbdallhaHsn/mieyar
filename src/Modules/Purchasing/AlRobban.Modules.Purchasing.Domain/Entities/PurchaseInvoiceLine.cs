using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class PurchaseInvoiceLine : Entity<Guid>, IMustHaveTenant
{
    public Guid TenantId { get; set; }
    public Guid PurchaseInvoiceId { get; private set; }
    public PurchaseInvoice? PurchaseInvoice { get; private set; }

    public int LineNumber { get; private set; }

    public Guid? ItemId { get; private set; }
    public Item? Item { get; private set; }

    public string ItemNameAr { get; private set; } = string.Empty;
    public string ItemNameEn { get; private set; } = string.Empty;

    public Guid AccountId { get; private set; } // Inventory Account (11301) or Expense Account (53xxx)
    public Guid? CostCenterId { get; private set; }

    public decimal Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal SubTotal { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal TaxableAmount { get; private set; }
    public decimal VatRate { get; private set; } = 15.00m;
    public decimal VatAmount { get; private set; }
    public decimal TotalAmount { get; private set; }

    private PurchaseInvoiceLine() { }

    public static PurchaseInvoiceLine Create(
        Guid tenantId,
        Guid purchaseInvoiceId,
        int lineNumber,
        Guid accountId,
        string itemNameAr,
        string itemNameEn,
        decimal quantity,
        decimal unitPrice,
        decimal discountAmount = 0,
        decimal vatRate = 15.00m,
        Guid? itemId = null,
        Guid? costCenterId = null)
    {
        var line = new PurchaseInvoiceLine
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PurchaseInvoiceId = purchaseInvoiceId,
            LineNumber = lineNumber,
            AccountId = accountId,
            ItemId = itemId,
            ItemNameAr = itemNameAr.Trim(),
            ItemNameEn = string.IsNullOrWhiteSpace(itemNameEn) ? itemNameAr.Trim() : itemNameEn.Trim(),
            CostCenterId = costCenterId,
            Quantity = Math.Max(0.0001m, quantity),
            UnitPrice = Math.Max(0, unitPrice),
            DiscountAmount = Math.Max(0, discountAmount),
            VatRate = vatRate
        };

        line.Recalculate();
        return line;
    }

    public void Recalculate()
    {
        SubTotal = Math.Round(Quantity * UnitPrice, 4);
        TaxableAmount = Math.Max(0, Math.Round(SubTotal - DiscountAmount, 4));
        VatAmount = Math.Round(TaxableAmount * (VatRate / 100m), 4);
        TotalAmount = Math.Round(TaxableAmount + VatAmount, 4);
    }
}
