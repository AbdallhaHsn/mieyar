using AlRobban.Modules.GeneralLedger.Domain.Entities;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface IBankReconciliationRepository
{
    Task<BankReconciliation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<BankReconciliation?> GetDraftByAccountAndDateAsync(Guid companyId, Guid bankAccountId, DateTime statementDate, CancellationToken cancellationToken = default);
    Task<List<Guid>> GetCompletedMatchedLineIdsAsync(Guid bankAccountId, CancellationToken cancellationToken = default);
    Task<List<BankReconciliation>> GetHistoryAsync(Guid companyId, Guid? bankAccountId, CancellationToken cancellationToken = default);
    Task<int> GetCountForYearAsync(Guid companyId, int year, CancellationToken cancellationToken = default);
    Task AddAsync(BankReconciliation reconciliation, CancellationToken cancellationToken = default);
    void RemoveItems(IEnumerable<BankReconciliationItem> items);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
