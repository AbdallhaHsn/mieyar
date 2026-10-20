using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AlRobban.Modules.IdentityAndAccess.Application.Services;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace AlRobban.Modules.IdentityAndAccess.Infrastructure.Security;

public class JwtTokenService : IJwtTokenService
{
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expiryDays;

    public JwtTokenService(IConfiguration configuration)
    {
        _secretKey = configuration["Jwt:SecretKey"] ?? "AlRobbanEnterpriseAccountingSuperSecretKey2026!#$@%";
        _issuer = configuration["Jwt:Issuer"] ?? "AlRobban.Security";
        _audience = configuration["Jwt:Audience"] ?? "AlRobban.Client";
        _expiryDays = int.TryParse(configuration["Jwt:ExpiryDays"], out var days) ? days : 7;
    }

    public AuthResponseDto GenerateToken(User user, Company? company)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_secretKey);
        var expiresAtUtc = DateTime.UtcNow.AddDays(_expiryDays);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("full_name_ar", user.FullNameAr),
            new("full_name_en", user.FullNameEn)
        };

        if (user.TenantId.HasValue)
        {
            claims.Add(new Claim("tenant_id", user.TenantId.Value.ToString()));
        }

        if (company != null)
        {
            claims.Add(new Claim("company_code", company.Code));
            claims.Add(new Claim("company_name_ar", company.NameAr));
            claims.Add(new Claim("company_name_en", company.NameEn));
            if (!string.IsNullOrEmpty(company.LogoUrl))
            {
                claims.Add(new Claim("company_logo", company.LogoUrl));
            }
            if (!string.IsNullOrEmpty(company.BrandThemeColor))
            {
                claims.Add(new Claim("brand_color", company.BrandThemeColor));
            }
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAtUtc,
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        return new AuthResponseDto(
            tokenString,
            expiresAtUtc,
            user.Id,
            user.UserName,
            user.FullNameAr,
            user.FullNameEn,
            user.Role.ToString(),
            user.TenantId,
            company?.NameAr,
            company?.NameEn,
            company?.LogoUrl,
            company?.BrandThemeColor);
    }
}
