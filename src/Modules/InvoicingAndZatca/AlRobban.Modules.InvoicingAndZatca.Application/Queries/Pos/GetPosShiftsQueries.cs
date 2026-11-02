using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Queries.Pos;

public record GetCurrentPosShiftQuery(
    Guid CompanyId,
    string? TerminalCode = null,
    string? CashierUserId = null
) : IRequest<Result<PosShiftDto?>>;

public record GetPosShiftsHistoryQuery(
    Guid CompanyId,
    int MaxCount = 50
) : IRequest<Result<List<PosShiftDto>>>;

public class GetPosShiftsQueryHandler :
    IRequestHandler<GetCurrentPosShiftQuery, Result<PosShiftDto?>>,
    IRequestHandler<GetPosShiftsHistoryQuery, Result<List<PosShiftDto>>>
{
    private readonly IPosShiftRepository _shiftRepo;

    public GetPosShiftsQueryHandler(IPosShiftRepository shiftRepo)
    {
        _shiftRepo = shiftRepo;
    }

    public async Task<Result<PosShiftDto?>> Handle(GetCurrentPosShiftQuery request, CancellationToken cancellationToken)
    {
        var shift = await _shiftRepo.GetActiveShiftAsync(request.CompanyId, request.TerminalCode, request.CashierUserId, cancellationToken);
        if (shift == null)
        {
            return Result.Success<PosShiftDto?>(null);
        }

        var movementsDto = shift.CashMovements.Select(m => new PosCashMovementDto(
            m.Id,
            m.PosShiftId,
            m.MovementType,
            m.Amount,
            m.ReasonAr,
            m.ReasonEn,
            m.CreatedAtUtc,
            m.CreatedBy
        )).ToList();

        var dto = new PosShiftDto(
            shift.Id,
            shift.CompanyId,
            shift.ShiftNumber,
            shift.CashierUserId,
            shift.CashierName,
            shift.TerminalCode,
            shift.BranchId,
            shift.BranchName,
            shift.WarehouseCode,
            shift.WarehouseName,
            shift.OpenedAtUtc,
            shift.ClosedAtUtc,
            shift.Status,
            shift.OpeningFloatCash,
            shift.TotalCashSales,
            shift.TotalMadaSales,
            shift.TotalCreditCardSales,
            shift.TotalSalesAmount,
            shift.TotalTaxAmount,
            shift.InvoiceCount,
            shift.TotalCashIn,
            shift.TotalCashOut,
            shift.ExpectedCashDrawer,
            shift.ActualClosingCash,
            shift.VarianceAmount,
            shift.ClosingNotes,
            shift.JournalEntryId,
            shift.JournalEntryNumber,
            movementsDto
        );

        return Result.Success<PosShiftDto?>(dto);
    }

    public async Task<Result<List<PosShiftDto>>> Handle(GetPosShiftsHistoryQuery request, CancellationToken cancellationToken)
    {
        var shifts = await _shiftRepo.GetHistoryAsync(request.CompanyId, request.MaxCount, cancellationToken);

        var dtos = shifts.Select(shift => new PosShiftDto(
            shift.Id,
            shift.CompanyId,
            shift.ShiftNumber,
            shift.CashierUserId,
            shift.CashierName,
            shift.TerminalCode,
            shift.BranchId,
            shift.BranchName,
            shift.WarehouseCode,
            shift.WarehouseName,
            shift.OpenedAtUtc,
            shift.ClosedAtUtc,
            shift.Status,
            shift.OpeningFloatCash,
            shift.TotalCashSales,
            shift.TotalMadaSales,
            shift.TotalCreditCardSales,
            shift.TotalSalesAmount,
            shift.TotalTaxAmount,
            shift.InvoiceCount,
            shift.TotalCashIn,
            shift.TotalCashOut,
            shift.ExpectedCashDrawer,
            shift.ActualClosingCash,
            shift.VarianceAmount,
            shift.ClosingNotes,
            shift.JournalEntryId,
            shift.JournalEntryNumber
        )).ToList();

        return Result.Success(dtos);
    }
}
