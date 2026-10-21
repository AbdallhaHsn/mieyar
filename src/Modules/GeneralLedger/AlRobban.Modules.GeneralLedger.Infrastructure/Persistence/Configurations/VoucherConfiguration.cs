using AlRobban.Modules.GeneralLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.GeneralLedger.Infrastructure.Persistence.Configurations;

public class VoucherConfiguration : IEntityTypeConfiguration<Voucher>
{
    public void Configure(EntityTypeBuilder<Voucher> builder)
    {
        builder.ToTable("Vouchers", "gl");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.VoucherNumber })
            .IsUnique();

        builder.Property(x => x.VoucherNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.VoucherType)
            .IsRequired();

        builder.Property(x => x.VoucherDate)
            .IsRequired();

        builder.Property(x => x.FiscalPeriodId)
            .IsRequired();

        builder.Property(x => x.PaymentMethod)
            .IsRequired();

        builder.Property(x => x.ReferenceNumber)
            .HasMaxLength(100);

        builder.Property(x => x.BeneficiaryOrPayerName)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.Description)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.Amount)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(x => x.Status)
            .IsRequired();

        builder.Property(x => x.PostedBy)
            .HasMaxLength(100);

        builder.Property(x => x.CancelledBy)
            .HasMaxLength(100);

        builder.Property(x => x.CancellationReason)
            .HasMaxLength(500);

        builder.HasOne(x => x.CashOrBankAccount)
            .WithMany()
            .HasForeignKey(x => x.CashOrBankAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.JournalEntry)
            .WithMany()
            .HasForeignKey(x => x.JournalEntryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(x => x.Lines)
            .WithOne(x => x.Voucher)
            .HasForeignKey(x => x.VoucherId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class VoucherLineConfiguration : IEntityTypeConfiguration<VoucherLine>
{
    public void Configure(EntityTypeBuilder<VoucherLine> builder)
    {
        builder.ToTable("VoucherLines", "gl");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.LineNumber)
            .IsRequired();

        builder.Property(x => x.Amount)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(x => x.Description)
            .HasMaxLength(500);

        builder.HasOne(x => x.Account)
            .WithMany()
            .HasForeignKey(x => x.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CostCenter)
            .WithMany()
            .HasForeignKey(x => x.CostCenterId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
