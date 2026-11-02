using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class ItemWarehouseStockConfiguration : IEntityTypeConfiguration<ItemWarehouseStock>
{
    public void Configure(EntityTypeBuilder<ItemWarehouseStock> builder)
    {
        builder.ToTable("ItemWarehouseStocks", "pur");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.WarehouseCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Quantity)
            .HasPrecision(18, 4);

        builder.Property(x => x.MinStockLevel)
            .HasPrecision(18, 4);

        builder.Property(x => x.MaxStockLevel)
            .HasPrecision(18, 4);

        builder.Property(x => x.BinLocation)
            .HasMaxLength(100);

        builder.HasOne(x => x.Item)
            .WithMany()
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Warehouse)
            .WithMany()
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.CompanyId, x.WarehouseId, x.ItemId })
            .IsUnique();

        builder.HasIndex(x => new { x.CompanyId, x.ItemId });
    }
}
