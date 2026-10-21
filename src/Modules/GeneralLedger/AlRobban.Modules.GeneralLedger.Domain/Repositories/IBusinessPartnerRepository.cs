using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface IBusinessPartnerRepository
{
    Task<BusinessPartner?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<BusinessPartner?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BusinessPartner>> GetListAsync(Guid companyId, PartnerType? partnerType = null, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task AddAsync(BusinessPartner partner, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
