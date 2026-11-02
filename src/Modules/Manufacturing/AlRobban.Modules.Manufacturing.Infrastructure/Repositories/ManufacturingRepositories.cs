using AlRobban.Modules.Manufacturing.Domain.Entities;
using AlRobban.Modules.Manufacturing.Domain.Enums;
using AlRobban.Modules.Manufacturing.Domain.Repositories;
using AlRobban.Modules.Manufacturing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Manufacturing.Infrastructure.Repositories;

public class BillOfMaterialsRepository : IBillOfMaterialsRepository
{
    private readonly ManufacturingDbContext _context;

    public BillOfMaterialsRepository(ManufacturingDbContext context) => _context = context;

    public async Task<BillOfMaterials?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.BillOfMaterials
            .Include(b => b.Components)
            .Include(b => b.Operations)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
    }

    public async Task<BillOfMaterials?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default)
    {
        return await _context.BillOfMaterials
            .Include(b => b.Components)
            .Include(b => b.Operations)
            .FirstOrDefaultAsync(b => b.CompanyId == companyId && b.Code == code, cancellationToken);
    }

    public async Task<List<BillOfMaterials>> GetListAsync(Guid companyId, string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var query = _context.BillOfMaterials
            .Include(b => b.Components)
            .Include(b => b.Operations)
            .Where(b => b.CompanyId == companyId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(b => b.Code.ToLower().Contains(term) ||
                                     b.NameAr.ToLower().Contains(term) ||
                                     b.NameEn.ToLower().Contains(term) ||
                                     b.FinishedProductNameAr.ToLower().Contains(term));
        }

        return await query.OrderByDescending(b => b.CreatedAtUtc).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(BillOfMaterials bom, CancellationToken cancellationToken = default)
    {
        await _context.BillOfMaterials.AddAsync(bom, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public void Update(BillOfMaterials bom)
    {
        _context.BillOfMaterials.Update(bom);
        _context.SaveChanges();
    }

    public void Remove(BillOfMaterials bom)
    {
        _context.BillOfMaterials.Remove(bom);
        _context.SaveChanges();
    }
}

public class WorkOrderRepository : IWorkOrderRepository
{
    private readonly ManufacturingDbContext _context;

    public WorkOrderRepository(ManufacturingDbContext context) => _context = context;

    public async Task<WorkOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.WorkOrders
            .Include(w => w.ComponentsConsumed)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);
    }

    public async Task<WorkOrder?> GetByNumberAsync(Guid companyId, string workOrderNumber, CancellationToken cancellationToken = default)
    {
        return await _context.WorkOrders
            .Include(w => w.ComponentsConsumed)
            .FirstOrDefaultAsync(w => w.CompanyId == companyId && w.WorkOrderNumber == workOrderNumber, cancellationToken);
    }

    public async Task<List<WorkOrder>> GetListAsync(Guid companyId, WorkOrderStatus? status = null, string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var query = _context.WorkOrders
            .Include(w => w.ComponentsConsumed)
            .Where(w => w.CompanyId == companyId)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(w => w.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(w => w.WorkOrderNumber.ToLower().Contains(term) ||
                                     w.FinishedProductNameAr.ToLower().Contains(term) ||
                                     w.BomCode.ToLower().Contains(term) ||
                                     w.AssignedSupervisor.ToLower().Contains(term));
        }

        return await query.OrderByDescending(w => w.CreatedAtUtc).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(WorkOrder workOrder, CancellationToken cancellationToken = default)
    {
        await _context.WorkOrders.AddAsync(workOrder, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public void Update(WorkOrder workOrder)
    {
        _context.WorkOrders.Update(workOrder);
        _context.SaveChanges();
    }

    public void Remove(WorkOrder workOrder)
    {
        _context.WorkOrders.Remove(workOrder);
        _context.SaveChanges();
    }

    public async Task<string> GenerateNextNumberAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"WO-{year}-";
        var count = await _context.WorkOrders
            .CountAsync(w => w.CompanyId == companyId && w.WorkOrderNumber.StartsWith(prefix), cancellationToken);

        return $"{prefix}{(count + 1):D4}";
    }
}

public class WorkstationRepository : IWorkstationRepository
{
    private readonly ManufacturingDbContext _context;

    public WorkstationRepository(ManufacturingDbContext context) => _context = context;

    public async Task<Workstation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Workstations.FirstOrDefaultAsync(w => w.Id == id, cancellationToken);
    }

    public async Task<List<Workstation>> GetListAsync(Guid companyId, string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Workstations.Where(w => w.CompanyId == companyId).AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(w => w.Code.ToLower().Contains(term) ||
                                     w.NameAr.ToLower().Contains(term) ||
                                     w.Location.ToLower().Contains(term));
        }

        return await query.OrderBy(w => w.Code).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Workstation workstation, CancellationToken cancellationToken = default)
    {
        await _context.Workstations.AddAsync(workstation, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public void Update(Workstation workstation)
    {
        _context.Workstations.Update(workstation);
        _context.SaveChanges();
    }

    public void Remove(Workstation workstation)
    {
        _context.Workstations.Remove(workstation);
        _context.SaveChanges();
    }
}

public class RawMaterialRepository : IRawMaterialRepository
{
    private readonly ManufacturingDbContext _context;

    public RawMaterialRepository(ManufacturingDbContext context) => _context = context;

    public async Task<RawMaterial?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.RawMaterials.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<List<RawMaterial>> GetListAsync(Guid companyId, RawMaterialCategory? category = null, string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var query = _context.RawMaterials.Where(r => r.CompanyId == companyId).AsQueryable();

        if (category.HasValue)
        {
            query = query.Where(r => r.Category == category.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(r => r.ItemCode.ToLower().Contains(term) ||
                                     r.NameAr.ToLower().Contains(term) ||
                                     r.NameEn.ToLower().Contains(term) ||
                                     r.WarehouseName.ToLower().Contains(term));
        }

        return await query.OrderBy(r => r.ItemCode).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(RawMaterial item, CancellationToken cancellationToken = default)
    {
        await _context.RawMaterials.AddAsync(item, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public void Update(RawMaterial item)
    {
        _context.RawMaterials.Update(item);
        _context.SaveChanges();
    }

    public void Remove(RawMaterial item)
    {
        _context.RawMaterials.Remove(item);
        _context.SaveChanges();
    }
}
