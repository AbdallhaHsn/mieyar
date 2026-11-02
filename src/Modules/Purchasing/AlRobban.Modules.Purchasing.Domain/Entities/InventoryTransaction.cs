using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class InventoryTransaction : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public Guid ItemId { get; private set; }
    public Item? Item { get; private set; }

    public DateTime TransactionDate { get; private set; }
    public InventoryMovementType MovementType { get; private set; }

    public decimal QuantityIn { get; private set; }
    public decimal QuantityOut { get; private set; }
    public decimal UnitCost { get; private set; }
    public decimal TotalCost { get; private set; }

    public decimal BalanceAfterQuantity { get; private set; }

    public Guid? WarehouseId { get; private set; }
    public string? WarehouseCode { get; private set; }

    public string? ReferenceType { get; private set; } // "PurchaseInvoice", "SalesInvoice", "Adjustment", "StockTransfer"
    public Guid? ReferenceId { get; private set; }
    public string? ReferenceNumber { get; private set; }

    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private InventoryTransaction() { }

    public static InventoryTransaction Create(
        Guid tenantId,
        Guid companyId,
        Guid itemId,
        DateTime transactionDate,
        InventoryMovementType movementType,
        decimal quantityIn,
        decimal quantityOut,
        decimal unitCost,
        decimal balanceAfterQuantity,
        string? referenceType = null,
        Guid? referenceId = null,
        string? referenceNumber = null,
        string? notes = null,
        string? createdBy = null,
        Guid? warehouseId = null,
        string? warehouseCode = null)
    {
        var qty = quantityIn > 0 ? quantityIn : quantityOut;
        var totalCost = Math.Round(qty * unitCost, 4);

        return new InventoryTransaction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            ItemId = itemId,
            WarehouseId = warehouseId,
            WarehouseCode = warehouseCode?.Trim().ToUpperInvariant(),
            TransactionDate = transactionDate,
            MovementType = movementType,
            QuantityIn = Math.Max(0, quantityIn),
            QuantityOut = Math.Max(0, quantityOut),
            UnitCost = Math.Max(0, unitCost),
            TotalCost = totalCost,
            BalanceAfterQuantity = balanceAfterQuantity,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            ReferenceNumber = referenceNumber,
            Notes = notes,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }
}
