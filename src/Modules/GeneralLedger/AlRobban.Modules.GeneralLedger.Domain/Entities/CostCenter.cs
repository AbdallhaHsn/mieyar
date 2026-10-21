using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class CostCenter : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public Guid? ParentCostCenterId { get; private set; }
    public CostCenter? ParentCostCenter { get; private set; }
    public List<CostCenter> SubCostCenters { get; private set; } = new();
    public bool IsActive { get; private set; } = true;

    // Audit and Soft Delete
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
    public string? DeletedBy { get; set; }

    private CostCenter() { }

    public static CostCenter Create(
        Guid tenantId,
        Guid companyId,
        string code,
        string nameAr,
        string nameEn,
        Guid? parentCostCenterId = null,
        string? description = null)
    {
        return new CostCenter
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            Code = code.Trim(),
            NameAr = nameAr.Trim(),
            NameEn = nameEn.Trim(),
            ParentCostCenterId = parentCostCenterId,
            Description = description?.Trim(),
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void Update(string nameAr, string nameEn, string? description)
    {
        NameAr = nameAr.Trim();
        NameEn = nameEn.Trim();
        Description = description?.Trim();
        LastModifiedAtUtc = DateTime.UtcNow;
    }

    public void ToggleActive(bool active)
    {
        IsActive = active;
        LastModifiedAtUtc = DateTime.UtcNow;
    }
}
