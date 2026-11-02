using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.IdentityAndAccess.Infrastructure.Repositories;

public class CompanyRoleRepository : ICompanyRoleRepository
{
    private readonly IdentityAndAccessDbContext _dbContext;

    public CompanyRoleRepository(IdentityAndAccessDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<CompanyRole?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CompanyRoles.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<CompanyRole?> GetByCodeAsync(Guid tenantId, string code, CancellationToken cancellationToken = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return await _dbContext.CompanyRoles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Code == normalized, cancellationToken);
    }

    public async Task<IReadOnlyList<CompanyRole>> GetRolesByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CompanyRoles
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.IsSystemRole)
            .ThenBy(r => r.NameAr)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsWithCodeAsync(Guid tenantId, string code, Guid? excludeRoleId = null, CancellationToken cancellationToken = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        var query = _dbContext.CompanyRoles
            .Where(r => r.TenantId == tenantId && r.Code == normalized);

        if (excludeRoleId.HasValue)
        {
            query = query.Where(r => r.Id != excludeRoleId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task AddAsync(CompanyRole role, CancellationToken cancellationToken = default)
    {
        await _dbContext.CompanyRoles.AddAsync(role, cancellationToken);
    }

    public void Remove(CompanyRole role)
    {
        _dbContext.CompanyRoles.Remove(role);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
