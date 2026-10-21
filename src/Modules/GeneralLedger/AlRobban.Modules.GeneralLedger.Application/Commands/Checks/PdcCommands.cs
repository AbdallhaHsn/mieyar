using AlRobban.Modules.GeneralLedger.Domain.Entities;
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
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");

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
            createdBy: "System User"
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

    public DepositCheckCommandHandler(IPostDatedCheckRepository checkRepository)
    {
        _checkRepository = checkRepository;
    }

    public async Task<Result<PostDatedCheckDto>> Handle(DepositCheckCommand request, CancellationToken cancellationToken)
    {
        var check = await _checkRepository.GetByIdAsync(request.CheckId, cancellationToken);
        if (check == null)
            return Result.Failure<PostDatedCheckDto>(Error.NotFound("Check.NotFound", "الشيك غير موجود."));

        check.DepositForCollection(request.BankAccountId, "System User");
        await _checkRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(PostDatedCheckDto.FromEntity(check));
    }
}

public record ClearCheckCommand(Guid CheckId) : IRequest<Result<PostDatedCheckDto>>;

public class ClearCheckCommandHandler : IRequestHandler<ClearCheckCommand, Result<PostDatedCheckDto>>
{
    private readonly IPostDatedCheckRepository _checkRepository;

    public ClearCheckCommandHandler(IPostDatedCheckRepository checkRepository)
    {
        _checkRepository = checkRepository;
    }

    public async Task<Result<PostDatedCheckDto>> Handle(ClearCheckCommand request, CancellationToken cancellationToken)
    {
        var check = await _checkRepository.GetByIdAsync(request.CheckId, cancellationToken);
        if (check == null)
            return Result.Failure<PostDatedCheckDto>(Error.NotFound("Check.NotFound", "الشيك غير موجود."));

        // Generate simulated clearance entry ID
        var clearanceEntryId = Guid.NewGuid();
        check.Clear(clearanceEntryId, "System User");
        await _checkRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(PostDatedCheckDto.FromEntity(check));
    }
}

public record BounceCheckCommand(Guid CheckId, string Reason, decimal BounceFee = 0) : IRequest<Result<PostDatedCheckDto>>;

public class BounceCheckCommandHandler : IRequestHandler<BounceCheckCommand, Result<PostDatedCheckDto>>
{
    private readonly IPostDatedCheckRepository _checkRepository;

    public BounceCheckCommandHandler(IPostDatedCheckRepository checkRepository)
    {
        _checkRepository = checkRepository;
    }

    public async Task<Result<PostDatedCheckDto>> Handle(BounceCheckCommand request, CancellationToken cancellationToken)
    {
        var check = await _checkRepository.GetByIdAsync(request.CheckId, cancellationToken);
        if (check == null)
            return Result.Failure<PostDatedCheckDto>(Error.NotFound("Check.NotFound", "الشيك غير موجود."));

        var reversalEntryId = Guid.NewGuid();
        check.Bounce(request.Reason, request.BounceFee, reversalEntryId, "System User");
        await _checkRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(PostDatedCheckDto.FromEntity(check));
    }
}

public record GetChecksQuery(Guid? CompanyId, CheckType? Type = null, CheckStatus? Status = null) : IRequest<Result<IReadOnlyList<PostDatedCheckDto>>>;

public class GetChecksQueryHandler : IRequestHandler<GetChecksQuery, Result<IReadOnlyList<PostDatedCheckDto>>>
{
    private readonly IPostDatedCheckRepository _checkRepository;

    public GetChecksQueryHandler(IPostDatedCheckRepository checkRepository)
    {
        _checkRepository = checkRepository;
    }

    public async Task<Result<IReadOnlyList<PostDatedCheckDto>>> Handle(GetChecksQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");
        var list = await _checkRepository.GetListAsync(companyId, request.Type, request.Status, cancellationToken);
        var dtos = list.Select(PostDatedCheckDto.FromEntity).ToList();
        return Result.Success<IReadOnlyList<PostDatedCheckDto>>(dtos);
    }
}
