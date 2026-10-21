using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.FiscalClosing;

public record ReopenFiscalYearCommand(Guid FiscalYearId, string Reason) : IRequest<Result<bool>>;

public class ReopenFiscalYearCommandHandler : IRequestHandler<ReopenFiscalYearCommand, Result<bool>>
{
    private readonly IFinancialSettingsRepository _settingsRepo;

    public ReopenFiscalYearCommandHandler(IFinancialSettingsRepository settingsRepo)
    {
        _settingsRepo = settingsRepo;
    }

    public async Task<Result<bool>> Handle(ReopenFiscalYearCommand request, CancellationToken cancellationToken)
    {
        var year = await _settingsRepo.GetFiscalYearByIdAsync(request.FiscalYearId, cancellationToken);

        if (year == null)
        {
            return Result.Failure<bool>(new Error("FiscalYear.NotFound", "السنة المالية المطلوبة غير موجودة"));
        }

        if (!year.IsClosed)
        {
            return Result.Failure<bool>(new Error("FiscalYear.NotClosed", "السنة المالية ليست مغلقة"));
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return Result.Failure<bool>(new Error("FiscalYear.EmptyReason", "يرجى ذكر مبرر إعادة فتح السنة المالية للتدقيق"));
        }

        year.ReopenYear();
        await _settingsRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}
