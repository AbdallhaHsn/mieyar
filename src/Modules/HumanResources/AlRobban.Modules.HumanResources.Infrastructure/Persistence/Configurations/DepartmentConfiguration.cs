using AlRobban.Modules.HumanResources.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.HumanResources.Infrastructure.Persistence.Configurations;

public class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.ToTable("Departments");

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
            .HasMaxLength(150);

        builder.Property(x => x.NameEn)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.ManagerName)
            .HasMaxLength(100);

        builder.Property(x => x.CreatedBy)
            .HasMaxLength(100);

        builder.Property(x => x.LastModifiedBy)
            .HasMaxLength(100);
    }
}
