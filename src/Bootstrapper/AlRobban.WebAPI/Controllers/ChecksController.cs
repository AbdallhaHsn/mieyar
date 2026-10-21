using AlRobban.Modules.GeneralLedger.Application.Commands.Checks;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChecksController : ControllerBase
{
    private readonly IMediator _mediator;

    public ChecksController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع محفظة أوراق القبض وأوراق الدفع (الشيكات المؤجلة)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PostDatedCheckDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetChecks(
        [FromQuery] Guid? companyId,
        [FromQuery] CheckType? type,
        [FromQuery] CheckStatus? status,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetChecksQuery(companyId, type, status), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استلام وقيد شيك جديد في حافظة الشيكات (ورقة قبض أو دفع)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PostDatedCheckDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateCheck([FromBody] CreateCheckCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إيداع الشيك في البنك للتحصيل (تغيير الحالة إلى مودع للتحصيل)
    /// </summary>
    [HttpPost("{id:guid}/deposit")]
    public async Task<IActionResult> Deposit([FromRoute] Guid id, [FromBody] DepositCheckRequest request, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DepositCheckCommand(id, request.BankAccountId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إثبات التحصيل الفعلي للشيك وإضافة المبلغ لرصيد البنك
    /// </summary>
    [HttpPost("{id:guid}/clear")]
    public async Task<IActionResult> Clear([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ClearCheckCommand(id), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إثبات ارتداد الشيك وإعادته لذمة العميل مع تسجيل مصاريف الارتداد
    /// </summary>
    [HttpPost("{id:guid}/bounce")]
    public async Task<IActionResult> Bounce([FromRoute] Guid id, [FromBody] BounceCheckRequest request, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new BounceCheckCommand(id, request.Reason, request.BounceFee), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }
}

public record DepositCheckRequest(Guid BankAccountId);
public record BounceCheckRequest(string Reason, decimal BounceFee = 0);
