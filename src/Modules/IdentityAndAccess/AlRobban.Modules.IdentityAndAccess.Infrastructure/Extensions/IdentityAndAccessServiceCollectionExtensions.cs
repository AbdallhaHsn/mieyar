using AlRobban.Modules.IdentityAndAccess.Application.Commands.CreateCompany;
using AlRobban.Modules.IdentityAndAccess.Application.Services;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Repositories;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlRobban.Modules.IdentityAndAccess.Infrastructure.Extensions;

public static class IdentityAndAccessServiceCollectionExtensions
{
    public static IServiceCollection AddIdentityAndAccessModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var dbProvider = configuration["Database:Provider"] ?? "SqlServer";
        var isPostgres = dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase);

        var connectionString = isPostgres
            ? configuration.GetConnectionString("PostgreSqlConnection")
            : configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<IdentityAndAccessDbContext>(options =>
        {
            if (isPostgres)
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "identity");
                });
            }
            else
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "identity");
                });
            }
        });

        // Repositories & Security Services
        services.AddScoped<ICompanyRepository, CompanyRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddSingleton<IPasswordHasher, AlRobban.Modules.IdentityAndAccess.Infrastructure.Security.PasswordHasher>();
        services.AddSingleton<IJwtTokenService, AlRobban.Modules.IdentityAndAccess.Infrastructure.Security.JwtTokenService>();

        // MediatR & FluentValidation for this module
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(CreateCompanyCommand).Assembly);
        });
        services.AddValidatorsFromAssembly(typeof(CreateCompanyCommandValidator).Assembly);

        return services;
    }
}
