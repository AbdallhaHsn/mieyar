namespace AlRobban.Shared.Kernel.Primitives;

public interface IMustHaveTenant
{
    Guid TenantId { get; set; }
}

public interface IMayHaveTenant
{
    Guid? TenantId { get; set; }
}
