using AlRobban.Modules.HumanResources.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.HumanResources.Infrastructure.Persistence.Configurations;

public class EmployeeAdvanceConfiguration : IEntityTypeConfiguration<EmployeeAdvance>
{
    public void Configure(EntityTypeBuilder<EmployeeAdvance> builder)
    {
        builder.ToTable("EmployeeAdvances");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Amount)
            .HasPrecision(18, 2);

        builder.Property(x => x.MonthlyDeductionAmount)
            .HasPrecision(18, 2);

        builder.Property(x => x.PaidAmount)
            .HasPrecision(18, 2);
    }
}
