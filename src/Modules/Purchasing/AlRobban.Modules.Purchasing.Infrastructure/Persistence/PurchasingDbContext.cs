using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence;

public class PurchasingDbContext : AppDbContextBase
{
    public DbSet<Item> Items => Set<Item>();
    public DbSet<PurchaseInvoice> PurchaseInvoices => Set<PurchaseInvoice>();
    public DbSet<PurchaseInvoiceLine> PurchaseInvoiceLines => Set<PurchaseInvoiceLine>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();

    public DbSet<PurchaseRequisition> PurchaseRequisitions => Set<PurchaseRequisition>();
    public DbSet<PurchaseRequisitionLine> PurchaseRequisitionLines => Set<PurchaseRequisitionLine>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLine> PurchaseOrderLines => Set<PurchaseOrderLine>();
    public DbSet<GoodsReceiptNote> GoodsReceiptNotes => Set<GoodsReceiptNote>();
    public DbSet<GoodsReceiptNoteLine> GoodsReceiptNoteLines => Set<GoodsReceiptNoteLine>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<ItemWarehouseStock> ItemWarehouseStocks => Set<ItemWarehouseStock>();
    public DbSet<WarehouseAccountMapping> WarehouseAccountMappings => Set<WarehouseAccountMapping>();
    public DbSet<ItemCategory> ItemCategories => Set<ItemCategory>();

    public PurchasingDbContext(
        DbContextOptions<PurchasingDbContext> options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options, tenantContext, mediator)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PurchasingDbContext).Assembly);
        modelBuilder.Entity<ItemCategory>(b =>
        {
            b.ToTable("ItemCategories", "pur");
            b.HasKey(c => c.Id);
            b.Property(c => c.Code).HasMaxLength(50).IsRequired();
            b.Property(c => c.NameAr).HasMaxLength(200).IsRequired();
            b.Property(c => c.NameEn).HasMaxLength(200);
            b.Property(c => c.Description).HasMaxLength(500);
            b.Property(c => c.Color).HasMaxLength(50);
            b.Property(c => c.Icon).HasMaxLength(100);
            b.HasIndex(c => new { c.CompanyId, c.Code });
        });
        base.OnModelCreating(modelBuilder);
    }
}
