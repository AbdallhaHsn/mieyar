using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Domain.Entities;

public class FiscalPeriod : Entity<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid FiscalYearId { get; private set; }
    public int PeriodNumber { get; private set; }
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public bool IsClosed { get; private set; }

    // Auditing
    public DateTime CreatedAtUtc { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private FiscalPeriod() { } // EF Core

    internal FiscalPeriod(
        Guid id,
        Guid tenantId,
        Guid fiscalYearId,
        int periodNumber,
        string nameAr,
        string nameEn,
        DateTime startDate,
        DateTime endDate) : base(id)
    {
        TenantId = tenantId;
        FiscalYearId = fiscalYearId;
        PeriodNumber = periodNumber;
        NameAr = nameAr;
        NameEn = nameEn;
        StartDate = startDate;
        EndDate = endDate;
        IsClosed = false;
    }

    public void ClosePeriod() => IsClosed = true;
    public void ReopenPeriod() => IsClosed = false;
}
