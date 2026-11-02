using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class GoodsReceiptNoteConfiguration : IEntityTypeConfiguration<GoodsReceiptNote>
{
    public void Configure(EntityTypeBuilder<GoodsReceiptNote> builder)
    {
        builder.ToTable("GoodsReceiptNotes", "pur");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ReceiptNumber).IsRequired().HasMaxLength(50);
        builder.Property(x => x.PurchaseOrderNumber).HasMaxLength(50);
        builder.Property(x => x.VendorName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.DeliveryNoteNumber).HasMaxLength(100);
        builder.Property(x => x.WarehouseCode).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ReceiverName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.InspectorName).HasMaxLength(150);
        builder.Property(x => x.AssociatedJournalEntryNumber).HasMaxLength(50);
        builder.Property(x => x.TotalReceivedValue).HasPrecision(18, 4);

        builder.HasMany(x => x.Lines)
            .WithOne()
            .HasForeignKey(x => x.GoodsReceiptNoteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class GoodsReceiptNoteLineConfiguration : IEntityTypeConfiguration<GoodsReceiptNoteLine>
{
    public void Configure(EntityTypeBuilder<GoodsReceiptNoteLine> builder)
    {
        builder.ToTable("GoodsReceiptNoteLines", "pur");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ItemCode).HasMaxLength(50);
        builder.Property(x => x.ItemNameAr).IsRequired().HasMaxLength(250);
        builder.Property(x => x.ItemNameEn).HasMaxLength(250);
        builder.Property(x => x.UnitOfMeasure).HasMaxLength(50);
        builder.Property(x => x.WarehouseCode).HasMaxLength(50);
        builder.Property(x => x.RejectionReason).HasMaxLength(250);

        builder.Property(x => x.QuantityOrdered).HasPrecision(18, 4);
        builder.Property(x => x.QuantityReceived).HasPrecision(18, 4);
        builder.Property(x => x.QuantityAccepted).HasPrecision(18, 4);
        builder.Property(x => x.QuantityRejected).HasPrecision(18, 4);
        builder.Property(x => x.UnitCost).HasPrecision(18, 4);
    }
}
