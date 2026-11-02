using AlRobban.Modules.HumanResources.Domain.Entities;

namespace AlRobban.Modules.HumanResources.Domain.Repositories;

public interface IEmployeeRepository
{
    Task<Employee?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Employee?> GetByNumberAsync(Guid companyId, string employeeNumber, CancellationToken cancellationToken = default);
    Task<Employee?> GetByNationalIdAsync(Guid companyId, string nationalIdOrIqama, CancellationToken cancellationToken = default);
    Task<List<Employee>> GetListAsync(Guid companyId, bool? activeOnly = null, CancellationToken cancellationToken = default);
    Task AddAsync(Employee employee, CancellationToken cancellationToken = default);
    Task UpdateAsync(Employee employee, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
