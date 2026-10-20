using AlRobban.Modules.IdentityAndAccess.Application.DTOs;
using AlRobban.Shared.Application.CQRS;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.CreateCompany;

public record CreateCompanyCommand(
    string Code,
    string NameAr,
    string NameEn,
    string VatNumber,
    string CommercialRegistration,
    string CurrencyCode,
    NationalAddressDto Address,
    string? LogoUrl = null,
    string? BrandThemeColor = "#0f766e") : ICommand<CompanyDto>;
