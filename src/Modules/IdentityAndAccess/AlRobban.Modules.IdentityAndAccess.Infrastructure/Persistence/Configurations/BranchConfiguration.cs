using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence.Configurations;

public class BranchConfiguration : IEntityTypeConfiguration<Branch>
{
    public void Configure(EntityTypeBuilder<Branch> builder)
    {
        builder.ToTable("Branches");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TenantId)
            .IsRequired();

        builder.Property(x => x.Code)
            .IsRequired()
            .HasMaxLength(20);

        builder.HasIndex(x => new { x.TenantId, x.Code })
            .IsUnique();

        builder.Property(x => x.NameAr)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.NameEn)
            .IsRequired()
            .HasMaxLength(200);

        builder.OwnsOne(x => x.Address, address =>
        {
            address.Property(a => a.StreetName).HasColumnName("StreetName").HasMaxLength(150);
            address.Property(a => a.BuildingNumber).HasColumnName("BuildingNumber").HasMaxLength(10);
            address.Property(a => a.SubDivisionName).HasColumnName("SubDivisionName").HasMaxLength(100);
            address.Property(a => a.CityName).HasColumnName("CityName").HasMaxLength(100);
            address.Property(a => a.PostalZone).HasColumnName("PostalZone").HasMaxLength(10);
            address.Property(a => a.AdditionalNumber).HasColumnName("AdditionalNumber").HasMaxLength(10);
            address.Property(a => a.CountryCode).HasColumnName("CountryCode").HasMaxLength(3).HasDefaultValue("SA");
        });
    }
}
