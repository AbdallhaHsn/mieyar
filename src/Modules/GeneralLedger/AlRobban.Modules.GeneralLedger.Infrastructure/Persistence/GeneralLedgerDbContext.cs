using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;

public class GeneralLedgerDbContext : AppDbContextBase
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<FiscalYear> FiscalYears => Set<FiscalYear>();
    public DbSet<FiscalPeriod> FiscalPeriods => Set<FiscalPeriod>();
    public DbSet<CostCenter> CostCenters => Set<CostCenter>();
    public DbSet<CompanyFinancialSettings> FinancialSettings => Set<CompanyFinancialSettings>();
    public DbSet<FinancialStatementSettings> StatementSettings => Set<FinancialStatementSettings>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryLine> JournalEntryLines => Set<JournalEntryLine>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<VoucherLine> VoucherLines => Set<VoucherLine>();
    public DbSet<BankReconciliation> BankReconciliations => Set<BankReconciliation>();
    public DbSet<BankReconciliationItem> BankReconciliationItems => Set<BankReconciliationItem>();
    public DbSet<FixedAsset> FixedAssets => Set<FixedAsset>();
    public DbSet<AssetDepreciationHistory> AssetDepreciationHistories => Set<AssetDepreciationHistory>();
    public DbSet<RecurringJournalEntry> RecurringJournalEntries => Set<RecurringJournalEntry>();
    public DbSet<RecurringJournalEntryLine> RecurringJournalEntryLines => Set<RecurringJournalEntryLine>();
    public DbSet<PostDatedCheck> PostDatedChecks => Set<PostDatedCheck>();
    public DbSet<BusinessPartner> BusinessPartners => Set<BusinessPartner>();
    public DbSet<CurrencyRate> CurrencyRates => Set<CurrencyRate>();

    public GeneralLedgerDbContext(
        DbContextOptions<GeneralLedgerDbContext> options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options, tenantContext, mediator)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(GeneralLedgerDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
