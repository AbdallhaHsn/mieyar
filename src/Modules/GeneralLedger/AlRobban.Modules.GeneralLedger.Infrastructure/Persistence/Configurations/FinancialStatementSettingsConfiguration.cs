using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class FinancialStatementSettingsConfiguration : IEntityTypeConfiguration<FinancialStatementSettings>
{
    public void Configure(EntityTypeBuilder<FinancialStatementSettings> builder)
    {
        builder.ToTable("FinancialStatementSettings", "gl");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId })
            .IsUnique();

        builder.Property(x => x.IncomeStatementFormat)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("multi-step");

        builder.Property(x => x.RetainedEarningsAccountCode)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("32102");

        builder.Property(x => x.AccountingBasis)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("accrual");

        builder.Property(x => x.DecimalPlaces)
            .IsRequired()
            .HasDefaultValue(2);

        builder.Property(x => x.CashFlowMethod)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("indirect");

        builder.Property(x => x.CashAccountPrefix)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("111");
    }
}
