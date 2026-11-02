using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.ToTable("PurchaseOrders", "pur");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.OrderNumber).IsRequired().HasMaxLength(50);
        builder.Property(x => x.VendorName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.VendorVatNumber).HasMaxLength(50);
        builder.Property(x => x.VendorCrNumber).HasMaxLength(50);
        builder.Property(x => x.RequisitionNumber).HasMaxLength(50);
        builder.Property(x => x.PaymentTerms).HasMaxLength(100);
        builder.Property(x => x.Currency).IsRequired().HasMaxLength(10);
        builder.Property(x => x.ExchangeRateToSar).HasPrecision(18, 4);
        builder.Property(x => x.BranchCode).HasMaxLength(50);
        builder.Property(x => x.WarehouseCode).HasMaxLength(50);

        builder.Property(x => x.SubTotal).HasPrecision(18, 4);
        builder.Property(x => x.TotalDiscount).HasPrecision(18, 4);
        builder.Property(x => x.TotalTaxableAmount).HasPrecision(18, 4);
        builder.Property(x => x.TotalVat).HasPrecision(18, 4);
        builder.Property(x => x.TotalAmount).HasPrecision(18, 4);

        builder.HasMany(x => x.Lines)
            .WithOne()
            .HasForeignKey(x => x.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PurchaseOrderLineConfiguration : IEntityTypeConfiguration<PurchaseOrderLine>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderLine> builder)
    {
        builder.ToTable("PurchaseOrderLines", "pur");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ItemCode).HasMaxLength(50);
        builder.Property(x => x.ItemNameAr).IsRequired().HasMaxLength(250);
        builder.Property(x => x.ItemNameEn).HasMaxLength(250);
        builder.Property(x => x.UnitOfMeasure).HasMaxLength(50);
        builder.Property(x => x.WarehouseCode).HasMaxLength(50);

        builder.Property(x => x.QuantityOrdered).HasPrecision(18, 4);
        builder.Property(x => x.QuantityReceived).HasPrecision(18, 4);
        builder.Property(x => x.QuantityBilled).HasPrecision(18, 4);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 4);
        builder.Property(x => x.DiscountAmount).HasPrecision(18, 4);
        builder.Property(x => x.VatRate).HasPrecision(18, 4);
    }
}
