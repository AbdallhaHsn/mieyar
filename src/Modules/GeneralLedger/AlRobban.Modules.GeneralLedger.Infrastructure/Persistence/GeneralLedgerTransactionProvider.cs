using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using AlRobban.Shared.Application.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;

/// <summary>Begins a database transaction on the GeneralLedger DbContext for <see cref="ITransactionalCommand"/> requests.</summary>
public sealed class GeneralLedgerTransactionProvider : IModuleTransactionProvider
{
    private readonly GeneralLedgerDbContext _dbContext;

    public GeneralLedgerTransactionProvider(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public string Module => TransactionModules.GeneralLedger;

    public async Task<IModuleTransaction?> BeginAsync(CancellationToken cancellationToken)
    {
        if (_dbContext.Database.CurrentTransaction is not null)
        {
            return null;
        }

        var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        return new EfModuleTransaction(transaction);
    }

    private sealed class EfModuleTransaction : IModuleTransaction
    {
        private readonly IDbContextTransaction _transaction;

        public EfModuleTransaction(IDbContextTransaction transaction) => _transaction = transaction;

        public Task CommitAsync(CancellationToken cancellationToken) => _transaction.CommitAsync(cancellationToken);

        public Task RollbackAsync(CancellationToken cancellationToken) => _transaction.RollbackAsync(cancellationToken);

        public ValueTask DisposeAsync() => _transaction.DisposeAsync();
    }
}
