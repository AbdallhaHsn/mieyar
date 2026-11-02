using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Modules.HumanResources.Infrastructure.Persistence;
using AlRobban.Modules.HumanResources.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlRobban.Modules.HumanResources.Infrastructure.Extensions;

public static class HumanResourcesServiceCollectionExtensions
{
    public static IServiceCollection AddHumanResourcesModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var dbProvider = configuration["Database:Provider"] ?? "SqlServer";
        var isPostgres = dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase);

        var connectionString = isPostgres
            ? configuration.GetConnectionString("PostgreSqlConnection")
            : configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<HumanResourcesDbContext>(options =>
        {
            if (isPostgres)
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "hr");
                });
            }
            else
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "hr");
                });
            }
        });

        // Repositories
        services.AddScoped<IEmployeeRepository, EmployeeRepository>();
        services.AddScoped<IPayrollPeriodRepository, PayrollPeriodRepository>();
        services.AddScoped<IDepartmentRepository, DepartmentRepository>();

        // MediatR registration for HumanResources Application assembly
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(AlRobban.Modules.HumanResources.Application.DTOs.EmployeeDto).Assembly);
        });

        return services;
    }
}
