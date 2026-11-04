using AlRobban.WebAPI.Security;
using AlRobban.Modules.Projects.Application.Commands.Projects;
using AlRobban.Modules.Projects.Application.Queries.Projects;
using AlRobban.Modules.Projects.Domain.Entities;
using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Modules.Projects.Infrastructure.Persistence;
using AlRobban.Shared.Application.Abstractions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize(Roles = AppRoles.BackOffice)]
public class ProjectsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;
    private readonly ProjectsDbContext _projectsDb;

    public ProjectsController(IMediator mediator, ICurrentTenantContext tenantContext, ProjectsDbContext projectsDb)
    {
        _mediator = mediator;
        _tenantContext = tenantContext;
        _projectsDb = projectsDb;
    }

    private Guid GetEffectiveCompanyId(Guid? companyId)
    {
        if (companyId.HasValue && companyId.Value != Guid.Empty) return companyId.Value;
        return _tenantContext.TenantId.GetValueOrDefault() != Guid.Empty
            ? _tenantContext.TenantId.Value
            : Guid.Parse("11111111-2222-3333-4444-555555555555");
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

    // =========================================================================
    // Project Planning & Gantt Timeline Endpoints
    // =========================================================================
    [HttpGet("planning")]
    public async Task<IActionResult> GetPlanningTasks([FromQuery] Guid? projectId, [FromQuery] Guid? companyId, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        var query = _projectsDb.ProjectPlanningTasks.AsNoTracking()
            .Where(t => t.CompanyId == effectiveCompanyId);

        if (projectId.HasValue && projectId.Value != Guid.Empty)
        {
            query = query.Where(t => t.ProjectId == projectId.Value);
        }

        var list = await query.OrderBy(t => t.StartDate).ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost("planning")]
    public async Task<IActionResult> SavePlanningTask([FromBody] SavePlanningTaskRequest req, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(req.CompanyId);
        Guid.TryParse(req.Id, out var parsedId);

        var existing = parsedId != Guid.Empty
            ? await _projectsDb.ProjectPlanningTasks.FirstOrDefaultAsync(t => t.Id == parsedId && t.CompanyId == effectiveCompanyId, ct)
            : null;

        int duration = req.DurationDays > 0 ? req.DurationDays : 30;
        if (DateTime.TryParse(req.StartDate, out var start) && DateTime.TryParse(req.EndDate, out var end))
        {
            duration = Math.Max(1, (int)Math.Round((end - start).TotalDays));
        }

        var status = !string.IsNullOrWhiteSpace(req.Status)
            ? req.Status
            : (req.ProgressPercentage >= 100 ? "Completed" : req.ProgressPercentage > 0 ? "InProgress" : "Planned");

        if (existing != null)
        {
            existing.ProjectId = req.ProjectId;
            existing.ProjectName = req.ProjectName ?? string.Empty;
            existing.ProjectCode = req.ProjectCode ?? string.Empty;
            existing.PhaseId = req.PhaseId;
            existing.TitleAr = req.TitleAr;
            existing.TitleEn = string.IsNullOrWhiteSpace(req.TitleEn) ? req.TitleAr : req.TitleEn;
            existing.StartDate = req.StartDate;
            existing.EndDate = req.EndDate;
            existing.DurationDays = duration;
            existing.ProgressPercentage = req.ProgressPercentage;
            existing.AssignedTo = req.AssignedTo ?? string.Empty;
            existing.AssignedRole = req.AssignedRole ?? string.Empty;
            existing.IsMilestone = req.IsMilestone;
            existing.Status = status;
            existing.PredecessorId = req.PredecessorId;
            existing.EstimatedCost = req.EstimatedCost;
            existing.Notes = req.Notes;

            await _projectsDb.SaveChangesAsync(ct);
            return Ok(existing);
        }

        var created = new ProjectPlanningTask(parsedId != Guid.Empty ? parsedId : Guid.NewGuid())
        {
            CompanyId = effectiveCompanyId,
            ProjectId = req.ProjectId,
            ProjectName = req.ProjectName ?? string.Empty,
            ProjectCode = req.ProjectCode ?? string.Empty,
            PhaseId = req.PhaseId,
            TitleAr = req.TitleAr,
            TitleEn = string.IsNullOrWhiteSpace(req.TitleEn) ? req.TitleAr : req.TitleEn,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            DurationDays = duration,
            ProgressPercentage = req.ProgressPercentage,
            AssignedTo = req.AssignedTo ?? string.Empty,
            AssignedRole = req.AssignedRole ?? string.Empty,
            IsMilestone = req.IsMilestone,
            Status = status,
            PredecessorId = req.PredecessorId,
            EstimatedCost = req.EstimatedCost,
            Notes = req.Notes
        };

        await _projectsDb.ProjectPlanningTasks.AddAsync(created, ct);
        await _projectsDb.SaveChangesAsync(ct);
        return Ok(created);
    }

    [HttpPut("planning/{taskId:guid}/progress")]
    public async Task<IActionResult> UpdatePlanningTaskProgress(Guid taskId, [FromBody] UpdateTaskProgressDto dto, CancellationToken ct)
    {
        var task = await _projectsDb.ProjectPlanningTasks.FirstOrDefaultAsync(t => t.Id == taskId, ct);
        if (task == null) return NotFound();

        task.ProgressPercentage = Math.Clamp(dto.ProgressPercentage, 0m, 100m);
        task.Status = task.ProgressPercentage >= 100m ? "Completed" : task.ProgressPercentage > 0m ? "InProgress" : "Planned";
        await _projectsDb.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    [HttpDelete("planning/{taskId:guid}")]
    public async Task<IActionResult> DeletePlanningTask(Guid taskId, CancellationToken ct)
    {
        var task = await _projectsDb.ProjectPlanningTasks.FirstOrDefaultAsync(t => t.Id == taskId, ct);
        if (task != null)
        {
            _projectsDb.ProjectPlanningTasks.Remove(task);
            await _projectsDb.SaveChangesAsync(ct);
        }
        return Ok(new { success = true });
    }

    // =========================================================================
    // Project Timesheets & Subcontractor Work Logs Endpoints
    // =========================================================================
    [HttpGet("timesheets")]
    public async Task<IActionResult> GetTimesheets([FromQuery] Guid? projectId, [FromQuery] Guid? companyId, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        var query = _projectsDb.ProjectTimesheets.AsNoTracking()
            .Where(t => t.CompanyId == effectiveCompanyId);

        if (projectId.HasValue && projectId.Value != Guid.Empty)
        {
            query = query.Where(t => t.ProjectId == projectId.Value);
        }

        var list = await query.OrderByDescending(t => t.Date).ThenByDescending(t => t.CreatedAtUtc).ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost("timesheets")]
    public async Task<IActionResult> AddTimesheet([FromBody] SaveTimesheetRequest req, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(req.CompanyId);
        var unit = string.IsNullOrWhiteSpace(req.UnitOfMeasure) ? "hour" : req.UnitOfMeasure;
        var qty = req.Quantity > 0 ? req.Quantity : req.Hours;
        var price = req.UnitPrice > 0 ? req.UnitPrice : req.HourlyRate;
        var totalCost = qty * price;
        var retentionAmount = totalCost * (req.RetentionPercentage / 100m);
        var netPayable = totalCost - retentionAmount;

        var entry = new ProjectTimesheet(Guid.NewGuid())
        {
            CompanyId = effectiveCompanyId,
            ProjectId = req.ProjectId,
            ProjectName = req.ProjectName ?? string.Empty,
            ProjectCode = req.ProjectCode ?? string.Empty,
            PhaseId = req.PhaseId,
            PhaseName = req.PhaseName,
            Date = string.IsNullOrWhiteSpace(req.Date) ? DateTime.UtcNow.ToString("yyyy-MM-dd") : req.Date,
            EntryType = string.IsNullOrWhiteSpace(req.EntryType) ? "internal_labor" : req.EntryType,
            UnitOfMeasure = unit,
            Quantity = qty,
            UnitPrice = price,
            EmployeeName = req.EmployeeName ?? string.Empty,
            EmployeeRole = req.EmployeeRole ?? string.Empty,
            SubcontractorName = req.SubcontractorName,
            SubcontractorContractNo = req.SubcontractorContractNo,
            RetentionPercentage = req.RetentionPercentage,
            RetentionAmount = retentionAmount,
            NetPayable = netPayable,
            TaskDescription = req.TaskDescription ?? string.Empty,
            Hours = unit == "hour" ? qty : req.Hours,
            HourlyRate = unit == "hour" ? price : req.HourlyRate,
            TotalCost = totalCost,
            IsBillable = req.IsBillable,
            Status = string.IsNullOrWhiteSpace(req.Status) ? "Approved" : req.Status,
            Notes = req.Notes
        };

        await _projectsDb.ProjectTimesheets.AddAsync(entry, ct);
        await _projectsDb.SaveChangesAsync(ct);
        return Ok(entry);
    }

    [HttpDelete("timesheets/{timesheetId:guid}")]
    public async Task<IActionResult> DeleteTimesheet(Guid timesheetId, CancellationToken ct)
    {
        var item = await _projectsDb.ProjectTimesheets.FirstOrDefaultAsync(t => t.Id == timesheetId, ct);
        if (item != null)
        {
            _projectsDb.ProjectTimesheets.Remove(item);
            await _projectsDb.SaveChangesAsync(ct);
        }
        return Ok(new { success = true });
    }

    // =========================================================================
    // Project Accounting Settings Endpoints
    // =========================================================================
    [HttpGet("settings")]
    public async Task<IActionResult> GetProjectSettings([FromQuery] Guid? companyId, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        var settings = await _projectsDb.ProjectAccountingSettings
            .FirstOrDefaultAsync(s => s.CompanyId == effectiveCompanyId, ct);

        if (settings == null)
        {
            settings = new ProjectAccountingSetting(Guid.NewGuid())
            {
                CompanyId = effectiveCompanyId
            };
            await _projectsDb.ProjectAccountingSettings.AddAsync(settings, ct);
            await _projectsDb.SaveChangesAsync(ct);
        }

        return Ok(settings);
    }

    [HttpPost("settings")]
    public async Task<IActionResult> SaveProjectSettings([FromBody] ProjectAccountingSetting input, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(input.CompanyId != Guid.Empty ? input.CompanyId : null);
        var existing = await _projectsDb.ProjectAccountingSettings
            .FirstOrDefaultAsync(s => s.CompanyId == effectiveCompanyId, ct);

        if (existing == null)
        {
            input.CompanyId = effectiveCompanyId;
            input.UpdatedAtUtc = DateTime.UtcNow;
            await _projectsDb.ProjectAccountingSettings.AddAsync(input, ct);
            await _projectsDb.SaveChangesAsync(ct);
            return Ok(input);
        }

        existing.DefaultRetentionPercentage = input.DefaultRetentionPercentage;
        existing.DefaultAdvancePaymentPercentage = input.DefaultAdvancePaymentPercentage;
        existing.DefaultVatRate = input.DefaultVatRate;
        existing.RequireConsultantApproval = input.RequireConsultantApproval;
        existing.AutoPostProgressBillingToGl = input.AutoPostProgressBillingToGl;
        existing.AutoIssueTaxInvoiceOnApprove = input.AutoIssueTaxInvoiceOnApprove;
        existing.AutoCreateProjectCostCenter = input.AutoCreateProjectCostCenter;
        existing.AlertGuaranteeExpiryDays = input.AlertGuaranteeExpiryDays;
        existing.ArAccountCode = input.ArAccountCode;
        existing.ArAccountName = input.ArAccountName;
        existing.RetentionAccountCode = input.RetentionAccountCode;
        existing.RetentionAccountName = input.RetentionAccountName;
        existing.AdvancePaymentAccountCode = input.AdvancePaymentAccountCode;
        existing.AdvancePaymentAccountName = input.AdvancePaymentAccountName;
        existing.RevenueAccountCode = input.RevenueAccountCode;
        existing.RevenueAccountName = input.RevenueAccountName;
        existing.VatAccountCode = input.VatAccountCode;
        existing.VatAccountName = input.VatAccountName;
        existing.GuaranteeMarginAccountCode = input.GuaranteeMarginAccountCode;
        existing.GuaranteeMarginAccountName = input.GuaranteeMarginAccountName;
        existing.GuaranteeCommissionAccountCode = input.GuaranteeCommissionAccountCode;
        existing.GuaranteeCommissionAccountName = input.GuaranteeCommissionAccountName;
        existing.UpdatedAtUtc = DateTime.UtcNow;

        await _projectsDb.SaveChangesAsync(ct);
        return Ok(existing);
    }
}

public record SavePlanningTaskRequest(
    string? Id,
    Guid? CompanyId,
    Guid ProjectId,
    string? ProjectName,
    string? ProjectCode,
    Guid? PhaseId,
    string TitleAr,
    string? TitleEn,
    string StartDate,
    string EndDate,
    int DurationDays,
    decimal ProgressPercentage,
    string? AssignedTo,
    string? AssignedRole,
    bool IsMilestone,
    string? Status,
    string? PredecessorId,
    decimal EstimatedCost,
    string? Notes);

public record UpdateTaskProgressDto(decimal ProgressPercentage);

public record SaveTimesheetRequest(
    Guid? CompanyId,
    Guid ProjectId,
    string? ProjectName,
    string? ProjectCode,
    Guid? PhaseId,
    string? PhaseName,
    string? Date,
    string? EntryType,
    string? UnitOfMeasure,
    decimal Quantity,
    decimal UnitPrice,
    string? EmployeeName,
    string? EmployeeRole,
    string? SubcontractorName,
    string? SubcontractorContractNo,
    decimal RetentionPercentage,
    string? TaskDescription,
    decimal Hours,
    decimal HourlyRate,
    bool IsBillable = true,
    string? Status = "Approved",
    string? Notes = null);

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
