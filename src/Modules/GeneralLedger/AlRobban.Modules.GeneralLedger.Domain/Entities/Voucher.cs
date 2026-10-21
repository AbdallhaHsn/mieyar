using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class Voucher : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public VoucherType VoucherType { get; private set; }
    public string VoucherNumber { get; private set; } = string.Empty;
    public DateTime VoucherDate { get; private set; }
    public Guid FiscalPeriodId { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; }
    public string? ReferenceNumber { get; private set; } // رقم الشيك أو الحوالة أو إيصال الإيداع
    public Guid CashOrBankAccountId { get; private set; } // حساب النقدية أو البنك
    public Account? CashOrBankAccount { get; private set; }
    public string BeneficiaryOrPayerName { get; private set; } = string.Empty; // استلمنا من / صرفنا إلى
    public string Description { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public Guid? JournalEntryId { get; private set; } // قيد اليومية المتولد آلياً
    public JournalEntry? JournalEntry { get; private set; }
    public VoucherStatus Status { get; private set; } = VoucherStatus.Draft;

    public DateTime? PostedAtUtc { get; private set; }
    public string? PostedBy { get; private set; }
    public DateTime? CancelledAtUtc { get; private set; }
    public string? CancelledBy { get; private set; }
    public string? CancellationReason { get; private set; }

    public List<VoucherLine> Lines { get; private set; } = new();

    // Audit and Soft Delete
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
    public string? DeletedBy { get; set; }

    private Voucher() { }

    public static Voucher Create(
        Guid tenantId,
        Guid companyId,
        VoucherType voucherType,
        string voucherNumber,
        DateTime voucherDate,
        Guid fiscalPeriodId,
        PaymentMethod paymentMethod,
        Guid cashOrBankAccountId,
        string beneficiaryOrPayerName,
        string description,
        string? referenceNumber = null,
        string? createdBy = null)
    {
        return new Voucher
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            VoucherType = voucherType,
            VoucherNumber = voucherNumber,
            VoucherDate = voucherDate.Date,
            FiscalPeriodId = fiscalPeriodId,
            PaymentMethod = paymentMethod,
            CashOrBankAccountId = cashOrBankAccountId,
            BeneficiaryOrPayerName = beneficiaryOrPayerName.Trim(),
            Description = description.Trim(),
            ReferenceNumber = referenceNumber?.Trim(),
            Status = VoucherStatus.Draft,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void AddLine(Guid accountId, decimal amount, string? lineDescription = null, Guid? costCenterId = null)
    {
        if (Status != VoucherStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن تعديل بنود السند بعد ترحيله أو إلغائه");
        }

        if (amount <= 0)
        {
            throw new ArgumentException("يجب أن يكون مبلغ البند أكبر من صفر", nameof(amount));
        }

        var line = VoucherLine.Create(
            TenantId,
            CompanyId,
            Id,
            Lines.Count + 1,
            accountId,
            amount,
            lineDescription?.Trim() ?? Description,
            costCenterId);

        Lines.Add(line);
        RecalculateTotal();
    }

    public void RecalculateTotal()
    {
        Amount = Lines.Sum(l => l.Amount);
    }

    public void Post(Guid journalEntryId, string postedBy)
    {
        if (Status != VoucherStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن ترحيل إلا السندات التي بحالة مسودة");
        }

        if (Lines.Count == 0 || Amount <= 0)
        {
            throw new InvalidOperationException("لا يمكن ترحيل سند بدون بنود مالية معتمدة");
        }

        Status = VoucherStatus.Posted;
        JournalEntryId = journalEntryId;
        PostedAtUtc = DateTime.UtcNow;
        PostedBy = postedBy;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = postedBy;
    }

    public void Cancel(string cancelledBy, string reason)
    {
        if (Status != VoucherStatus.Posted)
        {
            throw new InvalidOperationException("لا يمكن إلغاء إلا السندات المرحلة فقط");
        }

        Status = VoucherStatus.Cancelled;
        CancelledAtUtc = DateTime.UtcNow;
        CancelledBy = cancelledBy;
        CancellationReason = reason.Trim();
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = cancelledBy;
    }
}

public class VoucherLine : Entity<Guid>, IMustHaveTenant
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }
    public Guid VoucherId { get; set; }
    public int LineNumber { get; set; }
    public Guid AccountId { get; set; }
    public Account? Account { get; set; }
    public Guid? CostCenterId { get; set; }
    public CostCenter? CostCenter { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }

    public Voucher? Voucher { get; set; }

    public VoucherLine() { }

    public static VoucherLine Create(
        Guid tenantId,
        Guid companyId,
        Guid voucherId,
        int lineNumber,
        Guid accountId,
        decimal amount,
        string? description,
        Guid? costCenterId = null)
    {
        return new VoucherLine
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            VoucherId = voucherId,
            LineNumber = lineNumber,
            AccountId = accountId,
            CostCenterId = costCenterId,
            Amount = amount,
            Description = description
        };
    }
}
