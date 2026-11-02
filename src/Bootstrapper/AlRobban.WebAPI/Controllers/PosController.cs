using AlRobban.Modules.InvoicingAndZatca.Application.Commands.Pos;
using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Application.Queries.Pos;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Shared.Application.Abstractions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/pos")]
[Authorize]
public class PosController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public PosController(
        IMediator mediator,
        ICurrentTenantContext tenantContext)
    {
        _mediator = mediator;
        _tenantContext = tenantContext;
    }

    private Guid GetEffectiveCompanyId(Guid companyId)
    {
        if (companyId != Guid.Empty) return companyId;
        return _tenantContext.TenantId.GetValueOrDefault() != Guid.Empty
            ? _tenantContext.TenantId.Value
            : Guid.Parse("11111111-1111-1111-1111-111111111111");
    }

    [HttpGet("shifts/current")]
    public async Task<IActionResult> GetCurrentShift(
        [FromQuery] Guid companyId,
        [FromQuery] string? terminalCode,
        [FromQuery] string? cashierUserId,
        CancellationToken cancellationToken)
    {
        var compId = GetEffectiveCompanyId(companyId);
        var result = await _mediator.Send(new GetCurrentPosShiftQuery(compId, terminalCode, cashierUserId), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("shifts/open")]
    public async Task<IActionResult> OpenShift([FromBody] OpenShiftApiRequest request, CancellationToken cancellationToken)
    {
        var compId = GetEffectiveCompanyId(request.CompanyId);
        var command = new OpenPosShiftCommand(
            compId,
            request.CashierUserId ?? "USER-01",
            request.CashierName ?? "كاشير الصندوق",
            request.TerminalCode ?? "POS-01",
            request.OpeningFloatCash,
            request.WarehouseCode ?? "WH-MAIN",
            request.WarehouseName ?? "المستودع الرئيسي",
            request.BranchId,
            request.BranchName ?? "الفرع الرئيسي"
        );

        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("shifts/close")]
    public async Task<IActionResult> CloseShift([FromBody] CloseShiftApiRequest request, CancellationToken cancellationToken)
    {
        var command = new ClosePosShiftCommand(request.PosShiftId, request.ActualClosingCash, request.Notes, request.ClosedBy);
        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("shifts/cash-movement")]
    public async Task<IActionResult> AddCashMovement([FromBody] CashMovementApiRequest request, CancellationToken cancellationToken)
    {
        var command = new AddPosCashMovementCommand(
            request.PosShiftId,
            request.MovementType,
            request.Amount,
            request.ReasonAr,
            request.ReasonEn,
            request.CreatedBy
        );

        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("shifts/history")]
    public async Task<IActionResult> GetShiftsHistory(
        [FromQuery] Guid companyId,
        [FromQuery] int maxCount = 50,
        CancellationToken cancellationToken = default)
    {
        var compId = GetEffectiveCompanyId(companyId);
        var result = await _mediator.Send(new GetPosShiftsHistoryQuery(compId, maxCount), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutApiRequest request, CancellationToken cancellationToken)
    {
        var compId = GetEffectiveCompanyId(request.CompanyId);
        var command = new ProcessPosSaleCommand(
            compId,
            request.PosShiftId,
            request.TerminalCode ?? "POS-01",
            request.CashierName ?? "كاشير الصندوق",
            request.PaymentMethod,
            request.Lines,
            request.CashReceived,
            request.ChangeGiven,
            request.CashPart,
            request.MadaPart,
            request.CustomerName ?? "عميل نقدي",
            request.CustomerVatNumber,
            request.WarehouseCode ?? "WH-MAIN"
        );

        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("items")]
    public async Task<IActionResult> GetFastItems(
        [FromQuery] Guid companyId,
        [FromQuery] string? searchTerm,
        CancellationToken cancellationToken)
    {
        var compId = GetEffectiveCompanyId(companyId);
        var result = await _mediator.Send(new GetPosFastItemsQuery(compId, searchTerm), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}

public record OpenShiftApiRequest(
    Guid CompanyId,
    string? CashierUserId,
    string? CashierName,
    string? TerminalCode,
    decimal OpeningFloatCash,
    string? WarehouseCode,
    string? WarehouseName,
    Guid? BranchId,
    string? BranchName
);

public record CloseShiftApiRequest(
    Guid PosShiftId,
    decimal ActualClosingCash,
    string? Notes,
    string? ClosedBy
);

public record CashMovementApiRequest(
    Guid PosShiftId,
    CashMovementType MovementType,
    decimal Amount,
    string ReasonAr,
    string? ReasonEn,
    string? CreatedBy
);

public record CheckoutApiRequest(
    Guid CompanyId,
    Guid? PosShiftId,
    string? TerminalCode,
    string? CashierName,
    PosPaymentMethod PaymentMethod,
    List<PosSaleItemLineRequest> Lines,
    decimal CashReceived,
    decimal ChangeGiven,
    decimal CashPart,
    decimal MadaPart,
    string? CustomerName,
    string? CustomerVatNumber,
    string? WarehouseCode
);
