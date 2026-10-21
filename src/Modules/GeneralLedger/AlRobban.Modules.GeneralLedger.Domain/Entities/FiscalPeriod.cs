using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class FiscalPeriod : Entity<Guid>, IMustHaveTenant, IAuditableEntity, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public Guid FiscalYearId { get; private set; }
    public FiscalYear? FiscalYear { get; private set; }
    public int PeriodNumber { get; private set; }
    public string PeriodNameAr { get; private set; } = string.Empty;
    public string PeriodNameEn { get; private set; } = string.Empty;
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public FiscalPeriodStatus Status { get; private set; } = FiscalPeriodStatus.Open;
    public bool IsClosingPeriod { get; private set; } = false;

    // Audit and Soft Delete
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
    public string? DeletedBy { get; set; }

    private FiscalPeriod() { }

    public static FiscalPeriod Create(
        Guid tenantId,
        Guid companyId,
        Guid fiscalYearId,
        int periodNumber,
        string nameAr,
        string nameEn,
        DateTime startDate,
        DateTime endDate,
        bool isClosingPeriod = false,
        FiscalPeriodStatus status = FiscalPeriodStatus.Locked)
    {
        return new FiscalPeriod
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            FiscalYearId = fiscalYearId,
            PeriodNumber = periodNumber,
            PeriodNameAr = nameAr,
            PeriodNameEn = nameEn,
            StartDate = startDate,
            EndDate = endDate,
            Status = status,
            IsClosingPeriod = isClosingPeriod,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void SetStatus(FiscalPeriodStatus status)
    {
        Status = status;
        LastModifiedAtUtc = DateTime.UtcNow;
    }
}
