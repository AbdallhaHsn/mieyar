using AlRobban.Modules.Projects.Domain.Entities;

namespace AlRobban.Modules.Projects.Domain.Repositories;

public interface IProjectRepository
{
    Task<Project?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Project?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Project?> GetByCodeAsync(string code, Guid companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Project>> GetListAsync(Guid companyId, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task<string> GenerateNextProjectCodeAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task AddAsync(Project project, CancellationToken cancellationToken = default);
    Task UpdateAsync(Project project, CancellationToken cancellationToken = default);
    Task DeleteAsync(Project project, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);
}
