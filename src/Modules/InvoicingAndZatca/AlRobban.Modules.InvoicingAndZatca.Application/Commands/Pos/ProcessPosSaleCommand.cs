using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Application.Services;
using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Commands.Pos;

public record PosSaleItemLineRequest(
    Guid? ItemId,
    string ItemCode,
    string ItemNameAr,
    string? ItemNameEn,
    decimal Quantity,
    decimal UnitPrice,
    decimal Discount = 0m,
    string? WarehouseCode = "WH-MAIN"
);

public record ProcessPosSaleCommand(
    Guid CompanyId,
    Guid? PosShiftId,
    string TerminalCode,
    string CashierName,
    PosPaymentMethod PaymentMethod,
    List<PosSaleItemLineRequest> Lines,
    decimal CashReceived = 0m,
    decimal ChangeGiven = 0m,
    decimal CashPart = 0m,
    decimal MadaPart = 0m,
    string? CustomerName = "عميل نقدي",
    string? CustomerVatNumber = null,
    string? WarehouseCode = "WH-MAIN"
) : IRequest<Result<PosReceiptDto>>;

public class ProcessPosSaleCommandHandler : IRequestHandler<ProcessPosSaleCommand, Result<PosReceiptDto>>
{
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly IPosShiftRepository _shiftRepo;
    private readonly IInvoiceCryptoService _cryptoService;
    private readonly IAccountRepository _accountRepo;
    private readonly ICurrentTenantContext _tenantContext;
    private readonly IMediator _mediator;
    private readonly IWarehouseRepository? _warehouseRepo;
    private readonly IItemRepository? _itemRepo;
    private readonly IInventoryTransactionRepository? _invTxRepo;
    private readonly IItemWarehouseStockRepository? _stockRepo;

    public ProcessPosSaleCommandHandler(
        IInvoiceRepository invoiceRepo,
        IPosShiftRepository shiftRepo,
        IInvoiceCryptoService cryptoService,
        IAccountRepository accountRepo,
        ICurrentTenantContext tenantContext,
        IMediator mediator,
        IWarehouseRepository? warehouseRepo = null,
        IItemRepository? itemRepo = null,
        IInventoryTransactionRepository? invTxRepo = null,
        IItemWarehouseStockRepository? stockRepo = null)
    {
        _invoiceRepo = invoiceRepo;
        _shiftRepo = shiftRepo;
        _cryptoService = cryptoService;
        _accountRepo = accountRepo;
        _tenantContext = tenantContext;
        _mediator = mediator;
        _warehouseRepo = warehouseRepo;
        _itemRepo = itemRepo;
        _invTxRepo = invTxRepo;
        _stockRepo = stockRepo;
    }

    public async Task<Result<PosReceiptDto>> Handle(ProcessPosSaleCommand request, CancellationToken cancellationToken)
    {
        if (request.Lines == null || !request.Lines.Any())
        {
            return Result.Failure<PosReceiptDto>(Error.Validation("Pos.EmptyCart", "سلة المشتريات فارغة. يرجى إضافة صنف واحد على الأقل."));
        }

        var tenantId = _tenantContext.TenantId.GetValueOrDefault();
        if (tenantId == Guid.Empty)
        {
            tenantId = request.CompanyId != Guid.Empty ? request.CompanyId : Guid.Parse("11111111-1111-1111-1111-111111111111");
        }

        var prevHash = await _invoiceRepo.GetLastInvoiceHashAsync(request.CompanyId, cancellationToken);
        if (string.IsNullOrWhiteSpace(prevHash))
        {
            prevHash = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjhhZDRmMTBkNFZ1";
        }

        var timestamp = DateTime.UtcNow;
        var invoiceNumber = $"POS-{timestamp:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 4).ToUpperInvariant()}";

        var invoice = Invoice.Create(
            tenantId: tenantId,
            companyId: request.CompanyId,
            invoiceNumber: invoiceNumber,
            issueDate: timestamp.Date,
            invoiceType: InvoiceType.Simplified,
            transactionType: TransactionType.Invoice,
            customerName: string.IsNullOrWhiteSpace(request.CustomerName) ? "عميل نقدي" : request.CustomerName.Trim(),
            customerVatNumber: request.CustomerVatNumber,
            customerCrNumber: null,
            customerAddress: null,
            previousInvoiceHash: prevHash,
            warehouseCode: request.WarehouseCode ?? "WH-MAIN",
            createdBy: request.CashierName
        );

        var lineDtos = new List<PosReceiptLineDto>();

        foreach (var item in request.Lines)
        {
            var lineSubTotal = item.Quantity * item.UnitPrice;
            var lineTaxable = Math.Max(0, lineSubTotal - item.Discount);
            var lineVat = Math.Round(lineTaxable * 0.15m, 4);
            var lineTotal = lineTaxable + lineVat;

            invoice.AddLine(
                itemNameAr: item.ItemNameAr,
                itemNameEn: item.ItemNameEn,
                quantity: item.Quantity,
                unitPrice: item.UnitPrice,
                discount: item.Discount,
                vatRate: 15.0m,
                itemId: item.ItemId,
                warehouseCode: item.WarehouseCode ?? request.WarehouseCode ?? "WH-MAIN"
            );

            lineDtos.Add(new PosReceiptLineDto(
                item.ItemId,
                item.ItemCode,
                item.ItemNameAr,
                item.ItemNameEn,
                item.Quantity,
                item.UnitPrice,
                lineSubTotal,
                item.Discount,
                lineTaxable,
                lineVat,
                lineTotal
            ));
        }

        invoice.SetPosDetails(
            request.PosShiftId ?? Guid.Empty,
            request.TerminalCode,
            request.PaymentMethod,
            request.CashReceived,
            request.ChangeGiven
        );

        // ZATCA Phase 2 Cryptography & QR Code
        var invoiceHash = _cryptoService.ComputeSha256Hash($"{invoice.InvoiceNumber}|{invoice.TotalAmount:F2}|{timestamp:O}");
        var stamp = $"ZATCA_SIMPLIFIED_STAMP_{Guid.NewGuid().ToString("N").Substring(0, 16)}";
        
        var qrCodePayload = _cryptoService.GenerateZatcaQrCode(
            sellerName: "شركة الربان للحلول المحاسبية المتكاملة",
            sellerVat: "310123456700003",
            timestamp: timestamp,
            totalAmount: invoice.TotalAmount,
            vatAmount: invoice.TotalVat,
            invoiceHash: invoiceHash
        );

        invoice.SignAndFinalize(invoiceHash, stamp, qrCodePayload, request.CashierName);
        invoice.RecordPayment(invoice.TotalAmount);

        // Update active POS Shift
        if (request.PosShiftId.HasValue && request.PosShiftId.Value != Guid.Empty)
        {
            var shift = await _shiftRepo.GetByIdAsync(request.PosShiftId.Value, cancellationToken);
            if (shift != null && shift.Status == PosShiftStatus.Open)
            {
                shift.RecordSale(request.PaymentMethod, invoice.TotalAmount, invoice.TotalVat, request.CashPart, request.MadaPart);
                await _shiftRepo.UpdateAsync(shift, cancellationToken);
            }
        }

        // 1. Resolve Warehouse & Payment Method Mapping
        var whCode = request.WarehouseCode ?? "WH-MAIN";
        int pm = (request.PaymentMethod == PosPaymentMethod.Mada || request.PaymentMethod == PosPaymentMethod.CreditCard) ? 3 : 1;
        WarehouseAccountMapping? whMapping = null;
        if (_warehouseRepo != null && !string.IsNullOrWhiteSpace(whCode))
        {
            whMapping = await _warehouseRepo.GetAccountMappingByCodeAsync(request.CompanyId, whCode, pm, cancellationToken);
        }

        // Post balanced GL Journal Entry with Fallback
        var cashAccount = (whMapping?.SalesInvoiceAccountId.HasValue == true && pm == 1
            ? await _accountRepo.GetByIdAsync(whMapping.SalesInvoiceAccountId.Value, cancellationToken)
            : null) ?? await _accountRepo.GetByCodeAsync(request.CompanyId, "11101", cancellationToken);

        var bankAccount = (whMapping?.SalesInvoiceAccountId.HasValue == true && pm == 3
            ? await _accountRepo.GetByIdAsync(whMapping.SalesInvoiceAccountId.Value, cancellationToken)
            : null) ?? await _accountRepo.GetByCodeAsync(request.CompanyId, "11102", cancellationToken);

        var revenueAccount = (whMapping?.SalesRevenueAccountId.HasValue == true
            ? await _accountRepo.GetByIdAsync(whMapping.SalesRevenueAccountId.Value, cancellationToken)
            : null) ?? await _accountRepo.GetByCodeAsync(request.CompanyId, "41101", cancellationToken);

        var vatAccount = (whMapping?.TaxAccountId.HasValue == true
            ? await _accountRepo.GetByIdAsync(whMapping.TaxAccountId.Value, cancellationToken)
            : null) ?? await _accountRepo.GetByCodeAsync(request.CompanyId, "21201", cancellationToken);

        if (cashAccount != null && revenueAccount != null && vatAccount != null)
        {
            var glLines = new List<CreateJournalEntryLineRequest>();
            var paymentAccount = (request.PaymentMethod == PosPaymentMethod.Mada || request.PaymentMethod == PosPaymentMethod.CreditCard)
                ? (bankAccount ?? cashAccount)
                : cashAccount;

            if (request.PaymentMethod == PosPaymentMethod.Split && bankAccount != null)
            {
                if (request.CashPart > 0)
                    glLines.Add(new CreateJournalEntryLineRequest(cashAccount.Id, request.CashPart, 0m, $"مبيعات نقاط بيع نقدية فاتورة {invoice.InvoiceNumber}", null));
                if (request.MadaPart > 0)
                    glLines.Add(new CreateJournalEntryLineRequest(bankAccount.Id, request.MadaPart, 0m, $"مبيعات نقاط بيع شبكة مدى فاتورة {invoice.InvoiceNumber}", null));
            }
            else
            {
                glLines.Add(new CreateJournalEntryLineRequest(paymentAccount.Id, invoice.TotalAmount, 0m, $"مبيعات نقاط بيع فاتورة {invoice.InvoiceNumber}", null));
            }

            // Credits
            glLines.Add(new CreateJournalEntryLineRequest(revenueAccount.Id, 0m, invoice.TotalTaxableAmount, $"إيراد مبيعات فاتورة {invoice.InvoiceNumber}", null));
            glLines.Add(new CreateJournalEntryLineRequest(vatAccount.Id, 0m, invoice.TotalVat, $"ضريبة مخرجات 15% فاتورة {invoice.InvoiceNumber}", null));

            var entryCommand = new CreateJournalEntryCommand(
                CompanyId: request.CompanyId,
                EntryDate: timestamp.Date,
                EntryType: JournalEntryType.Daily,
                DescriptionAr: $"قيد مبيعات نقطة البيع {request.TerminalCode} - فاتورة {invoice.InvoiceNumber}",
                DescriptionEn: $"POS Sale Entry {invoice.InvoiceNumber}",
                ReferenceNumber: invoice.InvoiceNumber,
                PostImmediately: true,
                Lines: glLines
            );

            var glResult = await _mediator.Send(entryCommand, cancellationToken);
            if (glResult.IsSuccess)
            {
                invoice.SetAssociatedJournalEntry(glResult.Value.Id, glResult.Value.EntryNumber);
            }
        }

        await _invoiceRepo.AddAsync(invoice, cancellationToken);
        await _invoiceRepo.SaveChangesAsync(cancellationToken);

        // Deduct Inventory & Update Warehouse Stocks
        if (_itemRepo != null && _invTxRepo != null)
        {
            foreach (var itemLine in request.Lines.Where(l => l.ItemId.HasValue))
            {
                try
                {
                    var itm = await _itemRepo.GetByIdAsync(itemLine.ItemId!.Value, cancellationToken);
                    if (itm != null)
                    {
                        var whCodeLine = string.IsNullOrWhiteSpace(itemLine.WarehouseCode) ? whCode : itemLine.WarehouseCode.Trim();
                        itm.AdjustStock(-itemLine.Quantity, itm.CostPrice, InventoryMovementType.SaleOut, request.CashierName);
                        var tx = InventoryTransaction.Create(
                            tenantId: tenantId,
                            companyId: request.CompanyId,
                            itemId: itm.Id,
                            transactionDate: timestamp.Date,
                            movementType: InventoryMovementType.SaleOut,
                            quantityIn: 0m,
                            quantityOut: itemLine.Quantity,
                            unitCost: itm.CostPrice,
                            balanceAfterQuantity: itm.CurrentStockQuantity,
                            referenceType: "PosSale",
                            referenceId: invoice.Id,
                            referenceNumber: invoice.InvoiceNumber,
                            notes: $"صرف مبيعات نقطة البيع {request.TerminalCode} - فاتورة {invoice.InvoiceNumber} من مستودع [{whCodeLine}]",
                            createdBy: request.CashierName,
                            warehouseCode: whCodeLine);
                        await _invTxRepo.AddAsync(tx, cancellationToken);

                        if (_stockRepo != null)
                        {
                            var whStock = await _stockRepo.GetByCodeAsync(request.CompanyId, whCodeLine, itm.Id, cancellationToken);
                            if (whStock != null)
                            {
                                whStock.AdjustQuantity(-itemLine.Quantity, request.CashierName);
                                await _stockRepo.UpdateAsync(whStock, cancellationToken);
                            }
                            else
                            {
                                var whEntity = _warehouseRepo != null ? await _warehouseRepo.GetByCodeAsync(request.CompanyId, whCodeLine, cancellationToken) : null;
                                var whId = whEntity?.Id ?? Guid.NewGuid();
                                var newWhStock = ItemWarehouseStock.Create(
                                    tenantId: tenantId,
                                    companyId: request.CompanyId,
                                    itemId: itm.Id,
                                    warehouseId: whId,
                                    warehouseCode: whCodeLine,
                                    initialQuantity: -itemLine.Quantity,
                                    minStockLevel: itm.MinStockLevel,
                                    createdBy: request.CashierName);
                                await _stockRepo.AddAsync(newWhStock, cancellationToken);
                            }
                        }
                    }
                }
                catch
                {
                    // Non-blocking fallback
                }
            }

            try
            {
                await _invTxRepo.SaveChangesAsync(cancellationToken);
                await _itemRepo.SaveChangesAsync(cancellationToken);
                if (_stockRepo != null)
                {
                    await _stockRepo.SaveChangesAsync(cancellationToken);
                }
            }
            catch
            {
            }
        }

        var paymentNameAr = request.PaymentMethod switch
        {
            PosPaymentMethod.Cash => "نقدي (Cash)",
            PosPaymentMethod.Mada => "شبكة / مدى (Mada)",
            PosPaymentMethod.CreditCard => "بطاقة ائتمان (Credit Card)",
            PosPaymentMethod.Split => "دفع مجزأ (نقد + شبكة)",
            _ => "نقدي"
        };

        var receiptDto = new PosReceiptDto(
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.Uuid,
            invoice.IssueDate,
            timestamp.ToString("hh:mm:ss tt"),
            "شركة الربان للحلول المحاسبية المتكاملة",
            "310123456700003",
            request.TerminalCode,
            request.CashierName,
            invoice.CustomerName,
            request.PaymentMethod,
            paymentNameAr,
            invoice.SubTotal,
            invoice.TotalDiscount,
            invoice.TotalTaxableAmount,
            invoice.TotalVat,
            invoice.TotalAmount,
            request.CashReceived,
            request.ChangeGiven,
            qrCodePayload,
            lineDtos
        );

        return Result.Success(receiptDto);
    }
}
