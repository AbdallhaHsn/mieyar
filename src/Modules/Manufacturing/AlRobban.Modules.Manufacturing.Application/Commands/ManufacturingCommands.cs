using AlRobban.Modules.Manufacturing.Application.DTOs;
using AlRobban.Modules.Manufacturing.Application.Queries;
using AlRobban.Modules.Manufacturing.Domain.Entities;
using AlRobban.Modules.Manufacturing.Domain.Enums;
using AlRobban.Modules.Manufacturing.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Manufacturing.Application.Commands;

// 1. Bill of Materials Commands
public record CreateBomCommand(
    Guid? CompanyId,
    string Code,
    string NameAr,
    string? NameEn,
    string FinishedProductId,
    string FinishedProductCode,
    string FinishedProductNameAr,
    string? FinishedProductNameEn,
    decimal OutputQuantity,
    string UnitOfMeasure,
    Guid? RawMaterialsWarehouseId,
    string? RawMaterialsWarehouseName,
    Guid? FinishedGoodsWarehouseId,
    string? FinishedGoodsWarehouseName,
    string? Version,
    string? Notes,
    List<CreateBomComponentItem>? Components,
    List<CreateBomOperationItem>? Operations) : IRequest<Result<BillOfMaterialsDto>>;

public record CreateBomComponentItem(
    Guid? ItemId,
    string ItemCode,
    string NameAr,
    string? NameEn,
    decimal QuantityRequired,
    string UnitOfMeasure,
    decimal ScrapPercentage,
    decimal UnitCost);

public record CreateBomOperationItem(
    string OperationNameAr,
    string? OperationNameEn,
    Guid? WorkstationId,
    string? WorkstationName,
    decimal StandardTimeMinutes,
    decimal HourlyLaborRate,
    decimal HourlyOverheadRate);

public class CreateBomCommandHandler : IRequestHandler<CreateBomCommand, Result<BillOfMaterialsDto>>
{
    private readonly IBillOfMaterialsRepository _repo;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateBomCommandHandler(IBillOfMaterialsRepository repo, ICurrentTenantContext tenantContext)
    {
        _repo = repo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<BillOfMaterialsDto>> Handle(CreateBomCommand request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        var bom = new BillOfMaterials(Guid.NewGuid())
        {
            CompanyId = companyId,
            Code = string.IsNullOrWhiteSpace(request.Code) ? $"BOM-{DateTime.UtcNow.Ticks % 100000:D5}" : request.Code.Trim(),
            NameAr = request.NameAr.Trim(),
            NameEn = string.IsNullOrWhiteSpace(request.NameEn) ? request.NameAr.Trim() : request.NameEn.Trim(),
            FinishedProductId = request.FinishedProductId,
            FinishedProductCode = request.FinishedProductCode,
            FinishedProductNameAr = request.FinishedProductNameAr,
            FinishedProductNameEn = string.IsNullOrWhiteSpace(request.FinishedProductNameEn) ? request.FinishedProductNameAr : request.FinishedProductNameEn,
            OutputQuantity = request.OutputQuantity > 0 ? request.OutputQuantity : 1m,
            UnitOfMeasure = request.UnitOfMeasure,
            RawMaterialsWarehouseId = request.RawMaterialsWarehouseId,
            RawMaterialsWarehouseName = request.RawMaterialsWarehouseName ?? string.Empty,
            FinishedGoodsWarehouseId = request.FinishedGoodsWarehouseId,
            FinishedGoodsWarehouseName = request.FinishedGoodsWarehouseName ?? string.Empty,
            Version = string.IsNullOrWhiteSpace(request.Version) ? "1.0" : request.Version,
            Notes = request.Notes,
            IsActive = true
        };

        if (request.Components != null)
        {
            foreach (var c in request.Components)
            {
                var total = Math.Round(c.QuantityRequired * c.UnitCost * (1m + (c.ScrapPercentage / 100m)), 2);
                bom.Components.Add(new BomComponent(Guid.NewGuid())
                {
                    CompanyId = companyId,
                    BomId = bom.Id,
                    ItemId = c.ItemId,
                    ItemCode = c.ItemCode,
                    ItemNameAr = c.NameAr,
                    ItemNameEn = string.IsNullOrWhiteSpace(c.NameEn) ? c.NameAr : c.NameEn,
                    QuantityRequired = c.QuantityRequired,
                    UnitOfMeasure = c.UnitOfMeasure,
                    ScrapPercentage = c.ScrapPercentage,
                    UnitCost = c.UnitCost,
                    TotalCost = total
                });
            }
        }

        if (request.Operations != null)
        {
            foreach (var o in request.Operations)
            {
                var hours = o.StandardTimeMinutes / 60m;
                var total = Math.Round((hours * o.HourlyLaborRate) + (hours * o.HourlyOverheadRate), 2);
                bom.Operations.Add(new BomOperation(Guid.NewGuid())
                {
                    CompanyId = companyId,
                    BomId = bom.Id,
                    OperationNameAr = o.OperationNameAr,
                    OperationNameEn = string.IsNullOrWhiteSpace(o.OperationNameEn) ? o.OperationNameAr : o.OperationNameEn,
                    WorkstationId = o.WorkstationId,
                    WorkstationName = o.WorkstationName ?? string.Empty,
                    StandardTimeMinutes = o.StandardTimeMinutes,
                    HourlyLaborRate = o.HourlyLaborRate,
                    HourlyOverheadRate = o.HourlyOverheadRate,
                    TotalOperationCost = total
                });
            }
        }

        bom.RecalculateTotals();
        await _repo.AddAsync(bom, cancellationToken);

        return Result.Success(GetBomsQueryHandler.MapToDto(bom));
    }
}

public record UpdateBomCommand(
    Guid Id,
    string Code,
    string NameAr,
    string? NameEn,
    string FinishedProductId,
    string FinishedProductCode,
    string FinishedProductNameAr,
    string? FinishedProductNameEn,
    decimal OutputQuantity,
    string UnitOfMeasure,
    Guid? RawMaterialsWarehouseId,
    string? RawMaterialsWarehouseName,
    Guid? FinishedGoodsWarehouseId,
    string? FinishedGoodsWarehouseName,
    string? Version,
    string? Notes,
    bool IsActive,
    List<CreateBomComponentItem>? Components,
    List<CreateBomOperationItem>? Operations) : IRequest<Result<BillOfMaterialsDto>>;

public class UpdateBomCommandHandler : IRequestHandler<UpdateBomCommand, Result<BillOfMaterialsDto>>
{
    private readonly IBillOfMaterialsRepository _repo;

    public UpdateBomCommandHandler(IBillOfMaterialsRepository repo) => _repo = repo;

    public async Task<Result<BillOfMaterialsDto>> Handle(UpdateBomCommand request, CancellationToken cancellationToken)
    {
        var bom = await _repo.GetByIdAsync(request.Id, cancellationToken);
        if (bom == null)
            return Result.Failure<BillOfMaterialsDto>(new Error("Bom.NotFound", "شجرة المنتج غير موجودة"));

        bom.Code = request.Code;
        bom.NameAr = request.NameAr;
        bom.NameEn = string.IsNullOrWhiteSpace(request.NameEn) ? request.NameAr : request.NameEn;
        bom.FinishedProductId = request.FinishedProductId;
        bom.FinishedProductCode = request.FinishedProductCode;
        bom.FinishedProductNameAr = request.FinishedProductNameAr;
        bom.FinishedProductNameEn = string.IsNullOrWhiteSpace(request.FinishedProductNameEn) ? request.FinishedProductNameAr : request.FinishedProductNameEn;
        bom.OutputQuantity = request.OutputQuantity > 0 ? request.OutputQuantity : 1m;
        bom.UnitOfMeasure = request.UnitOfMeasure;
        bom.RawMaterialsWarehouseId = request.RawMaterialsWarehouseId;
        bom.RawMaterialsWarehouseName = request.RawMaterialsWarehouseName ?? bom.RawMaterialsWarehouseName;
        bom.FinishedGoodsWarehouseId = request.FinishedGoodsWarehouseId;
        bom.FinishedGoodsWarehouseName = request.FinishedGoodsWarehouseName ?? bom.FinishedGoodsWarehouseName;
        bom.Version = request.Version ?? bom.Version;
        bom.Notes = request.Notes;
        bom.IsActive = request.IsActive;
        bom.LastModifiedAtUtc = DateTime.UtcNow;

        bom.Components.Clear();
        if (request.Components != null)
        {
            foreach (var c in request.Components)
            {
                var total = Math.Round(c.QuantityRequired * c.UnitCost * (1m + (c.ScrapPercentage / 100m)), 2);
                bom.Components.Add(new BomComponent(Guid.NewGuid())
                {
                    CompanyId = bom.CompanyId,
                    BomId = bom.Id,
                    ItemId = c.ItemId,
                    ItemCode = c.ItemCode,
                    ItemNameAr = c.NameAr,
                    ItemNameEn = string.IsNullOrWhiteSpace(c.NameEn) ? c.NameAr : c.NameEn,
                    QuantityRequired = c.QuantityRequired,
                    UnitOfMeasure = c.UnitOfMeasure,
                    ScrapPercentage = c.ScrapPercentage,
                    UnitCost = c.UnitCost,
                    TotalCost = total
                });
            }
        }

        bom.Operations.Clear();
        if (request.Operations != null)
        {
            foreach (var o in request.Operations)
            {
                var hours = o.StandardTimeMinutes / 60m;
                var total = Math.Round((hours * o.HourlyLaborRate) + (hours * o.HourlyOverheadRate), 2);
                bom.Operations.Add(new BomOperation(Guid.NewGuid())
                {
                    CompanyId = bom.CompanyId,
                    BomId = bom.Id,
                    OperationNameAr = o.OperationNameAr,
                    OperationNameEn = string.IsNullOrWhiteSpace(o.OperationNameEn) ? o.OperationNameAr : o.OperationNameEn,
                    WorkstationId = o.WorkstationId,
                    WorkstationName = o.WorkstationName ?? string.Empty,
                    StandardTimeMinutes = o.StandardTimeMinutes,
                    HourlyLaborRate = o.HourlyLaborRate,
                    HourlyOverheadRate = o.HourlyOverheadRate,
                    TotalOperationCost = total
                });
            }
        }

        bom.RecalculateTotals();
        _repo.Update(bom);

        return Result.Success(GetBomsQueryHandler.MapToDto(bom));
    }
}

public record DeleteBomCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteBomCommandHandler : IRequestHandler<DeleteBomCommand, Result<bool>>
{
    private readonly IBillOfMaterialsRepository _repo;

    public DeleteBomCommandHandler(IBillOfMaterialsRepository repo) => _repo = repo;

    public async Task<Result<bool>> Handle(DeleteBomCommand request, CancellationToken cancellationToken)
    {
        var bom = await _repo.GetByIdAsync(request.Id, cancellationToken);
        if (bom == null)
            return Result.Failure<bool>(new Error("Bom.NotFound", "شجرة المنتج غير موجودة"));

        _repo.Remove(bom);
        return Result.Success(true);
    }
}

// 2. Work Order Commands
public record CreateWorkOrderCommand(
    Guid? CompanyId,
    Guid BomId,
    string? WorkOrderNumber,
    decimal PlannedQuantity,
    string StartDate,
    string DueDate,
    string? Priority,
    string? AssignedSupervisor,
    string? AssignedWorkstation,
    string? Notes) : IRequest<Result<WorkOrderDto>>;

public class CreateWorkOrderCommandHandler : IRequestHandler<CreateWorkOrderCommand, Result<WorkOrderDto>>
{
    private readonly IWorkOrderRepository _woRepo;
    private readonly IBillOfMaterialsRepository _bomRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateWorkOrderCommandHandler(
        IWorkOrderRepository woRepo,
        IBillOfMaterialsRepository bomRepo,
        ICurrentTenantContext tenantContext)
    {
        _woRepo = woRepo;
        _bomRepo = bomRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<WorkOrderDto>> Handle(CreateWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var bom = await _bomRepo.GetByIdAsync(request.BomId, cancellationToken);
        if (bom == null)
            return Result.Failure<WorkOrderDto>(new Error("Bom.NotFound", "شجرة المنتج المرتبطة بأمر التشغيل غير موجودة"));

        var number = string.IsNullOrWhiteSpace(request.WorkOrderNumber)
            ? await _woRepo.GenerateNextNumberAsync(companyId, cancellationToken)
            : request.WorkOrderNumber.Trim();

        var priority = Enum.TryParse<WorkOrderPriority>(request.Priority, true, out var p) ? p : WorkOrderPriority.Normal;
        var estTotal = bom.TotalUnitCost * request.PlannedQuantity;

        var wo = new WorkOrder(Guid.NewGuid())
        {
            CompanyId = companyId,
            WorkOrderNumber = number,
            BomId = bom.Id,
            BomCode = bom.Code,
            FinishedProductId = bom.FinishedProductId,
            FinishedProductCode = bom.FinishedProductCode,
            FinishedProductNameAr = bom.FinishedProductNameAr,
            FinishedProductNameEn = bom.FinishedProductNameEn,
            PlannedQuantity = request.PlannedQuantity,
            CompletedQuantity = 0m,
            RejectedQuantity = 0m,
            UnitOfMeasure = bom.UnitOfMeasure,
            StartDate = DateTime.TryParse(request.StartDate, out var sd) ? sd : DateTime.UtcNow.Date,
            DueDate = DateTime.TryParse(request.DueDate, out var dd) ? dd : DateTime.UtcNow.Date.AddDays(7),
            Status = WorkOrderStatus.Planned,
            Priority = priority,
            AssignedSupervisor = request.AssignedSupervisor ?? string.Empty,
            AssignedWorkstation = request.AssignedWorkstation ?? string.Empty,
            RawMaterialsWarehouseName = bom.RawMaterialsWarehouseName,
            FinishedGoodsWarehouseName = bom.FinishedGoodsWarehouseName,
            EstimatedTotalCost = estTotal,
            UnitActualCost = bom.TotalUnitCost,
            Notes = request.Notes
        };

        // Initialize component consumption from BOM
        foreach (var cmp in bom.Components)
        {
            var requiredQty = cmp.QuantityRequired * (request.PlannedQuantity / (bom.OutputQuantity > 0 ? bom.OutputQuantity : 1m));
            wo.ComponentsConsumed.Add(new WorkOrderComponentConsumption(Guid.NewGuid())
            {
                CompanyId = companyId,
                WorkOrderId = wo.Id,
                ItemId = cmp.ItemId,
                ItemCode = cmp.ItemCode,
                ItemNameAr = cmp.ItemNameAr,
                Quantity = requiredQty,
                Unit = cmp.UnitOfMeasure,
                TotalCost = Math.Round(requiredQty * cmp.UnitCost, 2)
            });
        }

        await _woRepo.AddAsync(wo, cancellationToken);
        return Result.Success(GetWorkOrdersQueryHandler.MapToDto(wo));
    }
}

public record UpdateWorkOrderStatusCommand(
    Guid Id,
    WorkOrderStatus Status,
    decimal? CompletedQuantity = null,
    decimal? RejectedQuantity = null,
    string? Notes = null) : IRequest<Result<WorkOrderDto>>;

public class UpdateWorkOrderStatusCommandHandler : IRequestHandler<UpdateWorkOrderStatusCommand, Result<WorkOrderDto>>
{
    private readonly IWorkOrderRepository _repo;

    public UpdateWorkOrderStatusCommandHandler(IWorkOrderRepository repo) => _repo = repo;

    public async Task<Result<WorkOrderDto>> Handle(UpdateWorkOrderStatusCommand request, CancellationToken cancellationToken)
    {
        var wo = await _repo.GetByIdAsync(request.Id, cancellationToken);
        if (wo == null)
            return Result.Failure<WorkOrderDto>(new Error("WorkOrder.NotFound", "أمر العمل غير موجود"));

        wo.Status = request.Status;
        if (request.CompletedQuantity.HasValue) wo.CompletedQuantity = request.CompletedQuantity.Value;
        if (request.RejectedQuantity.HasValue) wo.RejectedQuantity = request.RejectedQuantity.Value;
        if (!string.IsNullOrWhiteSpace(request.Notes)) wo.Notes = request.Notes;

        if (request.Status == WorkOrderStatus.Completed && !wo.CompletedDate.HasValue)
        {
            wo.CompletedDate = DateTime.UtcNow.Date;
            wo.TotalActualCost = wo.ComponentsConsumed.Sum(c => c.TotalCost);
            if (wo.CompletedQuantity > 0)
                wo.UnitActualCost = Math.Round(wo.TotalActualCost / wo.CompletedQuantity, 2);
        }

        wo.LastModifiedAtUtc = DateTime.UtcNow;
        _repo.Update(wo);

        return Result.Success(GetWorkOrdersQueryHandler.MapToDto(wo));
    }
}

public record DeleteWorkOrderCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteWorkOrderCommandHandler : IRequestHandler<DeleteWorkOrderCommand, Result<bool>>
{
    private readonly IWorkOrderRepository _repo;

    public DeleteWorkOrderCommandHandler(IWorkOrderRepository repo) => _repo = repo;

    public async Task<Result<bool>> Handle(DeleteWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var wo = await _repo.GetByIdAsync(request.Id, cancellationToken);
        if (wo == null)
            return Result.Failure<bool>(new Error("WorkOrder.NotFound", "أمر العمل غير موجود"));

        _repo.Remove(wo);
        return Result.Success(true);
    }
}

// 3. Workstation Commands
public record CreateWorkstationCommand(
    Guid? CompanyId,
    string Code,
    string NameAr,
    string? NameEn,
    string Type,
    decimal HourlyCost,
    decimal CapacityPerDayHours,
    decimal EfficiencyPercentage,
    string Location) : IRequest<Result<WorkstationDto>>;

public class CreateWorkstationCommandHandler : IRequestHandler<CreateWorkstationCommand, Result<WorkstationDto>>
{
    private readonly IWorkstationRepository _repo;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateWorkstationCommandHandler(IWorkstationRepository repo, ICurrentTenantContext tenantContext)
    {
        _repo = repo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<WorkstationDto>> Handle(CreateWorkstationCommand request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var type = Enum.TryParse<WorkstationType>(request.Type, true, out var t) ? t : WorkstationType.Machine;

        var ws = new Workstation(Guid.NewGuid())
        {
            CompanyId = companyId,
            Code = request.Code,
            NameAr = request.NameAr,
            NameEn = string.IsNullOrWhiteSpace(request.NameEn) ? request.NameAr : request.NameEn,
            Type = type,
            HourlyCost = request.HourlyCost,
            CapacityPerDayHours = request.CapacityPerDayHours > 0 ? request.CapacityPerDayHours : 8m,
            EfficiencyPercentage = request.EfficiencyPercentage > 0 ? request.EfficiencyPercentage : 95m,
            Location = request.Location,
            Status = WorkstationStatus.Active
        };

        await _repo.AddAsync(ws, cancellationToken);

        return Result.Success(new WorkstationDto(
            ws.Id,
            ws.CompanyId,
            ws.Code,
            ws.NameAr,
            ws.NameEn,
            ws.Type.ToString(),
            ws.HourlyCost,
            ws.CapacityPerDayHours,
            ws.EfficiencyPercentage,
            ws.Status.ToString(),
            ws.Location));
    }
}

public record DeleteWorkstationCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteWorkstationCommandHandler : IRequestHandler<DeleteWorkstationCommand, Result<bool>>
{
    private readonly IWorkstationRepository _repo;

    public DeleteWorkstationCommandHandler(IWorkstationRepository repo) => _repo = repo;

    public async Task<Result<bool>> Handle(DeleteWorkstationCommand request, CancellationToken cancellationToken)
    {
        var ws = await _repo.GetByIdAsync(request.Id, cancellationToken);
        if (ws == null)
            return Result.Failure<bool>(new Error("Workstation.NotFound", "محطة العمل غير موجودة"));

        _repo.Remove(ws);
        return Result.Success(true);
    }
}

// 4. Raw Material Commands
public record CreateRawMaterialCommand(
    Guid? CompanyId,
    string ItemCode,
    string NameAr,
    string? NameEn,
    string Category,
    string CategoryAr,
    string? CategoryEn,
    string UnitOfMeasure,
    decimal UnitCost,
    decimal CurrentStock,
    string WarehouseName,
    decimal? MinStockLevel,
    string? Notes) : IRequest<Result<RawMaterialItemDto>>;

public class CreateRawMaterialCommandHandler : IRequestHandler<CreateRawMaterialCommand, Result<RawMaterialItemDto>>
{
    private readonly IRawMaterialRepository _repo;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateRawMaterialCommandHandler(IRawMaterialRepository repo, ICurrentTenantContext tenantContext)
    {
        _repo = repo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<RawMaterialItemDto>> Handle(CreateRawMaterialCommand request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var cat = Enum.TryParse<RawMaterialCategory>(request.Category, true, out var c) ? c : RawMaterialCategory.General;

        var item = new RawMaterial(Guid.NewGuid())
        {
            CompanyId = companyId,
            ItemCode = request.ItemCode,
            NameAr = request.NameAr,
            NameEn = string.IsNullOrWhiteSpace(request.NameEn) ? request.NameAr : request.NameEn,
            Category = cat,
            CategoryAr = request.CategoryAr,
            CategoryEn = string.IsNullOrWhiteSpace(request.CategoryEn) ? request.CategoryAr : request.CategoryEn,
            UnitOfMeasure = request.UnitOfMeasure,
            UnitCost = request.UnitCost,
            CurrentStock = request.CurrentStock,
            WarehouseName = request.WarehouseName,
            MinStockLevel = request.MinStockLevel,
            Notes = request.Notes
        };

        await _repo.AddAsync(item, cancellationToken);

        return Result.Success(new RawMaterialItemDto(
            item.Id,
            item.CompanyId,
            item.ItemCode,
            item.NameAr,
            item.NameEn,
            item.Category.ToString(),
            item.CategoryAr,
            item.CategoryEn,
            item.UnitOfMeasure,
            item.UnitCost,
            item.CurrentStock,
            item.WarehouseName,
            item.MinStockLevel,
            item.Notes));
    }
}

public record DeleteRawMaterialCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteRawMaterialCommandHandler : IRequestHandler<DeleteRawMaterialCommand, Result<bool>>
{
    private readonly IRawMaterialRepository _repo;

    public DeleteRawMaterialCommandHandler(IRawMaterialRepository repo) => _repo = repo;

    public async Task<Result<bool>> Handle(DeleteRawMaterialCommand request, CancellationToken cancellationToken)
    {
        var item = await _repo.GetByIdAsync(request.Id, cancellationToken);
        if (item == null)
            return Result.Failure<bool>(new Error("RawMaterial.NotFound", "المادة الخام غير موجودة"));

        _repo.Remove(item);
        return Result.Success(true);
    }
}
