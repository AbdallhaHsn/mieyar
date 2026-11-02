using AlRobban.Modules.Projects.Application.Commands.ProgressBillings;
using AlRobban.Modules.Projects.Application.Queries.Projects;
using AlRobban.Shared.Application.Abstractions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/projects/billings")]
[Authorize]
public class ProgressBillingsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public ProgressBillingsController(IMediator mediator, ICurrentTenantContext tenantContext)
    {
        _mediator = mediator;
        _tenantContext = tenantContext;
    }

    private Guid GetEffectiveCompanyId(Guid? companyId)
    {
        if (companyId.HasValue && companyId.Value != Guid.Empty) return companyId.Value;
        return _tenantContext.TenantId.GetValueOrDefault() != Guid.Empty
            ? _tenantContext.TenantId.Value
            : Guid.Parse("11111111-1111-1111-1111-111111111111");
    }

    [HttpGet]
    public async Task<IActionResult> GetBillings([FromQuery] Guid? companyId, [FromQuery] Guid? projectId)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        var result = await _mediator.Send(new GetProgressBillingsQuery(effectiveCompanyId, projectId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPost]
    public async Task<IActionResult> CreateBilling([FromBody] CreateBillingRequest request)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(request.CompanyId);
        var command = new CreateProgressBillingCommand(
            CompanyId: effectiveCompanyId,
            ProjectId: request.ProjectId,
            BillingDate: request.BillingDate,
            PeriodStart: request.PeriodStart,
            PeriodEnd: request.PeriodEnd,
            CurrentWorkAmount: request.CurrentWorkAmount,
            RetentionPercentage: request.RetentionPercentage,
            AdvancePaymentDeduction: request.AdvancePaymentDeduction,
            OtherDeductions: request.OtherDeductions,
            DeductionsNotes: request.DeductionsNotes,
            ConsultantName: request.ConsultantName);

        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitToConsultant(Guid id, [FromBody] SubmitBillingRequest request)
    {
        var result = await _mediator.Send(new SubmitProgressBillingCommand(id, request.ConsultantName, request.Notes));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveByConsultant(Guid id, [FromBody] ApproveBillingRequest request)
    {
        var result = await _mediator.Send(new ApproveProgressBillingCommand(id, request.ConsultantName, request.Notes));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPost("{id}/certify")]
    public async Task<IActionResult> CertifyBilling(Guid id, [FromBody] CertifyBillingRequest? request)
    {
        var postGl = request?.PostGlEntry ?? true;
        var result = await _mediator.Send(new CertifyProgressBillingCommand(
            Id: id, 
            PostGlEntry: postGl,
            ArAccountId: request?.ArAccountId,
            RetentionAccountId: request?.RetentionAccountId,
            AdvancePaymentAccountId: request?.AdvancePaymentAccountId,
            RevenueAccountId: request?.RevenueAccountId,
            VatAccountId: request?.VatAccountId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }
}

public record CreateBillingRequest(
    Guid? CompanyId,
    Guid ProjectId,
    DateTime BillingDate,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    decimal CurrentWorkAmount,
    decimal? RetentionPercentage,
    decimal? AdvancePaymentDeduction,
    decimal OtherDeductions = 0,
    string? DeductionsNotes = null,
    string? ConsultantName = null);

public record SubmitBillingRequest(string? ConsultantName, string? Notes);

public record ApproveBillingRequest(string ConsultantName, string? Notes);

public record CertifyBillingRequest(
    bool PostGlEntry = true,
    Guid? ArAccountId = null,
    Guid? RetentionAccountId = null,
    Guid? AdvancePaymentAccountId = null,
    Guid? RevenueAccountId = null,
    Guid? VatAccountId = null);
