using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence.Configurations;

public class CompanyRoleConfiguration : IEntityTypeConfiguration<CompanyRole>
{
    public void Configure(EntityTypeBuilder<CompanyRole> builder)
    {
        builder.ToTable("CompanyRoles");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TenantId)
            .IsRequired();

        builder.Property(x => x.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(x => new { x.TenantId, x.Code })
            .IsUnique();

        builder.Property(x => x.NameAr)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.NameEn)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.DescriptionAr)
            .HasMaxLength(250);

        builder.Property(x => x.DescriptionEn)
            .HasMaxLength(250);

        builder.Property(x => x.IsSystemRole)
            .IsRequired();

        builder.Property(x => x.PermissionsJson)
            .IsRequired();
    }
}
