using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class PurchaseInvoiceLineConfiguration : IEntityTypeConfiguration<PurchaseInvoiceLine>
{
    public void Configure(EntityTypeBuilder<PurchaseInvoiceLine> builder)
    {
        builder.ToTable("PurchaseInvoiceLines", "pur");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ItemNameAr)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.ItemNameEn)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.Quantity)
            .HasPrecision(18, 4);

        builder.Property(x => x.UnitPrice)
            .HasPrecision(18, 4);

        builder.Property(x => x.SubTotal)
            .HasPrecision(18, 4);

        builder.Property(x => x.DiscountAmount)
            .HasPrecision(18, 4);

        builder.Property(x => x.TaxableAmount)
            .HasPrecision(18, 4);

        builder.Property(x => x.VatRate)
            .HasPrecision(5, 2);

        builder.Property(x => x.VatAmount)
            .HasPrecision(18, 4);

        builder.Property(x => x.TotalAmount)
            .HasPrecision(18, 4);

        builder.HasOne(x => x.Item)
            .WithMany()
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
