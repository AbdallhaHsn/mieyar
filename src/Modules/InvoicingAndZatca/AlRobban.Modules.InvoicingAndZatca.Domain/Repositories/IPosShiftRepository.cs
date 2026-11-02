using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;

namespace AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;

public interface IPosShiftRepository
{
    Task<PosShift?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PosShift?> GetByIdWithMovementsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PosShift?> GetActiveShiftAsync(Guid companyId, string? terminalCode = null, string? cashierUserId = null, CancellationToken cancellationToken = default);
    Task<List<PosShift>> GetHistoryAsync(Guid companyId, int maxCount = 50, CancellationToken cancellationToken = default);
    Task AddAsync(PosShift shift, CancellationToken cancellationToken = default);
    Task UpdateAsync(PosShift shift, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
