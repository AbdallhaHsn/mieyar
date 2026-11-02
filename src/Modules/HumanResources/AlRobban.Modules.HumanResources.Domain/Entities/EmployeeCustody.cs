using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.HumanResources.Domain.Entities;

public class EmployeeCustody : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string CustodyNumber { get; private set; } = string.Empty;
    public Guid EmployeeId { get; private set; }
    public Employee? Employee { get; private set; }

    public CustodyType CustodyType { get; private set; }
    public string ItemNameAr { get; private set; } = string.Empty;
    public string ItemNameEn { get; private set; } = string.Empty;
    public string? SerialOrTagNumber { get; private set; }
    public decimal EstimatedValue { get; private set; } = 0m;
    public DateTime AssignedDate { get; private set; }

    public CustodyStatus Status { get; private set; } = CustodyStatus.Active;

    // Return & Settlement details
    public DateTime? ReturnedDate { get; private set; }
    public string? ReceivedBy { get; private set; }
    public string? ReturnConditionNotes { get; private set; }

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private EmployeeCustody() { }

    public static EmployeeCustody Create(
        Guid tenantId,
        Guid companyId,
        string custodyNumber,
        Guid employeeId,
        CustodyType custodyType,
        string itemNameAr,
        string itemNameEn,
        string? serialOrTagNumber,
        decimal estimatedValue,
        DateTime assignedDate,
        string? createdBy = null)
    {
        return new EmployeeCustody
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            CustodyNumber = custodyNumber.Trim(),
            EmployeeId = employeeId,
            CustodyType = custodyType,
            ItemNameAr = itemNameAr.Trim(),
            ItemNameEn = string.IsNullOrWhiteSpace(itemNameEn) ? itemNameAr.Trim() : itemNameEn.Trim(),
            SerialOrTagNumber = serialOrTagNumber?.Trim(),
            EstimatedValue = Math.Max(0, estimatedValue),
            AssignedDate = assignedDate.Date,
            Status = CustodyStatus.Active,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void ReturnCustody(
        DateTime returnedDate,
        string receivedBy,
        string? notes = null,
        CustodyStatus condition = CustodyStatus.Returned)
    {
        if (Status != CustodyStatus.Active && Status != CustodyStatus.PendingReturn)
            throw new InvalidOperationException("هذه العهدة تم إرجاعها أو إخلاء طرفها مسبقاً");

        Status = condition;
        ReturnedDate = returnedDate.Date;
        ReceivedBy = receivedBy.Trim();
        ReturnConditionNotes = notes?.Trim();
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = receivedBy;
    }
}
