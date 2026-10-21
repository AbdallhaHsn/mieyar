using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class BankReconciliationConfiguration : IEntityTypeConfiguration<BankReconciliation>
{
    public void Configure(EntityTypeBuilder<BankReconciliation> builder)
    {
        builder.ToTable("BankReconciliations", "gl");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ReconciliationNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.StatementEndingBalance)
            .HasPrecision(18, 4);

        builder.Property(x => x.BookBalance)
            .HasPrecision(18, 4);

        builder.Property(x => x.ClearedDeposits)
            .HasPrecision(18, 4);

        builder.Property(x => x.ClearedWithdrawals)
            .HasPrecision(18, 4);

        builder.Property(x => x.Difference)
            .HasPrecision(18, 4);

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.HasOne(x => x.BankAccount)
            .WithMany()
            .HasForeignKey(x => x.BankAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Items)
            .WithOne(x => x.BankReconciliation)
            .HasForeignKey(x => x.BankReconciliationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class BankReconciliationItemConfiguration : IEntityTypeConfiguration<BankReconciliationItem>
{
    public void Configure(EntityTypeBuilder<BankReconciliationItem> builder)
    {
        builder.ToTable("BankReconciliationItems", "gl");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Debit)
            .HasPrecision(18, 4);

        builder.Property(x => x.Credit)
            .HasPrecision(18, 4);

        builder.Property(x => x.ReferenceNumber)
            .HasMaxLength(100);

        builder.Property(x => x.Description)
            .HasMaxLength(500);
    }
}
