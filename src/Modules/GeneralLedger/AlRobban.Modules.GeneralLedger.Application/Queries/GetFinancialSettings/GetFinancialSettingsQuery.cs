using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.GetFinancialSettings;

public record GetFinancialSettingsQuery(Guid? CompanyId = null) : IRequest<Result<FinancialSettingsOverviewDto>>;

public class GetFinancialSettingsQueryHandler : IRequestHandler<GetFinancialSettingsQuery, Result<FinancialSettingsOverviewDto>>
{
    private readonly IFinancialSettingsRepository _settingsRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public GetFinancialSettingsQueryHandler(
        IFinancialSettingsRepository settingsRepository,
        ICurrentTenantContext tenantContext)
    {
        _settingsRepository = settingsRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<FinancialSettingsOverviewDto>> Handle(GetFinancialSettingsQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");

        // 1. Get or create company settings
        var settings = await _settingsRepository.GetOrCreateSettingsAsync(tenantId, companyId, cancellationToken);

        // 2. Ensure default fiscal year exists (2026)
        var allFiscalYears = await _settingsRepository.GetAllFiscalYearsAsync(companyId, cancellationToken);
        if (!allFiscalYears.Any())
        {
            var defaultYear = FiscalYear.Create(
                tenantId,
                companyId,
                DateTime.UtcNow.Year,
                $"السنة المالية {DateTime.UtcNow.Year}",
                $"Fiscal Year {DateTime.UtcNow.Year}",
                new DateTime(DateTime.UtcNow.Year, 1, 1),
                new DateTime(DateTime.UtcNow.Year, 12, 31),
                includeClosingPeriod: settings.Include13thClosingPeriod);

            await _settingsRepository.AddFiscalYearAsync(defaultYear, cancellationToken);
            await _settingsRepository.SaveChangesAsync(cancellationToken);
            allFiscalYears = await _settingsRepository.GetAllFiscalYearsAsync(companyId, cancellationToken);
        }

        // 3. Ensure default cost centers exist if none
        var costCenters = await _settingsRepository.GetCostCentersAsync(companyId, cancellationToken);
        if (!costCenters.Any())
        {
            var cc1 = CostCenter.Create(tenantId, companyId, "101", "الإدارة العامة والتشغيل", "General Administration & Operations", description: "مركز التكلفة الرئيسي للمقر الإداري");
            var cc2 = CostCenter.Create(tenantId, companyId, "102", "فرع الرياض الرئيسي", "Riyadh Main Branch", description: "مركز تكلفة فرع الرياض والمبيعات");
            var cc3 = CostCenter.Create(tenantId, companyId, "103", "تقنية المعلومات والتطوير", "IT & Engineering", description: "المشاريع التقنية وتكاليف السحابة");

            await _settingsRepository.AddCostCenterAsync(cc1, cancellationToken);
            await _settingsRepository.AddCostCenterAsync(cc2, cancellationToken);
            await _settingsRepository.AddCostCenterAsync(cc3, cancellationToken);
            await _settingsRepository.SaveChangesAsync(cancellationToken);
            costCenters = await _settingsRepository.GetCostCentersAsync(companyId, cancellationToken);
        }

        // Map DTOs
        var settingsDto = new CompanyFinancialSettingsDto(
            settings.Id,
            settings.CompanyId,
            settings.DefaultCurrency,
            settings.CalendarType,
            settings.CostCenterPolicy,
            settings.AllowBackdatedEntries,
            settings.MaxBackdatedDays,
            settings.RequireApprovalForEntries,
            settings.Include13thClosingPeriod);

        var yearDtos = allFiscalYears.Select(y => new FiscalYearDto(
            y.Id,
            y.YearNumber,
            y.NameAr,
            y.NameEn,
            y.StartDate,
            y.EndDate,
            y.IsActive,
            y.IsClosed,
            y.Periods.OrderBy(p => p.PeriodNumber).Select(p => new FiscalPeriodDto(
                p.Id,
                p.PeriodNumber,
                p.PeriodNameAr,
                p.PeriodNameEn,
                p.StartDate,
                p.EndDate,
                p.Status,
                p.IsClosingPeriod)).ToList()
        )).ToList();

        var activeYearDto = yearDtos.FirstOrDefault(y => y.IsActive) ?? yearDtos.FirstOrDefault();

        var ccDtos = costCenters.Select(c => new CostCenterDto(
            c.Id,
            c.Code,
            c.NameAr,
            c.NameEn,
            c.Description,
            c.ParentCostCenterId,
            c.IsActive,
            c.SubCostCenters.Select(sc => new CostCenterDto(
                sc.Id,
                sc.Code,
                sc.NameAr,
                sc.NameEn,
                sc.Description,
                sc.ParentCostCenterId,
                sc.IsActive,
                new List<CostCenterDto>()
            )).ToList()
        )).ToList();

        var overview = new FinancialSettingsOverviewDto(
            settingsDto,
            activeYearDto,
            yearDtos,
            ccDtos);

        return Result.Success(overview);
    }
}
