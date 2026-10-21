using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class FixedAssetConfiguration : IEntityTypeConfiguration<FixedAsset>
{
    public void Configure(EntityTypeBuilder<FixedAsset> builder)
    {
        builder.ToTable("FixedAssets", "gl");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.AssetCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.NameAr)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.NameEn)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.AcquisitionCost)
            .HasPrecision(18, 4);

        builder.Property(x => x.SalvageValue)
            .HasPrecision(18, 4);

        builder.Property(x => x.CurrentBookValue)
            .HasPrecision(18, 4);

        builder.Property(x => x.TotalAccumulatedDepreciation)
            .HasPrecision(18, 4);

        builder.Property(x => x.DepreciationRate)
            .HasPrecision(5, 2);

        builder.Property(x => x.SerialNumber)
            .HasMaxLength(100);

        builder.Property(x => x.Location)
            .HasMaxLength(200);

        builder.Property(x => x.Notes)
            .HasMaxLength(500);

        builder.HasOne(x => x.AssetAccount)
            .WithMany()
            .HasForeignKey(x => x.AssetAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.AccumulatedDepreciationAccount)
            .WithMany()
            .HasForeignKey(x => x.AccumulatedDepreciationAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.DepreciationExpenseAccount)
            .WithMany()
            .HasForeignKey(x => x.DepreciationExpenseAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CostCenter)
            .WithMany()
            .HasForeignKey(x => x.CostCenterId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(x => x.DepreciationHistories)
            .WithOne(x => x.FixedAsset)
            .HasForeignKey(x => x.FixedAssetId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class AssetDepreciationHistoryConfiguration : IEntityTypeConfiguration<AssetDepreciationHistory>
{
    public void Configure(EntityTypeBuilder<AssetDepreciationHistory> builder)
    {
        builder.ToTable("AssetDepreciationHistories", "gl");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.DepreciationAmount)
            .HasPrecision(18, 4);

        builder.Property(x => x.BookValueBefore)
            .HasPrecision(18, 4);

        builder.Property(x => x.BookValueAfter)
            .HasPrecision(18, 4);

        builder.Property(x => x.JournalEntryNumber)
            .HasMaxLength(50);
    }
}
