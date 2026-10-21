using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class CompanyFinancialSettings : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string DefaultCurrency { get; private set; } = "SAR";
    public CalendarType CalendarType { get; private set; } = CalendarType.Gregorian;
    public CostCenterPolicy CostCenterPolicy { get; private set; } = CostCenterPolicy.MandatoryForIncomeAndExpense;
    public bool AllowBackdatedEntries { get; private set; } = false;
    public int MaxBackdatedDays { get; private set; } = 0;
    public bool RequireApprovalForEntries { get; private set; } = true;
    public bool Include13thClosingPeriod { get; private set; } = true;

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private CompanyFinancialSettings() { }

    public static CompanyFinancialSettings CreateDefault(Guid tenantId, Guid companyId)
    {
        return new CompanyFinancialSettings
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            DefaultCurrency = "SAR",
            CalendarType = CalendarType.Gregorian,
            CostCenterPolicy = CostCenterPolicy.MandatoryForIncomeAndExpense,
            AllowBackdatedEntries = false,
            MaxBackdatedDays = 0,
            RequireApprovalForEntries = true,
            Include13thClosingPeriod = true,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void Update(
        string defaultCurrency,
        CalendarType calendarType,
        CostCenterPolicy costCenterPolicy,
        bool allowBackdatedEntries,
        int maxBackdatedDays,
        bool requireApprovalForEntries,
        bool include13thClosingPeriod)
    {
        DefaultCurrency = string.IsNullOrWhiteSpace(defaultCurrency) ? "SAR" : defaultCurrency.Trim().ToUpperInvariant();
        CalendarType = calendarType;
        CostCenterPolicy = costCenterPolicy;
        AllowBackdatedEntries = allowBackdatedEntries;
        MaxBackdatedDays = maxBackdatedDays;
        RequireApprovalForEntries = requireApprovalForEntries;
        Include13thClosingPeriod = include13thClosingPeriod;
        LastModifiedAtUtc = DateTime.UtcNow;
    }
}
