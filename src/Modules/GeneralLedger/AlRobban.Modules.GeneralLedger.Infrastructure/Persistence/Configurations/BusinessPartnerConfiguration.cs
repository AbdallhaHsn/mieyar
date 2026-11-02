using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class BusinessPartnerConfiguration : IEntityTypeConfiguration<BusinessPartner>
{
    public void Configure(EntityTypeBuilder<BusinessPartner> builder)
    {
        builder.ToTable("BusinessPartners");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.CreditLimit)
            .HasPrecision(18, 2);

        builder.Property(x => x.CurrentBalance)
            .HasPrecision(18, 2);
    }
}
