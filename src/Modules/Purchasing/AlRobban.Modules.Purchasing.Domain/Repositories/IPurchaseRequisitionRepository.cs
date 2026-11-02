using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;

namespace AlRobban.Modules.Purchasing.Domain.Repositories;

public interface IPurchaseRequisitionRepository
{
    Task<PurchaseRequisition?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PurchaseRequisition?> GetByNumberAsync(Guid companyId, string reqNumber, CancellationToken cancellationToken = default);
    Task<List<PurchaseRequisition>> GetListAsync(
        Guid companyId,
        RequisitionStatus? status = null,
        string? searchTerm = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default);
    Task<int> GetCountAsync(
        Guid companyId,
        RequisitionStatus? status = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);
    Task<string> GenerateNextRequisitionNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default);
    Task AddAsync(PurchaseRequisition requisition, CancellationToken cancellationToken = default);
    Task UpdateAsync(PurchaseRequisition requisition, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
