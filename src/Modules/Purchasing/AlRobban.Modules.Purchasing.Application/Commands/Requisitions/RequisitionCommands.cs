using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Purchasing.Application.Commands.Requisitions;

public record CreateRequisitionLineRequest(
    Guid? ItemId,
    string? ItemCode,
    string ItemNameAr,
    string? ItemNameEn,
    decimal QuantityRequested,
    decimal EstimatedUnitPrice,
    string UnitOfMeasure = "حبة",
    string? WarehouseCode = "WH-01",
    Guid? CostCenterId = null,
    string? Notes = null
);

public record CreatePurchaseRequisitionCommand(
    Guid? CompanyId,
    string Title,
    string DepartmentName,
    string RequesterName,
    DateTime RequestDate,
    DateTime? RequiredByDate,
    RequisitionPriority Priority,
    Guid? CostCenterId,
    string? ProjectCode,
    string? Reason,
    List<CreateRequisitionLineRequest> Lines
) : IRequest<Result<PurchaseRequisitionDto>>;

public class CreatePurchaseRequisitionCommandHandler : IRequestHandler<CreatePurchaseRequisitionCommand, Result<PurchaseRequisitionDto>>
{
    private readonly IPurchaseRequisitionRepository _repository;

    public CreatePurchaseRequisitionCommandHandler(IPurchaseRequisitionRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<PurchaseRequisitionDto>> Handle(CreatePurchaseRequisitionCommand request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var tenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

        var year = DateTime.UtcNow.Year;
        var reqNumber = await _repository.GenerateNextRequisitionNumberAsync(companyId, year, cancellationToken);

        var requisition = PurchaseRequisition.Create(
            tenantId,
            companyId,
            reqNumber,
            request.Title,
            request.DepartmentName,
            request.RequesterName,
            request.RequestDate,
            request.RequiredByDate,
            request.Priority,
            request.CostCenterId,
            request.ProjectCode,
            request.Reason);

        foreach (var l in request.Lines)
        {
            requisition.AddLine(
                l.ItemNameAr,
                l.ItemNameEn ?? string.Empty,
                l.QuantityRequested,
                l.EstimatedUnitPrice,
                l.UnitOfMeasure,
                l.ItemId,
                l.ItemCode,
                l.WarehouseCode,
                l.CostCenterId,
                l.Notes);
        }

        await _repository.AddAsync(requisition, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result.Success(PurchaseRequisitionDto.FromEntity(requisition));
    }
}

public record ApprovePurchaseRequisitionCommand(Guid RequisitionId, string? Notes) : IRequest<Result<PurchaseRequisitionDto>>;

public class ApprovePurchaseRequisitionCommandHandler : IRequestHandler<ApprovePurchaseRequisitionCommand, Result<PurchaseRequisitionDto>>
{
    private readonly IPurchaseRequisitionRepository _repository;

    public ApprovePurchaseRequisitionCommandHandler(IPurchaseRequisitionRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<PurchaseRequisitionDto>> Handle(ApprovePurchaseRequisitionCommand request, CancellationToken cancellationToken)
    {
        var req = await _repository.GetByIdAsync(request.RequisitionId, cancellationToken);

        if (req == null)
            return Result.Failure<PurchaseRequisitionDto>(Error.NotFound("Requisition.NotFound", "طلب الشراء غير موجود"));

        req.Approve(request.Notes, "مدير المشتريات");
        await _repository.UpdateAsync(req, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result.Success(PurchaseRequisitionDto.FromEntity(req));
    }
}

public record GetPurchaseRequisitionsQuery(
    Guid? CompanyId,
    RequisitionStatus? Status = null,
    string? Search = null
) : IRequest<Result<List<PurchaseRequisitionDto>>>;

public class GetPurchaseRequisitionsQueryHandler : IRequestHandler<GetPurchaseRequisitionsQuery, Result<List<PurchaseRequisitionDto>>>
{
    private readonly IPurchaseRequisitionRepository _repository;

    public GetPurchaseRequisitionsQueryHandler(IPurchaseRequisitionRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<PurchaseRequisitionDto>>> Handle(GetPurchaseRequisitionsQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var list = await _repository.GetListAsync(
            companyId,
            request.Status,
            request.Search,
            0,
            100,
            cancellationToken);

        return Result.Success(list.Select(PurchaseRequisitionDto.FromEntity).ToList());
    }
}

public record GetPurchaseRequisitionByIdQuery(Guid Id) : IRequest<Result<PurchaseRequisitionDto>>;

public class GetPurchaseRequisitionByIdQueryHandler : IRequestHandler<GetPurchaseRequisitionByIdQuery, Result<PurchaseRequisitionDto>>
{
    private readonly IPurchaseRequisitionRepository _repository;

    public GetPurchaseRequisitionByIdQueryHandler(IPurchaseRequisitionRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<PurchaseRequisitionDto>> Handle(GetPurchaseRequisitionByIdQuery request, CancellationToken cancellationToken)
    {
        var req = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (req == null)
            return Result.Failure<PurchaseRequisitionDto>(Error.NotFound("Requisition.NotFound", "طلب الشراء غير موجود"));

        return Result.Success(PurchaseRequisitionDto.FromEntity(req));
    }
}

public record RejectPurchaseRequisitionCommand(Guid RequisitionId, string? Reason = null, string? RejectedBy = null) : IRequest<Result<PurchaseRequisitionDto>>;

public class RejectPurchaseRequisitionCommandHandler : IRequestHandler<RejectPurchaseRequisitionCommand, Result<PurchaseRequisitionDto>>
{
    private readonly IPurchaseRequisitionRepository _repository;

    public RejectPurchaseRequisitionCommandHandler(IPurchaseRequisitionRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<PurchaseRequisitionDto>> Handle(RejectPurchaseRequisitionCommand request, CancellationToken cancellationToken)
    {
        var req = await _repository.GetByIdAsync(request.RequisitionId, cancellationToken);
        if (req == null)
            return Result.Failure<PurchaseRequisitionDto>(Error.NotFound("Requisition.NotFound", "طلب الشراء غير موجود"));

        req.Reject(request.Reason, request.RejectedBy ?? "مدير المشتريات");
        await _repository.UpdateAsync(req, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result.Success(PurchaseRequisitionDto.FromEntity(req));
    }
}
