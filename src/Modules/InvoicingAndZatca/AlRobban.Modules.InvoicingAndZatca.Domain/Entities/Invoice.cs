using System.Text;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.InvoicingAndZatca.Domain.Entities;

public class Invoice : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string InvoiceNumber { get; private set; } = string.Empty;
    public Guid Uuid { get; private set; } = Guid.NewGuid();
    public DateTime IssueDate { get; private set; }
    public TimeSpan IssueTime { get; private set; }
    public InvoiceType InvoiceType { get; private set; } = InvoiceType.Standard;
    public TransactionType TransactionType { get; private set; } = TransactionType.Invoice;
    public InvoiceStatus Status { get; private set; } = InvoiceStatus.Draft;
    public string Currency { get; private set; } = "SAR";

    // Customer / Buyer Details
    public string CustomerName { get; private set; } = string.Empty;
    public string? CustomerVatNumber { get; private set; }
    public string? CustomerCrNumber { get; private set; }
    public string? CustomerAddress { get; private set; }

    // References (for Credit / Debit Notes)
    public Guid? ReferenceInvoiceId { get; private set; }
    public string? ReferenceInvoiceNumber { get; private set; }
    public string? ModificationReason { get; private set; }

    // Financial Totals
    public decimal SubTotal { get; private set; } = 0m;
    public decimal TotalDiscount { get; private set; } = 0m;
    public decimal TotalTaxableAmount { get; private set; } = 0m;
    public decimal TotalVat { get; private set; } = 0m;
    public decimal TotalAmount { get; private set; } = 0m;

    // ZATCA Phase 2 Cryptography & Chaining
    public string PreviousInvoiceHash { get; private set; } = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjhhZDRmMTBkNFZ1";
    public string? InvoiceHash { get; private set; }
    public string? CryptographicStamp { get; private set; }
    public string? QrCodePayload { get; private set; }

    // Associated GL Journal Entry
    public Guid? AssociatedJournalEntryId { get; private set; }
    public string? AssociatedJournalEntryNumber { get; private set; }

    public List<InvoiceLine> Lines { get; private set; } = new();

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private Invoice() { }

    public static Invoice Create(
        Guid tenantId,
        Guid companyId,
        string invoiceNumber,
        DateTime issueDate,
        InvoiceType invoiceType,
        TransactionType transactionType,
        string customerName,
        string? customerVatNumber,
        string? customerCrNumber,
        string? customerAddress,
        string previousInvoiceHash,
        Guid? referenceInvoiceId = null,
        string? referenceInvoiceNumber = null,
        string? modificationReason = null,
        string? createdBy = null)
    {
        return new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            InvoiceNumber = invoiceNumber.Trim(),
            Uuid = Guid.NewGuid(),
            IssueDate = issueDate.Date,
            IssueTime = DateTime.UtcNow.TimeOfDay,
            InvoiceType = invoiceType,
            TransactionType = transactionType,
            Status = InvoiceStatus.Draft,
            Currency = "SAR",
            CustomerName = customerName.Trim(),
            CustomerVatNumber = string.IsNullOrWhiteSpace(customerVatNumber) ? null : customerVatNumber.Trim(),
            CustomerCrNumber = string.IsNullOrWhiteSpace(customerCrNumber) ? null : customerCrNumber.Trim(),
            CustomerAddress = customerAddress?.Trim(),
            PreviousInvoiceHash = string.IsNullOrWhiteSpace(previousInvoiceHash)
                ? "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjhhZDRmMTBkNFZ1"
                : previousInvoiceHash.Trim(),
            ReferenceInvoiceId = referenceInvoiceId,
            ReferenceInvoiceNumber = referenceInvoiceNumber?.Trim(),
            ModificationReason = modificationReason?.Trim(),
            CreatedBy = createdBy,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void AddLine(
        string itemNameAr,
        string? itemNameEn,
        decimal quantity,
        decimal unitPrice,
        decimal discount = 0m,
        decimal vatRate = 15m)
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("لا يمكن تعديل أسطر فاتورة مصدرة أو معتمدة");

        var line = InvoiceLine.Create(
            TenantId,
            Id,
            Lines.Count + 1,
            itemNameAr,
            itemNameEn,
            quantity,
            unitPrice,
            discount,
            vatRate);

        Lines.Add(line);
        RecalculateTotals();
    }

    public void RecalculateTotals()
    {
        SubTotal = Math.Round(Lines.Sum(l => l.SubTotal), 2);
        TotalDiscount = Math.Round(Lines.Sum(l => l.Discount), 2);
        TotalTaxableAmount = Math.Round(Lines.Sum(l => l.TaxableAmount), 2);
        TotalVat = Math.Round(Lines.Sum(l => l.VatAmount), 2);
        TotalAmount = Math.Round(Lines.Sum(l => l.TotalAmount), 2);
    }

    public void SetAssociatedJournalEntry(Guid journalEntryId, string journalEntryNumber)
    {
        AssociatedJournalEntryId = journalEntryId;
        AssociatedJournalEntryNumber = journalEntryNumber;
        LastModifiedAtUtc = DateTime.UtcNow;
    }

    public void SignAndFinalize(string invoiceHash, string cryptographicStamp, string qrCodePayload, string issuedBy)
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("الفاتورة مصدرة بالفعل");

        RecalculateTotals();
        InvoiceHash = invoiceHash;
        CryptographicStamp = cryptographicStamp;
        QrCodePayload = qrCodePayload;
        Status = InvoiceStatus.Issued;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = issuedBy;
    }

    public void UpdateZatcaStatus(InvoiceStatus status)
    {
        Status = status;
        LastModifiedAtUtc = DateTime.UtcNow;
    }
}

public class InvoiceLine : IMustHaveTenant
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public int LineNumber { get; set; }
    public string ItemNameAr { get; set; } = string.Empty;
    public string? ItemNameEn { get; set; }

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal VatRate { get; set; } = 15m;
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public static InvoiceLine Create(
        Guid tenantId,
        Guid invoiceId,
        int lineNumber,
        string itemNameAr,
        string? itemNameEn,
        decimal quantity,
        decimal unitPrice,
        decimal discount,
        decimal vatRate)
    {
        var sub = Math.Round(quantity * unitPrice, 2);
        var taxable = Math.Max(0, sub - discount);
        var vat = Math.Round(taxable * (vatRate / 100m), 2);
        var total = taxable + vat;

        return new InvoiceLine
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceId = invoiceId,
            LineNumber = lineNumber,
            ItemNameAr = itemNameAr.Trim(),
            ItemNameEn = string.IsNullOrWhiteSpace(itemNameEn) ? itemNameAr.Trim() : itemNameEn.Trim(),
            Quantity = quantity,
            UnitPrice = unitPrice,
            SubTotal = sub,
            Discount = discount,
            TaxableAmount = taxable,
            VatRate = vatRate,
            VatAmount = vat,
            TotalAmount = total
        };
    }
}
