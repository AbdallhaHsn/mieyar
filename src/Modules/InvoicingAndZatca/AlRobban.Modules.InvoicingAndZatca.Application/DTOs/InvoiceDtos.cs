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
    string Currency,
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
    string? PreviousInvoiceHash,
    string? InvoiceHash,
    string? CryptographicStamp,
    string? QrCodePayload,
    Guid? AssociatedJournalEntryId,
    string? AssociatedJournalEntryNumber,
    DateTime CreatedAtUtc,
    List<InvoiceLineDto> Lines);

public record InvoiceLineDto(
    Guid Id,
    int LineNumber,
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
    string Message);

public record InvoiceKpisDto(
    int TotalInvoices,
    int StandardCount,
    int SimplifiedCount,
    int IssuedCount,
    int DraftCount,
    decimal TotalTaxableSales,
    decimal TotalVatCollected,
    decimal TotalGrossSales);
