using AlRobban.Modules.Projects.Domain.Entities;

namespace AlRobban.Modules.Projects.Domain.Repositories;

public interface IProgressBillingRepository
{
    Task<ContractProgressBilling?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ContractProgressBilling>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ContractProgressBilling>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<string> GenerateNextBillingNumberAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<decimal> GetCumulativeApprovedWorkAmountAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task AddAsync(ContractProgressBilling billing, CancellationToken cancellationToken = default);
    Task UpdateAsync(ContractProgressBilling billing, CancellationToken cancellationToken = default);
    Task DeleteAsync(ContractProgressBilling billing, CancellationToken cancellationToken = default);
}
