using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Purchasing.Infrastructure.Repositories;

public class PurchaseOrderRepository : IPurchaseOrderRepository
{
    private readonly PurchasingDbContext _dbContext;

    public PurchaseOrderRepository(PurchasingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PurchaseOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.PurchaseOrders
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<PurchaseOrder?> GetByNumberAsync(Guid companyId, string orderNumber, CancellationToken cancellationToken = default)
    {
        var num = orderNumber.Trim().ToUpperInvariant();
        return await _dbContext.PurchaseOrders
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.OrderNumber == num, cancellationToken);
    }

    public async Task<List<PurchaseOrder>> GetListAsync(
        Guid companyId,
        Guid? vendorId = null,
        PurchaseOrderStatus? status = null,
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
            .OrderByDescending(x => x.OrderDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountAsync(
        Guid companyId,
        Guid? vendorId = null,
        PurchaseOrderStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = BuildQuery(companyId, vendorId, status, fromDate, toDate, searchTerm);
        return await query.CountAsync(cancellationToken);
    }

    private IQueryable<PurchaseOrder> BuildQuery(
        Guid companyId,
        Guid? vendorId,
        PurchaseOrderStatus? status,
        DateTime? fromDate,
        DateTime? toDate,
        string? searchTerm)
    {
        var query = _dbContext.PurchaseOrders.Where(x => x.CompanyId == companyId);

        if (vendorId.HasValue)
            query = query.Where(x => x.VendorId == vendorId.Value);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        if (fromDate.HasValue)
            query = query.Where(x => x.OrderDate >= fromDate.Value.Date);

        if (toDate.HasValue)
            query = query.Where(x => x.OrderDate <= toDate.Value.Date);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(x =>
                x.OrderNumber.ToLower().Contains(term) ||
                x.VendorName.ToLower().Contains(term) ||
                (x.RequisitionNumber != null && x.RequisitionNumber.ToLower().Contains(term)));
        }

        return query;
    }

    public async Task<string> GenerateNextOrderNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default)
    {
        var prefix = $"PO-{year}-";
        var count = await _dbContext.PurchaseOrders
            .CountAsync(x => x.CompanyId == companyId && x.OrderNumber.StartsWith(prefix), cancellationToken);

        return $"{prefix}{(count + 1):D5}";
    }

    public async Task AddAsync(PurchaseOrder order, CancellationToken cancellationToken = default)
    {
        await _dbContext.PurchaseOrders.AddAsync(order, cancellationToken);
    }

    public Task UpdateAsync(PurchaseOrder order, CancellationToken cancellationToken = default)
    {
        _dbContext.PurchaseOrders.Update(order);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
