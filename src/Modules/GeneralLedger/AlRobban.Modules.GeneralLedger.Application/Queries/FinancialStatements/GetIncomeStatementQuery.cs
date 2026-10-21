using AlRobban.Modules.GeneralLedger.Application.Common;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FinancialStatements;

public record GetIncomeStatementQuery(
    Guid? CompanyId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    Guid? CostCenterId = null,
    int? MaxLevel = null,
    bool? HideZeroBalances = null,
    string? PresentationFormat = null) : IRequest<Result<IncomeStatementReportDto>>;

public class GetIncomeStatementQueryHandler : IRequestHandler<GetIncomeStatementQuery, Result<IncomeStatementReportDto>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly IFinancialSettingsRepository _settingsRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetIncomeStatementQueryHandler(
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

    public async Task<Result<IncomeStatementReportDto>> Handle(GetIncomeStatementQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        // 1. Date Range defaults (Current Fiscal Year: from Jan 1st to today / specified)
        var now = DateTime.UtcNow;
        var fromDate = request.FromDate ?? new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var toDate = request.ToDate ?? new DateTime(now.Year, 12, 31, 23, 59, 59, DateTimeKind.Utc);

        var presentationFormat = string.IsNullOrWhiteSpace(request.PresentationFormat) ? "multi-step" : request.PresentationFormat.ToLowerInvariant();
        var hideZero = request.HideZeroBalances ?? true;
        var maxLevel = request.MaxLevel;

        // 2. Fetch Cost Center details if requested
        string? costCenterName = null;
        if (request.CostCenterId.HasValue)
        {
            var cc = await _settingsRepo.GetCostCenterByIdAsync(request.CostCenterId.Value, cancellationToken);
            if (cc != null) costCenterName = cc.NameAr;
        }

        // 3. Fetch all Accounts
        var allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        var plAccounts = allAccounts
            .Where(a => a.AccountType == AccountType.Revenue || a.AccountType == AccountType.Expense)
            .ToList();

        // 4. Fetch all Posted Journal Lines within the period directly
        var postedLines = await _journalRepo.GetPostedLinesAsync(companyId, fromDate, toDate, request.CostCenterId, cancellationToken);

        // 5. Compute net balance for each postable account
        var accountAmounts = new Dictionary<Guid, decimal>();

        foreach (var acc in plAccounts)
        {
            if (acc.IsPostable)
            {
                var lines = postedLines.Where(l => l.AccountId == acc.Id).ToList();
                var debit = lines.Sum(l => l.Debit);
                var credit = lines.Sum(l => l.Credit);

                decimal netAmount;
                if (acc.AccountType == AccountType.Revenue)
                {
                    // Natural credit balance for revenues
                    netAmount = credit - debit;
                }
                else
                {
                    // Natural debit balance for expenses
                    netAmount = debit - credit;
                }
                accountAmounts[acc.Id] = netAmount;
            }
            else
            {
                accountAmounts[acc.Id] = 0m;
            }
        }

        // 6. Rollup amounts upwards from deepest level
        var nonPostableAccounts = plAccounts
            .Where(a => !a.IsPostable)
            .OrderByDescending(a => a.Level)
            .ToList();

        foreach (var parent in nonPostableAccounts)
        {
            var children = plAccounts.Where(c => c.ParentAccountId == parent.Id).ToList();
            var sum = children.Sum(c => accountAmounts.TryGetValue(c.Id, out var val) ? val : 0m);
            accountAmounts[parent.Id] = sum;
        }

        // 7. Helper to build section items
        List<FinancialStatementItemDto> BuildSectionItems(string codePrefix, decimal baseRevenue)
        {
            var sectionAccounts = plAccounts
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
                    var pct = baseRevenue > 0 ? Math.Round((amt / baseRevenue) * 100, 2) : 0m;
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

        // 8. Calculate Totals by Group
        // 41: Operating Revenues
        var opRevAccount = plAccounts.FirstOrDefault(a => a.AccountCode == "41");
        var totalOpRev = opRevAccount != null ? accountAmounts.GetValueOrDefault(opRevAccount.Id, 0m) : 0m;
        if (totalOpRev == 0)
        {
            totalOpRev = plAccounts.Where(a => a.AccountCode.StartsWith("41") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        // 51: Cost of Goods Sold
        var cogsAccount = plAccounts.FirstOrDefault(a => a.AccountCode == "51");
        var totalCogs = cogsAccount != null ? accountAmounts.GetValueOrDefault(cogsAccount.Id, 0m) : 0m;
        if (totalCogs == 0)
        {
            totalCogs = plAccounts.Where(a => a.AccountCode.StartsWith("51") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        // Gross Profit
        var grossProfit = totalOpRev - totalCogs;
        var grossMarginPct = totalOpRev > 0 ? Math.Round((grossProfit / totalOpRev) * 100, 2) : 0m;

        // 52: Selling & Marketing
        var sellingAccount = plAccounts.FirstOrDefault(a => a.AccountCode == "52");
        var totalSelling = sellingAccount != null ? accountAmounts.GetValueOrDefault(sellingAccount.Id, 0m) : 0m;
        if (totalSelling == 0)
        {
            totalSelling = plAccounts.Where(a => a.AccountCode.StartsWith("52") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        // 53: General & Administrative
        var adminAccount = plAccounts.FirstOrDefault(a => a.AccountCode == "53");
        var totalAdmin = adminAccount != null ? accountAmounts.GetValueOrDefault(adminAccount.Id, 0m) : 0m;
        if (totalAdmin == 0)
        {
            totalAdmin = plAccounts.Where(a => a.AccountCode.StartsWith("53") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        var totalOpExpenses = totalSelling + totalAdmin;
        var operatingProfit = grossProfit - totalOpExpenses;
        var opMarginPct = totalOpRev > 0 ? Math.Round((operatingProfit / totalOpRev) * 100, 2) : 0m;

        // 42: Other Non-Operating Incomes
        var otherIncAccount = plAccounts.FirstOrDefault(a => a.AccountCode == "42");
        var totalOtherIncome = otherIncAccount != null ? accountAmounts.GetValueOrDefault(otherIncAccount.Id, 0m) : 0m;
        if (totalOtherIncome == 0)
        {
            totalOtherIncome = plAccounts.Where(a => a.AccountCode.StartsWith("42") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        // 54: Finance Costs & Zakat
        var finAccount = plAccounts.FirstOrDefault(a => a.AccountCode == "54");
        var totalFin = finAccount != null ? accountAmounts.GetValueOrDefault(finAccount.Id, 0m) : 0m;
        if (totalFin == 0)
        {
            totalFin = plAccounts.Where(a => a.AccountCode.StartsWith("54") && a.IsPostable).Sum(a => accountAmounts.GetValueOrDefault(a.Id, 0m));
        }

        var netProfitBeforeZakat = operatingProfit + totalOtherIncome - totalFin;
        var netProfitOrLoss = netProfitBeforeZakat; // In this chart of accounts 54 includes zakat
        var netMarginPct = totalOpRev > 0 ? Math.Round((netProfitOrLoss / totalOpRev) * 100, 2) : 0m;

        // 9. Build Sections
        var opRevSection = new FinancialStatementSectionDto("41", "إيرادات النشاط التشغيلي الرئيسي", "Operating Revenues", totalOpRev, null, 100m, BuildSectionItems("41", totalOpRev));
        var cogsSection = new FinancialStatementSectionDto("51", "تكلفة المبيعات والإيرادات (COGS)", "Cost of Goods Sold", totalCogs, null, totalOpRev > 0 ? Math.Round((totalCogs / totalOpRev) * 100, 2) : 0m, BuildSectionItems("51", totalOpRev));
        var sellingSection = new FinancialStatementSectionDto("52", "المصروفات البيعية والتسويقية", "Selling & Marketing Expenses", totalSelling, null, totalOpRev > 0 ? Math.Round((totalSelling / totalOpRev) * 100, 2) : 0m, BuildSectionItems("52", totalOpRev));
        var adminSection = new FinancialStatementSectionDto("53", "المصروفات العمومية والإدارية", "General & Administrative Expenses", totalAdmin, null, totalOpRev > 0 ? Math.Round((totalAdmin / totalOpRev) * 100, 2) : 0m, BuildSectionItems("53", totalOpRev));
        var otherIncSection = new FinancialStatementSectionDto("42", "إيرادات وأرباح أخرى غير تشغيلية", "Other Non-Operating Income", totalOtherIncome, null, totalOpRev > 0 ? Math.Round((totalOtherIncome / totalOpRev) * 100, 2) : 0m, BuildSectionItems("42", totalOpRev));
        var finSection = new FinancialStatementSectionDto("54", "تكاليف التمويل ومصروف الزكاة", "Finance Costs & Zakat", totalFin, null, totalOpRev > 0 ? Math.Round((totalFin / totalOpRev) * 100, 2) : 0m, BuildSectionItems("54", totalOpRev));

        var tafqeet = ArabicCurrencyTafqeet.Convert(netProfitOrLoss);

        var report = new IncomeStatementReportDto(
            CompanyId: companyId,
            CompanyNameAr: "شركة المحيط الذكي لتقنية المعلومات",
            CompanyNameEn: "Smart Ocean Information Technology Co.",
            CommercialRegistration: "1010789456",
            TaxNumber: "310245678900003",
            FromDate: fromDate,
            ToDate: toDate,
            Currency: "SAR",
            PresentationFormat: presentationFormat,
            CostCenterId: request.CostCenterId,
            CostCenterName: costCenterName,
            MaxLevel: maxLevel,
            HideZeroBalances: hideZero,

            OperatingRevenues: opRevSection,
            CostOfSales: cogsSection,
            GrossProfit: grossProfit,
            ComparativeGrossProfit: null,
            GrossMarginPercentage: grossMarginPct,

            SellingExpenses: sellingSection,
            GeneralAdminExpenses: adminSection,
            TotalOperatingExpenses: totalOpExpenses,
            OperatingProfit: operatingProfit,
            ComparativeOperatingProfit: null,
            OperatingMarginPercentage: opMarginPct,

            OtherIncome: otherIncSection,
            FinanceAndZakatCosts: finSection,
            TotalOtherExpenses: totalFin,

            NetProfitBeforeZakat: netProfitBeforeZakat,
            NetProfitOrLoss: netProfitOrLoss,
            ComparativeNetProfitOrLoss: null,
            NetMarginPercentage: netMarginPct,
            IsProfit: netProfitOrLoss >= 0,
            NetProfitTafqeetAr: tafqeet,
            GeneratedAtUtc: DateTime.UtcNow);

        return Result<IncomeStatementReportDto>.Success(report);
    }
}
