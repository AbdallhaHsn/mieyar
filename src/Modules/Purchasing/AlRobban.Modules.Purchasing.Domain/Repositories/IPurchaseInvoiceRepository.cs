using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;

namespace AlRobban.Modules.Purchasing.Domain.Repositories;

public interface IPurchaseInvoiceRepository
{
    Task<PurchaseInvoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PurchaseInvoice?> GetByNumberAsync(Guid companyId, string invoiceNumber, CancellationToken cancellationToken = default);
    Task<List<PurchaseInvoice>> GetListAsync(
        Guid companyId,
        Guid? vendorId = null,
        PurchaseInvoiceStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default);
    Task<int> GetCountAsync(
        Guid companyId,
        Guid? vendorId = null,
        PurchaseInvoiceStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);
    Task<string> GenerateNextInvoiceNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default);
    Task AddAsync(PurchaseInvoice invoice, CancellationToken cancellationToken = default);
    Task UpdateAsync(PurchaseInvoice invoice, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
