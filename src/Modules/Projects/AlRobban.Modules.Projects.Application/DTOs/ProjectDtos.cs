using AlRobban.Modules.Projects.Domain.Enums;

namespace AlRobban.Modules.Projects.Application.DTOs;

public class ProjectDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public Guid? CostCenterId { get; set; }
    public string? CostCenterName { get; set; }

    public string ContractNumber { get; set; } = string.Empty;
    public DateTime? ContractDate { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime ExpectedEndDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    public decimal ContractAmount { get; set; }
    public decimal VatRate { get; set; }
    public decimal TotalContractWithVat { get; set; }
    public decimal EstimatedCost { get; set; }

    public decimal RetentionPercentage { get; set; }
    public decimal AdvancePaymentAmount { get; set; }
    public decimal AdvancePaymentDeductionPercentage { get; set; }

    public ProjectStatus Status { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public decimal CompletionPercentage { get; set; }

    public string? ProjectManager { get; set; }
    public string? SiteLocation { get; set; }
    public string? Notes { get; set; }

    // Computed Financial KPI Metrics
    public int PhasesCount { get; set; }
    public int BillingsCount { get; set; }
    public int GuaranteesCount { get; set; }

    public decimal TotalWorkCompletedAmount { get; set; }
    public decimal TotalBilledAmount { get; set; }
    public decimal TotalExpensesAmount { get; set; }
    public decimal ProfitabilityAmount { get; set; }
    public decimal ProfitMarginPercentage { get; set; }
    public decimal CostVariance { get; set; }
    public decimal RemainingContractAmount { get; set; }
}

public class ProjectDetailsDto : ProjectDto
{
    public List<ProjectPhaseDto> Phases { get; set; } = new();
    public List<ContractProgressBillingDto> Billings { get; set; } = new();
    public List<LetterOfGuaranteeDto> Guarantees { get; set; } = new();
    public List<ProjectExpenseDto> Expenses { get; set; } = new();
}

public class ProjectPhaseDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public int PhaseOrder { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal EstimatedCost { get; set; }
    public decimal WeightPercentage { get; set; }
    public decimal CompletionPercentage { get; set; }
    public string Status { get; set; } = "Active";
    public string? Notes { get; set; }
}

public class ContractProgressBillingDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ProjectCode { get; set; } = string.Empty;

    public string BillingNumber { get; set; } = string.Empty;
    public int BillingSequence { get; set; }
    public DateTime BillingDate { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    public decimal PreviousWorkAmount { get; set; }
    public decimal CurrentWorkAmount { get; set; }
    public decimal TotalWorkAmount { get; set; }

    public decimal RetentionPercentage { get; set; }
    public decimal RetentionAmount { get; set; }
    public decimal AdvancePaymentDeduction { get; set; }
    public decimal OtherDeductions { get; set; }
    public string? DeductionsNotes { get; set; }

    public decimal NetAmount { get; set; }
    public decimal VatRate { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalWithVat { get; set; }

    public BillingStatus Status { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string? ConsultantName { get; set; }
    public DateTime? ConsultantApprovalDate { get; set; }
    public string? ConsultantNotes { get; set; }

    public Guid? AssociatedInvoiceId { get; set; }
    public string? AssociatedInvoiceNumber { get; set; }
    public Guid? AssociatedJournalEntryId { get; set; }
    public string? AssociatedJournalEntryNumber { get; set; }
}

public class LetterOfGuaranteeDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ProjectCode { get; set; } = string.Empty;

    public string GuaranteeNumber { get; set; } = string.Empty;
    public GuaranteeType Type { get; set; }
    public string TypeText { get; set; } = string.Empty;
    public string IssuingBank { get; set; } = string.Empty;
    public string? BankBranch { get; set; }
    public string? BankAccountNumber { get; set; }
    public string BeneficiaryName { get; set; } = string.Empty;

    public decimal Amount { get; set; }
    public decimal CashMarginPercentage { get; set; }
    public decimal CashMarginAmount { get; set; }
    public decimal BankCommission { get; set; }

    public DateTime IssueDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public int DaysRemaining => (ExpiryDate.Date - DateTime.UtcNow.Date).Days;
    public GuaranteeStatus Status { get; set; }
    public string StatusText { get; set; } = string.Empty;

    public Guid? AssociatedJournalEntryId { get; set; }
    public string? AssociatedJournalEntryNumber { get; set; }
    public string? Notes { get; set; }
}

public class ProjectExpenseDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? PhaseId { get; set; }
    public string? PhaseName { get; set; }

    public DateTime ExpenseDate { get; set; }
    public ProjectExpenseCategory Category { get; set; }
    public string CategoryText { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? SupplierOrWorkerName { get; set; }

    public string? ReferenceType { get; set; }
    public string? ReferenceNumber { get; set; }
    public Guid? ReferenceId { get; set; }
    public string? Notes { get; set; }
}

public class ProjectsSummaryMetricsDto
{
    public int TotalProjects { get; set; }
    public int ActiveProjects { get; set; }
    public int CompletedProjects { get; set; }

    public decimal TotalContractAmount { get; set; }
    public decimal TotalEstimatedCost { get; set; }
    public decimal TotalBilledAmount { get; set; }
    public decimal TotalRetentionHeld { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalNetProfit { get; set; }
    public decimal AverageProfitMargin { get; set; }

    public int ActiveGuaranteesCount { get; set; }
    public decimal TotalActiveGuaranteesAmount { get; set; }
    public decimal TotalCashMarginHeldInBanks { get; set; }
}
