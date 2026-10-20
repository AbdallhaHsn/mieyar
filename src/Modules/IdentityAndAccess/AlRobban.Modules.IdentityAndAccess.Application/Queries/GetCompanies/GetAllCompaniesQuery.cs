using AlRobban.Modules.IdentityAndAccess.Application.DTOs;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Shared.Application.CQRS;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Application.Queries.GetCompanies;

public record GetAllCompaniesQuery : IQuery<IReadOnlyList<CompanyDto>>;

public class GetAllCompaniesQueryHandler : IQueryHandler<GetAllCompaniesQuery, IReadOnlyList<CompanyDto>>
{
    private readonly ICompanyRepository _companyRepository;

    public GetAllCompaniesQueryHandler(ICompanyRepository companyRepository)
    {
        _companyRepository = companyRepository;
    }

    public async Task<Result<IReadOnlyList<CompanyDto>>> Handle(
        GetAllCompaniesQuery request,
        CancellationToken cancellationToken)
    {
        var companies = await _companyRepository.GetAllActiveAsync(cancellationToken);

        var dtos = companies.Select(company => new CompanyDto(
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
                    p.IsClosed)).ToList())).ToList())).ToList();

        return Result.Success<IReadOnlyList<CompanyDto>>(dtos);
    }
}
