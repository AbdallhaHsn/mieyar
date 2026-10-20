using AlRobban.Modules.IdentityAndAccess.Domain.Entities;

namespace AlRobban.Modules.IdentityAndAccess.Domain.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<User?> GetByUserNameOrEmailAsync(string identifier, CancellationToken cancellationToken = default);
    Task<bool> ExistsWithUserNameAsync(string userName, CancellationToken cancellationToken = default);
    Task<bool> ExistsWithEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<User>> GetUsersByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task AddAsync(User user, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
