using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public enum PartnerType
{
    Customer = 1, // عميل (ذمم مدينة)
    Supplier = 2, // مورد (ذمم دائنة)
    Both = 3      // عميل ومورد في آن واحد
}

public class BusinessPartner : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public PartnerType PartnerType { get; private set; } = PartnerType.Customer;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public string? TaxNumber { get; private set; } // الرقم الضريبي (15 رقم)
    public string? CommercialRegistration { get; private set; } // السجل التجاري
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string? Address { get; private set; }

    // ZATCA Buyer National Address Details (وفق متطلبات هيئة الزكاة للفاتورة الضريبية)
    public string? StreetName { get; private set; }
    public string? BuildingNumber { get; private set; } // 4 أرقام
    public string? PlotIdentification { get; private set; } // الرقم الإضافي للمبنى (4 أرقام)
    public string? CitySubdivisionName { get; private set; } // اسم الحي
    public string? CityName { get; private set; } // المدينة
    public string? PostalZone { get; private set; } // الرمز البريدي (5 أرقام)
    public string CountryCode { get; private set; } = "SA";

    // ZATCA Buyer Identification Scheme (نوع المعرف التجاري الإضافي)
    public string? OtherIdType { get; private set; } // CRN, 700, MOM, MLS, SAG, NAT, IQA, OTH
    public string? OtherIdValue { get; private set; }

    public decimal CreditLimit { get; private set; } = 0m;
    public int PaymentTermsDays { get; private set; } = 30; // فترة السداد باليوم
    public Guid? GlAccountId { get; private set; } // حساب الأستاذ العام المربوط
    public decimal CurrentBalance { get; private set; } = 0m;
    public bool IsActive { get; private set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private BusinessPartner() { }

    public static BusinessPartner Create(
        Guid tenantId,
        Guid companyId,
        string code,
        PartnerType partnerType,
        string nameAr,
        string nameEn,
        string? taxNumber,
        string? commercialRegistration,
        string? phone,
        string? email,
        string? address,
        decimal creditLimit,
        int paymentTermsDays,
        Guid? glAccountId,
        string? createdBy,
        string? streetName = null,
        string? buildingNumber = null,
        string? plotIdentification = null,
        string? citySubdivisionName = null,
        string? cityName = null,
        string? postalZone = null,
        string? countryCode = "SA",
        string? otherIdType = null,
        string? otherIdValue = null)
    {
        return new BusinessPartner
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            Code = code.Trim(),
            PartnerType = partnerType,
            NameAr = nameAr.Trim(),
            NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr.Trim() : nameEn.Trim(),
            TaxNumber = taxNumber?.Trim(),
            CommercialRegistration = commercialRegistration?.Trim(),
            Phone = phone?.Trim(),
            Email = email?.Trim(),
            Address = address?.Trim(),
            StreetName = streetName?.Trim(),
            BuildingNumber = buildingNumber?.Trim(),
            PlotIdentification = plotIdentification?.Trim(),
            CitySubdivisionName = citySubdivisionName?.Trim(),
            CityName = cityName?.Trim(),
            PostalZone = postalZone?.Trim(),
            CountryCode = string.IsNullOrWhiteSpace(countryCode) ? "SA" : countryCode.Trim().ToUpper(),
            OtherIdType = otherIdType?.Trim(),
            OtherIdValue = string.IsNullOrWhiteSpace(otherIdValue) ? commercialRegistration?.Trim() : otherIdValue.Trim(),
            CreditLimit = creditLimit,
            PaymentTermsDays = paymentTermsDays > 0 ? paymentTermsDays : 30,
            GlAccountId = glAccountId,
            CurrentBalance = 0m,
            IsActive = true,
            CreatedBy = createdBy,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void UpdateDetails(
        string nameAr,
        string nameEn,
        string? taxNumber,
        string? commercialRegistration,
        string? phone,
        string? email,
        string? address,
        decimal creditLimit,
        int paymentTermsDays,
        Guid? glAccountId,
        bool isActive,
        string? user)
    {
        NameAr = nameAr.Trim();
        NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr.Trim() : nameEn.Trim();
        TaxNumber = taxNumber?.Trim();
        CommercialRegistration = commercialRegistration?.Trim();
        Phone = phone?.Trim();
        Email = email?.Trim();
        Address = address?.Trim();
        CreditLimit = creditLimit;
        PaymentTermsDays = paymentTermsDays;
        GlAccountId = glAccountId;
        IsActive = isActive;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = user;
    }

    public void AdjustBalance(decimal amount, bool isIncrease)
    {
        if (isIncrease)
            CurrentBalance += amount;
        else
            CurrentBalance -= amount;

        LastModifiedAtUtc = DateTime.UtcNow;
    }
}
