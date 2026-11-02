using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class PurchaseRequisitionConfiguration : IEntityTypeConfiguration<PurchaseRequisition>
{
    public void Configure(EntityTypeBuilder<PurchaseRequisition> builder)
    {
        builder.ToTable("PurchaseRequisitions", "pur");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.RequisitionNumber).IsRequired().HasMaxLength(50);
        builder.Property(x => x.Title).IsRequired().HasMaxLength(250);
        builder.Property(x => x.DepartmentName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.RequesterName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.TotalEstimatedAmount).HasPrecision(18, 4);
        builder.Property(x => x.ProjectCode).HasMaxLength(50);
        builder.Property(x => x.ConvertedToPoNumber).HasMaxLength(50);

        builder.HasMany(x => x.Lines)
            .WithOne()
            .HasForeignKey(x => x.RequisitionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PurchaseRequisitionLineConfiguration : IEntityTypeConfiguration<PurchaseRequisitionLine>
{
    public void Configure(EntityTypeBuilder<PurchaseRequisitionLine> builder)
    {
        builder.ToTable("PurchaseRequisitionLines", "pur");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ItemCode).HasMaxLength(50);
        builder.Property(x => x.ItemNameAr).IsRequired().HasMaxLength(250);
        builder.Property(x => x.ItemNameEn).HasMaxLength(250);
        builder.Property(x => x.UnitOfMeasure).HasMaxLength(50);
        builder.Property(x => x.WarehouseCode).HasMaxLength(50);
        builder.Property(x => x.QuantityRequested).HasPrecision(18, 4);
        builder.Property(x => x.EstimatedUnitPrice).HasPrecision(18, 4);
    }
}
