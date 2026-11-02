using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Purchasing.Infrastructure.Repositories;

public class ItemRepository : IItemRepository
{
    private readonly PurchasingDbContext _dbContext;

    public ItemRepository(PurchasingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Items
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<Item?> GetByCodeAsync(Guid companyId, string itemCode, CancellationToken cancellationToken = default)
    {
        var code = itemCode.Trim().ToUpperInvariant();
        return await _dbContext.Items
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.ItemCode == code, cancellationToken);
    }

    public async Task<Item?> GetByBarcodeAsync(Guid companyId, string barcode, CancellationToken cancellationToken = default)
    {
        var b = barcode.Trim();
        return await _dbContext.Items
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.Barcode == b, cancellationToken);
    }

    public async Task<List<Item>> GetListAsync(
        Guid companyId,
        ItemType? itemType = null,
        string? searchTerm = null,
        bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Items.Where(x => x.CompanyId == companyId);

        if (activeOnly)
        {
            query = query.Where(x => x.IsActive);
        }

        if (itemType.HasValue)
        {
            query = query.Where(x => x.ItemType == itemType.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            query = query.Where(x => x.NameAr.Contains(term) ||
                                     x.NameEn.Contains(term) ||
                                     x.ItemCode.Contains(term) ||
                                     (x.Barcode != null && x.Barcode.Contains(term)));
        }

        return await query.OrderBy(x => x.ItemCode).ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsCodeAsync(Guid companyId, string itemCode, Guid? excludeId = null, CancellationToken cancellationToken = default)
    {
        var code = itemCode.Trim().ToUpperInvariant();
        return await _dbContext.Items
            .IgnoreQueryFilters()
            .AnyAsync(x => x.CompanyId == companyId &&
                           x.ItemCode == code &&
                           (!excludeId.HasValue || x.Id != excludeId.Value), cancellationToken);
    }

    public async Task AddAsync(Item item, CancellationToken cancellationToken = default)
    {
        await _dbContext.Items.AddAsync(item, cancellationToken);
    }

    public Task UpdateAsync(Item item, CancellationToken cancellationToken = default)
    {
        _dbContext.Items.Update(item);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Item item, CancellationToken cancellationToken = default)
    {
        _dbContext.Items.Remove(item);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
