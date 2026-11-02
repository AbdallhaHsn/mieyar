using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Purchasing.Application.Commands.Receipts;

public record CreateReceiptLineRequest(
    Guid? PurchaseOrderLineId,
    Guid? ItemId,
    string? ItemCode,
    string ItemNameAr,
    string? ItemNameEn,
    string UnitOfMeasure,
    decimal QuantityOrdered,
    decimal QuantityReceived,
    decimal QuantityAccepted,
    decimal QuantityRejected,
    string? RejectionReason,
    decimal UnitCost,
    string? WarehouseCode = "WH-01",
    string? Notes = null
);

public record CreateGoodsReceiptNoteCommand(
    Guid? CompanyId,
    Guid? PurchaseOrderId,
    string? PurchaseOrderNumber,
    Guid VendorId,
    string VendorName,
    string? DeliveryNoteNumber,
    DateTime ReceiptDate,
    string WarehouseCode,
    string ReceiverName,
    string? InspectorName,
    string? Notes,
    List<CreateReceiptLineRequest> Lines,
    bool AutoPost = true
) : IRequest<Result<GoodsReceiptNoteDto>>;

public class CreateGoodsReceiptNoteCommandHandler : IRequestHandler<CreateGoodsReceiptNoteCommand, Result<GoodsReceiptNoteDto>>
{
    private readonly IGoodsReceiptNoteRepository _grnRepo;
    private readonly IPurchaseOrderRepository _orderRepo;
    private readonly IItemRepository _itemRepo;
    private readonly IInventoryTransactionRepository _invTxRepo;

    public CreateGoodsReceiptNoteCommandHandler(
        IGoodsReceiptNoteRepository grnRepo,
        IPurchaseOrderRepository orderRepo,
        IItemRepository itemRepo,
        IInventoryTransactionRepository invTxRepo)
    {
        _grnRepo = grnRepo;
        _orderRepo = orderRepo;
        _itemRepo = itemRepo;
        _invTxRepo = invTxRepo;
    }

    public async Task<Result<GoodsReceiptNoteDto>> Handle(CreateGoodsReceiptNoteCommand request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var tenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

        var year = DateTime.UtcNow.Year;
        var receiptNumber = await _grnRepo.GenerateNextReceiptNumberAsync(companyId, year, cancellationToken);

        var grn = GoodsReceiptNote.Create(
            tenantId,
            companyId,
            receiptNumber,
            request.VendorId,
            request.VendorName,
            request.ReceiptDate,
            request.WarehouseCode,
            request.ReceiverName,
            request.DeliveryNoteNumber,
            request.PurchaseOrderId,
            request.PurchaseOrderNumber,
            request.InspectorName,
            request.Notes,
            request.ReceiverName);

        foreach (var l in request.Lines)
        {
            grn.AddLine(
                l.ItemNameAr,
                l.ItemNameEn ?? string.Empty,
                l.QuantityOrdered,
                l.QuantityReceived,
                l.QuantityAccepted,
                l.QuantityRejected,
                l.UnitCost,
                l.UnitOfMeasure,
                l.WarehouseCode ?? request.WarehouseCode,
                l.ItemId,
                l.ItemCode,
                l.PurchaseOrderLineId,
                l.RejectionReason,
                l.Notes);
        }

        PurchaseOrder? order = null;
        if (request.PurchaseOrderId.HasValue)
        {
            order = await _orderRepo.GetByIdAsync(request.PurchaseOrderId.Value, cancellationToken);
        }

        if (request.AutoPost)
        {
            grn.AcceptAndPost(request.ReceiverName);

            // 1. Update quantities in PurchaseOrder if linked
            if (order != null)
            {
                foreach (var line in grn.Lines)
                {
                    if (line.PurchaseOrderLineId.HasValue)
                    {
                        var poLine = order.Lines.FirstOrDefault(pl => pl.Id == line.PurchaseOrderLineId.Value);
                        if (poLine != null)
                        {
                            poLine.RecordReceivedQuantity(line.QuantityAccepted);
                        }
                    }
                }
                order.UpdateDeliveryAndBillingStatus();
                await _orderRepo.UpdateAsync(order, cancellationToken);
                await _orderRepo.SaveChangesAsync(cancellationToken);
            }

            // 2. Adjust Stock in Item and create InventoryTransaction
            foreach (var line in grn.Lines)
            {
                if (line.ItemId.HasValue && line.QuantityAccepted > 0)
                {
                    var item = await _itemRepo.GetByIdAsync(line.ItemId.Value, cancellationToken);
                    if (item != null && item.ItemType == ItemType.Stockable)
                    {
                        item.AdjustStock(line.QuantityAccepted, line.UnitCost, InventoryMovementType.PurchaseIn, request.ReceiverName);
                        await _itemRepo.UpdateAsync(item, cancellationToken);

                        var invTx = InventoryTransaction.Create(
                            grn.TenantId,
                            grn.CompanyId,
                            item.Id,
                            grn.ReceiptDate,
                            InventoryMovementType.PurchaseIn,
                            quantityIn: line.QuantityAccepted,
                            quantityOut: 0,
                            unitCost: line.UnitCost,
                            balanceAfterQuantity: item.CurrentStockQuantity,
                            referenceType: "GoodsReceiptNote",
                            referenceId: grn.Id,
                            referenceNumber: grn.ReceiptNumber,
                            notes: $"محضر استلام مخزني وفحص من المورد: {grn.VendorName} (سند: {grn.ReceiptNumber})",
                            createdBy: request.ReceiverName);

                        await _invTxRepo.AddAsync(invTx, cancellationToken);
                    }
                }
            }
            await _invTxRepo.SaveChangesAsync(cancellationToken);
        }

        await _grnRepo.AddAsync(grn, cancellationToken);
        await _grnRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(GoodsReceiptNoteDto.FromEntity(grn));
    }
}

public record GetGoodsReceiptNotesQuery(
    Guid? CompanyId,
    Guid? PurchaseOrderId = null,
    Guid? VendorId = null,
    GoodsReceiptStatus? Status = null,
    string? Search = null
) : IRequest<Result<List<GoodsReceiptNoteDto>>>;

public class GetGoodsReceiptNotesQueryHandler : IRequestHandler<GetGoodsReceiptNotesQuery, Result<List<GoodsReceiptNoteDto>>>
{
    private readonly IGoodsReceiptNoteRepository _grnRepo;

    public GetGoodsReceiptNotesQueryHandler(IGoodsReceiptNoteRepository grnRepo)
    {
        _grnRepo = grnRepo;
    }

    public async Task<Result<List<GoodsReceiptNoteDto>>> Handle(GetGoodsReceiptNotesQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var list = await _grnRepo.GetListAsync(
            companyId,
            request.PurchaseOrderId,
            request.VendorId,
            request.Status,
            null,
            null,
            request.Search,
            0,
            100,
            cancellationToken);

        return Result.Success(list.Select(GoodsReceiptNoteDto.FromEntity).ToList());
    }
}

public record GetGoodsReceiptNoteByIdQuery(Guid ReceiptId) : IRequest<Result<GoodsReceiptNoteDto>>;

public class GetGoodsReceiptNoteByIdQueryHandler : IRequestHandler<GetGoodsReceiptNoteByIdQuery, Result<GoodsReceiptNoteDto>>
{
    private readonly IGoodsReceiptNoteRepository _grnRepo;

    public GetGoodsReceiptNoteByIdQueryHandler(IGoodsReceiptNoteRepository grnRepo)
    {
        _grnRepo = grnRepo;
    }

    public async Task<Result<GoodsReceiptNoteDto>> Handle(GetGoodsReceiptNoteByIdQuery request, CancellationToken cancellationToken)
    {
        var grn = await _grnRepo.GetByIdAsync(request.ReceiptId, cancellationToken);
        if (grn == null)
            return Result.Failure<GoodsReceiptNoteDto>(Error.NotFound("Receipt.NotFound", "محضر الاستلام غير موجود"));

        return Result.Success(GoodsReceiptNoteDto.FromEntity(grn));
    }
}
