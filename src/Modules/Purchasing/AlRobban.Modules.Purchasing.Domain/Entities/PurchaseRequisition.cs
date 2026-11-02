using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class PurchaseRequisition : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string RequisitionNumber { get; private set; } = string.Empty; // PR-2026-00001
    public string Title { get; private set; } = string.Empty;             // طلب شراء قطع غيار ومستهلكات
    public string DepartmentName { get; private set; } = string.Empty;    // إدارة الصيانة / فرع الرياض
    public string RequesterName { get; private set; } = string.Empty;     // اسم مقدم الطلب

    public DateTime RequestDate { get; private set; }
    public DateTime? RequiredByDate { get; private set; }

    public RequisitionStatus Status { get; private set; } = RequisitionStatus.Draft;
    public RequisitionPriority Priority { get; private set; } = RequisitionPriority.Medium;

    public Guid? CostCenterId { get; private set; }
    public string? ProjectCode { get; private set; }
    public string? Reason { get; private set; }
    public string? ApprovalNotes { get; private set; }

    public decimal TotalEstimatedAmount { get; private set; }

    public Guid? ConvertedToPoId { get; private set; }
    public string? ConvertedToPoNumber { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private readonly List<PurchaseRequisitionLine> _lines = new();
    public IReadOnlyCollection<PurchaseRequisitionLine> Lines => _lines.AsReadOnly();

    private PurchaseRequisition() { }

    public static PurchaseRequisition Create(
        Guid tenantId,
        Guid companyId,
        string requisitionNumber,
        string title,
        string departmentName,
        string requesterName,
        DateTime requestDate,
        DateTime? requiredByDate = null,
        RequisitionPriority priority = RequisitionPriority.Medium,
        Guid? costCenterId = null,
        string? projectCode = null,
        string? reason = null,
        string? createdBy = null)
    {
        return new PurchaseRequisition
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            RequisitionNumber = requisitionNumber.Trim().ToUpperInvariant(),
            Title = title.Trim(),
            DepartmentName = departmentName.Trim(),
            RequesterName = requesterName.Trim(),
            RequestDate = requestDate.Date,
            RequiredByDate = requiredByDate?.Date,
            Priority = priority,
            Status = RequisitionStatus.Draft,
            CostCenterId = costCenterId,
            ProjectCode = projectCode?.Trim(),
            Reason = reason?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void AddLine(
        string itemNameAr,
        string itemNameEn,
        decimal quantityRequested,
        decimal estimatedUnitPrice,
        string unitOfMeasure = "حبة",
        Guid? itemId = null,
        string? itemCode = null,
        string? warehouseCode = null,
        Guid? costCenterId = null,
        string? notes = null)
    {
        if (Status != RequisitionStatus.Draft && Status != RequisitionStatus.Submitted)
        {
            throw new InvalidOperationException("لا يمكن تعديل بنود طلب شراء تم اعتماده أو إغلاقه.");
        }

        var line = PurchaseRequisitionLine.Create(
            TenantId,
            Id,
            _lines.Count + 1,
            itemNameAr,
            itemNameEn,
            quantityRequested,
            estimatedUnitPrice,
            unitOfMeasure,
            itemId,
            itemCode,
            warehouseCode,
            costCenterId,
            notes);

        _lines.Add(line);
        RecalculateTotals();
    }

    public void ClearLines()
    {
        if (Status != RequisitionStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن تعديل بنود طلب شراء خارج حالة المسودة.");
        }
        _lines.Clear();
        RecalculateTotals();
    }

    public void RecalculateTotals()
    {
        TotalEstimatedAmount = Math.Round(_lines.Sum(l => l.EstimatedTotal), 4);
    }

    public void Submit(string? updatedBy = null)
    {
        if (Status != RequisitionStatus.Draft)
            throw new InvalidOperationException("طلب الشراء تم تقديمه مسبقاً.");

        if (!_lines.Any())
            throw new InvalidOperationException("لا يمكن تقديم طلب شراء بدون بنود.");

        Status = RequisitionStatus.Submitted;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }

    public void Approve(string? notes = null, string? approvedBy = null)
    {
        if (Status != RequisitionStatus.Submitted && Status != RequisitionStatus.Draft)
            throw new InvalidOperationException("لا يمكن اعتماد طلب الشراء إلا إذا كان في حالة المسودة أو بانتظار الاعتماد.");

        Status = RequisitionStatus.Approved;
        ApprovalNotes = notes?.Trim();
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = approvedBy;
    }

    public void Reject(string? reason = null, string? rejectedBy = null)
    {
        Status = RequisitionStatus.Rejected;
        ApprovalNotes = reason?.Trim();
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = rejectedBy;
    }

    public void MarkConvertedToPo(Guid poId, string poNumber, string? updatedBy = null)
    {
        Status = RequisitionStatus.ConvertedToPo;
        ConvertedToPoId = poId;
        ConvertedToPoNumber = poNumber;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = updatedBy;
    }
}
