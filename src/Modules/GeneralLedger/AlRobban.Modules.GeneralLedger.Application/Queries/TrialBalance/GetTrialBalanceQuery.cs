using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Domain.Seeding;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.TrialBalance;

public record GetTrialBalanceQuery(
    Guid? CompanyId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    Guid? CostCenterId = null,
    bool HideZeroBalances = false,
    int? MaxLevel = null,
    string? SearchTerm = null
) : IRequest<Result<TrialBalanceReportDto>>;

public class GetTrialBalanceQueryHandler : IRequestHandler<GetTrialBalanceQuery, Result<TrialBalanceReportDto>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetTrialBalanceQueryHandler(
        IAccountRepository accountRepo,
        IJournalEntryRepository journalRepo,
        ICurrentTenantContext tenantContext)
    {
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<TrialBalanceReportDto>> Handle(GetTrialBalanceQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var fromDate = request.FromDate ?? new DateTime(DateTime.UtcNow.Year, 1, 1);
        var toDate = request.ToDate ?? DateTime.UtcNow;

        // 1. Ensure chart of accounts exists
        var allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        if (!allAccounts.Any())
        {
            var seedAccounts = DefaultChartOfAccountsSeeder.GenerateDefaultAccounts(tenantId, companyId);
            await _accountRepo.AddRangeAsync(seedAccounts, cancellationToken);
            await _accountRepo.SaveChangesAsync(cancellationToken);
            allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        }

        // 2. Fetch posted lines for company in the selected period
        var periodLines = await _journalRepo.GetPostedLinesAsync(
            companyId,
            fromDate,
            toDate,
            request.CostCenterId,
            cancellationToken);

        // 3. Temporary working dictionary for all accounts
        var tempDict = new Dictionary<Guid, TempAccountData>();
        foreach (var acc in allAccounts)
        {
            tempDict[acc.Id] = new TempAccountData
            {
                AccountId = acc.Id,
                AccountCode = acc.AccountCode,
                NameAr = acc.NameAr,
                NameEn = acc.NameEn,
                AccountType = acc.AccountType,
                AccountNature = acc.AccountNature,
                Level = acc.Level,
                ParentAccountId = acc.ParentAccountId,
                IsPostable = acc.IsPostable
            };
        }

        // 4. Compute leaf / postable accounts balances
        foreach (var acc in allAccounts.Where(a => a.IsPostable))
        {
            var target = tempDict[acc.Id];

            // Opening Balance prior to fromDate
            var openingNet = await _journalRepo.GetAccountOpeningBalanceAsync(
                companyId,
                acc.Id,
                fromDate,
                acc.AccountNature,
                cancellationToken);

            if (acc.AccountNature == AccountNature.Debit)
            {
                if (openingNet >= 0)
                {
                    target.OpeningDebit = openingNet;
                    target.OpeningCredit = 0;
                }
                else
                {
                    target.OpeningDebit = 0;
                    target.OpeningCredit = Math.Abs(openingNet);
                }
            }
            else
            {
                if (openingNet >= 0)
                {
                    target.OpeningCredit = openingNet;
                    target.OpeningDebit = 0;
                }
                else
                {
                    target.OpeningCredit = 0;
                    target.OpeningDebit = Math.Abs(openingNet);
                }
            }

            // Period Debit & Credit
            var accLines = periodLines.Where(l => l.AccountId == acc.Id).ToList();
            target.PeriodDebit = accLines.Sum(l => l.Debit);
            target.PeriodCredit = accLines.Sum(l => l.Credit);

            // Ending Debit & Credit
            if (acc.AccountNature == AccountNature.Debit)
            {
                var netEnding = (target.OpeningDebit - target.OpeningCredit) + (target.PeriodDebit - target.PeriodCredit);
                if (netEnding >= 0)
                {
                    target.EndingDebit = netEnding;
                    target.EndingCredit = 0;
                }
                else
                {
                    target.EndingDebit = 0;
                    target.EndingCredit = Math.Abs(netEnding);
                }
            }
            else
            {
                var netEnding = (target.OpeningCredit - target.OpeningDebit) + (target.PeriodCredit - target.PeriodDebit);
                if (netEnding >= 0)
                {
                    target.EndingCredit = netEnding;
                    target.EndingDebit = 0;
                }
                else
                {
                    target.EndingCredit = 0;
                    target.EndingDebit = Math.Abs(netEnding);
                }
            }
        }

        // 5. Rollup amounts to parent accounts from deepest level upwards
        var nonPostableAccounts = allAccounts
            .Where(a => !a.IsPostable)
            .OrderByDescending(a => a.Level)
            .ToList();

        foreach (var parent in nonPostableAccounts)
        {
            var parentData = tempDict[parent.Id];
            var directChildren = tempDict.Values.Where(c => c.ParentAccountId == parent.Id).ToList();

            parentData.OpeningDebit = directChildren.Sum(c => c.OpeningDebit);
            parentData.OpeningCredit = directChildren.Sum(c => c.OpeningCredit);
            parentData.PeriodDebit = directChildren.Sum(c => c.PeriodDebit);
            parentData.PeriodCredit = directChildren.Sum(c => c.PeriodCredit);
            parentData.EndingDebit = directChildren.Sum(c => c.EndingDebit);
            parentData.EndingCredit = directChildren.Sum(c => c.EndingCredit);
        }

        // 6. Calculate total trial balance sums from postable accounts
        var leafData = tempDict.Values.Where(v => v.IsPostable).ToList();
        var totalOpeningDebit = leafData.Sum(v => v.OpeningDebit);
        var totalOpeningCredit = leafData.Sum(v => v.OpeningCredit);
        var totalPeriodDebit = leafData.Sum(v => v.PeriodDebit);
        var totalPeriodCredit = leafData.Sum(v => v.PeriodCredit);
        var totalEndingDebit = leafData.Sum(v => v.EndingDebit);
        var totalEndingCredit = leafData.Sum(v => v.EndingCredit);

        var balanceDiff = Math.Abs(totalEndingDebit - totalEndingCredit);
        var isBalanced = balanceDiff < 0.01m;

        // 7. Assemble hierarchical DTO tree
        var dtoList = new List<TrialBalanceAccountDto>();
        var dtoLookup = new Dictionary<Guid, TrialBalanceAccountDto>();

        foreach (var item in tempDict.Values.OrderBy(x => x.AccountCode))
        {
            var dto = new TrialBalanceAccountDto(
                item.AccountId,
                item.AccountCode,
                item.NameAr,
                item.NameEn,
                item.AccountType,
                item.AccountNature,
                item.Level,
                item.ParentAccountId,
                item.IsPostable,
                item.OpeningDebit,
                item.OpeningCredit,
                item.PeriodDebit,
                item.PeriodCredit,
                item.EndingDebit,
                item.EndingCredit,
                new List<TrialBalanceAccountDto>()
            );

            dtoLookup[item.AccountId] = dto;
        }

        var rootNodes = new List<TrialBalanceAccountDto>();
        foreach (var dto in dtoLookup.Values)
        {
            if (dto.ParentAccountId.HasValue && dtoLookup.TryGetValue(dto.ParentAccountId.Value, out var parentDto))
            {
                parentDto.SubAccounts.Add(dto);
            }
            else
            {
                rootNodes.Add(dto);
            }
        }

        // Sort children recursively
        void SortRecursive(List<TrialBalanceAccountDto> nodes)
        {
            nodes.Sort((a, b) => string.Compare(a.AccountCode, b.AccountCode, StringComparison.Ordinal));
            foreach (var node in nodes)
            {
                if (node.SubAccounts.Any())
                {
                    SortRecursive(node.SubAccounts);
                }
            }
        }
        SortRecursive(rootNodes);

        // 8. Filter by HideZeroBalances and MaxLevel if requested
        List<TrialBalanceAccountDto> FilterTree(List<TrialBalanceAccountDto> nodes)
        {
            var result = new List<TrialBalanceAccountDto>();

            foreach (var node in nodes)
            {
                if (request.MaxLevel.HasValue && node.Level > request.MaxLevel.Value)
                {
                    continue;
                }

                var filteredSubs = FilterTree(node.SubAccounts);

                var isZero = node.OpeningDebit == 0 &&
                             node.OpeningCredit == 0 &&
                             node.PeriodDebit == 0 &&
                             node.PeriodCredit == 0 &&
                             node.EndingDebit == 0 &&
                             node.EndingCredit == 0;

                if (request.HideZeroBalances && isZero && !filteredSubs.Any())
                {
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(request.SearchTerm))
                {
                    var term = request.SearchTerm.Trim().ToLower();
                    var matchesSelf = node.AccountCode.ToLower().Contains(term) ||
                                      node.NameAr.ToLower().Contains(term) ||
                                      node.NameEn.ToLower().Contains(term);

                    if (!matchesSelf && !filteredSubs.Any())
                    {
                        continue;
                    }
                }

                var cloned = node with { SubAccounts = filteredSubs };
                result.Add(cloned);
            }

            return result;
        }

        var finalAccountsTree = FilterTree(rootNodes);

        var report = new TrialBalanceReportDto(
            fromDate,
            toDate,
            totalOpeningDebit,
            totalOpeningCredit,
            totalPeriodDebit,
            totalPeriodCredit,
            totalEndingDebit,
            totalEndingCredit,
            isBalanced,
            balanceDiff,
            allAccounts.Count,
            finalAccountsTree
        );

        return Result.Success(report);
    }

    private class TempAccountData
    {
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; } = string.Empty;
        public string NameAr { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public AccountType AccountType { get; set; }
        public AccountNature AccountNature { get; set; }
        public int Level { get; set; }
        public Guid? ParentAccountId { get; set; }
        public bool IsPostable { get; set; }
        public decimal OpeningDebit { get; set; }
        public decimal OpeningCredit { get; set; }
        public decimal PeriodDebit { get; set; }
        public decimal PeriodCredit { get; set; }
        public decimal EndingDebit { get; set; }
        public decimal EndingCredit { get; set; }
    }
}
