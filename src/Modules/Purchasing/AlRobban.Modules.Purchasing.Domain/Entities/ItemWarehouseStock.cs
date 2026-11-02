using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class ItemWarehouseStock : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public Guid ItemId { get; private set; }
    public Item? Item { get; private set; }

    public Guid WarehouseId { get; private set; }
    public Warehouse? Warehouse { get; private set; }
    public string WarehouseCode { get; private set; } = string.Empty;

    public decimal Quantity { get; private set; }
    public decimal MinStockLevel { get; private set; }
    public decimal MaxStockLevel { get; private set; }
    public string? BinLocation { get; private set; } // موقع الصنف في الرف أو الممر داخل المستودع (مثال: A-01-R2)
    public DateTime? LastMovementAtUtc { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private ItemWarehouseStock() { } // For EF Core

    public static ItemWarehouseStock Create(
        Guid tenantId,
        Guid companyId,
        Guid itemId,
        Guid warehouseId,
        string warehouseCode,
        decimal initialQuantity = 0,
        decimal minStockLevel = 0,
        decimal maxStockLevel = 0,
        string? binLocation = null,
        string? createdBy = null)
    {
        return new ItemWarehouseStock
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            ItemId = itemId,
            WarehouseId = warehouseId,
            WarehouseCode = warehouseCode.Trim().ToUpperInvariant(),
            Quantity = initialQuantity,
            MinStockLevel = Math.Max(0, minStockLevel),
            MaxStockLevel = Math.Max(0, maxStockLevel),
            BinLocation = binLocation?.Trim(),
            LastMovementAtUtc = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void AdjustQuantity(decimal delta, string? updatedBy = null)
    {
        Quantity += delta;
        LastMovementAtUtc = DateTime.UtcNow;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }

    public void SetQuantity(decimal exactQuantity, string? updatedBy = null)
    {
        Quantity = exactQuantity;
        LastMovementAtUtc = DateTime.UtcNow;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }

    public void UpdateSettings(decimal minStockLevel, decimal maxStockLevel, string? binLocation, string? updatedBy = null)
    {
        MinStockLevel = Math.Max(0, minStockLevel);
        MaxStockLevel = Math.Max(0, maxStockLevel);
        BinLocation = binLocation?.Trim();
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }
}
