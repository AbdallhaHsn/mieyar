using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FinancialStatements;

public record GetFinancialStatementSettingsQuery(Guid? CompanyId = null) : IRequest<Result<FinancialStatementSettingsDto>>;

public record UpdateFinancialStatementSettingsCommand(
    Guid? CompanyId,
    string IncomeStatementFormat,
    bool DefaultHideZeroBalances,
    int? DefaultLevelDepth,
    string RetainedEarningsAccountCode,
    bool ShowComparativePeriod,
    bool ShowSignaturesBlock,
    int DecimalPlaces,
    string AccountingBasis,
    bool AllowDraftSimulation,
    string? CashFlowMethod = null,
    string? CashAccountPrefix = null) : IRequest<Result<FinancialStatementSettingsDto>>;

public class FinancialStatementSettingsHandlers :
    IRequestHandler<GetFinancialStatementSettingsQuery, Result<FinancialStatementSettingsDto>>,
    IRequestHandler<UpdateFinancialStatementSettingsCommand, Result<FinancialStatementSettingsDto>>
{
    private readonly IFinancialSettingsRepository _settingsRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public FinancialStatementSettingsHandlers(IFinancialSettingsRepository settingsRepo, ICurrentTenantContext tenantContext)
    {
        _settingsRepo = settingsRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<FinancialStatementSettingsDto>> Handle(GetFinancialStatementSettingsQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        var settings = await _settingsRepo.GetOrCreateStatementSettingsAsync(tenantId, companyId, cancellationToken);
        return Result<FinancialStatementSettingsDto>.Success(MapToDto(settings));
    }

    public async Task<Result<FinancialStatementSettingsDto>> Handle(UpdateFinancialStatementSettingsCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        var settings = await _settingsRepo.GetOrCreateStatementSettingsAsync(tenantId, companyId, cancellationToken);

        settings.IncomeStatementFormat = string.IsNullOrWhiteSpace(request.IncomeStatementFormat) ? "multi-step" : request.IncomeStatementFormat;
        settings.DefaultHideZeroBalances = request.DefaultHideZeroBalances;
        settings.DefaultLevelDepth = request.DefaultLevelDepth;
        settings.RetainedEarningsAccountCode = string.IsNullOrWhiteSpace(request.RetainedEarningsAccountCode) ? "32102" : request.RetainedEarningsAccountCode;
        settings.ShowComparativePeriod = request.ShowComparativePeriod;
        settings.ShowSignaturesBlock = request.ShowSignaturesBlock;
        settings.DecimalPlaces = request.DecimalPlaces is 0 or 2 ? request.DecimalPlaces : 2;
        settings.AccountingBasis = string.IsNullOrWhiteSpace(request.AccountingBasis) ? "accrual" : request.AccountingBasis;
        settings.AllowDraftSimulation = request.AllowDraftSimulation;
        if (!string.IsNullOrWhiteSpace(request.CashFlowMethod))
            settings.CashFlowMethod = request.CashFlowMethod;
        if (!string.IsNullOrWhiteSpace(request.CashAccountPrefix))
            settings.CashAccountPrefix = request.CashAccountPrefix;
        settings.LastModifiedAtUtc = DateTime.UtcNow;

        await _settingsRepo.SaveChangesAsync(cancellationToken);

        return Result<FinancialStatementSettingsDto>.Success(MapToDto(settings));
    }

    private static FinancialStatementSettingsDto MapToDto(FinancialStatementSettings s)
    {
        return new FinancialStatementSettingsDto(
            s.Id,
            s.CompanyId,
            s.IncomeStatementFormat,
            s.DefaultHideZeroBalances,
            s.DefaultLevelDepth,
            s.RetainedEarningsAccountCode,
            s.ShowComparativePeriod,
            s.ShowSignaturesBlock,
            s.DecimalPlaces,
            s.AccountingBasis,
            s.AllowDraftSimulation,
            s.CashFlowMethod ?? "indirect",
            s.CashAccountPrefix ?? "111");
    }
}
