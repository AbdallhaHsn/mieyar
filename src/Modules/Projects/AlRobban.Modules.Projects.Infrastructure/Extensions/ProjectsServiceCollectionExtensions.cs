using AlRobban.Modules.Projects.Domain.Repositories;
using AlRobban.Modules.Projects.Infrastructure.Persistence;
using AlRobban.Modules.Projects.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlRobban.Modules.Projects.Infrastructure.Extensions;

public static class ProjectsServiceCollectionExtensions
{
    public static IServiceCollection AddProjectsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var dbProvider = configuration["Database:Provider"] ?? "SqlServer";
        var isPostgres = dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase);

        var connectionString = isPostgres
            ? configuration.GetConnectionString("PostgreSqlConnection")
            : configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<ProjectsDbContext>(options =>
        {
            if (isPostgres)
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "proj");
                });
            }
            else
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "proj");
                });
            }
        });

        // Repositories
        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<IProgressBillingRepository, ProgressBillingRepository>();
        services.AddScoped<ILetterOfGuaranteeRepository, LetterOfGuaranteeRepository>();

        // MediatR registration for Projects Application assembly
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(AlRobban.Modules.Projects.Application.DTOs.ProjectDto).Assembly);
        });

        return services;
    }
}
