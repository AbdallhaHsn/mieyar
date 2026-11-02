using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Commands.Pos;

public record AddPosCashMovementCommand(
    Guid PosShiftId,
    CashMovementType MovementType,
    decimal Amount,
    string ReasonAr,
    string? ReasonEn = null,
    string? CreatedBy = null
) : IRequest<Result<PosCashMovementDto>>;

public class AddPosCashMovementCommandHandler : IRequestHandler<AddPosCashMovementCommand, Result<PosCashMovementDto>>
{
    private readonly IPosShiftRepository _shiftRepo;

    public AddPosCashMovementCommandHandler(IPosShiftRepository shiftRepo)
    {
        _shiftRepo = shiftRepo;
    }

    public async Task<Result<PosCashMovementDto>> Handle(AddPosCashMovementCommand request, CancellationToken cancellationToken)
    {
        var shift = await _shiftRepo.GetByIdWithMovementsAsync(request.PosShiftId, cancellationToken);
        if (shift == null)
        {
            return Result.Failure<PosCashMovementDto>(Error.NotFound("PosShift.NotFound", "الوردية المحددة غير موجودة."));
        }

        if (shift.Status == PosShiftStatus.Closed)
        {
            return Result.Failure<PosCashMovementDto>(Error.Conflict("PosShift.Closed", "لا يمكن إضافة حركة نقدية في وردية مغلقة."));
        }

        shift.AddCashMovement(request.MovementType, request.Amount, request.ReasonAr, request.ReasonEn, request.CreatedBy);

        await _shiftRepo.UpdateAsync(shift, cancellationToken);
        await _shiftRepo.SaveChangesAsync(cancellationToken);

        var latest = shift.CashMovements.Last();
        var dto = new PosCashMovementDto(
            latest.Id,
            latest.PosShiftId,
            latest.MovementType,
            latest.Amount,
            latest.ReasonAr,
            latest.ReasonEn,
            latest.CreatedAtUtc,
            latest.CreatedBy
        );

        return Result.Success(dto);
    }
}
