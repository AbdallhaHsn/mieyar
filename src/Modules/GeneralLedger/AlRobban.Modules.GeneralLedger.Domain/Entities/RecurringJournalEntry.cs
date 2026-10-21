using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public enum RecurringFrequency
{
    Monthly = 1,      // شهري
    Quarterly = 2,    // ربع سنوي
    SemiAnnually = 3, // نصف سنوي
    Annually = 4      // سنوي
}

public class RecurringJournalEntry : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string DescriptionAr { get; private set; } = string.Empty;
    public string DescriptionEn { get; private set; } = string.Empty;
    public RecurringFrequency Frequency { get; private set; } = RecurringFrequency.Monthly;
    public DateTime StartDate { get; private set; }
    public DateTime? EndDate { get; private set; }
    public DateTime NextRunDate { get; private set; }
    public DateTime? LastRunDate { get; private set; }
    public int ExecutionCount { get; private set; } = 0;
    public bool IsActive { get; private set; } = true;

    public List<RecurringJournalEntryLine> Lines { get; private set; } = new();

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private RecurringJournalEntry() { }

    public static RecurringJournalEntry Create(
        Guid tenantId,
        Guid companyId,
        string title,
        string descriptionAr,
        string descriptionEn,
        RecurringFrequency frequency,
        DateTime startDate,
        DateTime? endDate,
        string? createdBy)
    {
        return new RecurringJournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            Title = title.Trim(),
            DescriptionAr = descriptionAr.Trim(),
            DescriptionEn = string.IsNullOrWhiteSpace(descriptionEn) ? descriptionAr.Trim() : descriptionEn.Trim(),
            Frequency = frequency,
            StartDate = startDate.Date,
            EndDate = endDate?.Date,
            NextRunDate = startDate.Date,
            IsActive = true,
            CreatedBy = createdBy,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void AddLine(Guid accountId, decimal debit, decimal credit, string description, Guid? costCenterId = null)
    {
        Lines.Add(new RecurringJournalEntryLine
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            RecurringEntryId = Id,
            AccountId = accountId,
            Debit = debit,
            Credit = credit,
            Description = description,
            CostCenterId = costCenterId
        });
    }

    public void RecordExecution(DateTime runDate, string user)
    {
        LastRunDate = runDate.Date;
        ExecutionCount++;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = user;

        // Advance NextRunDate
        NextRunDate = Frequency switch
        {
            RecurringFrequency.Monthly => NextRunDate.AddMonths(1),
            RecurringFrequency.Quarterly => NextRunDate.AddMonths(3),
            RecurringFrequency.SemiAnnually => NextRunDate.AddMonths(6),
            RecurringFrequency.Annually => NextRunDate.AddYears(1),
            _ => NextRunDate.AddMonths(1)
        };

        if (EndDate.HasValue && NextRunDate > EndDate.Value)
        {
            IsActive = false;
        }
    }

    public void ToggleActive(bool isActive)
    {
        IsActive = isActive;
        LastModifiedAtUtc = DateTime.UtcNow;
    }
}

public class RecurringJournalEntryLine : IMustHaveTenant
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid RecurringEntryId { get; set; }
    public RecurringJournalEntry? RecurringEntry { get; set; }

    public Guid AccountId { get; set; }
    public Account? Account { get; set; }

    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string Description { get; set; } = string.Empty;
    public Guid? CostCenterId { get; set; }
    public CostCenter? CostCenter { get; set; }
}
