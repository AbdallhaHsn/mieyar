using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class FinancialSettingsRepository : IFinancialSettingsRepository
{
    private readonly GeneralLedgerDbContext _dbContext;

    public FinancialSettingsRepository(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<CompanyFinancialSettings> GetOrCreateSettingsAsync(Guid tenantId, Guid companyId, CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.FinancialSettings
            .FirstOrDefaultAsync(x => x.CompanyId == companyId, cancellationToken);

        if (settings == null)
        {
            settings = CompanyFinancialSettings.CreateDefault(tenantId, companyId);
            await _dbContext.FinancialSettings.AddAsync(settings, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return settings;
    }

    public async Task<FiscalYear?> GetActiveFiscalYearAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.FiscalYears
            .Include(x => x.Periods.OrderBy(p => p.PeriodNumber))
            .Where(x => x.CompanyId == companyId && x.IsActive)
            .OrderByDescending(x => x.YearNumber)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<FiscalYear>> GetAllFiscalYearsAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.FiscalYears
            .Include(x => x.Periods.OrderBy(p => p.PeriodNumber))
            .Where(x => x.CompanyId == companyId)
            .OrderByDescending(x => x.YearNumber)
            .ToListAsync(cancellationToken);
    }

    public async Task<FiscalYear?> GetFiscalYearByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.FiscalYears
            .Include(x => x.Periods.OrderBy(p => p.PeriodNumber))
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<FiscalPeriod?> GetPeriodByIdAsync(Guid periodId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.FiscalPeriods
            .Include(x => x.FiscalYear)
            .FirstOrDefaultAsync(x => x.Id == periodId, cancellationToken);
    }

    public async Task<List<CostCenter>> GetCostCentersAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CostCenters
            .Include(x => x.SubCostCenters)
            .Where(x => x.CompanyId == companyId && x.ParentCostCenterId == null)
            .OrderBy(x => x.Code)
            .ToListAsync(cancellationToken);
    }

    public async Task<CostCenter?> GetCostCenterByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CostCenters
            .Include(x => x.SubCostCenters)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddFiscalYearAsync(FiscalYear fiscalYear, CancellationToken cancellationToken = default)
    {
        await _dbContext.FiscalYears.AddAsync(fiscalYear, cancellationToken);
    }

    public async Task AddCostCenterAsync(CostCenter costCenter, CancellationToken cancellationToken = default)
    {
        await _dbContext.CostCenters.AddAsync(costCenter, cancellationToken);
    }

    public Task DeleteCostCenterAsync(CostCenter costCenter, CancellationToken cancellationToken = default)
    {
        costCenter.IsDeleted = true;
        costCenter.DeletedAtUtc = DateTime.UtcNow;
        return Task.CompletedTask;
    }

    public async Task<FinancialStatementSettings> GetOrCreateStatementSettingsAsync(Guid tenantId, Guid companyId, CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.StatementSettings
            .FirstOrDefaultAsync(x => x.CompanyId == companyId, cancellationToken);

        if (settings == null)
        {
            settings = FinancialStatementSettings.CreateDefault(tenantId, companyId);
            await _dbContext.StatementSettings.AddAsync(settings, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return settings;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
