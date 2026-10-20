using System.Text.Json;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("Accounts", "gl");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.AccountCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.AccountCode })
            .IsUnique();

        builder.Property(x => x.NameAr)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.NameEn)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.Description)
            .HasMaxLength(1000);

        builder.Property(x => x.CurrencyCode)
            .IsRequired()
            .HasMaxLength(10)
            .HasDefaultValue("SAR");

        builder.Property(x => x.CurrentBalance)
            .HasPrecision(18, 4)
            .HasDefaultValue(0m);

        builder.Property(x => x.AccountType)
            .IsRequired();

        builder.Property(x => x.AccountNature)
            .IsRequired();

        builder.Property(x => x.FinancialStatement)
            .IsRequired();

        builder.Property(x => x.Level)
            .IsRequired();

        builder.Property(x => x.IsPostable)
            .IsRequired();

        builder.Property(x => x.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        // Store Guidance as JSON string for maximum cross-platform DB compatibility
        builder.Property(x => x.Guidance)
            .HasConversion(
                v => v == null ? null : JsonSerializer.Serialize(v, JsonOptions),
                v => string.IsNullOrEmpty(v) ? null : JsonSerializer.Deserialize<AccountingStandardGuidance>(v, JsonOptions))
            .HasColumnType("nvarchar(max)");

        builder.HasOne(x => x.ParentAccount)
            .WithMany(x => x.SubAccounts)
            .HasForeignKey(x => x.ParentAccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
