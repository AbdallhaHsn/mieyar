using AlRobban.Modules.DocumentManagement.Application.Entities;

namespace AlRobban.Modules.DocumentManagement.Application.Repositories;

public interface IDocumentRepository
{
    Task<DocumentAttachment?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DocumentAttachment>> GetByEntityAsync(Guid companyId, string entityType, Guid entityId, CancellationToken cancellationToken = default);
    Task AddAsync(DocumentAttachment document, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
