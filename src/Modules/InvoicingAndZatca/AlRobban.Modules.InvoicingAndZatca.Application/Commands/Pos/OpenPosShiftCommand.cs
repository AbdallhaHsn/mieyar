using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Commands.Pos;

public record OpenPosShiftCommand(
    Guid CompanyId,
    string CashierUserId,
    string CashierName,
    string TerminalCode,
    decimal OpeningFloatCash,
    string? WarehouseCode = "WH-MAIN",
    string? WarehouseName = "المستودع الرئيسي",
    Guid? BranchId = null,
    string? BranchName = "الفرع الرئيسي"
) : IRequest<Result<PosShiftDto>>;

public class OpenPosShiftCommandHandler : IRequestHandler<OpenPosShiftCommand, Result<PosShiftDto>>
{
    private readonly IPosShiftRepository _shiftRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public OpenPosShiftCommandHandler(
        IPosShiftRepository shiftRepo,
        ICurrentTenantContext tenantContext)
    {
        _shiftRepo = shiftRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<PosShiftDto>> Handle(OpenPosShiftCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId.GetValueOrDefault();
        if (tenantId == Guid.Empty)
        {
            tenantId = request.CompanyId != Guid.Empty ? request.CompanyId : Guid.Parse("11111111-1111-1111-1111-111111111111");
        }

        // Check if there is already an active shift for this terminal or cashier
        var activeShift = await _shiftRepo.GetActiveShiftAsync(request.CompanyId, request.TerminalCode, request.CashierUserId, cancellationToken);
        if (activeShift != null)
        {
            var activeDto = new PosShiftDto(
                activeShift.Id,
                activeShift.CompanyId,
                activeShift.ShiftNumber,
                activeShift.CashierUserId,
                activeShift.CashierName,
                activeShift.TerminalCode,
                activeShift.BranchId,
                activeShift.BranchName,
                activeShift.WarehouseCode,
                activeShift.WarehouseName,
                activeShift.OpenedAtUtc,
                activeShift.ClosedAtUtc,
                activeShift.Status,
                activeShift.OpeningFloatCash,
                activeShift.TotalCashSales,
                activeShift.TotalMadaSales,
                activeShift.TotalCreditCardSales,
                activeShift.TotalSalesAmount,
                activeShift.TotalTaxAmount,
                activeShift.InvoiceCount,
                activeShift.TotalCashIn,
                activeShift.TotalCashOut,
                activeShift.ExpectedCashDrawer,
                activeShift.ActualClosingCash,
                activeShift.VarianceAmount,
                activeShift.ClosingNotes,
                activeShift.JournalEntryId,
                activeShift.JournalEntryNumber
            );
            return Result.Success(activeDto);
        }

        var shiftNumber = $"SHF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 4).ToUpperInvariant()}";

        var shift = PosShift.Open(
            tenantId,
            request.CompanyId,
            shiftNumber,
            request.CashierUserId,
            request.CashierName,
            request.TerminalCode,
            request.OpeningFloatCash,
            request.WarehouseCode ?? "WH-MAIN",
            request.WarehouseName ?? "المستودع الرئيسي",
            request.BranchId,
            request.BranchName ?? "الفرع الرئيسي",
            request.CashierName
        );

        await _shiftRepo.AddAsync(shift, cancellationToken);
        await _shiftRepo.SaveChangesAsync(cancellationToken);

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
            shift.JournalEntryNumber
        );

        return Result.Success(dto);
    }
}
