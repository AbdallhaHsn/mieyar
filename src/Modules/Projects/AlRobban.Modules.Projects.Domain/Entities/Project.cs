using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Projects.Domain.Entities;

public class Project : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string Code { get; private set; } = string.Empty; // PRJ-2026-001

    // Single-Entry Bilingual Names (Rule 1)
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;

    // Customer / Client Details
    public Guid CustomerId { get; private set; }
    public string CustomerName { get; private set; } = string.Empty;

    // Financial & Cost Accounting
    public Guid? CostCenterId { get; private set; }
    public string? CostCenterName { get; private set; }

    // Contract Information
    public string ContractNumber { get; private set; } = string.Empty;
    public DateTime? ContractDate { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime ExpectedEndDate { get; private set; }
    public DateTime? ActualEndDate { get; private set; }

    // Values & Budget
    public decimal ContractAmount { get; private set; } // قيمة العقد قبل الضريبة
    public decimal VatRate { get; private set; } = 0.15m;
    public decimal TotalContractWithVat => ContractAmount * (1 + VatRate);

    public decimal EstimatedCost { get; private set; } // الموازنة التقديرية للمشروع
    public decimal RetentionPercentage { get; private set; } = 10m; // نسبة ضمان الأعمال (10%)
    public decimal AdvancePaymentAmount { get; private set; } // مبلغ الدفعة المقدمة المستلمة
    public decimal AdvancePaymentDeductionPercentage { get; private set; } = 10m; // نسبة استرداد الدفعة من المستخلصات

    // Status & Progress
    public ProjectStatus Status { get; private set; } = ProjectStatus.Planning;
    public decimal CompletionPercentage { get; private set; } // نسبة الإنجاز % (0 - 100)
    public string? ProjectManager { get; private set; }
    public string? SiteLocation { get; private set; }
    public string? Notes { get; private set; }

    // Collections
    private readonly List<ProjectPhase> _phases = new();
    public IReadOnlyCollection<ProjectPhase> Phases => _phases.AsReadOnly();

    private readonly List<ContractProgressBilling> _billings = new();
    public IReadOnlyCollection<ContractProgressBilling> Billings => _billings.AsReadOnly();

    private readonly List<LetterOfGuarantee> _guarantees = new();
    public IReadOnlyCollection<LetterOfGuarantee> Guarantees => _guarantees.AsReadOnly();

    private readonly List<ProjectExpense> _expenses = new();
    public IReadOnlyCollection<ProjectExpense> Expenses => _expenses.AsReadOnly();

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private Project() { }

    public Project(
        Guid id,
        Guid companyId,
        string code,
        string nameAr,
        string nameEn,
        Guid customerId,
        string customerName,
        decimal contractAmount,
        decimal estimatedCost,
        DateTime startDate,
        DateTime expectedEndDate,
        string contractNumber,
        DateTime? contractDate = null,
        decimal retentionPercentage = 10m,
        decimal advancePaymentAmount = 0,
        decimal advancePaymentDeductionPercentage = 10m,
        Guid? costCenterId = null,
        string? costCenterName = null,
        string? projectManager = null,
        string? siteLocation = null,
        string? notes = null)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        CompanyId = companyId;
        TenantId = companyId;
        Code = code;
        NameAr = nameAr;
        NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr : nameEn;
        CustomerId = customerId;
        CustomerName = customerName;
        ContractAmount = Math.Max(0, contractAmount);
        EstimatedCost = Math.Max(0, estimatedCost);
        StartDate = startDate;
        ExpectedEndDate = expectedEndDate;
        ContractNumber = contractNumber;
        ContractDate = contractDate ?? startDate;
        RetentionPercentage = Math.Clamp(retentionPercentage, 0, 100);
        AdvancePaymentAmount = Math.Max(0, advancePaymentAmount);
        AdvancePaymentDeductionPercentage = Math.Clamp(advancePaymentDeductionPercentage, 0, 100);
        CostCenterId = costCenterId;
        CostCenterName = costCenterName;
        ProjectManager = projectManager;
        SiteLocation = siteLocation;
        Notes = notes;
        Status = ProjectStatus.Active;
        CompletionPercentage = 0;
    }

    public void UpdateDetails(
        string nameAr,
        string nameEn,
        Guid customerId,
        string customerName,
        decimal contractAmount,
        decimal estimatedCost,
        DateTime startDate,
        DateTime expectedEndDate,
        string contractNumber,
        DateTime? contractDate,
        decimal retentionPercentage,
        decimal advancePaymentAmount,
        decimal advancePaymentDeductionPercentage,
        Guid? costCenterId,
        string? costCenterName,
        string? projectManager,
        string? siteLocation,
        string? notes)
    {
        NameAr = nameAr;
        NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr : nameEn;
        CustomerId = customerId;
        CustomerName = customerName;
        ContractAmount = Math.Max(0, contractAmount);
        EstimatedCost = Math.Max(0, estimatedCost);
        StartDate = startDate;
        ExpectedEndDate = expectedEndDate;
        ContractNumber = contractNumber;
        ContractDate = contractDate;
        RetentionPercentage = Math.Clamp(retentionPercentage, 0, 100);
        AdvancePaymentAmount = Math.Max(0, advancePaymentAmount);
        AdvancePaymentDeductionPercentage = Math.Clamp(advancePaymentDeductionPercentage, 0, 100);
        CostCenterId = costCenterId;
        CostCenterName = costCenterName;
        ProjectManager = projectManager;
        SiteLocation = siteLocation;
        Notes = notes;
    }

    public void UpdateStatus(ProjectStatus newStatus, DateTime? actualEndDate = null)
    {
        Status = newStatus;
        if (newStatus == ProjectStatus.Completed)
        {
            ActualEndDate = actualEndDate ?? DateTime.UtcNow;
            CompletionPercentage = 100;
        }
    }

    public void UpdateCompletion(decimal percentage)
    {
        CompletionPercentage = Math.Clamp(percentage, 0, 100);
        if (CompletionPercentage >= 100 && Status == ProjectStatus.Active)
        {
            Status = ProjectStatus.Completed;
            ActualEndDate = DateTime.UtcNow;
        }
    }

    public void AddPhase(ProjectPhase phase)
    {
        _phases.Add(phase);
        RecalculateProgressFromPhases();
    }

    public void RecalculateProgressFromPhases()
    {
        if (!_phases.Any()) return;
        var totalWeight = _phases.Sum(p => p.WeightPercentage);
        if (totalWeight > 0)
        {
            var weightedProgress = _phases.Sum(p => p.WeightPercentage * (p.CompletionPercentage / 100m));
            CompletionPercentage = Math.Round(Math.Clamp(weightedProgress / (totalWeight / 100m), 0, 100), 2);
        }
    }

    public void AddBilling(ContractProgressBilling billing)
    {
        _billings.Add(billing);
    }

    public void AddGuarantee(LetterOfGuarantee guarantee)
    {
        _guarantees.Add(guarantee);
    }

    public void AddExpense(ProjectExpense expense)
    {
        _expenses.Add(expense);
    }
}
