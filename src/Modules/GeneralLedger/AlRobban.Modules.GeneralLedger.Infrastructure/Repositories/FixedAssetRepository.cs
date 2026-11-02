using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class FixedAssetRepository : IFixedAssetRepository
{
    private readonly GeneralLedgerDbContext _dbContext;

    public FixedAssetRepository(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<FixedAsset?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.FixedAssets
            .Include(a => a.AssetAccount)
            .Include(a => a.AccumulatedDepreciationAccount)
            .Include(a => a.DepreciationExpenseAccount)
            .Include(a => a.CostCenter)
            .Include(a => a.DepreciationHistories.OrderByDescending(h => h.DepreciationDate))
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
    }

    public async Task<List<FixedAsset>> GetAllByCompanyAsync(
        Guid companyId,
        FixedAssetStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.FixedAssets
            .Include(a => a.AssetAccount)
            .Include(a => a.AccumulatedDepreciationAccount)
            .Include(a => a.DepreciationExpenseAccount)
            .Include(a => a.CostCenter)
            .Include(a => a.DepreciationHistories)
            .Where(a => a.CompanyId == companyId);

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        return await query
            .OrderBy(a => a.AssetCode)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<FixedAsset>> GetActiveForDepreciationAsync(
        Guid companyId,
        DateTime upToDate,
        CancellationToken cancellationToken = default)
    {
        var targetDate = upToDate.Date;
        return await _dbContext.FixedAssets
            .Include(a => a.AssetAccount)
            .Include(a => a.AccumulatedDepreciationAccount)
            .Include(a => a.DepreciationExpenseAccount)
            .Include(a => a.DepreciationHistories)
            .Where(a => a.CompanyId == companyId &&
                        a.Status == FixedAssetStatus.Active &&
                        a.DepreciationStartDate <= targetDate &&
                        (a.LastDepreciationDate == null || a.LastDepreciationDate < targetDate))
            .OrderBy(a => a.AssetCode)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountForYearAsync(Guid companyId, int year, CancellationToken cancellationToken = default)
    {
        return await _dbContext.FixedAssets
            .Where(a => a.CompanyId == companyId && a.PurchaseDate.Year == year)
            .CountAsync(cancellationToken);
    }

    public async Task AddAsync(FixedAsset asset, CancellationToken cancellationToken = default)
    {
        await _dbContext.FixedAssets.AddAsync(asset, cancellationToken);
    }

    public async Task AddDepreciationHistoryAsync(AssetDepreciationHistory history, CancellationToken cancellationToken = default)
    {
        await _dbContext.AssetDepreciationHistories.AddAsync(history, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
