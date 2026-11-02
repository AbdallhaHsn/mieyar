using AlRobban.Modules.HumanResources.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.HumanResources.Infrastructure.Persistence.Configurations;

public class PayrollLineConfiguration : IEntityTypeConfiguration<PayrollLine>
{
    public void Configure(EntityTypeBuilder<PayrollLine> builder)
    {
        builder.ToTable("PayrollLines");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.EmployeeNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.EmployeeNameAr)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.EmployeeNameEn)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.NationalIdOrIqama)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.BankCode)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.Iban)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.BasicSalary).HasPrecision(18, 2);
        builder.Property(x => x.HousingAllowance).HasPrecision(18, 2);
        builder.Property(x => x.TransportationAllowance).HasPrecision(18, 2);
        builder.Property(x => x.OtherAllowances).HasPrecision(18, 2);
        builder.Property(x => x.OvertimeAmount).HasPrecision(18, 2);
        builder.Property(x => x.EmployeeGosiDeduction).HasPrecision(18, 2);
        builder.Property(x => x.CompanyGosiContribution).HasPrecision(18, 2);
        builder.Property(x => x.AbsenceDeduction).HasPrecision(18, 2);
        builder.Property(x => x.LoanDeduction).HasPrecision(18, 2);
        builder.Property(x => x.OtherDeductions).HasPrecision(18, 2);

        builder.Property(x => x.Notes)
            .HasMaxLength(500);
    }
}
