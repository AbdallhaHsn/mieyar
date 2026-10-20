using AlRobban.Modules.GeneralLedger.Application.Commands.CreateAccount;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.GetAccountingStandards;
using AlRobban.Modules.GeneralLedger.Application.Queries.GetAccountsTree;
using AlRobban.Modules.GeneralLedger.Domain.ValueObjects;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AccountsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع شجرة دليل الحسابات الهرمية للشركة مع المعايير المحاسبية والقيود النموذجية
    /// </summary>
    [HttpGet("tree")]
    [ProducesResponseType(typeof(IReadOnlyList<AccountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAccountsTree([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAccountsTreeQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع قائمة المعايير الدولية والوطنية (IFRS / SOCPA / ZATCA) وشروحها والقيود النموذجية
    /// </summary>
    [HttpGet("standards")]
    [ProducesResponseType(typeof(IReadOnlyList<AccountingStandardGuidance>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStandards(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAccountingStandardsQuery(), cancellationToken);
        return Ok(result.Value);
    }

    /// <summary>
    /// إضافة حساب جديد في شجرة الحسابات مع ربطه بالمعيار والطرف المحاسبي
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AccountDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return CreatedAtAction(nameof(GetAccountsTree), new { id = result.Value.Id }, result.Value);
    }
}
