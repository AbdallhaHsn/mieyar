using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Domain.Entities;

public class FiscalYear : Entity<Guid>, IMustHaveTenant, IAuditableEntity
{
    private readonly List<FiscalPeriod> _periods = [];

    public Guid TenantId { get; set; }
    public int YearNumber { get; private set; }
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

    public IReadOnlyCollection<FiscalPeriod> Periods => _periods.AsReadOnly();

    private FiscalYear() { } // EF Core

    internal FiscalYear(
        Guid id,
        Guid tenantId,
        int yearNumber,
        string nameAr,
        string nameEn,
        DateTime startDate,
        DateTime endDate) : base(id)
    {
        TenantId = tenantId;
        YearNumber = yearNumber;
        NameAr = nameAr;
        NameEn = nameEn;
        StartDate = startDate;
        EndDate = endDate;
        IsClosed = false;

        GenerateMonthlyPeriods();
    }

    public void GenerateMonthlyPeriods()
    {
        _periods.Clear();

        string[] arabicMonths = [
            "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ];

        string[] englishMonths = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        for (int i = 1; i <= 12; i++)
        {
            var periodStart = new DateTime(YearNumber, i, 1, 0, 0, 0, DateTimeKind.Utc);
            var periodEnd = periodStart.AddMonths(1).AddTicks(-1);

            var period = new FiscalPeriod(
                Guid.NewGuid(),
                TenantId,
                Id,
                i,
                $"{arabicMonths[i - 1]} {YearNumber}",
                $"{englishMonths[i - 1]} {YearNumber}",
                periodStart,
                periodEnd);

            _periods.Add(period);
        }
    }

    public void CloseYear()
    {
        IsClosed = true;
        foreach (var period in _periods)
        {
            period.ClosePeriod();
        }
    }
}
