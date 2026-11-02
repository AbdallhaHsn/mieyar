using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class PurchaseInvoiceConfiguration : IEntityTypeConfiguration<PurchaseInvoice>
{
    public void Configure(EntityTypeBuilder<PurchaseInvoice> builder)
    {
        builder.ToTable("PurchaseInvoices", "pur");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.InvoiceNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.VendorInvoiceNumber)
            .HasMaxLength(100);

        builder.Property(x => x.VendorName)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.VendorVatNumber)
            .HasMaxLength(50);

        builder.Property(x => x.VendorCrNumber)
            .HasMaxLength(50);

        builder.Property(x => x.Currency)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(x => x.ExchangeRateToSar)
            .HasPrecision(18, 4);

        builder.Property(x => x.SubTotal)
            .HasPrecision(18, 4);

        builder.Property(x => x.TotalDiscount)
            .HasPrecision(18, 4);

        builder.Property(x => x.TotalTaxableAmount)
            .HasPrecision(18, 4);

        builder.Property(x => x.TotalVat)
            .HasPrecision(18, 4);

        builder.Property(x => x.TotalAmount)
            .HasPrecision(18, 4);

        builder.Property(x => x.PaidAmount)
            .HasPrecision(18, 4);

        builder.Property(x => x.AssociatedJournalEntryNumber)
            .HasMaxLength(50);

        builder.Property(x => x.PurchaseOrderNumber)
            .HasMaxLength(50);

        builder.Property(x => x.GoodsReceiptNoteNumber)
            .HasMaxLength(50);

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.HasMany(x => x.Lines)
            .WithOne(x => x.PurchaseInvoice)
            .HasForeignKey(x => x.PurchaseInvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.CompanyId, x.InvoiceNumber })
            .IsUnique();

        builder.HasIndex(x => new { x.CompanyId, x.VendorId });
        builder.HasIndex(x => new { x.CompanyId, x.IssueDate });
    }
}
