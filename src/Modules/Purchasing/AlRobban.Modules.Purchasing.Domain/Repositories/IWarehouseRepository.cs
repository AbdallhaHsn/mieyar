using AlRobban.Modules.Purchasing.Domain.Entities;

namespace AlRobban.Modules.Purchasing.Domain.Repositories;

public interface IWarehouseRepository
{
    Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Warehouse?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default);
    Task<List<Warehouse>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default);
    Task UpdateAsync(Warehouse warehouse, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<WarehouseAccountMapping?> GetAccountMappingAsync(Guid companyId, Guid warehouseId, int paymentMethod, CancellationToken cancellationToken = default);
    Task<WarehouseAccountMapping?> GetAccountMappingByCodeAsync(Guid companyId, string warehouseCode, int paymentMethod, CancellationToken cancellationToken = default);
}
