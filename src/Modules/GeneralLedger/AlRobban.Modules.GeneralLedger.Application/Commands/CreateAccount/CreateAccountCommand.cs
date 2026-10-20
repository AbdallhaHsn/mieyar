using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Domain.Standards;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.CreateAccount;

public record CreateAccountCommand(
    Guid? CompanyId,
    Guid? ParentAccountId,
    string? AccountCode,
    string NameAr,
    string NameEn,
    bool IsPostable,
    string? StandardCode = null,
    AccountType? AccountType = null,
    AccountNature? AccountNature = null,
    FinancialStatement? FinancialStatement = null,
    string? Description = null
) : IRequest<Result<AccountDto>>;

public class CreateAccountCommandHandler : IRequestHandler<CreateAccountCommand, Result<AccountDto>>
{
    private readonly IAccountRepository _accountRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateAccountCommandHandler(
        IAccountRepository accountRepository,
        ICurrentTenantContext tenantContext)
    {
        _accountRepository = accountRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<AccountDto>> Handle(CreateAccountCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");

        var guidance = !string.IsNullOrWhiteSpace(request.StandardCode)
            ? IfrsStandardCatalog.GetByCode(request.StandardCode)
            : null;

        Account newAccount;

        if (request.ParentAccountId.HasValue && request.ParentAccountId.Value != Guid.Empty)
        {
            var parent = await _accountRepository.GetByIdAsync(request.ParentAccountId.Value, cancellationToken);
            if (parent == null)
            {
                return Result.Failure<AccountDto>(Error.NotFound("Account.ParentNotFound", "الحساب الأب المحدد غير موجود."));
            }

            // Determine AccountCode if not specified
            var code = request.AccountCode;
            if (string.IsNullOrWhiteSpace(code))
            {
                var siblings = await _accountRepository.GetSubAccountsAsync(parent.Id, cancellationToken);
                var nextIndex = siblings.Count + 1;
                code = parent.Level switch
                {
                    1 => $"{parent.AccountCode}{nextIndex}",
                    2 => $"{parent.AccountCode}{nextIndex}",
                    _ => $"{parent.AccountCode}{nextIndex:D2}"
                };
            }

            // Check uniqueness
            var existingWithCode = await _accountRepository.GetByCodeAsync(companyId, code, cancellationToken);
            if (existingWithCode != null)
            {
                return Result.Failure<AccountDto>(Error.Conflict("Account.CodeExists", $"رقم الحساب {code} مستخدم مسبقاً في هذه المنشأة."));
            }

            newAccount = Account.CreateSubAccount(
                tenantId: tenantId,
                companyId: companyId,
                parentAccount: parent,
                accountCode: code,
                nameAr: request.NameAr,
                nameEn: request.NameEn,
                isPostable: request.IsPostable,
                guidance: guidance,
                description: request.Description,
                overrideNature: request.AccountNature
            );
        }
        else
        {
            // Root Account Creation
            var code = request.AccountCode ?? "9";
            var type = request.AccountType ?? AccountType.Asset;
            var nature = request.AccountNature ?? (type == AccountType.Asset || type == AccountType.Expense ? AccountNature.Debit : AccountNature.Credit);
            var statement = request.FinancialStatement ?? (type == AccountType.Revenue || type == AccountType.Expense ? FinancialStatement.IncomeStatement : FinancialStatement.BalanceSheet);

            newAccount = Account.CreateRoot(
                tenantId: tenantId,
                companyId: companyId,
                accountCode: code,
                nameAr: request.NameAr,
                nameEn: request.NameEn,
                accountType: type,
                accountNature: nature,
                financialStatement: statement,
                guidance: guidance,
                description: request.Description
            );
        }

        await _accountRepository.AddAsync(newAccount, cancellationToken);
        await _accountRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(AccountDto.FromEntity(newAccount));
    }
}
