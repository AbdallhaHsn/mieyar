using AlRobban.Modules.DocumentManagement.Application.Repositories;
using AlRobban.Modules.DocumentManagement.Infrastructure.Persistence;
using AlRobban.Modules.DocumentManagement.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlRobban.Modules.DocumentManagement.Infrastructure.Extensions;

public static class DocumentManagementServiceCollectionExtensions
{
    public static IServiceCollection AddDocumentManagementModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<DocumentManagementDbContext>(options =>
        {
            options.UseSqlServer(connectionString);
        });

        services.AddScoped<IDocumentRepository, DocumentRepository>();

        // Register MediatR handlers from Application assembly
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(AlRobban.Modules.DocumentManagement.Application.Entities.DocumentAttachment).Assembly);
        });

        return services;
    }
}
