using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class RecurringJournalEntryConfiguration : IEntityTypeConfiguration<RecurringJournalEntry>
{
    public void Configure(EntityTypeBuilder<RecurringJournalEntry> builder)
    {
        builder.ToTable("RecurringJournalEntries");
        builder.HasKey(x => x.Id);

        builder.HasMany(x => x.Lines)
            .WithOne()
            .HasForeignKey(l => l.RecurringEntryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class RecurringJournalEntryLineConfiguration : IEntityTypeConfiguration<RecurringJournalEntryLine>
{
    public void Configure(EntityTypeBuilder<RecurringJournalEntryLine> builder)
    {
        builder.ToTable("RecurringJournalEntryLines");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Debit)
            .HasPrecision(18, 2);

        builder.Property(x => x.Credit)
            .HasPrecision(18, 2);
    }
}
