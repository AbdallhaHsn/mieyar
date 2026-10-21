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
            entity.Property(e => e.SubTotal).HasPrecision(18, 4);
            entity.Property(e => e.TotalDiscount).HasPrecision(18, 4);
            entity.Property(e => e.TotalTaxableAmount).HasPrecision(18, 4);
            entity.Property(e => e.TotalVat).HasPrecision(18, 4);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 4);

            entity.HasMany(e => e.Lines)
                  .WithOne(l => l.Invoice)
                  .HasForeignKey(l => l.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvoiceLine>(entity =>
        {
            entity.ToTable("InvoiceLines");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ItemNameAr).IsRequired().HasMaxLength(250);
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 4);
            entity.Property(e => e.SubTotal).HasPrecision(18, 4);
            entity.Property(e => e.Discount).HasPrecision(18, 4);
            entity.Property(e => e.TaxableAmount).HasPrecision(18, 4);
            entity.Property(e => e.VatRate).HasPrecision(18, 4);
            entity.Property(e => e.VatAmount).HasPrecision(18, 4);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 4);
        });

        base.OnModelCreating(modelBuilder);
    }
}
