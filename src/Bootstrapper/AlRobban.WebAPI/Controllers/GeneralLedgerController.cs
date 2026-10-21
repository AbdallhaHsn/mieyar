using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.GeneralLedger;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/general-ledger")]
public class GeneralLedgerController : ControllerBase
{
    private readonly IMediator _mediator;

    public GeneralLedgerController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع دفتر الأستاذ العام لجميع الحسابات النشطة مع الأرصدة الافتتاحية وحركات الفترة والأرصدة الختامية
    /// </summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(GeneralLedgerReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview(
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? searchTerm,
        [FromQuery] Guid? costCenterId,
        [FromQuery] bool includeZeroBalances = true,
        CancellationToken cancellationToken = default)
    {
        var query = new GetGeneralLedgerOverviewQuery(companyId, fromDate, toDate, searchTerm, costCenterId, includeZeroBalances);
        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع كشف الحساب التفصيلي لحساب معين مع الرصيد الافتتاحي وجميع الحركات المحاسبية والرصيد التراكمي المتحرك
    /// </summary>
    [HttpGet("account-statement/{accountId:guid}")]
    [ProducesResponseType(typeof(AccountStatementDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAccountStatement(
        [FromRoute] Guid accountId,
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] Guid? costCenterId,
        CancellationToken cancellationToken = default)
    {
        var query = new GetAccountStatementQuery(accountId, companyId, fromDate, toDate, costCenterId);
        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }
}
