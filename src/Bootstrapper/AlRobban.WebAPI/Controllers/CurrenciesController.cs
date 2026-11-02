using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.GeneralLedger.Application.Commands.Currencies;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = AppRoles.BackOffice)]
public class CurrenciesController : ControllerBase
{
    private readonly IMediator _mediator;

    public CurrenciesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع قائمة أسعار صرف العملات الأجنبية مقابل الريال السعودي
    /// </summary>
    [HttpGet("rates")]
    [ProducesResponseType(typeof(IReadOnlyList<CurrencyRateDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRates([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCurrencyRatesQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// تسجيل أو تحديث سعر صرف عملة أجنبية (USD, EUR, GBP...)
    /// </summary>
    [HttpPost("rates")]
    [ProducesResponseType(typeof(CurrencyRateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveRate([FromBody] SaveCurrencyRateCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إعادة تقييم أرصدة العملات الأجنبية وفق معيار IAS 21 وإثبات أرباح وخسائر فروق الصرف
    /// </summary>
    [HttpPost("revalue")]
    [ProducesResponseType(typeof(FxRevaluationResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Revalue([FromBody] RevalueRequest request, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RevalueCurrenciesCommand(request.CompanyId, request.RevaluationDate ?? DateTime.UtcNow), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }
}

public record RevalueRequest(Guid? CompanyId, DateTime? RevaluationDate);
