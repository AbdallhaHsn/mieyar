using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public enum CheckType
{
    Receivable = 1, // ورقة قبض (شيك استلام من عميل)
    Payable = 2     // ورقة دفع (شيك صادر لمورد)
}

public enum CheckStatus
{
    UnderCollection = 1, // في المحفظة / تحت التحصيل
    Deposited = 2,       // مودع لدى البنك للتحصيل
    Cleared = 3,         // تم تحصيله فعلياً وأضيف للرصيد
    Bounced = 4,         // مرتد / مرفوض لعدم كفاية الرصيد
    Cancelled = 5        // ملغي
}

public class PostDatedCheck : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string CheckNumber { get; private set; } = string.Empty;
    public string BankName { get; private set; } = string.Empty;
    public string DrawerName { get; private set; } = string.Empty; // الساحب أو المستفيد
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "SAR";
    public DateTime IssueDate { get; private set; }
    public DateTime DueDate { get; private set; }
    public CheckType CheckType { get; private set; } = CheckType.Receivable;
    public CheckStatus Status { get; private set; } = CheckStatus.UnderCollection;

    public Guid? BankAccountId { get; private set; } // الحساب البنكي المودع به
    public Guid? PartnerAccountId { get; private set; } // حساب العميل أو المورد المرتبط
    public Guid? AssociatedJournalEntryId { get; private set; }
    public string? BounceReason { get; private set; }
    public decimal BounceFee { get; private set; } = 0m;
    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private PostDatedCheck() { }

    public static PostDatedCheck Create(
        Guid tenantId,
        Guid companyId,
        string checkNumber,
        string bankName,
        string drawerName,
        decimal amount,
        DateTime issueDate,
        DateTime dueDate,
        CheckType checkType,
        Guid? partnerAccountId,
        string? notes,
        string? createdBy)
    {
        if (amount <= 0)
            throw new ArgumentException("مبلغ الشيك يجب أن يكون أكبر من صفر.", nameof(amount));

        return new PostDatedCheck
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            CheckNumber = checkNumber.Trim(),
            BankName = bankName.Trim(),
            DrawerName = drawerName.Trim(),
            Amount = amount,
            IssueDate = issueDate.Date,
            DueDate = dueDate.Date,
            CheckType = checkType,
            Status = CheckStatus.UnderCollection,
            PartnerAccountId = partnerAccountId,
            Notes = notes,
            CreatedBy = createdBy,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void DepositForCollection(Guid bankAccountId, string? user)
    {
        if (Status != CheckStatus.UnderCollection)
            throw new InvalidOperationException("لا يمكن إيداع شيك إلا إذا كان في المحفظة تحت التحصيل.");

        BankAccountId = bankAccountId;
        Status = CheckStatus.Deposited;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = user;
    }

    public void Clear(Guid? journalEntryId, string? user)
    {
        Status = CheckStatus.Cleared;
        AssociatedJournalEntryId = journalEntryId;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = user;
    }

    public void Bounce(string reason, decimal bounceFee, Guid? reversalEntryId, string? user)
    {
        Status = CheckStatus.Bounced;
        BounceReason = reason;
        BounceFee = bounceFee;
        AssociatedJournalEntryId = reversalEntryId;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = user;
    }
}
