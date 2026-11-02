using AlRobban.Modules.HumanResources.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.HumanResources.Infrastructure.Persistence.Configurations;

public class HrPolicySettingsConfiguration : IEntityTypeConfiguration<HrPolicySettings>
{
    public void Configure(EntityTypeBuilder<HrPolicySettings> builder)
    {
        builder.ToTable("HrPolicySettings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.MaxAdvanceSalaryPercentage)
            .HasPrecision(18, 2);

        builder.Property(x => x.MinServiceMonthsForAdvance)
            .HasPrecision(18, 2);
    }
}
