using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class InventoryTransactionConfiguration : IEntityTypeConfiguration<InventoryTransaction>
{
    public void Configure(EntityTypeBuilder<InventoryTransaction> builder)
    {
        builder.ToTable("InventoryTransactions", "pur");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.QuantityIn)
            .HasPrecision(18, 4);

        builder.Property(x => x.QuantityOut)
            .HasPrecision(18, 4);

        builder.Property(x => x.UnitCost)
            .HasPrecision(18, 4);

        builder.Property(x => x.TotalCost)
            .HasPrecision(18, 4);

        builder.Property(x => x.BalanceAfterQuantity)
            .HasPrecision(18, 4);

        builder.Property(x => x.ReferenceType)
            .HasMaxLength(50);

        builder.Property(x => x.ReferenceNumber)
            .HasMaxLength(50);

        builder.Property(x => x.Notes)
            .HasMaxLength(500);

        builder.Property(x => x.WarehouseCode)
            .HasMaxLength(50);

        builder.HasOne(x => x.Item)
            .WithMany()
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.CompanyId, x.ItemId });
        builder.HasIndex(x => new { x.CompanyId, x.WarehouseId });
        builder.HasIndex(x => new { x.CompanyId, x.TransactionDate });
    }
}
