using AlRobban.Modules.GeneralLedger.Application.Common;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FinancialStatements;

public record GetBalanceSheetQuery(
    Guid? CompanyId = null,
    DateTime? AsOfDate = null,
    Guid? CostCenterId = null,
    int? MaxLevel = null,
    bool? HideZeroBalances = null) : IRequest<Result<BalanceSheetReportDto>>;

public class GetBalanceSheetQueryHandler : IRequestHandler<GetBalanceSheetQuery, Result<BalanceSheetReportDto>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly IFinancialSettingsRepository _settingsRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetBalanceSheetQueryHandler(
        IAccountRepository accountRepo,
        IJournalEntryRepository journalRepo,
        IFinancialSettingsRepository settingsRepo,
        ICurrentTenantContext tenantContext)
    {
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
        _settingsRepo = settingsRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<BalanceSheetReportDto>> Handle(GetBalanceSheetQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        var now = DateTime.UtcNow;
        var asOfDate = request.AsOfDate ?? new DateTime(now.Year, now.Month, now.Day, 23, 59, 59, DateTimeKind.Utc);
        var hideZero = request.HideZeroBalances ?? true;
        var maxLevel = request.MaxLevel;

        // 1. Fetch Cost Center details if requested
        string? costCenterName = null;
        if (request.CostCenterId.HasValue)
        {
            var cc = await _settingsRepo.GetCostCenterByIdAsync(request.CostCenterId.Value, cancellationToken);
            if (cc != null) costCenterName = cc.NameAr;
        }

        // 2. Fetch all Accounts for the company
        var allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);

        // 3. Fetch all Posted Journal Lines up to AsOfDate directly
        var postedLines = await _journalRepo.GetPostedLinesAsync(companyId, null, asOfDate, request.CostCenterId, cancellationToken);

        // 4. Compute ending net balance for each postable account
        var accountAmounts = new Dictionary<Guid, decimal>();

        foreach (var acc in allAccounts)
        {
            if (acc.IsPostable)
            {
                var lines = postedLines.Where(l => l.AccountId == acc.Id).ToList();
                var debit = lines.Sum(l => l.Debit);
                var credit = lines.Sum(l => l.Credit);

                decimal netAmount;
                if (acc.AccountNature == AccountNature.Debit)
                {
                    netAmount = debit - credit;
                }
                else
                {
                    netAmount = credit - debit;
                }

                accountAmounts[acc.Id] = netAmount;
            }
            else
            {
                accountAmounts[acc.Id] = 0m;
            }
        }

        // 5. Rollup amounts upwards from deepest level
        var nonPostableAccounts = allAccounts
            .Where(a => !a.IsPostable)
            .OrderByDescending(a => a.Level)
            .ToList();

        foreach (var parent in nonPostableAccounts)
        {
            var children = allAccounts.Where(c => c.ParentAccountId == parent.Id).ToList();
            var sum = children.Sum(c => accountAmounts.GetValueOrDefault(c.Id, 0m));
            accountAmounts[parent.Id] = sum;
        }

        // 6. Calculate Net Income (P&L) for current period: Revenues (Code 4) - Expenses (Code 5)
        var revenueAccounts = allAccounts.Where(a => a.AccountType == AccountType.Revenue && a.IsPostable).ToList();
        var expenseAccounts = allAccounts.Where(a => a.AccountType == AccountType.Expense && a.IsPostable).ToList();

        decimal totalPeriodRevenues = 0m;
        foreach (var rev in revenueAccounts)
        {
            var lines = postedLines.Where(l => l.AccountId == rev.Id).ToList();
            totalPeriodRevenues += (lines.Sum(l => l.Credit) - lines.Sum(l => l.Debit));
        }

        decimal totalPeriodExpenses = 0m;
        foreach (var exp in expenseAccounts)
        {
            var lines = postedLines.Where(l => l.AccountId == exp.Id).ToList();
            totalPeriodExpenses += (lines.Sum(l => l.Debit) - lines.Sum(l => l.Credit));
        }

        var currentPeriodNetIncome = totalPeriodRevenues - totalPeriodExpenses;

        // 7. Helper to build section items
        List<FinancialStatementItemDto> BuildSectionItems(string codePrefix, decimal baseTotal)
        {
            var sectionAccounts = allAccounts
                .Where(a => a.AccountCode.StartsWith(codePrefix))
                .ToList();

            if (maxLevel.HasValue)
            {
                sectionAccounts = sectionAccounts.Where(a => a.Level <= maxLevel.Value).ToList();
            }

            if (hideZero)
            {
                sectionAccounts = sectionAccounts.Where(a => Math.Abs(accountAmounts.GetValueOrDefault(a.Id, 0m)) > 0).ToList();
            }

            return sectionAccounts
                .OrderBy(a => a.AccountCode)
                .Select(a =>
                {
                    var amt = accountAmounts.GetValueOrDefault(a.Id, 0m);
                    var pct = baseTotal > 0 ? Math.Round((amt / baseTotal) * 100, 2) : 0m;
                    return new FinancialStatementItemDto(
                        a.Id,
                        a.AccountCode,
                        a.NameAr,
                        a.NameEn,
                        a.Level,
                        a.IsPostable,
                        amt,
                        null,
                        pct,
                        null);
                })
                .ToList();
        }

        // 8. Calculate Totals
        // Current Assets (11)
        var curAssetsAcc = allAccounts.FirstOrDefault(a => a.AccountCode == "11");
        var totalCurrentAssets = curAssetsAcc != null ? accountAmounts.GetValueOrDefault(curAssetsAcc.Id, 0m) : 0m;
        if (totalCurrentAssets == 0)
        {
            totalCurrentAssets = allAccounts.Where(a => a.AccountCode.StartsWith("11") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        // Non-Current Assets (12)
        var nonCurAssetsAcc = allAccounts.FirstOrDefault(a => a.AccountCode == "12");
        var totalNonCurrentAssets = nonCurAssetsAcc != null ? accountAmounts.GetValueOrDefault(nonCurAssetsAcc.Id, 0m) : 0m;
        if (totalNonCurrentAssets == 0)
        {
            totalNonCurrentAssets = allAccounts.Where(a => a.AccountCode.StartsWith("12") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        var totalAssets = totalCurrentAssets + totalNonCurrentAssets;

        // Current Liabilities (21)
        var curLiabAcc = allAccounts.FirstOrDefault(a => a.AccountCode == "21");
        var totalCurrentLiabilities = curLiabAcc != null ? accountAmounts.GetValueOrDefault(curLiabAcc.Id, 0m) : 0m;
        if (totalCurrentLiabilities == 0)
        {
            totalCurrentLiabilities = allAccounts.Where(a => a.AccountCode.StartsWith("21") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        // Non-Current Liabilities (22)
        var nonCurLiabAcc = allAccounts.FirstOrDefault(a => a.AccountCode == "22");
        var totalNonCurrentLiabilities = nonCurLiabAcc != null ? accountAmounts.GetValueOrDefault(nonCurLiabAcc.Id, 0m) : 0m;
        if (totalNonCurrentLiabilities == 0)
        {
            totalNonCurrentLiabilities = allAccounts.Where(a => a.AccountCode.StartsWith("22") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        var totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

        // Equity Items (3)
        var eqAcc = allAccounts.FirstOrDefault(a => a.AccountCode == "3");
        var directEquityTotal = eqAcc != null ? accountAmounts.GetValueOrDefault(eqAcc.Id, 0m) : 0m;
        if (directEquityTotal == 0)
        {
            directEquityTotal = allAccounts.Where(a => a.AccountCode.StartsWith("3") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        // Total Equity includes direct equity accounts + current period net profit
        var totalEquity = directEquityTotal + currentPeriodNetIncome;
        var totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        var balanceDiff = Math.Round(totalAssets - totalLiabilitiesAndEquity, 4);
        var isBalanced = Math.Abs(balanceDiff) < 0.01m;

        // Financial Ratios
        var workingCapital = totalCurrentAssets - totalCurrentLiabilities;
        var currentRatio = totalCurrentLiabilities > 0 ? Math.Round(totalCurrentAssets / totalCurrentLiabilities, 2) : 0m;
        var debtToEquity = totalEquity > 0 ? Math.Round((totalLiabilities / totalEquity) * 100, 2) : 0m;

        // 9. Build Sections
        var curAssetsSection = new FinancialStatementSectionDto("11", "الأصول المتداولة", "Current Assets", totalCurrentAssets, null, totalAssets > 0 ? Math.Round((totalCurrentAssets / totalAssets) * 100, 2) : 0m, BuildSectionItems("11", totalAssets));
        var nonCurAssetsSection = new FinancialStatementSectionDto("12", "الأصول غير المتداولة", "Non-Current Assets", totalNonCurrentAssets, null, totalAssets > 0 ? Math.Round((totalNonCurrentAssets / totalAssets) * 100, 2) : 0m, BuildSectionItems("12", totalAssets));

        var curLiabSection = new FinancialStatementSectionDto("21", "الالتزامات المتداولة", "Current Liabilities", totalCurrentLiabilities, null, totalLiabilities > 0 ? Math.Round((totalCurrentLiabilities / totalLiabilities) * 100, 2) : 0m, BuildSectionItems("21", totalLiabilities));
        var nonCurLiabSection = new FinancialStatementSectionDto("22", "الالتزامات غير المتداولة", "Non-Current Liabilities", totalNonCurrentLiabilities, null, totalLiabilities > 0 ? Math.Round((totalNonCurrentLiabilities / totalLiabilities) * 100, 2) : 0m, BuildSectionItems("22", totalLiabilities));

        var equitySection = new FinancialStatementSectionDto("3", "حقوق الملكية ورأس المال", "Equity & Capital", totalEquity, null, totalLiabilitiesAndEquity > 0 ? Math.Round((totalEquity / totalLiabilitiesAndEquity) * 100, 2) : 0m, BuildSectionItems("3", totalLiabilitiesAndEquity));

        var tafqeet = ArabicCurrencyTafqeet.Convert(totalAssets);

        var report = new BalanceSheetReportDto(
            CompanyId: companyId,
            CompanyNameAr: "شركة المحيط الذكي لتقنية المعلومات",
            CompanyNameEn: "Smart Ocean Information Technology Co.",
            CommercialRegistration: "1010789456",
            TaxNumber: "310245678900003",
            AsOfDate: asOfDate,
            Currency: "SAR",
            CostCenterId: request.CostCenterId,
            CostCenterName: costCenterName,
            MaxLevel: maxLevel,
            HideZeroBalances: hideZero,

            CurrentAssets: curAssetsSection,
            NonCurrentAssets: nonCurAssetsSection,
            TotalAssets: totalAssets,
            ComparativeTotalAssets: null,

            CurrentLiabilities: curLiabSection,
            NonCurrentLiabilities: nonCurLiabSection,
            TotalLiabilities: totalLiabilities,
            ComparativeTotalLiabilities: null,

            EquityItems: equitySection,
            CurrentPeriodNetIncome: currentPeriodNetIncome,
            TotalEquity: totalEquity,
            ComparativeTotalEquity: null,

            TotalLiabilitiesAndEquity: totalLiabilitiesAndEquity,
            IsBalanced: isBalanced,
            BalanceDifference: balanceDiff,

            WorkingCapital: workingCapital,
            CurrentRatio: currentRatio,
            DebtToEquityRatio: debtToEquity,
            TotalAssetsTafqeetAr: tafqeet,
            GeneratedAtUtc: DateTime.UtcNow);

        return Result<BalanceSheetReportDto>.Success(report);
    }
}
