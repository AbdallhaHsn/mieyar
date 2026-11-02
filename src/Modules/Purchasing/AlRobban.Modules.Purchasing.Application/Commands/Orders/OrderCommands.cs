using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Purchasing.Application.Commands.Orders;

public record CreatePurchaseOrderLineRequest(
    Guid? ItemId,
    string? ItemCode,
    string ItemNameAr,
    string? ItemNameEn,
    decimal QuantityOrdered,
    decimal UnitPrice,
    decimal DiscountAmount = 0,
    decimal VatRate = 15.00m,
    string UnitOfMeasure = "حبة",
    string? WarehouseCode = "WH-01",
    Guid? CostCenterId = null,
    string? Notes = null
);

public record CreatePurchaseOrderCommand(
    Guid? CompanyId,
    Guid VendorId,
    string VendorName,
    string? VendorVatNumber,
    string? VendorCrNumber,
    DateTime OrderDate,
    DateTime? ExpectedDeliveryDate,
    Guid? RequisitionId,
    string? RequisitionNumber,
    string PaymentTerms,
    string Currency,
    decimal ExchangeRateToSar,
    string BranchCode,
    string WarehouseCode,
    Guid? CostCenterId,
    string? Notes,
    List<CreatePurchaseOrderLineRequest> Lines
) : IRequest<Result<PurchaseOrderDto>>;

public class CreatePurchaseOrderCommandHandler : IRequestHandler<CreatePurchaseOrderCommand, Result<PurchaseOrderDto>>
{
    private readonly IPurchaseOrderRepository _orderRepo;
    private readonly IPurchaseRequisitionRepository _requisitionRepo;

    public CreatePurchaseOrderCommandHandler(
        IPurchaseOrderRepository orderRepo,
        IPurchaseRequisitionRepository requisitionRepo)
    {
        _orderRepo = orderRepo;
        _requisitionRepo = requisitionRepo;
    }

    public async Task<Result<PurchaseOrderDto>> Handle(CreatePurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var tenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

        var year = DateTime.UtcNow.Year;
        var orderNumber = await _orderRepo.GenerateNextOrderNumberAsync(companyId, year, cancellationToken);

        var order = PurchaseOrder.Create(
            tenantId,
            companyId,
            orderNumber,
            request.VendorId,
            request.VendorName,
            request.VendorVatNumber,
            request.VendorCrNumber,
            request.OrderDate,
            request.ExpectedDeliveryDate,
            request.RequisitionId,
            request.RequisitionNumber,
            request.PaymentTerms,
            request.Currency,
            request.ExchangeRateToSar,
            request.BranchCode,
            request.WarehouseCode,
            request.CostCenterId,
            request.Notes,
            "مدير المشتريات");

        foreach (var l in request.Lines)
        {
            order.AddLine(
                l.ItemNameAr,
                l.ItemNameEn ?? string.Empty,
                l.QuantityOrdered,
                l.UnitPrice,
                l.DiscountAmount,
                l.VatRate,
                l.UnitOfMeasure,
                l.ItemId,
                l.ItemCode,
                l.WarehouseCode,
                l.CostCenterId,
                l.Notes);
        }

        await _orderRepo.AddAsync(order, cancellationToken);
        await _orderRepo.SaveChangesAsync(cancellationToken);

        // If this PO was created from a requisition, update the requisition's status
        if (request.RequisitionId.HasValue)
        {
            var req = await _requisitionRepo.GetByIdAsync(request.RequisitionId.Value, cancellationToken);
            if (req != null)
            {
                req.MarkConvertedToPo(order.Id, order.OrderNumber);
                await _requisitionRepo.UpdateAsync(req, cancellationToken);
                await _requisitionRepo.SaveChangesAsync(cancellationToken);
            }
        }

        return Result.Success(PurchaseOrderDto.FromEntity(order));
    }
}

public record ConfirmPurchaseOrderCommand(Guid OrderId, string? ConfirmedBy) : IRequest<Result<PurchaseOrderDto>>;

public class ConfirmPurchaseOrderCommandHandler : IRequestHandler<ConfirmPurchaseOrderCommand, Result<PurchaseOrderDto>>
{
    private readonly IPurchaseOrderRepository _orderRepo;

    public ConfirmPurchaseOrderCommandHandler(IPurchaseOrderRepository orderRepo)
    {
        _orderRepo = orderRepo;
    }

    public async Task<Result<PurchaseOrderDto>> Handle(ConfirmPurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _orderRepo.GetByIdAsync(request.OrderId, cancellationToken);
        if (order == null)
            return Result.Failure<PurchaseOrderDto>(Error.NotFound("Order.NotFound", "أمر الشراء غير موجود"));

        order.Confirm(request.ConfirmedBy ?? "مدير المشتريات");
        await _orderRepo.UpdateAsync(order, cancellationToken);
        await _orderRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(PurchaseOrderDto.FromEntity(order));
    }
}

public record CancelPurchaseOrderCommand(Guid OrderId, string? CancelledBy) : IRequest<Result<PurchaseOrderDto>>;

public class CancelPurchaseOrderCommandHandler : IRequestHandler<CancelPurchaseOrderCommand, Result<PurchaseOrderDto>>
{
    private readonly IPurchaseOrderRepository _orderRepo;

    public CancelPurchaseOrderCommandHandler(IPurchaseOrderRepository orderRepo)
    {
        _orderRepo = orderRepo;
    }

    public async Task<Result<PurchaseOrderDto>> Handle(CancelPurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _orderRepo.GetByIdAsync(request.OrderId, cancellationToken);
        if (order == null)
            return Result.Failure<PurchaseOrderDto>(Error.NotFound("Order.NotFound", "أمر الشراء غير موجود"));

        order.Cancel(request.CancelledBy ?? "مدير المشتريات");
        await _orderRepo.UpdateAsync(order, cancellationToken);
        await _orderRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(PurchaseOrderDto.FromEntity(order));
    }
}

public record GetPurchaseOrdersQuery(
    Guid? CompanyId,
    Guid? VendorId = null,
    PurchaseOrderStatus? Status = null,
    string? Search = null
) : IRequest<Result<List<PurchaseOrderDto>>>;

public class GetPurchaseOrdersQueryHandler : IRequestHandler<GetPurchaseOrdersQuery, Result<List<PurchaseOrderDto>>>
{
    private readonly IPurchaseOrderRepository _orderRepo;

    public GetPurchaseOrdersQueryHandler(IPurchaseOrderRepository orderRepo)
    {
        _orderRepo = orderRepo;
    }

    public async Task<Result<List<PurchaseOrderDto>>> Handle(GetPurchaseOrdersQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var list = await _orderRepo.GetListAsync(
            companyId,
            request.VendorId,
            request.Status,
            null,
            null,
            request.Search,
            0,
            100,
            cancellationToken);

        return Result.Success(list.Select(PurchaseOrderDto.FromEntity).ToList());
    }
}

public record GetPurchaseOrderByIdQuery(Guid OrderId) : IRequest<Result<PurchaseOrderDto>>;

public class GetPurchaseOrderByIdQueryHandler : IRequestHandler<GetPurchaseOrderByIdQuery, Result<PurchaseOrderDto>>
{
    private readonly IPurchaseOrderRepository _orderRepo;

    public GetPurchaseOrderByIdQueryHandler(IPurchaseOrderRepository orderRepo)
    {
        _orderRepo = orderRepo;
    }

    public async Task<Result<PurchaseOrderDto>> Handle(GetPurchaseOrderByIdQuery request, CancellationToken cancellationToken)
    {
        var order = await _orderRepo.GetByIdAsync(request.OrderId, cancellationToken);
        if (order == null)
            return Result.Failure<PurchaseOrderDto>(Error.NotFound("Order.NotFound", "أمر الشراء غير موجود"));

        return Result.Success(PurchaseOrderDto.FromEntity(order));
    }
}
