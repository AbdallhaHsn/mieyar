using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.Projects.Application.DTOs;
using AlRobban.Modules.Projects.Domain.Entities;
using AlRobban.Modules.Projects.Domain.Enums;
using AlRobban.Modules.Projects.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.Projects.Application.Commands.Guarantees;

public record CreateLetterOfGuaranteeCommand(
    Guid CompanyId,
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
    bool PostGlEntry = true) : IRequest<Result<LetterOfGuaranteeDto>>;

public class CreateLetterOfGuaranteeCommandHandler : IRequestHandler<CreateLetterOfGuaranteeCommand, Result<LetterOfGuaranteeDto>>
{
    private readonly ILetterOfGuaranteeRepository _guaranteeRepo;
    private readonly IProjectRepository _projectRepo;
    private readonly AlRobban.Modules.GeneralLedger.Domain.Repositories.IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public CreateLetterOfGuaranteeCommandHandler(
        ILetterOfGuaranteeRepository guaranteeRepo,
        IProjectRepository projectRepo,
        AlRobban.Modules.GeneralLedger.Domain.Repositories.IAccountRepository accountRepo,
        IMediator mediator)
    {
        _guaranteeRepo = guaranteeRepo;
        _projectRepo = projectRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<LetterOfGuaranteeDto>> Handle(CreateLetterOfGuaranteeCommand request, CancellationToken cancellationToken)
    {
        var project = await _projectRepo.GetByIdAsync(request.ProjectId, cancellationToken);
        if (project is null)
            return Result.Failure<LetterOfGuaranteeDto>(new Error("Project.NotFound", "المشروع غير موجود"));

        if (string.IsNullOrWhiteSpace(request.GuaranteeNumber))
            return Result.Failure<LetterOfGuaranteeDto>(new Error("Guarantee.EmptyNumber", "رقم خطاب الضمان مطلوب"));

        if (request.Amount <= 0)
            return Result.Failure<LetterOfGuaranteeDto>(new Error("Guarantee.InvalidAmount", "مبلغ الضمان يجب أن يكون أكبر من الصفر"));

        var guarantee = new LetterOfGuarantee(
            id: Guid.NewGuid(),
            companyId: request.CompanyId,
            projectId: request.ProjectId,
            guaranteeNumber: request.GuaranteeNumber.Trim(),
            type: request.Type,
            issuingBank: request.IssuingBank.Trim(),
            beneficiaryName: string.IsNullOrWhiteSpace(request.BeneficiaryName) ? project.CustomerName : request.BeneficiaryName.Trim(),
            amount: request.Amount,
            cashMarginPercentage: request.CashMarginPercentage,
            bankCommission: request.BankCommission,
            issueDate: request.IssueDate,
            expiryDate: request.ExpiryDate,
            bankBranch: request.BankBranch,
            bankAccountNumber: request.BankAccountNumber,
            notes: request.Notes);

        if (request.PostGlEntry && (guarantee.CashMarginAmount > 0 || guarantee.BankCommission > 0))
        {
            var accounts = await _accountRepo.GetAllByCompanyAsync(guarantee.CompanyId, cancellationToken);
            var marginAccount = accounts.FirstOrDefault(a => a.AccountCode == "11204") 
                ?? accounts.FirstOrDefault(a => a.AccountType == AccountType.Asset && a.IsPostable);
            var commissionAccount = accounts.FirstOrDefault(a => a.AccountCode == "53102") 
                ?? accounts.FirstOrDefault(a => a.AccountType == AccountType.Expense && a.IsPostable);
            var bankAccount = accounts.FirstOrDefault(a => a.AccountCode == "11102") 
                ?? accounts.FirstOrDefault(a => a.AccountType == AccountType.Asset && a.IsPostable);

            if (bankAccount != null)
            {
                var totalDeduction = guarantee.CashMarginAmount + guarantee.BankCommission;
                var lines = new List<CreateJournalEntryLineRequest>();

                if (guarantee.CashMarginAmount > 0 && marginAccount != null)
                {
                    lines.Add(new CreateJournalEntryLineRequest(
                        AccountId: marginAccount.Id,
                        Debit: guarantee.CashMarginAmount,
                        Credit: 0,
                        Description: $"غطاء نقدي لخطاب ضمان {guarantee.GuaranteeNumber} ({guarantee.Type}) - {guarantee.IssuingBank}",
                        CostCenterId: project.CostCenterId));
                }

                if (guarantee.BankCommission > 0 && commissionAccount != null)
                {
                    lines.Add(new CreateJournalEntryLineRequest(
                        AccountId: commissionAccount.Id,
                        Debit: guarantee.BankCommission,
                        Credit: 0,
                        Description: $"عمولة إصدار خطاب ضمان {guarantee.GuaranteeNumber}",
                        CostCenterId: project.CostCenterId));
                }

                lines.Add(new CreateJournalEntryLineRequest(
                    AccountId: bankAccount.Id,
                    Debit: 0,
                    Credit: totalDeduction,
                    Description: $"خصم غطاء وعمولة خطاب ضمان {guarantee.GuaranteeNumber} من {guarantee.IssuingBank}",
                    CostCenterId: null));

                var glCommand = new CreateJournalEntryCommand(
                    CompanyId: guarantee.CompanyId,
                    EntryDate: guarantee.IssueDate,
                    EntryType: JournalEntryType.Daily,
                    DescriptionAr: $"إثبات غطاء وعمولة خطاب ضمان رقم {guarantee.GuaranteeNumber} لصالح {guarantee.BeneficiaryName}",
                    DescriptionEn: $"Bank Guarantee {guarantee.GuaranteeNumber} Margin & Commission",
                    ReferenceNumber: guarantee.GuaranteeNumber,
                    PostImmediately: true,
                    Lines: lines);

                var glResult = await _mediator.Send(glCommand, cancellationToken);
                if (glResult.IsSuccess && glResult.Value is not null)
                {
                    guarantee.SetGlJournalEntry(glResult.Value.Id, glResult.Value.EntryNumber.ToString());
                }
            }
        }

        await _guaranteeRepo.AddAsync(guarantee, cancellationToken);

        return Result.Success(new LetterOfGuaranteeDto
        {
            Id = guarantee.Id,
            CompanyId = guarantee.CompanyId,
            ProjectId = guarantee.ProjectId,
            ProjectName = project.NameAr,
            ProjectCode = project.Code,
            GuaranteeNumber = guarantee.GuaranteeNumber,
            Type = guarantee.Type,
            TypeText = GetGuaranteeTypeText(guarantee.Type),
            IssuingBank = guarantee.IssuingBank,
            BankBranch = guarantee.BankBranch,
            BankAccountNumber = guarantee.BankAccountNumber,
            BeneficiaryName = guarantee.BeneficiaryName,
            Amount = guarantee.Amount,
            CashMarginPercentage = guarantee.CashMarginPercentage,
            CashMarginAmount = guarantee.CashMarginAmount,
            BankCommission = guarantee.BankCommission,
            IssueDate = guarantee.IssueDate,
            ExpiryDate = guarantee.ExpiryDate,
            Status = guarantee.Status,
            StatusText = "ساري",
            AssociatedJournalEntryId = guarantee.AssociatedJournalEntryId,
            AssociatedJournalEntryNumber = guarantee.AssociatedJournalEntryNumber,
            Notes = guarantee.Notes
        });
    }

    private static string GetGuaranteeTypeText(GuaranteeType type) => type switch
    {
        GuaranteeType.BidBond => "ابتدائي / عطاء",
        GuaranteeType.PerformanceBond => "نهائي / حسن تنفيذ",
        GuaranteeType.AdvancePaymentBond => "دفعة مقدمة",
        GuaranteeType.RetentionBond => "ضمان أعمال ومحجوزات",
        GuaranteeType.MaintenanceBond => "صيانة وتشغيل",
        _ => type.ToString()
    };
}

public record ExtendLetterOfGuaranteeCommand(
    Guid Id,
    DateTime NewExpiryDate,
    decimal AdditionalCommission = 0,
    string? Notes = null) : IRequest<Result>;

public class ExtendLetterOfGuaranteeCommandHandler : IRequestHandler<ExtendLetterOfGuaranteeCommand, Result>
{
    private readonly ILetterOfGuaranteeRepository _guaranteeRepo;

    public ExtendLetterOfGuaranteeCommandHandler(ILetterOfGuaranteeRepository guaranteeRepo)
    {
        _guaranteeRepo = guaranteeRepo;
    }

    public async Task<Result> Handle(ExtendLetterOfGuaranteeCommand request, CancellationToken cancellationToken)
    {
        var guarantee = await _guaranteeRepo.GetByIdAsync(request.Id, cancellationToken);
        if (guarantee is null)
            return Result.Failure(new Error("Guarantee.NotFound", "خطاب الضمان غير موجود"));

        guarantee.Extend(request.NewExpiryDate, request.AdditionalCommission, request.Notes);
        await _guaranteeRepo.UpdateAsync(guarantee, cancellationToken);
        return Result.Success();
    }
}

public record ReleaseLetterOfGuaranteeCommand(Guid Id, string? Notes = null, bool PostReleaseGl = true) : IRequest<Result>;

public class ReleaseLetterOfGuaranteeCommandHandler : IRequestHandler<ReleaseLetterOfGuaranteeCommand, Result>
{
    private readonly ILetterOfGuaranteeRepository _guaranteeRepo;
    private readonly AlRobban.Modules.GeneralLedger.Domain.Repositories.IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public ReleaseLetterOfGuaranteeCommandHandler(
        ILetterOfGuaranteeRepository guaranteeRepo,
        AlRobban.Modules.GeneralLedger.Domain.Repositories.IAccountRepository accountRepo,
        IMediator mediator)
    {
        _guaranteeRepo = guaranteeRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result> Handle(ReleaseLetterOfGuaranteeCommand request, CancellationToken cancellationToken)
    {
        var guarantee = await _guaranteeRepo.GetByIdAsync(request.Id, cancellationToken);
        if (guarantee is null)
            return Result.Failure(new Error("Guarantee.NotFound", "خطاب الضمان غير موجود"));

        if (request.PostReleaseGl && guarantee.CashMarginAmount > 0)
        {
            var accounts = await _accountRepo.GetAllByCompanyAsync(guarantee.CompanyId, cancellationToken);
            var bankAccount = accounts.FirstOrDefault(a => a.AccountCode == "11102") 
                ?? accounts.FirstOrDefault(a => a.AccountType == AccountType.Asset && a.IsPostable);
            var marginAccount = accounts.FirstOrDefault(a => a.AccountCode == "11204") ?? bankAccount;

            if (bankAccount != null && marginAccount != null)
            {
                var lines = new List<CreateJournalEntryLineRequest>
                {
                    new CreateJournalEntryLineRequest(
                        AccountId: bankAccount.Id,
                        Debit: guarantee.CashMarginAmount,
                        Credit: 0,
                        Description: $"استرداد غطاء نقدي لخطاب ضمان مفرج عنه {guarantee.GuaranteeNumber}",
                        CostCenterId: null),
                    new CreateJournalEntryLineRequest(
                        AccountId: marginAccount.Id,
                        Debit: 0,
                        Credit: guarantee.CashMarginAmount,
                        Description: $"إلغاء حجز غطاء خطاب ضمان {guarantee.GuaranteeNumber}",
                        CostCenterId: null)
                };

                var glCommand = new CreateJournalEntryCommand(
                    CompanyId: guarantee.CompanyId,
                    EntryDate: DateTime.UtcNow,
                    EntryType: JournalEntryType.Daily,
                    DescriptionAr: $"إثبات استرداد الغطاء النقدي لخطاب الضمان رقم {guarantee.GuaranteeNumber} بعد الإفراج",
                    DescriptionEn: $"Release Bank Guarantee Cash Margin {guarantee.GuaranteeNumber}",
                    ReferenceNumber: guarantee.GuaranteeNumber,
                    PostImmediately: true,
                    Lines: lines);

                await _mediator.Send(glCommand, cancellationToken);
            }
        }

        guarantee.Release(request.Notes);
        await _guaranteeRepo.UpdateAsync(guarantee, cancellationToken);
        return Result.Success();
    }
}
