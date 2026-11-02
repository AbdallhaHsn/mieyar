using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using AlRobban.Modules.Purchasing.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlRobban.Modules.Purchasing.Infrastructure.Extensions;

public static class PurchasingServiceCollectionExtensions
{
    public static IServiceCollection AddPurchasingModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var dbProvider = configuration["Database:Provider"] ?? "SqlServer";
        var isPostgres = dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase);

        var connectionString = isPostgres
            ? configuration.GetConnectionString("PostgreSqlConnection")
            : configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<PurchasingDbContext>(options =>
        {
            if (isPostgres)
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "pur");
                });
            }
            else
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "pur");
                });
            }
        });

        // Repositories
        services.AddScoped<IItemRepository, ItemRepository>();
        services.AddScoped<IWarehouseRepository, WarehouseRepository>();
        services.AddScoped<IPurchaseInvoiceRepository, PurchaseInvoiceRepository>();
        services.AddScoped<IInventoryTransactionRepository, InventoryTransactionRepository>();
        services.AddScoped<IItemWarehouseStockRepository, ItemWarehouseStockRepository>();
        services.AddScoped<IPurchaseRequisitionRepository, PurchaseRequisitionRepository>();
        services.AddScoped<IPurchaseOrderRepository, PurchaseOrderRepository>();
        services.AddScoped<IGoodsReceiptNoteRepository, GoodsReceiptNoteRepository>();

        // MediatR registration for Purchasing Application assembly
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(AlRobban.Modules.Purchasing.Application.DTOs.ItemDto).Assembly);
        });

        return services;
    }
}
