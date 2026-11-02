using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;

namespace AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;

public interface ISalespersonRepository
{
    Task<Salesperson?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Salesperson?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default);
    Task<Salesperson?> GetByUserIdAsync(Guid companyId, Guid userId, CancellationToken cancellationToken = default);
    Task<List<Salesperson>> GetListAsync(Guid companyId, bool? isActive = null, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task AddAsync(Salesperson salesperson, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
