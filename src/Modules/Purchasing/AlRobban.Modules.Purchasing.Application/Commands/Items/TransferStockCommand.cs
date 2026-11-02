using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Purchasing.Application.Commands.Items;

public record TransferStockResultDto(
    Guid ItemId,
    string ItemCode,
    string ItemNameAr,
    string SourceWarehouseCode,
    string DestinationWarehouseCode,
    decimal Quantity,
    decimal UnitCost,
    decimal TotalValue,
    string ReferenceNumber,
    DateTime TransferDate,
    string Status
);

public record TransferStockCommand(
    Guid ItemId,
    string SourceWarehouseCode,
    string DestinationWarehouseCode,
    decimal Quantity,
    string ReasonAr,
    string? ReasonEn = null,
    string? TransferredBy = null
) : IRequest<Result<TransferStockResultDto>>;

public class TransferStockCommandHandler : IRequestHandler<TransferStockCommand, Result<TransferStockResultDto>>
{
    private readonly IItemRepository _itemRepo;
    private readonly IInventoryTransactionRepository _invTxRepo;
    private readonly IItemWarehouseStockRepository _stockRepo;
    private readonly IWarehouseRepository _warehouseRepo;
    private readonly IAccountRepository? _accountRepo;
    private readonly IMediator? _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public TransferStockCommandHandler(
        IItemRepository itemRepo,
        IInventoryTransactionRepository invTxRepo,
        IItemWarehouseStockRepository stockRepo,
        IWarehouseRepository warehouseRepo,
        ICurrentTenantContext tenantContext,
        IAccountRepository? accountRepo = null,
        IMediator? mediator = null)
    {
        _itemRepo = itemRepo;
        _invTxRepo = invTxRepo;
        _stockRepo = stockRepo;
        _warehouseRepo = warehouseRepo;
        _tenantContext = tenantContext;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<TransferStockResultDto>> Handle(TransferStockCommand request, CancellationToken cancellationToken)
    {
        var item = await _itemRepo.GetByIdAsync(request.ItemId, cancellationToken);
        if (item == null)
        {
            return Result.Failure<TransferStockResultDto>(new Error("Item.NotFound", "الصنف المطلوب غير موجود"));
        }

        if (item.ItemType != ItemType.Stockable)
        {
            return Result.Failure<TransferStockResultDto>(new Error("Item.NotStockable", "لا يمكن إجراء تحويل مخزني لصنف غير مخزني (خدمي أو استهلاكي)"));
        }

        if (request.Quantity <= 0)
        {
            return Result.Failure<TransferStockResultDto>(new Error("Transfer.InvalidQuantity", "يجب أن تكون كمية التحويل أكبر من الصفر"));
        }

        var sourceWhCode = request.SourceWarehouseCode?.Trim().ToUpperInvariant();
        var destWhCode = request.DestinationWarehouseCode?.Trim().ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(sourceWhCode) || string.IsNullOrWhiteSpace(destWhCode))
        {
            return Result.Failure<TransferStockResultDto>(new Error("Transfer.InvalidWarehouse", "يجب تحديد كل من مستودع المصدر ومستودع الوجهة"));
        }

        if (sourceWhCode.Equals(destWhCode, StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<TransferStockResultDto>(new Error("Transfer.SameWarehouse", "لا يمكن التحويل لنفس المستودع، يرجى اختيار مستودعين مختلفين"));
        }

        var tenantId = _tenantContext.TenantId ?? item.TenantId;
        var companyId = item.CompanyId;

        // Resolve Warehouses
        var srcWh = await _warehouseRepo.GetByCodeAsync(companyId, sourceWhCode, cancellationToken);
        var destWh = await _warehouseRepo.GetByCodeAsync(companyId, destWhCode, cancellationToken);

        var srcWhId = srcWh?.Id ?? Guid.NewGuid();
        var destWhId = destWh?.Id ?? Guid.NewGuid();

        // 1. Check & adjust source warehouse stock
        var srcStock = await _stockRepo.GetByCodeAsync(companyId, sourceWhCode, item.Id, cancellationToken);
        if (srcStock == null)
        {
            // Auto-baseline from item's current total stock
            srcStock = ItemWarehouseStock.Create(
                tenantId: tenantId,
                companyId: companyId,
                itemId: item.Id,
                warehouseId: srcWhId,
                warehouseCode: sourceWhCode,
                initialQuantity: item.CurrentStockQuantity,
                createdBy: request.TransferredBy);
            await _stockRepo.AddAsync(srcStock, cancellationToken);
        }

        if (srcStock.Quantity < request.Quantity)
        {
            return Result.Failure<TransferStockResultDto>(new Error(
                "Transfer.InsufficientWarehouseStock",
                $"الرصيد المتاح للصنف في مستودع المصدر [{sourceWhCode}] هو ({srcStock.Quantity:N2}) وهو غير كافٍ لإتمام تحويل ({request.Quantity:N2})"));
        }

        // 2. Adjust destination warehouse stock
        var destStock = await _stockRepo.GetByCodeAsync(companyId, destWhCode, item.Id, cancellationToken);
        if (destStock == null)
        {
            destStock = ItemWarehouseStock.Create(
                tenantId: tenantId,
                companyId: companyId,
                itemId: item.Id,
                warehouseId: destWhId,
                warehouseCode: destWhCode,
                initialQuantity: 0,
                createdBy: request.TransferredBy);
            await _stockRepo.AddAsync(destStock, cancellationToken);
        }

        var user = !string.IsNullOrWhiteSpace(request.TransferredBy) ? request.TransferredBy : "أمين المستودع";
        srcStock.AdjustQuantity(-request.Quantity, user);
        destStock.AdjustQuantity(request.Quantity, user);

        var unitCost = item.CostPrice > 0 ? item.CostPrice : (item.PurchasePrice > 0 ? item.PurchasePrice : 1m);
        var totalValue = Math.Round(request.Quantity * unitCost, 2);
        var refNo = $"TRF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

        var notesBase = string.IsNullOrWhiteSpace(request.ReasonEn)
            ? request.ReasonAr
            : $"{request.ReasonAr} / {request.ReasonEn}";

        // 3. Transaction Out from Source Warehouse
        var txOut = InventoryTransaction.Create(
            tenantId: tenantId,
            companyId: companyId,
            itemId: item.Id,
            transactionDate: DateTime.UtcNow,
            movementType: InventoryMovementType.TransferOut,
            quantityIn: 0m,
            quantityOut: request.Quantity,
            unitCost: unitCost,
            balanceAfterQuantity: srcStock.Quantity,
            referenceType: "StockTransfer",
            referenceId: Guid.NewGuid(),
            referenceNumber: refNo,
            notes: $"تحويل مخزني صادر من [{sourceWhCode}] إلى [{destWhCode}] - {notesBase}",
            createdBy: user,
            warehouseId: srcWh?.Id,
            warehouseCode: sourceWhCode);

        // 4. Transaction In to Destination Warehouse
        var txIn = InventoryTransaction.Create(
            tenantId: tenantId,
            companyId: companyId,
            itemId: item.Id,
            transactionDate: DateTime.UtcNow,
            movementType: InventoryMovementType.TransferIn,
            quantityIn: request.Quantity,
            quantityOut: 0m,
            unitCost: unitCost,
            balanceAfterQuantity: destStock.Quantity,
            referenceType: "StockTransfer",
            referenceId: Guid.NewGuid(),
            referenceNumber: refNo,
            notes: $"تحويل مخزني وارد إلى [{destWhCode}] من [{sourceWhCode}] - {notesBase}",
            createdBy: user,
            warehouseId: destWh?.Id,
            warehouseCode: destWhCode);

        await _invTxRepo.AddAsync(txOut, cancellationToken);
        await _invTxRepo.AddAsync(txIn, cancellationToken);
        await _stockRepo.SaveChangesAsync(cancellationToken);

        // Update item timestamp
        item.AdjustStock(0m, unitCost, InventoryMovementType.TransferOut, user);
        await _itemRepo.UpdateAsync(item, cancellationToken);
        await _itemRepo.SaveChangesAsync(cancellationToken);

        // 5. Post Automatic Balanced GL Journal Entry for Transfer Between Warehouses
        if (totalValue > 0 && _accountRepo != null && _mediator != null)
        {
            try
            {
                var accounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
                var srcMapping = await _warehouseRepo.GetAccountMappingByCodeAsync(companyId, sourceWhCode, 1, cancellationToken);
                var destMapping = await _warehouseRepo.GetAccountMappingByCodeAsync(companyId, destWhCode, 1, cancellationToken);

                // Source Warehouse Inventory Account (To Credit)
                var srcInvAccId = srcMapping?.InventoryAccountId
                               ?? item.InventoryAccountId
                               ?? accounts.FirstOrDefault(a => a.AccountCode == "11301" && a.IsPostable)?.Id
                               ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("113") && a.IsPostable)?.Id
                               ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("114") && a.IsPostable)?.Id;

                // Destination Warehouse Inventory Account (To Debit)
                var destInvAccId = destMapping?.InventoryAccountId
                                ?? srcMapping?.TransferClearingAccountId
                                ?? accounts.FirstOrDefault(a => a.AccountCode == "11302" && a.IsPostable)?.Id
                                ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("114") && a.IsPostable)?.Id
                                ?? srcInvAccId;

                if (srcInvAccId.HasValue && destInvAccId.HasValue && srcInvAccId.Value != destInvAccId.Value)
                {
                    var jvLines = new List<CreateJournalEntryLineRequest>
                    {
                        // Debit Destination Inventory (or Transfer Clearing)
                        new(
                            AccountId: destInvAccId.Value,
                            Debit: totalValue,
                            Credit: 0m,
                            Description: $"مناقلة مخزنية واردة صنف {item.ItemCode} - {item.NameAr} إلى مستودع [{destWhCode}] من مستودع [{sourceWhCode}]",
                            CostCenterId: null
                        ),
                        // Credit Source Inventory
                        new(
                            AccountId: srcInvAccId.Value,
                            Debit: 0m,
                            Credit: totalValue,
                            Description: $"مناقلة مخزنية صادرة صنف {item.ItemCode} - {item.NameAr} من مستودع [{sourceWhCode}] إلى مستودع [{destWhCode}]",
                            CostCenterId: null
                        )
                    };

                    var entryCommand = new CreateJournalEntryCommand(
                        CompanyId: companyId,
                        EntryDate: DateTime.UtcNow.Date,
                        EntryType: JournalEntryType.Daily,
                        DescriptionAr: $"قيد مناقلة مخزنية رقم {refNo} من [{sourceWhCode}] إلى [{destWhCode}] - {request.ReasonAr}",
                        DescriptionEn: $"Stock Transfer {refNo} from {sourceWhCode} to {destWhCode}",
                        ReferenceNumber: refNo,
                        PostImmediately: true,
                        Lines: jvLines
                    );

                    await _mediator.Send(entryCommand, cancellationToken);
                }
            }
            catch
            {
                // Non-blocking fallback to protect stock transfer execution
            }
        }

        return Result.Success(new TransferStockResultDto(
            item.Id,
            item.ItemCode,
            item.NameAr,
            sourceWhCode,
            destWhCode,
            request.Quantity,
            unitCost,
            totalValue,
            refNo,
            DateTime.UtcNow,
            "مكتمل وموثق"
        ));
    }
}
