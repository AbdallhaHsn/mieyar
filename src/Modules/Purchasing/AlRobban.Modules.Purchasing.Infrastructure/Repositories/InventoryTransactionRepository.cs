using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Purchasing.Infrastructure.Repositories;

public class InventoryTransactionRepository : IInventoryTransactionRepository
{
    private readonly PurchasingDbContext _dbContext;

    public InventoryTransactionRepository(PurchasingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<InventoryTransaction>> GetByItemIdAsync(Guid itemId, int take = 50, CancellationToken cancellationToken = default)
    {
        return await _dbContext.InventoryTransactions
            .Where(x => x.ItemId == itemId)
            .OrderByDescending(x => x.TransactionDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<InventoryTransaction>> GetListAsync(
        Guid companyId,
        Guid? itemId = null,
        Guid? warehouseId = null,
        string? warehouseCode = null,
        InventoryMovementType? movementType = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.InventoryTransactions.Where(x => x.CompanyId == companyId);

        if (itemId.HasValue)
        {
            query = query.Where(x => x.ItemId == itemId.Value);
        }

        if (warehouseId.HasValue)
        {
            query = query.Where(x => x.WarehouseId == warehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(warehouseCode))
        {
            query = query.Where(x => x.WarehouseCode == warehouseCode.Trim().ToUpperInvariant());
        }

        if (movementType.HasValue)
        {
            query = query.Where(x => x.MovementType == movementType.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(x => x.TransactionDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            query = query.Where(x => x.TransactionDate <= toDate.Value.Date.AddDays(1).AddTicks(-1));
        }

        return await query
            .Include(x => x.Item)
            .OrderByDescending(x => x.TransactionDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(InventoryTransaction transaction, CancellationToken cancellationToken = default)
    {
        await _dbContext.InventoryTransactions.AddAsync(transaction, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
