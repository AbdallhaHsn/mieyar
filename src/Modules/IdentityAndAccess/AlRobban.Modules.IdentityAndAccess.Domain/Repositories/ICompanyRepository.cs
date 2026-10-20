using AlRobban.Modules.IdentityAndAccess.Domain.Entities;

namespace AlRobban.Modules.IdentityAndAccess.Domain.Repositories;

public interface ICompanyRepository
{
    Task<Company?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Company?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<bool> ExistsWithCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<bool> ExistsWithVatNumberAsync(string vatNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Company>> GetAllActiveAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Company company, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
