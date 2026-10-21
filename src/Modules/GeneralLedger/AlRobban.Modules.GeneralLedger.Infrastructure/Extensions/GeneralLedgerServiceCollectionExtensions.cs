using AlRobban.Modules.GeneralLedger.Application.Queries.GetAccountsTree;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using AlRobban.Modules.GeneralLedger.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Extensions;

public static class GeneralLedgerServiceCollectionExtensions
{
    public static IServiceCollection AddGeneralLedgerModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var dbProvider = configuration["Database:Provider"] ?? "SqlServer";
        var isPostgres = dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase);

        var connectionString = isPostgres
            ? configuration.GetConnectionString("PostgreSqlConnection")
            : configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<GeneralLedgerDbContext>(options =>
        {
            if (isPostgres)
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "gl");
                });
            }
            else
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "gl");
                });
            }
        });

        // Repositories
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<IFinancialSettingsRepository, FinancialSettingsRepository>();
        services.AddScoped<IJournalEntryRepository, JournalEntryRepository>();
        services.AddScoped<IVoucherRepository, VoucherRepository>();
        services.AddScoped<IBankReconciliationRepository, BankReconciliationRepository>();
        services.AddScoped<IFixedAssetRepository, FixedAssetRepository>();
        services.AddScoped<IRecurringJournalEntryRepository, RecurringJournalEntryRepository>();
        services.AddScoped<IPostDatedCheckRepository, PostDatedCheckRepository>();
        services.AddScoped<IBusinessPartnerRepository, BusinessPartnerRepository>();
        services.AddScoped<ICurrencyRateRepository, CurrencyRateRepository>();

        // MediatR registration for GeneralLedger Application assembly
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(GetAccountsTreeQuery).Assembly);
        });

        return services;
    }
}
