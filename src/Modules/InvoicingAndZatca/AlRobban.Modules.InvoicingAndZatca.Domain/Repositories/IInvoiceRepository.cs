using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;

namespace AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;

public interface IInvoiceRepository
{
    Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Invoice?> GetByNumberAsync(Guid companyId, string invoiceNumber, CancellationToken cancellationToken = default);
    Task<string> GetLastInvoiceHashAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<ZatcaDeviceConfig?> GetZatcaConfigAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<string> GenerateNextNumberAsync(Guid companyId, TransactionType type, int year, CancellationToken cancellationToken = default);
    Task<List<Invoice>> GetListAsync(
        Guid companyId,
        InvoiceType? type = null,
        TransactionType? transType = null,
        InvoiceStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);
    Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
