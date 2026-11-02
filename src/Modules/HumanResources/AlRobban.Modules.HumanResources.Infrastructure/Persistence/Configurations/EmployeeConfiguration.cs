using AlRobban.Modules.HumanResources.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.HumanResources.Infrastructure.Persistence.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("Employees");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TenantId)
            .IsRequired();

        builder.Property(x => x.CompanyId)
            .IsRequired();

        builder.Property(x => x.EmployeeNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.EmployeeNumber })
            .IsUnique();

        builder.Property(x => x.FirstNameAr)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.LastNameAr)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.FullNameAr)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.FirstNameEn)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.LastNameEn)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.FullNameEn)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.NationalIdOrIqama)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.NationalIdOrIqama });

        builder.Property(x => x.Nationality)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.JobTitleAr)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.JobTitleEn)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.DepartmentName)
            .HasMaxLength(150);

        builder.Property(x => x.MobileNumber)
            .HasMaxLength(50);

        builder.Property(x => x.Email)
            .HasMaxLength(150);

        builder.Property(x => x.BankCode)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.BankName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.Iban)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.BasicSalary)
            .HasPrecision(18, 2);

        builder.Property(x => x.HousingAllowance)
            .HasPrecision(18, 2);

        builder.Property(x => x.TransportationAllowance)
            .HasPrecision(18, 2);

        builder.Property(x => x.OtherAllowances)
            .HasPrecision(18, 2);

        builder.Property(x => x.CreatedBy)
            .HasMaxLength(100);

        builder.Property(x => x.LastModifiedBy)
            .HasMaxLength(100);
    }
}
