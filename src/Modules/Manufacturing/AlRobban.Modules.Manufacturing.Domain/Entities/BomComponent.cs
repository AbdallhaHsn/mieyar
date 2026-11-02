using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Manufacturing.Domain.Entities;

public class BomComponent : Entity<Guid>, IMustHaveTenant
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }

    public Guid BomId { get; set; }
    public Guid? ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemNameAr { get; set; } = string.Empty;
    public string ItemNameEn { get; set; } = string.Empty;

    public decimal QuantityRequired { get; set; }
    public string UnitOfMeasure { get; set; } = string.Empty;
    public decimal ScrapPercentage { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }

    public BomComponent() : base(Guid.NewGuid()) { }
    public BomComponent(Guid id) : base(id) { }
}
