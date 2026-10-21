using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface IPostDatedCheckRepository
{
    Task<PostDatedCheck?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PostDatedCheck>> GetListAsync(Guid companyId, CheckType? type = null, CheckStatus? status = null, CancellationToken cancellationToken = default);
    Task AddAsync(PostDatedCheck check, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
