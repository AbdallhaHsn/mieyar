using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Purchasing.Application.Commands.Items;

public record CreateItemCommand(
    Guid? CompanyId,
    string ItemCode,
    string NameAr,
    string NameEn,
    ItemType ItemType,
    string UnitOfMeasure,
    decimal PurchasePrice,
    decimal SalePrice,
    decimal CostPrice = 0,
    string? Barcode = null,
    Guid? InventoryAccountId = null,
    Guid? CogsAccountId = null,
    Guid? RevenueAccountId = null,
    decimal MinStockLevel = 0
) : IRequest<Result<ItemDto>>;

public class CreateItemCommandHandler : IRequestHandler<CreateItemCommand, Result<ItemDto>>
{
    private readonly IItemRepository _itemRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateItemCommandHandler(IItemRepository itemRepo, ICurrentTenantContext tenantContext)
    {
        _itemRepo = itemRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<ItemDto>> Handle(CreateItemCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? tenantId;

        if (string.IsNullOrWhiteSpace(request.ItemCode))
        {
            return Result.Failure<ItemDto>(new Error("Item.InvalidCode", "كود الصنف إلزامي"));
        }

        if (string.IsNullOrWhiteSpace(request.NameAr))
        {
            return Result.Failure<ItemDto>(new Error("Item.InvalidName", "اسم الصنف باللغة العربية إلزامي"));
        }

        var exists = await _itemRepo.ExistsCodeAsync(companyId, request.ItemCode, cancellationToken: cancellationToken);
        if (exists)
        {
            return Result.Failure<ItemDto>(new Error("Item.DuplicateCode", $"كود الصنف '{request.ItemCode}' مسجل مسبقاً في النظام."));
        }

        var item = Item.Create(
            tenantId,
            companyId,
            request.ItemCode,
            request.NameAr,
            request.NameEn,
            request.ItemType,
            request.UnitOfMeasure,
            request.PurchasePrice,
            request.SalePrice,
            request.CostPrice,
            request.Barcode,
            request.InventoryAccountId,
            request.CogsAccountId,
            request.RevenueAccountId,
            request.MinStockLevel,
            createdBy: "المستخدم");

        await _itemRepo.AddAsync(item, cancellationToken);
        await _itemRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(ItemDto.FromEntity(item));
    }
}

public record UpdateItemCommand(
    Guid Id,
    string NameAr,
    string NameEn,
    ItemType ItemType,
    string UnitOfMeasure,
    decimal PurchasePrice,
    decimal SalePrice,
    string? Barcode = null,
    Guid? InventoryAccountId = null,
    Guid? CogsAccountId = null,
    Guid? RevenueAccountId = null,
    decimal MinStockLevel = 0,
    bool IsActive = true
) : IRequest<Result<ItemDto>>;

public class UpdateItemCommandHandler : IRequestHandler<UpdateItemCommand, Result<ItemDto>>
{
    private readonly IItemRepository _itemRepo;

    public UpdateItemCommandHandler(IItemRepository itemRepo)
    {
        _itemRepo = itemRepo;
    }

    public async Task<Result<ItemDto>> Handle(UpdateItemCommand request, CancellationToken cancellationToken)
    {
        var item = await _itemRepo.GetByIdAsync(request.Id, cancellationToken);
        if (item == null)
        {
            return Result.Failure<ItemDto>(new Error("Item.NotFound", "الصنف المطلوب غير موجود"));
        }

        item.UpdateDetails(
            request.NameAr,
            request.NameEn,
            request.ItemType,
            request.UnitOfMeasure,
            request.Barcode,
            request.InventoryAccountId,
            request.CogsAccountId,
            request.RevenueAccountId,
            request.MinStockLevel,
            request.IsActive,
            updatedBy: "المستخدم");

        item.UpdatePrices(request.PurchasePrice, request.SalePrice, updatedBy: "المستخدم");

        await _itemRepo.UpdateAsync(item, cancellationToken);
        await _itemRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(ItemDto.FromEntity(item));
    }
}

public record DeleteItemCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteItemCommandHandler : IRequestHandler<DeleteItemCommand, Result<bool>>
{
    private readonly IItemRepository _itemRepo;

    public DeleteItemCommandHandler(IItemRepository itemRepo)
    {
        _itemRepo = itemRepo;
    }

    public async Task<Result<bool>> Handle(DeleteItemCommand request, CancellationToken cancellationToken)
    {
        var item = await _itemRepo.GetByIdAsync(request.Id, cancellationToken);
        if (item == null)
        {
            return Result.Failure<bool>(new Error("Item.NotFound", "الصنف المطلوب غير موجود"));
        }

        if (item.CurrentStockQuantity != 0)
        {
            return Result.Failure<bool>(new Error("Item.HasStock", "لا يمكن حذف صنف يحتوي على رصيد مخزني حالي. يمكنك تعطيل الصنف بدلاً من حذفه."));
        }

        await _itemRepo.DeleteAsync(item, cancellationToken);
        await _itemRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}
