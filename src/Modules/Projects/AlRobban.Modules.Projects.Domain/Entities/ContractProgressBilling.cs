using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Projects.Domain.Entities;

public class ContractProgressBilling : Entity<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public Guid ProjectId { get; private set; }

    public string BillingNumber { get; private set; } = string.Empty; // e.g. BILL-PRJ01-001
    public int BillingSequence { get; private set; } = 1; // 1st, 2nd, 3rd billing
    public DateTime BillingDate { get; private set; } = DateTime.UtcNow;
    public DateTime PeriodStart { get; private set; }
    public DateTime PeriodEnd { get; private set; }

    // Work Amounts
    public decimal PreviousWorkAmount { get; private set; }
    public decimal CurrentWorkAmount { get; private set; }
    public decimal TotalWorkAmount => PreviousWorkAmount + CurrentWorkAmount;

    // Deductions & Retentions
    public decimal RetentionPercentage { get; private set; } = 10m; // 10%
    public decimal RetentionAmount { get; private set; }
    public decimal AdvancePaymentDeduction { get; private set; }
    public decimal OtherDeductions { get; private set; }
    public string? DeductionsNotes { get; private set; }

    // Net & Tax
    public decimal NetAmount { get; private set; }
    public decimal VatRate { get; private set; } = 0.15m;
    public decimal VatAmount { get; private set; }
    public decimal TotalWithVat { get; private set; }

    // Workflow Status
    public BillingStatus Status { get; private set; } = BillingStatus.Draft;
    public string? ConsultantName { get; private set; }
    public DateTime? ConsultantApprovalDate { get; private set; }
    public string? ConsultantNotes { get; private set; }

    // Accounting & Invoicing Integration
    public Guid? AssociatedInvoiceId { get; private set; }
    public string? AssociatedInvoiceNumber { get; private set; }
    public Guid? AssociatedJournalEntryId { get; private set; }
    public string? AssociatedJournalEntryNumber { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private ContractProgressBilling() { }

    public ContractProgressBilling(
        Guid id,
        Guid companyId,
        Guid projectId,
        string billingNumber,
        int billingSequence,
        DateTime billingDate,
        DateTime periodStart,
        DateTime periodEnd,
        decimal previousWorkAmount,
        decimal currentWorkAmount,
        decimal retentionPercentage,
        decimal advancePaymentDeduction = 0,
        decimal otherDeductions = 0,
        string? deductionsNotes = null,
        decimal vatRate = 0.15m,
        string? consultantName = null)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        CompanyId = companyId;
        TenantId = companyId;
        ProjectId = projectId;
        BillingNumber = billingNumber;
        BillingSequence = Math.Max(1, billingSequence);
        BillingDate = billingDate;
        PeriodStart = periodStart;
        PeriodEnd = periodEnd;
        PreviousWorkAmount = Math.Max(0, previousWorkAmount);
        CurrentWorkAmount = Math.Max(0, currentWorkAmount);
        RetentionPercentage = Math.Clamp(retentionPercentage, 0, 100);
        AdvancePaymentDeduction = Math.Max(0, advancePaymentDeduction);
        OtherDeductions = Math.Max(0, otherDeductions);
        DeductionsNotes = deductionsNotes;
        VatRate = vatRate;
        ConsultantName = consultantName;
        Status = BillingStatus.Draft;

        RecalculateTotals();
    }

    public void RecalculateTotals()
    {
        RetentionAmount = Math.Round(CurrentWorkAmount * (RetentionPercentage / 100m), 2);
        var totalDeductions = RetentionAmount + AdvancePaymentDeduction + OtherDeductions;
        NetAmount = Math.Max(0, Math.Round(CurrentWorkAmount - totalDeductions, 2));
        VatAmount = Math.Round(NetAmount * VatRate, 2);
        TotalWithVat = NetAmount + VatAmount;
    }

    public void SubmitToConsultant(string? consultantName, string? notes = null)
    {
        if (Status != BillingStatus.Draft)
            throw new InvalidOperationException("لا يمكن رفع المستخلص إلا إذا كان في حالة مسودة");

        Status = BillingStatus.Submitted;
        ConsultantName = consultantName ?? ConsultantName;
        ConsultantNotes = notes;
    }

    public void ApproveByConsultant(string consultantName, string? notes = null)
    {
        if (Status != BillingStatus.Submitted && Status != BillingStatus.Draft)
            throw new InvalidOperationException("المستخلص غير مؤهل للاعتماد من الاستشاري");

        Status = BillingStatus.ConsultantApproved;
        ConsultantName = consultantName;
        ConsultantApprovalDate = DateTime.UtcNow;
        ConsultantNotes = notes;
    }

    public void CertifyForPayment(Guid? journalEntryId = null, string? journalEntryNumber = null)
    {
        if (Status != BillingStatus.ConsultantApproved && Status != BillingStatus.Submitted && Status != BillingStatus.Draft)
            throw new InvalidOperationException("لا يمكن اعتماد المستخلص للصرف في حالته الحالية");

        Status = BillingStatus.Certified;
        if (journalEntryId.HasValue)
        {
            AssociatedJournalEntryId = journalEntryId;
            AssociatedJournalEntryNumber = journalEntryNumber;
        }
    }

    public void LinkTaxInvoice(Guid invoiceId, string invoiceNumber)
    {
        AssociatedInvoiceId = invoiceId;
        AssociatedInvoiceNumber = invoiceNumber;
        Status = BillingStatus.Invoiced;
    }

    public void Reject(string reason)
    {
        Status = BillingStatus.Rejected;
        ConsultantNotes = reason;
    }
}
