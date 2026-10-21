using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface IFinancialSettingsRepository
{
    Task<CompanyFinancialSettings> GetOrCreateSettingsAsync(Guid tenantId, Guid companyId, CancellationToken cancellationToken = default);
    Task<FiscalYear?> GetActiveFiscalYearAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<List<FiscalYear>> GetAllFiscalYearsAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<FiscalYear?> GetFiscalYearByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<FiscalPeriod?> GetPeriodByIdAsync(Guid periodId, CancellationToken cancellationToken = default);
    Task<List<CostCenter>> GetCostCentersAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<CostCenter?> GetCostCenterByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddFiscalYearAsync(FiscalYear fiscalYear, CancellationToken cancellationToken = default);
    Task AddCostCenterAsync(CostCenter costCenter, CancellationToken cancellationToken = default);
    Task DeleteCostCenterAsync(CostCenter costCenter, CancellationToken cancellationToken = default);
    Task<FinancialStatementSettings> GetOrCreateStatementSettingsAsync(Guid tenantId, Guid companyId, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
