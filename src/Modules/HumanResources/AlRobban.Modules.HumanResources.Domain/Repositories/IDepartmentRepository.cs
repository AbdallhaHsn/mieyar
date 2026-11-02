using AlRobban.Modules.HumanResources.Domain.Entities;

namespace AlRobban.Modules.HumanResources.Domain.Repositories;

public interface IDepartmentRepository
{
    Task<Department?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Department?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default);
    Task<List<Department>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task AddAsync(Department department, CancellationToken cancellationToken = default);
    Task UpdateAsync(Department department, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
