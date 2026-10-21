using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class CompanyFinancialSettingsConfiguration : IEntityTypeConfiguration<CompanyFinancialSettings>
{
    public void Configure(EntityTypeBuilder<CompanyFinancialSettings> builder)
    {
        builder.ToTable("CompanyFinancialSettings", "gl");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId })
            .IsUnique();

        builder.Property(x => x.DefaultCurrency)
            .IsRequired()
            .HasMaxLength(10)
            .HasDefaultValue("SAR");

        builder.Property(x => x.CalendarType)
            .IsRequired();

        builder.Property(x => x.CostCenterPolicy)
            .IsRequired();

        builder.Property(x => x.AllowBackdatedEntries)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(x => x.MaxBackdatedDays)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(x => x.RequireApprovalForEntries)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(x => x.Include13thClosingPeriod)
            .IsRequired()
            .HasDefaultValue(true);
    }
}
