using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class CurrencyRateRepository : ICurrencyRateRepository
{
    private readonly GeneralLedgerDbContext _dbContext;

    public CurrencyRateRepository(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<CurrencyRate?> GetByCodeAsync(Guid companyId, string currencyCode, CancellationToken cancellationToken = default)
    {
        var code = currencyCode.Trim().ToUpperInvariant();
        return await _dbContext.CurrencyRates
            .Where(r => r.CompanyId == companyId && r.CurrencyCode == code && r.IsActive)
            .OrderByDescending(r => r.EffectiveDate)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<CurrencyRate>> GetLatestRatesAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CurrencyRates
            .Where(r => r.CompanyId == companyId && r.IsActive)
            .OrderBy(r => r.CurrencyCode)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(CurrencyRate rate, CancellationToken cancellationToken = default)
    {
        await _dbContext.CurrencyRates.AddAsync(rate, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
