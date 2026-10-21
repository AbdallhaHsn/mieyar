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

public record CreateInvoiceRequest(
    Guid? CompanyId,
    InvoiceType InvoiceType,
    TransactionType TransactionType,
    DateTime IssueDate,
    string CustomerName,
    string? CustomerVatNumber,
    string? CustomerCrNumber,
    string? CustomerAddress,
    Guid? ReferenceInvoiceId,
    string? ReferenceInvoiceNumber,
    string? ModificationReason,
    bool AutoIssueAndPost,
    List<CreateInvoiceLineRequest> Lines);

public record CreateInvoiceLineRequest(
    string ItemNameAr,
    string? ItemNameEn,
    decimal Quantity,
    decimal UnitPrice,
    decimal Discount = 0m,
    decimal VatRate = 15m);

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
