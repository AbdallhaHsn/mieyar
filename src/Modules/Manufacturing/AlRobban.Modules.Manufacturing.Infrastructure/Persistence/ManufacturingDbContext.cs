using AlRobban.Modules.Manufacturing.Domain.Entities;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.Manufacturing.Infrastructure.Persistence;

public class ManufacturingDbContext : AppDbContextBase
{
    public DbSet<BillOfMaterials> BillOfMaterials => Set<BillOfMaterials>();
    public DbSet<BomComponent> BomComponents => Set<BomComponent>();
    public DbSet<BomOperation> BomOperations => Set<BomOperation>();
    public DbSet<Workstation> Workstations => Set<Workstation>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<WorkOrderComponentConsumption> WorkOrderComponentConsumptions => Set<WorkOrderComponentConsumption>();
    public DbSet<RawMaterial> RawMaterials => Set<RawMaterial>();

    public ManufacturingDbContext(
        DbContextOptions<ManufacturingDbContext> options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options, tenantContext, mediator)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("mfg");

        // Bill of Materials
        modelBuilder.Entity<BillOfMaterials>(b =>
        {
            b.ToTable("BillOfMaterials");
            b.HasKey(x => x.Id);
            b.Property(x => x.Code).HasMaxLength(50).IsRequired();
            b.Property(x => x.NameAr).HasMaxLength(250).IsRequired();
            b.Property(x => x.NameEn).HasMaxLength(250);
            b.Property(x => x.FinishedProductId).HasMaxLength(100);
            b.Property(x => x.FinishedProductCode).HasMaxLength(50);
            b.Property(x => x.FinishedProductNameAr).HasMaxLength(250);
            b.Property(x => x.FinishedProductNameEn).HasMaxLength(250);
            b.Property(x => x.UnitOfMeasure).HasMaxLength(50);
            b.Property(x => x.RawMaterialsWarehouseName).HasMaxLength(150);
            b.Property(x => x.FinishedGoodsWarehouseName).HasMaxLength(150);
            b.Property(x => x.Version).HasMaxLength(20);

            b.Property(x => x.OutputQuantity).HasPrecision(18, 4);
            b.Property(x => x.TotalMaterialCost).HasPrecision(18, 2);
            b.Property(x => x.TotalLaborCost).HasPrecision(18, 2);
            b.Property(x => x.TotalOverheadCost).HasPrecision(18, 2);
            b.Property(x => x.TotalUnitCost).HasPrecision(18, 2);

            b.HasMany(x => x.Components)
                .WithOne()
                .HasForeignKey(c => c.BomId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasMany(x => x.Operations)
                .WithOne()
                .HasForeignKey(o => o.BomId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(x => new { x.CompanyId, x.Code });
        });

        // BOM Components
        modelBuilder.Entity<BomComponent>(b =>
        {
            b.ToTable("BomComponents");
            b.HasKey(x => x.Id);
            b.Property(x => x.ItemCode).HasMaxLength(50);
            b.Property(x => x.ItemNameAr).HasMaxLength(250).IsRequired();
            b.Property(x => x.ItemNameEn).HasMaxLength(250);
            b.Property(x => x.UnitOfMeasure).HasMaxLength(50);
            b.Property(x => x.QuantityRequired).HasPrecision(18, 4);
            b.Property(x => x.ScrapPercentage).HasPrecision(6, 2);
            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.TotalCost).HasPrecision(18, 2);

            b.HasIndex(x => new { x.CompanyId, x.BomId });
        });

        // BOM Operations
        modelBuilder.Entity<BomOperation>(b =>
        {
            b.ToTable("BomOperations");
            b.HasKey(x => x.Id);
            b.Property(x => x.OperationNameAr).HasMaxLength(250).IsRequired();
            b.Property(x => x.OperationNameEn).HasMaxLength(250);
            b.Property(x => x.WorkstationName).HasMaxLength(150);
            b.Property(x => x.StandardTimeMinutes).HasPrecision(18, 2);
            b.Property(x => x.HourlyLaborRate).HasPrecision(18, 2);
            b.Property(x => x.HourlyOverheadRate).HasPrecision(18, 2);
            b.Property(x => x.TotalOperationCost).HasPrecision(18, 2);

            b.HasIndex(x => new { x.CompanyId, x.BomId });
        });

        // Workstations
        modelBuilder.Entity<Workstation>(b =>
        {
            b.ToTable("Workstations");
            b.HasKey(x => x.Id);
            b.Property(x => x.Code).HasMaxLength(50).IsRequired();
            b.Property(x => x.NameAr).HasMaxLength(250).IsRequired();
            b.Property(x => x.NameEn).HasMaxLength(250);
            b.Property(x => x.Location).HasMaxLength(250);
            b.Property(x => x.HourlyCost).HasPrecision(18, 2);
            b.Property(x => x.CapacityPerDayHours).HasPrecision(18, 2);
            b.Property(x => x.EfficiencyPercentage).HasPrecision(6, 2);

            b.HasIndex(x => new { x.CompanyId, x.Code });
        });

        // Work Orders
        modelBuilder.Entity<WorkOrder>(b =>
        {
            b.ToTable("WorkOrders");
            b.HasKey(x => x.Id);
            b.Property(x => x.WorkOrderNumber).HasMaxLength(50).IsRequired();
            b.Property(x => x.BomCode).HasMaxLength(50);
            b.Property(x => x.FinishedProductId).HasMaxLength(100);
            b.Property(x => x.FinishedProductCode).HasMaxLength(50);
            b.Property(x => x.FinishedProductNameAr).HasMaxLength(250);
            b.Property(x => x.FinishedProductNameEn).HasMaxLength(250);
            b.Property(x => x.UnitOfMeasure).HasMaxLength(50);
            b.Property(x => x.AssignedSupervisor).HasMaxLength(150);
            b.Property(x => x.AssignedWorkstation).HasMaxLength(150);
            b.Property(x => x.RawMaterialsWarehouseName).HasMaxLength(150);
            b.Property(x => x.FinishedGoodsWarehouseName).HasMaxLength(150);

            b.Property(x => x.PlannedQuantity).HasPrecision(18, 4);
            b.Property(x => x.CompletedQuantity).HasPrecision(18, 4);
            b.Property(x => x.RejectedQuantity).HasPrecision(18, 4);

            b.Property(x => x.EstimatedTotalCost).HasPrecision(18, 2);
            b.Property(x => x.ActualMaterialCost).HasPrecision(18, 2);
            b.Property(x => x.ActualLaborCost).HasPrecision(18, 2);
            b.Property(x => x.ActualOverheadCost).HasPrecision(18, 2);
            b.Property(x => x.TotalActualCost).HasPrecision(18, 2);
            b.Property(x => x.UnitActualCost).HasPrecision(18, 2);

            b.HasMany(x => x.ComponentsConsumed)
                .WithOne()
                .HasForeignKey(c => c.WorkOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(x => new { x.CompanyId, x.WorkOrderNumber });
        });

        // Work Order Component Consumptions
        modelBuilder.Entity<WorkOrderComponentConsumption>(b =>
        {
            b.ToTable("WorkOrderComponentConsumptions");
            b.HasKey(x => x.Id);
            b.Property(x => x.ItemCode).HasMaxLength(50);
            b.Property(x => x.ItemNameAr).HasMaxLength(250);
            b.Property(x => x.Unit).HasMaxLength(50);
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.Property(x => x.TotalCost).HasPrecision(18, 2);

            b.HasIndex(x => new { x.CompanyId, x.WorkOrderId });
        });

        // Raw Materials
        modelBuilder.Entity<RawMaterial>(b =>
        {
            b.ToTable("RawMaterials");
            b.HasKey(x => x.Id);
            b.Property(x => x.ItemCode).HasMaxLength(50).IsRequired();
            b.Property(x => x.NameAr).HasMaxLength(250).IsRequired();
            b.Property(x => x.NameEn).HasMaxLength(250);
            b.Property(x => x.CategoryAr).HasMaxLength(100);
            b.Property(x => x.CategoryEn).HasMaxLength(100);
            b.Property(x => x.UnitOfMeasure).HasMaxLength(50);
            b.Property(x => x.WarehouseName).HasMaxLength(150);

            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.CurrentStock).HasPrecision(18, 4);
            b.Property(x => x.MinStockLevel).HasPrecision(18, 4);

            b.HasIndex(x => new { x.CompanyId, x.ItemCode });
        });

        base.OnModelCreating(modelBuilder);
    }
}
