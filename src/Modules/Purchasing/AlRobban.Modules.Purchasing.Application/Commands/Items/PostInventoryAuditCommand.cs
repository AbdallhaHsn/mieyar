using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
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

public record InventoryAuditItemInput(
    Guid ItemId,
    decimal ActualQuantity,
    string? ReasonAr = null,
    string? ReasonEn = null
);

public record PostInventoryAuditRequest(
    Guid? CompanyId,
    string? WarehouseCode,
    DateTime? AuditDate,
    string? AuditReference,
    string? Notes,
    List<InventoryAuditItemInput> Items
);

public record PostInventoryAuditResultDto(
    string AuditReferenceNumber,
    DateTime AuditDate,
    string WarehouseCode,
    int TotalItemsEvaluated,
    int AdjustedItemsCount,
    decimal TotalSurplusAmount,
    decimal TotalDeficitAmount,
    decimal NetAdjustmentAmount,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    string SummaryAr,
    string SummaryEn
);

public record PostInventoryAuditCommand(
    PostInventoryAuditRequest Request,
    string AuditedBy
) : IRequest<Result<PostInventoryAuditResultDto>>;

public class PostInventoryAuditCommandHandler : IRequestHandler<PostInventoryAuditCommand, Result<PostInventoryAuditResultDto>>
{
    private readonly IItemRepository _itemRepo;
    private readonly IInventoryTransactionRepository _invTxRepo;
    private readonly IItemWarehouseStockRepository _stockRepo;
    private readonly IWarehouseRepository _warehouseRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public PostInventoryAuditCommandHandler(
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

    public async Task<Result<PostInventoryAuditResultDto>> Handle(PostInventoryAuditCommand request, CancellationToken cancellationToken)
    {
        var req = request.Request;
        if (req.Items == null || req.Items.Count == 0)
        {
            return Result.Failure<PostInventoryAuditResultDto>(new Error("InventoryAudit.Empty", "لا توجد أصناف في كشف الجرد المقدم للترحيل"));
        }

        var companyId = req.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("00000000-0000-0000-0000-000000000001");
        var auditDate = (req.AuditDate ?? DateTime.UtcNow).Date;
        var targetWhCode = !string.IsNullOrWhiteSpace(req.WarehouseCode) ? req.WarehouseCode.Trim().ToUpperInvariant() : "WH-MAIN";

        // Generate Master Audit Reference Number
        var auditRefNo = !string.IsNullOrWhiteSpace(req.AuditReference) 
            ? req.AuditReference.Trim().ToUpperInvariant() 
            : $"AUD-{auditDate:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..5].ToUpper()}";

        var whEntity = await _warehouseRepo.GetByCodeAsync(companyId, targetWhCode, cancellationToken);
        var whId = whEntity?.Id ?? Guid.NewGuid();

        // Load Company Accounts & Warehouse Mapping
        var accounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        var whMapping = await _warehouseRepo.GetAccountMappingByCodeAsync(companyId, targetWhCode, 1, cancellationToken);

        // Fallback default GL accounts for Inventory, Gain, and Loss
        var defaultInventoryAccId = whMapping?.InventoryAccountId
                                  ?? accounts.FirstOrDefault(a => a.AccountCode == "11301" && a.IsPostable)?.Id
                                  ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("113") && a.IsPostable)?.Id;

        var defaultGainAccId = whMapping?.AdjustmentVarianceAccountId
                             ?? accounts.FirstOrDefault(a => a.AccountCode == "42101" && a.IsPostable)?.Id
                             ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("42") && a.IsPostable)?.Id;

        var defaultLossAccId = whMapping?.AdjustmentVarianceAccountId
                             ?? accounts.FirstOrDefault(a => a.AccountCode == "51101" && a.IsPostable)?.Id
                             ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("51") && a.IsPostable)?.Id
                             ?? accounts.FirstOrDefault(a => a.AccountCode.StartsWith("53") && a.IsPostable)?.Id;

        var surplusItems = new List<(Item Item, decimal Diff, decimal UnitCost, decimal Value, string Reason)>();
        var deficitItems = new List<(Item Item, decimal Diff, decimal UnitCost, decimal Value, string Reason)>();

        int evaluatedCount = req.Items.Count;

        foreach (var itemInput in req.Items)
        {
            var item = await _itemRepo.GetByIdAsync(itemInput.ItemId, cancellationToken);
            if (item == null || item.ItemType != ItemType.Stockable) continue;

            var previousQty = item.CurrentStockQuantity;
            var diff = itemInput.ActualQuantity - previousQty;

            if (Math.Abs(diff) < 0.0001m) continue; // Matched, no discrepancy

            var unitCost = item.CostPrice > 0 ? item.CostPrice : (item.PurchasePrice > 0 ? item.PurchasePrice : 1m);
            var value = Math.Round(Math.Abs(diff) * unitCost, 2);

            var reason = !string.IsNullOrWhiteSpace(itemInput.ReasonAr) 
                ? itemInput.ReasonAr.Trim() 
                : $"تسوية جردية بمحضر رقم {auditRefNo}";

            // 1. Update Master Item Stock
            item.AdjustStock(diff, unitCost, InventoryMovementType.InventoryAdjustment, request.AuditedBy);
            await _itemRepo.UpdateAsync(item, cancellationToken);

            // 2. Update Warehouse Stock
            var whStock = await _stockRepo.GetByCodeAsync(companyId, targetWhCode, item.Id, cancellationToken);
            if (whStock == null)
            {
                whStock = ItemWarehouseStock.Create(
                    tenantId: tenantId,
                    companyId: companyId,
                    itemId: item.Id,
                    warehouseId: whId,
                    warehouseCode: targetWhCode,
                    initialQuantity: itemInput.ActualQuantity,
                    createdBy: request.AuditedBy);
                await _stockRepo.AddAsync(whStock, cancellationToken);
            }
            else
            {
                whStock.SetQuantity(itemInput.ActualQuantity, request.AuditedBy);
            }

            // 3. Log Inventory Transaction
            var isSurplus = diff > 0;
            var invTx = InventoryTransaction.Create(
                tenantId: tenantId,
                companyId: companyId,
                itemId: item.Id,
                transactionDate: auditDate,
                movementType: InventoryMovementType.InventoryAdjustment,
                quantityIn: isSurplus ? diff : 0m,
                quantityOut: isSurplus ? 0m : Math.Abs(diff),
                unitCost: unitCost,
                balanceAfterQuantity: item.CurrentStockQuantity,
                referenceType: "InventoryAuditSession",
                referenceId: Guid.NewGuid(),
                referenceNumber: auditRefNo,
                notes: $"محضر جرد مستودع [{targetWhCode}] ({(isSurplus ? "فائض +" : "عجز -")}) - {reason}",
                createdBy: request.AuditedBy,
                warehouseId: whEntity?.Id,
                warehouseCode: targetWhCode);

            await _invTxRepo.AddAsync(invTx, cancellationToken);

            if (isSurplus)
            {
                surplusItems.Add((item, diff, unitCost, value, reason));
            }
            else
            {
                deficitItems.Add((item, Math.Abs(diff), unitCost, value, reason));
            }
        }

        var adjustedCount = surplusItems.Count + deficitItems.Count;
        if (adjustedCount == 0)
        {
            return Result.Success(new PostInventoryAuditResultDto(
                auditRefNo,
                auditDate,
                targetWhCode,
                evaluatedCount,
                0,
                0m,
                0m,
                0m,
                null,
                null,
                "جميع الأصناف مطابقة تماماً للأرصدة الدفترية، لم يتم إنشاء أي قيود تسوية.",
                "All items fully matched book quantities; no adjustment entries needed."
            ));
        }

        await _stockRepo.SaveChangesAsync(cancellationToken);
        await _invTxRepo.SaveChangesAsync(cancellationToken);
        await _itemRepo.SaveChangesAsync(cancellationToken);

        var totalSurplusValue = surplusItems.Sum(x => x.Value);
        var totalDeficitValue = deficitItems.Sum(x => x.Value);
        var netAdjValue = totalSurplusValue - totalDeficitValue;

        // 4. Create Consolidated Balanced Double-Entry Journal Entry
        Guid? jvId = null;
        string? jvNumber = null;

        if ((totalSurplusValue > 0 || totalDeficitValue > 0) && defaultInventoryAccId.HasValue)
        {
            var jvLines = new List<CreateJournalEntryLineRequest>();

            // --- DEBITS ---
            // A. Debit Inventory for Surplus Items (Asset Increase)
            foreach (var item in surplusItems)
            {
                var invAcc = item.Item.InventoryAccountId ?? defaultInventoryAccId.Value;
                jvLines.Add(new CreateJournalEntryLineRequest(
                    AccountId: invAcc,
                    Debit: item.Value,
                    Credit: 0m,
                    Description: $"فائض جردي: صنف {item.Item.ItemCode} - {item.Item.NameAr} (+{item.Diff:N2} {item.Item.UnitOfMeasure})",
                    CostCenterId: null
                ));
            }

            // B. Debit Inventory Shrinkage/Loss for Deficit Items (Expense)
            if (totalDeficitValue > 0 && defaultLossAccId.HasValue)
            {
                jvLines.Add(new CreateJournalEntryLineRequest(
                    AccountId: defaultLossAccId.Value,
                    Debit: totalDeficitValue,
                    Credit: 0m,
                    Description: $"خسائر وعجز جرد المستودع [{targetWhCode}] لعدد ({deficitItems.Count}) صنف بمحضر {auditRefNo}",
                    CostCenterId: null
                ));
            }

            // --- CREDITS ---
            // C. Credit Inventory Gain / Other Revenue for Surplus Items (Revenue)
            if (totalSurplusValue > 0 && defaultGainAccId.HasValue)
            {
                jvLines.Add(new CreateJournalEntryLineRequest(
                    AccountId: defaultGainAccId.Value,
                    Debit: 0m,
                    Credit: totalSurplusValue,
                    Description: $"أرباح ومكاسب فائض جرد المستودع [{targetWhCode}] لعدد ({surplusItems.Count}) صنف بمحضر {auditRefNo}",
                    CostCenterId: null
                ));
            }

            // D. Credit Inventory for Deficit Items (Asset Decrease)
            foreach (var item in deficitItems)
            {
                var invAcc = item.Item.InventoryAccountId ?? defaultInventoryAccId.Value;
                jvLines.Add(new CreateJournalEntryLineRequest(
                    AccountId: invAcc,
                    Debit: 0m,
                    Credit: item.Value,
                    Description: $"عجز جردي: صنف {item.Item.ItemCode} - {item.Item.NameAr} (-{item.Diff:N2} {item.Item.UnitOfMeasure})",
                    CostCenterId: null
                ));
            }

            var entryDescAr = $"قيد تسوية محضر الجرد الفعلي المجمع لمستودع [{targetWhCode}] سند {auditRefNo} - عدد ({adjustedCount}) صنف";
            var entryDescEn = $"Consolidated Physical Inventory Audit Journal Entry for [{targetWhCode}] ref: {auditRefNo} ({adjustedCount} items)";

            var jvCommand = new CreateJournalEntryCommand(
                CompanyId: companyId,
                EntryDate: auditDate,
                EntryType: JournalEntryType.Adjustment,
                DescriptionAr: entryDescAr,
                DescriptionEn: entryDescEn,
                ReferenceNumber: auditRefNo,
                PostImmediately: true,
                Lines: jvLines
            );

            var jvResult = await _mediator.Send(jvCommand, cancellationToken);
            if (jvResult.IsSuccess)
            {
                jvId = jvResult.Value.Id;
                jvNumber = jvResult.Value.EntryNumber;
            }
        }

        var summaryAr = $"تم بنجاح ترحيل محضر الجرد [{auditRefNo}] لمستودع [{targetWhCode}]؛ تم تسوية ({adjustedCount}) صنف (فائض: {totalSurplusValue:N2} ر.س، عجز: {totalDeficitValue:N2} ر.س، صافي الأثر: {netAdjValue:N2} ر.س) وتوليد القيد المعتمد [{jvNumber ?? "غير مرمز"}].";
        var summaryEn = $"Inventory audit [{auditRefNo}] posted successfully for [{targetWhCode}]; adjusted {adjustedCount} items (Surplus: {totalSurplusValue:N2}, Deficit: {totalDeficitValue:N2}, Net: {netAdjValue:N2}) with Journal Entry [{jvNumber ?? "N/A"}].";

        return Result.Success(new PostInventoryAuditResultDto(
            auditRefNo,
            auditDate,
            targetWhCode,
            evaluatedCount,
            adjustedCount,
            totalSurplusValue,
            totalDeficitValue,
            netAdjValue,
            jvId,
            jvNumber,
            summaryAr,
            summaryEn
        ));
    }
}
