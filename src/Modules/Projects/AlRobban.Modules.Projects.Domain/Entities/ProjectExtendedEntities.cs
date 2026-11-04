using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Projects.Domain.Entities;

public class ProjectPlanningTask : Entity<Guid>
{
    public Guid CompanyId { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ProjectCode { get; set; } = string.Empty;
    public Guid? PhaseId { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public int DurationDays { get; set; }
    public decimal ProgressPercentage { get; set; }
    public string AssignedTo { get; set; } = string.Empty;
    public string AssignedRole { get; set; } = string.Empty;
    public bool IsMilestone { get; set; }
    public string Status { get; set; } = "Planned";
    public string? PredecessorId { get; set; }
    public decimal EstimatedCost { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ProjectPlanningTask() : base(Guid.NewGuid()) { }
    public ProjectPlanningTask(Guid id) : base(id) { }
}

public class ProjectTimesheet : Entity<Guid>
{
    public Guid CompanyId { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ProjectCode { get; set; } = string.Empty;
    public Guid? PhaseId { get; set; }
    public string? PhaseName { get; set; }
    public string Date { get; set; } = string.Empty;
    public string EntryType { get; set; } = "internal_labor";
    public string UnitOfMeasure { get; set; } = "hour";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeRole { get; set; } = string.Empty;
    public string? SubcontractorName { get; set; }
    public string? SubcontractorContractNo { get; set; }
    public decimal RetentionPercentage { get; set; }
    public decimal RetentionAmount { get; set; }
    public decimal NetPayable { get; set; }
    public string TaskDescription { get; set; } = string.Empty;
    public decimal Hours { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal TotalCost { get; set; }
    public bool IsBillable { get; set; } = true;
    public string Status { get; set; } = "Approved";
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ProjectTimesheet() : base(Guid.NewGuid()) { }
    public ProjectTimesheet(Guid id) : base(id) { }
}

public class ProjectAccountingSetting : Entity<Guid>
{
    public Guid CompanyId { get; set; }
    public decimal DefaultRetentionPercentage { get; set; } = 10m;
    public decimal DefaultAdvancePaymentPercentage { get; set; } = 20m;
    public decimal DefaultVatRate { get; set; } = 15m;
    public bool RequireConsultantApproval { get; set; } = true;
    public bool AutoPostProgressBillingToGl { get; set; } = true;
    public bool AutoIssueTaxInvoiceOnApprove { get; set; } = true;
    public bool AutoCreateProjectCostCenter { get; set; } = true;
    public int AlertGuaranteeExpiryDays { get; set; } = 30;
    public string ArAccountCode { get; set; } = "11301";
    public string ArAccountName { get; set; } = "العملاء والمدينون التجاريون";
    public string RetentionAccountCode { get; set; } = "11303";
    public string RetentionAccountName { get; set; } = "تأمينات وضمان أعمال محتجزة";
    public string AdvancePaymentAccountCode { get; set; } = "21302";
    public string AdvancePaymentAccountName { get; set; } = "دفعات مقدمة من العملاء";
    public string RevenueAccountCode { get; set; } = "41103";
    public string RevenueAccountName { get; set; } = "إيرادات عقود ومشاريع مقاولات";
    public string VatAccountCode { get; set; } = "21201";
    public string VatAccountName { get; set; } = "ضريبة القيمة المضافة المحصلة (مخرجات 15%)";
    public string GuaranteeMarginAccountCode { get; set; } = "11204";
    public string GuaranteeMarginAccountName { get; set; } = "تأمينات نقدية لخطابات الضمان لدى البنوك";
    public string GuaranteeCommissionAccountCode { get; set; } = "53102";
    public string GuaranteeCommissionAccountName { get; set; } = "عمولات ومصاريف إصدار خطابات الضمان";
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ProjectAccountingSetting() : base(Guid.NewGuid()) { }
    public ProjectAccountingSetting(Guid id) : base(id) { }
}

