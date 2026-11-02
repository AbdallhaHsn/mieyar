using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Projects.Domain.Entities;

public class LetterOfGuarantee : Entity<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public Guid ProjectId { get; private set; }

    public string GuaranteeNumber { get; private set; } = string.Empty; // رقم خطاب الضمان
    public GuaranteeType Type { get; private set; } = GuaranteeType.PerformanceBond;
    public string IssuingBank { get; private set; } = string.Empty; // مصرف الراجحي، بنك الرياض، إلخ
    public string? BankBranch { get; private set; }
    public string? BankAccountNumber { get; private set; }
    public string BeneficiaryName { get; private set; } = string.Empty; // اسم المستفيد / العميل

    public decimal Amount { get; private set; } // قيمة الضمان
    public decimal CashMarginPercentage { get; private set; } // نسبة الغطاء النقدي %
    public decimal CashMarginAmount { get; private set; } // مبلغ الغطاء النقدي المحجوز
    public decimal BankCommission { get; private set; } // عمولة ومصاريف البنك

    public DateTime IssueDate { get; private set; } = DateTime.UtcNow;
    public DateTime ExpiryDate { get; private set; }
    public GuaranteeStatus Status { get; private set; } = GuaranteeStatus.Active;

    public Guid? AssociatedJournalEntryId { get; private set; }
    public string? AssociatedJournalEntryNumber { get; private set; }

    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private LetterOfGuarantee() { }

    public LetterOfGuarantee(
        Guid id,
        Guid companyId,
        Guid projectId,
        string guaranteeNumber,
        GuaranteeType type,
        string issuingBank,
        string beneficiaryName,
        decimal amount,
        decimal cashMarginPercentage,
        decimal bankCommission,
        DateTime issueDate,
        DateTime expiryDate,
        string? bankBranch = null,
        string? bankAccountNumber = null,
        string? notes = null)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        CompanyId = companyId;
        TenantId = companyId;
        ProjectId = projectId;
        GuaranteeNumber = guaranteeNumber;
        Type = type;
        IssuingBank = issuingBank;
        BeneficiaryName = beneficiaryName;
        Amount = Math.Max(0, amount);
        CashMarginPercentage = Math.Clamp(cashMarginPercentage, 0, 100);
        CashMarginAmount = Math.Round(Amount * (CashMarginPercentage / 100m), 2);
        BankCommission = Math.Max(0, bankCommission);
        IssueDate = issueDate;
        ExpiryDate = expiryDate;
        BankBranch = bankBranch;
        BankAccountNumber = bankAccountNumber;
        Notes = notes;
        Status = GuaranteeStatus.Active;
    }

    public void Extend(DateTime newExpiryDate, decimal additionalCommission = 0, string? notes = null)
    {
        if (newExpiryDate <= ExpiryDate)
            throw new ArgumentException("تاريخ التمديد الجديد يجب أن يكون بعد تاريخ الانتهاء الحالي");

        ExpiryDate = newExpiryDate;
        BankCommission += Math.Max(0, additionalCommission);
        Status = GuaranteeStatus.Extended;
        if (!string.IsNullOrWhiteSpace(notes))
        {
            Notes = $"{Notes} | تمديد: {notes}";
        }
    }

    public void Release(string? notes = null)
    {
        Status = GuaranteeStatus.Released;
        if (!string.IsNullOrWhiteSpace(notes))
        {
            Notes = $"{Notes} | إفراج: {notes}";
        }
    }

    public void Claim(string reason)
    {
        Status = GuaranteeStatus.Claimed;
        Notes = $"{Notes} | مصادرة: {reason}";
    }

    public void SetGlJournalEntry(Guid journalEntryId, string journalEntryNumber)
    {
        AssociatedJournalEntryId = journalEntryId;
        AssociatedJournalEntryNumber = journalEntryNumber;
    }
}
