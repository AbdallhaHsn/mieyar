using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.CostCenters;

public record CreateCostCenterCommand(
    Guid? CompanyId,
    string Code,
    string NameAr,
    string NameEn,
    Guid? ParentCostCenterId,
    string? Description) : IRequest<Result<CostCenterDto>>;

public class CreateCostCenterCommandHandler : IRequestHandler<CreateCostCenterCommand, Result<CostCenterDto>>
{
    private readonly IFinancialSettingsRepository _settingsRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateCostCenterCommandHandler(
        IFinancialSettingsRepository settingsRepository,
        ICurrentTenantContext tenantContext)
    {
        _settingsRepository = settingsRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<CostCenterDto>> Handle(CreateCostCenterCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        var costCenter = CostCenter.Create(
            tenantId,
            companyId,
            request.Code,
            request.NameAr,
            request.NameEn,
            request.ParentCostCenterId,
            request.Description);

        await _settingsRepository.AddCostCenterAsync(costCenter, cancellationToken);
        await _settingsRepository.SaveChangesAsync(cancellationToken);

        var dto = new CostCenterDto(
            costCenter.Id,
            costCenter.Code,
            costCenter.NameAr,
            costCenter.NameEn,
            costCenter.Description,
            costCenter.ParentCostCenterId,
            costCenter.IsActive,
            new List<CostCenterDto>());

        return Result.Success(dto);
    }
}

public record DeleteCostCenterCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteCostCenterCommandHandler : IRequestHandler<DeleteCostCenterCommand, Result<bool>>
{
    private readonly IFinancialSettingsRepository _settingsRepository;

    public DeleteCostCenterCommandHandler(IFinancialSettingsRepository settingsRepository)
    {
        _settingsRepository = settingsRepository;
    }

    public async Task<Result<bool>> Handle(DeleteCostCenterCommand request, CancellationToken cancellationToken)
    {
        var cc = await _settingsRepository.GetCostCenterByIdAsync(request.Id, cancellationToken);
        if (cc == null)
        {
            return Result.Failure<bool>(new Error("CostCenter.NotFound", "مركز التكلفة غير موجود"));
        }

        await _settingsRepository.DeleteCostCenterAsync(cc, cancellationToken);
        await _settingsRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}
