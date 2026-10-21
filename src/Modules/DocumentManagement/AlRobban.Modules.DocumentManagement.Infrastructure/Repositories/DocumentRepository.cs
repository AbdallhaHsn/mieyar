using AlRobban.Modules.DocumentManagement.Application.Entities;
using AlRobban.Modules.DocumentManagement.Application.Repositories;
using AlRobban.Modules.DocumentManagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.DocumentManagement.Infrastructure.Repositories;

public class DocumentRepository : IDocumentRepository
{
    private readonly DocumentManagementDbContext _dbContext;

    public DocumentRepository(DocumentManagementDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DocumentAttachment?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<DocumentAttachment>> GetByEntityAsync(Guid companyId, string entityType, Guid entityId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Documents
            .Where(d => d.CompanyId == companyId && d.EntityType == entityType && d.EntityId == entityId && !d.IsDeleted)
            .OrderByDescending(d => d.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(DocumentAttachment document, CancellationToken cancellationToken = default)
    {
        await _dbContext.Documents.AddAsync(document, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
