using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Commands.Pos;

public record ClosePosShiftCommand(
    Guid PosShiftId,
    decimal ActualClosingCash,
    string? Notes = null,
    string? ClosedBy = null
) : IRequest<Result<PosShiftDto>>;

public class ClosePosShiftCommandHandler : IRequestHandler<ClosePosShiftCommand, Result<PosShiftDto>>
{
    private readonly IPosShiftRepository _shiftRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public ClosePosShiftCommandHandler(
        IPosShiftRepository shiftRepo,
        IAccountRepository accountRepo,
        IMediator mediator)
    {
        _shiftRepo = shiftRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<PosShiftDto>> Handle(ClosePosShiftCommand request, CancellationToken cancellationToken)
    {
        var shift = await _shiftRepo.GetByIdWithMovementsAsync(request.PosShiftId, cancellationToken);
        if (shift == null)
        {
            return Result.Failure<PosShiftDto>(Error.NotFound("PosShift.NotFound", "الوردية المحددة غير موجودة."));
        }

        if (shift.Status == PosShiftStatus.Closed)
        {
            return Result.Failure<PosShiftDto>(Error.Conflict("PosShift.AlreadyClosed", "الوردية مغلقة بالفعل."));
        }

        shift.CloseShift(request.ActualClosingCash, request.Notes, request.ClosedBy);

        // If there is cash variance (عجز أو فائض)، record GL entry for accountability
        if (Math.Abs(shift.VarianceAmount) >= 0.01m)
        {
            var cashAccount = await _accountRepo.GetByCodeAsync(shift.CompanyId, "11101", cancellationToken);
            // Search for dedicated cash variance accounts: 51102 (تسويات وعجز) and 41103/41102 (إيرادات وفائض تسويات)
            var shortageAccount = await _accountRepo.GetByCodeAsync(shift.CompanyId, "51102", cancellationToken)
                ?? await _accountRepo.GetByCodeAsync(shift.CompanyId, "53105", cancellationToken)
                ?? await _accountRepo.GetByCodeAsync(shift.CompanyId, "53104", cancellationToken);

            var surplusAccount = await _accountRepo.GetByCodeAsync(shift.CompanyId, "41103", cancellationToken)
                ?? await _accountRepo.GetByCodeAsync(shift.CompanyId, "41102", cancellationToken)
                ?? shortageAccount;

            if (cashAccount != null && shortageAccount != null && surplusAccount != null)
            {
                var lines = new List<CreateJournalEntryLineRequest>();
                var isShortage = shift.VarianceAmount < 0;
                var absVariance = Math.Abs(shift.VarianceAmount);

                if (isShortage)
                {
                    // عجز صندوق الكاشير: مدين عجز الصندوق (مصروف)، دائن الصندوق الرئيسي
                    lines.Add(new CreateJournalEntryLineRequest(shortageAccount.Id, absVariance, 0m, $"عجز نقدية درج الكاشير وردية {shift.ShiftNumber}", null));
                    lines.Add(new CreateJournalEntryLineRequest(cashAccount.Id, 0m, absVariance, $"عجز نقدية درج الكاشير وردية {shift.ShiftNumber}", null));
                }
                else
                {
                    // فائض صندوق الكاشير: مدين الصندوق، دائن إيرادات وفائض تسويات الصندوق
                    lines.Add(new CreateJournalEntryLineRequest(cashAccount.Id, absVariance, 0m, $"فائض نقدية درج الكاشير وردية {shift.ShiftNumber}", null));
                    lines.Add(new CreateJournalEntryLineRequest(surplusAccount.Id, 0m, absVariance, $"فائض نقدية درج الكاشير وردية {shift.ShiftNumber}", null));
                }

                var entryCommand = new CreateJournalEntryCommand(
                    CompanyId: shift.CompanyId,
                    EntryDate: DateTime.UtcNow.Date,
                    EntryType: JournalEntryType.Adjustment,
                    DescriptionAr: $"تسوية فارق جرد صندوق كاشير وردية {shift.ShiftNumber} ({shift.CashierName})",
                    DescriptionEn: $"Cash Drawer Variance Adjustment Shift {shift.ShiftNumber}",
                    ReferenceNumber: shift.ShiftNumber,
                    PostImmediately: true,
                    Lines: lines
                );

                var entryResult = await _mediator.Send(entryCommand, cancellationToken);
                if (entryResult.IsSuccess)
                {
                    shift.LinkJournalEntry(entryResult.Value.Id, entryResult.Value.EntryNumber);
                }
            }
        }

        await _shiftRepo.UpdateAsync(shift, cancellationToken);
        await _shiftRepo.SaveChangesAsync(cancellationToken);

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

        return Result.Success(dto);
    }
}
