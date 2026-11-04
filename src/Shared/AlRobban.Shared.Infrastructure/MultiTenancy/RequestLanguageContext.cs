using AlRobban.Shared.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace AlRobban.Shared.Infrastructure.MultiTenancy;

/// <summary>
/// Resolves the active request language ("ar" or "en") from the HTTP "Accept-Language" or "X-Lang" header.
/// Defaults to Arabic ("ar") if not specified.
/// </summary>
public class RequestLanguageContext : IRequestLanguageContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RequestLanguageContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string CurrentLanguage
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
            {
                return "ar";
            }

            // Check custom X-Lang header first, then standard Accept-Language header
            var langHeader = httpContext.Request.Headers["X-Lang"].FirstOrDefault()
                          ?? httpContext.Request.Headers["Accept-Language"].FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(langHeader))
            {
                var primary = langHeader.Split(',')[0].Trim();
                if (primary.StartsWith("en", StringComparison.OrdinalIgnoreCase))
                {
                    return "en";
                }
            }

            return "ar";
        }
    }
}

