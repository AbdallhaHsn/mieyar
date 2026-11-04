using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.Checks;

public record PostDatedCheckDto(
    Guid Id,
    Guid CompanyId,
    string CheckNumber,
    string BankName,
    string DrawerName,
    decimal Amount,
    string Currency,
    DateTime IssueDate,
    DateTime DueDate,
    CheckType CheckType,
    CheckStatus Status,
    Guid? BankAccountId,
    Guid? PartnerAccountId,
    Guid? AssociatedJournalEntryId,
    string? BounceReason,
    decimal BounceFee,
    string? Notes,
    DateTime CreatedAtUtc
)
{
    public static PostDatedCheckDto FromEntity(PostDatedCheck c) => new(
        c.Id,
        c.CompanyId,
        c.CheckNumber,
        c.BankName,
        c.DrawerName,
        c.Amount,
        c.Currency,
        c.IssueDate,
        c.DueDate,
        c.CheckType,
        c.Status,
        c.BankAccountId,
        c.PartnerAccountId,
        c.AssociatedJournalEntryId,
        c.BounceReason,
        c.BounceFee,
        c.Notes,
        c.CreatedAtUtc
    );
}

public record CreateCheckCommand(
    Guid? CompanyId,
    string CheckNumber,
    string BankName,
    string DrawerName,
    decimal Amount,
    DateTime IssueDate,
    DateTime DueDate,
    CheckType CheckType,
    Guid? PartnerAccountId = null,
    string? Notes = null
) : IRequest<Result<PostDatedCheckDto>>;

public class CreateCheckCommandHandler : IRequestHandler<CreateCheckCommand, Result<PostDatedCheckDto>>
{
    private readonly IPostDatedCheckRepository _checkRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateCheckCommandHandler(
        IPostDatedCheckRepository checkRepository,
        ICurrentTenantContext tenantContext)
    {
        _checkRepository = checkRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<PostDatedCheckDto>> Handle(CreateCheckCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var currentUser = _tenantContext.UserDisplayName ?? _tenantContext.UserName ?? "Accountant";

        var check = PostDatedCheck.Create(
            tenantId: tenantId,
            companyId: companyId,
            checkNumber: request.CheckNumber,
            bankName: request.BankName,
            drawerName: request.DrawerName,
            amount: request.Amount,
            issueDate: request.IssueDate,
            dueDate: request.DueDate,
            checkType: request.CheckType,
            partnerAccountId: request.PartnerAccountId,
            notes: request.Notes,
            createdBy: currentUser
        );

        await _checkRepository.AddAsync(check, cancellationToken);
        await _checkRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(PostDatedCheckDto.FromEntity(check));
    }
}

public record DepositCheckCommand(Guid CheckId, Guid BankAccountId) : IRequest<Result<PostDatedCheckDto>>;

public class DepositCheckCommandHandler : IRequestHandler<DepositCheckCommand, Result<PostDatedCheckDto>>
{
    private readonly IPostDatedCheckRepository _checkRepository;
    private readonly ICurrentTenantContext _tenantContext;
    private readonly IRequestLanguageContext _lang;

    public DepositCheckCommandHandler(
        IPostDatedCheckRepository checkRepository,
        ICurrentTenantContext tenantContext,
        IRequestLanguageContext lang)
    {
        _checkRepository = checkRepository;
        _tenantContext = tenantContext;
        _lang = lang;
    }

    public async Task<Result<PostDatedCheckDto>> Handle(DepositCheckCommand request, CancellationToken cancellationToken)
    {
        var check = await _checkRepository.GetByIdAsync(request.CheckId, cancellationToken);
        if (check == null)
            return Result.Failure<PostDatedCheckDto>(Error.NotFound(
                "Check.NotFound",
                _lang.Translate("الشيك غير موجود.", "Check not found.")));

        var currentUser = _tenantContext.UserDisplayName ?? _tenantContext.UserName ?? "Accountant";
        check.DepositForCollection(request.BankAccountId, currentUser);
        await _checkRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(PostDatedCheckDto.FromEntity(check));
    }
}

public record ClearCheckCommand(Guid CheckId) : IRequest<Result<PostDatedCheckDto>>;

public class ClearCheckCommandHandler : IRequestHandler<ClearCheckCommand, Result<PostDatedCheckDto>>
{
    private readonly IPostDatedCheckRepository _checkRepository;
    private readonly IAccountRepository _accountRepository;
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;
    private readonly IRequestLanguageContext _lang;

    public ClearCheckCommandHandler(
        IPostDatedCheckRepository checkRepository,
        IAccountRepository accountRepository,
        IMediator mediator,
        ICurrentTenantContext tenantContext,
        IRequestLanguageContext lang)
    {
        _checkRepository = checkRepository;
        _accountRepository = accountRepository;
        _mediator = mediator;
        _tenantContext = tenantContext;
        _lang = lang;
    }

    public async Task<Result<PostDatedCheckDto>> Handle(ClearCheckCommand request, CancellationToken cancellationToken)
    {
        var check = await _checkRepository.GetByIdAsync(request.CheckId, cancellationToken);
        if (check == null)
            return Result.Failure<PostDatedCheckDto>(Error.NotFound(
                "Check.NotFound",
                _lang.Translate("الشيك غير موجود.", "Check not found.")));

        var currentUser = _tenantContext.UserDisplayName ?? _tenantContext.UserName ?? "Accountant";
        var companyAccounts = await _accountRepository.GetAllByCompanyAsync(check.CompanyId, cancellationToken);
        var postableAccounts = companyAccounts.Where(a => a.IsPostable && a.IsActive).ToList();

        // 1. Resolve Bank Account
        Guid? bankAccountId = check.BankAccountId;
        if (!bankAccountId.HasValue || postableAccounts.All(a => a.Id != bankAccountId.Value))
        {
            var bankAcc = postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("11102"))
                       ?? postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("111"));
            bankAccountId = bankAcc?.Id;
        }

        // 2. Resolve Counterparty / Notes Receivable or Payable Account
        Guid? partnerAccountId = check.PartnerAccountId;
        if (!partnerAccountId.HasValue || postableAccounts.All(a => a.Id != partnerAccountId.Value))
        {
            if (check.CheckType == CheckType.Receivable)
            {
                var notesRec = postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("11202") || a.AccountCode.StartsWith("11201"))
                            ?? postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("112"));
                partnerAccountId = notesRec?.Id;
            }
            else
            {
                var notesPay = postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("21102") || a.AccountCode.StartsWith("21101"))
                            ?? postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("211"));
                partnerAccountId = notesPay?.Id;
            }
        }

        Guid? clearanceEntryId = null;

        if (bankAccountId.HasValue && partnerAccountId.HasValue && bankAccountId.Value != partnerAccountId.Value)
        {
            var lines = new List<CreateJournalEntryLineRequest>();
            if (check.CheckType == CheckType.Receivable)
            {
                // شيك قبض: من حـ/ البنك (مدين) إلى حـ/ أوراق القبض أو العميل (دائن)
                lines.Add(new CreateJournalEntryLineRequest(
                    bankAccountId.Value,
                    Debit: check.Amount,
                    Credit: 0m,
                    Description: $"تحصيل شيك قبض رقم {check.CheckNumber} - {check.DrawerName} ({check.BankName})",
                    CostCenterId: null));

                lines.Add(new CreateJournalEntryLineRequest(
                    partnerAccountId.Value,
                    Debit: 0m,
                    Credit: check.Amount,
                    Description: $"إقفال ورقة قبض محصلة رقم {check.CheckNumber} - {check.DrawerName}",
                    CostCenterId: null));
            }
            else
            {
                // شيك دفع: من حـ/ أوراق الدفع أو المورد (مدين) إلى حـ/ البنك (دائن)
                lines.Add(new CreateJournalEntryLineRequest(
                    partnerAccountId.Value,
                    Debit: check.Amount,
                    Credit: 0m,
                    Description: $"سداد وصرف شيك دفع رقم {check.CheckNumber} - {check.DrawerName}",
                    CostCenterId: null));

                lines.Add(new CreateJournalEntryLineRequest(
                    bankAccountId.Value,
                    Debit: 0m,
                    Credit: check.Amount,
                    Description: $"خصم شيك صادر رقم {check.CheckNumber} من البنك ({check.BankName})",
                    CostCenterId: null));
            }

            var journalCmd = new CreateJournalEntryCommand(
                CompanyId: check.CompanyId,
                EntryDate: DateTime.UtcNow.Date,
                EntryType: JournalEntryType.Adjustment,
                DescriptionAr: $"قيد تحصيل شيك رقم ({check.CheckNumber}) - {check.DrawerName}",
                DescriptionEn: $"Check Clearance Entry #{check.CheckNumber} - {check.DrawerName}",
                ReferenceNumber: $"CHK-CLR-{check.CheckNumber}",
                PostImmediately: true,
                Lines: lines);

            var journalResult = await _mediator.Send(journalCmd, cancellationToken);
            if (journalResult.IsSuccess)
            {
                clearanceEntryId = journalResult.Value.Id;
            }
        }

        check.Clear(clearanceEntryId, currentUser);
        await _checkRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(PostDatedCheckDto.FromEntity(check));
    }
}

public record BounceCheckCommand(Guid CheckId, string Reason, decimal BounceFee = 0) : IRequest<Result<PostDatedCheckDto>>;

public class BounceCheckCommandHandler : IRequestHandler<BounceCheckCommand, Result<PostDatedCheckDto>>
{
    private readonly IPostDatedCheckRepository _checkRepository;
    private readonly IAccountRepository _accountRepository;
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;
    private readonly IRequestLanguageContext _lang;

    public BounceCheckCommandHandler(
        IPostDatedCheckRepository checkRepository,
        IAccountRepository accountRepository,
        IMediator mediator,
        ICurrentTenantContext tenantContext,
        IRequestLanguageContext lang)
    {
        _checkRepository = checkRepository;
        _accountRepository = accountRepository;
        _mediator = mediator;
        _tenantContext = tenantContext;
        _lang = lang;
    }

    public async Task<Result<PostDatedCheckDto>> Handle(BounceCheckCommand request, CancellationToken cancellationToken)
    {
        var check = await _checkRepository.GetByIdAsync(request.CheckId, cancellationToken);
        if (check == null)
            return Result.Failure<PostDatedCheckDto>(Error.NotFound(
                "Check.NotFound",
                _lang.Translate("الشيك غير موجود.", "Check not found.")));

        var currentUser = _tenantContext.UserDisplayName ?? _tenantContext.UserName ?? "Accountant";
        var companyAccounts = await _accountRepository.GetAllByCompanyAsync(check.CompanyId, cancellationToken);
        var postableAccounts = companyAccounts.Where(a => a.IsPostable && a.IsActive).ToList();

        Guid? bankAccountId = check.BankAccountId;
        if (!bankAccountId.HasValue || postableAccounts.All(a => a.Id != bankAccountId.Value))
        {
            var bankAcc = postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("11102"))
                       ?? postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("111"));
            bankAccountId = bankAcc?.Id;
        }

        Guid? partnerAccountId = check.PartnerAccountId;
        if (!partnerAccountId.HasValue || postableAccounts.All(a => a.Id != partnerAccountId.Value))
        {
            partnerAccountId = check.CheckType == CheckType.Receivable
                ? (postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("11201")) ?? postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("112")))?.Id
                : (postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("21101")) ?? postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("211")))?.Id;
        }

        Guid? reversalEntryId = null;

        if (bankAccountId.HasValue && partnerAccountId.HasValue && bankAccountId.Value != partnerAccountId.Value)
        {
            var lines = new List<CreateJournalEntryLineRequest>();
            var fee = Math.Max(0m, request.BounceFee);

            if (check.CheckType == CheckType.Receivable)
            {
                // قيد إثبات ارتداد شيك قبض وتحميل العميل قيمة الشيك + عمولة الارتداد إن وجدت
                lines.Add(new CreateJournalEntryLineRequest(
                    partnerAccountId.Value,
                    Debit: check.Amount + fee,
                    Credit: 0m,
                    Description: $"إثبات ارتداد شيك رقم {check.CheckNumber} ({request.Reason}) - {check.DrawerName}",
                    CostCenterId: null));

                lines.Add(new CreateJournalEntryLineRequest(
                    bankAccountId.Value,
                    Debit: 0m,
                    Credit: check.Amount + fee,
                    Description: $"إلغاء إيداع شيك مرتد رقم {check.CheckNumber} ({check.BankName})",
                    CostCenterId: null));
            }
            else
            {
                // قيد إثبات ارتداد شيك صادر وإعادة استحقاق المورد
                lines.Add(new CreateJournalEntryLineRequest(
                    bankAccountId.Value,
                    Debit: check.Amount,
                    Credit: 0m,
                    Description: $"إلغاء صرف شيك صادر مرتد رقم {check.CheckNumber}",
                    CostCenterId: null));

                lines.Add(new CreateJournalEntryLineRequest(
                    partnerAccountId.Value,
                    Debit: 0m,
                    Credit: check.Amount,
                    Description: $"إعادة إثبات مستحقات المورد عن شيك مرتد رقم {check.CheckNumber} ({request.Reason})",
                    CostCenterId: null));

                if (fee > 0)
                {
                    var bankExpenseAcc = postableAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("53") || a.AccountCode.StartsWith("52"))
                                      ?? partnerAccountId.Value switch { var id => postableAccounts.First(a => a.Id == id) };
                    lines.Add(new CreateJournalEntryLineRequest(
                        bankExpenseAcc.Id,
                        Debit: fee,
                        Credit: 0m,
                        Description: $"عمولة بنكية على ارتداد شيك رقم {check.CheckNumber}",
                        CostCenterId: null));
                    lines.Add(new CreateJournalEntryLineRequest(
                        bankAccountId.Value,
                        Debit: 0m,
                        Credit: fee,
                        Description: $"خصم عمولة ارتداد شيك رقم {check.CheckNumber}",
                        CostCenterId: null));
                }
            }

            var journalCmd = new CreateJournalEntryCommand(
                CompanyId: check.CompanyId,
                EntryDate: DateTime.UtcNow.Date,
                EntryType: JournalEntryType.Adjustment,
                DescriptionAr: $"قيد ارتداد شيك رقم ({check.CheckNumber}) - السبب: {request.Reason}",
                DescriptionEn: $"Bounced Check Reversal Entry #{check.CheckNumber} - Reason: {request.Reason}",
                ReferenceNumber: $"CHK-BNC-{check.CheckNumber}",
                PostImmediately: true,
                Lines: lines);

            var journalResult = await _mediator.Send(journalCmd, cancellationToken);
            if (journalResult.IsSuccess)
            {
                reversalEntryId = journalResult.Value.Id;
            }
        }

        check.Bounce(request.Reason, request.BounceFee, reversalEntryId, currentUser);
        await _checkRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(PostDatedCheckDto.FromEntity(check));
    }
}

public record GetChecksQuery(Guid? CompanyId, CheckType? Type = null, CheckStatus? Status = null) : IRequest<Result<IReadOnlyList<PostDatedCheckDto>>>;

public class GetChecksQueryHandler : IRequestHandler<GetChecksQuery, Result<IReadOnlyList<PostDatedCheckDto>>>
{
    private readonly IPostDatedCheckRepository _checkRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public GetChecksQueryHandler(
        IPostDatedCheckRepository checkRepository,
        ICurrentTenantContext tenantContext)
    {
        _checkRepository = checkRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<IReadOnlyList<PostDatedCheckDto>>> Handle(GetChecksQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var list = await _checkRepository.GetListAsync(companyId, request.Type, request.Status, cancellationToken);
        var dtos = list.Select(PostDatedCheckDto.FromEntity).ToList();
        return Result.Success<IReadOnlyList<PostDatedCheckDto>>(dtos);
    }
}
