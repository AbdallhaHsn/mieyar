using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;

namespace AlRobban.Modules.Purchasing.Domain.Repositories;

public interface IGoodsReceiptNoteRepository
{
    Task<GoodsReceiptNote?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<GoodsReceiptNote?> GetByNumberAsync(Guid companyId, string receiptNumber, CancellationToken cancellationToken = default);
    Task<List<GoodsReceiptNote>> GetListAsync(
        Guid companyId,
        Guid? purchaseOrderId = null,
        Guid? vendorId = null,
        GoodsReceiptStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default);
    Task<int> GetCountAsync(
        Guid companyId,
        Guid? purchaseOrderId = null,
        Guid? vendorId = null,
        GoodsReceiptStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);
    Task<string> GenerateNextReceiptNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default);
    Task AddAsync(GoodsReceiptNote note, CancellationToken cancellationToken = default);
    Task UpdateAsync(GoodsReceiptNote note, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
