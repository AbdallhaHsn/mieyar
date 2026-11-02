using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.GeneralLedger.Application.Commands.FiscalClosing;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.FinancialStatements;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/financial-statements")]
[Authorize(Roles = AppRoles.BackOffice)]
public class FinancialStatementsController : ControllerBase
{
    private readonly IMediator _mediator;

    public FinancialStatementsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// استخراج قائمة الدخل (الأرباح والخسائر) متعددة أو أحادية المراحل وفق معايير IFRS / SOCPA
    /// </summary>
    [HttpGet("income-statement")]
    [ProducesResponseType(typeof(IncomeStatementReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetIncomeStatement(
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] Guid? costCenterId,
        [FromQuery] int? maxLevel,
        [FromQuery] bool? hideZeroBalances,
        [FromQuery] string? presentationFormat,
        CancellationToken cancellationToken = default)
    {
        var query = new GetIncomeStatementQuery(
            companyId,
            fromDate,
            toDate,
            costCenterId,
            maxLevel,
            hideZeroBalances,
            presentationFormat);

        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استخراج قائمة المركز المالي (الميزانية العمومية) مع التحقق من معادلة التوازن المحاسبي
    /// </summary>
    [HttpGet("balance-sheet")]
    [ProducesResponseType(typeof(BalanceSheetReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBalanceSheet(
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? asOfDate,
        [FromQuery] Guid? costCenterId,
        [FromQuery] int? maxLevel,
        [FromQuery] bool? hideZeroBalances,
        CancellationToken cancellationToken = default)
    {
        var query = new GetBalanceSheetQuery(
            companyId,
            asOfDate,
            costCenterId,
            maxLevel,
            hideZeroBalances);

        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استخراج قائمة التدفقات النقدية الشاملة وفق معيار المحاسبة الدولي IAS 7 (تشغيلية، استثمارية، تمويلية)
    /// </summary>
    [HttpGet("cash-flow")]
    [ProducesResponseType(typeof(CashFlowStatementReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCashFlowStatement(
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] Guid? costCenterId,
        [FromQuery] bool? hideZeroBalances,
        [FromQuery] string? method,
        CancellationToken cancellationToken = default)
    {
        var query = new GetCashFlowStatementQuery(
            fromDate,
            toDate,
            companyId,
            costCenterId,
            hideZeroBalances,
            method);

        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع محددات وإعدادات عرض القوائم المالية للشركة
    /// </summary>
    [HttpGet("settings")]
    [ProducesResponseType(typeof(FinancialStatementSettingsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSettings([FromQuery] Guid? companyId, CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetFinancialStatementSettingsQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استخراج قائمة التغير في حقوق الملكية الشاملة وفق معيار المحاسبة الدولي IAS 1
    /// </summary>
    [HttpGet("equity-statement")]
    [ProducesResponseType(typeof(EquityStatementReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEquityStatement(
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        var query = new GetEquityStatementQuery(companyId, fromDate, toDate);
        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// استخراج إقرار ضريبة القيمة المضافة لـ ZATCA وفق نموذج الهيئة الرسمي (16 حقلاً)
    /// </summary>
    [HttpGet("vat-return")]
    [ProducesResponseType(typeof(ZatcaVatReturnDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetZatcaVatReturn(
        [FromQuery] Guid? companyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] decimal? adjustments,
        CancellationToken cancellationToken = default)
    {
        var query = new GetZatcaVatReturnQuery(companyId, fromDate, toDate, adjustments ?? 0m);
        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// اعتماد وإقفال الفترة الضريبية وتوليد قيد التسوية المحاسبي آلياً في دفتر الأستاذ العام
    /// </summary>
    [HttpPost("vat-return/close-period")]
    [ProducesResponseType(typeof(VatPeriodClosingResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CloseVatPeriod(
        [FromBody] CloseVatPeriodRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new CloseVatPeriodCommand(
            request.CompanyId,
            request.FromDate,
            request.ToDate,
            request.PeriodNameAr,
            request.PeriodNameEn,
            User.Identity?.Name ?? "مدير الحسابات");

        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// حفظ وتحديث محددات وإعدادات عرض القوائم المالية للشركة
    /// </summary>
    [HttpPut("settings")]
    [ProducesResponseType(typeof(FinancialStatementSettingsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateFinancialStatementSettingsCommand command, CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }
}

public record CloseVatPeriodRequest(
    Guid? CompanyId,
    DateTime FromDate,
    DateTime ToDate,
    string? PeriodNameAr = null,
    string? PeriodNameEn = null
);

