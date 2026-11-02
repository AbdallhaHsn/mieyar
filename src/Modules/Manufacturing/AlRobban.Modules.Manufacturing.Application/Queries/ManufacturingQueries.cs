using AlRobban.Modules.Manufacturing.Application.DTOs;
using AlRobban.Modules.Manufacturing.Domain.Entities;
using AlRobban.Modules.Manufacturing.Domain.Enums;
using AlRobban.Modules.Manufacturing.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Manufacturing.Application.Queries;

public record GetBomsQuery(Guid? CompanyId, string? SearchTerm = null) : IRequest<Result<List<BillOfMaterialsDto>>>;

public class GetBomsQueryHandler : IRequestHandler<GetBomsQuery, Result<List<BillOfMaterialsDto>>>
{
    private readonly IBillOfMaterialsRepository _repo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetBomsQueryHandler(IBillOfMaterialsRepository repo, ICurrentTenantContext tenantContext)
    {
        _repo = repo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<List<BillOfMaterialsDto>>> Handle(GetBomsQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var list = await _repo.GetListAsync(companyId, request.SearchTerm, cancellationToken);
        var dtos = list.Select(MapToDto).ToList();
        return Result.Success(dtos);
    }

    public static BillOfMaterialsDto MapToDto(BillOfMaterials b) =>
        new(
            b.Id,
            b.CompanyId,
            b.Code,
            b.NameAr,
            b.NameEn,
            b.FinishedProductId,
            b.FinishedProductCode,
            b.FinishedProductNameAr,
            b.FinishedProductNameEn,
            b.OutputQuantity,
            b.UnitOfMeasure,
            b.RawMaterialsWarehouseId,
            b.RawMaterialsWarehouseName,
            b.FinishedGoodsWarehouseId,
            b.FinishedGoodsWarehouseName,
            b.TotalMaterialCost,
            b.TotalLaborCost,
            b.TotalOverheadCost,
            b.TotalUnitCost,
            b.IsActive,
            b.Version,
            b.Notes,
            b.Components.Select(c => new BomComponentDto(
                c.Id,
                c.ItemId,
                c.ItemCode,
                c.ItemNameAr,
                c.ItemNameEn,
                c.QuantityRequired,
                c.UnitOfMeasure,
                c.ScrapPercentage,
                c.UnitCost,
                c.TotalCost)).ToList(),
            b.Operations.Select(o => new BomOperationDto(
                o.Id,
                o.OperationNameAr,
                o.OperationNameEn,
                o.WorkstationId,
                o.WorkstationName,
                o.StandardTimeMinutes,
                o.HourlyLaborRate,
                o.HourlyOverheadRate,
                o.TotalOperationCost)).ToList());
}

public record GetBomByIdQuery(Guid Id) : IRequest<Result<BillOfMaterialsDto>>;

public class GetBomByIdQueryHandler : IRequestHandler<GetBomByIdQuery, Result<BillOfMaterialsDto>>
{
    private readonly IBillOfMaterialsRepository _repo;

    public GetBomByIdQueryHandler(IBillOfMaterialsRepository repo) => _repo = repo;

    public async Task<Result<BillOfMaterialsDto>> Handle(GetBomByIdQuery request, CancellationToken cancellationToken)
    {
        var bom = await _repo.GetByIdAsync(request.Id, cancellationToken);
        if (bom == null)
            return Result.Failure<BillOfMaterialsDto>(new Error("Bom.NotFound", "شجرة المنتج المطلوبة غير موجودة"));
        return Result.Success(GetBomsQueryHandler.MapToDto(bom));
    }
}

public record GetWorkOrdersQuery(Guid? CompanyId, WorkOrderStatus? Status = null, string? SearchTerm = null) : IRequest<Result<List<WorkOrderDto>>>;

public class GetWorkOrdersQueryHandler : IRequestHandler<GetWorkOrdersQuery, Result<List<WorkOrderDto>>>
{
    private readonly IWorkOrderRepository _repo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetWorkOrdersQueryHandler(IWorkOrderRepository repo, ICurrentTenantContext tenantContext)
    {
        _repo = repo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<List<WorkOrderDto>>> Handle(GetWorkOrdersQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var list = await _repo.GetListAsync(companyId, request.Status, request.SearchTerm, cancellationToken);
        var dtos = list.Select(MapToDto).ToList();
        return Result.Success(dtos);
    }

    public static WorkOrderDto MapToDto(WorkOrder w) =>
        new(
            w.Id,
            w.CompanyId,
            w.WorkOrderNumber,
            w.BomId,
            w.BomCode,
            w.FinishedProductId,
            w.FinishedProductCode,
            w.FinishedProductNameAr,
            w.FinishedProductNameEn,
            w.PlannedQuantity,
            w.CompletedQuantity,
            w.RejectedQuantity,
            w.UnitOfMeasure,
            w.StartDate.ToString("yyyy-MM-dd"),
            w.DueDate.ToString("yyyy-MM-dd"),
            w.CompletedDate?.ToString("yyyy-MM-dd"),
            w.Status.ToString(),
            w.Priority.ToString(),
            w.AssignedSupervisor,
            w.AssignedWorkstation,
            w.RawMaterialsWarehouseName,
            w.FinishedGoodsWarehouseName,
            w.EstimatedTotalCost,
            w.ActualMaterialCost,
            w.ActualLaborCost,
            w.ActualOverheadCost,
            w.TotalActualCost,
            w.UnitActualCost,
            w.Notes,
            w.ComponentsConsumed.Select(c => new WorkOrderComponentConsumptionDto(
                c.Id,
                c.ItemId,
                c.ItemCode,
                c.ItemNameAr,
                c.Quantity,
                c.Unit,
                c.TotalCost)).ToList());
}

public record GetWorkOrderByIdQuery(Guid Id) : IRequest<Result<WorkOrderDto>>;

public class GetWorkOrderByIdQueryHandler : IRequestHandler<GetWorkOrderByIdQuery, Result<WorkOrderDto>>
{
    private readonly IWorkOrderRepository _repo;

    public GetWorkOrderByIdQueryHandler(IWorkOrderRepository repo) => _repo = repo;

    public async Task<Result<WorkOrderDto>> Handle(GetWorkOrderByIdQuery request, CancellationToken cancellationToken)
    {
        var wo = await _repo.GetByIdAsync(request.Id, cancellationToken);
        if (wo == null)
            return Result.Failure<WorkOrderDto>(new Error("WorkOrder.NotFound", "أمر العمل والتشغيل غير موجود"));
        return Result.Success(GetWorkOrdersQueryHandler.MapToDto(wo));
    }
}

public record GetWorkstationsQuery(Guid? CompanyId, string? SearchTerm = null) : IRequest<Result<List<WorkstationDto>>>;

public class GetWorkstationsQueryHandler : IRequestHandler<GetWorkstationsQuery, Result<List<WorkstationDto>>>
{
    private readonly IWorkstationRepository _repo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetWorkstationsQueryHandler(IWorkstationRepository repo, ICurrentTenantContext tenantContext)
    {
        _repo = repo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<List<WorkstationDto>>> Handle(GetWorkstationsQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var list = await _repo.GetListAsync(companyId, request.SearchTerm, cancellationToken);
        var dtos = list.Select(w => new WorkstationDto(
            w.Id,
            w.CompanyId,
            w.Code,
            w.NameAr,
            w.NameEn,
            w.Type.ToString(),
            w.HourlyCost,
            w.CapacityPerDayHours,
            w.EfficiencyPercentage,
            w.Status.ToString(),
            w.Location)).ToList();
        return Result.Success(dtos);
    }
}

public record GetRawMaterialsQuery(Guid? CompanyId, RawMaterialCategory? Category = null, string? SearchTerm = null) : IRequest<Result<List<RawMaterialItemDto>>>;

public class GetRawMaterialsQueryHandler : IRequestHandler<GetRawMaterialsQuery, Result<List<RawMaterialItemDto>>>
{
    private readonly IRawMaterialRepository _repo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetRawMaterialsQueryHandler(IRawMaterialRepository repo, ICurrentTenantContext tenantContext)
    {
        _repo = repo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<List<RawMaterialItemDto>>> Handle(GetRawMaterialsQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var list = await _repo.GetListAsync(companyId, request.Category, request.SearchTerm, cancellationToken);
        var dtos = list.Select(m => new RawMaterialItemDto(
            m.Id,
            m.CompanyId,
            m.ItemCode,
            m.NameAr,
            m.NameEn,
            m.Category.ToString(),
            m.CategoryAr,
            m.CategoryEn,
            m.UnitOfMeasure,
            m.UnitCost,
            m.CurrentStock,
            m.WarehouseName,
            m.MinStockLevel,
            m.Notes)).ToList();
        return Result.Success(dtos);
    }
}

public record GetManufacturingMetricsQuery(Guid? CompanyId) : IRequest<Result<ManufacturingMetricsDto>>;

public class GetManufacturingMetricsQueryHandler : IRequestHandler<GetManufacturingMetricsQuery, Result<ManufacturingMetricsDto>>
{
    private readonly IWorkOrderRepository _woRepo;
    private readonly IBillOfMaterialsRepository _bomRepo;
    private readonly IRawMaterialRepository _rawRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetManufacturingMetricsQueryHandler(
        IWorkOrderRepository woRepo,
        IBillOfMaterialsRepository bomRepo,
        IRawMaterialRepository rawRepo,
        ICurrentTenantContext tenantContext)
    {
        _woRepo = woRepo;
        _bomRepo = bomRepo;
        _rawRepo = rawRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<ManufacturingMetricsDto>> Handle(GetManufacturingMetricsQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        var workOrders = await _woRepo.GetListAsync(companyId, null, null, cancellationToken);
        var boms = await _bomRepo.GetListAsync(companyId, null, cancellationToken);
        var rawMaterials = await _rawRepo.GetListAsync(companyId, null, null, cancellationToken);

        var totalWo = workOrders.Count;
        var activeWo = workOrders.Count(w => w.Status == WorkOrderStatus.InProgress || w.Status == WorkOrderStatus.Confirmed || w.Status == WorkOrderStatus.QualityCheck);
        var completedWo = workOrders.Count(w => w.Status == WorkOrderStatus.Completed);
        var totalProdCost = workOrders.Sum(w => w.TotalActualCost > 0 ? w.TotalActualCost : w.EstimatedTotalCost);

        var efficiency = 92.5m;
        if (totalWo > 0)
        {
            var finishedCount = workOrders.Count(w => w.Status == WorkOrderStatus.Completed || w.Status == WorkOrderStatus.Cancelled);
            if (finishedCount > 0)
            {
                var onTimeOrCompleted = workOrders.Count(w => w.Status == WorkOrderStatus.Completed);
                efficiency = Math.Round(((decimal)onTimeOrCompleted / totalWo) * 100m, 1);
            }
        }

        var totalRaw = rawMaterials.Count;
        var rawVal = rawMaterials.Sum(r => r.CurrentStock * r.UnitCost);

        var metrics = new ManufacturingMetricsDto(
            totalWo,
            activeWo,
            completedWo,
            boms.Count,
            totalProdCost,
            efficiency,
            totalRaw,
            rawVal);

        return Result.Success(metrics);
    }
}
