using AlRobban.Modules.Projects.Application.Commands.Projects;
using AlRobban.Modules.Projects.Application.Queries.Projects;
using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Shared.Application.Abstractions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public ProjectsController(IMediator mediator, ICurrentTenantContext tenantContext)
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

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummaryMetrics([FromQuery] Guid? companyId)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        var result = await _mediator.Send(new GetProjectsSummaryMetricsQuery(effectiveCompanyId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }

    [HttpGet]
    public async Task<IActionResult> GetProjects([FromQuery] Guid? companyId, [FromQuery] string? search)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        var result = await _mediator.Send(new GetProjectsListQuery(effectiveCompanyId, search));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProjectById(Guid id)
    {
        var result = await _mediator.Send(new GetProjectDetailsQuery(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(new { error = result.Error.Description });
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(request.CompanyId);
        var command = new CreateProjectCommand(
            CompanyId: effectiveCompanyId,
            NameAr: request.NameAr,
            NameEn: request.NameEn,
            CustomerId: request.CustomerId,
            CustomerName: request.CustomerName,
            ContractAmount: request.ContractAmount,
            EstimatedCost: request.EstimatedCost,
            StartDate: request.StartDate,
            ExpectedEndDate: request.ExpectedEndDate,
            ContractNumber: request.ContractNumber,
            ContractDate: request.ContractDate,
            RetentionPercentage: request.RetentionPercentage,
            AdvancePaymentAmount: request.AdvancePaymentAmount,
            AdvancePaymentDeductionPercentage: request.AdvancePaymentDeductionPercentage,
            CostCenterId: request.CostCenterId,
            CostCenterName: request.CostCenterName,
            ProjectManager: request.ProjectManager,
            SiteLocation: request.SiteLocation,
            Notes: request.Notes);

        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(Guid id, [FromBody] UpdateProjectRequest request)
    {
        var command = new UpdateProjectCommand(
            Id: id,
            NameAr: request.NameAr,
            NameEn: request.NameEn,
            CustomerId: request.CustomerId,
            CustomerName: request.CustomerName,
            ContractAmount: request.ContractAmount,
            EstimatedCost: request.EstimatedCost,
            StartDate: request.StartDate,
            ExpectedEndDate: request.ExpectedEndDate,
            ContractNumber: request.ContractNumber,
            ContractDate: request.ContractDate,
            RetentionPercentage: request.RetentionPercentage,
            AdvancePaymentAmount: request.AdvancePaymentAmount,
            AdvancePaymentDeductionPercentage: request.AdvancePaymentDeductionPercentage,
            CostCenterId: request.CostCenterId,
            CostCenterName: request.CostCenterName,
            ProjectManager: request.ProjectManager,
            SiteLocation: request.SiteLocation,
            Notes: request.Notes);

        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateProjectStatus(Guid id, [FromBody] UpdateProjectStatusRequest request)
    {
        var result = await _mediator.Send(new UpdateProjectStatusCommand(id, request.Status, request.ActualEndDate));
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPost("{id}/phases")]
    public async Task<IActionResult> AddPhase(Guid id, [FromBody] AddPhaseRequest request)
    {
        var command = new AddProjectPhaseCommand(
            ProjectId: id,
            NameAr: request.NameAr,
            NameEn: request.NameEn,
            PhaseOrder: request.PhaseOrder,
            StartDate: request.StartDate,
            EndDate: request.EndDate,
            EstimatedCost: request.EstimatedCost,
            WeightPercentage: request.WeightPercentage,
            Notes: request.Notes);

        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPut("{id}/phases/{phaseId}/progress")]
    public async Task<IActionResult> UpdatePhaseProgress(Guid id, Guid phaseId, [FromBody] UpdatePhaseProgressRequest request)
    {
        var command = new UpdatePhaseProgressCommand(id, phaseId, request.CompletionPercentage, request.Status);
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(new { success = true }) : BadRequest(new { error = result.Error.Description });
    }

    [HttpPost("{id}/expenses")]
    public async Task<IActionResult> AddExpense(Guid id, [FromBody] AddExpenseRequest request)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(request.CompanyId);
        var command = new AddProjectExpenseCommand(
            CompanyId: effectiveCompanyId,
            ProjectId: id,
            PhaseId: request.PhaseId,
            ExpenseDate: request.ExpenseDate,
            Category: request.Category,
            Amount: request.Amount,
            Description: request.Description,
            SupplierOrWorkerName: request.SupplierOrWorkerName,
            ReferenceType: request.ReferenceType,
            ReferenceNumber: request.ReferenceNumber,
            ReferenceId: request.ReferenceId,
            Notes: request.Notes);

        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error.Description });
    }
}

public record CreateProjectRequest(
    Guid? CompanyId,
    string NameAr,
    string? NameEn,
    Guid CustomerId,
    string CustomerName,
    decimal ContractAmount,
    decimal EstimatedCost,
    DateTime StartDate,
    DateTime ExpectedEndDate,
    string ContractNumber,
    DateTime? ContractDate,
    decimal RetentionPercentage = 10m,
    decimal AdvancePaymentAmount = 0,
    decimal AdvancePaymentDeductionPercentage = 10m,
    Guid? CostCenterId = null,
    string? CostCenterName = null,
    string? ProjectManager = null,
    string? SiteLocation = null,
    string? Notes = null);

public record UpdateProjectRequest(
    string NameAr,
    string? NameEn,
    Guid CustomerId,
    string CustomerName,
    decimal ContractAmount,
    decimal EstimatedCost,
    DateTime StartDate,
    DateTime ExpectedEndDate,
    string ContractNumber,
    DateTime? ContractDate,
    decimal RetentionPercentage,
    decimal AdvancePaymentAmount,
    decimal AdvancePaymentDeductionPercentage,
    Guid? CostCenterId,
    string? CostCenterName,
    string? ProjectManager,
    string? SiteLocation,
    string? Notes);

public record UpdateProjectStatusRequest(ProjectStatus Status, DateTime? ActualEndDate);

public record AddPhaseRequest(
    string NameAr,
    string? NameEn,
    int PhaseOrder,
    DateTime? StartDate,
    DateTime? EndDate,
    decimal EstimatedCost,
    decimal WeightPercentage,
    string? Notes);

public record UpdatePhaseProgressRequest(decimal CompletionPercentage, string? Status);

public record AddExpenseRequest(
    Guid? CompanyId,
    Guid? PhaseId,
    DateTime ExpenseDate,
    ProjectExpenseCategory Category,
    decimal Amount,
    string Description,
    string? SupplierOrWorkerName,
    string? ReferenceType,
    string? ReferenceNumber,
    Guid? ReferenceId,
    string? Notes);
