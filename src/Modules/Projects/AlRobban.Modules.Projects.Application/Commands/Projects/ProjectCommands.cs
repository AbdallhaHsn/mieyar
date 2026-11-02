using AlRobban.Modules.Projects.Application.DTOs;
using AlRobban.Modules.Projects.Domain.Entities;
using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Modules.Projects.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Projects.Application.Commands.Projects;

public record CreateProjectCommand(
    Guid CompanyId,
    string NameAr,
    string? NameEn,
    Guid CustomerId,
    string CustomerName,
    decimal ContractAmount,
    decimal EstimatedCost,
    DateTime StartDate,
    DateTime ExpectedEndDate,
    string ContractNumber,
    DateTime? ContractDate = null,
    decimal RetentionPercentage = 10m,
    decimal AdvancePaymentAmount = 0,
    decimal AdvancePaymentDeductionPercentage = 10m,
    Guid? CostCenterId = null,
    string? CostCenterName = null,
    string? ProjectManager = null,
    string? SiteLocation = null,
    string? Notes = null) : IRequest<Result<ProjectDto>>;

public class CreateProjectCommandHandler : IRequestHandler<CreateProjectCommand, Result<ProjectDto>>
{
    private readonly IProjectRepository _projectRepository;

    public CreateProjectCommandHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<Result<ProjectDto>> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.NameAr))
            return Result.Failure<ProjectDto>(new Error("Project.EmptyName", "اسم المشروع باللغة العربية مطلوب"));

        if (request.CustomerId == Guid.Empty)
            return Result.Failure<ProjectDto>(new Error("Project.InvalidCustomer", "يجب تحديد العميل / جهة التعامل للمشروع"));

        var code = await _projectRepository.GenerateNextProjectCodeAsync(request.CompanyId, cancellationToken);

        var project = new Project(
            id: Guid.NewGuid(),
            companyId: request.CompanyId,
            code: code,
            nameAr: request.NameAr.Trim(),
            nameEn: string.IsNullOrWhiteSpace(request.NameEn) ? request.NameAr.Trim() : request.NameEn.Trim(),
            customerId: request.CustomerId,
            customerName: request.CustomerName,
            contractAmount: request.ContractAmount,
            estimatedCost: request.EstimatedCost,
            startDate: request.StartDate,
            expectedEndDate: request.ExpectedEndDate,
            contractNumber: string.IsNullOrWhiteSpace(request.ContractNumber) ? code : request.ContractNumber.Trim(),
            contractDate: request.ContractDate,
            retentionPercentage: request.RetentionPercentage,
            advancePaymentAmount: request.AdvancePaymentAmount,
            advancePaymentDeductionPercentage: request.AdvancePaymentDeductionPercentage,
            costCenterId: request.CostCenterId,
            costCenterName: request.CostCenterName,
            projectManager: request.ProjectManager,
            siteLocation: request.SiteLocation,
            notes: request.Notes);

        await _projectRepository.AddAsync(project, cancellationToken);

        return Result.Success(new ProjectDto
        {
            Id = project.Id,
            CompanyId = project.CompanyId,
            Code = project.Code,
            NameAr = project.NameAr,
            NameEn = project.NameEn,
            CustomerId = project.CustomerId,
            CustomerName = project.CustomerName,
            CostCenterId = project.CostCenterId,
            CostCenterName = project.CostCenterName,
            ContractNumber = project.ContractNumber,
            ContractDate = project.ContractDate,
            StartDate = project.StartDate,
            ExpectedEndDate = project.ExpectedEndDate,
            ContractAmount = project.ContractAmount,
            VatRate = project.VatRate,
            TotalContractWithVat = project.TotalContractWithVat,
            EstimatedCost = project.EstimatedCost,
            RetentionPercentage = project.RetentionPercentage,
            AdvancePaymentAmount = project.AdvancePaymentAmount,
            AdvancePaymentDeductionPercentage = project.AdvancePaymentDeductionPercentage,
            Status = project.Status,
            StatusText = "قيد التنفيذ",
            CompletionPercentage = project.CompletionPercentage,
            ProjectManager = project.ProjectManager,
            SiteLocation = project.SiteLocation,
            Notes = project.Notes
        });
    }
}

public record UpdateProjectCommand(
    Guid Id,
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
    string? Notes) : IRequest<Result>;

public class UpdateProjectCommandHandler : IRequestHandler<UpdateProjectCommand, Result>
{
    private readonly IProjectRepository _projectRepository;

    public UpdateProjectCommandHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<Result> Handle(UpdateProjectCommand request, CancellationToken cancellationToken)
    {
        var project = await _projectRepository.GetByIdAsync(request.Id, cancellationToken);
        if (project is null)
            return Result.Failure(new Error("Project.NotFound", "المشروع غير موجود"));

        project.UpdateDetails(
            nameAr: request.NameAr.Trim(),
            nameEn: string.IsNullOrWhiteSpace(request.NameEn) ? request.NameAr.Trim() : request.NameEn.Trim(),
            customerId: request.CustomerId,
            customerName: request.CustomerName,
            contractAmount: request.ContractAmount,
            estimatedCost: request.EstimatedCost,
            startDate: request.StartDate,
            expectedEndDate: request.ExpectedEndDate,
            contractNumber: request.ContractNumber,
            contractDate: request.ContractDate,
            retentionPercentage: request.RetentionPercentage,
            advancePaymentAmount: request.AdvancePaymentAmount,
            advancePaymentDeductionPercentage: request.AdvancePaymentDeductionPercentage,
            costCenterId: request.CostCenterId,
            costCenterName: request.CostCenterName,
            projectManager: request.ProjectManager,
            siteLocation: request.SiteLocation,
            notes: request.Notes);

        await _projectRepository.UpdateAsync(project, cancellationToken);
        return Result.Success();
    }
}

public record UpdateProjectStatusCommand(Guid Id, ProjectStatus Status, DateTime? ActualEndDate = null) : IRequest<Result>;

public class UpdateProjectStatusCommandHandler : IRequestHandler<UpdateProjectStatusCommand, Result>
{
    private readonly IProjectRepository _projectRepository;

    public UpdateProjectStatusCommandHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<Result> Handle(UpdateProjectStatusCommand request, CancellationToken cancellationToken)
    {
        var project = await _projectRepository.GetByIdAsync(request.Id, cancellationToken);
        if (project is null)
            return Result.Failure(new Error("Project.NotFound", "المشروع غير موجود"));

        project.UpdateStatus(request.Status, request.ActualEndDate);
        await _projectRepository.UpdateAsync(project, cancellationToken);
        return Result.Success();
    }
}

public record AddProjectPhaseCommand(
    Guid ProjectId,
    string NameAr,
    string? NameEn,
    int PhaseOrder,
    DateTime? StartDate,
    DateTime? EndDate,
    decimal EstimatedCost,
    decimal WeightPercentage,
    string? Notes = null) : IRequest<Result<ProjectPhaseDto>>;

public class AddProjectPhaseCommandHandler : IRequestHandler<AddProjectPhaseCommand, Result<ProjectPhaseDto>>
{
    private readonly IProjectRepository _projectRepository;

    public AddProjectPhaseCommandHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<Result<ProjectPhaseDto>> Handle(AddProjectPhaseCommand request, CancellationToken cancellationToken)
    {
        var project = await _projectRepository.GetByIdWithDetailsAsync(request.ProjectId, cancellationToken);
        if (project is null)
            return Result.Failure<ProjectPhaseDto>(new Error("Project.NotFound", "المشروع غير موجود"));

        var phase = new ProjectPhase(
            id: Guid.NewGuid(),
            projectId: request.ProjectId,
            nameAr: request.NameAr.Trim(),
            nameEn: string.IsNullOrWhiteSpace(request.NameEn) ? request.NameAr.Trim() : request.NameEn.Trim(),
            phaseOrder: request.PhaseOrder,
            startDate: request.StartDate,
            endDate: request.EndDate,
            estimatedCost: request.EstimatedCost,
            weightPercentage: request.WeightPercentage,
            notes: request.Notes);

        project.AddPhase(phase);
        await _projectRepository.UpdateAsync(project, cancellationToken);

        return Result.Success(new ProjectPhaseDto
        {
            Id = phase.Id,
            ProjectId = phase.ProjectId,
            NameAr = phase.NameAr,
            NameEn = phase.NameEn,
            PhaseOrder = phase.PhaseOrder,
            StartDate = phase.StartDate,
            EndDate = phase.EndDate,
            EstimatedCost = phase.EstimatedCost,
            WeightPercentage = phase.WeightPercentage,
            CompletionPercentage = phase.CompletionPercentage,
            Status = phase.Status,
            Notes = phase.Notes
        });
    }
}

public record UpdatePhaseProgressCommand(
    Guid ProjectId,
    Guid PhaseId,
    decimal CompletionPercentage,
    string? Status = null) : IRequest<Result>;

public class UpdatePhaseProgressCommandHandler : IRequestHandler<UpdatePhaseProgressCommand, Result>
{
    private readonly IProjectRepository _projectRepository;

    public UpdatePhaseProgressCommandHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<Result> Handle(UpdatePhaseProgressCommand request, CancellationToken cancellationToken)
    {
        var project = await _projectRepository.GetByIdWithDetailsAsync(request.ProjectId, cancellationToken);
        if (project is null)
            return Result.Failure(new Error("Project.NotFound", "المشروع غير موجود"));

        var phase = project.Phases.FirstOrDefault(p => p.Id == request.PhaseId);
        if (phase is null)
            return Result.Failure(new Error("Phase.NotFound", "المرحلة غير موجودة"));

        phase.UpdateProgress(request.CompletionPercentage, request.Status);
        project.RecalculateProgressFromPhases();
        await _projectRepository.UpdateAsync(project, cancellationToken);

        return Result.Success();
    }
}

public record AddProjectExpenseCommand(
    Guid CompanyId,
    Guid ProjectId,
    Guid? PhaseId,
    DateTime ExpenseDate,
    ProjectExpenseCategory Category,
    decimal Amount,
    string Description,
    string? SupplierOrWorkerName = null,
    string? ReferenceType = null,
    string? ReferenceNumber = null,
    Guid? ReferenceId = null,
    string? Notes = null) : IRequest<Result<ProjectExpenseDto>>;

public class AddProjectExpenseCommandHandler : IRequestHandler<AddProjectExpenseCommand, Result<ProjectExpenseDto>>
{
    private readonly IProjectRepository _projectRepository;

    public AddProjectExpenseCommandHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<Result<ProjectExpenseDto>> Handle(AddProjectExpenseCommand request, CancellationToken cancellationToken)
    {
        var project = await _projectRepository.GetByIdWithDetailsAsync(request.ProjectId, cancellationToken);
        if (project is null)
            return Result.Failure<ProjectExpenseDto>(new Error("Project.NotFound", "المشروع غير موجود"));

        var expense = new ProjectExpense(
            id: Guid.NewGuid(),
            companyId: request.CompanyId,
            projectId: request.ProjectId,
            phaseId: request.PhaseId,
            expenseDate: request.ExpenseDate,
            category: request.Category,
            amount: request.Amount,
            description: request.Description,
            supplierOrWorkerName: request.SupplierOrWorkerName,
            referenceType: request.ReferenceType,
            referenceNumber: request.ReferenceNumber,
            referenceId: request.ReferenceId,
            notes: request.Notes);

        project.AddExpense(expense);
        await _projectRepository.UpdateAsync(project, cancellationToken);

        return Result.Success(new ProjectExpenseDto
        {
            Id = expense.Id,
            CompanyId = expense.CompanyId,
            ProjectId = expense.ProjectId,
            PhaseId = expense.PhaseId,
            ExpenseDate = expense.ExpenseDate,
            Category = expense.Category,
            CategoryText = expense.Category.ToString(),
            Amount = expense.Amount,
            Description = expense.Description,
            SupplierOrWorkerName = expense.SupplierOrWorkerName,
            ReferenceType = expense.ReferenceType,
            ReferenceNumber = expense.ReferenceNumber,
            ReferenceId = expense.ReferenceId,
            Notes = expense.Notes
        });
    }
}
