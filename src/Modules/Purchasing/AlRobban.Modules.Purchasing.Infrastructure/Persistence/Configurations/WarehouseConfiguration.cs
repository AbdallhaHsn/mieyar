using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class WarehouseConfiguration : IEntityTypeConfiguration<Warehouse>
{
    public void Configure(EntityTypeBuilder<Warehouse> builder)
    {
        builder.ToTable("Warehouses");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TenantId)
            .IsRequired();

        builder.Property(x => x.CompanyId)
            .IsRequired();

        builder.Property(x => x.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.Code })
            .IsUnique();

        builder.Property(x => x.NameAr)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.NameEn)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.BranchName)
            .HasMaxLength(200);

        builder.Property(x => x.Location)
            .HasMaxLength(200);

        builder.Property(x => x.ManagerName)
            .HasMaxLength(100);

        builder.Property(x => x.ManagerPhone)
            .HasMaxLength(50);
    }
}
