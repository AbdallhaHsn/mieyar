namespace AlRobban.Shared.Application.Abstractions;

/// <summary>
/// Marks a command whose handler performs several dependent writes (multiple SaveChanges, nested commands)
/// and must therefore be atomic: either everything is persisted, or nothing is.
/// </summary>
public interface ITransactionalCommand
{
    /// <summary>Name of the module whose database transaction should wrap the command (see <see cref="TransactionModules"/>).</summary>
    string TransactionModule { get; }
}

public static class TransactionModules
{
    public const string GeneralLedger = "GeneralLedger";
}

/// <summary>A started database transaction owned by the pipeline behavior.</summary>
public interface IModuleTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken cancellationToken);
    Task RollbackAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Module-level provider that begins a transaction on that module's DbContext.
/// Returns null when a transaction is already active (nested command), so inner commands join the outer one.
/// </summary>
public interface IModuleTransactionProvider
{
    string Module { get; }
    Task<IModuleTransaction?> BeginAsync(CancellationToken cancellationToken);
}
