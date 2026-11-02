using AlRobban.Modules.Manufacturing.Domain.Repositories;
using AlRobban.Modules.Manufacturing.Infrastructure.Persistence;
using AlRobban.Modules.Manufacturing.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlRobban.Modules.Manufacturing.Infrastructure.Extensions;

public static class ManufacturingServiceCollectionExtensions
{
    public static IServiceCollection AddManufacturingModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var dbProvider = configuration["Database:Provider"] ?? "SqlServer";
        var isPostgres = dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase);

        var connectionString = isPostgres
            ? configuration.GetConnectionString("PostgreSqlConnection")
            : configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<ManufacturingDbContext>(options =>
        {
            if (isPostgres)
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "mfg");
                });
            }
            else
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "mfg");
                });
            }
        });

        // Repositories
        services.AddScoped<IBillOfMaterialsRepository, BillOfMaterialsRepository>();
        services.AddScoped<IWorkOrderRepository, WorkOrderRepository>();
        services.AddScoped<IWorkstationRepository, WorkstationRepository>();
        services.AddScoped<IRawMaterialRepository, RawMaterialRepository>();

        // MediatR registration for Manufacturing Application assembly
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(AlRobban.Modules.Manufacturing.Application.DTOs.BillOfMaterialsDto).Assembly);
        });

        return services;
    }
}
