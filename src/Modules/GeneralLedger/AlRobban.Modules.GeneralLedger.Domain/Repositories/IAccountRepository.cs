using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface IAccountRepository
{
    Task<Account?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Account?> GetByCodeAsync(Guid companyId, string accountCode, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Account>> GetAllByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Account>> GetRootsByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Account>> GetSubAccountsAsync(Guid parentAccountId, CancellationToken cancellationToken = default);
    Task<bool> HasAnyAccountsAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task AddAsync(Account account, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<Account> accounts, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
