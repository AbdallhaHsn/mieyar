using AlRobban.Modules.Projects.Domain.Entities;
using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Modules.Projects.Domain.Repositories;
using AlRobban.Modules.Projects.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Projects.Infrastructure.Repositories;

public class ProgressBillingRepository : IProgressBillingRepository
{
    private readonly ProjectsDbContext _dbContext;

    public ProgressBillingRepository(ProjectsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ContractProgressBilling?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ContractProgressBillings
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractProgressBilling>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ContractProgressBillings
            .Where(b => b.ProjectId == projectId)
            .OrderByDescending(b => b.BillingSequence)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ContractProgressBilling>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ContractProgressBillings
            .Where(b => b.CompanyId == companyId)
            .OrderByDescending(b => b.BillingDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<string> GenerateNextBillingNumberAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var project = await _dbContext.Projects.FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);
        var projectCode = project?.Code ?? "PRJ";
        var count = await _dbContext.ContractProgressBillings
            .CountAsync(b => b.ProjectId == projectId, cancellationToken);

        return $"BILL-{projectCode}-{(count + 1):D3}";
    }

    public async Task<decimal> GetCumulativeApprovedWorkAmountAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ContractProgressBillings
            .Where(b => b.ProjectId == projectId &&
                        (b.Status == BillingStatus.ConsultantApproved ||
                         b.Status == BillingStatus.Certified ||
                         b.Status == BillingStatus.Invoiced))
            .SumAsync(b => b.CurrentWorkAmount, cancellationToken);
    }

    public async Task AddAsync(ContractProgressBilling billing, CancellationToken cancellationToken = default)
    {
        await _dbContext.ContractProgressBillings.AddAsync(billing, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(ContractProgressBilling billing, CancellationToken cancellationToken = default)
    {
        _dbContext.ContractProgressBillings.Update(billing);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(ContractProgressBilling billing, CancellationToken cancellationToken = default)
    {
        _dbContext.ContractProgressBillings.Remove(billing);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
