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
}
