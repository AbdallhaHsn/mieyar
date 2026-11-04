using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;

public class VoucherRepository : IVoucherRepository
{
    private readonly GeneralLedgerDbContext _dbContext;

    public VoucherRepository(GeneralLedgerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Voucher?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Vouchers
            .Include(x => x.CashOrBankAccount)
            .Include(x => x.JournalEntry)
            .Include(x => x.Lines)
                .ThenInclude(l => l.Account)
            .Include(x => x.Lines)
                .ThenInclude(l => l.CostCenter)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<List<Voucher>> GetByCompanyAsync(
        Guid companyId,
        VoucherType? type = null,
        VoucherStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Vouchers
            .Include(x => x.CashOrBankAccount)
            .Include(x => x.JournalEntry)
            .Include(x => x.Lines)
                .ThenInclude(l => l.Account)
            .Include(x => x.Lines)
                .ThenInclude(l => l.CostCenter)
            .Where(x => x.CompanyId == companyId);

        if (type.HasValue)
        {
            query = query.Where(x => x.VoucherType == type.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(x => x.VoucherDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(x => x.VoucherDate <= endOfDay);
        }

        return await query
            .OrderByDescending(x => x.VoucherDate)
            .ThenByDescending(x => x.VoucherNumber)
            .ToListAsync(cancellationToken);
    }

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, SemaphoreSlim> _voucherNumberLocks = new();

    public async Task<string> GenerateNextVoucherNumberAsync(
        Guid companyId,
        VoucherType type,
        int year,
        CancellationToken cancellationToken = default)
    {
        var prefix = type == VoucherType.Receipt ? "RV" : "PV";
        var searchPrefix = $"{prefix}-{year}-";
        var lockKey = $"{companyId:N}_{type}_{year}";
        var semaphore = _voucherNumberLocks.GetOrAdd(lockKey, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        try
        {
            if (_dbContext.Database.IsSqlServer() && _dbContext.Database.CurrentTransaction != null)
            {
                var lockResource = $"VOUCH_NUM_{companyId:N}_{prefix}_{year}";
                await _dbContext.Database.ExecuteSqlRawAsync(
                    "EXEC sp_getapplock @Resource = {0}, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;",
                    new object[] { lockResource },
                    cancellationToken);
            }

            var lastNumber = await _dbContext.Vouchers
                .Where(x => x.CompanyId == companyId && x.VoucherNumber.StartsWith(searchPrefix))
                .OrderByDescending(x => x.VoucherNumber)
                .Select(x => x.VoucherNumber)
                .FirstOrDefaultAsync(cancellationToken);

            int maxSeq = 0;
            if (!string.IsNullOrEmpty(lastNumber))
            {
                var parts = lastNumber.Split('-');
                if (parts.Length >= 3 && int.TryParse(parts[2], out var currentSeq))
                {
                    maxSeq = currentSeq;
                }
            }

            return $"{searchPrefix}{(maxSeq + 1):D5}";
        }
        finally
        {
            semaphore.Release();
        }
    }

    public async Task AddAsync(Voucher voucher, CancellationToken cancellationToken = default)
    {
        await _dbContext.Vouchers.AddAsync(voucher, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
