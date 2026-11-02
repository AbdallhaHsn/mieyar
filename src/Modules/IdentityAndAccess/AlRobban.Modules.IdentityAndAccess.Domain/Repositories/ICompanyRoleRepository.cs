using AlRobban.Modules.IdentityAndAccess.Domain.Entities;

namespace AlRobban.Modules.IdentityAndAccess.Domain.Repositories;

public interface ICompanyRoleRepository
{
    Task<CompanyRole?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CompanyRole?> GetByCodeAsync(Guid tenantId, string code, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CompanyRole>> GetRolesByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<bool> ExistsWithCodeAsync(Guid tenantId, string code, Guid? excludeRoleId = null, CancellationToken cancellationToken = default);
    Task AddAsync(CompanyRole role, CancellationToken cancellationToken = default);
    void Remove(CompanyRole role);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
