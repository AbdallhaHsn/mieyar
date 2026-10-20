using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;

public class GeneralLedgerDbContext : AppDbContextBase
{
    public DbSet<Account> Accounts => Set<Account>();

    public GeneralLedgerDbContext(
        DbContextOptions<GeneralLedgerDbContext> options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options, tenantContext, mediator)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(GeneralLedgerDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
