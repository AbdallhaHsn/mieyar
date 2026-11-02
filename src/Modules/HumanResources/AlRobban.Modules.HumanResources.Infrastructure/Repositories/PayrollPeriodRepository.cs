using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Modules.HumanResources.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.HumanResources.Infrastructure.Repositories;

public class PayrollPeriodRepository : IPayrollPeriodRepository
{
    private readonly HumanResourcesDbContext _context;

    public PayrollPeriodRepository(HumanResourcesDbContext context)
    {
        _context = context;
    }

    public async Task<PayrollPeriod?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.PayrollPeriods.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<PayrollPeriod?> GetByIdWithLinesAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.PayrollPeriods
            .Include(p => p.Lines)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<PayrollPeriod?> GetByPeriodAsync(Guid companyId, int year, int month, CancellationToken cancellationToken = default)
    {
        return await _context.PayrollPeriods
            .Include(p => p.Lines)
            .FirstOrDefaultAsync(p => p.CompanyId == companyId && p.PeriodYear == year && p.PeriodMonth == month, cancellationToken);
    }

    public async Task<List<PayrollPeriod>> GetListAsync(Guid companyId, int? year = null, CancellationToken cancellationToken = default)
    {
        var query = _context.PayrollPeriods.Where(p => p.CompanyId == companyId);
        if (year.HasValue)
        {
            query = query.Where(p => p.PeriodYear == year.Value);
        }
        return await query
            .OrderByDescending(p => p.PeriodYear)
            .ThenByDescending(p => p.PeriodMonth)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(PayrollPeriod period, CancellationToken cancellationToken = default)
    {
        await _context.PayrollPeriods.AddAsync(period, cancellationToken);
    }

    public Task UpdateAsync(PayrollPeriod period, CancellationToken cancellationToken = default)
    {
        _context.PayrollPeriods.Update(period);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
