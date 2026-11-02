using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.UpdateFinancialSettings;

public record UpdateFinancialSettingsCommand(
    Guid? CompanyId,
    string DefaultCurrency,
    CalendarType CalendarType,
    CostCenterPolicy CostCenterPolicy,
    bool AllowBackdatedEntries,
    int MaxBackdatedDays,
    bool RequireApprovalForEntries,
    bool Include13thClosingPeriod) : IRequest<Result<CompanyFinancialSettingsDto>>;

public class UpdateFinancialSettingsCommandHandler : IRequestHandler<UpdateFinancialSettingsCommand, Result<CompanyFinancialSettingsDto>>
{
    private readonly IFinancialSettingsRepository _settingsRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public UpdateFinancialSettingsCommandHandler(
        IFinancialSettingsRepository settingsRepository,
        ICurrentTenantContext tenantContext)
    {
        _settingsRepository = settingsRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<CompanyFinancialSettingsDto>> Handle(UpdateFinancialSettingsCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        var settings = await _settingsRepository.GetOrCreateSettingsAsync(tenantId, companyId, cancellationToken);

        settings.Update(
            request.DefaultCurrency,
            request.CalendarType,
            request.CostCenterPolicy,
            request.AllowBackdatedEntries,
            request.MaxBackdatedDays,
            request.RequireApprovalForEntries,
            request.Include13thClosingPeriod);

        await _settingsRepository.SaveChangesAsync(cancellationToken);

        var dto = new CompanyFinancialSettingsDto(
            settings.Id,
            settings.CompanyId,
            settings.DefaultCurrency,
            settings.CalendarType,
            settings.CostCenterPolicy,
            settings.AllowBackdatedEntries,
            settings.MaxBackdatedDays,
            settings.RequireApprovalForEntries,
            settings.Include13thClosingPeriod);

        return Result.Success(dto);
    }
}
