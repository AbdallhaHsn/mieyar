using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface IRecurringJournalEntryRepository
{
    Task<RecurringJournalEntry?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<RecurringJournalEntry>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task AddAsync(RecurringJournalEntry entry, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
