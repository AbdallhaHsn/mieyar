using AlRobban.Modules.Projects.Application.DTOs;
using AlRobban.Modules.Projects.Domain.Entities;
using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Modules.Projects.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Projects.Application.Queries.Projects;

public record GetProjectsSummaryMetricsQuery(Guid CompanyId) : IRequest<Result<ProjectsSummaryMetricsDto>>;

public class GetProjectsSummaryMetricsQueryHandler : IRequestHandler<GetProjectsSummaryMetricsQuery, Result<ProjectsSummaryMetricsDto>>
{
    private readonly IProjectRepository _projectRepo;
    private readonly IProgressBillingRepository _billingRepo;
    private readonly ILetterOfGuaranteeRepository _guaranteeRepo;

    public GetProjectsSummaryMetricsQueryHandler(
        IProjectRepository projectRepo,
        IProgressBillingRepository billingRepo,
        ILetterOfGuaranteeRepository guaranteeRepo)
    {
        _projectRepo = projectRepo;
        _billingRepo = billingRepo;
        _guaranteeRepo = guaranteeRepo;
    }

    public async Task<Result<ProjectsSummaryMetricsDto>> Handle(GetProjectsSummaryMetricsQuery request, CancellationToken cancellationToken)
    {
        var projects = await _projectRepo.GetListAsync(request.CompanyId, null, cancellationToken);
        var billings = await _billingRepo.GetListAsync(request.CompanyId, cancellationToken);
        var guarantees = await _guaranteeRepo.GetListAsync(request.CompanyId, cancellationToken);

        var totalProjects = projects.Count;
        var activeProjects = projects.Count(p => p.Status == ProjectStatus.Active);
        var completedProjects = projects.Count(p => p.Status == ProjectStatus.Completed);

        var totalContractAmount = projects.Sum(p => p.ContractAmount);
        var totalEstimatedCost = projects.Sum(p => p.EstimatedCost);

        var approvedBillings = billings.Where(b => b.Status == BillingStatus.ConsultantApproved || b.Status == BillingStatus.Certified || b.Status == BillingStatus.Invoiced).ToList();
        var totalBilledAmount = approvedBillings.Sum(b => b.NetAmount);
        var totalRetentionHeld = approvedBillings.Sum(b => b.RetentionAmount);

        var totalExpenses = projects.Sum(p => p.Expenses.Sum(e => e.Amount));
        var totalNetProfit = totalBilledAmount - totalExpenses;
        var avgMargin = totalBilledAmount > 0 ? Math.Round((totalNetProfit / totalBilledAmount) * 100m, 2) : 0m;

        var activeGuarantees = guarantees.Where(g => g.Status == GuaranteeStatus.Active || g.Status == GuaranteeStatus.Extended).ToList();
        var totalGuaranteesAmount = activeGuarantees.Sum(g => g.Amount);
        var totalCashMarginHeld = activeGuarantees.Sum(g => g.CashMarginAmount);

        return Result.Success(new ProjectsSummaryMetricsDto
        {
            TotalProjects = totalProjects,
            ActiveProjects = activeProjects,
            CompletedProjects = completedProjects,
            TotalContractAmount = totalContractAmount,
            TotalEstimatedCost = totalEstimatedCost,
            TotalBilledAmount = totalBilledAmount,
            TotalRetentionHeld = totalRetentionHeld,
            TotalExpenses = totalExpenses,
            TotalNetProfit = totalNetProfit,
            AverageProfitMargin = avgMargin,
            ActiveGuaranteesCount = activeGuarantees.Count,
            TotalActiveGuaranteesAmount = totalGuaranteesAmount,
            TotalCashMarginHeldInBanks = totalCashMarginHeld
        });
    }
}

public record GetProjectsListQuery(Guid CompanyId, string? SearchTerm = null) : IRequest<Result<IReadOnlyList<ProjectDto>>>;

public class GetProjectsListQueryHandler : IRequestHandler<GetProjectsListQuery, Result<IReadOnlyList<ProjectDto>>>
{
    private readonly IProjectRepository _projectRepo;

    public GetProjectsListQueryHandler(IProjectRepository projectRepo)
    {
        _projectRepo = projectRepo;
    }

    public async Task<Result<IReadOnlyList<ProjectDto>>> Handle(GetProjectsListQuery request, CancellationToken cancellationToken)
    {
        var projects = await _projectRepo.GetListAsync(request.CompanyId, request.SearchTerm, cancellationToken);
        var dtos = projects.Select(MapToDto).ToList();
        return Result.Success<IReadOnlyList<ProjectDto>>(dtos);
    }

    private static ProjectDto MapToDto(Project p)
    {
        var totalExpenses = p.Expenses.Sum(e => e.Amount);
        var approvedBillings = p.Billings.Where(b => b.Status == BillingStatus.ConsultantApproved || b.Status == BillingStatus.Certified || b.Status == BillingStatus.Invoiced).ToList();
        var totalBilled = approvedBillings.Sum(b => b.NetAmount);
        var profit = totalBilled - totalExpenses;
        var margin = totalBilled > 0 ? Math.Round((profit / totalBilled) * 100m, 2) : 0m;

        return new ProjectDto
        {
            Id = p.Id,
            CompanyId = p.CompanyId,
            Code = p.Code,
            NameAr = p.NameAr,
            NameEn = p.NameEn,
            CustomerId = p.CustomerId,
            CustomerName = p.CustomerName,
            CostCenterId = p.CostCenterId,
            CostCenterName = p.CostCenterName,
            ContractNumber = p.ContractNumber,
            ContractDate = p.ContractDate,
            StartDate = p.StartDate,
            ExpectedEndDate = p.ExpectedEndDate,
            ActualEndDate = p.ActualEndDate,
            ContractAmount = p.ContractAmount,
            VatRate = p.VatRate,
            TotalContractWithVat = p.TotalContractWithVat,
            EstimatedCost = p.EstimatedCost,
            RetentionPercentage = p.RetentionPercentage,
            AdvancePaymentAmount = p.AdvancePaymentAmount,
            AdvancePaymentDeductionPercentage = p.AdvancePaymentDeductionPercentage,
            Status = p.Status,
            StatusText = GetStatusText(p.Status),
            CompletionPercentage = p.CompletionPercentage,
            ProjectManager = p.ProjectManager,
            SiteLocation = p.SiteLocation,
            Notes = p.Notes,
            PhasesCount = p.Phases.Count,
            BillingsCount = p.Billings.Count,
            GuaranteesCount = p.Guarantees.Count,
            TotalBilledAmount = totalBilled,
            TotalExpensesAmount = totalExpenses,
            ProfitabilityAmount = profit,
            ProfitMarginPercentage = margin,
            CostVariance = p.EstimatedCost - totalExpenses,
            RemainingContractAmount = Math.Max(0, p.ContractAmount - totalBilled)
        };
    }

    private static string GetStatusText(ProjectStatus status) => status switch
    {
        ProjectStatus.Planning => "قيد التخطيط",
        ProjectStatus.Active => "قيد التنفيذ",
        ProjectStatus.OnHold => "متوقف مؤقتاً",
        ProjectStatus.Completed => "مكتمل",
        ProjectStatus.Cancelled => "ملغى",
        _ => status.ToString()
    };
}

public record GetProjectDetailsQuery(Guid Id) : IRequest<Result<ProjectDetailsDto>>;

public class GetProjectDetailsQueryHandler : IRequestHandler<GetProjectDetailsQuery, Result<ProjectDetailsDto>>
{
    private readonly IProjectRepository _projectRepo;

    public GetProjectDetailsQueryHandler(IProjectRepository projectRepo)
    {
        _projectRepo = projectRepo;
    }

    public async Task<Result<ProjectDetailsDto>> Handle(GetProjectDetailsQuery request, CancellationToken cancellationToken)
    {
        var p = await _projectRepo.GetByIdWithDetailsAsync(request.Id, cancellationToken);
        if (p is null)
            return Result.Failure<ProjectDetailsDto>(new Error("Project.NotFound", "المشروع غير موجود"));

        var totalExpenses = p.Expenses.Sum(e => e.Amount);
        var approvedBillings = p.Billings.Where(b => b.Status == BillingStatus.ConsultantApproved || b.Status == BillingStatus.Certified || b.Status == BillingStatus.Invoiced).ToList();
        var totalBilled = approvedBillings.Sum(b => b.NetAmount);
        var profit = totalBilled - totalExpenses;
        var margin = totalBilled > 0 ? Math.Round((profit / totalBilled) * 100m, 2) : 0m;

        var dto = new ProjectDetailsDto
        {
            Id = p.Id,
            CompanyId = p.CompanyId,
            Code = p.Code,
            NameAr = p.NameAr,
            NameEn = p.NameEn,
            CustomerId = p.CustomerId,
            CustomerName = p.CustomerName,
            CostCenterId = p.CostCenterId,
            CostCenterName = p.CostCenterName,
            ContractNumber = p.ContractNumber,
            ContractDate = p.ContractDate,
            StartDate = p.StartDate,
            ExpectedEndDate = p.ExpectedEndDate,
            ActualEndDate = p.ActualEndDate,
            ContractAmount = p.ContractAmount,
            VatRate = p.VatRate,
            TotalContractWithVat = p.TotalContractWithVat,
            EstimatedCost = p.EstimatedCost,
            RetentionPercentage = p.RetentionPercentage,
            AdvancePaymentAmount = p.AdvancePaymentAmount,
            AdvancePaymentDeductionPercentage = p.AdvancePaymentDeductionPercentage,
            Status = p.Status,
            StatusText = p.Status.ToString(),
            CompletionPercentage = p.CompletionPercentage,
            ProjectManager = p.ProjectManager,
            SiteLocation = p.SiteLocation,
            Notes = p.Notes,
            PhasesCount = p.Phases.Count,
            BillingsCount = p.Billings.Count,
            GuaranteesCount = p.Guarantees.Count,
            TotalBilledAmount = totalBilled,
            TotalExpensesAmount = totalExpenses,
            ProfitabilityAmount = profit,
            ProfitMarginPercentage = margin,
            CostVariance = p.EstimatedCost - totalExpenses,
            RemainingContractAmount = Math.Max(0, p.ContractAmount - totalBilled),

            Phases = p.Phases.OrderBy(ph => ph.PhaseOrder).Select(ph => new ProjectPhaseDto
            {
                Id = ph.Id,
                ProjectId = ph.ProjectId,
                NameAr = ph.NameAr,
                NameEn = ph.NameEn,
                PhaseOrder = ph.PhaseOrder,
                StartDate = ph.StartDate,
                EndDate = ph.EndDate,
                EstimatedCost = ph.EstimatedCost,
                WeightPercentage = ph.WeightPercentage,
                CompletionPercentage = ph.CompletionPercentage,
                Status = ph.Status,
                Notes = ph.Notes
            }).ToList(),

            Billings = p.Billings.OrderByDescending(b => b.BillingSequence).Select(b => new ContractProgressBillingDto
            {
                Id = b.Id,
                CompanyId = b.CompanyId,
                ProjectId = b.ProjectId,
                ProjectName = p.NameAr,
                ProjectCode = p.Code,
                BillingNumber = b.BillingNumber,
                BillingSequence = b.BillingSequence,
                BillingDate = b.BillingDate,
                PeriodStart = b.PeriodStart,
                PeriodEnd = b.PeriodEnd,
                PreviousWorkAmount = b.PreviousWorkAmount,
                CurrentWorkAmount = b.CurrentWorkAmount,
                TotalWorkAmount = b.TotalWorkAmount,
                RetentionPercentage = b.RetentionPercentage,
                RetentionAmount = b.RetentionAmount,
                AdvancePaymentDeduction = b.AdvancePaymentDeduction,
                OtherDeductions = b.OtherDeductions,
                DeductionsNotes = b.DeductionsNotes,
                NetAmount = b.NetAmount,
                VatRate = b.VatRate,
                VatAmount = b.VatAmount,
                TotalWithVat = b.TotalWithVat,
                Status = b.Status,
                StatusText = b.Status.ToString(),
                ConsultantName = b.ConsultantName,
                ConsultantApprovalDate = b.ConsultantApprovalDate,
                ConsultantNotes = b.ConsultantNotes,
                AssociatedInvoiceId = b.AssociatedInvoiceId,
                AssociatedInvoiceNumber = b.AssociatedInvoiceNumber,
                AssociatedJournalEntryId = b.AssociatedJournalEntryId,
                AssociatedJournalEntryNumber = b.AssociatedJournalEntryNumber
            }).ToList(),

            Guarantees = p.Guarantees.OrderByDescending(g => g.IssueDate).Select(g => new LetterOfGuaranteeDto
            {
                Id = g.Id,
                CompanyId = g.CompanyId,
                ProjectId = g.ProjectId,
                ProjectName = p.NameAr,
                ProjectCode = p.Code,
                GuaranteeNumber = g.GuaranteeNumber,
                Type = g.Type,
                TypeText = g.Type.ToString(),
                IssuingBank = g.IssuingBank,
                BankBranch = g.BankBranch,
                BankAccountNumber = g.BankAccountNumber,
                BeneficiaryName = g.BeneficiaryName,
                Amount = g.Amount,
                CashMarginPercentage = g.CashMarginPercentage,
                CashMarginAmount = g.CashMarginAmount,
                BankCommission = g.BankCommission,
                IssueDate = g.IssueDate,
                ExpiryDate = g.ExpiryDate,
                Status = g.Status,
                StatusText = g.Status.ToString(),
                AssociatedJournalEntryId = g.AssociatedJournalEntryId,
                AssociatedJournalEntryNumber = g.AssociatedJournalEntryNumber,
                Notes = g.Notes
            }).ToList(),

            Expenses = p.Expenses.OrderByDescending(e => e.ExpenseDate).Select(e => new ProjectExpenseDto
            {
                Id = e.Id,
                CompanyId = e.CompanyId,
                ProjectId = e.ProjectId,
                PhaseId = e.PhaseId,
                PhaseName = p.Phases.FirstOrDefault(ph => ph.Id == e.PhaseId)?.NameAr,
                ExpenseDate = e.ExpenseDate,
                Category = e.Category,
                CategoryText = e.Category.ToString(),
                Amount = e.Amount,
                Description = e.Description,
                SupplierOrWorkerName = e.SupplierOrWorkerName,
                ReferenceType = e.ReferenceType,
                ReferenceNumber = e.ReferenceNumber,
                ReferenceId = e.ReferenceId,
                Notes = e.Notes
            }).ToList()
        };

        return Result.Success(dto);
    }
}

public record GetProgressBillingsQuery(Guid CompanyId, Guid? ProjectId = null) : IRequest<Result<IReadOnlyList<ContractProgressBillingDto>>>;

public class GetProgressBillingsQueryHandler : IRequestHandler<GetProgressBillingsQuery, Result<IReadOnlyList<ContractProgressBillingDto>>>
{
    private readonly IProgressBillingRepository _billingRepo;
    private readonly IProjectRepository _projectRepo;

    public GetProgressBillingsQueryHandler(
        IProgressBillingRepository billingRepo,
        IProjectRepository projectRepo)
    {
        _billingRepo = billingRepo;
        _projectRepo = projectRepo;
    }

    public async Task<Result<IReadOnlyList<ContractProgressBillingDto>>> Handle(GetProgressBillingsQuery request, CancellationToken cancellationToken)
    {
        IReadOnlyList<ContractProgressBilling> billings = request.ProjectId.HasValue
            ? await _billingRepo.GetByProjectIdAsync(request.ProjectId.Value, cancellationToken)
            : await _billingRepo.GetListAsync(request.CompanyId, cancellationToken);

        var projects = await _projectRepo.GetListAsync(request.CompanyId, null, cancellationToken);
        var projectMap = projects.ToDictionary(p => p.Id, p => p);

        var dtos = billings.Select(b =>
        {
            projectMap.TryGetValue(b.ProjectId, out var project);
            return new ContractProgressBillingDto
            {
                Id = b.Id,
                CompanyId = b.CompanyId,
                ProjectId = b.ProjectId,
                ProjectName = project?.NameAr ?? string.Empty,
                ProjectCode = project?.Code ?? string.Empty,
                BillingNumber = b.BillingNumber,
                BillingSequence = b.BillingSequence,
                BillingDate = b.BillingDate,
                PeriodStart = b.PeriodStart,
                PeriodEnd = b.PeriodEnd,
                PreviousWorkAmount = b.PreviousWorkAmount,
                CurrentWorkAmount = b.CurrentWorkAmount,
                TotalWorkAmount = b.TotalWorkAmount,
                RetentionPercentage = b.RetentionPercentage,
                RetentionAmount = b.RetentionAmount,
                AdvancePaymentDeduction = b.AdvancePaymentDeduction,
                OtherDeductions = b.OtherDeductions,
                DeductionsNotes = b.DeductionsNotes,
                NetAmount = b.NetAmount,
                VatRate = b.VatRate,
                VatAmount = b.VatAmount,
                TotalWithVat = b.TotalWithVat,
                Status = b.Status,
                StatusText = b.Status.ToString(),
                ConsultantName = b.ConsultantName,
                ConsultantApprovalDate = b.ConsultantApprovalDate,
                ConsultantNotes = b.ConsultantNotes,
                AssociatedInvoiceId = b.AssociatedInvoiceId,
                AssociatedInvoiceNumber = b.AssociatedInvoiceNumber,
                AssociatedJournalEntryId = b.AssociatedJournalEntryId,
                AssociatedJournalEntryNumber = b.AssociatedJournalEntryNumber
            };
        }).OrderByDescending(x => x.BillingDate).ToList();

        return Result.Success<IReadOnlyList<ContractProgressBillingDto>>(dtos);
    }
}

public record GetLettersOfGuaranteeQuery(Guid CompanyId, Guid? ProjectId = null) : IRequest<Result<IReadOnlyList<LetterOfGuaranteeDto>>>;

public class GetLettersOfGuaranteeQueryHandler : IRequestHandler<GetLettersOfGuaranteeQuery, Result<IReadOnlyList<LetterOfGuaranteeDto>>>
{
    private readonly ILetterOfGuaranteeRepository _guaranteeRepo;
    private readonly IProjectRepository _projectRepo;

    public GetLettersOfGuaranteeQueryHandler(
        ILetterOfGuaranteeRepository guaranteeRepo,
        IProjectRepository projectRepo)
    {
        _guaranteeRepo = guaranteeRepo;
        _projectRepo = projectRepo;
    }

    public async Task<Result<IReadOnlyList<LetterOfGuaranteeDto>>> Handle(GetLettersOfGuaranteeQuery request, CancellationToken cancellationToken)
    {
        IReadOnlyList<LetterOfGuarantee> list = request.ProjectId.HasValue
            ? await _guaranteeRepo.GetByProjectIdAsync(request.ProjectId.Value, cancellationToken)
            : await _guaranteeRepo.GetListAsync(request.CompanyId, cancellationToken);

        var projects = await _projectRepo.GetListAsync(request.CompanyId, null, cancellationToken);
        var projectMap = projects.ToDictionary(p => p.Id, p => p);

        var dtos = list.Select(g =>
        {
            projectMap.TryGetValue(g.ProjectId, out var project);
            return new LetterOfGuaranteeDto
            {
                Id = g.Id,
                CompanyId = g.CompanyId,
                ProjectId = g.ProjectId,
                ProjectName = project?.NameAr ?? string.Empty,
                ProjectCode = project?.Code ?? string.Empty,
                GuaranteeNumber = g.GuaranteeNumber,
                Type = g.Type,
                TypeText = g.Type.ToString(),
                IssuingBank = g.IssuingBank,
                BankBranch = g.BankBranch,
                BankAccountNumber = g.BankAccountNumber,
                BeneficiaryName = g.BeneficiaryName,
                Amount = g.Amount,
                CashMarginPercentage = g.CashMarginPercentage,
                CashMarginAmount = g.CashMarginAmount,
                BankCommission = g.BankCommission,
                IssueDate = g.IssueDate,
                ExpiryDate = g.ExpiryDate,
                Status = g.Status,
                StatusText = g.Status.ToString(),
                AssociatedJournalEntryId = g.AssociatedJournalEntryId,
                AssociatedJournalEntryNumber = g.AssociatedJournalEntryNumber,
                Notes = g.Notes
            };
        }).OrderByDescending(x => x.IssueDate).ToList();

        return Result.Success<IReadOnlyList<LetterOfGuaranteeDto>>(dtos);
    }
}
