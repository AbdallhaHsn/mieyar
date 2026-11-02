using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class PurchaseInvoice : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string InvoiceNumber { get; private set; } = string.Empty;       // PINV-2026-00001
    public string? VendorInvoiceNumber { get; private set; }                // رقم فاتورة المورد الورقية

    public Guid VendorId { get; private set; }                              // BusinessPartner Id
    public string VendorName { get; private set; } = string.Empty;
    public string? VendorVatNumber { get; private set; }
    public string? VendorCrNumber { get; private set; }

    public DateTime IssueDate { get; private set; }
    public DateTime? DueDate { get; private set; }

    public string Currency { get; private set; } = "SAR";
    public decimal ExchangeRateToSar { get; private set; } = 1.0000m;

    public decimal SubTotal { get; private set; }
    public decimal TotalDiscount { get; private set; }
    public decimal TotalTaxableAmount { get; private set; }
    public decimal TotalVat { get; private set; }
    public decimal TotalAmount { get; private set; }

    public PurchaseInvoiceStatus Status { get; private set; } = PurchaseInvoiceStatus.Draft;
    public PurchasePaymentStatus PaymentStatus { get; private set; } = PurchasePaymentStatus.Unpaid;
    public decimal PaidAmount { get; private set; }

    // 3-Way Matching & Procurement Links
    public Guid? PurchaseOrderId { get; private set; }
    public string? PurchaseOrderNumber { get; private set; }
    public Guid? GoodsReceiptNoteId { get; private set; }
    public string? GoodsReceiptNoteNumber { get; private set; }
    public ThreeWayMatchingStatus MatchingStatus { get; private set; } = ThreeWayMatchingStatus.NotMatched;

    public Guid? AssociatedJournalEntryId { get; private set; }
    public string? AssociatedJournalEntryNumber { get; private set; }

    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private readonly List<PurchaseInvoiceLine> _lines = new();
    public IReadOnlyCollection<PurchaseInvoiceLine> Lines => _lines.AsReadOnly();

    private PurchaseInvoice() { }

    public static PurchaseInvoice Create(
        Guid tenantId,
        Guid companyId,
        string invoiceNumber,
        Guid vendorId,
        string vendorName,
        string? vendorVatNumber,
        string? vendorCrNumber,
        DateTime issueDate,
        string? vendorInvoiceNumber = null,
        DateTime? dueDate = null,
        string currency = "SAR",
        decimal exchangeRateToSar = 1.0000m,
        string? notes = null,
        string? createdBy = null)
    {
        return new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            InvoiceNumber = invoiceNumber.Trim().ToUpperInvariant(),
            VendorInvoiceNumber = vendorInvoiceNumber?.Trim(),
            VendorId = vendorId,
            VendorName = vendorName.Trim(),
            VendorVatNumber = vendorVatNumber?.Trim(),
            VendorCrNumber = vendorCrNumber?.Trim(),
            IssueDate = issueDate.Date,
            DueDate = dueDate?.Date,
            Currency = string.IsNullOrWhiteSpace(currency) ? "SAR" : currency.Trim().ToUpperInvariant(),
            ExchangeRateToSar = exchangeRateToSar > 0 ? exchangeRateToSar : 1.0000m,
            Status = PurchaseInvoiceStatus.Draft,
            PaymentStatus = PurchasePaymentStatus.Unpaid,
            PaidAmount = 0,
            Notes = notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void AddLine(
        Guid accountId,
        string itemNameAr,
        string itemNameEn,
        decimal quantity,
        decimal unitPrice,
        decimal discountAmount = 0,
        decimal vatRate = 15.00m,
        Guid? itemId = null,
        Guid? costCenterId = null)
    {
        if (Status != PurchaseInvoiceStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن تعديل بنود فاتورة مشتريات تم اعتمادها أو ترحيلها.");
        }

        var line = PurchaseInvoiceLine.Create(
            TenantId,
            Id,
            _lines.Count + 1,
            accountId,
            itemNameAr,
            itemNameEn,
            quantity,
            unitPrice,
            discountAmount,
            vatRate,
            itemId,
            costCenterId);

        _lines.Add(line);
        RecalculateTotals();
    }

    public void ClearLines()
    {
        if (Status != PurchaseInvoiceStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن تعديل بنود فاتورة مشتريات تم اعتمادها أو ترحيلها.");
        }
        _lines.Clear();
        RecalculateTotals();
    }

    public void RecalculateTotals()
    {
        SubTotal = Math.Round(_lines.Sum(l => l.SubTotal), 4);
        TotalDiscount = Math.Round(_lines.Sum(l => l.DiscountAmount), 4);
        TotalTaxableAmount = Math.Round(_lines.Sum(l => l.TaxableAmount), 4);
        TotalVat = Math.Round(_lines.Sum(l => l.VatAmount), 4);
        TotalAmount = Math.Round(_lines.Sum(l => l.TotalAmount), 4);
    }

    public void Approve(string? approvedBy)
    {
        if (Status != PurchaseInvoiceStatus.Draft)
        {
            throw new InvalidOperationException("الفاتورة ليست في حالة مسودة ليتم اعتمادها.");
        }
        Status = PurchaseInvoiceStatus.Approved;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = approvedBy;
    }

    public void Post(Guid journalEntryId, string journalEntryNumber, string? postedBy)
    {
        if (Status == PurchaseInvoiceStatus.Posted)
        {
            throw new InvalidOperationException("الفاتورة مرحلة بالفعل في دفتر الأستاذ العام.");
        }

        Status = PurchaseInvoiceStatus.Posted;
        AssociatedJournalEntryId = journalEntryId;
        AssociatedJournalEntryNumber = journalEntryNumber;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = postedBy;
    }

    public void Cancel(string? cancelledBy)
    {
        if (Status == PurchaseInvoiceStatus.Cancelled)
        {
            throw new InvalidOperationException("الفاتورة ملغاة بالفعل.");
        }
        Status = PurchaseInvoiceStatus.Cancelled;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = cancelledBy;
    }

    public void SetProcurementLinks(Guid? poId, string? poNumber, Guid? grnId, string? grnNumber, ThreeWayMatchingStatus status)
    {
        PurchaseOrderId = poId;
        PurchaseOrderNumber = poNumber?.Trim();
        GoodsReceiptNoteId = grnId;
        GoodsReceiptNoteNumber = grnNumber?.Trim();
        MatchingStatus = status;
        LastModifiedAtUtc = DateTime.UtcNow;
    }

    public void RecordPayment(decimal amount)
    {
        PaidAmount = Math.Round(PaidAmount + amount, 4);
        if (PaidAmount >= TotalAmount)
        {
            PaymentStatus = PurchasePaymentStatus.Paid;
        }
        else if (PaidAmount > 0)
        {
            PaymentStatus = PurchasePaymentStatus.PartiallyPaid;
        }
        LastModifiedAtUtc = DateTime.UtcNow;
    }
}
