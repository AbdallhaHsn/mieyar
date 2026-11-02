using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class Item : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string ItemCode { get; private set; } = string.Empty;
    public string? Barcode { get; private set; }
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;

    public ItemType ItemType { get; private set; } = ItemType.Stockable;
    public string UnitOfMeasure { get; private set; } = "حبة"; // Piece

    public decimal PurchasePrice { get; private set; }
    public decimal SalePrice { get; private set; }
    public decimal CostPrice { get; private set; }

    public Guid? InventoryAccountId { get; private set; } // 11301 المخزون
    public Guid? CogsAccountId { get; private set; }      // 51101 تكلفة المبيعات
    public Guid? RevenueAccountId { get; private set; }   // 41101 إيرادات المبيعات

    public decimal CurrentStockQuantity { get; private set; }
    public decimal MinStockLevel { get; private set; }

    public bool IsActive { get; private set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private Item() { }

    public static Item Create(
        Guid tenantId,
        Guid companyId,
        string itemCode,
        string nameAr,
        string nameEn,
        ItemType itemType,
        string unitOfMeasure,
        decimal purchasePrice,
        decimal salePrice,
        decimal costPrice = 0,
        string? barcode = null,
        Guid? inventoryAccountId = null,
        Guid? cogsAccountId = null,
        Guid? revenueAccountId = null,
        decimal minStockLevel = 0,
        string? createdBy = null)
    {
        return new Item
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            ItemCode = itemCode.Trim().ToUpperInvariant(),
            Barcode = barcode?.Trim(),
            NameAr = nameAr.Trim(),
            NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr.Trim() : nameEn.Trim(),
            ItemType = itemType,
            UnitOfMeasure = string.IsNullOrWhiteSpace(unitOfMeasure) ? "حبة" : unitOfMeasure.Trim(),
            PurchasePrice = Math.Max(0, purchasePrice),
            SalePrice = Math.Max(0, salePrice),
            CostPrice = costPrice > 0 ? costPrice : purchasePrice,
            InventoryAccountId = inventoryAccountId,
            CogsAccountId = cogsAccountId,
            RevenueAccountId = revenueAccountId,
            MinStockLevel = Math.Max(0, minStockLevel),
            CurrentStockQuantity = 0,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void UpdateDetails(
        string nameAr,
        string nameEn,
        ItemType itemType,
        string unitOfMeasure,
        string? barcode,
        Guid? inventoryAccountId,
        Guid? cogsAccountId,
        Guid? revenueAccountId,
        decimal minStockLevel,
        bool isActive,
        string? updatedBy = null)
    {
        NameAr = nameAr.Trim();
        NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr.Trim() : nameEn.Trim();
        ItemType = itemType;
        UnitOfMeasure = string.IsNullOrWhiteSpace(unitOfMeasure) ? "حبة" : unitOfMeasure.Trim();
        Barcode = barcode?.Trim();
        InventoryAccountId = inventoryAccountId;
        CogsAccountId = cogsAccountId;
        RevenueAccountId = revenueAccountId;
        MinStockLevel = Math.Max(0, minStockLevel);
        IsActive = isActive;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }

    public void UpdatePrices(decimal purchasePrice, decimal salePrice, string? updatedBy = null)
    {
        PurchasePrice = Math.Max(0, purchasePrice);
        SalePrice = Math.Max(0, salePrice);
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }

    public void AdjustStock(decimal quantityDelta, decimal newUnitCost, InventoryMovementType movementType, string? updatedBy = null)
    {
        if (ItemType != ItemType.Stockable) return;

        if (movementType == InventoryMovementType.PurchaseIn && quantityDelta > 0)
        {
            // Calculate Weighted Average Cost (IAS 2)
            var existingTotalValue = CurrentStockQuantity * CostPrice;
            var newTotalValue = quantityDelta * newUnitCost;
            var totalQty = CurrentStockQuantity + quantityDelta;

            if (totalQty > 0)
            {
                CostPrice = Math.Round((existingTotalValue + newTotalValue) / totalQty, 4);
            }
            CurrentStockQuantity = totalQty;
        }
        else
        {
            CurrentStockQuantity += quantityDelta;
        }

        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }
}
