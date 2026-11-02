using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class GoodsReceiptNote : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string ReceiptNumber { get; private set; } = string.Empty; // GRN-2026-00001
    public Guid? PurchaseOrderId { get; private set; }
    public string? PurchaseOrderNumber { get; private set; }

    public Guid VendorId { get; private set; }
    public string VendorName { get; private set; } = string.Empty;
    public string? DeliveryNoteNumber { get; private set; } // رقم بوليصة الشحن / سند تسليم المورد

    public DateTime ReceiptDate { get; private set; }
    public string WarehouseCode { get; private set; } = "WH-01";
    public string ReceiverName { get; private set; } = string.Empty; // أمين المستودع المستلم
    public string? InspectorName { get; private set; } // فاحص الجودة

    public GoodsReceiptStatus Status { get; private set; } = GoodsReceiptStatus.Draft;

    public decimal TotalReceivedValue { get; private set; }
    public bool IsInventoryUpdated { get; private set; }

    public Guid? AssociatedJournalEntryId { get; private set; }
    public string? AssociatedJournalEntryNumber { get; private set; }

    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private readonly List<GoodsReceiptNoteLine> _lines = new();
    public IReadOnlyCollection<GoodsReceiptNoteLine> Lines => _lines.AsReadOnly();

    private GoodsReceiptNote() { }

    public static GoodsReceiptNote Create(
        Guid tenantId,
        Guid companyId,
        string receiptNumber,
        Guid vendorId,
        string vendorName,
        DateTime receiptDate,
        string warehouseCode = "WH-01",
        string receiverName = "أمين المستودع",
        string? deliveryNoteNumber = null,
        Guid? purchaseOrderId = null,
        string? purchaseOrderNumber = null,
        string? inspectorName = null,
        string? notes = null,
        string? createdBy = null)
    {
        return new GoodsReceiptNote
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            ReceiptNumber = receiptNumber.Trim().ToUpperInvariant(),
            PurchaseOrderId = purchaseOrderId,
            PurchaseOrderNumber = purchaseOrderNumber?.Trim(),
            VendorId = vendorId,
            VendorName = vendorName.Trim(),
            DeliveryNoteNumber = deliveryNoteNumber?.Trim(),
            ReceiptDate = receiptDate.Date,
            WarehouseCode = string.IsNullOrWhiteSpace(warehouseCode) ? "WH-01" : warehouseCode.Trim(),
            ReceiverName = receiverName.Trim(),
            InspectorName = inspectorName?.Trim(),
            Status = GoodsReceiptStatus.Draft,
            IsInventoryUpdated = false,
            Notes = notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void AddLine(
        string itemNameAr,
        string itemNameEn,
        decimal quantityOrdered,
        decimal quantityReceived,
        decimal quantityAccepted,
        decimal quantityRejected,
        decimal unitCost,
        string unitOfMeasure = "حبة",
        string warehouseCode = "WH-01",
        Guid? itemId = null,
        string? itemCode = null,
        Guid? purchaseOrderLineId = null,
        string? rejectionReason = null,
        string? notes = null)
    {
        if (Status != GoodsReceiptStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن تعديل بنود محضر استلام تم اعتماده.");
        }

        var line = GoodsReceiptNoteLine.Create(
            TenantId,
            Id,
            _lines.Count + 1,
            itemNameAr,
            itemNameEn,
            quantityOrdered,
            quantityReceived,
            quantityAccepted,
            quantityRejected,
            unitCost,
            unitOfMeasure,
            warehouseCode ?? WarehouseCode,
            itemId,
            itemCode,
            purchaseOrderLineId,
            rejectionReason,
            notes);

        _lines.Add(line);
        RecalculateTotals();
    }

    public void ClearLines()
    {
        if (Status != GoodsReceiptStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن تعديل بنود محضر استلام خارج حالة المسودة.");
        }
        _lines.Clear();
        RecalculateTotals();
    }

    public void RecalculateTotals()
    {
        TotalReceivedValue = Math.Round(_lines.Sum(l => l.TotalValue), 4);
    }

    public void AcceptAndPost(string? postedBy = null)
    {
        if (Status != GoodsReceiptStatus.Draft)
            throw new InvalidOperationException("محضر الاستلام معتمد مسبقاً.");

        if (!_lines.Any())
            throw new InvalidOperationException("لا يمكن اعتماد محضر استلام بدون بنود.");

        var anyRejected = _lines.Any(l => l.QuantityRejected > 0);
        Status = anyRejected ? GoodsReceiptStatus.PartiallyAccepted : GoodsReceiptStatus.Accepted;
        IsInventoryUpdated = true;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = postedBy;
    }

    public void Reject(string? reason = null, string? rejectedBy = null)
    {
        Status = GoodsReceiptStatus.Rejected;
        Notes = (Notes + " " + reason).Trim();
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = rejectedBy;
    }

    public void LinkAccountingEntry(Guid journalEntryId, string journalEntryNumber)
    {
        AssociatedJournalEntryId = journalEntryId;
        AssociatedJournalEntryNumber = journalEntryNumber;
        LastModifiedAtUtc = DateTime.UtcNow;
    }
}
