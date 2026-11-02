using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Purchasing.Infrastructure.Repositories;

public class ItemWarehouseStockRepository : IItemWarehouseStockRepository
{
    private readonly PurchasingDbContext _dbContext;

    public ItemWarehouseStockRepository(PurchasingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ItemWarehouseStock?> GetAsync(Guid companyId, Guid warehouseId, Guid itemId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ItemWarehouseStocks
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.WarehouseId == warehouseId && x.ItemId == itemId, cancellationToken);
    }

    public async Task<ItemWarehouseStock?> GetByCodeAsync(Guid companyId, string warehouseCode, Guid itemId, CancellationToken cancellationToken = default)
    {
        var code = warehouseCode.Trim().ToUpperInvariant();
        return await _dbContext.ItemWarehouseStocks
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.WarehouseCode == code && x.ItemId == itemId, cancellationToken);
    }

    public async Task<List<ItemWarehouseStock>> GetByItemAsync(Guid companyId, Guid itemId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ItemWarehouseStocks
            .Include(x => x.Warehouse)
            .Where(x => x.CompanyId == companyId && x.ItemId == itemId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<ItemWarehouseStock>> GetByWarehouseAsync(Guid companyId, Guid warehouseId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ItemWarehouseStocks
            .Include(x => x.Item)
            .Where(x => x.CompanyId == companyId && x.WarehouseId == warehouseId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<ItemWarehouseStock>> GetAllByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ItemWarehouseStocks
            .Include(x => x.Item)
            .Include(x => x.Warehouse)
            .Where(x => x.CompanyId == companyId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(ItemWarehouseStock stock, CancellationToken cancellationToken = default)
    {
        await _dbContext.ItemWarehouseStocks.AddAsync(stock, cancellationToken);
    }

    public Task UpdateAsync(ItemWarehouseStock stock, CancellationToken cancellationToken = default)
    {
        _dbContext.ItemWarehouseStocks.Update(stock);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
