using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class JournalEntryConfiguration : IEntityTypeConfiguration<JournalEntry>
{
    public void Configure(EntityTypeBuilder<JournalEntry> builder)
    {
        builder.ToTable("JournalEntries", "gl");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.EntryNumber })
            .IsUnique();

        builder.Property(x => x.EntryNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.EntryDate)
            .IsRequired();

        builder.Property(x => x.FiscalPeriodId)
            .IsRequired();

        builder.Property(x => x.EntryType)
            .IsRequired();

        builder.Property(x => x.Status)
            .IsRequired();

        builder.Property(x => x.DescriptionAr)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.DescriptionEn)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.ReferenceNumber)
            .HasMaxLength(100);

        builder.Property(x => x.TotalDebit)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(x => x.TotalCredit)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(x => x.ReversalReason)
            .HasMaxLength(500);

        builder.Property(x => x.PostedBy)
            .HasMaxLength(100);

        builder.HasOne(x => x.FiscalPeriod)
            .WithMany()
            .HasForeignKey(x => x.FiscalPeriodId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Lines)
            .WithOne(x => x.JournalEntry)
            .HasForeignKey(x => x.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
