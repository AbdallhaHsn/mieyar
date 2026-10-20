using AlRobban.Modules.IdentityAndAccess.Domain.Entities;

namespace AlRobban.Modules.IdentityAndAccess.Application.Services;

public record AuthResponseDto(
    string Token,
    DateTime ExpiresAtUtc,
    Guid UserId,
    string UserName,
    string FullNameAr,
    string FullNameEn,
    string Role,
    Guid? TenantId,
    string? CompanyNameAr,
    string? CompanyNameEn,
    string? CompanyLogoUrl,
    string? BrandThemeColor);

public interface IJwtTokenService
{
    AuthResponseDto GenerateToken(User user, Company? company);
}
