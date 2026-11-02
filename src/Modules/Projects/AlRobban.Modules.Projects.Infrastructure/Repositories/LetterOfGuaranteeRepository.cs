using AlRobban.Modules.Projects.Domain.Entities;
using AlRobban.Modules.Projects.Domain.Repositories;
using AlRobban.Modules.Projects.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Projects.Infrastructure.Repositories;

public class LetterOfGuaranteeRepository : ILetterOfGuaranteeRepository
{
    private readonly ProjectsDbContext _dbContext;

    public LetterOfGuaranteeRepository(ProjectsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<LetterOfGuarantee?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.LettersOfGuarantee
            .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<LetterOfGuarantee>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.LettersOfGuarantee
            .Where(g => g.ProjectId == projectId)
            .OrderByDescending(g => g.IssueDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LetterOfGuarantee>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.LettersOfGuarantee
            .Where(g => g.CompanyId == companyId)
            .OrderByDescending(g => g.IssueDate)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(LetterOfGuarantee guarantee, CancellationToken cancellationToken = default)
    {
        await _dbContext.LettersOfGuarantee.AddAsync(guarantee, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(LetterOfGuarantee guarantee, CancellationToken cancellationToken = default)
    {
        _dbContext.LettersOfGuarantee.Update(guarantee);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(LetterOfGuarantee guarantee, CancellationToken cancellationToken = default)
    {
        _dbContext.LettersOfGuarantee.Remove(guarantee);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
