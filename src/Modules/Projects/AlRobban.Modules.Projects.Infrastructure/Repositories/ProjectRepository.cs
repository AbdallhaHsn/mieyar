using AlRobban.Modules.Projects.Domain.Entities;
using AlRobban.Modules.Projects.Domain.Repositories;
using AlRobban.Modules.Projects.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Projects.Infrastructure.Repositories;

public class ProjectRepository : IProjectRepository
{
    private readonly ProjectsDbContext _dbContext;

    public ProjectRepository(ProjectsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Project?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<Project?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Projects
            .Include(p => p.Phases)
            .Include(p => p.Billings)
            .Include(p => p.Guarantees)
            .Include(p => p.Expenses)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<Project?> GetByCodeAsync(string code, Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.CompanyId == companyId && p.Code == code, cancellationToken);
    }

    public async Task<IReadOnlyList<Project>> GetListAsync(Guid companyId, string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Projects
            .Include(p => p.Phases)
            .Include(p => p.Billings)
            .Include(p => p.Guarantees)
            .Include(p => p.Expenses)
            .Where(p => p.CompanyId == companyId);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(p =>
                p.Code.ToLower().Contains(term) ||
                p.NameAr.ToLower().Contains(term) ||
                p.NameEn.ToLower().Contains(term) ||
                p.CustomerName.ToLower().Contains(term) ||
                p.ContractNumber.ToLower().Contains(term));
        }

        return await query.OrderByDescending(p => p.CreatedAtUtc).ToListAsync(cancellationToken);
    }

    public async Task<string> GenerateNextProjectCodeAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"PRJ-{year}-";
        var count = await _dbContext.Projects
            .CountAsync(p => p.CompanyId == companyId && p.Code.StartsWith(prefix), cancellationToken);

        return $"{prefix}{(count + 1):D4}";
    }

    public async Task AddAsync(Project project, CancellationToken cancellationToken = default)
    {
        await _dbContext.Projects.AddAsync(project, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Project project, CancellationToken cancellationToken = default)
    {
        _dbContext.Projects.Update(project);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Project project, CancellationToken cancellationToken = default)
    {
        _dbContext.Projects.Remove(project);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Projects.AnyAsync(p => p.Id == id, cancellationToken);
    }
}
