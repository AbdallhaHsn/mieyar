using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Projects.Domain.Entities;

public class ProjectExpense : Entity<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public Guid ProjectId { get; private set; }
    public Guid? PhaseId { get; private set; }

    public DateTime ExpenseDate { get; private set; } = DateTime.UtcNow;
    public ProjectExpenseCategory Category { get; private set; } = ProjectExpenseCategory.Materials;
    public decimal Amount { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public string? SupplierOrWorkerName { get; private set; }

    // Integration References
    public string? ReferenceType { get; private set; } // PurchaseInvoice, Payroll, PaymentVoucher, DirectEntry
    public string? ReferenceNumber { get; private set; }
    public Guid? ReferenceId { get; private set; }

    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private ProjectExpense() { }

    public ProjectExpense(
        Guid id,
        Guid companyId,
        Guid projectId,
        Guid? phaseId,
        DateTime expenseDate,
        ProjectExpenseCategory category,
        decimal amount,
        string description,
        string? supplierOrWorkerName = null,
        string? referenceType = null,
        string? referenceNumber = null,
        Guid? referenceId = null,
        string? notes = null)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        CompanyId = companyId;
        TenantId = companyId;
        ProjectId = projectId;
        PhaseId = phaseId;
        ExpenseDate = expenseDate;
        Category = category;
        Amount = Math.Max(0, amount);
        Description = description;
        SupplierOrWorkerName = supplierOrWorkerName;
        ReferenceType = referenceType;
        ReferenceNumber = referenceNumber;
        ReferenceId = referenceId;
        Notes = notes;
    }
}
