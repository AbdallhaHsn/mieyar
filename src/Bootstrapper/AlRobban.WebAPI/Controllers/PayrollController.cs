using AlRobban.WebAPI.Security;
using System.Text;
using AlRobban.Modules.GeneralLedger.Application.Queries.BankReconciliation;
using AlRobban.Modules.HumanResources.Application.Commands.Payroll;
using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Application.Queries;
using AlRobban.Shared.Application.Abstractions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/hr/payroll")]
[Authorize(Roles = AppRoles.BackOffice)]
public class PayrollController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public PayrollController(
        IMediator mediator,
        ICurrentTenantContext tenantContext)
    {
        _mediator = mediator;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetPayrollPeriods([FromQuery] Guid companyId, [FromQuery] int? year, CancellationToken cancellationToken)
    {
        if (companyId == Guid.Empty)
        {
            companyId = _tenantContext.TenantId.GetValueOrDefault() != Guid.Empty
                ? _tenantContext.TenantId.Value
                : Guid.Parse("11111111-1111-1111-1111-111111111111");
        }

        var result = await _mediator.Send(new GetPayrollPeriodsQuery(companyId, year), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPayrollPeriodById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPayrollPeriodByIdQuery(id), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> CalculatePayroll([FromBody] CalculatePayrollRequest request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId != Guid.Empty
            ? request.CompanyId
            : (_tenantContext.TenantId.GetValueOrDefault() != Guid.Empty ? _tenantContext.TenantId.Value : Guid.Parse("11111111-1111-1111-1111-111111111111"));

        var command = new CalculatePayrollCommand(
            companyId,
            request.Year,
            request.Month,
            request.Adjustments,
            request.Notes
        );

        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("{id:guid}/post-to-gl")]
    public async Task<IActionResult> PostPayrollToGl(Guid id, [FromBody] PostPayrollRequest? request, CancellationToken cancellationToken)
    {
        var command = new ApproveAndPostPayrollCommand(id, request?.Notes);
        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPut("{id:guid}/lines/{lineId:guid}")]
    public async Task<IActionResult> UpdatePayrollLine(Guid id, Guid lineId, [FromBody] UpdatePayrollLineRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdatePayrollLineCommand(
            id,
            lineId,
            request.OvertimeAmount,
            request.AbsenceDeduction,
            request.LoanDeduction,
            request.OtherDeductions,
            request.Notes
        );

        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("bank-accounts")]
    public async Task<IActionResult> GetDisbursementBankAccounts([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var targetCompanyId = companyId.HasValue && companyId.Value != Guid.Empty
            ? companyId.Value
            : (_tenantContext.TenantId.GetValueOrDefault() != Guid.Empty ? _tenantContext.TenantId.Value : Guid.Parse("11111111-1111-1111-1111-111111111111"));

        var result = await _mediator.Send(new GetBankAccountsForReconciliationQuery(targetCompanyId), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("{id:guid}/mark-as-paid")]
    public async Task<IActionResult> MarkPayrollAsPaid(Guid id, [FromBody] MarkPayrollAsPaidRequest? request, CancellationToken cancellationToken)
    {
        var command = new MarkPayrollAsPaidCommand(id, request?.Notes, request?.BankAccountId);
        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("{id:guid}/wps")]
    public async Task<IActionResult> GenerateWps(Guid id, [FromBody] GenerateWpsRequest? request, CancellationToken cancellationToken)
    {
        var command = new GenerateWpsFileCommand(
            id,
            request?.EstablishmentMudadId,
            request?.EstablishmentName,
            request?.EmployerIban,
            request?.EmployerBankCode
        );

        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("{id:guid}/wps-download")]
    public async Task<IActionResult> DownloadWpsFile(Guid id, CancellationToken cancellationToken)
    {
        var command = new GenerateWpsFileCommand(id);
        var result = await _mediator.Send(command, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result.Error);
        }

        var bytes = Encoding.UTF8.GetBytes(result.Value.FileContent);
        return File(bytes, "text/plain; charset=utf-8", result.Value.FileName);
    }
}

public record CalculatePayrollRequest(
    Guid CompanyId,
    int Year,
    int Month,
    List<PayrollEmployeeAdjustment>? Adjustments = null,
    string? Notes = null
);

public record PostPayrollRequest(string? Notes = null);

public record UpdatePayrollLineRequest(
    decimal OvertimeAmount = 0,
    decimal AbsenceDeduction = 0,
    decimal LoanDeduction = 0,
    decimal OtherDeductions = 0,
    string? Notes = null
);

public record MarkPayrollAsPaidRequest(string? Notes = null, Guid? BankAccountId = null);

public record GenerateWpsRequest(
    string? EstablishmentMudadId = null,
    string? EstablishmentName = null,
    string? EmployerIban = null,
    string? EmployerBankCode = null
);
