using AlRobban.Modules.Purchasing.Domain.Entities;

namespace AlRobban.Modules.Purchasing.Domain.Repositories;

public interface IItemWarehouseStockRepository
{
    Task<ItemWarehouseStock?> GetAsync(Guid companyId, Guid warehouseId, Guid itemId, CancellationToken cancellationToken = default);
    Task<ItemWarehouseStock?> GetByCodeAsync(Guid companyId, string warehouseCode, Guid itemId, CancellationToken cancellationToken = default);
    Task<List<ItemWarehouseStock>> GetByItemAsync(Guid companyId, Guid itemId, CancellationToken cancellationToken = default);
    Task<List<ItemWarehouseStock>> GetByWarehouseAsync(Guid companyId, Guid warehouseId, CancellationToken cancellationToken = default);
    Task<List<ItemWarehouseStock>> GetAllByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task AddAsync(ItemWarehouseStock stock, CancellationToken cancellationToken = default);
    Task UpdateAsync(ItemWarehouseStock stock, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
