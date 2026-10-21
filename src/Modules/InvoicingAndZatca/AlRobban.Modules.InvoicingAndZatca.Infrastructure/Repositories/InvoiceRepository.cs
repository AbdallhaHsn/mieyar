using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.InvoicingAndZatca.Infrastructure.Repositories;

public class InvoiceRepository : IInvoiceRepository
{
    private readonly InvoicingDbContext _context;

    public InvoiceRepository(InvoicingDbContext context)
    {
        _context = context;
    }

    public async Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Invoices
            .Include(i => i.Lines.OrderBy(l => l.LineNumber))
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<Invoice?> GetByNumberAsync(Guid companyId, string invoiceNumber, CancellationToken cancellationToken = default)
    {
        return await _context.Invoices
            .Include(i => i.Lines.OrderBy(l => l.LineNumber))
            .FirstOrDefaultAsync(i => i.CompanyId == companyId && i.InvoiceNumber == invoiceNumber, cancellationToken);
    }

    public async Task<string> GetLastInvoiceHashAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        var last = await _context.Invoices
            .Where(i => i.CompanyId == companyId && !string.IsNullOrEmpty(i.InvoiceHash))
            .OrderByDescending(i => i.CreatedAtUtc)
            .Select(i => i.InvoiceHash)
            .FirstOrDefaultAsync(cancellationToken);

        return last ?? "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjhhZDRmMTBkNFZ1";
    }

    public async Task<string> GenerateNextNumberAsync(Guid companyId, TransactionType type, int year, CancellationToken cancellationToken = default)
    {
        var prefix = type switch
        {
            TransactionType.Invoice => "INV",
            TransactionType.CreditNote => "CN",
            TransactionType.DebitNote => "DN",
            _ => "INV"
        };

        var searchPrefix = $"{prefix}-{year}-";
        var count = await _context.Invoices
            .CountAsync(i => i.CompanyId == companyId && i.InvoiceNumber.StartsWith(searchPrefix), cancellationToken);

        return $"{prefix}-{year}-{(count + 1):D4}";
    }

    public async Task<List<Invoice>> GetListAsync(
        Guid companyId,
        InvoiceType? type = null,
        TransactionType? transType = null,
        InvoiceStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Invoices
            .Include(i => i.Lines.OrderBy(l => l.LineNumber))
            .Where(i => i.CompanyId == companyId)
            .AsQueryable();

        if (type.HasValue)
            query = query.Where(i => i.InvoiceType == type.Value);

        if (transType.HasValue)
            query = query.Where(i => i.TransactionType == transType.Value);

        if (status.HasValue)
            query = query.Where(i => i.Status == status.Value);

        if (fromDate.HasValue)
            query = query.Where(i => i.IssueDate >= fromDate.Value.Date);

        if (toDate.HasValue)
            query = query.Where(i => i.IssueDate <= toDate.Value.Date);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            query = query.Where(i =>
                i.InvoiceNumber.Contains(term) ||
                i.CustomerName.Contains(term) ||
                (i.CustomerVatNumber != null && i.CustomerVatNumber.Contains(term)));
        }

        return await query
            .OrderByDescending(i => i.IssueDate)
            .ThenByDescending(i => i.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default)
    {
        await _context.Invoices.AddAsync(invoice, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
