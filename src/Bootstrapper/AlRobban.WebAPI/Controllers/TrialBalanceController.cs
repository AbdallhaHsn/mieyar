using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.TrialBalance;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/trial-balance")]
[Authorize(Roles = AppRoles.BackOffice)]
public class TrialBalanceController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrialBalanceController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع ميزان المراجعة بالمجاميع والأرصدة (6 أعمدة) لجميع الحسابات ومستوياتها الشجرية
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(TrialBalanceReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTrialBalance(
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] Guid? costCenterId,
        [FromQuery] bool hideZeroBalances = false,
        [FromQuery] int? maxLevel = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = new GetTrialBalanceQuery(
            companyId,
            fromDate,
            toDate,
            costCenterId,
            hideZeroBalances,
            maxLevel,
            searchTerm);

        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }
}
