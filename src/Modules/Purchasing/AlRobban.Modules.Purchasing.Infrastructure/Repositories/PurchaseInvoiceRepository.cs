using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Purchasing.Infrastructure.Repositories;

public class PurchaseInvoiceRepository : IPurchaseInvoiceRepository
{
    private readonly PurchasingDbContext _dbContext;

    public PurchaseInvoiceRepository(PurchasingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PurchaseInvoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.PurchaseInvoices
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
                .ThenInclude(l => l.Item)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<PurchaseInvoice?> GetByNumberAsync(Guid companyId, string invoiceNumber, CancellationToken cancellationToken = default)
    {
        var num = invoiceNumber.Trim().ToUpperInvariant();
        return await _dbContext.PurchaseInvoices
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
                .ThenInclude(l => l.Item)
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.InvoiceNumber == num, cancellationToken);
    }

    public async Task<List<PurchaseInvoice>> GetListAsync(
        Guid companyId,
        Guid? vendorId = null,
        PurchaseInvoiceStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default)
    {
        var query = BuildQuery(companyId, vendorId, status, fromDate, toDate, searchTerm);

        return await query
            .Include(x => x.Lines)
            .OrderByDescending(x => x.IssueDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountAsync(
        Guid companyId,
        Guid? vendorId = null,
        PurchaseInvoiceStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = BuildQuery(companyId, vendorId, status, fromDate, toDate, searchTerm);
        return await query.CountAsync(cancellationToken);
    }

    private IQueryable<PurchaseInvoice> BuildQuery(
        Guid companyId,
        Guid? vendorId = null,
        PurchaseInvoiceStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null)
    {
        var query = _dbContext.PurchaseInvoices.Where(x => x.CompanyId == companyId);

        if (vendorId.HasValue)
        {
            query = query.Where(x => x.VendorId == vendorId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(x => x.IssueDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            query = query.Where(x => x.IssueDate <= toDate.Value.Date);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            query = query.Where(x => x.InvoiceNumber.Contains(term) ||
                                     x.VendorName.Contains(term) ||
                                     (x.VendorInvoiceNumber != null && x.VendorInvoiceNumber.Contains(term)) ||
                                     (x.VendorVatNumber != null && x.VendorVatNumber.Contains(term)));
        }

        return query;
    }

    public async Task<string> GenerateNextInvoiceNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default)
    {
        var prefix = $"PINV-{year}-";
        var numbers = await _dbContext.PurchaseInvoices
            .Where(x => x.CompanyId == companyId && x.InvoiceNumber.StartsWith(prefix))
            .Select(x => x.InvoiceNumber)
            .ToListAsync(cancellationToken);

        int maxSeq = 0;
        foreach (var num in numbers)
        {
            var parts = num.Split('-');
            if (parts.Length >= 3 && int.TryParse(parts[2], out var currentSeq))
            {
                if (currentSeq > maxSeq)
                {
                    maxSeq = currentSeq;
                }
            }
        }

        return $"{prefix}{(maxSeq + 1):D5}";
    }

    public async Task AddAsync(PurchaseInvoice invoice, CancellationToken cancellationToken = default)
    {
        await _dbContext.PurchaseInvoices.AddAsync(invoice, cancellationToken);
    }

    public Task UpdateAsync(PurchaseInvoice invoice, CancellationToken cancellationToken = default)
    {
        _dbContext.PurchaseInvoices.Update(invoice);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
