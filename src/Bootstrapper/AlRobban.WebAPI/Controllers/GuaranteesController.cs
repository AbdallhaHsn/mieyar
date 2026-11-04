using AlRobban.WebAPI.Security;
using AlRobban.Modules.Projects.Application.Commands.Guarantees;
using AlRobban.Modules.Projects.Application.Queries.Projects;
using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Shared.Application.Abstractions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/projects/guarantees")]
[Authorize(Roles = AppRoles.BackOffice)]
public class GuaranteesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public GuaranteesController(IMediator mediator, ICurrentTenantContext tenantContext)
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
    public async Task<IActionResult> GetGuarantees([FromQuery] Guid? companyId, [FromQuery] Guid? projectId)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        var result = await _mediator.Send(new GetLettersOfGuaranteeQuery(effectiveCompanyId, projectId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPost]
    public async Task<IActionResult> CreateGuarantee([FromBody] CreateGuaranteeRequest request)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(request.CompanyId);
        var command = new CreateLetterOfGuaranteeCommand(
            CompanyId: effectiveCompanyId,
            ProjectId: request.ProjectId,
            GuaranteeNumber: request.GuaranteeNumber,
            Type: request.Type,
            IssuingBank: request.IssuingBank,
            BeneficiaryName: request.BeneficiaryName,
            Amount: request.Amount,
            CashMarginPercentage: request.CashMarginPercentage,
            BankCommission: request.BankCommission,
            IssueDate: request.IssueDate,
            ExpiryDate: request.ExpiryDate,
            BankBranch: request.BankBranch,
            BankAccountNumber: request.BankAccountNumber,
            Notes: request.Notes,
            PostGlEntry: request.PostGlEntry);

        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPost("{id}/extend")]
    public async Task<IActionResult> ExtendGuarantee(Guid id, [FromBody] ExtendGuaranteeRequest request)
    {
        var command = new ExtendLetterOfGuaranteeCommand(id, request.NewExpiryDate, request.AdditionalCommission, request.Notes);
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPost("{id}/release")]
    public async Task<IActionResult> ReleaseGuarantee(Guid id, [FromBody] ReleaseGuaranteeRequest? request)
    {
        var postGl = request?.PostReleaseGl ?? true;
        var command = new ReleaseLetterOfGuaranteeCommand(id, request?.Notes, postGl);
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { error = result.Error.Description });
    }
}

public record CreateGuaranteeRequest(
    Guid? CompanyId,
    Guid ProjectId,
    string GuaranteeNumber,
    GuaranteeType Type,
    string IssuingBank,
    string BeneficiaryName,
    decimal Amount,
    decimal CashMarginPercentage,
    decimal BankCommission,
    DateTime IssueDate,
    DateTime ExpiryDate,
    string? BankBranch = null,
    string? BankAccountNumber = null,
    string? Notes = null,
    bool PostGlEntry = true);

public record ExtendGuaranteeRequest(DateTime NewExpiryDate, decimal AdditionalCommission = 0, string? Notes = null);

public record ReleaseGuaranteeRequest(string? Notes = null, bool PostReleaseGl = true);
