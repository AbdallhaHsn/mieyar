using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class JournalEntry : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string EntryNumber { get; private set; } = string.Empty;
    public DateTime EntryDate { get; private set; }
    public Guid FiscalPeriodId { get; private set; }
    public FiscalPeriod? FiscalPeriod { get; private set; }
    public JournalEntryType EntryType { get; private set; } = JournalEntryType.Daily;
    public JournalEntryStatus Status { get; private set; } = JournalEntryStatus.Draft;
    public string? ReferenceNumber { get; private set; }
    public string DescriptionAr { get; private set; } = string.Empty;
    public string DescriptionEn { get; private set; } = string.Empty;
    public decimal TotalDebit { get; private set; } = 0m;
    public decimal TotalCredit { get; private set; } = 0m;

    public Guid? ReversedEntryId { get; private set; }
    public string? ReversalReason { get; private set; }
    public DateTime? PostedAtUtc { get; private set; }
    public string? PostedBy { get; private set; }

    public List<JournalEntryLine> Lines { get; private set; } = new();

    // Audit and Soft Delete
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
    public string? DeletedBy { get; set; }

    private JournalEntry() { }

    public static JournalEntry Create(
        Guid tenantId,
        Guid companyId,
        string entryNumber,
        DateTime entryDate,
        Guid fiscalPeriodId,
        JournalEntryType entryType,
        string descriptionAr,
        string descriptionEn,
        string? referenceNumber = null,
        string? createdBy = null)
    {
        return new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            EntryNumber = entryNumber.Trim(),
            EntryDate = entryDate.Date,
            FiscalPeriodId = fiscalPeriodId,
            EntryType = entryType,
            Status = JournalEntryStatus.Draft,
            DescriptionAr = descriptionAr.Trim(),
            DescriptionEn = string.IsNullOrWhiteSpace(descriptionEn) ? descriptionAr.Trim() : descriptionEn.Trim(),
            ReferenceNumber = referenceNumber?.Trim(),
            CreatedBy = createdBy,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void AddLine(Guid accountId, decimal debit, decimal credit, string description, Guid? costCenterId = null)
    {
        if (Status != JournalEntryStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن تعديل أسطر قيد تم ترحيله أو إلغاؤه");
        }

        var line = JournalEntryLine.Create(
            TenantId,
            CompanyId,
            Id,
            Lines.Count + 1,
            accountId,
            debit,
            credit,
            description,
            costCenterId);

        Lines.Add(line);
        RecalculateTotals();
    }

    public void ClearLines()
    {
        if (Status != JournalEntryStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن حذف أسطر قيد تم ترحيله");
        }

        Lines.Clear();
        TotalDebit = 0m;
        TotalCredit = 0m;
    }

    public void RecalculateTotals()
    {
        TotalDebit = Math.Round(Lines.Sum(x => x.Debit), 4);
        TotalCredit = Math.Round(Lines.Sum(x => x.Credit), 4);
    }

    public bool IsBalanced()
    {
        return Lines.Count >= 2 && Math.Abs(TotalDebit - TotalCredit) < 0.0001m && TotalDebit > 0;
    }

    public void Post(string postedBy, bool isPeriodOpen)
    {
        if (Status != JournalEntryStatus.Draft)
        {
            throw new InvalidOperationException("القيد تم ترحيله مسبقاً أو ملغي");
        }

        if (!isPeriodOpen)
        {
            throw new InvalidOperationException("لا يمكن ترحيل القيد لأن الفترة المالية الخاصة بتاريخه مقفلة أو مغلقة");
        }

        RecalculateTotals();
        if (!IsBalanced())
        {
            throw new InvalidOperationException($"القيد غير متوازن محاسبياً (إجمالي المدين: {TotalDebit} ≠ إجمالي الدائن: {TotalCredit})");
        }

        Status = JournalEntryStatus.Posted;
        PostedAtUtc = DateTime.UtcNow;
        PostedBy = postedBy;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = postedBy;
    }

    public JournalEntry CreateReversal(string reversalNumber, string reversedBy, string reason)
    {
        if (Status != JournalEntryStatus.Posted)
        {
            throw new InvalidOperationException("لا يمكن إنشاء قيد عكسي إلا لقيد مرحّل بالفعل");
        }

        // Mark this entry as reversed
        Status = JournalEntryStatus.Reversed;
        ReversalReason = reason;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = reversedBy;

        // Create the opposing entry
        var reversal = new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            CompanyId = CompanyId,
            EntryNumber = reversalNumber,
            EntryDate = DateTime.UtcNow.Date,
            FiscalPeriodId = FiscalPeriodId,
            EntryType = JournalEntryType.Adjustment,
            Status = JournalEntryStatus.Posted,
            DescriptionAr = $"قيد عكسي لإلغاء القيد رقم {EntryNumber}: {reason}",
            DescriptionEn = $"Reversal entry for JV {EntryNumber}: {reason}",
            ReferenceNumber = EntryNumber,
            ReversedEntryId = Id,
            ReversalReason = reason,
            PostedAtUtc = DateTime.UtcNow,
            PostedBy = reversedBy,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = reversedBy
        };

        // Swap Debit and Credit for each line
        int lineNum = 1;
        foreach (var originalLine in Lines)
        {
            var revLine = JournalEntryLine.Create(
                TenantId,
                CompanyId,
                reversal.Id,
                lineNum++,
                originalLine.AccountId,
                debit: originalLine.Credit,   // Swap
                credit: originalLine.Debit,   // Swap
                description: $"عكس: {originalLine.Description}",
                costCenterId: originalLine.CostCenterId);

            reversal.Lines.Add(revLine);
        }

        reversal.RecalculateTotals();
        return reversal;
    }
}
