using AlRobban.Modules.GeneralLedger.Application.Commands.BankReconciliationCommands;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.BankReconciliation;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/bank-reconciliation")]
public class BankReconciliationController : ControllerBase
{
    private readonly IMediator _mediator;

    public BankReconciliationController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع الحسابات البنكية المتاحة للتسوية مع أرصدتها الدفترية الحالية
    /// </summary>
    [HttpGet("accounts")]
    [ProducesResponseType(typeof(List<BankAccountSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAccounts([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBankAccountsForReconciliationQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// تحميل بيئة عمل التسوية البنكية لحساب معين وتاريخ كشف الحساب
    /// </summary>
    [HttpGet("workspace")]
    [ProducesResponseType(typeof(BankReconciliationWorkspaceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkspace(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid bankAccountId,
        [FromQuery] DateTime? statementDate,
        [FromQuery] decimal statementEndingBalance = 0,
        CancellationToken cancellationToken = default)
    {
        var targetCompanyId = companyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var targetDate = statementDate ?? DateTime.UtcNow.Date;

        var query = new GetBankReconciliationWorkspaceQuery(
            targetCompanyId,
            bankAccountId,
            targetDate,
            statementEndingBalance);

        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// حفظ التسوية البنكية (مسودة أو اعتماد نهائي)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(BankReconciliationResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Save(
        [FromBody] SaveBankReconciliationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new SaveBankReconciliationCommand(request), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// سجل التسويات البنكية السابقة
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(List<BankReconciliationResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistory(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? bankAccountId,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBankReconciliationHistoryQuery(companyId, bankAccountId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استيراد كشف حساب بنكي (Excel / CSV) وتنفيذ خوارزمية المطابقة الآلية
    /// </summary>
    [HttpPost("auto-match")]
    [ProducesResponseType(typeof(AutoMatchResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AutoMatchStatement(
        [FromBody] ImportBankStatementRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new AutoMatchBankStatementCommand(request), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }
}
