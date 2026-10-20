using AlRobban.Shared.Application.Abstractions;

namespace AlRobban.Shared.Infrastructure.MultiTenancy;

public class TenantContext : ICurrentTenantContext
{
    private Guid? _tenantId;
    private string? _tenantCode;

    public Guid? TenantId => _tenantId;
    public string? TenantCode => _tenantCode;
    public string? UserId { get; set; }
    public bool IsAuthenticated => _tenantId.HasValue;

    public void SetTenant(Guid tenantId, string? code = null)
    {
        _tenantId = tenantId;
        _tenantCode = code;
    }
}
