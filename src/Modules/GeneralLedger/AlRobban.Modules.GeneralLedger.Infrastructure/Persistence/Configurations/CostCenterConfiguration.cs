using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class CostCenterConfiguration : IEntityTypeConfiguration<CostCenter>
{
    public void Configure(EntityTypeBuilder<CostCenter> builder)
    {
        builder.ToTable("CostCenters", "gl");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.Code })
            .IsUnique();

        builder.Property(x => x.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.NameAr)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.NameEn)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Description)
            .HasMaxLength(500);

        builder.HasOne(x => x.ParentCostCenter)
            .WithMany(x => x.SubCostCenters)
            .HasForeignKey(x => x.ParentCostCenterId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
