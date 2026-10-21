using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface ICurrencyRateRepository
{
    Task<CurrencyRate?> GetByCodeAsync(Guid companyId, string currencyCode, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CurrencyRate>> GetLatestRatesAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task AddAsync(CurrencyRate rate, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
