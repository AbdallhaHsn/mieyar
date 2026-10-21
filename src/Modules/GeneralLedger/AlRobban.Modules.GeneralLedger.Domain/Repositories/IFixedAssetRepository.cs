using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface IFixedAssetRepository
{
    Task<FixedAsset?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<FixedAsset>> GetAllByCompanyAsync(Guid companyId, FixedAssetStatus? status = null, CancellationToken cancellationToken = default);
    Task<List<FixedAsset>> GetActiveForDepreciationAsync(Guid companyId, DateTime upToDate, CancellationToken cancellationToken = default);
    Task<int> GetCountForYearAsync(Guid companyId, int year, CancellationToken cancellationToken = default);
    Task AddAsync(FixedAsset asset, CancellationToken cancellationToken = default);
    Task AddDepreciationHistoryAsync(AssetDepreciationHistory history, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
