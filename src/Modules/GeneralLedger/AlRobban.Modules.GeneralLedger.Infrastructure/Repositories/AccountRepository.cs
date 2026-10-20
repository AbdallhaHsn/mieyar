using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class AccountRepository : IAccountRepository
{
    private readonly GeneralLedgerDbContext _dbContext;

    public AccountRepository(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Account?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Accounts
            .Include(x => x.ParentAccount)
            .Include(x => x.SubAccounts)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<Account?> GetByCodeAsync(Guid companyId, string accountCode, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Accounts
            .Include(x => x.SubAccounts)
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.AccountCode == accountCode, cancellationToken);
    }

    public async Task<IReadOnlyList<Account>> GetAllByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Accounts
            .Where(x => x.CompanyId == companyId)
            .OrderBy(x => x.AccountCode)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Account>> GetRootsByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Accounts
            .Where(x => x.CompanyId == companyId && x.ParentAccountId == null)
            .OrderBy(x => x.AccountCode)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Account>> GetSubAccountsAsync(Guid parentAccountId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Accounts
            .Where(x => x.ParentAccountId == parentAccountId)
            .OrderBy(x => x.AccountCode)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> HasAnyAccountsAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Accounts.AnyAsync(x => x.CompanyId == companyId, cancellationToken);
    }

    public async Task AddAsync(Account account, CancellationToken cancellationToken = default)
    {
        await _dbContext.Accounts.AddAsync(account, cancellationToken);
    }

    public async Task AddRangeAsync(IEnumerable<Account> accounts, CancellationToken cancellationToken = default)
    {
        await _dbContext.Accounts.AddRangeAsync(accounts, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
