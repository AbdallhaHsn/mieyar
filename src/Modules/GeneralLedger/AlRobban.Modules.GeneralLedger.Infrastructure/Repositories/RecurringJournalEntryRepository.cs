using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class RecurringJournalEntryRepository : IRecurringJournalEntryRepository
{
    private readonly GeneralLedgerDbContext _context;

    public RecurringJournalEntryRepository(GeneralLedgerDbContext context)
    {
        _context = context;
    }

    public async Task<RecurringJournalEntry?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.RecurringJournalEntries
            .Include(r => r.Lines)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<List<RecurringJournalEntry>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        return await _context.RecurringJournalEntries
            .Include(r => r.Lines)
            .Where(r => r.CompanyId == companyId)
            .OrderByDescending(r => r.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(RecurringJournalEntry entry, CancellationToken cancellationToken = default)
    {
        await _context.RecurringJournalEntries.AddAsync(entry, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
