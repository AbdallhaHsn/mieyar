using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.InvoicingAndZatca.Infrastructure.Repositories;

public class PosShiftRepository : IPosShiftRepository
{
    private readonly InvoicingDbContext _context;

    public PosShiftRepository(InvoicingDbContext context)
    {
        _context = context;
    }

    public async Task<PosShift?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.PosShifts.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<PosShift?> GetByIdWithMovementsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.PosShifts
            .Include(s => s.CashMovements)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<PosShift?> GetActiveShiftAsync(Guid companyId, string? terminalCode = null, string? cashierUserId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.PosShifts
            .Include(s => s.CashMovements)
            .Where(s => s.CompanyId == companyId && s.Status == PosShiftStatus.Open);

        if (!string.IsNullOrWhiteSpace(terminalCode))
        {
            var tCode = terminalCode.Trim().ToUpperInvariant();
            query = query.Where(s => s.TerminalCode == tCode);
        }

        if (!string.IsNullOrWhiteSpace(cashierUserId))
        {
            query = query.Where(s => s.CashierUserId == cashierUserId);
        }

        return await query.OrderByDescending(s => s.OpenedAtUtc).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<PosShift>> GetHistoryAsync(Guid companyId, int maxCount = 50, CancellationToken cancellationToken = default)
    {
        return await _context.PosShifts
            .Where(s => s.CompanyId == companyId)
            .OrderByDescending(s => s.OpenedAtUtc)
            .Take(maxCount)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(PosShift shift, CancellationToken cancellationToken = default)
    {
        await _context.PosShifts.AddAsync(shift, cancellationToken);
    }

    public Task UpdateAsync(PosShift shift, CancellationToken cancellationToken = default)
    {
        _context.PosShifts.Update(shift);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
