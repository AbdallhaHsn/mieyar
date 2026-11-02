using AlRobban.Modules.Manufacturing.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Manufacturing.Domain.Entities;

public class RawMaterial : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }

    public string ItemCode { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;

    public RawMaterialCategory Category { get; set; } = RawMaterialCategory.General;
    public string CategoryAr { get; set; } = string.Empty;
    public string CategoryEn { get; set; } = string.Empty;

    public string UnitOfMeasure { get; set; } = string.Empty;
    public decimal UnitCost { get; set; }
    public decimal CurrentStock { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal? MinStockLevel { get; set; }
    public string? Notes { get; set; }

    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    public RawMaterial() : base(Guid.NewGuid()) { }
    public RawMaterial(Guid id) : base(id) { }
}
