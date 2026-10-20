using AlRobban.Modules.IdentityAndAccess.Application.DTOs;
using AlRobban.Shared.Application.CQRS;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.OnboardCompany;

public record OnboardCompanyAdminDto(
    string UserName,
    string Email,
    string Password,
    string FullNameAr,
    string FullNameEn,
    string? PhoneNumber);

public record OnboardCompanyCommand(
    string Code,
    string NameAr,
    string NameEn,
    string VatNumber,
    string CommercialRegistration,
    string CurrencyCode,
    NationalAddressDto Address,
    OnboardCompanyAdminDto AdminUser,
    string? LogoUrl = null,
    string? BrandThemeColor = "#0f766e") : ICommand<CompanyDto>;
