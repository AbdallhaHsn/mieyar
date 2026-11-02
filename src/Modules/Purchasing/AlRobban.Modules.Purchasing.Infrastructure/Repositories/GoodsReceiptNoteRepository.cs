using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Purchasing.Infrastructure.Repositories;

public class GoodsReceiptNoteRepository : IGoodsReceiptNoteRepository
{
    private readonly PurchasingDbContext _dbContext;

    public GoodsReceiptNoteRepository(PurchasingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GoodsReceiptNote?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.GoodsReceiptNotes
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<GoodsReceiptNote?> GetByNumberAsync(Guid companyId, string receiptNumber, CancellationToken cancellationToken = default)
    {
        var num = receiptNumber.Trim().ToUpperInvariant();
        return await _dbContext.GoodsReceiptNotes
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.ReceiptNumber == num, cancellationToken);
    }

    public async Task<List<GoodsReceiptNote>> GetListAsync(
        Guid companyId,
        Guid? purchaseOrderId = null,
        Guid? vendorId = null,
        GoodsReceiptStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default)
    {
        var query = BuildQuery(companyId, purchaseOrderId, vendorId, status, fromDate, toDate, searchTerm);

        return await query
            .Include(x => x.Lines)
            .OrderByDescending(x => x.ReceiptDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountAsync(
        Guid companyId,
        Guid? purchaseOrderId = null,
        Guid? vendorId = null,
        GoodsReceiptStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = BuildQuery(companyId, purchaseOrderId, vendorId, status, fromDate, toDate, searchTerm);
        return await query.CountAsync(cancellationToken);
    }

    private IQueryable<GoodsReceiptNote> BuildQuery(
        Guid companyId,
        Guid? purchaseOrderId,
        Guid? vendorId,
        GoodsReceiptStatus? status,
        DateTime? fromDate,
        DateTime? toDate,
        string? searchTerm)
    {
        var query = _dbContext.GoodsReceiptNotes.Where(x => x.CompanyId == companyId);

        if (purchaseOrderId.HasValue)
            query = query.Where(x => x.PurchaseOrderId == purchaseOrderId.Value);

        if (vendorId.HasValue)
            query = query.Where(x => x.VendorId == vendorId.Value);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        if (fromDate.HasValue)
            query = query.Where(x => x.ReceiptDate >= fromDate.Value.Date);

        if (toDate.HasValue)
            query = query.Where(x => x.ReceiptDate <= toDate.Value.Date);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(x =>
                x.ReceiptNumber.ToLower().Contains(term) ||
                x.VendorName.ToLower().Contains(term) ||
                (x.PurchaseOrderNumber != null && x.PurchaseOrderNumber.ToLower().Contains(term)) ||
                (x.DeliveryNoteNumber != null && x.DeliveryNoteNumber.ToLower().Contains(term)) ||
                x.ReceiverName.ToLower().Contains(term));
        }

        return query;
    }

    public async Task<string> GenerateNextReceiptNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default)
    {
        var prefix = $"GRN-{year}-";
        var count = await _dbContext.GoodsReceiptNotes
            .CountAsync(x => x.CompanyId == companyId && x.ReceiptNumber.StartsWith(prefix), cancellationToken);

        return $"{prefix}{(count + 1):D5}";
    }

    public async Task AddAsync(GoodsReceiptNote note, CancellationToken cancellationToken = default)
    {
        await _dbContext.GoodsReceiptNotes.AddAsync(note, cancellationToken);
    }

    public Task UpdateAsync(GoodsReceiptNote note, CancellationToken cancellationToken = default)
    {
        _dbContext.GoodsReceiptNotes.Update(note);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
