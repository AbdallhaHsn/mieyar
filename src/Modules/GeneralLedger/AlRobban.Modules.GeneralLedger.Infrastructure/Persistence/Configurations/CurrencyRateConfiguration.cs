using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class CurrencyRateConfiguration : IEntityTypeConfiguration<CurrencyRate>
{
    public void Configure(EntityTypeBuilder<CurrencyRate> builder)
    {
        builder.ToTable("CurrencyRates");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.CurrencyCode)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(x => x.CurrencyNameAr)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.CurrencyNameEn)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.ExchangeRateToSar)
            .HasPrecision(18, 6);
    }
}
