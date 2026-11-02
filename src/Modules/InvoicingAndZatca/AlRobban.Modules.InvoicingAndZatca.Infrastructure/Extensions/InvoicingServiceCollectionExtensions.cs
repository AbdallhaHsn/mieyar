using AlRobban.Modules.InvoicingAndZatca.Application.Commands;
using AlRobban.Modules.InvoicingAndZatca.Application.Services;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlRobban.Modules.InvoicingAndZatca.Infrastructure.Extensions;

public static class InvoicingServiceCollectionExtensions
{
    public static IServiceCollection AddInvoicingAndZatcaModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var dbProvider = configuration["Database:Provider"] ?? "SqlServer";
        var isPostgres = dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase);

        var connectionString = isPostgres
            ? configuration.GetConnectionString("PostgreSqlConnection")
            : configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<InvoicingDbContext>(options =>
        {
            if (isPostgres)
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "inv");
                });
            }
            else
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "inv");
                });
            }
        });

        // Repositories & Services
        services.AddScoped<IInvoiceRepository, InvoiceRepository>();
        services.AddScoped<ISalespersonRepository, SalespersonRepository>();
        services.AddScoped<IPosShiftRepository, PosShiftRepository>();
        services.AddSingleton<IInvoiceCryptoService, InvoiceCryptoService>();
        services.AddScoped<IZatcaOnboardingService, ZatcaOnboardingService>();

        // MediatR for Invoicing Application Assembly
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(CreateInvoiceCommand).Assembly);
        });

        return services;
    }
}
