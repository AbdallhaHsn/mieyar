using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.HumanResources.Domain.Entities;

public class HrPolicySettings : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    // Advances & Loans Policy
    public decimal MaxAdvanceSalaryPercentage { get; private set; } = 50.0m; // Max 50% of Basic Salary
    public int MaxInstallmentMonths { get; private set; } = 12; // Max 12 installments
    public bool AutoDeductAdvancesInPayroll { get; private set; } = true;
    public decimal MinServiceMonthsForAdvance { get; private set; } = 3; // 3 months probation completed

    // Approvals Matrix
    public bool RequireDirectManagerApproval { get; private set; } = true;
    public bool RequireFinancialApproval { get; private set; } = true;

    // Custody Policy
    public bool RequireInspectionOnCustodyReturn { get; private set; } = true;
    public bool AutoDeductDamagedCustodyValue { get; private set; } = false;

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private HrPolicySettings() { }

    public static HrPolicySettings CreateDefault(Guid tenantId, Guid companyId, string? createdBy = null)
    {
        return new HrPolicySettings
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            MaxAdvanceSalaryPercentage = 50.0m,
            MaxInstallmentMonths = 12,
            AutoDeductAdvancesInPayroll = true,
            MinServiceMonthsForAdvance = 3,
            RequireDirectManagerApproval = true,
            RequireFinancialApproval = true,
            RequireInspectionOnCustodyReturn = true,
            AutoDeductDamagedCustodyValue = false,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void Update(
        decimal maxAdvanceSalaryPercentage,
        int maxInstallmentMonths,
        bool autoDeductAdvancesInPayroll,
        decimal minServiceMonthsForAdvance,
        bool requireDirectManagerApproval,
        bool requireFinancialApproval,
        bool requireInspectionOnCustodyReturn,
        bool autoDeductDamagedCustodyValue,
        string? updatedBy = null)
    {
        MaxAdvanceSalaryPercentage = Math.Clamp(maxAdvanceSalaryPercentage, 10, 200);
        MaxInstallmentMonths = Math.Clamp(maxInstallmentMonths, 1, 60);
        AutoDeductAdvancesInPayroll = autoDeductAdvancesInPayroll;
        MinServiceMonthsForAdvance = Math.Max(0, minServiceMonthsForAdvance);
        RequireDirectManagerApproval = requireDirectManagerApproval;
        RequireFinancialApproval = requireFinancialApproval;
        RequireInspectionOnCustodyReturn = requireInspectionOnCustodyReturn;
        AutoDeductDamagedCustodyValue = autoDeductDamagedCustodyValue;

        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }
}
