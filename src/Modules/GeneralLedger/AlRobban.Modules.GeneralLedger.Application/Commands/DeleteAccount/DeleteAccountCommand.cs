using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.DeleteAccount;

public record DeleteAccountCommand(Guid Id, Guid? CompanyId = null) : IRequest<Result>;

public class DeleteAccountCommandHandler : IRequestHandler<DeleteAccountCommand, Result>
{
    private readonly IAccountRepository _accountRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public DeleteAccountCommandHandler(
        IAccountRepository accountRepository,
        ICurrentTenantContext tenantContext)
    {
        _accountRepository = accountRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result> Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
    {
        var account = await _accountRepository.GetByIdAsync(request.Id, cancellationToken);
        if (account == null)
        {
            return Result.Failure(Error.NotFound("Account.NotFound", "الحساب المطلوب حذفه غير موجود."));
        }

        // Rule 1: Check if the account has sub-accounts
        var subAccounts = await _accountRepository.GetSubAccountsAsync(account.Id, cancellationToken);
        if (subAccounts != null && subAccounts.Count > 0)
        {
            return Result.Failure(Error.Validation(
                "Account.HasSubAccounts",
                $"لا يمكن حذف الحساب ({account.AccountCode} - {account.NameAr}) لأنه يحتوي على {subAccounts.Count} حسابات فرعية تابعة له. يرجى حذف الحسابات الفرعية أولاً."));
        }

        // Rule 2: Cannot delete Level 1 root accounts directly
        if (account.Level == 1)
        {
            return Result.Failure(Error.Validation(
                "Account.CannotDeleteRoot",
                $"لا يمكن حذف الحسابات الجذرية الرئيسية للمستوى الأول ({account.AccountCode} - {account.NameAr}) حفاظاً على توازن شجرة الحسابات."));
        }

        // Remove from database
        _accountRepository.Remove(account);
        await _accountRepository.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
