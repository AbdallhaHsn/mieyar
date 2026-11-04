using System.Security.Claims;
using AlRobban.Shared.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace AlRobban.Shared.Infrastructure.MultiTenancy;

/// <summary>
/// Resolves the active tenant strictly from the authenticated principal.
/// Anonymous requests never resolve a tenant. The platform owner (SuperAdmin) is never bound
/// to a tenant: no X-Tenant-Id impersonation is honoured, so the platform owner can manage
/// companies and licenses but can never read or write company business data.
/// </summary>
public class TenantContext : ICurrentTenantContext
{
    public const string TenantHeaderName = "X-Tenant-Id";
    private const string SuperAdminRole = "SuperAdmin";

    private readonly IHttpContextAccessor _httpContextAccessor;
    private Guid? _explicitTenantId;
    private string? _explicitTenantCode;

    public TenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? Principal => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public string? Role => IsAuthenticated ? Principal!.FindFirst(ClaimTypes.Role)?.Value : null;

    public bool IsSuperAdmin => string.Equals(Role, SuperAdminRole, StringComparison.OrdinalIgnoreCase);

    public Guid? TenantId
    {
        get
        {
            if (_explicitTenantId.HasValue) return _explicitTenantId;

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return null;

            // 1. The platform owner never operates inside a tenant
            if (IsSuperAdmin) return null;

            // 2. Authoritative authenticated token claim (anti-spoofing)
            var claim = Principal?.FindFirst("tenant_id");
            if (claim != null && Guid.TryParse(claim.Value, out var claimTenantId) && claimTenantId != Guid.Empty)
            {
                return claimTenantId;
            }

            // 3. Never trust a client-supplied header for tenant resolution (anti-spoofing)

            return null;
        }
    }

    public string? TenantCode
    {
        get
        {
            if (!string.IsNullOrEmpty(_explicitTenantCode)) return _explicitTenantCode;
            return Principal?.FindFirst("company_code")?.Value;
        }
    }

    public string? UserId => Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    public string? UserName => Principal?.FindFirst(ClaimTypes.Name)?.Value;

    public string? UserDisplayName =>
        Principal?.FindFirst("full_name_ar")?.Value ?? Principal?.FindFirst(ClaimTypes.Name)?.Value;

    public void SetTenant(Guid tenantId, string? code = null)
    {
        _explicitTenantId = tenantId;
        _explicitTenantCode = code;
    }
}
