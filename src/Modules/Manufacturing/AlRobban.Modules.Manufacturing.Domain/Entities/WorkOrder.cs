using AlRobban.Modules.Manufacturing.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Manufacturing.Domain.Entities;

public class WorkOrder : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }

    public string WorkOrderNumber { get; set; } = string.Empty;
    public Guid BomId { get; set; }
    public string BomCode { get; set; } = string.Empty;

    public string FinishedProductId { get; set; } = string.Empty;
    public string FinishedProductCode { get; set; } = string.Empty;
    public string FinishedProductNameAr { get; set; } = string.Empty;
    public string FinishedProductNameEn { get; set; } = string.Empty;

    public decimal PlannedQuantity { get; set; }
    public decimal CompletedQuantity { get; set; }
    public decimal RejectedQuantity { get; set; }
    public string UnitOfMeasure { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? CompletedDate { get; set; }

    public WorkOrderStatus Status { get; set; } = WorkOrderStatus.Planned;
    public WorkOrderPriority Priority { get; set; } = WorkOrderPriority.Normal;

    public string AssignedSupervisor { get; set; } = string.Empty;
    public string AssignedWorkstation { get; set; } = string.Empty;
    public string RawMaterialsWarehouseName { get; set; } = string.Empty;
    public string FinishedGoodsWarehouseName { get; set; } = string.Empty;

    public decimal EstimatedTotalCost { get; set; }
    public decimal ActualMaterialCost { get; set; }
    public decimal ActualLaborCost { get; set; }
    public decimal ActualOverheadCost { get; set; }
    public decimal TotalActualCost { get; set; }
    public decimal UnitActualCost { get; set; }

    public string? Notes { get; set; }

    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    public List<WorkOrderComponentConsumption> ComponentsConsumed { get; set; } = new();

    public WorkOrder() : base(Guid.NewGuid()) { }
    public WorkOrder(Guid id) : base(id) { }
}

public class WorkOrderComponentConsumption : Entity<Guid>, IMustHaveTenant
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }

    public Guid WorkOrderId { get; set; }
    public Guid? ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemNameAr { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }

    public WorkOrderComponentConsumption() : base(Guid.NewGuid()) { }
    public WorkOrderComponentConsumption(Guid id) : base(id) { }
}
