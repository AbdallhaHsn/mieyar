using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.Commands.Vouchers;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Purchasing.Application.Commands.Invoices;

public record CreatePurchaseInvoiceLineRequest(
    Guid? ItemId,
    string ItemNameAr,
    string? ItemNameEn,
    Guid AccountId,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount = 0,
    decimal VatRate = 15.00m,
    Guid? CostCenterId = null
);

public record CreatePurchaseInvoiceCommand(
    Guid? CompanyId,
    Guid VendorId,
    string? VendorInvoiceNumber,
    DateTime IssueDate,
    DateTime? DueDate,
    string Currency,
    decimal ExchangeRateToSar,
    string? Notes,
    List<CreatePurchaseInvoiceLineRequest> Lines,
    bool AutoPost = false,
    Guid? PurchaseOrderId = null,
    string? PurchaseOrderNumber = null,
    Guid? GoodsReceiptNoteId = null,
    string? GoodsReceiptNoteNumber = null
) : IRequest<Result<PurchaseInvoiceDto>>;

public class CreatePurchaseInvoiceCommandHandler : IRequestHandler<CreatePurchaseInvoiceCommand, Result<PurchaseInvoiceDto>>
{
    private readonly IPurchaseInvoiceRepository _invoiceRepo;
    private readonly IBusinessPartnerRepository _partnerRepo;
    private readonly IPurchaseOrderRepository _orderRepo;
    private readonly ICurrentTenantContext _tenantContext;
    private readonly IMediator _mediator;

    public CreatePurchaseInvoiceCommandHandler(
        IPurchaseInvoiceRepository invoiceRepo,
        IBusinessPartnerRepository partnerRepo,
        IPurchaseOrderRepository orderRepo,
        ICurrentTenantContext tenantContext,
        IMediator mediator)
    {
        _invoiceRepo = invoiceRepo;
        _partnerRepo = partnerRepo;
        _orderRepo = orderRepo;
        _tenantContext = tenantContext;
        _mediator = mediator;
    }

    public async Task<Result<PurchaseInvoiceDto>> Handle(CreatePurchaseInvoiceCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? tenantId;

        // 1. Verify Vendor
        var vendor = await _partnerRepo.GetByIdAsync(request.VendorId, cancellationToken);
        if (vendor == null)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.VendorNotFound", "المورد المحدد غير مسجل في بطاقات شركاء الأعمال."));
        }

        if (request.Lines == null || request.Lines.Count == 0)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.EmptyLines", "يجب إدراج بند مشتريات واحد على الأقل في الفاتورة."));
        }

        // 2. Generate Next Invoice Number
        var invNumber = await _invoiceRepo.GenerateNextInvoiceNumberAsync(companyId, request.IssueDate.Year, cancellationToken);

        // 3. Create Aggregate
        var invoice = PurchaseInvoice.Create(
            tenantId,
            companyId,
            invNumber,
            vendor.Id,
            vendor.NameAr,
            vendor.TaxNumber,
            vendor.CommercialRegistration,
            request.IssueDate,
            request.VendorInvoiceNumber,
            request.DueDate,
            request.Currency,
            request.ExchangeRateToSar,
            request.Notes,
            createdBy: "المستخدم");

        foreach (var l in request.Lines)
        {
            invoice.AddLine(
                l.AccountId,
                l.ItemNameAr,
                l.ItemNameEn ?? l.ItemNameAr,
                l.Quantity,
                l.UnitPrice,
                l.DiscountAmount,
                l.VatRate,
                l.ItemId,
                l.CostCenterId);
        }

        if (request.PurchaseOrderId.HasValue || request.GoodsReceiptNoteId.HasValue)
        {
            var matchStatus = (request.PurchaseOrderId.HasValue && request.GoodsReceiptNoteId.HasValue)
                ? ThreeWayMatchingStatus.Matched
                : ThreeWayMatchingStatus.NotMatched;

            invoice.SetProcurementLinks(
                request.PurchaseOrderId,
                request.PurchaseOrderNumber,
                request.GoodsReceiptNoteId,
                request.GoodsReceiptNoteNumber,
                matchStatus);
        }

        await _invoiceRepo.AddAsync(invoice, cancellationToken);
        await _invoiceRepo.SaveChangesAsync(cancellationToken);

        if (request.PurchaseOrderId.HasValue)
        {
            var po = await _orderRepo.GetByIdAsync(request.PurchaseOrderId.Value, cancellationToken);
            if (po != null)
            {
                foreach (var line in invoice.Lines)
                {
                    var poLine = line.ItemId.HasValue
                        ? po.Lines.FirstOrDefault(pl => pl.ItemId == line.ItemId.Value)
                        : po.Lines.FirstOrDefault(pl => pl.ItemNameAr == line.ItemNameAr);

                    if (poLine != null)
                    {
                        poLine.RecordBilledQuantity(line.Quantity);
                    }
                }
                po.UpdateDeliveryAndBillingStatus();
                await _orderRepo.UpdateAsync(po, cancellationToken);
                await _orderRepo.SaveChangesAsync(cancellationToken);
            }
        }

        // 4. Auto-Post if requested
        if (request.AutoPost)
        {
            var postResult = await _mediator.Send(new PostPurchaseInvoiceCommand(invoice.Id), cancellationToken);
            if (postResult.IsFailure)
            {
                return Result.Failure<PurchaseInvoiceDto>(postResult.Error);
            }
            return postResult;
        }

        return Result.Success(PurchaseInvoiceDto.FromEntity(invoice));
    }
}

public record PostPurchaseInvoiceCommand(Guid InvoiceId, string? PostedBy = null) : IRequest<Result<PurchaseInvoiceDto>>;

public class PostPurchaseInvoiceCommandHandler : IRequestHandler<PostPurchaseInvoiceCommand, Result<PurchaseInvoiceDto>>
{
    private readonly IPurchaseInvoiceRepository _invoiceRepo;
    private readonly IBusinessPartnerRepository _partnerRepo;
    private readonly IItemRepository _itemRepo;
    private readonly IInventoryTransactionRepository _invTxRepo;
    private readonly IItemWarehouseStockRepository _stockRepo;
    private readonly IWarehouseRepository _warehouseRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public PostPurchaseInvoiceCommandHandler(
        IPurchaseInvoiceRepository invoiceRepo,
        IBusinessPartnerRepository partnerRepo,
        IItemRepository itemRepo,
        IInventoryTransactionRepository invTxRepo,
        IItemWarehouseStockRepository stockRepo,
        IWarehouseRepository warehouseRepo,
        IAccountRepository accountRepo,
        IMediator mediator)
    {
        _invoiceRepo = invoiceRepo;
        _partnerRepo = partnerRepo;
        _itemRepo = itemRepo;
        _invTxRepo = invTxRepo;
        _stockRepo = stockRepo;
        _warehouseRepo = warehouseRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<PurchaseInvoiceDto>> Handle(PostPurchaseInvoiceCommand request, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice == null)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.NotFound", "فاتورة المشتريات غير موجودة"));
        }

        if (invoice.Status == PurchaseInvoiceStatus.Posted)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.AlreadyPosted", "فاتورة المشتريات مرحلة مسبقاً."));
        }

        var vendor = await _partnerRepo.GetByIdAsync(invoice.VendorId, cancellationToken);
        if (vendor == null)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.VendorNotFound", "المورد المرتبط بالفاتورة غير موجود."));
        }

        // 1. Determine Accounts for Double-Entry Posting:
        // Credit Account: Vendor GL Account or General Payables (21101)
        var creditAccountId = vendor.GlAccountId;
        if (!creditAccountId.HasValue)
        {
            var payablesAccount = await _accountRepo.GetByCodeAsync(invoice.CompanyId, "21101", cancellationToken);
            creditAccountId = payablesAccount?.Id ?? throw new InvalidOperationException("حساب الموردين (21101) غير معرف في دليل الحسابات.");
        }

        // Input VAT Account: 11401 (ضريبة مدخلات قابلة للاسترداد 15%)
        Guid? vatAccountId = null;
        if (invoice.TotalVat > 0)
        {
            var vatAccount = await _accountRepo.GetByCodeAsync(invoice.CompanyId, "11401", cancellationToken);
            vatAccountId = vatAccount?.Id;
            if (!vatAccountId.HasValue)
            {
                // Fallback to searching any VAT input account
                var accounts = await _accountRepo.GetAllByCompanyAsync(invoice.CompanyId, cancellationToken);
                var vatFound = accounts.FirstOrDefault(a => a.AccountCode.StartsWith("11401"));
                vatAccountId = vatFound?.Id;
            }
        }

        // 2. Prepare Balanced Journal Entry Lines
        var jvLines = new List<CreateJournalEntryLineRequest>();

        // 2.1 Debit: Line items (Inventory or Expense)
        foreach (var line in invoice.Lines)
        {
            jvLines.Add(new CreateJournalEntryLineRequest(
                AccountId: line.AccountId,
                Debit: line.TaxableAmount,
                Credit: 0,
                Description: $"{line.ItemNameAr} (فاتورة مشتريات {invoice.InvoiceNumber})",
                CostCenterId: line.CostCenterId));
        }

        // 2.2 Debit: Input VAT 15% (if any)
        if (invoice.TotalVat > 0 && vatAccountId.HasValue)
        {
            jvLines.Add(new CreateJournalEntryLineRequest(
                AccountId: vatAccountId.Value,
                Debit: invoice.TotalVat,
                Credit: 0,
                Description: $"ضريبة القيمة المضافة على المدخلات 15% (فاتورة {invoice.InvoiceNumber})",
                CostCenterId: null));
        }

        // 2.3 Credit: Vendor Account with Grand Total
        jvLines.Add(new CreateJournalEntryLineRequest(
            AccountId: creditAccountId.Value,
            Debit: 0,
            Credit: invoice.TotalAmount,
            Description: $"استحقاق فاتورة مشتريات رقم {invoice.InvoiceNumber} - المورد: {invoice.VendorName}",
            CostCenterId: null));

        // 3. Dispatch Journal Entry via MediatR
        var jvCommand = new CreateJournalEntryCommand(
            CompanyId: invoice.CompanyId,
            EntryDate: invoice.IssueDate,
            EntryType: JournalEntryType.Daily,
            DescriptionAr: $"فاتورة مشتريات رقم {invoice.InvoiceNumber} - {invoice.VendorName}",
            DescriptionEn: $"Purchase Invoice {invoice.InvoiceNumber} - {vendor.NameEn}",
            ReferenceNumber: invoice.VendorInvoiceNumber ?? invoice.InvoiceNumber,
            PostImmediately: true,
            Lines: jvLines);

        var jvResult = await _mediator.Send(jvCommand, cancellationToken);
        if (jvResult.IsFailure)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.PostingFailed", $"فشل ترحيل القيد المحاسبي لفاتورة المشتريات: {jvResult.Error.Description}"));
        }

        // 4. Update Inventory Stock and Log Inventory Transactions
        foreach (var line in invoice.Lines)
        {
            if (line.ItemId.HasValue)
            {
                var item = await _itemRepo.GetByIdAsync(line.ItemId.Value, cancellationToken);
                if (item != null && item.ItemType == ItemType.Stockable)
                {
                    item.AdjustStock(line.Quantity, line.UnitPrice, InventoryMovementType.PurchaseIn, request.PostedBy);
                    await _itemRepo.UpdateAsync(item, cancellationToken);

                    var whList = await _warehouseRepo.GetListAsync(invoice.CompanyId, cancellationToken);
                    var targetWh = whList.FirstOrDefault(w => w.IsDefault) ?? whList.FirstOrDefault();
                    var targetWhCode = targetWh?.Code ?? "WH-MAIN";
                    var whId = targetWh?.Id ?? Guid.NewGuid();

                    var whStock = await _stockRepo.GetByCodeAsync(invoice.CompanyId, targetWhCode, item.Id, cancellationToken);
                    if (whStock == null)
                    {
                        whStock = ItemWarehouseStock.Create(
                            invoice.TenantId,
                            invoice.CompanyId,
                            item.Id,
                            whId,
                            targetWhCode,
                            line.Quantity,
                            createdBy: request.PostedBy);
                        await _stockRepo.AddAsync(whStock, cancellationToken);
                    }
                    else
                    {
                        whStock.AdjustQuantity(line.Quantity, request.PostedBy);
                    }
                    await _stockRepo.SaveChangesAsync(cancellationToken);

                    var invTx = InventoryTransaction.Create(
                        invoice.TenantId,
                        invoice.CompanyId,
                        item.Id,
                        invoice.IssueDate,
                        InventoryMovementType.PurchaseIn,
                        quantityIn: line.Quantity,
                        quantityOut: 0,
                        unitCost: line.UnitPrice,
                        balanceAfterQuantity: item.CurrentStockQuantity,
                        referenceType: "PurchaseInvoice",
                        referenceId: invoice.Id,
                        referenceNumber: invoice.InvoiceNumber,
                        notes: $"استلام بضاعة بمستودع [{targetWhCode}] بفاتورة مشتريات من المورد: {invoice.VendorName}",
                        createdBy: request.PostedBy ?? "المستخدم",
                        warehouseId: targetWh?.Id,
                        warehouseCode: targetWhCode);

                    await _invTxRepo.AddAsync(invTx, cancellationToken);
                }
            }
        }

        // 5. Update Vendor Balance
        vendor.AdjustBalance(invoice.TotalAmount, true); // increases liability/balance
        await _partnerRepo.SaveChangesAsync(cancellationToken);

        // 6. Finalize Invoice State
        invoice.Post(jvResult.Value.Id, jvResult.Value.EntryNumber, request.PostedBy);
        await _invoiceRepo.UpdateAsync(invoice, cancellationToken);
        await _invoiceRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(PurchaseInvoiceDto.FromEntity(invoice));
    }
}

public record CancelPurchaseInvoiceCommand(Guid InvoiceId, string? Reason = null) : IRequest<Result<PurchaseInvoiceDto>>;

public class CancelPurchaseInvoiceCommandHandler : IRequestHandler<CancelPurchaseInvoiceCommand, Result<PurchaseInvoiceDto>>
{
    private readonly IPurchaseInvoiceRepository _invoiceRepo;

    public CancelPurchaseInvoiceCommandHandler(IPurchaseInvoiceRepository invoiceRepo)
    {
        _invoiceRepo = invoiceRepo;
    }

    public async Task<Result<PurchaseInvoiceDto>> Handle(CancelPurchaseInvoiceCommand request, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice == null)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.NotFound", "فاتورة المشتريات غير موجودة"));
        }

        if (invoice.Status == PurchaseInvoiceStatus.Posted)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.CannotCancelPosted", "لا يمكن إلغاء فاتورة مشتريات تم ترحيلها مباشرة. يرجى إنشاء مردود مشتريات (إشعار مدين) لعكس الحركة."));
        }

        invoice.Cancel("المستخدم");
        await _invoiceRepo.UpdateAsync(invoice, cancellationToken);
        await _invoiceRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(PurchaseInvoiceDto.FromEntity(invoice));
    }
}

public record ReturnPurchaseInvoiceRequest(string? Reason = null, string? ReturnedBy = null);

public record ReturnPurchaseInvoiceCommand(Guid InvoiceId, string? Reason = null, string? ReturnedBy = null) : IRequest<Result<PurchaseInvoiceDto>>;

public class ReturnPurchaseInvoiceCommandHandler : IRequestHandler<ReturnPurchaseInvoiceCommand, Result<PurchaseInvoiceDto>>
{
    private readonly IPurchaseInvoiceRepository _invoiceRepo;
    private readonly IBusinessPartnerRepository _partnerRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IItemRepository _itemRepo;
    private readonly IInventoryTransactionRepository _invTxRepo;
    private readonly IMediator _mediator;

    public ReturnPurchaseInvoiceCommandHandler(
        IPurchaseInvoiceRepository invoiceRepo,
        IBusinessPartnerRepository partnerRepo,
        IAccountRepository accountRepo,
        IItemRepository itemRepo,
        IInventoryTransactionRepository invTxRepo,
        IMediator mediator)
    {
        _invoiceRepo = invoiceRepo;
        _partnerRepo = partnerRepo;
        _accountRepo = accountRepo;
        _itemRepo = itemRepo;
        _invTxRepo = invTxRepo;
        _mediator = mediator;
    }

    public async Task<Result<PurchaseInvoiceDto>> Handle(ReturnPurchaseInvoiceCommand request, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice == null)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.NotFound", "فاتورة المشتريات غير موجودة"));
        }

        if (invoice.Status != PurchaseInvoiceStatus.Posted)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.NotPosted", "يمكن فقط إنشاء مردود مشتريات للفواتير المرحلة"));
        }

        var vendor = await _partnerRepo.GetByIdAsync(invoice.VendorId, cancellationToken);
        if (vendor == null)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.VendorNotFound", "المورد غير موجود"));
        }

        // 1. Determine Accounts for Reverse Double-Entry
        var debitAccountId = vendor.GlAccountId;
        if (!debitAccountId.HasValue)
        {
            var payablesAccount = await _accountRepo.GetByCodeAsync(invoice.CompanyId, "21101", cancellationToken);
            debitAccountId = payablesAccount?.Id ?? throw new InvalidOperationException("حساب الموردين (21101) غير معرف.");
        }

        Guid? vatAccountId = null;
        if (invoice.TotalVat > 0)
        {
            var vatAccount = await _accountRepo.GetByCodeAsync(invoice.CompanyId, "11401", cancellationToken);
            vatAccountId = vatAccount?.Id;
        }

        // 2. Prepare Reverse Balanced Journal Entry Lines
        var jvLines = new List<CreateJournalEntryLineRequest>();

        // 2.1 Debit: Vendor Account (Reduce liability)
        jvLines.Add(new CreateJournalEntryLineRequest(
            AccountId: debitAccountId.Value,
            Debit: invoice.TotalAmount,
            Credit: 0,
            Description: $"مردود مشتريات / إشعار مدين لفاتورة رقم {invoice.InvoiceNumber} - المورد: {invoice.VendorName}",
            CostCenterId: null));

        // 2.2 Credit: Line items (Reverse Inventory / Expense)
        foreach (var line in invoice.Lines)
        {
            jvLines.Add(new CreateJournalEntryLineRequest(
                AccountId: line.AccountId,
                Debit: 0,
                Credit: line.TaxableAmount,
                Description: $"عكس تكلفة/مخزون: {line.ItemNameAr} (مردود فاتورة {invoice.InvoiceNumber})",
                CostCenterId: line.CostCenterId));
        }

        // 2.3 Credit: Input VAT 15% (Reverse Input VAT)
        if (invoice.TotalVat > 0 && vatAccountId.HasValue)
        {
            jvLines.Add(new CreateJournalEntryLineRequest(
                AccountId: vatAccountId.Value,
                Debit: 0,
                Credit: invoice.TotalVat,
                Description: $"عكس ضريبة القيمة المضافة على المدخلات (مردود فاتورة {invoice.InvoiceNumber})",
                CostCenterId: null));
        }

        // 3. Dispatch Reverse Journal Entry
        var jvCommand = new CreateJournalEntryCommand(
            CompanyId: invoice.CompanyId,
            EntryDate: DateTime.UtcNow,
            EntryType: JournalEntryType.Daily,
            DescriptionAr: $"مردودات مشتريات / إشعار مدين رقم {invoice.InvoiceNumber} - {invoice.VendorName}",
            DescriptionEn: $"Purchase Return Note for #{invoice.InvoiceNumber} - {vendor.NameEn}",
            ReferenceNumber: $"RET-{invoice.InvoiceNumber}",
            PostImmediately: true,
            Lines: jvLines);

        var jvResult = await _mediator.Send(jvCommand, cancellationToken);
        if (jvResult.IsFailure)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.ReturnFailed", $"فشل ترحيل قيد المردودات: {jvResult.Error.Description}"));
        }

        // 4. Reverse Inventory Stock (Deduct returned stock from warehouse via ReturnOut)
        foreach (var line in invoice.Lines)
        {
            if (line.ItemId.HasValue)
            {
                var item = await _itemRepo.GetByIdAsync(line.ItemId.Value, cancellationToken);
                if (item != null && item.ItemType == ItemType.Stockable)
                {
                    item.AdjustStock(-line.Quantity, line.UnitPrice, InventoryMovementType.ReturnOut, request.ReturnedBy ?? "المستخدم");
                    await _itemRepo.UpdateAsync(item, cancellationToken);

                    var invTx = InventoryTransaction.Create(
                        invoice.TenantId,
                        invoice.CompanyId,
                        item.Id,
                        DateTime.UtcNow,
                        InventoryMovementType.ReturnOut,
                        quantityIn: 0,
                        quantityOut: line.Quantity,
                        unitCost: line.UnitPrice,
                        balanceAfterQuantity: item.CurrentStockQuantity,
                        referenceType: "PurchaseReturn",
                        referenceId: invoice.Id,
                        referenceNumber: $"RET-{invoice.InvoiceNumber}",
                        notes: $"إرجاع بضاعة لمورد بموجب إشعار مدين: {request.Reason ?? invoice.Notes ?? "مردود مشتريات"}",
                        createdBy: request.ReturnedBy ?? "المستخدم");

                    await _invTxRepo.AddAsync(invTx, cancellationToken);
                }
            }
        }

        // 5. Update Vendor Balance (reduce liability)
        vendor.AdjustBalance(invoice.TotalAmount, isIncrease: false);
        await _partnerRepo.SaveChangesAsync(cancellationToken);

        // 6. Cancel/Return Invoice
        invoice.Cancel(request.ReturnedBy ?? "المستخدم");
        await _invoiceRepo.UpdateAsync(invoice, cancellationToken);
        await _invoiceRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(PurchaseInvoiceDto.FromEntity(invoice));
    }
}

public record PayPurchaseInvoiceRequest(
    decimal Amount,
    DateTime? PaymentDate = null,
    string PaymentMethod = "Bank",
    Guid? PaymentAccountId = null,
    string? ReferenceNumber = null,
    string? Notes = null);

public record PayPurchaseInvoiceCommand(
    Guid InvoiceId,
    PayPurchaseInvoiceRequest Request,
    string? PaidBy = null
) : IRequest<Result<PurchaseInvoiceDto>>;

public class PayPurchaseInvoiceCommandHandler : IRequestHandler<PayPurchaseInvoiceCommand, Result<PurchaseInvoiceDto>>
{
    private readonly IPurchaseInvoiceRepository _invoiceRepo;
    private readonly IBusinessPartnerRepository _partnerRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public PayPurchaseInvoiceCommandHandler(
        IPurchaseInvoiceRepository invoiceRepo,
        IBusinessPartnerRepository partnerRepo,
        IAccountRepository accountRepo,
        IMediator mediator)
    {
        _invoiceRepo = invoiceRepo;
        _partnerRepo = partnerRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<PurchaseInvoiceDto>> Handle(PayPurchaseInvoiceCommand command, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(command.InvoiceId, cancellationToken);
        if (invoice == null)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.NotFound", "فاتورة المشتريات غير موجودة."));
        }

        if (invoice.Status == PurchaseInvoiceStatus.Draft)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.NotPosted", "لا يمكن سداد فاتورة مشتريات ما زالت مسودة. يرجى ترحيلها أولاً."));
        }

        if (invoice.Status == PurchaseInvoiceStatus.Cancelled)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.Cancelled", "لا يمكن سداد فاتورة مشتريات ملغاة."));
        }

        var remaining = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount);
        var amount = Math.Round(command.Request.Amount, 2);

        if (amount <= 0)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("Payment.InvalidAmount", "مبلغ السداد يجب أن يكون أكبر من صفر."));
        }

        if (amount > remaining)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("Payment.ExceedsRemaining", $"مبلغ السداد ({amount:N2}) يتجاوز المبلغ المتبقي على الفاتورة ({remaining:N2})."));
        }

        // 1. Record payment on Invoice Aggregate
        invoice.RecordPayment(amount);

        // 2. Adjust Vendor Liability in Business Partners
        var vendor = await _partnerRepo.GetByIdAsync(invoice.VendorId, cancellationToken);
        if (vendor != null)
        {
            vendor.AdjustBalance(amount, false); // reduces liability
            await _partnerRepo.SaveChangesAsync(cancellationToken);
        }

        // 3. Post Payment Journal Entry (Dr. Accounts Payable, Cr. Bank/Cash)
        try
        {
            var allAccounts = await _accountRepo.GetAllByCompanyAsync(invoice.CompanyId, cancellationToken);

            var apAccount = (vendor?.GlAccountId.HasValue == true
                                ? allAccounts.FirstOrDefault(a => a.Id == vendor.GlAccountId.Value)
                                : null)
                            ?? allAccounts.FirstOrDefault(a => a.AccountCode == "21101" && a.IsPostable)
                            ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("211") && a.IsPostable);

            var paymentAccount = command.Request.PaymentAccountId.HasValue
                ? allAccounts.FirstOrDefault(a => a.Id == command.Request.PaymentAccountId.Value)
                : null;

            if (paymentAccount == null)
            {
                var isCash = command.Request.PaymentMethod?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true;
                paymentAccount = isCash
                    ? (allAccounts.FirstOrDefault(a => a.AccountCode == "11101" && a.IsPostable) ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("111") && a.IsPostable))
                    : (allAccounts.FirstOrDefault(a => a.AccountCode == "11102" && a.IsPostable) ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("111") && a.IsPostable));
            }

            if (apAccount != null && paymentAccount != null)
            {
                var paymentDate = command.Request.PaymentDate ?? DateTime.UtcNow;
                var paymentMethod = command.Request.PaymentMethod?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true
                    ? PaymentMethod.Cash
                    : PaymentMethod.BankTransfer;

                var voucherLines = new List<CreateVoucherLineRequest>
                {
                    new CreateVoucherLineRequest(
                        AccountId: apAccount.Id,
                        Amount: amount,
                        Description: $"سداد مستحقات المورد {invoice.VendorName} - فاتورة مشتريات {invoice.InvoiceNumber}",
                        CostCenterId: null)
                };

                var voucherCmd = new CreateVoucherCommand(
                    CompanyId: invoice.CompanyId,
                    Type: VoucherType.Payment,
                    VoucherDate: paymentDate,
                    PaymentMethod: paymentMethod,
                    CashOrBankAccountId: paymentAccount.Id,
                    BeneficiaryOrPayerName: !string.IsNullOrWhiteSpace(invoice.VendorName) ? invoice.VendorName : "مورد خدمات وبضائع",
                    Description: $"سند صرف سداد فاتورة مشتريات رقم {invoice.InvoiceNumber}",
                    ReferenceNumber: !string.IsNullOrWhiteSpace(command.Request.ReferenceNumber) ? command.Request.ReferenceNumber : invoice.InvoiceNumber,
                    FiscalPeriodId: null,
                    Lines: voucherLines,
                    AutoPost: true);

                await _mediator.Send(voucherCmd, cancellationToken);
            }
        }
        catch
        {
            // Non-blocking fallback
        }

        await _invoiceRepo.UpdateAsync(invoice, cancellationToken);
        await _invoiceRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(PurchaseInvoiceDto.FromEntity(invoice));
    }
}

