using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class PostDatedCheckConfiguration : IEntityTypeConfiguration<PostDatedCheck>
{
    public void Configure(EntityTypeBuilder<PostDatedCheck> builder)
    {
        builder.ToTable("PostDatedChecks");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Amount)
            .HasPrecision(18, 2);

        builder.Property(x => x.BounceFee)
            .HasPrecision(18, 2);
    }
}
