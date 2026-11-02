using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;

namespace AlRobban.Modules.Purchasing.Domain.Repositories;

public interface IItemRepository
{
    Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Item?> GetByCodeAsync(Guid companyId, string itemCode, CancellationToken cancellationToken = default);
    Task<Item?> GetByBarcodeAsync(Guid companyId, string barcode, CancellationToken cancellationToken = default);
    Task<List<Item>> GetListAsync(Guid companyId, ItemType? itemType = null, string? searchTerm = null, bool activeOnly = true, CancellationToken cancellationToken = default);
    Task<bool> ExistsCodeAsync(Guid companyId, string itemCode, Guid? excludeId = null, CancellationToken cancellationToken = default);
    Task AddAsync(Item item, CancellationToken cancellationToken = default);
    Task UpdateAsync(Item item, CancellationToken cancellationToken = default);
    Task DeleteAsync(Item item, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
