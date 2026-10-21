using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;

namespace AlRobban.Modules.GeneralLedger.Domain.Repositories;

public interface IVoucherRepository
{
    Task<Voucher?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<Voucher>> GetByCompanyAsync(
        Guid companyId,
        VoucherType? type = null,
        VoucherStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);
    Task<string> GenerateNextVoucherNumberAsync(
        Guid companyId,
        VoucherType type,
        int year,
        CancellationToken cancellationToken = default);
    Task AddAsync(Voucher voucher, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
