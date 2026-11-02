using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Modules.HumanResources.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.HumanResources.Infrastructure.Repositories;

public class DepartmentRepository : IDepartmentRepository
{
    private readonly HumanResourcesDbContext _context;

    public DepartmentRepository(HumanResourcesDbContext context)
    {
        _context = context;
    }

    public async Task<Department?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Departments.FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
    }

    public async Task<Department?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default)
    {
        return await _context.Departments
            .FirstOrDefaultAsync(d => d.CompanyId == companyId && d.Code == code.Trim().ToUpperInvariant(), cancellationToken);
    }

    public async Task<List<Department>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _context.Departments
            .Where(d => d.CompanyId == companyId)
            .OrderBy(d => d.Code)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Department department, CancellationToken cancellationToken = default)
    {
        await _context.Departments.AddAsync(department, cancellationToken);
    }

    public Task UpdateAsync(Department department, CancellationToken cancellationToken = default)
    {
        _context.Departments.Update(department);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
