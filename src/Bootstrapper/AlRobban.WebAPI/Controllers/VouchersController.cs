using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.GeneralLedger.Application.Commands.Vouchers;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.Vouchers;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/vouchers")]
[Authorize(Roles = AppRoles.BackOffice)]
public class VouchersController : ControllerBase
{
    private readonly IMediator _mediator;

    public VouchersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع قائمة سندات القبض والصرف مع المؤشرات المالية وفلاتر البحث
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(VoucherListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? companyId,
        [FromQuery] VoucherType? type,
        [FromQuery] VoucherStatus? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? searchTerm,
        CancellationToken cancellationToken = default)
    {
        var query = new GetVouchersQuery(companyId, type, status, fromDate, toDate, searchTerm);
        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع تفاصيل سند قبض أو صرف برقم المعرف
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(VoucherDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetVoucherByIdQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إنشاء سند قبض أو صرف جديد (مسودة أو ترحيل فوري)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(VoucherDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateVoucherRequest request,
        [FromQuery] bool autoPost = false,
        CancellationToken cancellationToken = default)
    {
        var command = new CreateVoucherCommand(
            request.CompanyId,
            request.VoucherType,
            request.VoucherDate,
            request.PaymentMethod,
            request.CashOrBankAccountId,
            request.BeneficiaryOrPayerName,
            request.Description,
            request.ReferenceNumber,
            request.FiscalPeriodId != Guid.Empty ? request.FiscalPeriodId : null,
            request.Lines,
            autoPost);

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// ترحيل السند وتوليد قيد اليومية المزدوج آلياً في دفتر الأستاذ
    /// </summary>
    [HttpPost("{id:guid}/post")]
    [ProducesResponseType(typeof(VoucherDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Post([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new PostVoucherCommand(id), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إلغاء سند مرحل وعكس قيد اليومية التابع له محاسبياً
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(typeof(VoucherDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Cancel(
        [FromRoute] Guid id,
        [FromBody] CancelVoucherRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new CancelVoucherCommand(id, request.Reason), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }
}
