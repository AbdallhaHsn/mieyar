using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.HumanResources.Domain.Entities;

public class Department : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string Code { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;

    public string? ManagerName { get; private set; }
    public Guid? CostCenterId { get; private set; }
    public bool IsActive { get; private set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private Department() { }

    public static Department Create(
        Guid tenantId,
        Guid companyId,
        string code,
        string nameAr,
        string nameEn,
        string? managerName = null,
        Guid? costCenterId = null,
        string? createdBy = null)
    {
        return new Department
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            Code = code.Trim().ToUpperInvariant(),
            NameAr = nameAr.Trim(),
            NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr.Trim() : nameEn.Trim(),
            ManagerName = managerName?.Trim(),
            CostCenterId = costCenterId,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void UpdateDetails(
        string nameAr,
        string nameEn,
        string? managerName,
        Guid? costCenterId,
        bool isActive,
        string? updatedBy = null)
    {
        NameAr = nameAr.Trim();
        NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr.Trim() : nameEn.Trim();
        ManagerName = managerName?.Trim();
        CostCenterId = costCenterId;
        IsActive = isActive;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }
}
