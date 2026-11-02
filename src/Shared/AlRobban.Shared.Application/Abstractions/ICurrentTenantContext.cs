namespace AlRobban.Shared.Application.Abstractions;

public interface ICurrentTenantContext
{
    Guid? TenantId { get; }
    string? TenantCode { get; }
    string? UserId { get; }
    string? UserName { get; }
    string? UserDisplayName { get; }
    string? Role { get; }
    bool IsSuperAdmin { get; }
    bool IsAuthenticated { get; }
    void SetTenant(Guid tenantId, string? code = null);
}
