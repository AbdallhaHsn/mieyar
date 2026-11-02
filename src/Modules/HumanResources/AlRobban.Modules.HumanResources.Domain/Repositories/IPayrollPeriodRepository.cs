using AlRobban.Modules.HumanResources.Domain.Entities;

namespace AlRobban.Modules.HumanResources.Domain.Repositories;

public interface IPayrollPeriodRepository
{
    Task<PayrollPeriod?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PayrollPeriod?> GetByIdWithLinesAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PayrollPeriod?> GetByPeriodAsync(Guid companyId, int year, int month, CancellationToken cancellationToken = default);
    Task<List<PayrollPeriod>> GetListAsync(Guid companyId, int? year = null, CancellationToken cancellationToken = default);
    Task AddAsync(PayrollPeriod period, CancellationToken cancellationToken = default);
    Task UpdateAsync(PayrollPeriod period, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
