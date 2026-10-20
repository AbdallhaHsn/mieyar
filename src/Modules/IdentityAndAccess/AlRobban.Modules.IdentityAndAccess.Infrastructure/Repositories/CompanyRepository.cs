using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.IdentityAndAccess.Infrastructure.Repositories;

public class CompanyRepository : ICompanyRepository
{
    private readonly IdentityAndAccessDbContext _dbContext;

    public CompanyRepository(IdentityAndAccessDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Company?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Companies
            .Include(c => c.Branches)
            .Include(c => c.FiscalYears)
                .ThenInclude(y => y.Periods)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public async Task<Company?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Companies
            .Include(c => c.Branches)
            .Include(c => c.FiscalYears)
                .ThenInclude(y => y.Periods)
            .FirstOrDefaultAsync(c => c.Code == code, cancellationToken);
    }

    public async Task<bool> ExistsWithCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Companies
            .AnyAsync(c => c.Code == code, cancellationToken);
    }

    public async Task<bool> ExistsWithVatNumberAsync(string vatNumber, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Companies
            .AnyAsync(c => c.VatNumber == vatNumber, cancellationToken);
    }

    public async Task<IReadOnlyList<Company>> GetAllActiveAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Companies
            .Where(c => c.IsActive)
            .Include(c => c.Branches)
            .Include(c => c.FiscalYears)
                .ThenInclude(y => y.Periods)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Company company, CancellationToken cancellationToken = default)
    {
        await _dbContext.Companies.AddAsync(company, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
