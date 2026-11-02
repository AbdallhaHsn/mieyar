using AlRobban.Modules.IdentityAndAccess.Application.DTOs;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects;
using AlRobban.Shared.Application.CQRS;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.UpdateCompanyProfile;

public record UpdateCompanyProfileCommand(
    Guid CompanyId,
    string NameAr,
    string NameEn,
    string VatNumber,
    string CommercialRegistration,
    string? LogoUrl = null,
    string? BrandThemeColor = "#0f766e",
    NationalAddressDto? Address = null) : ICommand<CompanyDto>;

public class UpdateCompanyProfileCommandHandler : ICommandHandler<UpdateCompanyProfileCommand, CompanyDto>
{
    private readonly ICompanyRepository _companyRepository;

    public UpdateCompanyProfileCommandHandler(ICompanyRepository companyRepository)
    {
        _companyRepository = companyRepository;
    }

    public async Task<Result<CompanyDto>> Handle(
        UpdateCompanyProfileCommand request,
        CancellationToken cancellationToken)
    {
        var company = await _companyRepository.GetByIdAsync(request.CompanyId, cancellationToken);
        if (company == null)
        {
            return Result.Failure<CompanyDto>(Error.NotFound(
                "Company.NotFound",
                "المنشأة المطلوبة غير موجودة / Company not found."));
        }

        var address = request.Address != null 
            ? new NationalAddress(
                request.Address.StreetName,
                request.Address.BuildingNumber,
                request.Address.SubDivisionName,
                request.Address.CityName,
                request.Address.PostalZone,
                request.Address.AdditionalNumber,
                request.Address.CountryCode)
            : company.Address;

        company.UpdateDetails(
            request.NameAr,
            request.NameEn,
            request.VatNumber,
            request.CommercialRegistration,
            address);

        company.UpdateBranding(request.LogoUrl, request.BrandThemeColor);

        await _companyRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(MapToDto(company));
    }

    private static CompanyDto MapToDto(Company company)
    {
        return new CompanyDto(
            company.Id,
            company.Code,
            company.NameAr,
            company.NameEn,
            company.VatNumber,
            company.CommercialRegistration,
            company.CurrencyCode,
            company.LogoUrl,
            company.BrandThemeColor,
            new NationalAddressDto(
                company.Address.StreetName,
                company.Address.BuildingNumber,
                company.Address.SubDivisionName,
                company.Address.CityName,
                company.Address.PostalZone,
                company.Address.AdditionalNumber,
                company.Address.CountryCode),
            company.IsActive,
            company.Branches.Select(b => new BranchDto(
                b.Id,
                b.Code,
                b.NameAr,
                b.NameEn,
                b.IsMainBranch,
                b.IsActive)).ToList(),
            company.FiscalYears.Select(y => new FiscalYearDto(
                y.Id,
                y.YearNumber,
                y.NameAr,
                y.NameEn,
                y.StartDate,
                y.EndDate,
                y.IsClosed,
                y.Periods.Select(p => new FiscalPeriodDto(
                    p.Id,
                    p.PeriodNumber,
                    p.NameAr,
                    p.NameEn,
                    p.StartDate,
                    p.EndDate,
                    p.IsClosed)).ToList())).ToList());
    }
}
