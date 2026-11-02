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

public record AdjustStockResultDto(
    Guid ItemId,
    string ItemCode,
    string ItemNameAr,
    decimal PreviousQuantity,
    decimal ActualQuantity,
    decimal DifferenceQuantity,
    decimal UnitCost,
    decimal TotalAdjustmentValue,
    string MovementType,
    string ReferenceNumber,
    Guid? JournalEntryId,
    string? JournalEntryNumber
);

public record AdjustStockCommand(
    Guid ItemId,
    decimal ActualQuantity,
    string? WarehouseCode,
    string ReasonAr,
    string? ReasonEn,
    string? AdjustedBy = null
) : IRequest<Result<AdjustStockResultDto>>;

public class AdjustStockCommandHandler : IRequestHandler<AdjustStockCommand, Result<AdjustStockResultDto>>
{
    private readonly IItemRepository _itemRepo;
    private readonly IInventoryTransactionRepository _invTxRepo;
    private readonly IItemWarehouseStockRepository _stockRepo;
    private readonly IWarehouseRepository _warehouseRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public AdjustStockCommandHandler(
        IItemRepository itemRepo,
        IInventoryTransactionRepository invTxRepo,
        IItemWarehouseStockRepository stockRepo,
        IWarehouseRepository warehouseRepo,
        IAccountRepository accountRepo,
        IMediator mediator,
        ICurrentTenantContext tenantContext)
    {
        _itemRepo = itemRepo;
        _invTxRepo = invTxRepo;
        _stockRepo = stockRepo;
        _warehouseRepo = warehouseRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
        _tenantContext = tenantContext;
    }

    public async Task<Result<AdjustStockResultDto>> Handle(AdjustStockCommand request, CancellationToken cancellationToken)
    {
        var item = await _itemRepo.GetByIdAsync(request.ItemId, cancellationToken);
        if (item == null)
        {
            return Result.Failure<AdjustStockResultDto>(new Error("Item.NotFound", "الصنف المطلوب غير موجود"));
        }

        if (item.ItemType != ItemType.Stockable)
        {
            return Result.Failure<AdjustStockResultDto>(new Error("Item.NotStockable", "لا يمكن تسوية رصيد صنف غير مخزني (خدمي أو مستهلك)"));
        }

        var previousQty = item.CurrentStockQuantity;
        var diff = request.ActualQuantity - previousQty;

        if (Math.Abs(diff) < 0.0001m)
        {
            return Result.Success(new AdjustStockResultDto(
                item.Id,
                item.ItemCode,
                item.NameAr,
                previousQty,
                request.ActualQuantity,
                0m,
                item.CostPrice,
                0m,
                "لا يوجد تغيير",
                "-",
                null,
                null
            ));
        }

        var tenantId = _tenantContext.TenantId ?? item.TenantId;
        var companyId = item.CompanyId;
        var unitCost = item.CostPrice > 0 ? item.CostPrice : (item.PurchasePrice > 0 ? item.PurchasePrice : 1m);
        var totalAdjValue = Math.Round(Math.Abs(diff) * unitCost, 2);

        var refNo = $"ADJ-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
        var isSurplus = diff > 0;
        var qtyIn = isSurplus ? diff : 0m;
        var qtyOut = isSurplus ? 0m : Math.Abs(diff);
        var movementLabel = isSurplus ? "فائض جردي (+)" : "عجز/تلف جردي (-)";

        // 1. Update item stock
        item.AdjustStock(diff, unitCost, InventoryMovementType.InventoryAdjustment, request.AdjustedBy ?? "أمين المستودع");
        await _itemRepo.UpdateAsync(item, cancellationToken);

        // 1.1 Update specific warehouse stock if warehouse specified
        var targetWhCode = !string.IsNullOrWhiteSpace(request.WarehouseCode) ? request.WarehouseCode.Trim().ToUpperInvariant() : "WH-MAIN";
        var whEntity = await _warehouseRepo.GetByCodeAsync(companyId, targetWhCode, cancellationToken);
        var whId = whEntity?.Id ?? Guid.NewGuid();

        var whStock = await _stockRepo.GetByCodeAsync(companyId, targetWhCode, item.Id, cancellationToken);
        if (whStock == null)
        {
            whStock = ItemWarehouseStock.Create(
                tenantId: tenantId,
                companyId: companyId,
                itemId: item.Id,
                warehouseId: whId,
                warehouseCode: targetWhCode,
                initialQuantity: request.ActualQuantity,
                createdBy: request.AdjustedBy);
            await _stockRepo.AddAsync(whStock, cancellationToken);
        }
        else
        {
            whStock.SetQuantity(request.ActualQuantity, request.AdjustedBy);
        }
        await _stockRepo.SaveChangesAsync(cancellationToken);

        // 2. Add inventory transaction
        var reasonNotes = string.IsNullOrWhiteSpace(request.ReasonEn)
            ? $"تسوية جردية بمستودع [{targetWhCode}] ({movementLabel}) - {request.ReasonAr}"
            : $"تسوية جردية بمستودع [{targetWhCode}] ({movementLabel}) - {request.ReasonAr} / {request.ReasonEn}";

        var tx = InventoryTransaction.Create(
            tenantId: tenantId,
            companyId: companyId,
            itemId: item.Id,
            transactionDate: DateTime.UtcNow,
            movementType: InventoryMovementType.InventoryAdjustment,
            quantityIn: qtyIn,
            quantityOut: qtyOut,
            unitCost: unitCost,
            balanceAfterQuantity: item.CurrentStockQuantity,
            referenceType: "InventoryAdjustment",
            referenceId: Guid.NewGuid(),
            referenceNumber: refNo,
            notes: reasonNotes,
            createdBy: request.AdjustedBy ?? "أمين المستودع",
            warehouseId: whEntity?.Id,
            warehouseCode: targetWhCode);

        await _invTxRepo.AddAsync(tx, cancellationToken);
        await _itemRepo.SaveChangesAsync(cancellationToken);

        // 3. Post Automatic Balanced GL Journal Entry
        Guid? jvId = null;
        string? jvNumber = null;

        if (totalAdjValue > 0)
        {
            var accounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);

            // Check Warehouse Accounting Matrix for specific warehouse accounts
            var whMapping = await _warehouseRepo.GetAccountMappingByCodeAsync(companyId, targetWhCode, 1, cancellationToken);

            // Inventory Account
            var invAccId = (whMapping?.InventoryAccountId.HasValue == true ? whMapping.InventoryAccountId : null)
                           ?? item.InventoryAccountId 
                           ?? accounts.FirstOrDefault(a => a.AccountCode == "11301" && a.IsPostable)?.Id
                           ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("113") && a.IsPostable)?.Id
                           ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("114") && a.IsPostable)?.Id;

            // Gain / Loss / Shrinkage Adjustment Account
            Guid? adjAccId = whMapping?.AdjustmentVarianceAccountId;
            if (!adjAccId.HasValue)
            {
                if (isSurplus)
                {
                    // Surplus: Credit Other Income / Gain on Inventory Adjustment (42101 or 42xxx)
                    adjAccId = accounts.FirstOrDefault(a => a.AccountCode == "42101" && a.IsPostable)?.Id
                               ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("42") && a.IsPostable)?.Id
                               ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("41") && a.IsPostable)?.Id;
                }
                else
                {
                    // Deficit: Debit Inventory Shrinkage/Loss (51101 or 53105 or 53xxx)
                    adjAccId = accounts.FirstOrDefault(a => a.AccountCode == "51101" && a.IsPostable)?.Id
                               ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("51") && a.IsPostable)?.Id
                               ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("53") && a.IsPostable)?.Id;
                }
            }

            if (invAccId.HasValue && adjAccId.HasValue)
            {
                var jvLines = new List<CreateJournalEntryLineRequest>();
                if (isSurplus)
                {
                    // Debit Inventory (Increase Asset)
                    jvLines.Add(new CreateJournalEntryLineRequest(
                        AccountId: invAccId.Value,
                        Debit: totalAdjValue,
                        Credit: 0,
                        Description: $"فائض جردي صنف {item.ItemCode} - {item.NameAr} (+{diff:N2} {item.UnitOfMeasure})",
                        CostCenterId: null));

                    // Credit Revenue / Inventory Adjustment Gain
                    jvLines.Add(new CreateJournalEntryLineRequest(
                        AccountId: adjAccId.Value,
                        Debit: 0,
                        Credit: totalAdjValue,
                        Description: $"أرباح ومكاسب تسوية جردية - {request.ReasonAr}",
                        CostCenterId: null));
                }
                else
                {
                    // Debit Expense / Inventory Shrinkage Loss
                    jvLines.Add(new CreateJournalEntryLineRequest(
                        AccountId: adjAccId.Value,
                        Debit: totalAdjValue,
                        Credit: 0,
                        Description: $"خسائر عجز وتلف جردي صنف {item.ItemCode} - {item.NameAr} (-{Math.Abs(diff):N2} {item.UnitOfMeasure})",
                        CostCenterId: null));

                    // Credit Inventory (Decrease Asset)
                    jvLines.Add(new CreateJournalEntryLineRequest(
                        AccountId: invAccId.Value,
                        Debit: 0,
                        Credit: totalAdjValue,
                        Description: $"تسوية عجز جردي للمخزون - {request.ReasonAr}",
                        CostCenterId: null));
                }

                var jvCommand = new CreateJournalEntryCommand(
                    CompanyId: companyId,
                    EntryDate: DateTime.UtcNow,
                    EntryType: JournalEntryType.Adjustment,
                    DescriptionAr: $"قيد تسوية جردية للمخزون - {refNo} ({movementLabel}) - {item.NameAr}",
                    DescriptionEn: $"Inventory Adjustment Journal Entry - {refNo} - {item.NameEn}",
                    ReferenceNumber: refNo,
                    PostImmediately: true,
                    Lines: jvLines);

                var jvResult = await _mediator.Send(jvCommand, cancellationToken);
                if (jvResult.IsSuccess)
                {
                    jvId = jvResult.Value.Id;
                    jvNumber = jvResult.Value.EntryNumber;
                }
            }
        }

        return Result.Success(new AdjustStockResultDto(
            item.Id,
            item.ItemCode,
            item.NameAr,
            previousQty,
            request.ActualQuantity,
            diff,
            unitCost,
            totalAdjValue,
            movementLabel,
            refNo,
            jvId,
            jvNumber
        ));
    }
}
