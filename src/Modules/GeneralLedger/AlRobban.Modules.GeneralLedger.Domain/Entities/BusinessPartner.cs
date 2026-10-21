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
        string? createdBy)
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
