using AlRobban.Modules.IdentityAndAccess.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Domain.Entities;

public class User : AggregateRoot<Guid>, IMayHaveTenant, IAuditableEntity
{
    public Guid? TenantId { get; set; } // Null for Platform Owner (SuperAdmin)
    public string UserName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string FullNameAr { get; private set; } = string.Empty;
    public string FullNameEn { get; private set; } = string.Empty;
    public string? PhoneNumber { get; private set; }
    public UserRole Role { get; private set; }
    public Guid? CompanyRoleId { get; private set; }
    public Guid? BranchId { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime? LastLoginUtc { get; private set; }

    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private User() { } // EF Core

    public User(
        Guid id,
        Guid? tenantId,
        string userName,
        string email,
        string passwordHash,
        string fullNameAr,
        string fullNameEn,
        UserRole role,
        string? phoneNumber = null,
        Guid? companyRoleId = null,
        Guid? branchId = null,
        string? createdBy = null) : base(id)
    {
        TenantId = tenantId;
        UserName = userName.Trim().ToLowerInvariant();
        Email = email.Trim().ToLowerInvariant();
        PasswordHash = passwordHash;
        FullNameAr = fullNameAr.Trim();
        FullNameEn = fullNameEn.Trim();
        Role = role;
        PhoneNumber = phoneNumber?.Trim();
        CompanyRoleId = companyRoleId;
        BranchId = branchId;
        IsActive = true;
        CreatedAtUtc = DateTime.UtcNow;
        CreatedBy = createdBy;
    }

    public void RecordLogin()
    {
        LastLoginUtc = DateTime.UtcNow;
    }

    public void ChangePassword(string newPasswordHash, string? modifiedBy = null)
    {
        PasswordHash = newPasswordHash;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = modifiedBy;
    }

    public void UpdateDetails(
        string fullNameAr,
        string fullNameEn,
        string? phoneNumber,
        UserRole role,
        Guid? companyRoleId,
        Guid? branchId,
        string? modifiedBy = null)
    {
        FullNameAr = fullNameAr.Trim();
        FullNameEn = fullNameEn.Trim();
        PhoneNumber = phoneNumber?.Trim();
        Role = role;
        CompanyRoleId = companyRoleId;
        BranchId = branchId;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = modifiedBy;
    }

    public void SetStatus(bool isActive, string? modifiedBy = null)
    {
        IsActive = isActive;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = modifiedBy;
    }

    public void Deactivate(string? modifiedBy = null) => SetStatus(false, modifiedBy);
    public void Activate(string? modifiedBy = null) => SetStatus(true, modifiedBy);
}
