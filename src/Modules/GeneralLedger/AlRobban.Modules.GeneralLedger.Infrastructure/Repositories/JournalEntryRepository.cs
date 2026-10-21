using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class JournalEntryRepository : IJournalEntryRepository
{
    private readonly GeneralLedgerDbContext _dbContext;

    public JournalEntryRepository(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<JournalEntry?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.JournalEntries
            .Include(x => x.FiscalPeriod)
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
                .ThenInclude(l => l.Account)
            .Include(x => x.Lines)
                .ThenInclude(l => l.CostCenter)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<JournalEntry?> GetByNumberAsync(Guid companyId, string entryNumber, CancellationToken cancellationToken = default)
    {
        return await _dbContext.JournalEntries
            .Include(x => x.FiscalPeriod)
            .Include(x => x.Lines.OrderBy(l => l.LineNumber))
                .ThenInclude(l => l.Account)
            .Include(x => x.Lines)
                .ThenInclude(l => l.CostCenter)
            .FirstOrDefaultAsync(x => x.CompanyId == companyId && x.EntryNumber == entryNumber, cancellationToken);
    }

    public async Task<string> GenerateNextEntryNumberAsync(Guid companyId, int year, CancellationToken cancellationToken = default)
    {
        var prefix = $"JV-{year}-";
        var count = await _dbContext.JournalEntries
            .CountAsync(x => x.CompanyId == companyId && x.EntryNumber.StartsWith(prefix), cancellationToken);

        return $"{prefix}{(count + 1).ToString("D5")}";
    }

    public async Task<List<JournalEntry>> GetListAsync(
        Guid companyId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        JournalEntryStatus? status = null,
        string? searchTerm = null,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default)
    {
        var query = BuildFilterQuery(companyId, fromDate, toDate, status, searchTerm);

        return await query
            .Include(x => x.FiscalPeriod)
            .Include(x => x.Lines)
                .ThenInclude(l => l.Account)
            .OrderByDescending(x => x.EntryDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountAsync(
        Guid companyId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        JournalEntryStatus? status = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = BuildFilterQuery(companyId, fromDate, toDate, status, searchTerm);
        return await query.CountAsync(cancellationToken);
    }

    private IQueryable<JournalEntry> BuildFilterQuery(
        Guid companyId,
        DateTime? fromDate,
        DateTime? toDate,
        JournalEntryStatus? status,
        string? searchTerm)
    {
        var query = _dbContext.JournalEntries.Where(x => x.CompanyId == companyId);

        if (fromDate.HasValue)
        {
            query = query.Where(x => x.EntryDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            query = query.Where(x => x.EntryDate <= toDate.Value.Date);
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(x =>
                x.EntryNumber.ToLower().Contains(term) ||
                x.DescriptionAr.ToLower().Contains(term) ||
                x.DescriptionEn.ToLower().Contains(term) ||
                (x.ReferenceNumber != null && x.ReferenceNumber.ToLower().Contains(term)));
        }

        return query;
    }

    public async Task<List<JournalEntryLine>> GetLinesByAccountAsync(
        Guid companyId,
        Guid accountId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        Guid? costCenterId = null,
        bool postedOnly = true,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.JournalEntryLines
            .Include(x => x.JournalEntry)
            .Include(x => x.CostCenter)
            .Include(x => x.Account)
            .Where(x => x.CompanyId == companyId && x.AccountId == accountId);

        if (postedOnly)
        {
            query = query.Where(x => x.JournalEntry != null && 
                (x.JournalEntry.Status == JournalEntryStatus.Posted || x.JournalEntry.Status == JournalEntryStatus.Reversed));
        }

        if (fromDate.HasValue)
        {
            query = query.Where(x => x.JournalEntry != null && x.JournalEntry.EntryDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            query = query.Where(x => x.JournalEntry != null && x.JournalEntry.EntryDate <= toDate.Value.Date);
        }

        if (costCenterId.HasValue)
        {
            query = query.Where(x => x.CostCenterId == costCenterId.Value);
        }

        return await query
            .OrderBy(x => x.JournalEntry!.EntryDate)
            .ThenBy(x => x.JournalEntry!.EntryNumber)
            .ThenBy(x => x.LineNumber)
            .ToListAsync(cancellationToken);
    }

    public async Task<decimal> GetAccountOpeningBalanceAsync(
        Guid companyId,
        Guid accountId,
        DateTime beforeDate,
        AccountNature nature,
        CancellationToken cancellationToken = default)
    {
        var lines = await _dbContext.JournalEntryLines
            .Where(x => x.CompanyId == companyId &&
                        x.AccountId == accountId &&
                        x.JournalEntry != null &&
                        (x.JournalEntry.Status == JournalEntryStatus.Posted || x.JournalEntry.Status == JournalEntryStatus.Reversed) &&
                        x.JournalEntry.EntryDate < beforeDate.Date)
            .Select(x => new { x.Debit, x.Credit })
            .ToListAsync(cancellationToken);

        var totalDebit = lines.Sum(x => x.Debit);
        var totalCredit = lines.Sum(x => x.Credit);

        return nature == AccountNature.Debit
            ? totalDebit - totalCredit
            : totalCredit - totalDebit;
    }

    public async Task<List<JournalEntryLine>> GetPostedLinesAsync(
        Guid companyId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        Guid? costCenterId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.JournalEntryLines
            .Include(x => x.JournalEntry)
            .Include(x => x.Account)
            .Where(x => x.CompanyId == companyId &&
                        x.JournalEntry != null &&
                        (x.JournalEntry.Status == JournalEntryStatus.Posted || x.JournalEntry.Status == JournalEntryStatus.Reversed));

        if (fromDate.HasValue)
        {
            query = query.Where(x => x.JournalEntry!.EntryDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(x => x.JournalEntry!.EntryDate <= endOfDay);
        }

        if (costCenterId.HasValue)
        {
            query = query.Where(x => x.CostCenterId == costCenterId.Value);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task AddAsync(JournalEntry entry, CancellationToken cancellationToken = default)
    {
        await _dbContext.JournalEntries.AddAsync(entry, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
