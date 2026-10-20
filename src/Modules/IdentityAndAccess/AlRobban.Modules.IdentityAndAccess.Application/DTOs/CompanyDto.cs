namespace AlRobban.Modules.IdentityAndAccess.Application.DTOs;

public record NationalAddressDto(
    string StreetName,
    string BuildingNumber,
    string SubDivisionName,
    string CityName,
    string PostalZone,
    string? AdditionalNumber,
    string CountryCode = "SA");

public record CompanyDto(
    Guid Id,
    string Code,
    string NameAr,
    string NameEn,
    string VatNumber,
    string CommercialRegistration,
    string CurrencyCode,
    string? LogoUrl,
    string? BrandThemeColor,
    NationalAddressDto Address,
    bool IsActive,
    IReadOnlyList<BranchDto> Branches,
    IReadOnlyList<FiscalYearDto> FiscalYears);

public record BranchDto(
    Guid Id,
    string Code,
    string NameAr,
    string NameEn,
    bool IsMainBranch,
    bool IsActive);

public record FiscalYearDto(
    Guid Id,
    int YearNumber,
    string NameAr,
    string NameEn,
    DateTime StartDate,
    DateTime EndDate,
    bool IsClosed,
    IReadOnlyList<FiscalPeriodDto> Periods);

public record FiscalPeriodDto(
    Guid Id,
    int PeriodNumber,
    string NameAr,
    string NameEn,
    DateTime StartDate,
    DateTime EndDate,
    bool IsClosed);
