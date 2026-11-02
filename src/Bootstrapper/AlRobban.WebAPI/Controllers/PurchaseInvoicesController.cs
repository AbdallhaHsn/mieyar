using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.Purchasing.Application.Commands.Invoices;
using AlRobban.Modules.Purchasing.Application.DTOs;
using AlRobban.Modules.Purchasing.Application.Queries;
using AlRobban.Modules.Purchasing.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/purchase-invoices")]
[Authorize(Roles = AppRoles.BackOffice)]
public class PurchaseInvoicesController : ControllerBase
{
    private readonly IMediator _mediator;

    public PurchaseInvoicesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع قائمة فواتير المشتريات مع الفلاتر والبحث والترقيم
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PurchaseInvoiceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? vendorId,
        [FromQuery] PurchaseInvoiceStatus? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? searchTerm,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var query = new GetPurchaseInvoicesQuery(
            companyId,
            vendorId,
            status,
            fromDate,
            toDate,
            searchTerm,
            skip,
            take);

        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// مؤشرات الأداء الرئيسية للمشتريات والمخزون
    /// </summary>
    [HttpGet("kpis")]
    [ProducesResponseType(typeof(PurchaseKpisDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKpis([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPurchaseKpisQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع تفاصيل فاتورة المشتريات بالمعرف
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PurchaseInvoiceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPurchaseInvoiceByIdQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إنشاء فاتورة مشتريات جديدة (مسودة أو ترحيل فوري)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PurchaseInvoiceDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseInvoiceCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// ترحيل فاتورة المشتريات محاسبياً إلى دفتر اليومية وتحديث المخزون ورصيد المورد
    /// </summary>
    [HttpPost("{id:guid}/post")]
    [ProducesResponseType(typeof(PurchaseInvoiceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Post([FromRoute] Guid id, [FromBody] PostPurchaseInvoiceRequest? request, CancellationToken cancellationToken)
    {
        var command = new PostPurchaseInvoiceCommand(id, request?.PostedBy ?? "المستخدم");
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إلغاء فاتورة مشتريات غير مرحلة
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(typeof(PurchaseInvoiceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel([FromRoute] Guid id, [FromBody] CancelPurchaseInvoiceRequest? request, CancellationToken cancellationToken)
    {
        var command = new CancelPurchaseInvoiceCommand(id, request?.Reason);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// سداد دفعة من فاتورة المشتريات وترحيل سند الصرف وتخفيض رصيد المورد
    /// </summary>
    [HttpPost("{id:guid}/pay")]
    [ProducesResponseType(typeof(PurchaseInvoiceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Pay([FromRoute] Guid id, [FromBody] PayPurchaseInvoiceRequest request, CancellationToken cancellationToken)
    {
        var command = new PayPurchaseInvoiceCommand(id, request, User.Identity?.Name ?? "المستخدم");
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// مردودات مشتريات (إشعار مدين) لفاتورة مرحلة وعكس المخزون والقيد المحاسبي ورصيد المورد
    /// </summary>
    [HttpPost("{id:guid}/return")]
    [ProducesResponseType(typeof(PurchaseInvoiceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Return([FromRoute] Guid id, [FromBody] ReturnPurchaseInvoiceRequest? request, CancellationToken cancellationToken)
    {
        var command = new ReturnPurchaseInvoiceCommand(id, request?.Reason, request?.ReturnedBy ?? User.Identity?.Name ?? "المستخدم");
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }
}

public record PostPurchaseInvoiceRequest(string? PostedBy = null);
public record CancelPurchaseInvoiceRequest(string? Reason = null);

