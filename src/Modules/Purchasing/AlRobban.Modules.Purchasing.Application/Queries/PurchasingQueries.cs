using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Purchasing.Application.Queries;

// 1. Get Items
public record GetItemsQuery(
    Guid? CompanyId = null,
    ItemType? ItemType = null,
    string? SearchTerm = null,
    bool ActiveOnly = true
) : IRequest<Result<List<ItemDto>>>;

public class GetItemsQueryHandler : IRequestHandler<GetItemsQuery, Result<List<ItemDto>>>
{
    private readonly IItemRepository _itemRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetItemsQueryHandler(IItemRepository itemRepo, ICurrentTenantContext tenantContext)
    {
        _itemRepo = itemRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<List<ItemDto>>> Handle(GetItemsQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? tenantId;

        var items = await _itemRepo.GetListAsync(
            companyId,
            request.ItemType,
            request.SearchTerm,
            request.ActiveOnly,
            cancellationToken);

        return Result.Success(items.Select(ItemDto.FromEntity).ToList());
    }
}

// 2. Get Item By Id
public record GetItemByIdQuery(Guid Id) : IRequest<Result<ItemDto>>;

public class GetItemByIdQueryHandler : IRequestHandler<GetItemByIdQuery, Result<ItemDto>>
{
    private readonly IItemRepository _itemRepo;

    public GetItemByIdQueryHandler(IItemRepository itemRepo)
    {
        _itemRepo = itemRepo;
    }

    public async Task<Result<ItemDto>> Handle(GetItemByIdQuery request, CancellationToken cancellationToken)
    {
        var item = await _itemRepo.GetByIdAsync(request.Id, cancellationToken);
        if (item == null)
        {
            return Result.Failure<ItemDto>(new Error("Item.NotFound", "الصنف المطلوب غير موجود"));
        }

        return Result.Success(ItemDto.FromEntity(item));
    }
}

// 3. Get Purchase Invoices List
public record GetPurchaseInvoicesQuery(
    Guid? CompanyId = null,
    Guid? VendorId = null,
    PurchaseInvoiceStatus? Status = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? SearchTerm = null,
    int Skip = 0,
    int Take = 50
) : IRequest<Result<List<PurchaseInvoiceDto>>>;

public class GetPurchaseInvoicesQueryHandler : IRequestHandler<GetPurchaseInvoicesQuery, Result<List<PurchaseInvoiceDto>>>
{
    private readonly IPurchaseInvoiceRepository _invoiceRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetPurchaseInvoicesQueryHandler(IPurchaseInvoiceRepository invoiceRepo, ICurrentTenantContext tenantContext)
    {
        _invoiceRepo = invoiceRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<List<PurchaseInvoiceDto>>> Handle(GetPurchaseInvoicesQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? tenantId;

        var invoices = await _invoiceRepo.GetListAsync(
            companyId,
            request.VendorId,
            request.Status,
            request.FromDate,
            request.ToDate,
            request.SearchTerm,
            request.Skip,
            request.Take,
            cancellationToken);

        return Result.Success(invoices.Select(PurchaseInvoiceDto.FromEntity).ToList());
    }
}

// 4. Get Purchase Invoice By Id
public record GetPurchaseInvoiceByIdQuery(Guid Id) : IRequest<Result<PurchaseInvoiceDto>>;

public class GetPurchaseInvoiceByIdQueryHandler : IRequestHandler<GetPurchaseInvoiceByIdQuery, Result<PurchaseInvoiceDto>>
{
    private readonly IPurchaseInvoiceRepository _invoiceRepo;

    public GetPurchaseInvoiceByIdQueryHandler(IPurchaseInvoiceRepository invoiceRepo)
    {
        _invoiceRepo = invoiceRepo;
    }

    public async Task<Result<PurchaseInvoiceDto>> Handle(GetPurchaseInvoiceByIdQuery request, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(request.Id, cancellationToken);
        if (invoice == null)
        {
            return Result.Failure<PurchaseInvoiceDto>(new Error("PurchaseInvoice.NotFound", "فاتورة المشتريات غير موجودة"));
        }

        return Result.Success(PurchaseInvoiceDto.FromEntity(invoice));
    }
}

// 5. Get Purchase KPIs
public record GetPurchaseKpisQuery(Guid? CompanyId = null) : IRequest<Result<PurchaseKpisDto>>;

public class GetPurchaseKpisQueryHandler : IRequestHandler<GetPurchaseKpisQuery, Result<PurchaseKpisDto>>
{
    private readonly IPurchaseInvoiceRepository _invoiceRepo;
    private readonly IItemRepository _itemRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetPurchaseKpisQueryHandler(
        IPurchaseInvoiceRepository invoiceRepo,
        IItemRepository itemRepo,
        ICurrentTenantContext tenantContext)
    {
        _invoiceRepo = invoiceRepo;
        _itemRepo = itemRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<PurchaseKpisDto>> Handle(GetPurchaseKpisQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? tenantId;

        var allInvoices = await _invoiceRepo.GetListAsync(companyId, skip: 0, take: 5000, cancellationToken: cancellationToken);
        var allItems = await _itemRepo.GetListAsync(companyId, activeOnly: true, cancellationToken: cancellationToken);

        var totalInvoicesCount = allInvoices.Count;
        var totalPurchasesAmount = allInvoices.Where(x => x.Status == PurchaseInvoiceStatus.Posted).Sum(x => x.TotalAmount);
        var totalInputVatAmount = allInvoices.Where(x => x.Status == PurchaseInvoiceStatus.Posted).Sum(x => x.TotalVat);
        var totalUnpaidAmount = allInvoices.Where(x => x.Status == PurchaseInvoiceStatus.Posted && x.PaymentStatus != PurchasePaymentStatus.Paid).Sum(x => x.TotalAmount - x.PaidAmount);

        var totalItemsCount = allItems.Count;
        var totalStockValuation = allItems.Where(x => x.ItemType == ItemType.Stockable).Sum(x => x.CurrentStockQuantity * x.CostPrice);

        return Result.Success(new PurchaseKpisDto(
            totalInvoicesCount,
            totalPurchasesAmount,
            totalInputVatAmount,
            totalUnpaidAmount,
            totalItemsCount,
            totalStockValuation));
    }
}

// 6. Get Item Inventory History
public record GetItemInventoryHistoryQuery(Guid ItemId) : IRequest<Result<List<InventoryTransactionDto>>>;

public class GetItemInventoryHistoryQueryHandler : IRequestHandler<GetItemInventoryHistoryQuery, Result<List<InventoryTransactionDto>>>
{
    private readonly IInventoryTransactionRepository _invTxRepo;
    private readonly IItemRepository _itemRepo;

    public GetItemInventoryHistoryQueryHandler(IInventoryTransactionRepository invTxRepo, IItemRepository itemRepo)
    {
        _invTxRepo = invTxRepo;
        _itemRepo = itemRepo;
    }

    public async Task<Result<List<InventoryTransactionDto>>> Handle(GetItemInventoryHistoryQuery request, CancellationToken cancellationToken)
    {
        var item = await _itemRepo.GetByIdAsync(request.ItemId, cancellationToken);
        if (item == null)
        {
            return Result.Failure<List<InventoryTransactionDto>>(new Error("Item.NotFound", "الصنف غير موجود"));
        }

        var txs = await _invTxRepo.GetByItemIdAsync(request.ItemId, cancellationToken: cancellationToken);

        var dtos = txs.Select(t => new InventoryTransactionDto(
            t.Id,
            t.ItemId,
            item.ItemCode,
            item.NameAr,
            t.TransactionDate,
            t.MovementType,
            t.QuantityIn,
            t.QuantityOut,
            t.UnitCost,
            t.TotalCost,
            t.BalanceAfterQuantity,
            t.ReferenceType,
            t.ReferenceNumber,
            t.Notes,
            t.CreatedAtUtc
        )).ToList();

        return Result.Success(dtos);
    }
}

// 7. Get All Inventory Transactions
public record GetAllInventoryTransactionsQuery(
    Guid? CompanyId = null,
    Guid? ItemId = null,
    Guid? WarehouseId = null,
    string? WarehouseCode = null,
    InventoryMovementType? MovementType = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null
) : IRequest<Result<List<InventoryTransactionDto>>>;

public class GetAllInventoryTransactionsQueryHandler : IRequestHandler<GetAllInventoryTransactionsQuery, Result<List<InventoryTransactionDto>>>
{
    private readonly IInventoryTransactionRepository _invTxRepo;
    private readonly IItemRepository _itemRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetAllInventoryTransactionsQueryHandler(
        IInventoryTransactionRepository invTxRepo,
        IItemRepository itemRepo,
        ICurrentTenantContext tenantContext)
    {
        _invTxRepo = invTxRepo;
        _itemRepo = itemRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<List<InventoryTransactionDto>>> Handle(GetAllInventoryTransactionsQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? tenantId;

        var txs = await _invTxRepo.GetListAsync(
            companyId: companyId,
            itemId: request.ItemId,
            warehouseId: request.WarehouseId,
            warehouseCode: request.WarehouseCode,
            movementType: request.MovementType,
            fromDate: request.FromDate,
            toDate: request.ToDate,
            cancellationToken: cancellationToken);

        var items = await _itemRepo.GetListAsync(companyId, cancellationToken: cancellationToken);
        var itemMap = items.ToDictionary(i => i.Id);

        var dtos = txs.Select(t => {
            itemMap.TryGetValue(t.ItemId, out var item);
            return new InventoryTransactionDto(
                t.Id,
                t.ItemId,
                item?.ItemCode ?? "N/A",
                item?.NameAr ?? "صنف غير معرف",
                t.TransactionDate,
                t.MovementType,
                t.QuantityIn,
                t.QuantityOut,
                t.UnitCost,
                t.TotalCost,
                t.BalanceAfterQuantity,
                t.ReferenceType,
                t.ReferenceNumber,
                t.Notes,
                t.CreatedAtUtc,
                t.WarehouseId,
                t.WarehouseCode
            );
        }).OrderByDescending(x => x.TransactionDate).ToList();

        return Result.Success(dtos);
    }
}

// 8. Get Item Warehouse Stocks Query
public record GetItemWarehouseStocksQuery(
    Guid? CompanyId = null,
    Guid? ItemId = null,
    Guid? WarehouseId = null
) : IRequest<Result<List<ItemWarehouseStockDto>>>;

public class GetItemWarehouseStocksQueryHandler : IRequestHandler<GetItemWarehouseStocksQuery, Result<List<ItemWarehouseStockDto>>>
{
    private readonly IItemWarehouseStockRepository _stockRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetItemWarehouseStocksQueryHandler(
        IItemWarehouseStockRepository stockRepo,
        ICurrentTenantContext tenantContext)
    {
        _stockRepo = stockRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<List<ItemWarehouseStockDto>>> Handle(GetItemWarehouseStocksQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? tenantId;

        List<ItemWarehouseStock> stocks;

        if (request.WarehouseId.HasValue)
        {
            stocks = await _stockRepo.GetByWarehouseAsync(companyId, request.WarehouseId.Value, cancellationToken);
        }
        else if (request.ItemId.HasValue)
        {
            stocks = await _stockRepo.GetByItemAsync(companyId, request.ItemId.Value, cancellationToken);
        }
        else
        {
            stocks = await _stockRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        }

        var dtos = stocks.Select(s => new ItemWarehouseStockDto(
            s.Id,
            s.ItemId,
            s.Item?.ItemCode ?? "N/A",
            s.Item?.NameAr ?? "صنف غير معرف",
            s.Item?.NameEn ?? string.Empty,
            s.WarehouseId,
            s.WarehouseCode,
            s.Warehouse?.NameAr ?? s.WarehouseCode,
            s.Warehouse?.NameEn ?? s.WarehouseCode,
            s.Quantity,
            s.Item?.CostPrice ?? 0,
            Math.Round(s.Quantity * (s.Item?.CostPrice ?? 0), 2),
            s.MinStockLevel,
            s.MaxStockLevel,
            s.BinLocation,
            s.LastMovementAtUtc
        )).OrderBy(x => x.WarehouseCode).ThenBy(x => x.ItemCode).ToList();

        return Result.Success(dtos);
    }
}
