using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.Purchasing.Domain.Entities;

public class PurchaseOrder : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string OrderNumber { get; private set; } = string.Empty; // PO-2026-00001
    public Guid? RequisitionId { get; private set; }
    public string? RequisitionNumber { get; private set; }

    public Guid VendorId { get; private set; }
    public string VendorName { get; private set; } = string.Empty;
    public string? VendorVatNumber { get; private set; }
    public string? VendorCrNumber { get; private set; }

    public DateTime OrderDate { get; private set; }
    public DateTime? ExpectedDeliveryDate { get; private set; }

    public string PaymentTerms { get; private set; } = "30 Days Credit";
    public string Currency { get; private set; } = "SAR";
    public decimal ExchangeRateToSar { get; private set; } = 1.0000m;

    public string BranchCode { get; private set; } = "01";
    public string WarehouseCode { get; private set; } = "WH-01";
    public Guid? CostCenterId { get; private set; }

    public PurchaseOrderStatus Status { get; private set; } = PurchaseOrderStatus.Draft;

    public decimal SubTotal { get; private set; }
    public decimal TotalDiscount { get; private set; }
    public decimal TotalTaxableAmount { get; private set; }
    public decimal TotalVat { get; private set; }
    public decimal TotalAmount { get; private set; }

    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private readonly List<PurchaseOrderLine> _lines = new();
    public IReadOnlyCollection<PurchaseOrderLine> Lines => _lines.AsReadOnly();

    private PurchaseOrder() { }

    public static PurchaseOrder Create(
        Guid tenantId,
        Guid companyId,
        string orderNumber,
        Guid vendorId,
        string vendorName,
        string? vendorVatNumber,
        string? vendorCrNumber,
        DateTime orderDate,
        DateTime? expectedDeliveryDate = null,
        Guid? requisitionId = null,
        string? requisitionNumber = null,
        string paymentTerms = "30 Days Credit",
        string currency = "SAR",
        decimal exchangeRateToSar = 1.0000m,
        string branchCode = "01",
        string warehouseCode = "WH-01",
        Guid? costCenterId = null,
        string? notes = null,
        string? createdBy = null)
    {
        return new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            OrderNumber = orderNumber.Trim().ToUpperInvariant(),
            VendorId = vendorId,
            VendorName = vendorName.Trim(),
            VendorVatNumber = vendorVatNumber?.Trim(),
            VendorCrNumber = vendorCrNumber?.Trim(),
            OrderDate = orderDate.Date,
            ExpectedDeliveryDate = expectedDeliveryDate?.Date,
            RequisitionId = requisitionId,
            RequisitionNumber = requisitionNumber?.Trim(),
            PaymentTerms = string.IsNullOrWhiteSpace(paymentTerms) ? "30 Days Credit" : paymentTerms.Trim(),
            Currency = string.IsNullOrWhiteSpace(currency) ? "SAR" : currency.Trim().ToUpperInvariant(),
            ExchangeRateToSar = exchangeRateToSar > 0 ? exchangeRateToSar : 1.0000m,
            BranchCode = branchCode,
            WarehouseCode = warehouseCode,
            CostCenterId = costCenterId,
            Status = PurchaseOrderStatus.Draft,
            Notes = notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy
        };
    }

    public void AddLine(
        string itemNameAr,
        string itemNameEn,
        decimal quantityOrdered,
        decimal unitPrice,
        decimal discountAmount = 0,
        decimal vatRate = 15.00m,
        string unitOfMeasure = "حبة",
        Guid? itemId = null,
        string? itemCode = null,
        string? warehouseCode = null,
        Guid? costCenterId = null,
        string? notes = null)
    {
        if (Status != PurchaseOrderStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن تعديل بنود أمر شراء خارج حالة المسودة.");
        }

        var line = PurchaseOrderLine.Create(
            TenantId,
            Id,
            _lines.Count + 1,
            itemNameAr,
            itemNameEn,
            quantityOrdered,
            unitPrice,
            discountAmount,
            vatRate,
            unitOfMeasure,
            itemId,
            itemCode,
            warehouseCode ?? WarehouseCode,
            costCenterId ?? CostCenterId,
            notes);

        _lines.Add(line);
        RecalculateTotals();
    }

    public void ClearLines()
    {
        if (Status != PurchaseOrderStatus.Draft)
        {
            throw new InvalidOperationException("لا يمكن تعديل بنود أمر شراء خارج حالة المسودة.");
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

    public void Confirm(string? confirmedBy = null)
    {
        if (Status != PurchaseOrderStatus.Draft)
            throw new InvalidOperationException("أمر الشراء مؤكد مسبقاً.");

        if (!_lines.Any())
            throw new InvalidOperationException("لا يمكن تأكيد أمر شراء بدون بنود.");

        Status = PurchaseOrderStatus.Confirmed;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = confirmedBy;
    }

    public void UpdateDeliveryAndBillingStatus()
    {
        var totalOrdered = _lines.Sum(l => l.QuantityOrdered);
        var totalReceived = _lines.Sum(l => l.QuantityReceived);
        var totalBilled = _lines.Sum(l => l.QuantityBilled);

        if (totalReceived >= totalOrdered && totalOrdered > 0)
        {
            Status = totalBilled >= totalOrdered ? PurchaseOrderStatus.Billed : PurchaseOrderStatus.FullyReceived;
        }
        else if (totalReceived > 0)
        {
            Status = PurchaseOrderStatus.PartiallyReceived;
        }

        LastModifiedAtUtc = DateTime.UtcNow;
    }

    public void Cancel(string? cancelledBy = null)
    {
        Status = PurchaseOrderStatus.Cancelled;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = cancelledBy;
    }
}
