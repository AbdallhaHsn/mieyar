using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Purchasing.Infrastructure.Repositories;

public class PurchaseRequisitionRepository : IPurchaseRequisitionRepository
{
    private readonly PurchasingDbContext _dbContext;

    public PurchaseRequisitionRepository(PurchasingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PurchaseRequisition?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.PurchaseRequisitions
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<PurchaseRequisition?> GetByNumberAsync(Guid companyId, string reqNumber, CancellationToken cancellationToken = default)
    {
        var num = reqNumber.Trim().ToUpperInvariant();
        return await _dbContext.PurchaseRequisitions
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.RequisitionNumber == num, cancellationToken);
    }

    public async Task<List<PurchaseRequisition>> GetListAsync(
        Guid companyId,
        RequisitionStatus? status = null,
        string? searchTerm = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.PurchaseRequisitions
            .Include(x => x.Lines)
            .Where(x => x.CompanyId == companyId);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(x =>
                x.RequisitionNumber.ToLower().Contains(term) ||
                x.Title.ToLower().Contains(term) ||
                x.DepartmentName.ToLower().Contains(term) ||
                x.RequesterName.ToLower().Contains(term));
        }

        return await query
            .OrderByDescending(x => x.RequestDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountAsync(
        Guid companyId,
        RequisitionStatus? status = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.PurchaseRequisitions
            .Where(x => x.CompanyId == companyId);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(x =>
                x.RequisitionNumber.ToLower().Contains(term) ||
                x.Title.ToLower().Contains(term) ||
                x.DepartmentName.ToLower().Contains(term) ||
                x.RequesterName.ToLower().Contains(term));
        }

        return await query.CountAsync(cancellationToken);
    }

    public async Task<string> GenerateNextRequisitionNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default)
    {
        var prefix = $"PR-{year}-";
        var count = await _dbContext.PurchaseRequisitions
            .CountAsync(x => x.CompanyId == companyId && x.RequisitionNumber.StartsWith(prefix), cancellationToken);

        return $"{prefix}{(count + 1):D5}";
    }

    public async Task AddAsync(PurchaseRequisition requisition, CancellationToken cancellationToken = default)
    {
        await _dbContext.PurchaseRequisitions.AddAsync(requisition, cancellationToken);
    }

    public Task UpdateAsync(PurchaseRequisition requisition, CancellationToken cancellationToken = default)
    {
        _dbContext.PurchaseRequisitions.Update(requisition);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
