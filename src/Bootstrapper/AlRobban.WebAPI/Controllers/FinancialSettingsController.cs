using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.GeneralLedger.Application.Commands.CostCenters;
using AlRobban.Modules.GeneralLedger.Application.Commands.CreateFiscalYear;
using AlRobban.Modules.GeneralLedger.Application.Commands.TogglePeriodStatus;
using AlRobban.Modules.GeneralLedger.Application.Commands.UpdateFinancialSettings;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Application.Queries.GetFinancialSettings;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/financial-settings")]
[Authorize(Roles = AppRoles.BackOffice)]
public class FinancialSettingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public FinancialSettingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استرجاع الإعدادات المالية والسنوات والفترات ومراكز التكلفة للشركة
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(FinancialSettingsOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSettings([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetFinancialSettingsQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// تحديث السياسات المالية وسياسة مراكز التكلفة والعملة
    /// </summary>
    [HttpPut]
    [ProducesResponseType(typeof(CompanyFinancialSettingsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateFinancialSettingsCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إنشاء سنة مالية مخصصة مع توليد فتراتها تلقائياً
    /// </summary>
    [HttpPost("fiscal-years")]
    [ProducesResponseType(typeof(FiscalYearDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateFiscalYear([FromBody] CreateFiscalYearCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return CreatedAtAction(nameof(GetSettings), new { companyId = command.CompanyId }, result.Value);
    }

    /// <summary>
    /// فتح أو إغلاق أو قفل فترة مالية معينة (Open / Locked / Closed)
    /// </summary>
    [HttpPut("periods/{id}/status")]
    [ProducesResponseType(typeof(FiscalPeriodDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> TogglePeriodStatus(
        [FromRoute] Guid id,
        [FromBody] TogglePeriodStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new TogglePeriodStatusCommand(id, request.Status), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إضافة مركز تكلفة جديد
    /// </summary>
    [HttpPost("cost-centers")]
    [ProducesResponseType(typeof(CostCenterDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateCostCenter([FromBody] CreateCostCenterCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// حذف مركز تكلفة
    /// </summary>
    [HttpDelete("cost-centers/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteCostCenter([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteCostCenterCommand(id), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return NoContent();
    }

    /// <summary>
    /// تدقيق وفحص جاهزية السنة المالية للإقفال وعرض الأرباح المتوقعة
    /// </summary>
    [HttpGet("fiscal-years/{id:guid}/closing-preview")]
    [ProducesResponseType(typeof(YearEndAuditCheckDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetClosingPreview([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new AlRobban.Modules.GeneralLedger.Application.Queries.FiscalClosing.GetYearEndAuditQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إقفال السنة المالية، توليد قيد إقفال الإيرادات والمصروفات، وترحيل الأرصدة للسنة القادمة
    /// </summary>
    [HttpPost("fiscal-years/{id:guid}/close")]
    [ProducesResponseType(typeof(YearEndClosingResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CloseFiscalYear(
        [FromRoute] Guid id,
        [FromBody] CloseFiscalYearRequest request,
        CancellationToken cancellationToken)
    {
        var command = new AlRobban.Modules.GeneralLedger.Application.Commands.FiscalClosing.CloseFiscalYearCommand(
            id,
            request.RetainedEarningsAccountId,
            request.GenerateOpeningBalanceNextYear);

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// إعادة فتح سنة مالية مغلقة للتدقيق المالي
    /// </summary>
    [HttpPost("fiscal-years/{id:guid}/reopen")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReopenFiscalYear(
        [FromRoute] Guid id,
        [FromBody] ReopenYearRequest request,
        CancellationToken cancellationToken)
    {
        var command = new AlRobban.Modules.GeneralLedger.Application.Commands.FiscalClosing.ReopenFiscalYearCommand(id, request.Reason);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(new { success = true });
    }
}

public record TogglePeriodStatusRequest(FiscalPeriodStatus Status);
public record ReopenYearRequest(string Reason);
