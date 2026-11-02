using AlRobban.Modules.HumanResources.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.HumanResources.Infrastructure.Persistence.Configurations;

public class EmployeeCustodyConfiguration : IEntityTypeConfiguration<EmployeeCustody>
{
    public void Configure(EntityTypeBuilder<EmployeeCustody> builder)
    {
        builder.ToTable("EmployeeCustodies");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.EstimatedValue)
            .HasPrecision(18, 2);
    }
}
