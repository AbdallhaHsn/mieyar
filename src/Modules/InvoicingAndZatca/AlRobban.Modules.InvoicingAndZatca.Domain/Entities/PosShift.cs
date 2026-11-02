using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.InvoicingAndZatca.Domain.Entities;

public class PosShift : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }

    public string ShiftNumber { get; private set; } = string.Empty; // SHF-20261024-001
    public string CashierUserId { get; private set; } = string.Empty;
    public string CashierName { get; private set; } = string.Empty;
    public string TerminalCode { get; private set; } = "POS-01";
    public Guid? BranchId { get; private set; }
    public string BranchName { get; private set; } = "الفرع الرئيسي";
    public string WarehouseCode { get; private set; } = "WH-MAIN";
    public string WarehouseName { get; private set; } = "المستودع الرئيسي";

    public DateTime OpenedAtUtc { get; private set; } = DateTime.UtcNow;
    public DateTime? ClosedAtUtc { get; private set; }
    public PosShiftStatus Status { get; private set; } = PosShiftStatus.Open;

    // Cash Drawer & Sales Totals
    public decimal OpeningFloatCash { get; private set; }
    public decimal TotalCashSales { get; private set; }
    public decimal TotalMadaSales { get; private set; }
    public decimal TotalCreditCardSales { get; private set; }
    public decimal TotalSalesAmount => TotalCashSales + TotalMadaSales + TotalCreditCardSales;
    public decimal TotalTaxAmount { get; private set; }
    public int InvoiceCount { get; private set; }

    // Cash In / Out movements during shift
    public decimal TotalCashIn { get; private set; }
    public decimal TotalCashOut { get; private set; }

    // Reconciliation
    public decimal ExpectedCashDrawer => OpeningFloatCash + TotalCashSales + TotalCashIn - TotalCashOut;
    public decimal ActualClosingCash { get; private set; }
    public decimal VarianceAmount { get; private set; } // Actual - Expected (Shortage or Overage)

    public string? ClosingNotes { get; private set; }

    // GL Linkage on Shift Closing
    public Guid? JournalEntryId { get; private set; }
    public string? JournalEntryNumber { get; private set; }

    // Audit
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }

    private readonly List<PosCashMovement> _cashMovements = new();
    public IReadOnlyCollection<PosCashMovement> CashMovements => _cashMovements.AsReadOnly();

    private PosShift() { }

    public static PosShift Open(
        Guid tenantId,
        Guid companyId,
        string shiftNumber,
        string cashierUserId,
        string cashierName,
        string terminalCode,
        decimal openingFloatCash,
        string warehouseCode = "WH-MAIN",
        string warehouseName = "المستودع الرئيسي",
        Guid? branchId = null,
        string branchName = "الفرع الرئيسي",
        string? createdBy = null)
    {
        return new PosShift
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            ShiftNumber = shiftNumber.Trim().ToUpperInvariant(),
            CashierUserId = cashierUserId,
            CashierName = cashierName.Trim(),
            TerminalCode = string.IsNullOrWhiteSpace(terminalCode) ? "POS-01" : terminalCode.Trim().ToUpperInvariant(),
            OpeningFloatCash = Math.Max(0, openingFloatCash),
            WarehouseCode = warehouseCode,
            WarehouseName = warehouseName,
            BranchId = branchId,
            BranchName = branchName,
            Status = PosShiftStatus.Open,
            OpenedAtUtc = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy ?? cashierName
        };
    }

    public void RecordSale(
        PosPaymentMethod method,
        decimal totalAmount,
        decimal taxAmount,
        decimal cashPart = 0,
        decimal madaPart = 0)
    {
        if (Status != PosShiftStatus.Open)
            throw new InvalidOperationException("لا يمكن تسجيل مبيعات في وردية مغلقة.");

        switch (method)
        {
            case PosPaymentMethod.Cash:
                TotalCashSales += totalAmount;
                break;
            case PosPaymentMethod.Mada:
                TotalMadaSales += totalAmount;
                break;
            case PosPaymentMethod.CreditCard:
                TotalCreditCardSales += totalAmount;
                break;
            case PosPaymentMethod.Split:
                TotalCashSales += cashPart;
                TotalMadaSales += madaPart;
                break;
        }

        TotalTaxAmount += taxAmount;
        InvoiceCount++;
        LastModifiedAtUtc = DateTime.UtcNow;
    }

    public void AddCashMovement(CashMovementType type, decimal amount, string reasonAr, string? reasonEn = null, string? createdBy = null)
    {
        if (Status != PosShiftStatus.Open)
            throw new InvalidOperationException("لا يمكن إضافة حركة نقدية في وردية مغلقة.");

        var movement = PosCashMovement.Create(Id, type, amount, reasonAr, reasonEn, createdBy ?? CashierName);
        _cashMovements.Add(movement);

        if (type == CashMovementType.CashIn)
        {
            TotalCashIn += Math.Abs(amount);
        }
        else
        {
            TotalCashOut += Math.Abs(amount);
        }

        LastModifiedAtUtc = DateTime.UtcNow;
    }

    public void CloseShift(decimal actualClosingCash, string? notes = null, string? closedBy = null)
    {
        if (Status != PosShiftStatus.Open)
            throw new InvalidOperationException("الوردية مغلقة بالفعل.");

        ActualClosingCash = Math.Max(0, actualClosingCash);
        VarianceAmount = ActualClosingCash - ExpectedCashDrawer;
        ClosingNotes = notes;
        ClosedAtUtc = DateTime.UtcNow;
        Status = PosShiftStatus.Closed;
        LastModifiedAtUtc = DateTime.UtcNow;
        LastModifiedBy = closedBy ?? CashierName;
    }

    public void LinkJournalEntry(Guid journalEntryId, string journalEntryNumber)
    {
        JournalEntryId = journalEntryId;
        JournalEntryNumber = journalEntryNumber;
        LastModifiedAtUtc = DateTime.UtcNow;
    }
}
