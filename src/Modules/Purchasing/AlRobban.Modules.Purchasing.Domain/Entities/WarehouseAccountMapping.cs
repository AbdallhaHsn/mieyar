using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class WarehouseAccountMapping : Entity<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public Guid WarehouseId { get; private set; }
    public int PaymentMethod { get; private set; } // 1 = Cash (نقدي), 2 = Credit (آجل), 3 = BankCard (شبكة/مدى)

    // 1. Sales Invoice Account (الجانب المدين لفاتورة المبيعات: الصندوق / العميل / وسيط الشبكة)
    public Guid? SalesInvoiceAccountId { get; private set; }
    public string? SalesInvoiceAccountCode { get; private set; }
    public string? SalesInvoiceAccountName { get; private set; }

    // 2. Inventory Account (المخزون المباع - الجانب الدائن)
    public Guid? InventoryAccountId { get; private set; }
    public string? InventoryAccountCode { get; private set; }
    public string? InventoryAccountName { get; private set; }

    // 3. COGS Account (تكلفة البضاعة - الجانب المدين)
    public Guid? CogsAccountId { get; private set; }
    public string? CogsAccountCode { get; private set; }
    public string? CogsAccountName { get; private set; }

    // 4. Sales Revenue Account (إيرادات المبيعات - الجانب الدائن)
    public Guid? SalesRevenueAccountId { get; private set; }
    public string? SalesRevenueAccountCode { get; private set; }
    public string? SalesRevenueAccountName { get; private set; }

    // 5. Sales Returns Account (مرتجعات المبيعات - الجانب المدين)
    public Guid? SalesReturnAccountId { get; private set; }
    public string? SalesReturnAccountCode { get; private set; }
    public string? SalesReturnAccountName { get; private set; }

    // 6. Advance Payment Account (دفعة مقدمة - الجانب المدين)
    public Guid? AdvancePaymentAccountId { get; private set; }
    public string? AdvancePaymentAccountCode { get; private set; }
    public string? AdvancePaymentAccountName { get; private set; }

    // 7. Discount Allowed Account (الخصم المسموح به - الجانب المدين)
    public Guid? DiscountAllowedAccountId { get; private set; }
    public string? DiscountAllowedAccountCode { get; private set; }
    public string? DiscountAllowedAccountName { get; private set; }

    // 8. Tax Account (حساب الضريبة - الجانب الدائن)
    public Guid? TaxAccountId { get; private set; }
    public string? TaxAccountCode { get; private set; }
    public string? TaxAccountName { get; private set; }

    // 9. Services Revenue Account (حساب الخدمات - الجانب الدائن)
    public Guid? ServicesRevenueAccountId { get; private set; }
    public string? ServicesRevenueAccountCode { get; private set; }
    public string? ServicesRevenueAccountName { get; private set; }

    // 10. Services Cost Account (تكلفة مواد الخدمات - الجانب المدين)
    public Guid? ServicesCostAccountId { get; private set; }
    public string? ServicesCostAccountCode { get; private set; }
    public string? ServicesCostAccountName { get; private set; }

    // 11. Loyalty Customers Account (عملاء الولاء - الجانب المدين)
    public Guid? LoyaltyCustomersAccountId { get; private set; }
    public string? LoyaltyCustomersAccountCode { get; private set; }
    public string? LoyaltyCustomersAccountName { get; private set; }

    // 12. Rounding Account (تقريب الكسور)
    public Guid? RoundingAccountId { get; private set; }
    public string? RoundingAccountCode { get; private set; }
    public string? RoundingAccountName { get; private set; }

    // 13. Additional Expenses Account (الرسوم الإضافية - الجانب الدائن)
    public Guid? AdditionalExpensesAccountId { get; private set; }
    public string? AdditionalExpensesAccountCode { get; private set; }
    public string? AdditionalExpensesAccountName { get; private set; }

    // 14. Transfer Clearing Account (حساب وسيط التحويلات المخزنية)
    public Guid? TransferClearingAccountId { get; private set; }
    public string? TransferClearingAccountCode { get; private set; }
    public string? TransferClearingAccountName { get; private set; }

    // 15. Adjustment Variance Account (حساب فروقات وتسويات الجرد)
    public Guid? AdjustmentVarianceAccountId { get; private set; }
    public string? AdjustmentVarianceAccountCode { get; private set; }
    public string? AdjustmentVarianceAccountName { get; private set; }

    // Auditing
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private WarehouseAccountMapping() { } // EF Core

    public WarehouseAccountMapping(
        Guid id,
        Guid tenantId,
        Guid companyId,
        Guid warehouseId,
        int paymentMethod) : base(id)
    {
        TenantId = tenantId;
        CompanyId = companyId;
        WarehouseId = warehouseId;
        PaymentMethod = paymentMethod;
    }

    public void UpdateAccounts(
        Guid? salesInvoiceAccountId, string? salesInvoiceAccountCode, string? salesInvoiceAccountName,
        Guid? inventoryAccountId, string? inventoryAccountCode, string? inventoryAccountName,
        Guid? cogsAccountId, string? cogsAccountCode, string? cogsAccountName,
        Guid? salesRevenueAccountId, string? salesRevenueAccountCode, string? salesRevenueAccountName,
        Guid? salesReturnAccountId, string? salesReturnAccountCode, string? salesReturnAccountName,
        Guid? advancePaymentAccountId, string? advancePaymentAccountCode, string? advancePaymentAccountName,
        Guid? discountAllowedAccountId, string? discountAllowedAccountCode, string? discountAllowedAccountName,
        Guid? taxAccountId, string? taxAccountCode, string? taxAccountName,
        Guid? servicesRevenueAccountId, string? servicesRevenueAccountCode, string? servicesRevenueAccountName,
        Guid? servicesCostAccountId, string? servicesCostAccountCode, string? servicesCostAccountName,
        Guid? loyaltyCustomersAccountId, string? loyaltyCustomersAccountCode, string? loyaltyCustomersAccountName,
        Guid? roundingAccountId, string? roundingAccountCode, string? roundingAccountName,
        Guid? additionalExpensesAccountId, string? additionalExpensesAccountCode, string? additionalExpensesAccountName,
        Guid? transferClearingAccountId, string? transferClearingAccountCode, string? transferClearingAccountName,
        Guid? adjustmentVarianceAccountId, string? adjustmentVarianceAccountCode, string? adjustmentVarianceAccountName,
        string? modifiedBy = null)
    {
        SalesInvoiceAccountId = salesInvoiceAccountId;
        SalesInvoiceAccountCode = salesInvoiceAccountCode;
        SalesInvoiceAccountName = salesInvoiceAccountName;

        InventoryAccountId = inventoryAccountId;
        InventoryAccountCode = inventoryAccountCode;
        InventoryAccountName = inventoryAccountName;

        CogsAccountId = cogsAccountId;
        CogsAccountCode = cogsAccountCode;
        CogsAccountName = cogsAccountName;

        SalesRevenueAccountId = salesRevenueAccountId;
        SalesRevenueAccountCode = salesRevenueAccountCode;
        SalesRevenueAccountName = salesRevenueAccountName;

        SalesReturnAccountId = salesReturnAccountId;
        SalesReturnAccountCode = salesReturnAccountCode;
        SalesReturnAccountName = salesReturnAccountName;

        AdvancePaymentAccountId = advancePaymentAccountId;
        AdvancePaymentAccountCode = advancePaymentAccountCode;
        AdvancePaymentAccountName = advancePaymentAccountName;

        DiscountAllowedAccountId = discountAllowedAccountId;
        DiscountAllowedAccountCode = discountAllowedAccountCode;
        DiscountAllowedAccountName = discountAllowedAccountName;

        TaxAccountId = taxAccountId;
        TaxAccountCode = taxAccountCode;
        TaxAccountName = taxAccountName;

        ServicesRevenueAccountId = servicesRevenueAccountId;
        ServicesRevenueAccountCode = servicesRevenueAccountCode;
        ServicesRevenueAccountName = servicesRevenueAccountName;

        ServicesCostAccountId = servicesCostAccountId;
        ServicesCostAccountCode = servicesCostAccountCode;
        ServicesCostAccountName = servicesCostAccountName;

        LoyaltyCustomersAccountId = loyaltyCustomersAccountId;
        LoyaltyCustomersAccountCode = loyaltyCustomersAccountCode;
        LoyaltyCustomersAccountName = loyaltyCustomersAccountName;

        RoundingAccountId = roundingAccountId;
        RoundingAccountCode = roundingAccountCode;
        RoundingAccountName = roundingAccountName;

        AdditionalExpensesAccountId = additionalExpensesAccountId;
        AdditionalExpensesAccountCode = additionalExpensesAccountCode;
        AdditionalExpensesAccountName = additionalExpensesAccountName;

        TransferClearingAccountId = transferClearingAccountId;
        TransferClearingAccountCode = transferClearingAccountCode;
        TransferClearingAccountName = transferClearingAccountName;

        AdjustmentVarianceAccountId = adjustmentVarianceAccountId;
        AdjustmentVarianceAccountCode = adjustmentVarianceAccountCode;
        AdjustmentVarianceAccountName = adjustmentVarianceAccountName;

        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = modifiedBy;
    }
}
