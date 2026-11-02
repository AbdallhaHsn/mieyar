using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;

namespace AlRobban.Modules.InvoicingAndZatca.Application.DTOs;

public record PosCashMovementDto(
    Guid Id,
    Guid PosShiftId,
    CashMovementType MovementType,
    decimal Amount,
    string ReasonAr,
    string ReasonEn,
    DateTime CreatedAtUtc,
    string? CreatedBy
);

public record PosShiftDto(
    Guid Id,
    Guid CompanyId,
    string ShiftNumber,
    string CashierUserId,
    string CashierName,
    string TerminalCode,
    Guid? BranchId,
    string BranchName,
    string WarehouseCode,
    string WarehouseName,
    DateTime OpenedAtUtc,
    DateTime? ClosedAtUtc,
    PosShiftStatus Status,
    decimal OpeningFloatCash,
    decimal TotalCashSales,
    decimal TotalMadaSales,
    decimal TotalCreditCardSales,
    decimal TotalSalesAmount,
    decimal TotalTaxAmount,
    int InvoiceCount,
    decimal TotalCashIn,
    decimal TotalCashOut,
    decimal ExpectedCashDrawer,
    decimal ActualClosingCash,
    decimal VarianceAmount,
    string? ClosingNotes,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    List<PosCashMovementDto>? CashMovements = null
);

public record PosReceiptLineDto(
    Guid? ItemId,
    string ItemCode,
    string ItemNameAr,
    string? ItemNameEn,
    decimal Quantity,
    decimal UnitPrice,
    decimal SubTotal,
    decimal Discount,
    decimal TaxableAmount,
    decimal VatAmount,
    decimal TotalAmount
);

public record PosReceiptDto(
    Guid InvoiceId,
    string InvoiceNumber,
    Guid Uuid,
    DateTime IssueDate,
    string IssueTime,
    string CompanyName,
    string CompanyVatNumber,
    string TerminalCode,
    string CashierName,
    string CustomerName,
    PosPaymentMethod PaymentMethod,
    string PaymentMethodNameAr,
    decimal SubTotal,
    decimal TotalDiscount,
    decimal TotalTaxableAmount,
    decimal TotalVat,
    decimal GrandTotal,
    decimal CashReceived,
    decimal ChangeGiven,
    string? QrCodePayload,
    List<PosReceiptLineDto> Lines
);

public record PosFastItemDto(
    Guid Id,
    string ItemCode,
    string? Barcode,
    string NameAr,
    string NameEn,
    decimal SalePrice,
    decimal CostPrice,
    string UnitOfMeasure,
    string CategoryName,
    decimal CurrentStockQuantity,
    string WarehouseCode
);
