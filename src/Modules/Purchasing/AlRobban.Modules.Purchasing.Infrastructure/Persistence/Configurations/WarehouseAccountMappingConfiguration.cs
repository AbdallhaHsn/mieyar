using AlRobban.Modules.Purchasing.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlRobban.Modules.Purchasing.Infrastructure.Persistence.Configurations;

public class WarehouseAccountMappingConfiguration : IEntityTypeConfiguration<WarehouseAccountMapping>
{
    public void Configure(EntityTypeBuilder<WarehouseAccountMapping> builder)
    {
        builder.ToTable("WarehouseAccountMappings");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TenantId).IsRequired();
        builder.Property(x => x.CompanyId).IsRequired();
        builder.Property(x => x.WarehouseId).IsRequired();
        builder.Property(x => x.PaymentMethod).IsRequired();

        builder.HasIndex(x => new { x.TenantId, x.CompanyId, x.WarehouseId, x.PaymentMethod })
            .IsUnique();

        builder.Property(x => x.SalesInvoiceAccountCode).HasMaxLength(50);
        builder.Property(x => x.SalesInvoiceAccountName).HasMaxLength(250);

        builder.Property(x => x.InventoryAccountCode).HasMaxLength(50);
        builder.Property(x => x.InventoryAccountName).HasMaxLength(250);

        builder.Property(x => x.CogsAccountCode).HasMaxLength(50);
        builder.Property(x => x.CogsAccountName).HasMaxLength(250);

        builder.Property(x => x.SalesRevenueAccountCode).HasMaxLength(50);
        builder.Property(x => x.SalesRevenueAccountName).HasMaxLength(250);

        builder.Property(x => x.SalesReturnAccountCode).HasMaxLength(50);
        builder.Property(x => x.SalesReturnAccountName).HasMaxLength(250);

        builder.Property(x => x.AdvancePaymentAccountCode).HasMaxLength(50);
        builder.Property(x => x.AdvancePaymentAccountName).HasMaxLength(250);

        builder.Property(x => x.DiscountAllowedAccountCode).HasMaxLength(50);
        builder.Property(x => x.DiscountAllowedAccountName).HasMaxLength(250);

        builder.Property(x => x.TaxAccountCode).HasMaxLength(50);
        builder.Property(x => x.TaxAccountName).HasMaxLength(250);

        builder.Property(x => x.ServicesRevenueAccountCode).HasMaxLength(50);
        builder.Property(x => x.ServicesRevenueAccountName).HasMaxLength(250);

        builder.Property(x => x.ServicesCostAccountCode).HasMaxLength(50);
        builder.Property(x => x.ServicesCostAccountName).HasMaxLength(250);

        builder.Property(x => x.LoyaltyCustomersAccountCode).HasMaxLength(50);
        builder.Property(x => x.LoyaltyCustomersAccountName).HasMaxLength(250);

        builder.Property(x => x.RoundingAccountCode).HasMaxLength(50);
        builder.Property(x => x.RoundingAccountName).HasMaxLength(250);

        builder.Property(x => x.AdditionalExpensesAccountCode).HasMaxLength(50);
        builder.Property(x => x.AdditionalExpensesAccountName).HasMaxLength(250);

        builder.Property(x => x.TransferClearingAccountCode).HasMaxLength(50);
        builder.Property(x => x.TransferClearingAccountName).HasMaxLength(250);

        builder.Property(x => x.AdjustmentVarianceAccountCode).HasMaxLength(50);
        builder.Property(x => x.AdjustmentVarianceAccountName).HasMaxLength(250);
    }
}
