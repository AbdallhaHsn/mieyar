using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.Purchasing.Application.Commands.Receipts;
using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/goods-receipts")]
[Authorize(Roles = AppRoles.BackOffice)]
public class GoodsReceiptNotesController : ControllerBase
{
    private readonly IMediator _mediator;

    public GoodsReceiptNotesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع قائمة محاضر وأذونات الاستلام المخزني
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<GoodsReceiptNoteDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? purchaseOrderId,
        [FromQuery] Guid? vendorId,
        [FromQuery] GoodsReceiptStatus? status,
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetGoodsReceiptNotesQuery(companyId, purchaseOrderId, vendorId, status, search), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع تفاصيل محضر استلام مخزني بالمعرف
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(GoodsReceiptNoteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetGoodsReceiptNoteByIdQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إنشاء محضر استلام مخزني جديد (مع تحديث المخزون وأمر الشراء تلقائياً إذا تم تفعيله)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(GoodsReceiptNoteDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateGoodsReceiptNoteCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }
}
