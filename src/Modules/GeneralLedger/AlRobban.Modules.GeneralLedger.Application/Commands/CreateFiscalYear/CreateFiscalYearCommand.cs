using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.CreateFiscalYear;

public record CreateFiscalYearCommand(
    Guid? CompanyId,
    int YearNumber,
    string NameAr,
    string NameEn,
    DateTime StartDate,
    DateTime EndDate,
    bool IncludeClosingPeriod = true) : IRequest<Result<FiscalYearDto>>;

public class CreateFiscalYearCommandHandler : IRequestHandler<CreateFiscalYearCommand, Result<FiscalYearDto>>
{
    private readonly IFinancialSettingsRepository _settingsRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateFiscalYearCommandHandler(
        IFinancialSettingsRepository settingsRepository,
        ICurrentTenantContext tenantContext)
    {
        _settingsRepository = settingsRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<FiscalYearDto>> Handle(CreateFiscalYearCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");

        if (request.EndDate <= request.StartDate)
        {
            return Result.Failure<FiscalYearDto>(new Error("FiscalYear.InvalidDates", "تاريخ نهاية السنة المالية يجب أن يكون بعد تاريخ البداية"));
        }

        var existingYears = await _settingsRepository.GetAllFiscalYearsAsync(companyId, cancellationToken);
        if (existingYears.Any(y => y.YearNumber == request.YearNumber))
        {
            return Result.Failure<FiscalYearDto>(new Error("FiscalYear.AlreadyExists", $"السنة المالية {request.YearNumber} مسجلة مسبقاً"));
        }

        var fiscalYear = FiscalYear.Create(
            tenantId,
            companyId,
            request.YearNumber,
            request.NameAr,
            request.NameEn,
            request.StartDate,
            request.EndDate,
            request.IncludeClosingPeriod);

        await _settingsRepository.AddFiscalYearAsync(fiscalYear, cancellationToken);
        await _settingsRepository.SaveChangesAsync(cancellationToken);

        var dto = new FiscalYearDto(
            fiscalYear.Id,
            fiscalYear.YearNumber,
            fiscalYear.NameAr,
            fiscalYear.NameEn,
            fiscalYear.StartDate,
            fiscalYear.EndDate,
            fiscalYear.IsActive,
            fiscalYear.IsClosed,
            fiscalYear.Periods.OrderBy(p => p.PeriodNumber).Select(p => new FiscalPeriodDto(
                p.Id,
                p.PeriodNumber,
                p.PeriodNameAr,
                p.PeriodNameEn,
                p.StartDate,
                p.EndDate,
                p.Status,
                p.IsClosingPeriod)).ToList());

        return Result.Success(dto);
    }
}
