using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class BankReconciliationRepository : IBankReconciliationRepository
{
    private readonly GeneralLedgerDbContext _dbContext;

    public BankReconciliationRepository(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<BankReconciliation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.BankReconciliations
            .Include(r => r.BankAccount)
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<BankReconciliation?> GetDraftByAccountAndDateAsync(
        Guid companyId,
        Guid bankAccountId,
        DateTime statementDate,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.BankReconciliations
            .Include(r => r.Items)
            .Where(r => r.CompanyId == companyId &&
                        r.BankAccountId == bankAccountId &&
                        r.Status == BankReconciliationStatus.Draft &&
                        r.StatementDate == statementDate.Date)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<Guid>> GetCompletedMatchedLineIdsAsync(Guid bankAccountId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.BankReconciliationItems
            .Where(i => i.BankReconciliation != null &&
                        i.BankReconciliation.BankAccountId == bankAccountId &&
                        i.BankReconciliation.Status == BankReconciliationStatus.Completed &&
                        i.IsMatched)
            .Select(i => i.JournalEntryLineId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<BankReconciliation>> GetHistoryAsync(
        Guid companyId,
        Guid? bankAccountId,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.BankReconciliations
            .Include(r => r.BankAccount)
            .Where(r => r.CompanyId == companyId);

        if (bankAccountId.HasValue)
        {
            query = query.Where(r => r.BankAccountId == bankAccountId.Value);
        }

        return await query
            .OrderByDescending(r => r.StatementDate)
            .ThenByDescending(r => r.ReconciliationNumber)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCountForYearAsync(Guid companyId, int year, CancellationToken cancellationToken = default)
    {
        return await _dbContext.BankReconciliations
            .Where(r => r.CompanyId == companyId && r.StatementDate.Year == year)
            .CountAsync(cancellationToken);
    }

    public async Task AddAsync(BankReconciliation reconciliation, CancellationToken cancellationToken = default)
    {
        await _dbContext.BankReconciliations.AddAsync(reconciliation, cancellationToken);
    }

    public void RemoveItems(IEnumerable<BankReconciliationItem> items)
    {
        _dbContext.BankReconciliationItems.RemoveRange(items);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
