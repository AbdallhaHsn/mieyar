using AlRobban.Modules.Manufacturing.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Manufacturing.Domain.Entities;

public class Workstation : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; set; }

    public string Code { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;

    public WorkstationType Type { get; set; } = WorkstationType.Machine;
    public decimal HourlyCost { get; set; }
    public decimal CapacityPerDayHours { get; set; } = 8m;
    public decimal EfficiencyPercentage { get; set; } = 95m;
    public WorkstationStatus Status { get; set; } = WorkstationStatus.Active;
    public string Location { get; set; } = string.Empty;

    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    public Workstation() : base(Guid.NewGuid()) { }
    public Workstation(Guid id) : base(id) { }
}
