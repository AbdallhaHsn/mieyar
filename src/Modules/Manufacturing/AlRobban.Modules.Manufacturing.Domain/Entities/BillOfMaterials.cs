using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Manufacturing.Domain.Entities;

public class BillOfMaterials : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }

    public string Code { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;

    public string FinishedProductId { get; set; } = string.Empty;
    public string FinishedProductCode { get; set; } = string.Empty;
    public string FinishedProductNameAr { get; set; } = string.Empty;
    public string FinishedProductNameEn { get; set; } = string.Empty;

    public decimal OutputQuantity { get; set; } = 1m;
    public string UnitOfMeasure { get; set; } = string.Empty;

    public Guid? RawMaterialsWarehouseId { get; set; }
    public string RawMaterialsWarehouseName { get; set; } = string.Empty;
    public Guid? FinishedGoodsWarehouseId { get; set; }
    public string FinishedGoodsWarehouseName { get; set; } = string.Empty;

    public decimal TotalMaterialCost { get; set; }
    public decimal TotalLaborCost { get; set; }
    public decimal TotalOverheadCost { get; set; }
    public decimal TotalUnitCost { get; set; }

    public bool IsActive { get; set; } = true;
    public string Version { get; set; } = "1.0";
    public string? Notes { get; set; }

    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    public List<BomComponent> Components { get; set; } = new();
    public List<BomOperation> Operations { get; set; } = new();

    public BillOfMaterials() : base(Guid.NewGuid()) { }

    public BillOfMaterials(Guid id) : base(id) { }

    public void RecalculateTotals()
    {
        TotalMaterialCost = Components.Sum(c => c.TotalCost);
        TotalLaborCost = Operations.Sum(o => (o.StandardTimeMinutes / 60m) * o.HourlyLaborRate);
        TotalOverheadCost = Operations.Sum(o => (o.StandardTimeMinutes / 60m) * o.HourlyOverheadRate);
        var total = TotalMaterialCost + TotalLaborCost + TotalOverheadCost;
        TotalUnitCost = OutputQuantity > 0 ? Math.Round(total / OutputQuantity, 2) : total;
    }
}
