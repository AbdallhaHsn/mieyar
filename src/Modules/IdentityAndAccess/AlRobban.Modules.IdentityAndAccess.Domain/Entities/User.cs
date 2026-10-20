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
    public bool IsActive { get; private set; } = true;
    public DateTime? LastLoginUtc { get; private set; }

    // Auditing
    public DateTime CreatedAtUtc { get; set; }
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
        string? phoneNumber = null) : base(id)
    {
        TenantId = tenantId;
        UserName = userName.Trim().ToLowerInvariant();
        Email = email.Trim().ToLowerInvariant();
        PasswordHash = passwordHash;
        FullNameAr = fullNameAr;
        FullNameEn = fullNameEn;
        Role = role;
        PhoneNumber = phoneNumber;
        IsActive = true;
    }

    public void RecordLogin()
    {
        LastLoginUtc = DateTime.UtcNow;
    }

    public void ChangePassword(string newPasswordHash)
    {
        PasswordHash = newPasswordHash;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
