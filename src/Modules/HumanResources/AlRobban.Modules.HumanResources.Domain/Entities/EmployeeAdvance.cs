using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.HumanResources.Domain.Entities;

public class EmployeeAdvance : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string AdvanceNumber { get; private set; } = string.Empty;
    public Guid EmployeeId { get; private set; }
    public Employee? Employee { get; private set; }

    public DateTime RequestDate { get; private set; }
    public decimal Amount { get; private set; }
    public int InstallmentsCount { get; private set; }
    public decimal MonthlyDeductionAmount { get; private set; }

    public string DeductionStartPeriod { get; private set; } = string.Empty; // e.g. "2026-11"
    public decimal PaidAmount { get; private set; } = 0m;
    public decimal RemainingAmount => Amount - PaidAmount;

    public string ReasonAr { get; private set; } = string.Empty;
    public string ReasonEn { get; private set; } = string.Empty;
    public string? Notes { get; private set; }

    public AdvanceStatus Status { get; private set; } = AdvanceStatus.Pending;

    // Approvals Workflow
    public string? ApprovedBy { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public string? RejectionReason { get; private set; }
    public string? RejectedBy { get; private set; }
    public DateTime? RejectedAtUtc { get; private set; }

    // Disbursement
    public string? DisbursedBy { get; private set; }
    public DateTime? DisbursedAtUtc { get; private set; }
    public string? DisbursementAccount { get; private set; }

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private EmployeeAdvance() { }

    public static EmployeeAdvance Create(
        Guid tenantId,
        Guid companyId,
        string advanceNumber,
        Guid employeeId,
        DateTime requestDate,
        decimal amount,
        int installmentsCount,
        string deductionStartPeriod,
        string reasonAr,
        string reasonEn,
        string? notes = null,
        string? createdBy = null)
    {
        if (amount <= 0) throw new ArgumentException("قيمة السلفة يجب أن تكون أكبر من الصفر", nameof(amount));
        if (installmentsCount <= 0) installmentsCount = 1;

        var monthly = Math.Round(amount / installmentsCount, 2);

        return new EmployeeAdvance
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            AdvanceNumber = advanceNumber.Trim(),
            EmployeeId = employeeId,
            RequestDate = requestDate.Date,
            Amount = amount,
            InstallmentsCount = installmentsCount,
            MonthlyDeductionAmount = monthly,
            DeductionStartPeriod = deductionStartPeriod.Trim(),
            ReasonAr = reasonAr.Trim(),
            ReasonEn = string.IsNullOrWhiteSpace(reasonEn) ? reasonAr.Trim() : reasonEn.Trim(),
            Notes = notes?.Trim(),
            Status = AdvanceStatus.Pending,
            PaidAmount = 0m,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void Approve(string approvedBy)
    {
        if (Status != AdvanceStatus.Pending)
            throw new InvalidOperationException("لا يمكن اعتماد سلفة إلا إذا كانت بحالة قيد المراجعة");

        Status = AdvanceStatus.Approved;
        ApprovedBy = approvedBy;
        ApprovedAtUtc = DateTime.UtcNow;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = approvedBy;
    }

    public void Reject(string rejectedBy, string reason)
    {
        if (Status != AdvanceStatus.Pending && Status != AdvanceStatus.Approved)
            throw new InvalidOperationException("لا يمكن رفض سلفة مصروفة أو ملغية مسبقاً");

        Status = AdvanceStatus.Rejected;
        RejectedBy = rejectedBy;
        RejectionReason = reason.Trim();
        RejectedAtUtc = DateTime.UtcNow;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = rejectedBy;
    }

    public void Disburse(string disbursedBy, string disbursementAccount)
    {
        if (Status != AdvanceStatus.Approved)
            throw new InvalidOperationException("لا يمكن صرف سلفة إلا بعد اعتمادها رسمياً");

        Status = AdvanceStatus.Disbursed;
        DisbursedBy = disbursedBy;
        DisbursedAtUtc = DateTime.UtcNow;
        DisbursementAccount = disbursementAccount.Trim();
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = disbursedBy;
    }

    public void RecordInstallmentPayment(decimal paymentAmount, string? updatedBy = null)
    {
        if (paymentAmount <= 0) return;

        PaidAmount = Math.Min(Amount, PaidAmount + paymentAmount);
        if (PaidAmount >= Amount)
        {
            Status = AdvanceStatus.FullySettled;
        }

        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }
}
