using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Domain.Entities;

public class CompanyRole : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public string Code { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public string? DescriptionAr { get; private set; }
    public string? DescriptionEn { get; private set; }
    public bool IsSystemRole { get; private set; }
    public string PermissionsJson { get; private set; } = "[]";

    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private CompanyRole() { } // EF Core

    public CompanyRole(
        Guid id,
        Guid tenantId,
        string code,
        string nameAr,
        string nameEn,
        string? descriptionAr = null,
        string? descriptionEn = null,
        bool isSystemRole = false,
        string permissionsJson = "[]",
        string? createdBy = null) : base(id)
    {
        TenantId = tenantId;
        Code = code.Trim().ToUpperInvariant();
        NameAr = nameAr.Trim();
        NameEn = nameEn.Trim();
        DescriptionAr = descriptionAr?.Trim();
        DescriptionEn = descriptionEn?.Trim();
        IsSystemRole = isSystemRole;
        PermissionsJson = string.IsNullOrWhiteSpace(permissionsJson) ? "[]" : permissionsJson;
        CreatedAtUtc = DateTime.UtcNow;
        CreatedBy = createdBy;
    }

    public static CompanyRole Create(
        Guid tenantId,
        string code,
        string nameAr,
        string nameEn,
        string? descriptionAr,
        string? descriptionEn,
        string permissionsJson,
        string? createdBy = null)
    {
        return new CompanyRole(
            Guid.NewGuid(),
            tenantId,
            code,
            nameAr,
            nameEn,
            descriptionAr,
            descriptionEn,
            isSystemRole: false,
            permissionsJson: permissionsJson,
            createdBy: createdBy);
    }

    public void Update(
        string nameAr,
        string nameEn,
        string? descriptionAr,
        string? descriptionEn,
        string permissionsJson,
        string? modifiedBy = null)
    {
        NameAr = nameAr.Trim();
        NameEn = nameEn.Trim();
        DescriptionAr = descriptionAr?.Trim();
        DescriptionEn = descriptionEn?.Trim();
        PermissionsJson = string.IsNullOrWhiteSpace(permissionsJson) ? "[]" : permissionsJson;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = modifiedBy;
    }
}
