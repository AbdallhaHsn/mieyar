using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class ItemConfiguration : IEntityTypeConfiguration<Item>
{
    public void Configure(EntityTypeBuilder<Item> builder)
    {
        builder.ToTable("Items", "pur");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ItemCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Barcode)
            .HasMaxLength(100);

        builder.Property(x => x.NameAr)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.NameEn)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.UnitOfMeasure)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.PurchasePrice)
            .HasPrecision(18, 4);

        builder.Property(x => x.SalePrice)
            .HasPrecision(18, 4);

        builder.Property(x => x.CostPrice)
            .HasPrecision(18, 4);

        builder.Property(x => x.CurrentStockQuantity)
            .HasPrecision(18, 4);

        builder.Property(x => x.MinStockLevel)
            .HasPrecision(18, 4);

        builder.HasIndex(x => new { x.CompanyId, x.ItemCode })
            .IsUnique();

        builder.HasIndex(x => new { x.CompanyId, x.Barcode })
            .IsUnique()
            .HasFilter("[Barcode] IS NOT NULL");
    }
}
