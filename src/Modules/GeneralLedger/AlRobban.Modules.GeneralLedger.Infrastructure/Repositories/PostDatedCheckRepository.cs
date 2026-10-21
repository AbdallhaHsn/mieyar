using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class PostDatedCheckRepository : IPostDatedCheckRepository
{
    private readonly GeneralLedgerDbContext _dbContext;

    public PostDatedCheckRepository(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PostDatedCheck?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.PostDatedChecks.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<PostDatedCheck>> GetListAsync(Guid companyId, CheckType? type = null, CheckStatus? status = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.PostDatedChecks.Where(c => c.CompanyId == companyId);

        if (type.HasValue)
            query = query.Where(c => c.CheckType == type.Value);

        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        return await query.OrderByDescending(c => c.DueDate).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(PostDatedCheck check, CancellationToken cancellationToken = default)
    {
        await _dbContext.PostDatedChecks.AddAsync(check, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
