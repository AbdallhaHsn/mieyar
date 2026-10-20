using AlRobban.Modules.IdentityAndAccess.Application.DTOs;
using AlRobban.Modules.IdentityAndAccess.Application.Services;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Enums;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects;
using AlRobban.Shared.Application.CQRS;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.OnboardCompany;

public class OnboardCompanyCommandHandler : ICommandHandler<OnboardCompanyCommand, CompanyDto>
{
    private readonly ICompanyRepository _companyRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;

    public OnboardCompanyCommandHandler(
        ICompanyRepository companyRepository,
        IUserRepository userRepository,
        IPasswordHasher passwordHasher)
    {
        _companyRepository = companyRepository;
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
    }

    public async Task<Result<CompanyDto>> Handle(
        OnboardCompanyCommand request,
        CancellationToken cancellationToken)
    {
        // 1. Validation of uniqueness
        if (await _companyRepository.ExistsWithCodeAsync(request.Code, cancellationToken))
        {
            return Result.Failure<CompanyDto>(Error.Conflict(
                "Company.DuplicateCode",
                $"كود الشركة '{request.Code}' مستخدم مسبقاً."));
        }

        if (await _companyRepository.ExistsWithVatNumberAsync(request.VatNumber, cancellationToken))
        {
            return Result.Failure<CompanyDto>(Error.Conflict(
                "Company.DuplicateVatNumber",
                $"الرقم الضريبي '{request.VatNumber}' مسجل لشركة أخرى مسبقاً."));
        }

        if (await _userRepository.ExistsWithUserNameAsync(request.AdminUser.UserName, cancellationToken))
        {
            return Result.Failure<CompanyDto>(Error.Conflict(
                "User.DuplicateUserName",
                $"اسم المستخدم '{request.AdminUser.UserName}' مستخدم مسبقاً."));
        }

        if (await _userRepository.ExistsWithEmailAsync(request.AdminUser.Email, cancellationToken))
        {
            return Result.Failure<CompanyDto>(Error.Conflict(
                "User.DuplicateEmail",
                $"البريد الإلكتروني '{request.AdminUser.Email}' مسجل لمستخدم آخر مسبقاً."));
        }

        // 2. Create National Address
        var nationalAddress = new NationalAddress(
            request.Address.StreetName,
            request.Address.BuildingNumber,
            request.Address.SubDivisionName,
            request.Address.CityName,
            request.Address.PostalZone,
            request.Address.AdditionalNumber,
            request.Address.CountryCode);

        // 3. Create Company Aggregate
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

        // 4. Default Main Branch
        company.AddBranch(
            code: "MAIN",
            nameAr: "الفرع الرئيسي",
            nameEn: "Main Branch",
            isMain: true,
            branchAddress: nationalAddress);

        // 5. Default Current Fiscal Year & 12 Periods
        var currentYear = DateTime.UtcNow.Year;
        company.AddFiscalYear(
            yearNumber: currentYear,
            nameAr: $"السنة المالية {currentYear}",
            nameEn: $"Fiscal Year {currentYear}",
            startDate: new DateTime(currentYear, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            endDate: new DateTime(currentYear, 12, 31, 23, 59, 59, DateTimeKind.Utc));

        // 6. Create Initial Company Administrator User
        var passwordHash = _passwordHasher.HashPassword(request.AdminUser.Password);
        var adminUser = new User(
            Guid.NewGuid(),
            companyId,
            request.AdminUser.UserName,
            request.AdminUser.Email,
            passwordHash,
            request.AdminUser.FullNameAr,
            request.AdminUser.FullNameEn,
            UserRole.CompanyAdmin,
            request.AdminUser.PhoneNumber);

        // 7. Persist
        await _companyRepository.AddAsync(company, cancellationToken);
        await _userRepository.AddAsync(adminUser, cancellationToken);

        await _companyRepository.SaveChangesAsync(cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        // 8. Map to DTO
        var dto = new CompanyDto(
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
            company.Branches.Select(b => new BranchDto(b.Id, b.Code, b.NameAr, b.NameEn, b.IsMainBranch, b.IsActive)).ToList(),
            company.FiscalYears.Select(y => new FiscalYearDto(
                y.Id,
                y.YearNumber,
                y.NameAr,
                y.NameEn,
                y.StartDate,
                y.EndDate,
                y.IsClosed,
                y.Periods.Select(p => new FiscalPeriodDto(p.Id, p.PeriodNumber, p.NameAr, p.NameEn, p.StartDate, p.EndDate, p.IsClosed)).ToList())).ToList());

        return Result.Success(dto);
    }
}
