using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class FiscalPeriodConfiguration : IEntityTypeConfiguration<FiscalPeriod>
{
    public void Configure(EntityTypeBuilder<FiscalPeriod> builder)
    {
        builder.ToTable("FiscalPeriods", "gl");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.FiscalYearId, x.PeriodNumber })
            .IsUnique();

        builder.Property(x => x.PeriodNameAr)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.PeriodNameEn)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.StartDate)
            .IsRequired();

        builder.Property(x => x.EndDate)
            .IsRequired();

        builder.Property(x => x.Status)
            .IsRequired();
    }
}
