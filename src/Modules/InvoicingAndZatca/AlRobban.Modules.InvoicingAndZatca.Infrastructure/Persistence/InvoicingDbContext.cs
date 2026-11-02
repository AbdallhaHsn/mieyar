using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence;

public class InvoicingDbContext : AppDbContextBase
{
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<Salesperson> Salespersons => Set<Salesperson>();
    public DbSet<PosShift> PosShifts => Set<PosShift>();
    public DbSet<PosCashMovement> PosCashMovements => Set<PosCashMovement>();
    public DbSet<ZatcaDeviceConfig> ZatcaDeviceConfigs => Set<ZatcaDeviceConfig>();

    public InvoicingDbContext(
        DbContextOptions<InvoicingDbContext> options,
        ICurrentTenantContext tenantContext,
        IMediator mediator) : base(options, tenantContext, mediator)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("inv");

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("Invoices");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.InvoiceNumber).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => new { e.CompanyId, e.InvoiceNumber }).IsUnique();
            entity.Property(e => e.CustomerName).IsRequired().HasMaxLength(250);
            entity.Property(e => e.CustomerVatNumber).HasMaxLength(50);
            entity.Property(e => e.SalespersonName).HasMaxLength(250);
            entity.Property(e => e.WarehouseCode).HasMaxLength(50);
            entity.Property(e => e.SubTotal).HasPrecision(18, 4);
            entity.Property(e => e.TotalDiscount).HasPrecision(18, 4);
            entity.Property(e => e.TotalTaxableAmount).HasPrecision(18, 4);
            entity.Property(e => e.TotalVat).HasPrecision(18, 4);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 4);

            entity.HasMany(e => e.Lines)
                  .WithOne(l => l.Invoice)
                  .HasForeignKey(l => l.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.PosTerminalCode).HasMaxLength(50);
            entity.Property(e => e.CashReceived).HasPrecision(18, 4);
            entity.Property(e => e.ChangeGiven).HasPrecision(18, 4);
            entity.Property(e => e.PaidAmount).HasPrecision(18, 4);
        });

        modelBuilder.Entity<InvoiceLine>(entity =>
        {
            entity.ToTable("InvoiceLines");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ItemNameAr).IsRequired().HasMaxLength(250);
            entity.Property(e => e.WarehouseCode).HasMaxLength(50);
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 4);
            entity.Property(e => e.SubTotal).HasPrecision(18, 4);
            entity.Property(e => e.Discount).HasPrecision(18, 4);
            entity.Property(e => e.TaxableAmount).HasPrecision(18, 4);
            entity.Property(e => e.VatRate).HasPrecision(18, 4);
            entity.Property(e => e.VatAmount).HasPrecision(18, 4);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 4);
        });

        modelBuilder.Entity<Salesperson>(entity =>
        {
            entity.ToTable("Salespersons");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => new { e.CompanyId, e.Code }).IsUnique();
            entity.Property(e => e.NameAr).IsRequired().HasMaxLength(250);
            entity.Property(e => e.NameEn).IsRequired().HasMaxLength(250);
            entity.Property(e => e.WarehouseCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.WarehouseNameAr).IsRequired().HasMaxLength(250);
            entity.Property(e => e.PhoneNumber).HasMaxLength(50);
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.UserName).HasMaxLength(100);
            entity.Property(e => e.CommissionRate).HasPrecision(18, 4);
            entity.Property(e => e.MaxDiscountPercent).HasPrecision(18, 2);
        });

        modelBuilder.Entity<PosShift>(entity =>
        {
            entity.ToTable("PosShifts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ShiftNumber).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => new { e.CompanyId, e.ShiftNumber }).IsUnique();
            entity.Property(e => e.CashierUserId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CashierName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.TerminalCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.BranchName).HasMaxLength(150);
            entity.Property(e => e.WarehouseCode).HasMaxLength(50);
            entity.Property(e => e.WarehouseName).HasMaxLength(150);
            entity.Property(e => e.OpeningFloatCash).HasPrecision(18, 4);
            entity.Property(e => e.TotalCashSales).HasPrecision(18, 4);
            entity.Property(e => e.TotalMadaSales).HasPrecision(18, 4);
            entity.Property(e => e.TotalCreditCardSales).HasPrecision(18, 4);
            entity.Property(e => e.TotalTaxAmount).HasPrecision(18, 4);
            entity.Property(e => e.TotalCashIn).HasPrecision(18, 4);
            entity.Property(e => e.TotalCashOut).HasPrecision(18, 4);
            entity.Property(e => e.ActualClosingCash).HasPrecision(18, 4);
            entity.Property(e => e.VarianceAmount).HasPrecision(18, 4);
            entity.Property(e => e.JournalEntryNumber).HasMaxLength(50);
            entity.Property(e => e.ClosingNotes).HasMaxLength(500);

            entity.HasMany(e => e.CashMovements)
                  .WithOne()
                  .HasForeignKey(m => m.PosShiftId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PosCashMovement>(entity =>
        {
            entity.ToTable("PosCashMovements");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 4);
            entity.Property(e => e.ReasonAr).IsRequired().HasMaxLength(250);
            entity.Property(e => e.ReasonEn).HasMaxLength(250);
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
        });

        modelBuilder.Entity<ZatcaDeviceConfig>(entity =>
        {
            entity.ToTable("ZatcaDeviceConfigs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DeviceUuid).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => new { e.CompanyId, e.DeviceUuid }).IsUnique();
            entity.Property(e => e.DeviceName).IsRequired().HasMaxLength(250);
            entity.Property(e => e.Environment).IsRequired().HasMaxLength(50);
            entity.Property(e => e.OrganizationName).IsRequired().HasMaxLength(250);
            entity.Property(e => e.OrganizationVatNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CommonName).IsRequired().HasMaxLength(250);
            entity.Property(e => e.Location).HasMaxLength(250);
            entity.Property(e => e.Industry).HasMaxLength(250);
            entity.Property(e => e.InvoiceType).HasMaxLength(50);
            entity.Property(e => e.Otp).HasMaxLength(20);
            entity.Property(e => e.ComplianceRequestId).HasMaxLength(100);
            entity.Property(e => e.ProductionRequestId).HasMaxLength(100);
            entity.Property(e => e.Status).HasMaxLength(50);
        });

        base.OnModelCreating(modelBuilder);
    }
}
