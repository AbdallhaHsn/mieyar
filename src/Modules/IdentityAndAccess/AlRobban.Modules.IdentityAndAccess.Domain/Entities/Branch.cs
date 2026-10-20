using AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Domain.Entities;

public class Branch : Entity<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public string Code { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public bool IsMainBranch { get; private set; }
    public NationalAddress Address { get; private set; } = new();
    public bool IsActive { get; private set; } = true;

    // Auditing
    public DateTime CreatedAtUtc { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private Branch() { } // EF Core

    internal Branch(
        Guid id,
        Guid tenantId,
        string code,
        string nameAr,
        string nameEn,
        bool isMainBranch,
        NationalAddress address) : base(id)
    {
        TenantId = tenantId;
        Code = code;
        NameAr = nameAr;
        NameEn = nameEn;
        IsMainBranch = isMainBranch;
        Address = address;
        IsActive = true;
    }

    public void UpdateDetails(string nameAr, string nameEn, NationalAddress address)
    {
        NameAr = nameAr;
        NameEn = nameEn;
        Address = address;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
