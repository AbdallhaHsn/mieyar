using AlRobban.Modules.GeneralLedger.Application.Commands.Partners;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartnersController : ControllerBase
{
    private readonly IMediator _mediator;

    public PartnersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع سجلات وبطاقات العملاء والموردين (AR & AP Sub-Ledgers)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BusinessPartnerDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPartners(
        [FromQuery] Guid? companyId,
        [FromQuery] PartnerType? type,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPartnersQuery(companyId, type, search), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إضافة بطاقة عميل أو مورد جديدة
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(BusinessPartnerDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreatePartner([FromBody] CreatePartnerCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// تقرير أعمار الديون وفق المعايير المحاسبية (Aging Report: 0-30, 31-60, 61-90, 90+ Days)
    /// </summary>
    [HttpGet("aging")]
    [ProducesResponseType(typeof(IReadOnlyList<PartnerAgingSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDebtAgingReport(
        [FromQuery] Guid? companyId,
        [FromQuery] PartnerType? type,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDebtAgingReportQuery(companyId, type), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استخراج كشف حساب تفصيلي للعميل أو المورد مع الأرصدة التراكمية وسندات القبض والفواتير
    /// </summary>
    [HttpGet("{id:guid}/statement")]
    [ProducesResponseType(typeof(PartnerStatementDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPartnerStatement(
        [FromRoute] Guid id,
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPartnerStatementQuery(id, null, companyId, fromDate, toDate), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استخراج كشف حساب بالاسم أو المعرف (مفيد للفواتير وشاشات المبيعات)
    /// </summary>
    [HttpGet("statement")]
    [ProducesResponseType(typeof(PartnerStatementDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatementByQuery(
        [FromQuery] Guid? partnerId,
        [FromQuery] string? partnerName,
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPartnerStatementQuery(partnerId, partnerName, companyId, fromDate, toDate), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }
}
