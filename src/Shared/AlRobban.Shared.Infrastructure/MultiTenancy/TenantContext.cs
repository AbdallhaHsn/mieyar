using System.Security.Claims;
using AlRobban.Shared.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace AlRobban.Shared.Infrastructure.MultiTenancy;

public class TenantContext : ICurrentTenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private Guid? _explicitTenantId;
    private string? _explicitTenantCode;

    public TenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? TenantId
    {
        get
        {
            if (_explicitTenantId.HasValue) return _explicitTenantId;

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return null;

            // 1. Check JWT claim "tenant_id"
            var claim = httpContext.User.FindFirst("tenant_id");
            if (claim != null && Guid.TryParse(claim.Value, out var claimTenantId))
            {
                return claimTenantId;
            }

            // 2. For SuperAdmin: check header "X-Tenant-Id"
            if (httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var headerVal))
            {
                if (Guid.TryParse(headerVal.ToString(), out var headerTenantId))
                {
                    return headerTenantId;
                }
            }

            return null;
        }
    }

    public string? TenantCode
    {
        get
        {
            if (!string.IsNullOrEmpty(_explicitTenantCode)) return _explicitTenantCode;
            return _httpContextAccessor.HttpContext?.User.FindFirst("company_code")?.Value;
        }
    }

    public string? UserId =>
        _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public void SetTenant(Guid tenantId, string? code = null)
    {
        _explicitTenantId = tenantId;
        _explicitTenantCode = code;
    }
}
