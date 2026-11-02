using AlRobban.Modules.HumanResources.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.HumanResources.Infrastructure.Persistence.Configurations;

public class PayrollPeriodConfiguration : IEntityTypeConfiguration<PayrollPeriod>
{
    public void Configure(EntityTypeBuilder<PayrollPeriod> builder)
    {
        builder.ToTable("PayrollPeriods");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TenantId)
            .IsRequired();

        builder.Property(x => x.CompanyId)
            .IsRequired();

        builder.Property(x => x.PayrollNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.PeriodYear, x.PeriodMonth })
            .IsUnique();

        builder.Property(x => x.JournalEntryNumber)
            .HasMaxLength(50);

        builder.Property(x => x.PaymentJournalEntryNumber)
            .HasMaxLength(50);

        builder.Property(x => x.WpsFileName)
            .HasMaxLength(150);

        builder.Property(x => x.TotalBasicSalary).HasPrecision(18, 2);
        builder.Property(x => x.TotalHousingAllowance).HasPrecision(18, 2);
        builder.Property(x => x.TotalTransportationAllowance).HasPrecision(18, 2);
        builder.Property(x => x.TotalOtherAllowances).HasPrecision(18, 2);
        builder.Property(x => x.TotalOvertime).HasPrecision(18, 2);
        builder.Property(x => x.TotalGrossSalary).HasPrecision(18, 2);
        builder.Property(x => x.TotalEmployeeGosiDeduction).HasPrecision(18, 2);
        builder.Property(x => x.TotalCompanyGosiContribution).HasPrecision(18, 2);
        builder.Property(x => x.TotalAbsenceDeductions).HasPrecision(18, 2);
        builder.Property(x => x.TotalLoanDeductions).HasPrecision(18, 2);
        builder.Property(x => x.TotalOtherDeductions).HasPrecision(18, 2);
        builder.Property(x => x.TotalDeductions).HasPrecision(18, 2);
        builder.Property(x => x.TotalNetSalary).HasPrecision(18, 2);

        builder.Property(x => x.CreatedBy).HasMaxLength(100);
        builder.Property(x => x.LastModifiedBy).HasMaxLength(100);

        builder.HasMany(x => x.Lines)
            .WithOne()
            .HasForeignKey(x => x.PayrollPeriodId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
