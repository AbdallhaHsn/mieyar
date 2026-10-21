using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Domain.Standards;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.UpdateAccount;

public record UpdateAccountCommand(
    Guid Id,
    string NameAr,
    string NameEn,
    string? Description = null,
    bool IsActive = true,
    string? StandardCode = null
) : IRequest<Result<AccountDto>>;

public class UpdateAccountCommandHandler : IRequestHandler<UpdateAccountCommand, Result<AccountDto>>
{
    private readonly IAccountRepository _accountRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public UpdateAccountCommandHandler(
        IAccountRepository accountRepository,
        ICurrentTenantContext tenantContext)
    {
        _accountRepository = accountRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<AccountDto>> Handle(UpdateAccountCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.NameAr))
        {
            return Result.Failure<AccountDto>(Error.Validation("Account.NameArRequired", "اسم الحساب باللغة العربية مطلوب."));
        }

        if (string.IsNullOrWhiteSpace(request.NameEn))
        {
            return Result.Failure<AccountDto>(Error.Validation("Account.NameEnRequired", "اسم الحساب باللغة الإنجليزية مطلوب."));
        }

        var account = await _accountRepository.GetByIdAsync(request.Id, cancellationToken);
        if (account == null)
        {
            return Result.Failure<AccountDto>(Error.NotFound("Account.NotFound", "الحساب المطلوب تعديله غير موجود."));
        }

        account.UpdateDetails(request.NameAr, request.NameEn, request.Description, request.IsActive);

        if (!string.IsNullOrWhiteSpace(request.StandardCode))
        {
            var guidance = IfrsStandardCatalog.GetByCode(request.StandardCode);
            if (guidance != null)
            {
                account.SetGuidance(guidance);
            }
        }

        await _accountRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(AccountDto.FromEntity(account));
    }
}
