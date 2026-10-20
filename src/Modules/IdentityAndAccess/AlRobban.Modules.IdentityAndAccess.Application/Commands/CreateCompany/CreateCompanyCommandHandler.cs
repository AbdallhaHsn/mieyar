using AlRobban.Modules.IdentityAndAccess.Application.DTOs;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects;
using AlRobban.Shared.Application.CQRS;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.CreateCompany;

public class CreateCompanyCommandHandler : ICommandHandler<CreateCompanyCommand, CompanyDto>
{
    private readonly ICompanyRepository _companyRepository;

    public CreateCompanyCommandHandler(ICompanyRepository companyRepository)
    {
        _companyRepository = companyRepository;
    }

    public async Task<Result<CompanyDto>> Handle(
        CreateCompanyCommand request,
        CancellationToken cancellationToken)
    {
        // 1. Check uniqueness of Code
        if (await _companyRepository.ExistsWithCodeAsync(request.Code, cancellationToken))
        {
            return Result.Failure<CompanyDto>(Error.Conflict(
                "Company.DuplicateCode",
                $"كود الشركة '{request.Code}' مستخدم مسبقاً / Company code already exists."));
        }

        // 2. Check uniqueness of VAT Number
        if (await _companyRepository.ExistsWithVatNumberAsync(request.VatNumber, cancellationToken))
        {
            return Result.Failure<CompanyDto>(Error.Conflict(
                "Company.DuplicateVatNumber",
                $"الرقم الضريبي '{request.VatNumber}' مسجل لشركة أخرى مسبقاً / VAT number already registered."));
        }

        // 3. Build National Address Value Object
        var nationalAddress = new NationalAddress(
            request.Address.StreetName,
            request.Address.BuildingNumber,
            request.Address.SubDivisionName,
            request.Address.CityName,
            request.Address.PostalZone,
            request.Address.AdditionalNumber,
            request.Address.CountryCode);

        // 4. Create Company Aggregate
        var companyId = Guid.NewGuid();
        var company = new Company(
            companyId,
            request.Code,
            request.NameAr,
            request.NameEn,
            request.VatNumber,
            request.CommercialRegistration,
            request.CurrencyCode,
            nationalAddress,
            request.LogoUrl,
            request.BrandThemeColor);

        // 5. Automatically create Default Main Branch
        company.AddBranch(
            code: "MAIN",
            nameAr: "الفرع الرئيسي",
            nameEn: "Main Branch",
            isMain: true,
            branchAddress: nationalAddress);

        // 6. Automatically create Current Fiscal Year with 12 monthly periods
        var currentYear = DateTime.UtcNow.Year;
        var fiscalYearStart = new DateTime(currentYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var fiscalYearEnd = new DateTime(currentYear, 12, 31, 23, 59, 59, DateTimeKind.Utc);

        company.AddFiscalYear(
            yearNumber: currentYear,
            nameAr: $"السنة المالية {currentYear}",
            nameEn: $"Fiscal Year {currentYear}",
            startDate: fiscalYearStart,
            endDate: fiscalYearEnd);

        // 7. Persist
        await _companyRepository.AddAsync(company, cancellationToken);
        await _companyRepository.SaveChangesAsync(cancellationToken);

        // 8. Map to DTO
        var dto = MapToDto(company);
        return Result.Success(dto);
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
