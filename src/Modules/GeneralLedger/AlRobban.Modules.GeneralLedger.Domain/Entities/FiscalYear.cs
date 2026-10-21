using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class FiscalYear : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public int YearNumber { get; private set; }
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool IsClosed { get; private set; } = false;
    public DateTime? ClosedAtUtc { get; private set; }

    public List<FiscalPeriod> Periods { get; private set; } = new();

    // Audit and Soft Delete
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
    public string? DeletedBy { get; set; }

    private FiscalYear() { }

    public static FiscalYear Create(
        Guid tenantId,
        Guid companyId,
        int yearNumber,
        string nameAr,
        string nameEn,
        DateTime startDate,
        DateTime endDate,
        bool includeClosingPeriod = true)
    {
        var year = new FiscalYear
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            YearNumber = yearNumber,
            NameAr = nameAr.Trim(),
            NameEn = nameEn.Trim(),
            StartDate = startDate.Date,
            EndDate = endDate.Date,
            IsActive = true,
            IsClosed = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        year.GeneratePeriods(includeClosingPeriod);
        return year;
    }

    public void GeneratePeriods(bool includeClosingPeriod)
    {
        Periods.Clear();
        string[] arMonths = { "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر" };
        string[] enMonths = { "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" };

        DateTime curStart = StartDate;
        var today = DateTime.UtcNow.Date;
        for (int i = 1; i <= 12; i++)
        {
            DateTime curEnd;
            if (StartDate.Day == 1 && StartDate.Month == 1 && EndDate.Day == 31 && EndDate.Month == 12)
            {
                var daysInMonth = DateTime.DaysInMonth(YearNumber, i);
                curStart = new DateTime(YearNumber, i, 1);
                curEnd = new DateTime(YearNumber, i, daysInMonth);
            }
            else
            {
                // Custom period calculation
                curEnd = curStart.AddMonths(1).AddDays(-1);
                if (i == 12 || curEnd > EndDate)
                {
                    curEnd = EndDate;
                }
            }

            // Accounting Standard Rule: Only current active month is Open by default.
            // Past months and future months are Locked to prevent unauthorized/accidental entries.
            FiscalPeriodStatus initialStatus;
            if (curStart <= today && today <= curEnd)
            {
                initialStatus = FiscalPeriodStatus.Open;
            }
            else
            {
                initialStatus = FiscalPeriodStatus.Locked;
            }

            var period = FiscalPeriod.Create(
                TenantId,
                CompanyId,
                Id,
                i,
                $"فترة {arMonths[i - 1]} {YearNumber}",
                $"{enMonths[i - 1]} {YearNumber}",
                curStart,
                curEnd,
                isClosingPeriod: false,
                status: initialStatus);

            Periods.Add(period);
            curStart = curEnd.AddDays(1);
        }

        if (includeClosingPeriod)
        {
            var period13 = FiscalPeriod.Create(
                TenantId,
                CompanyId,
                Id,
                13,
                $"فترة التسويات الختامية والإقفال {YearNumber}",
                $"Year-End Adjustments & Closing {YearNumber}",
                EndDate,
                EndDate,
                isClosingPeriod: true,
                status: FiscalPeriodStatus.Locked);

            Periods.Add(period13);
        }
    }

    public void CloseYear()
    {
        IsClosed = true;
        ClosedAtUtc = DateTime.UtcNow;
        foreach (var period in Periods)
        {
            period.SetStatus(FiscalPeriodStatus.Closed);
        }
    }

    public void ReopenYear()
    {
        IsClosed = false;
        ClosedAtUtc = null;
    }
}
