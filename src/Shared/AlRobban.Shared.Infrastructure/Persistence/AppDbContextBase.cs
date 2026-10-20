using System.Linq.Expressions;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Shared.Infrastructure.Persistence;

public abstract class AppDbContextBase : DbContext
{
    private readonly ICurrentTenantContext _tenantContext;
    private readonly IMediator _mediator;

    protected AppDbContextBase(
        DbContextOptions options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options)
    {
        _tenantContext = tenantContext;
        _mediator = mediator;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply Global Query Filters for Multi-Tenancy and Soft-Delete
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;

            var parameter = Expression.Parameter(clrType, "e");
            Expression? filterExpression = null;

            // 1. Soft Delete Filter
            if (typeof(ISoftDeletable).IsAssignableFrom(clrType))
            {
                var isDeletedProperty = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
                var notDeleted = Expression.Equal(isDeletedProperty, Expression.Constant(false));
                filterExpression = notDeleted;
            }

            // 2. Multi-Tenant Filter
            if (typeof(IMustHaveTenant).IsAssignableFrom(clrType))
            {
                var tenantProperty = Expression.Property(parameter, nameof(IMustHaveTenant.TenantId));
                var currentTenantIdExpr = Expression.Property(
                    Expression.Constant(_tenantContext),
                    nameof(ICurrentTenantContext.TenantId));

                // e.TenantId == _tenantContext.TenantId.Value
                var tenantValue = Expression.Property(currentTenantIdExpr, "Value");
                var tenantMatch = Expression.Equal(tenantProperty, tenantValue);

                filterExpression = filterExpression != null
                    ? Expression.AndAlso(filterExpression, tenantMatch)
                    : tenantMatch;
            }

            if (filterExpression != null)
            {
                var lambda = Expression.Lambda(filterExpression, parameter);
                modelBuilder.Entity(clrType).HasQueryFilter(lambda);
            }
        }
    }

    public async Task SetSqlSessionContextAsync(CancellationToken cancellationToken = default)
    {
        if (Database.IsSqlServer() && _tenantContext.TenantId.HasValue)
        {
            var tenantParam = new SqlParameter("@tenantId", _tenantContext.TenantId.Value.ToString());
            await Database.ExecuteSqlRawAsync(
                "EXEC sp_set_session_context 'TenantId', @tenantId, @read_only = 1;",
                new[] { tenantParam },
                cancellationToken);
        }
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await DispatchDomainEventsAsync(cancellationToken);
        return await base.SaveChangesAsync(cancellationToken);
    }

    private async Task DispatchDomainEventsAsync(CancellationToken cancellationToken)
    {
        var domainEntities = ChangeTracker
            .Entries()
            .Where(x => x.Entity.GetType().BaseType is { IsGenericType: true } &&
                        x.Entity.GetType().BaseType!.GetGenericTypeDefinition() == typeof(AggregateRoot<>))
            .ToList();

        var domainEvents = new List<IDomainEvent>();
        foreach (var entityEntry in domainEntities)
        {
            var prop = entityEntry.Entity.GetType().GetProperty(nameof(AggregateRoot<object>.DomainEvents));
            if (prop?.GetValue(entityEntry.Entity) is IReadOnlyCollection<IDomainEvent> events)
            {
                domainEvents.AddRange(events);
                var clearMethod = entityEntry.Entity.GetType().GetMethod(nameof(AggregateRoot<object>.ClearDomainEvents));
                clearMethod?.Invoke(entityEntry.Entity, null);
            }
        }

        foreach (var domainEvent in domainEvents)
        {
            if (domainEvent is INotification notification)
            {
                await _mediator.Publish(notification, cancellationToken);
            }
        }
    }
}
