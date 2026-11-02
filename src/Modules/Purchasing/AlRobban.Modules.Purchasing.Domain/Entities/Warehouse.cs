using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class Warehouse : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public Guid? BranchId { get; private set; }
    public string BranchName { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public string? Location { get; private set; }
    public string? ManagerName { get; private set; }
    public string? ManagerPhone { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsActive { get; private set; } = true;

    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private Warehouse() { } // EF Core

    public Warehouse(
        Guid id,
        Guid tenantId,
        Guid companyId,
        string code,
        string nameAr,
        string nameEn,
        Guid? branchId = null,
        string? branchName = null,
        string? location = null,
        string? managerName = null,
        string? managerPhone = null,
        bool isDefault = false) : base(id)
    {
        TenantId = tenantId;
        CompanyId = companyId;
        Code = code;
        NameAr = nameAr;
        NameEn = nameEn;
        BranchId = branchId;
        BranchName = branchName ?? string.Empty;
        Location = location;
        ManagerName = managerName;
        ManagerPhone = managerPhone;
        IsDefault = isDefault;
        IsActive = true;
    }

    public void UpdateDetails(
        string nameAr,
        string nameEn,
        Guid? branchId,
        string? branchName,
        string? location,
        string? managerName,
        string? managerPhone,
        bool isDefault)
    {
        NameAr = nameAr;
        NameEn = nameEn;
        BranchId = branchId;
        BranchName = branchName ?? string.Empty;
        Location = location;
        ManagerName = managerName;
        ManagerPhone = managerPhone;
        IsDefault = isDefault;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
    public void SetDefault(bool isDefault) => IsDefault = isDefault;
}
