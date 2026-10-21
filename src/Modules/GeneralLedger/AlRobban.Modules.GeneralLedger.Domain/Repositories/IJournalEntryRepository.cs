using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface IJournalEntryRepository
{
    Task<JournalEntry?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<JournalEntry?> GetByNumberAsync(Guid companyId, string entryNumber, CancellationToken cancellationToken = default);
    Task<string> GenerateNextEntryNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default);
    Task<List<JournalEntry>> GetListAsync(
        Guid companyId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        JournalEntryStatus? status = null,
        string? searchTerm = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default);
    Task<int> GetCountAsync(
        Guid companyId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        JournalEntryStatus? status = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);
    Task<List<JournalEntryLine>> GetLinesByAccountAsync(
        Guid companyId,
        Guid accountId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        Guid? costCenterId = null,
        bool postedOnly = true,
        CancellationToken cancellationToken = default);
    Task<decimal> GetAccountOpeningBalanceAsync(
        Guid companyId,
        Guid accountId,
        DateTime beforeDate,
        AccountNature nature,
        CancellationToken cancellationToken = default);
    Task<List<JournalEntryLine>> GetPostedLinesAsync(
        Guid companyId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        Guid? costCenterId = null,
        CancellationToken cancellationToken = default);
    Task AddAsync(JournalEntry entry, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
