using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;

namespace AlRobban.Modules.InvoicingAndZatca.Application.DTOs;

public record InvoiceDto(
    Guid Id,
    string InvoiceNumber,
    Guid Uuid,
    DateTime IssueDate,
    TimeSpan IssueTime,
    InvoiceType InvoiceType,
    string InvoiceTypeNameAr,
    TransactionType TransactionType,
    string TransactionTypeNameAr,
    InvoiceStatus Status,
    string StatusNameAr,
    InvoicePaymentStatus PaymentStatus,
    string PaymentStatusNameAr,
    string Currency,
    Guid? CustomerId,
    string CustomerName,
    string? CustomerVatNumber,
    string? CustomerCrNumber,
    string? CustomerAddress,
    Guid? ReferenceInvoiceId,
    string? ReferenceInvoiceNumber,
    string? ModificationReason,
    decimal SubTotal,
    decimal TotalDiscount,
    decimal TotalTaxableAmount,
    decimal TotalVat,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal RemainingAmount,
    string? PreviousInvoiceHash,
    string? InvoiceHash,
    string? CryptographicStamp,
    string? QrCodePayload,
    Guid? AssociatedJournalEntryId,
    string? AssociatedJournalEntryNumber,
    Guid? SalespersonId,
    string? SalespersonName,
    string? WarehouseCode,
    string? CreatedBy,
    DateTime CreatedAtUtc,
    List<InvoiceLineDto> Lines,
    decimal ReturnedAmount = 0m,
    string? BuyerStreet = null,
    string? BuyerBuildingNumber = null,
    string? BuyerPlotIdentification = null,
    string? BuyerCitySubdivisionName = null,
    string? BuyerCity = null,
    string? BuyerPostalCode = null,
    string? BuyerCountryCode = "SA",
    string? BuyerOtherIdType = null,
    string? BuyerOtherIdValue = null,
    string? BuyerPhone = null,
    string? BuyerEmail = null,
    bool IsCashCustomer = false);

public record InvoiceLineDto(
    Guid Id,
    int LineNumber,
    Guid? ItemId,
    string? WarehouseCode,
    string ItemNameAr,
    string? ItemNameEn,
    decimal Quantity,
    decimal UnitPrice,
    decimal SubTotal,
    decimal Discount,
    decimal TaxableAmount,
    decimal VatRate,
    decimal VatAmount,
    decimal TotalAmount);

public class CreateInvoiceRequest
{
    public Guid? CompanyId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? SalespersonId { get; set; }
    public string? SalespersonName { get; set; }
    public string? WarehouseCode { get; set; }
    public string? CreatedBy { get; set; }
    public InvoiceType InvoiceType { get; set; } = InvoiceType.Standard;
    public TransactionType TransactionType { get; set; } = TransactionType.Invoice;
    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime? SupplyDate { get; set; }

    // Support both CustomerName and BuyerName conventions
    private string _customerName = string.Empty;
    public string CustomerName 
    { 
        get => _customerName; 
        set { if (!string.IsNullOrWhiteSpace(value)) _customerName = value.Trim(); } 
    }
    public string? BuyerName 
    { 
        get => CustomerName; 
        set { if (!string.IsNullOrWhiteSpace(value)) CustomerName = value; } 
    }

    private string? _customerVat;
    public string? CustomerVatNumber 
    { 
        get => _customerVat; 
        set { if (!string.IsNullOrWhiteSpace(value)) _customerVat = value.Trim(); } 
    }
    public string? BuyerVatNumber 
    { 
        get => CustomerVatNumber; 
        set { if (!string.IsNullOrWhiteSpace(value)) CustomerVatNumber = value; } 
    }

    private string? _customerCr;
    public string? CustomerCrNumber 
    { 
        get => _customerCr; 
        set { if (!string.IsNullOrWhiteSpace(value)) _customerCr = value.Trim(); } 
    }
    public string? BuyerCrNumber 
    { 
        get => CustomerCrNumber; 
        set { if (!string.IsNullOrWhiteSpace(value)) CustomerCrNumber = value; } 
    }

    public string? CustomerAddress { get; set; }

    // Detailed ZATCA National Address fields
    public string? BuyerStreet { get; set; }
    public string? BuyerBuildingNumber { get; set; }
    public string? BuyerPlotIdentification { get; set; }
    public string? BuyerCitySubdivisionName { get; set; }
    public string? BuyerDistrict 
    { 
        get => BuyerCitySubdivisionName; 
        set => BuyerCitySubdivisionName = value; 
    }
    public string? BuyerCity { get; set; }
    public string? BuyerPostalCode { get; set; }
    public string? BuyerCountryCode { get; set; } = "SA";

    public string? BuyerOtherIdType { get; set; }
    public string? BuyerOtherIdValue { get; set; }
    public string? PaymentMeansCode { get; set; } = "10";
    public string? Notes { get; set; }

    public Guid? ReferenceInvoiceId { get; set; }
    public string? ReferenceInvoiceNumber { get; set; }
    public string? ModificationReason { get; set; }
    public bool AutoIssueAndPost { get; set; } = false;

    public List<CreateInvoiceLineRequest> Lines { get; set; } = new();
}

public class CreateInvoiceLineRequest
{
    public Guid? ItemId { get; set; }
    public string? WarehouseCode { get; set; }

    private string _itemNameAr = string.Empty;
    public string ItemNameAr 
    { 
        get => _itemNameAr; 
        set { if (!string.IsNullOrWhiteSpace(value)) _itemNameAr = value.Trim(); } 
    }
    public string? ItemName 
    { 
        get => ItemNameAr; 
        set { if (!string.IsNullOrWhiteSpace(value)) ItemNameAr = value; } 
    }

    public string? ItemNameEn { get; set; }
    public string? ItemCode { get; set; }
    public decimal Quantity { get; set; } = 1m;
    public decimal UnitPrice { get; set; } = 0m;
    
    public decimal Discount { get; set; } = 0m;
    public decimal DiscountAmount 
    { 
        get => Discount; 
        set => Discount = value; 
    }

    public decimal VatRate { get; set; } = 15m;
    public decimal VatPercent 
    { 
        get => VatRate; 
        set => VatRate = value; 
    }
    public string? VatCategory { get; set; } = "S";
}

public record IssueInvoiceResultDto(
    Guid InvoiceId,
    string InvoiceNumber,
    InvoiceStatus Status,
    string InvoiceHash,
    string QrCodePayload,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    string Message,
    string ZatcaClearanceStatus = "CLEARED",
    string ZatcaStatusNameAr = "معتمدة ومطابقة (CLEARED)",
    string? PreviousInvoiceHash = null,
    string? CryptographicStamp = null,
    List<string>? ValidationWarnings = null,
    DateTime? ClearedAtUtc = null);

public record InvoiceKpisDto(
    int TotalInvoices,
    int StandardCount,
    int SimplifiedCount,
    int IssuedCount,
    int DraftCount,
    decimal TotalTaxableSales,
    decimal TotalVatCollected,
    decimal TotalGrossSales);

public record SalespersonDto(
    Guid Id,
    Guid CompanyId,
    string Code,
    string NameAr,
    string NameEn,
    string? PhoneNumber,
    string? Email,
    Guid? UserId,
    string? UserName,
    string WarehouseCode,
    string WarehouseNameAr,
    Guid? BranchId,
    decimal CommissionRate,
    bool IsActive,
    DateTime CreatedAtUtc,
    bool CanGiveDiscount = true,
    decimal MaxDiscountPercent = 5.0m,
    bool CanSellCredit = false,
    bool CanEditPrice = false,
    bool CanProcessReturns = false,
    bool CanSellBelowCost = false,
    bool CanViewCostPrice = false,
    bool CanSellFromAnyWarehouse = false,
    string? UserRole = null);

public class CreateSalespersonRequest
{
    public Guid? CompanyId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public bool CreateUserAccount { get; set; } = false;
    public string? UserPassword { get; set; }
    public string? TargetRole { get; set; } = "Salesperson";
    public string WarehouseCode { get; set; } = "WH-01";
    public string WarehouseNameAr { get; set; } = "المستودع الرئيسي";
    public Guid? BranchId { get; set; }
    public decimal CommissionRate { get; set; } = 0m;
    public bool CanGiveDiscount { get; set; } = true;
    public decimal MaxDiscountPercent { get; set; } = 5.0m;
    public bool CanSellCredit { get; set; } = false;
    public bool CanEditPrice { get; set; } = false;
    public bool CanProcessReturns { get; set; } = false;
    public bool CanSellBelowCost { get; set; } = false;
    public bool CanViewCostPrice { get; set; } = false;
    public bool CanSellFromAnyWarehouse { get; set; } = false;
}

public class UpdateSalespersonRequest
{
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? TargetRole { get; set; }
    public string WarehouseCode { get; set; } = "WH-01";
    public string WarehouseNameAr { get; set; } = "المستودع الرئيسي";
    public Guid? BranchId { get; set; }
    public decimal CommissionRate { get; set; } = 0m;
    public bool IsActive { get; set; } = true;
    public bool CanGiveDiscount { get; set; } = true;
    public decimal MaxDiscountPercent { get; set; } = 5.0m;
    public bool CanSellCredit { get; set; } = false;
    public bool CanEditPrice { get; set; } = false;
    public bool CanProcessReturns { get; set; } = false;
    public bool CanSellBelowCost { get; set; } = false;
    public bool CanViewCostPrice { get; set; } = false;
    public bool CanSellFromAnyWarehouse { get; set; } = false;
}
