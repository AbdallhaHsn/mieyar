using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.InvoicingAndZatca.Infrastructure.Repositories;

public class SalespersonRepository : ISalespersonRepository
{
    private readonly InvoicingDbContext _context;

    public SalespersonRepository(InvoicingDbContext context)
    {
        _context = context;
    }

    public async Task<Salesperson?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Salespersons.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<Salesperson?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        return await _context.Salespersons
            .FirstOrDefaultAsync(s => s.CompanyId == companyId && s.Code == normalizedCode, cancellationToken);
    }

    public async Task<Salesperson?> GetByUserIdAsync(Guid companyId, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.Salespersons
            .FirstOrDefaultAsync(s => s.CompanyId == companyId && s.UserId == userId && s.IsActive, cancellationToken);
    }

    public async Task<List<Salesperson>> GetListAsync(Guid companyId, bool? isActive = null, string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Salespersons
            .Where(s => s.CompanyId == companyId)
            .AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLowerInvariant();
            query = query.Where(s =>
                s.Code.ToLower().Contains(term) ||
                s.NameAr.ToLower().Contains(term) ||
                s.NameEn.ToLower().Contains(term) ||
                (s.UserName != null && s.UserName.ToLower().Contains(term)) ||
                (s.PhoneNumber != null && s.PhoneNumber.Contains(term)) ||
                s.WarehouseCode.ToLower().Contains(term));
        }

        return await query.OrderBy(s => s.Code).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Salesperson salesperson, CancellationToken cancellationToken = default)
    {
        await _context.Salespersons.AddAsync(salesperson, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
