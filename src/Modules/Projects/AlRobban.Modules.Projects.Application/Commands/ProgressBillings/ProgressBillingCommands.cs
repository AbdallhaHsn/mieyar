using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.Projects.Application.DTOs;
using AlRobban.Modules.Projects.Domain.Entities;
using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Modules.Projects.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Projects.Application.Commands.ProgressBillings;

public record CreateProgressBillingCommand(
    Guid CompanyId,
    Guid ProjectId,
    DateTime BillingDate,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    decimal CurrentWorkAmount,
    decimal? RetentionPercentage = null,
    decimal? AdvancePaymentDeduction = null,
    decimal OtherDeductions = 0,
    string? DeductionsNotes = null,
    string? ConsultantName = null) : IRequest<Result<ContractProgressBillingDto>>;

public class CreateProgressBillingCommandHandler : IRequestHandler<CreateProgressBillingCommand, Result<ContractProgressBillingDto>>
{
    private readonly IProjectRepository _projectRepo;
    private readonly IProgressBillingRepository _billingRepo;

    public CreateProgressBillingCommandHandler(
        IProjectRepository projectRepo,
        IProgressBillingRepository billingRepo)
    {
        _projectRepo = projectRepo;
        _billingRepo = billingRepo;
    }

    public async Task<Result<ContractProgressBillingDto>> Handle(CreateProgressBillingCommand request, CancellationToken cancellationToken)
    {
        var project = await _projectRepo.GetByIdAsync(request.ProjectId, cancellationToken);
        if (project is null)
            return Result.Failure<ContractProgressBillingDto>(new Error("Project.NotFound", "المشروع غير موجود"));

        if (request.CurrentWorkAmount <= 0)
            return Result.Failure<ContractProgressBillingDto>(new Error("Billing.InvalidAmount", "قيمة أعمال الفترة الحالية يجب أن تكون أكبر من الصفر"));

        // Get previously approved cumulative work
        var previousWorkAmount = await _billingRepo.GetCumulativeApprovedWorkAmountAsync(request.ProjectId, cancellationToken);

        var existingBillings = await _billingRepo.GetByProjectIdAsync(request.ProjectId, cancellationToken);
        var sequence = existingBillings.Count + 1;
        var billingNumber = await _billingRepo.GenerateNextBillingNumberAsync(request.ProjectId, cancellationToken);

        var retentionPct = request.RetentionPercentage ?? project.RetentionPercentage;

        // Auto-calculate advance payment deduction if project has advance payment
        var advanceDeduction = request.AdvancePaymentDeduction ??
            (project.AdvancePaymentAmount > 0
                ? Math.Round(request.CurrentWorkAmount * (project.AdvancePaymentDeductionPercentage / 100m), 2)
                : 0m);

        var billing = new ContractProgressBilling(
            id: Guid.NewGuid(),
            companyId: request.CompanyId,
            projectId: request.ProjectId,
            billingNumber: billingNumber,
            billingSequence: sequence,
            billingDate: request.BillingDate,
            periodStart: request.PeriodStart,
            periodEnd: request.PeriodEnd,
            previousWorkAmount: previousWorkAmount,
            currentWorkAmount: request.CurrentWorkAmount,
            retentionPercentage: retentionPct,
            advancePaymentDeduction: advanceDeduction,
            otherDeductions: request.OtherDeductions,
            deductionsNotes: request.DeductionsNotes,
            vatRate: project.VatRate,
            consultantName: request.ConsultantName);

        await _billingRepo.AddAsync(billing, cancellationToken);

        return Result.Success(MapToDto(billing, project));
    }

    private static ContractProgressBillingDto MapToDto(ContractProgressBilling b, Project p) => new()
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
        StatusText = "مسودة",
        ConsultantName = b.ConsultantName,
        ConsultantApprovalDate = b.ConsultantApprovalDate,
        ConsultantNotes = b.ConsultantNotes,
        AssociatedInvoiceId = b.AssociatedInvoiceId,
        AssociatedInvoiceNumber = b.AssociatedInvoiceNumber,
        AssociatedJournalEntryId = b.AssociatedJournalEntryId,
        AssociatedJournalEntryNumber = b.AssociatedJournalEntryNumber
    };
}

public record SubmitProgressBillingCommand(Guid Id, string? ConsultantName, string? Notes) : IRequest<Result>;

public class SubmitProgressBillingCommandHandler : IRequestHandler<SubmitProgressBillingCommand, Result>
{
    private readonly IProgressBillingRepository _billingRepo;

    public SubmitProgressBillingCommandHandler(IProgressBillingRepository billingRepo)
    {
        _billingRepo = billingRepo;
    }

    public async Task<Result> Handle(SubmitProgressBillingCommand request, CancellationToken cancellationToken)
    {
        var billing = await _billingRepo.GetByIdAsync(request.Id, cancellationToken);
        if (billing is null)
            return Result.Failure(new Error("Billing.NotFound", "المستخلص غير موجود"));

        billing.SubmitToConsultant(request.ConsultantName, request.Notes);
        await _billingRepo.UpdateAsync(billing, cancellationToken);
        return Result.Success();
    }
}

public record ApproveProgressBillingCommand(Guid Id, string ConsultantName, string? Notes) : IRequest<Result>;

public class ApproveProgressBillingCommandHandler : IRequestHandler<ApproveProgressBillingCommand, Result>
{
    private readonly IProgressBillingRepository _billingRepo;

    public ApproveProgressBillingCommandHandler(IProgressBillingRepository billingRepo)
    {
        _billingRepo = billingRepo;
    }

    public async Task<Result> Handle(ApproveProgressBillingCommand request, CancellationToken cancellationToken)
    {
        var billing = await _billingRepo.GetByIdAsync(request.Id, cancellationToken);
        if (billing is null)
            return Result.Failure(new Error("Billing.NotFound", "المستخلص غير موجود"));

        billing.ApproveByConsultant(request.ConsultantName, request.Notes);
        await _billingRepo.UpdateAsync(billing, cancellationToken);
        return Result.Success();
    }
}

public record CertifyProgressBillingCommand(
    Guid Id, 
    bool PostGlEntry = true,
    Guid? ArAccountId = null,
    Guid? RetentionAccountId = null,
    Guid? AdvancePaymentAccountId = null,
    Guid? RevenueAccountId = null,
    Guid? VatAccountId = null) : IRequest<Result<ContractProgressBillingDto>>;

public class CertifyProgressBillingCommandHandler : IRequestHandler<CertifyProgressBillingCommand, Result<ContractProgressBillingDto>>
{
    private readonly IProgressBillingRepository _billingRepo;
    private readonly IProjectRepository _projectRepo;
    private readonly AlRobban.Modules.GeneralLedger.Domain.Repositories.IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public CertifyProgressBillingCommandHandler(
        IProgressBillingRepository billingRepo,
        IProjectRepository projectRepo,
        AlRobban.Modules.GeneralLedger.Domain.Repositories.IAccountRepository accountRepo,
        IMediator mediator)
    {
        _billingRepo = billingRepo;
        _projectRepo = projectRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<ContractProgressBillingDto>> Handle(CertifyProgressBillingCommand request, CancellationToken cancellationToken)
    {
        var billing = await _billingRepo.GetByIdAsync(request.Id, cancellationToken);
        if (billing is null)
            return Result.Failure<ContractProgressBillingDto>(new Error("Billing.NotFound", "المستخلص غير موجود"));

        var project = await _projectRepo.GetByIdAsync(billing.ProjectId, cancellationToken);
        if (project is null)
            return Result.Failure<ContractProgressBillingDto>(new Error("Project.NotFound", "المشروع غير موجود"));

        Guid? journalEntryId = null;
        string? journalEntryNumber = null;

        if (request.PostGlEntry)
        {
            var accounts = await _accountRepo.GetAllByCompanyAsync(billing.CompanyId, cancellationToken);

            var arAccount = (request.ArAccountId.HasValue ? accounts.FirstOrDefault(a => a.Id == request.ArAccountId.Value) : null)
                ?? accounts.FirstOrDefault(a => a.AccountCode == "11301") 
                ?? accounts.FirstOrDefault(a => a.AccountType == AccountType.Asset && a.IsPostable);

            var retAccount = (request.RetentionAccountId.HasValue ? accounts.FirstOrDefault(a => a.Id == request.RetentionAccountId.Value) : null)
                ?? accounts.FirstOrDefault(a => a.AccountCode == "11303") 
                ?? arAccount;

            var advAccount = (request.AdvancePaymentAccountId.HasValue ? accounts.FirstOrDefault(a => a.Id == request.AdvancePaymentAccountId.Value) : null)
                ?? accounts.FirstOrDefault(a => a.AccountCode == "21302") 
                ?? accounts.FirstOrDefault(a => a.AccountType == AccountType.Liability && a.IsPostable);

            var revAccount = (request.RevenueAccountId.HasValue ? accounts.FirstOrDefault(a => a.Id == request.RevenueAccountId.Value) : null)
                ?? accounts.FirstOrDefault(a => a.AccountCode == "41103" || a.AccountCode == "41101") 
                ?? accounts.FirstOrDefault(a => a.AccountType == AccountType.Revenue && a.IsPostable);

            var vatAccount = (request.VatAccountId.HasValue ? accounts.FirstOrDefault(a => a.Id == request.VatAccountId.Value) : null)
                ?? accounts.FirstOrDefault(a => a.AccountCode == "21201") 
                ?? advAccount;

            if (arAccount != null && revAccount != null)
            {
                var lines = new List<CreateJournalEntryLineRequest>();

                if (billing.TotalWithVat > 0)
                {
                    lines.Add(new CreateJournalEntryLineRequest(
                        AccountId: arAccount.Id,
                        Debit: billing.TotalWithVat,
                        Credit: 0,
                        Description: $"استحقاق مستخلص {billing.BillingNumber} - مشروع {project.NameAr}",
                        CostCenterId: project.CostCenterId));
                }

                if (billing.RetentionAmount > 0 && retAccount != null)
                {
                    lines.Add(new CreateJournalEntryLineRequest(
                        AccountId: retAccount.Id,
                        Debit: billing.RetentionAmount,
                        Credit: 0,
                        Description: $"ضمان أعمال محتجز مستخلص {billing.BillingNumber} ({billing.RetentionPercentage}%)",
                        CostCenterId: project.CostCenterId));
                }

                if (billing.AdvancePaymentDeduction > 0 && advAccount != null)
                {
                    lines.Add(new CreateJournalEntryLineRequest(
                        AccountId: advAccount.Id,
                        Debit: billing.AdvancePaymentDeduction,
                        Credit: 0,
                        Description: $"استرداد دفعة مقدمة مستخلص {billing.BillingNumber}",
                        CostCenterId: project.CostCenterId));
                }

                lines.Add(new CreateJournalEntryLineRequest(
                    AccountId: revAccount.Id,
                    Debit: 0,
                    Credit: billing.CurrentWorkAmount,
                    Description: $"إيرادات عقود ومشاريع معتمدة مستخلص {billing.BillingNumber}",
                    CostCenterId: project.CostCenterId));

                if (billing.VatAmount > 0 && vatAccount != null)
                {
                    lines.Add(new CreateJournalEntryLineRequest(
                        AccountId: vatAccount.Id,
                        Debit: 0,
                        Credit: billing.VatAmount,
                        Description: $"ضريبة القيمة المضافة 15% مستخلص {billing.BillingNumber}",
                        CostCenterId: null));
                }

                var glCommand = new CreateJournalEntryCommand(
                    CompanyId: billing.CompanyId,
                    EntryDate: billing.BillingDate,
                    EntryType: JournalEntryType.Daily,
                    DescriptionAr: $"إثبات استحقاق مستخلص رقم {billing.BillingNumber} لمشروع {project.NameAr}",
                    DescriptionEn: $"Certified Billing {billing.BillingNumber} - Project {project.NameEn}",
                    ReferenceNumber: billing.BillingNumber,
                    PostImmediately: true,
                    Lines: lines);

                var glResult = await _mediator.Send(glCommand, cancellationToken);
                if (glResult.IsSuccess && glResult.Value is not null)
                {
                    journalEntryId = glResult.Value.Id;
                    journalEntryNumber = glResult.Value.EntryNumber.ToString();
                }
            }
        }

        billing.CertifyForPayment(journalEntryId, journalEntryNumber);
        await _billingRepo.UpdateAsync(billing, cancellationToken);

        // Update Project Completion Percentage based on total certified work
        var cumulativeWork = await _billingRepo.GetCumulativeApprovedWorkAmountAsync(project.Id, cancellationToken);
        if (project.ContractAmount > 0)
        {
            var calculatedProgress = Math.Round(Math.Clamp((cumulativeWork / project.ContractAmount) * 100m, 0, 100), 2);
            project.UpdateCompletion(calculatedProgress);
            await _projectRepo.UpdateAsync(project, cancellationToken);
        }

        return Result.Success(new ContractProgressBillingDto
        {
            Id = billing.Id,
            CompanyId = billing.CompanyId,
            ProjectId = billing.ProjectId,
            ProjectName = project.NameAr,
            ProjectCode = project.Code,
            BillingNumber = billing.BillingNumber,
            BillingSequence = billing.BillingSequence,
            BillingDate = billing.BillingDate,
            PeriodStart = billing.PeriodStart,
            PeriodEnd = billing.PeriodEnd,
            PreviousWorkAmount = billing.PreviousWorkAmount,
            CurrentWorkAmount = billing.CurrentWorkAmount,
            TotalWorkAmount = billing.TotalWorkAmount,
            RetentionPercentage = billing.RetentionPercentage,
            RetentionAmount = billing.RetentionAmount,
            AdvancePaymentDeduction = billing.AdvancePaymentDeduction,
            OtherDeductions = billing.OtherDeductions,
            DeductionsNotes = billing.DeductionsNotes,
            NetAmount = billing.NetAmount,
            VatRate = billing.VatRate,
            VatAmount = billing.VatAmount,
            TotalWithVat = billing.TotalWithVat,
            Status = billing.Status,
            StatusText = "معتمد للصرف",
            ConsultantName = billing.ConsultantName,
            ConsultantApprovalDate = billing.ConsultantApprovalDate,
            ConsultantNotes = billing.ConsultantNotes,
            AssociatedInvoiceId = billing.AssociatedInvoiceId,
            AssociatedInvoiceNumber = billing.AssociatedInvoiceNumber,
            AssociatedJournalEntryId = billing.AssociatedJournalEntryId,
            AssociatedJournalEntryNumber = billing.AssociatedJournalEntryNumber
        });
    }
}
