using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Shared.Application.Behaviors;

/// <summary>
/// Wraps <see cref="ITransactionalCommand"/> requests in a single database transaction.
/// Commits only when the handler returns a successful <see cref="Result"/>; any failure result or exception rolls everything back.
/// </summary>
public class TransactionBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    where TResponse : Result
{
    private readonly IEnumerable<IModuleTransactionProvider> _providers;

    public TransactionBehavior(IEnumerable<IModuleTransactionProvider> providers)
    {
        _providers = providers;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (request is not ITransactionalCommand transactional)
        {
            return await next();
        }

        var provider = _providers.FirstOrDefault(p =>
            string.Equals(p.Module, transactional.TransactionModule, StringComparison.Ordinal));

        if (provider is null)
        {
            throw new InvalidOperationException(
                $"No transaction provider registered for module '{transactional.TransactionModule}' (request {typeof(TRequest).Name}).");
        }

        var transaction = await provider.BeginAsync(cancellationToken);
        if (transaction is null)
        {
            // Already inside an outer transaction: join it.
            return await next();
        }

        await using (transaction)
        {
            try
            {
                var response = await next();

                if (response.IsFailure)
                {
                    await transaction.RollbackAsync(cancellationToken);
                }
                else
                {
                    await transaction.CommitAsync(cancellationToken);
                }

                return response;
            }
            catch
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
        }
    }
}
