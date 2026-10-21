using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class BusinessPartnerRepository : IBusinessPartnerRepository
{
    private readonly GeneralLedgerDbContext _dbContext;

    public BusinessPartnerRepository(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<BusinessPartner?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.BusinessPartners.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<BusinessPartner?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default)
    {
        return await _dbContext.BusinessPartners.FirstOrDefaultAsync(p => p.CompanyId == companyId && p.Code == code, cancellationToken);
    }

    public async Task<IReadOnlyList<BusinessPartner>> GetListAsync(Guid companyId, PartnerType? partnerType = null, string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.BusinessPartners.Where(p => p.CompanyId == companyId && p.IsActive);

        if (partnerType.HasValue)
        {
            if (partnerType.Value == PartnerType.Customer)
                query = query.Where(p => p.PartnerType == PartnerType.Customer || p.PartnerType == PartnerType.Both);
            else if (partnerType.Value == PartnerType.Supplier)
                query = query.Where(p => p.PartnerType == PartnerType.Supplier || p.PartnerType == PartnerType.Both);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(p => p.NameAr.ToLower().Contains(term) || p.NameEn.ToLower().Contains(term) || p.Code.ToLower().Contains(term));
        }

        return await query.OrderBy(p => p.Code).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(BusinessPartner partner, CancellationToken cancellationToken = default)
    {
        await _dbContext.BusinessPartners.AddAsync(partner, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
