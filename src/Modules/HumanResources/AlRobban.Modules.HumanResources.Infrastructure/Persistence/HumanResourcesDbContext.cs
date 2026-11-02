using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.HumanResources.Infrastructure.Persistence;

public class HumanResourcesDbContext : AppDbContextBase
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<PayrollPeriod> PayrollPeriods => Set<PayrollPeriod>();
    public DbSet<PayrollLine> PayrollLines => Set<PayrollLine>();
    public DbSet<EmployeeAdvance> EmployeeAdvances => Set<EmployeeAdvance>();
    public DbSet<EmployeeCustody> EmployeeCustodies => Set<EmployeeCustody>();
    public DbSet<HrPolicySettings> HrPolicySettings => Set<HrPolicySettings>();

    public HumanResourcesDbContext(
        DbContextOptions<HumanResourcesDbContext> options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options, tenantContext, mediator)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("hr");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HumanResourcesDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
