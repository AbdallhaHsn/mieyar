using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence;

public class IdentityAndAccessDbContext : AppDbContextBase
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<FiscalYear> FiscalYears => Set<FiscalYear>();
    public DbSet<FiscalPeriod> FiscalPeriods => Set<FiscalPeriod>();
    public DbSet<User> Users => Set<User>();
    public DbSet<CompanyRole> CompanyRoles => Set<CompanyRole>();

    public IdentityAndAccessDbContext(
        DbContextOptions<IdentityAndAccessDbContext> options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options, tenantContext, mediator)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(IdentityAndAccessDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
