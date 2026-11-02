using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;

namespace AlRobban.Modules.Purchasing.Domain.Repositories;

public interface IPurchaseOrderRepository
{
    Task<PurchaseOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PurchaseOrder?> GetByNumberAsync(Guid companyId, string orderNumber, CancellationToken cancellationToken = default);
    Task<List<PurchaseOrder>> GetListAsync(
        Guid companyId,
        Guid? vendorId = null,
        PurchaseOrderStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default);
    Task<int> GetCountAsync(
        Guid companyId,
        Guid? vendorId = null,
        PurchaseOrderStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);
    Task<string> GenerateNextOrderNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default);
    Task AddAsync(PurchaseOrder order, CancellationToken cancellationToken = default);
    Task UpdateAsync(PurchaseOrder order, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
