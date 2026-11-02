namespace AlRobban.Modules.Manufacturing.Domain.Enums;

public enum WorkOrderStatus
{
    Planned = 1,
    Confirmed = 2,
    InProgress = 3,
    QualityCheck = 4,
    Completed = 5,
    Cancelled = 6
}

public enum WorkOrderPriority
{
    Normal = 1,
    High = 2,
    Urgent = 3
}

public enum WorkstationType
{
    Machine = 1,
    AssemblyLine = 2,
    Manual = 3
}

public enum WorkstationStatus
{
    Active = 1,
    Maintenance = 2,
    Idle = 3
}

public enum RawMaterialCategory
{
    General = 1,
    Concrete = 2,
    Aluminum = 3,
    Rebar = 4,
    Chemicals = 5
}
