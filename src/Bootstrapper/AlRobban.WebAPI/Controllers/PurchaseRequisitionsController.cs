using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.Purchasing.Application.Commands.Requisitions;
using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/purchase-requisitions")]
[Authorize(Roles = AppRoles.BackOffice)]
public class PurchaseRequisitionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PurchaseRequisitionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع قائمة طلبات الشراء الداخلية
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PurchaseRequisitionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? companyId,
        [FromQuery] RequisitionStatus? status,
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetPurchaseRequisitionsQuery(companyId, status, search), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع تفاصيل طلب شراء داخلي
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PurchaseRequisitionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPurchaseRequisitionByIdQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إنشاء طلب شراء داخلي جديد
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PurchaseRequisitionDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseRequisitionCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// اعتماد طلب الشراء الداخلي
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    [ProducesResponseType(typeof(PurchaseRequisitionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve([FromRoute] Guid id, [FromBody] ApproveRequest? body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ApprovePurchaseRequisitionCommand(id, body?.Notes), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// رفض طلب الشراء الداخلي
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    [ProducesResponseType(typeof(PurchaseRequisitionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject([FromRoute] Guid id, [FromBody] RejectRequest? body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RejectPurchaseRequisitionCommand(id, body?.Reason), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }
}

public record ApproveRequest(string? Notes);
public record RejectRequest(string? Reason);
