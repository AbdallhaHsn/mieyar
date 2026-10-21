using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class CurrencyRate : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string CurrencyCode { get; private set; } = string.Empty; // USD, EUR, GBP, AED, etc.
    public string CurrencyNameAr { get; private set; } = string.Empty;
    public string CurrencyNameEn { get; private set; } = string.Empty;
    public decimal ExchangeRateToSar { get; private set; } // سعر التحويل إلى الريال السعودي (مثال: USD = 3.7500)
    public DateTime EffectiveDate { get; private set; }
    public bool IsActive { get; private set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private CurrencyRate() { }

    public static CurrencyRate Create(
        Guid tenantId,
        Guid companyId,
        string currencyCode,
        string currencyNameAr,
        string currencyNameEn,
        decimal exchangeRateToSar,
        DateTime effectiveDate,
        string? createdBy)
    {
        if (exchangeRateToSar <= 0)
            throw new ArgumentException("سعر الصرف يجب أن يكون أكبر من صفر.", nameof(exchangeRateToSar));

        return new CurrencyRate
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            CurrencyCode = currencyCode.Trim().ToUpperInvariant(),
            CurrencyNameAr = currencyNameAr.Trim(),
            CurrencyNameEn = string.IsNullOrWhiteSpace(currencyNameEn) ? currencyCode.Trim().ToUpperInvariant() : currencyNameEn.Trim(),
            ExchangeRateToSar = exchangeRateToSar,
            EffectiveDate = effectiveDate.Date,
            IsActive = true,
            CreatedBy = createdBy,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void UpdateRate(decimal newRate, DateTime effectiveDate, string? user)
    {
        if (newRate <= 0)
            throw new ArgumentException("سعر الصرف يجب أن يكون أكبر من صفر.", nameof(newRate));

        ExchangeRateToSar = newRate;
        EffectiveDate = effectiveDate.Date;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = user;
    }
}
