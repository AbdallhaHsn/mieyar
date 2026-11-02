using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;

namespace AlRobban.Modules.Purchasing.Domain.Repositories;

public interface IInventoryTransactionRepository
{
    Task<List<InventoryTransaction>> GetByItemIdAsync(Guid itemId, int take = 50, CancellationToken cancellationToken = default);
    Task<List<InventoryTransaction>> GetListAsync(
        Guid companyId,
        Guid? itemId = null,
        Guid? warehouseId = null,
        string? warehouseCode = null,
        InventoryMovementType? movementType = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);
    Task AddAsync(InventoryTransaction transaction, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
