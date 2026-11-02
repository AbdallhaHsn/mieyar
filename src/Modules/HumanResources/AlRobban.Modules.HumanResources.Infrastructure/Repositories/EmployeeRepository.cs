using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Modules.HumanResources.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.HumanResources.Infrastructure.Repositories;

public class EmployeeRepository : IEmployeeRepository
{
    private readonly HumanResourcesDbContext _context;

    public EmployeeRepository(HumanResourcesDbContext context)
    {
        _context = context;
    }

    public async Task<Employee?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Employees.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<Employee?> GetByNumberAsync(Guid companyId, string employeeNumber, CancellationToken cancellationToken = default)
    {
        return await _context.Employees
            .FirstOrDefaultAsync(e => e.CompanyId == companyId && e.EmployeeNumber == employeeNumber.Trim().ToUpperInvariant(), cancellationToken);
    }

    public async Task<Employee?> GetByNationalIdAsync(Guid companyId, string nationalIdOrIqama, CancellationToken cancellationToken = default)
    {
        return await _context.Employees
            .FirstOrDefaultAsync(e => e.CompanyId == companyId && e.NationalIdOrIqama == nationalIdOrIqama.Trim(), cancellationToken);
    }

    public async Task<List<Employee>> GetListAsync(Guid companyId, bool? activeOnly = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Employees.Where(e => e.CompanyId == companyId);
        if (activeOnly.HasValue && activeOnly.Value)
        {
            query = query.Where(e => e.Status == EmployeeStatus.Active);
        }
        return await query.OrderBy(e => e.EmployeeNumber).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Employee employee, CancellationToken cancellationToken = default)
    {
        await _context.Employees.AddAsync(employee, cancellationToken);
    }

    public Task UpdateAsync(Employee employee, CancellationToken cancellationToken = default)
    {
        _context.Employees.Update(employee);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
