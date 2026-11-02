using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Manufacturing.Domain.Entities;

public class BomOperation : Entity<Guid>, IMustHaveTenant
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }

    public Guid BomId { get; set; }
    public string OperationNameAr { get; set; } = string.Empty;
    public string OperationNameEn { get; set; } = string.Empty;

    public Guid? WorkstationId { get; set; }
    public string WorkstationName { get; set; } = string.Empty;

    public decimal StandardTimeMinutes { get; set; }
    public decimal HourlyLaborRate { get; set; }
    public decimal HourlyOverheadRate { get; set; }
    public decimal TotalOperationCost { get; set; }

    public BomOperation() : base(Guid.NewGuid()) { }
    public BomOperation(Guid id) : base(id) { }
}
