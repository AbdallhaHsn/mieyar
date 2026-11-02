using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Purchasing.Infrastructure.Repositories;

public class WarehouseRepository : IWarehouseRepository
{
    private readonly PurchasingDbContext _dbContext;

    public WarehouseRepository(PurchasingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Warehouses.FirstOrDefaultAsync(w => w.Id == id, cancellationToken);
    }

    public async Task<Warehouse?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default)
    {
        var cleanCode = code.Trim().ToUpperInvariant();
        return await _dbContext.Warehouses
            .FirstOrDefaultAsync(w => w.CompanyId == companyId && w.Code.ToUpper() == cleanCode, cancellationToken);
    }

    public async Task<List<Warehouse>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Warehouses
            .Where(w => w.CompanyId == companyId)
            .OrderBy(w => w.Code)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
    {
        await _dbContext.Warehouses.AddAsync(warehouse, cancellationToken);
    }

    public Task UpdateAsync(Warehouse warehouse, CancellationToken cancellationToken = default)
    {
        _dbContext.Warehouses.Update(warehouse);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<WarehouseAccountMapping?> GetAccountMappingAsync(Guid companyId, Guid warehouseId, int paymentMethod, CancellationToken cancellationToken = default)
    {
        return await _dbContext.WarehouseAccountMappings
            .FirstOrDefaultAsync(m => m.CompanyId == companyId && m.WarehouseId == warehouseId && m.PaymentMethod == paymentMethod, cancellationToken);
    }

    public async Task<WarehouseAccountMapping?> GetAccountMappingByCodeAsync(Guid companyId, string warehouseCode, int paymentMethod, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(warehouseCode)) return null;
        var cleanCode = warehouseCode.Trim().ToUpperInvariant();
        var warehouse = await _dbContext.Warehouses
            .FirstOrDefaultAsync(w => w.CompanyId == companyId && w.Code.ToUpper() == cleanCode, cancellationToken);

        if (warehouse == null) return null;

        return await _dbContext.WarehouseAccountMappings
            .FirstOrDefaultAsync(m => m.CompanyId == companyId && m.WarehouseId == warehouse.Id && m.PaymentMethod == paymentMethod, cancellationToken);
    }
}
