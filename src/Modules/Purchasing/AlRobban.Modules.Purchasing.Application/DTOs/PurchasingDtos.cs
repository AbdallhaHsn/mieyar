using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;

namespace AlRobban.Modules.Purchasing.Application.DTOs;

public record ItemDto(
    Guid Id,
    Guid CompanyId,
    string ItemCode,
    string? Barcode,
    string NameAr,
    string NameEn,
    ItemType ItemType,
    string UnitOfMeasure,
    decimal PurchasePrice,
    decimal SalePrice,
    decimal CostPrice,
    Guid? InventoryAccountId,
    Guid? CogsAccountId,
    Guid? RevenueAccountId,
    decimal CurrentStockQuantity,
    decimal MinStockLevel,
    bool IsActive,
    DateTime CreatedAtUtc
)
{
    public static ItemDto FromEntity(Item item) => new(
        item.Id,
        item.CompanyId,
        item.ItemCode,
        item.Barcode,
        item.NameAr,
        item.NameEn,
        item.ItemType,
        item.UnitOfMeasure,
        item.PurchasePrice,
        item.SalePrice,
        item.CostPrice,
        item.InventoryAccountId,
        item.CogsAccountId,
        item.RevenueAccountId,
        item.CurrentStockQuantity,
        item.MinStockLevel,
        item.IsActive,
        item.CreatedAtUtc
    );
}

public record PurchaseInvoiceLineDto(
    Guid Id,
    int LineNumber,
    Guid? ItemId,
    string? ItemCode,
    string ItemNameAr,
    string ItemNameEn,
    Guid AccountId,
    Guid? CostCenterId,
    decimal Quantity,
    decimal UnitPrice,
    decimal SubTotal,
    decimal DiscountAmount,
    decimal TaxableAmount,
    decimal VatRate,
    decimal VatAmount,
    decimal TotalAmount
)
{
    public static PurchaseInvoiceLineDto FromEntity(PurchaseInvoiceLine l) => new(
        l.Id,
        l.LineNumber,
        l.ItemId,
        l.Item?.ItemCode,
        l.ItemNameAr,
        l.ItemNameEn,
        l.AccountId,
        l.CostCenterId,
        l.Quantity,
        l.UnitPrice,
        l.SubTotal,
        l.DiscountAmount,
        l.TaxableAmount,
        l.VatRate,
        l.VatAmount,
        l.TotalAmount
    );
}

public record PurchaseInvoiceDto(
    Guid Id,
    Guid CompanyId,
    string InvoiceNumber,
    string? VendorInvoiceNumber,
    Guid VendorId,
    string VendorName,
    string? VendorVatNumber,
    string? VendorCrNumber,
    DateTime IssueDate,
    DateTime? DueDate,
    string Currency,
    decimal ExchangeRateToSar,
    decimal SubTotal,
    decimal TotalDiscount,
    decimal TotalTaxableAmount,
    decimal TotalVat,
    decimal TotalAmount,
    PurchaseInvoiceStatus Status,
    PurchasePaymentStatus PaymentStatus,
    string PaymentStatusAr,
    decimal PaidAmount,
    decimal RemainingAmount,
    Guid? PurchaseOrderId,
    string? PurchaseOrderNumber,
    Guid? GoodsReceiptNoteId,
    string? GoodsReceiptNoteNumber,
    ThreeWayMatchingStatus MatchingStatus,
    string MatchingStatusAr,
    Guid? AssociatedJournalEntryId,
    string? AssociatedJournalEntryNumber,
    string? Notes,
    DateTime CreatedAtUtc,
    List<PurchaseInvoiceLineDto> Lines
)
{
    public static PurchaseInvoiceDto FromEntity(PurchaseInvoice inv)
    {
        var paymentStatusAr = inv.PaymentStatus switch
        {
            PurchasePaymentStatus.Paid => "مسددة بالكامل",
            PurchasePaymentStatus.PartiallyPaid => "مسددة جزئياً",
            _ => "غير مسددة (آجلة)"
        };
        var remaining = Math.Max(0, inv.TotalAmount - inv.PaidAmount);

        var matchingStatusAr = inv.MatchingStatus switch
        {
            ThreeWayMatchingStatus.Matched => "مطابقة تامة 100%",
            ThreeWayMatchingStatus.PriceVariance => "فرق في السعر",
            ThreeWayMatchingStatus.QuantityVariance => "فرق في الكمية",
            ThreeWayMatchingStatus.ManualApproval => "اعتماد استثنائي",
            _ => "بانتظار المطابقة"
        };

        return new(
            inv.Id,
            inv.CompanyId,
            inv.InvoiceNumber,
            inv.VendorInvoiceNumber,
            inv.VendorId,
            inv.VendorName,
            inv.VendorVatNumber,
            inv.VendorCrNumber,
            inv.IssueDate,
            inv.DueDate,
            inv.Currency,
            inv.ExchangeRateToSar,
            inv.SubTotal,
            inv.TotalDiscount,
            inv.TotalTaxableAmount,
            inv.TotalVat,
            inv.TotalAmount,
            inv.Status,
            inv.PaymentStatus,
            paymentStatusAr,
            inv.PaidAmount,
            remaining,
            inv.PurchaseOrderId,
            inv.PurchaseOrderNumber,
            inv.GoodsReceiptNoteId,
            inv.GoodsReceiptNoteNumber,
            inv.MatchingStatus,
            matchingStatusAr,
            inv.AssociatedJournalEntryId,
            inv.AssociatedJournalEntryNumber,
            inv.Notes,
            inv.CreatedAtUtc,
            inv.Lines.Select(PurchaseInvoiceLineDto.FromEntity).ToList()
        );
    }
}

public record InventoryTransactionDto(
    Guid Id,
    Guid ItemId,
    string ItemCode,
    string ItemNameAr,
    DateTime TransactionDate,
    InventoryMovementType MovementType,
    decimal QuantityIn,
    decimal QuantityOut,
    decimal UnitCost,
    decimal TotalCost,
    decimal BalanceAfterQuantity,
    string? ReferenceType,
    string? ReferenceNumber,
    string? Notes,
    DateTime CreatedAtUtc,
    Guid? WarehouseId = null,
    string? WarehouseCode = null
);

public record ItemWarehouseStockDto(
    Guid Id,
    Guid ItemId,
    string ItemCode,
    string ItemNameAr,
    string ItemNameEn,
    Guid WarehouseId,
    string WarehouseCode,
    string WarehouseNameAr,
    string WarehouseNameEn,
    decimal Quantity,
    decimal CostPrice,
    decimal TotalValue,
    decimal MinStockLevel,
    decimal MaxStockLevel,
    string? BinLocation,
    DateTime? LastMovementAtUtc
);

public record PurchaseKpisDto(
    int TotalInvoicesCount,
    decimal TotalPurchasesAmount,
    decimal TotalInputVatAmount,
    decimal TotalUnpaidAmount,
    int TotalItemsCount,
    decimal TotalStockValuation
);

// -------------------------------------------------------------
// Purchase Requisitions DTOs (طلبات الشراء الداخلية)
// -------------------------------------------------------------
public record PurchaseRequisitionLineDto(
    Guid Id,
    int LineNumber,
    Guid? ItemId,
    string ItemCode,
    string ItemNameAr,
    string ItemNameEn,
    string UnitOfMeasure,
    decimal QuantityRequested,
    decimal EstimatedUnitPrice,
    decimal EstimatedTotal,
    string? WarehouseCode,
    Guid? CostCenterId,
    string? Notes
)
{
    public static PurchaseRequisitionLineDto FromEntity(PurchaseRequisitionLine l) => new(
        l.Id,
        l.LineNumber,
        l.ItemId,
        l.ItemCode,
        l.ItemNameAr,
        l.ItemNameEn,
        l.UnitOfMeasure,
        l.QuantityRequested,
        l.EstimatedUnitPrice,
        l.EstimatedTotal,
        l.WarehouseCode,
        l.CostCenterId,
        l.Notes
    );
}

public record PurchaseRequisitionDto(
    Guid Id,
    Guid CompanyId,
    string RequisitionNumber,
    string Title,
    string DepartmentName,
    string RequesterName,
    DateTime RequestDate,
    DateTime? RequiredByDate,
    RequisitionStatus Status,
    string StatusAr,
    RequisitionPriority Priority,
    string PriorityAr,
    Guid? CostCenterId,
    string? ProjectCode,
    string? Reason,
    string? ApprovalNotes,
    decimal TotalEstimatedAmount,
    Guid? ConvertedToPoId,
    string? ConvertedToPoNumber,
    DateTime CreatedAtUtc,
    List<PurchaseRequisitionLineDto> Lines
)
{
    public static PurchaseRequisitionDto FromEntity(PurchaseRequisition r)
    {
        var statusAr = r.Status switch
        {
            RequisitionStatus.Draft => "مسودة",
            RequisitionStatus.Submitted => "بانتظار الاعتماد",
            RequisitionStatus.Approved => "معتمد",
            RequisitionStatus.Rejected => "مرفوض",
            RequisitionStatus.ConvertedToPo => "تم إصدار أمر الشراء",
            _ => "ملغي"
        };

        var priorityAr = r.Priority switch
        {
            RequisitionPriority.Low => "منخفض",
            RequisitionPriority.High => "عاجل",
            RequisitionPriority.Urgent => "طارئ جداً",
            _ => "عادي"
        };

        return new(
            r.Id,
            r.CompanyId,
            r.RequisitionNumber,
            r.Title,
            r.DepartmentName,
            r.RequesterName,
            r.RequestDate,
            r.RequiredByDate,
            r.Status,
            statusAr,
            r.Priority,
            priorityAr,
            r.CostCenterId,
            r.ProjectCode,
            r.Reason,
            r.ApprovalNotes,
            r.TotalEstimatedAmount,
            r.ConvertedToPoId,
            r.ConvertedToPoNumber,
            r.CreatedAtUtc,
            r.Lines.Select(PurchaseRequisitionLineDto.FromEntity).ToList()
        );
    }
}

// -------------------------------------------------------------
// Purchase Orders DTOs (أوامر الشراء الرسمية المعتمدة)
// -------------------------------------------------------------
public record PurchaseOrderLineDto(
    Guid Id,
    int LineNumber,
    Guid? ItemId,
    string ItemCode,
    string ItemNameAr,
    string ItemNameEn,
    string UnitOfMeasure,
    decimal QuantityOrdered,
    decimal QuantityReceived,
    decimal QuantityBilled,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal SubTotal,
    decimal TaxableAmount,
    decimal VatRate,
    decimal VatAmount,
    decimal TotalAmount,
    string? WarehouseCode,
    Guid? CostCenterId,
    string? Notes
)
{
    public static PurchaseOrderLineDto FromEntity(PurchaseOrderLine l) => new(
        l.Id,
        l.LineNumber,
        l.ItemId,
        l.ItemCode,
        l.ItemNameAr,
        l.ItemNameEn,
        l.UnitOfMeasure,
        l.QuantityOrdered,
        l.QuantityReceived,
        l.QuantityBilled,
        l.UnitPrice,
        l.DiscountAmount,
        l.SubTotal,
        l.TaxableAmount,
        l.VatRate,
        l.VatAmount,
        l.TotalAmount,
        l.WarehouseCode,
        l.CostCenterId,
        l.Notes
    );
}

public record PurchaseOrderDto(
    Guid Id,
    Guid CompanyId,
    string OrderNumber,
    Guid? RequisitionId,
    string? RequisitionNumber,
    Guid VendorId,
    string VendorName,
    string? VendorVatNumber,
    string? VendorCrNumber,
    DateTime OrderDate,
    DateTime? ExpectedDeliveryDate,
    string PaymentTerms,
    string Currency,
    decimal ExchangeRateToSar,
    string BranchCode,
    string WarehouseCode,
    Guid? CostCenterId,
    PurchaseOrderStatus Status,
    string StatusAr,
    decimal SubTotal,
    decimal TotalDiscount,
    decimal TotalTaxableAmount,
    decimal TotalVat,
    decimal TotalAmount,
    decimal ReceivedProgressPercent,
    decimal BilledProgressPercent,
    string? Notes,
    DateTime CreatedAtUtc,
    List<PurchaseOrderLineDto> Lines
)
{
    public static PurchaseOrderDto FromEntity(PurchaseOrder po)
    {
        var statusAr = po.Status switch
        {
            PurchaseOrderStatus.Draft => "مسودة",
            PurchaseOrderStatus.Confirmed => "معتمد ومرسل للمورد",
            PurchaseOrderStatus.PartiallyReceived => "استلام جزئي",
            PurchaseOrderStatus.FullyReceived => "مستلم بالكامل",
            PurchaseOrderStatus.Billed => "مفوتر بالكامل",
            _ => "ملغي"
        };

        var totalOrdered = po.Lines.Sum(l => l.QuantityOrdered);
        var totalReceived = po.Lines.Sum(l => l.QuantityReceived);
        var totalBilled = po.Lines.Sum(l => l.QuantityBilled);

        var receivedPercent = totalOrdered > 0 ? Math.Round((totalReceived / totalOrdered) * 100m, 1) : 0;
        var billedPercent = totalOrdered > 0 ? Math.Round((totalBilled / totalOrdered) * 100m, 1) : 0;

        return new(
            po.Id,
            po.CompanyId,
            po.OrderNumber,
            po.RequisitionId,
            po.RequisitionNumber,
            po.VendorId,
            po.VendorName,
            po.VendorVatNumber,
            po.VendorCrNumber,
            po.OrderDate,
            po.ExpectedDeliveryDate,
            po.PaymentTerms,
            po.Currency,
            po.ExchangeRateToSar,
            po.BranchCode,
            po.WarehouseCode,
            po.CostCenterId,
            po.Status,
            statusAr,
            po.SubTotal,
            po.TotalDiscount,
            po.TotalTaxableAmount,
            po.TotalVat,
            po.TotalAmount,
            receivedPercent,
            billedPercent,
            po.Notes,
            po.CreatedAtUtc,
            po.Lines.Select(PurchaseOrderLineDto.FromEntity).ToList()
        );
    }
}

// -------------------------------------------------------------
// Goods Receipt Notes DTOs (محاضر الاستلام المخزني)
// -------------------------------------------------------------
public record GoodsReceiptNoteLineDto(
    Guid Id,
    int LineNumber,
    Guid? PurchaseOrderLineId,
    Guid? ItemId,
    string ItemCode,
    string ItemNameAr,
    string ItemNameEn,
    string UnitOfMeasure,
    decimal QuantityOrdered,
    decimal QuantityReceived,
    decimal QuantityAccepted,
    decimal QuantityRejected,
    string? RejectionReason,
    decimal UnitCost,
    decimal TotalValue,
    string WarehouseCode,
    string? Notes
)
{
    public static GoodsReceiptNoteLineDto FromEntity(GoodsReceiptNoteLine l) => new(
        l.Id,
        l.LineNumber,
        l.PurchaseOrderLineId,
        l.ItemId,
        l.ItemCode,
        l.ItemNameAr,
        l.ItemNameEn,
        l.UnitOfMeasure,
        l.QuantityOrdered,
        l.QuantityReceived,
        l.QuantityAccepted,
        l.QuantityRejected,
        l.RejectionReason,
        l.UnitCost,
        l.TotalValue,
        l.WarehouseCode,
        l.Notes
    );
}

public record GoodsReceiptNoteDto(
    Guid Id,
    Guid CompanyId,
    string ReceiptNumber,
    Guid? PurchaseOrderId,
    string? PurchaseOrderNumber,
    Guid VendorId,
    string VendorName,
    string? DeliveryNoteNumber,
    DateTime ReceiptDate,
    string WarehouseCode,
    string ReceiverName,
    string? InspectorName,
    GoodsReceiptStatus Status,
    string StatusAr,
    decimal TotalReceivedValue,
    bool IsInventoryUpdated,
    Guid? AssociatedJournalEntryId,
    string? AssociatedJournalEntryNumber,
    string? Notes,
    DateTime CreatedAtUtc,
    List<GoodsReceiptNoteLineDto> Lines
)
{
    public static GoodsReceiptNoteDto FromEntity(GoodsReceiptNote g)
    {
        var statusAr = g.Status switch
        {
            GoodsReceiptStatus.Draft => "مسودة فحص",
            GoodsReceiptStatus.Accepted => "مقبول ومرحل للمستودع",
            GoodsReceiptStatus.PartiallyAccepted => "مقبول جزئياً",
            _ => "مرفوض"
        };

        return new(
            g.Id,
            g.CompanyId,
            g.ReceiptNumber,
            g.PurchaseOrderId,
            g.PurchaseOrderNumber,
            g.VendorId,
            g.VendorName,
            g.DeliveryNoteNumber,
            g.ReceiptDate,
            g.WarehouseCode,
            g.ReceiverName,
            g.InspectorName,
            g.Status,
            statusAr,
            g.TotalReceivedValue,
            g.IsInventoryUpdated,
            g.AssociatedJournalEntryId,
            g.AssociatedJournalEntryNumber,
            g.Notes,
            g.CreatedAtUtc,
            g.Lines.Select(GoodsReceiptNoteLineDto.FromEntity).ToList()
        );
    }
}

// -------------------------------------------------------------
// 3-Way Matching Comparison DTO (المطابقة الثلاثية الذكية)
// -------------------------------------------------------------
public record ThreeWayMatchLineComparisonDto(
    int LineNumber,
    string ItemCode,
    string ItemNameAr,
    decimal OrderedQuantity,
    decimal ReceivedQuantity,
    decimal InvoicedQuantity,
    decimal OrderedUnitPrice,
    decimal InvoicedUnitPrice,
    decimal PriceVariance,
    decimal QuantityVariance,
    bool IsMatched
);

public record ThreeWayMatchComparisonDto(
    Guid? PurchaseOrderId,
    string? PurchaseOrderNumber,
    Guid? GoodsReceiptNoteId,
    string? GoodsReceiptNoteNumber,
    Guid? InvoiceId,
    string? InvoiceNumber,
    ThreeWayMatchingStatus Status,
    string StatusAr,
    decimal TotalPoAmount,
    decimal TotalGrnAmount,
    decimal TotalInvoiceAmount,
    decimal NetVarianceAmount,
    bool IsFullyMatched,
    List<ThreeWayMatchLineComparisonDto> Lines
);
