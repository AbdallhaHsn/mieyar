using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.Purchasing.Application.Commands.Orders;
using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Authorize(Roles = AppRoles.BackOffice)]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public PurchaseOrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع قائمة أوامر الشراء الرسمية مع الفلاتر
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PurchaseOrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? vendorId,
        [FromQuery] PurchaseOrderStatus? status,
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetPurchaseOrdersQuery(companyId, vendorId, status, search), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع تفاصيل أمر شراء بالمعرف
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPurchaseOrderByIdQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إنشاء أمر شراء رسمي جديد
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// تأكيد واعتماد أمر الشراء وإرساله للمورد
    /// </summary>
    [HttpPost("{id:guid}/confirm")]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Confirm([FromRoute] Guid id, [FromBody] ConfirmPoRequest? body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ConfirmPurchaseOrderCommand(id, body?.ConfirmedBy), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إلغاء أمر الشراء
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel([FromRoute] Guid id, [FromBody] CancelPoRequest? body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new CancelPurchaseOrderCommand(id, body?.CancelledBy), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }
}

public record ConfirmPoRequest(string? ConfirmedBy);
public record CancelPoRequest(string? CancelledBy);
