using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.TogglePeriodStatus;

public record TogglePeriodStatusCommand(
    Guid PeriodId,
    FiscalPeriodStatus NewStatus) : IRequest<Result<FiscalPeriodDto>>;

public class TogglePeriodStatusCommandHandler : IRequestHandler<TogglePeriodStatusCommand, Result<FiscalPeriodDto>>
{
    private readonly IFinancialSettingsRepository _settingsRepository;

    public TogglePeriodStatusCommandHandler(IFinancialSettingsRepository settingsRepository)
    {
        _settingsRepository = settingsRepository;
    }

    public async Task<Result<FiscalPeriodDto>> Handle(TogglePeriodStatusCommand request, CancellationToken cancellationToken)
    {
        var period = await _settingsRepository.GetPeriodByIdAsync(request.PeriodId, cancellationToken);
        if (period == null)
        {
            return Result.Failure<FiscalPeriodDto>(new Error("FiscalPeriod.NotFound", "الفترة المالية غير موجودة"));
        }

        period.SetStatus(request.NewStatus);
        await _settingsRepository.SaveChangesAsync(cancellationToken);

        var dto = new FiscalPeriodDto(
            period.Id,
            period.PeriodNumber,
            period.PeriodNameAr,
            period.PeriodNameEn,
            period.StartDate,
            period.EndDate,
            period.Status,
            period.IsClosingPeriod);

        return Result.Success(dto);
    }
}
