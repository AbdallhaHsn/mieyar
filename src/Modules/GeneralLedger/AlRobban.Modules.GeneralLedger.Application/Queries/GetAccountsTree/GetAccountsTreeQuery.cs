using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Domain.Seeding;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.GetAccountsTree;

public record GetAccountsTreeQuery(Guid? CompanyId = null) : IRequest<Result<IReadOnlyList<AccountDto>>>;

public class GetAccountsTreeQueryHandler : IRequestHandler<GetAccountsTreeQuery, Result<IReadOnlyList<AccountDto>>>
{
    private readonly IAccountRepository _accountRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public GetAccountsTreeQueryHandler(
        IAccountRepository accountRepository,
        ICurrentTenantContext tenantContext)
    {
        _accountRepository = accountRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<IReadOnlyList<AccountDto>>> Handle(GetAccountsTreeQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");

        // 1. Auto-seed IFRS standard chart of accounts if company has no accounts
        var hasAccounts = await _accountRepository.HasAnyAccountsAsync(companyId, cancellationToken);
        if (!hasAccounts)
        {
            var seedAccounts = DefaultChartOfAccountsSeeder.GenerateDefaultAccounts(tenantId, companyId);
            await _accountRepository.AddRangeAsync(seedAccounts, cancellationToken);
            await _accountRepository.SaveChangesAsync(cancellationToken);
        }

        // 2. Fetch all accounts and construct tree hierarchy
        var allEntities = await _accountRepository.GetAllByCompanyAsync(companyId, cancellationToken);
        var dtos = allEntities.Select(AccountDto.FromEntity).ToList();

        // 3. Assemble nested hierarchy
        var dtoLookup = dtos.ToDictionary(x => x.Id);
        var rootList = new List<AccountDto>();

        foreach (var dto in dtos)
        {
            if (dto.ParentAccountId.HasValue && dtoLookup.TryGetValue(dto.ParentAccountId.Value, out var parentDto))
            {
                parentDto.SubAccounts.Add(dto);
            }
            else
            {
                rootList.Add(dto);
            }
        }

        // Sort roots by code (1, 2, 3, 4, 5)
        rootList = rootList.OrderBy(x => x.AccountCode).ToList();

        return Result.Success<IReadOnlyList<AccountDto>>(rootList);
    }
}
