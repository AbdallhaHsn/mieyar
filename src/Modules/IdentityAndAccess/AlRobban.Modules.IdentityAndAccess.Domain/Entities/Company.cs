using AlRobban.Modules.IdentityAndAccess.Domain.ValueObjects;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Domain.Entities;

public class Company : AggregateRoot<Guid>, IAuditableEntity
{
    private readonly List<Branch> _branches = [];
    private readonly List<FiscalYear> _fiscalYears = [];

    public string Code { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public string VatNumber { get; private set; } = string.Empty;
    public string CommercialRegistration { get; private set; } = string.Empty;
    public string CurrencyCode { get; private set; } = "SAR";

    // Branding & White-labeling
    public string? LogoUrl { get; private set; }
    public string? BrandThemeColor { get; private set; } = "#0f766e";

    // ZATCA Phase 2 Official National Address
    public NationalAddress Address { get; private set; } = new();

    public bool IsActive { get; private set; } = true;

    // Auditing
    public DateTime CreatedAtUtc { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    public IReadOnlyCollection<Branch> Branches => _branches.AsReadOnly();
    public IReadOnlyCollection<FiscalYear> FiscalYears => _fiscalYears.AsReadOnly();

    private Company() { } // EF Core

    public Company(
        Guid id,
        string code,
        string nameAr,
        string nameEn,
        string vatNumber,
        string commercialRegistration,
        string currencyCode,
        NationalAddress address,
        string? logoUrl = null,
        string? brandThemeColor = "#0f766e") : base(id)
    {
        Code = code;
        NameAr = nameAr;
        NameEn = nameEn;
        VatNumber = vatNumber;
        CommercialRegistration = commercialRegistration;
        CurrencyCode = currencyCode;
        Address = address;
        LogoUrl = logoUrl;
        BrandThemeColor = brandThemeColor;
        IsActive = true;
    }

    public void UpdateBranding(string? logoUrl, string? brandThemeColor)
    {
        LogoUrl = logoUrl;
        if (!string.IsNullOrWhiteSpace(brandThemeColor))
        {
            BrandThemeColor = brandThemeColor;
        }
    }

    public void UpdateDetails(
        string nameAr,
        string nameEn,
        string vatNumber,
        string commercialRegistration,
        NationalAddress address)
    {
        NameAr = nameAr;
        NameEn = nameEn;
        VatNumber = vatNumber;
        CommercialRegistration = commercialRegistration;
        Address = address;
    }

    public Branch AddBranch(string code, string nameAr, string nameEn, bool isMain = false, NationalAddress? branchAddress = null)
    {
        var branch = new Branch(
            Guid.NewGuid(),
            Id,
            code,
            nameAr,
            nameEn,
            isMain,
            branchAddress ?? Address);

        _branches.Add(branch);
        return branch;
    }

    public bool RemoveBranch(Guid branchId)
    {
        var branch = _branches.FirstOrDefault(b => b.Id == branchId);
        if (branch == null || branch.IsMainBranch) return false;
        _branches.Remove(branch);
        return true;
    }

    public FiscalYear AddFiscalYear(int yearNumber, string nameAr, string nameEn, DateTime startDate, DateTime endDate)
    {
        var fiscalYear = new FiscalYear(
            Guid.NewGuid(),
            Id,
            yearNumber,
            nameAr,
            nameEn,
            startDate,
            endDate);

        _fiscalYears.Add(fiscalYear);
        return fiscalYear;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
