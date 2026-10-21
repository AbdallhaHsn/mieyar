using AlRobban.Modules.GeneralLedger.Application.Common;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FinancialStatements;

public record GetCashFlowStatementQuery(
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    Guid? CompanyId = null,
    Guid? CostCenterId = null,
    bool? HideZeroBalances = null,
    string? CashFlowMethod = null) : IRequest<Result<CashFlowStatementReportDto>>;

public class GetCashFlowStatementQueryHandler : IRequestHandler<GetCashFlowStatementQuery, Result<CashFlowStatementReportDto>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly IFinancialSettingsRepository _settingsRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetCashFlowStatementQueryHandler(
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

    public async Task<Result<CashFlowStatementReportDto>> Handle(GetCashFlowStatementQuery request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        // 1. Resolve Settings
        var statementSettings = await _settingsRepo.GetOrCreateStatementSettingsAsync(tenantId, companyId, cancellationToken);
        var companySettings = await _settingsRepo.GetOrCreateSettingsAsync(tenantId, companyId, cancellationToken);

        var now = DateTime.UtcNow;
        var fromDate = request.FromDate ?? new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var toDate = request.ToDate ?? new DateTime(now.Year, 12, 31, 23, 59, 59, DateTimeKind.Utc);
        var hideZero = request.HideZeroBalances ?? statementSettings.DefaultHideZeroBalances;
        var method = request.CashFlowMethod ?? statementSettings.CashFlowMethod ?? "indirect";
        var cashPrefix = statementSettings.CashAccountPrefix ?? "111";

        string? costCenterName = null;
        if (request.CostCenterId.HasValue)
        {
            var cc = await _settingsRepo.GetCostCenterByIdAsync(request.CostCenterId.Value, cancellationToken);
            if (cc != null) costCenterName = cc.NameAr;
        }

        // 2. Fetch all Accounts
        var allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        var accountMap = allAccounts.ToDictionary(a => a.Id);

        // 3. Fetch Journal Lines for:
        // A) Before fromDate (to compute beginning balances of balance sheet items)
        var priorLines = await _journalRepo.GetPostedLinesAsync(companyId, DateTime.MinValue, fromDate.AddTicks(-1), request.CostCenterId, cancellationToken);
        // B) Within the period (fromDate to toDate)
        var periodLines = await _journalRepo.GetPostedLinesAsync(companyId, fromDate, toDate, request.CostCenterId, cancellationToken);
        // C) Up to toDate (to compute ending balances)
        var cumulativeLines = await _journalRepo.GetPostedLinesAsync(companyId, DateTime.MinValue, toDate, request.CostCenterId, cancellationToken);

        // Group lines by account
        var priorByAccount = priorLines.GroupBy(l => l.AccountId).ToDictionary(g => g.Key, g => g.ToList());
        var periodByAccount = periodLines.GroupBy(l => l.AccountId).ToDictionary(g => g.Key, g => g.ToList());
        var cumByAccount = cumulativeLines.GroupBy(l => l.AccountId).ToDictionary(g => g.Key, g => g.ToList());

        // Helper to get natural balance for an account
        decimal GetBalance(Guid accountId, Dictionary<Guid, List<JournalEntryLine>> linesDict, AccountType type)
        {
            if (!linesDict.TryGetValue(accountId, out var lines)) return 0m;
            var debit = lines.Sum(l => l.Debit);
            var credit = lines.Sum(l => l.Credit);

            return type switch
            {
                AccountType.Asset or AccountType.Expense => debit - credit,
                AccountType.Liability or AccountType.Equity or AccountType.Revenue => credit - debit,
                _ => debit - credit
            };
        }

        // 4. Calculate Net Profit/Loss from P&L accounts for the period
        var plAccounts = allAccounts.Where(a => a.IsPostable && (a.AccountType == AccountType.Revenue || a.AccountType == AccountType.Expense)).ToList();
        decimal totalRevenues = 0m;
        decimal totalExpenses = 0m;

        foreach (var acc in plAccounts)
        {
            if (!periodByAccount.TryGetValue(acc.Id, out var lines)) continue;
            var debit = lines.Sum(l => l.Debit);
            var credit = lines.Sum(l => l.Credit);

            if (acc.AccountType == AccountType.Revenue)
                totalRevenues += (credit - debit);
            else
                totalExpenses += (debit - credit);
        }
        var netProfitOrLoss = totalRevenues - totalExpenses;

        // 5. Non-Cash Adjustments (التسويات غير النقدية)
        var nonCashItems = new List<FinancialStatementItemDto>();

        // 5.1 Depreciation & Amortization (حسابات استهلاك الأصول الثابتة 53102, 53103 ومجمعات الاستهلاك 12102, 12104, 12106)
        var deprAccounts = allAccounts.Where(a => a.IsPostable && 
            (a.AccountCode.StartsWith("53102") || a.AccountCode.StartsWith("53103") || 
             a.AccountCode.StartsWith("12102") || a.AccountCode.StartsWith("12104") || a.AccountCode.StartsWith("12106"))).ToList();
        decimal deprAmount = 0m;
        foreach (var da in deprAccounts)
        {
            if (periodByAccount.TryGetValue(da.Id, out var lines))
            {
                var val = da.AccountType == AccountType.Expense ? lines.Sum(l => l.Debit - l.Credit) : lines.Sum(l => l.Credit - l.Debit);
                if (val != 0m)
                {
                    deprAmount += val;
                    nonCashItems.Add(new FinancialStatementItemDto(da.Id, da.AccountCode, "إهلاك واستهلاك الأصول: " + da.NameAr, da.NameEn, 3, true, val));
                }
            }
        }
        if (!nonCashItems.Any(x => x.AccountCode.StartsWith("53102") || x.AccountCode.StartsWith("12102")) && !hideZero)
        {
            nonCashItems.Add(new FinancialStatementItemDto(Guid.Empty, "53102", "استهلاك وإطفاء الأصول الثابتة", "Depreciation & Amortization", 3, true, 0m));
        }

        // 5.2 End of Service Benefits Provision (مخصص مكافأة نهاية الخدمة 53106 / 21301)
        var eosbAccounts = allAccounts.Where(a => a.IsPostable && (a.AccountCode.StartsWith("53106") || a.AccountCode.StartsWith("21301") || a.AccountCode.StartsWith("22201"))).ToList();
        decimal eosbAmount = 0m;
        foreach (var ea in eosbAccounts)
        {
            if (periodByAccount.TryGetValue(ea.Id, out var lines))
            {
                var val = ea.AccountType == AccountType.Expense ? lines.Sum(l => l.Debit - l.Credit) : lines.Sum(l => l.Credit - l.Debit);
                if (val != 0m)
                {
                    eosbAmount += val;
                    nonCashItems.Add(new FinancialStatementItemDto(ea.Id, ea.AccountCode, "مخصص مكافأة نهاية الخدمة: " + ea.NameAr, ea.NameEn, 3, true, val));
                }
            }
        }
        if (!nonCashItems.Any(x => x.AccountCode.StartsWith("53106")) && !hideZero)
        {
            nonCashItems.Add(new FinancialStatementItemDto(Guid.Empty, "53106", "مخصص مكافأة نهاية الخدمة للعاملين", "Provision for Employees' End of Service Benefits", 3, true, 0m));
        }

        // 5.3 ECL / Bad Debts Provision (مخصص الخسائر الائتمانية 53107 / 11202)
        var eclAccounts = allAccounts.Where(a => a.IsPostable && (a.AccountCode.StartsWith("53107") || a.AccountCode.StartsWith("11202"))).ToList();
        foreach (var ea in eclAccounts)
        {
            if (periodByAccount.TryGetValue(ea.Id, out var lines))
            {
                var val = ea.AccountType == AccountType.Expense ? lines.Sum(l => l.Debit - l.Credit) : lines.Sum(l => l.Credit - l.Debit);
                if (val != 0m)
                {
                    nonCashItems.Add(new FinancialStatementItemDto(ea.Id, ea.AccountCode, "مخصص خسائر ائتمانية متوقعة: " + ea.NameAr, ea.NameEn, 3, true, val));
                }
            }
        }

        decimal totalNonCash = nonCashItems.Sum(i => i.Amount);
        var nonCashSection = new FinancialStatementSectionDto(
            "NC-ADJ",
            "تسويات البنود غير النقدية",
            "Non-Cash Adjustments",
            totalNonCash,
            null,
            0m,
            nonCashItems);

        var opProfitBeforeWC = netProfitOrLoss + totalNonCash;

        // 6. Working Capital Changes (التغيرات في بنود رأس المال العامل التشغيلي)
        var wcItems = new List<FinancialStatementItemDto>();

        // 6.1 Trade Receivables & Customers (11201 / 112)
        // Cash effect = -(Ending - Opening)
        var arAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("112") && !a.AccountCode.StartsWith("11202")).ToList();
        decimal arOpen = arAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Asset));
        decimal arEnd = arAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Asset));
        decimal arChange = arEnd - arOpen;
        decimal arCashEffect = -arChange;
        if (arCashEffect != 0m || !hideZero)
        {
            wcItems.Add(new FinancialStatementItemDto(Guid.Empty, "112", "(الزيادة) / النقص في المدينين والعملاء التجاريين", "Change in Trade Receivables", 2, true, arCashEffect));
        }

        // 6.2 Inventory (113)
        var invAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("113")).ToList();
        decimal invOpen = invAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Asset));
        decimal invEnd = invAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Asset));
        decimal invChange = invEnd - invOpen;
        decimal invCashEffect = -invChange;
        if (invCashEffect != 0m || !hideZero)
        {
            wcItems.Add(new FinancialStatementItemDto(Guid.Empty, "113", "(الزيادة) / النقص في المخزون السلعي", "Change in Inventories", 2, true, invCashEffect));
        }

        // 6.3 Prepayments and other debit balances (114)
        var prepayAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("114")).ToList();
        decimal prepayOpen = prepayAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Asset));
        decimal prepayEnd = prepayAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Asset));
        decimal prepayChange = prepayEnd - prepayOpen;
        decimal prepayCashEffect = -prepayChange;
        if (prepayCashEffect != 0m || !hideZero)
        {
            wcItems.Add(new FinancialStatementItemDto(Guid.Empty, "114", "(الزيادة) / النقص في المصروفات المدفوعة مقدماً والأرصدة المدينة", "Change in Prepayments & Other Receivables", 2, true, prepayCashEffect));
        }

        // 6.4 Trade Payables and suppliers (211)
        // Cash effect = +(Ending - Opening)
        var apAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("211")).ToList();
        decimal apOpen = apAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Liability));
        decimal apEnd = apAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Liability));
        decimal apChange = apEnd - apOpen;
        decimal apCashEffect = apChange;
        if (apCashEffect != 0m || !hideZero)
        {
            wcItems.Add(new FinancialStatementItemDto(Guid.Empty, "211", "الزيادة / (النقص) في الدائنين والموردين التجاريين", "Change in Trade Payables", 2, true, apCashEffect));
        }

        // 6.5 VAT and Tax liabilities (212)
        var vatAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("212")).ToList();
        decimal vatOpen = vatAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Liability));
        decimal vatEnd = vatAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Liability));
        decimal vatChange = vatEnd - vatOpen;
        decimal vatCashEffect = vatChange;
        if (vatCashEffect != 0m || !hideZero)
        {
            wcItems.Add(new FinancialStatementItemDto(Guid.Empty, "212", "الزيادة / (النقص) في ضريبة القيمة المضافة المستحقة", "Change in Value Added Tax Payable", 2, true, vatCashEffect));
        }

        // 6.6 Accruals and deferred revenue (213)
        var accrualAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("213") && !a.AccountCode.StartsWith("21301")).ToList();
        decimal accOpen = accrualAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Liability));
        decimal accEnd = accrualAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Liability));
        decimal accChange = accEnd - accOpen;
        decimal accCashEffect = accChange;
        if (accCashEffect != 0m || !hideZero)
        {
            wcItems.Add(new FinancialStatementItemDto(Guid.Empty, "213", "الزيادة / (النقص) في المصروفات المستحقة والإيرادات المقدمة", "Change in Accrued Expenses & Deferred Revenue", 2, true, accCashEffect));
        }

        decimal totalWc = wcItems.Sum(i => i.Amount);
        var wcSection = new FinancialStatementSectionDto(
            "WC-CHG",
            "التغيرات في رأس المال العامل التشغيلي",
            "Working Capital Changes",
            totalWc,
            null,
            0m,
            wcItems);

        var netCashOperating = opProfitBeforeWC + totalWc;

        // 7. Investing Activities (الأنشطة الاستثمارية)
        var invItems = new List<FinancialStatementItemDto>();

        // 7.1 Fixed Assets CapEx (121, 122 excluding contra-asset depreciation accounts)
        var faAccounts = allAccounts.Where(a => a.IsPostable && 
            (a.AccountCode.StartsWith("121") || a.AccountCode.StartsWith("122")) &&
            !a.AccountCode.StartsWith("12102") && !a.AccountCode.StartsWith("12104") && !a.AccountCode.StartsWith("12106")).ToList();
        decimal faAdditions = 0m;
        decimal faDisposals = 0m;
        foreach (var fa in faAccounts)
        {
            if (periodByAccount.TryGetValue(fa.Id, out var lines))
            {
                var debits = lines.Sum(l => l.Debit);
                var credits = lines.Sum(l => l.Credit);
                if (debits > 0) faAdditions += debits;
                if (credits > 0) faDisposals += credits;
            }
        }
        if (faAdditions > 0 || !hideZero)
        {
            invItems.Add(new FinancialStatementItemDto(Guid.Empty, "121-IN", "(المدفوعات النقدية لشراء وإضافات أصول ثابتة ومعدات)", "Purchase of Property, Plant & Equipment (CapEx)", 2, true, -faAdditions));
        }
        if (faDisposals > 0)
        {
            invItems.Add(new FinancialStatementItemDto(Guid.Empty, "121-OUT", "المتحصلات النقدية من بيع واستبعاد أصول ثابتة", "Proceeds from Sale of Property, Plant & Equipment", 2, true, faDisposals));
        }

        // 7.2 Projects Under Construction / Intangibles (123 / 124)
        var projAccounts = allAccounts.Where(a => a.IsPostable && (a.AccountCode.StartsWith("123") || a.AccountCode.StartsWith("124"))).ToList();
        decimal projOpen = projAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Asset));
        decimal projEnd = projAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Asset));
        decimal projChange = projEnd - projOpen;
        if (projChange != 0m)
        {
            invItems.Add(new FinancialStatementItemDto(Guid.Empty, "123", "(المدفوعات النقدية لمشاريع قيد التنفيذ وأصول غير ملموسة)", "Payments for Projects in Progress & Intangibles", 2, true, -projChange));
        }

        decimal totalInvesting = invItems.Sum(i => i.Amount);
        var investingSection = new FinancialStatementSectionDto(
            "INV-ACT",
            "التدفقات النقدية من الأنشطة الاستثمارية",
            "Cash Flows from Investing Activities",
            totalInvesting,
            null,
            0m,
            invItems);

        // 8. Financing Activities (الأنشطة التمويلية)
        var finItems = new List<FinancialStatementItemDto>();

        // 8.1 Paid-in Capital changes (31)
        var capAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("31")).ToList();
        decimal capOpen = capAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Equity));
        decimal capEnd = capAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Equity));
        decimal capChange = capEnd - capOpen;
        if (capChange != 0m || !hideZero)
        {
            finItems.Add(new FinancialStatementItemDto(Guid.Empty, "31", "المتحصلات النقدية من زيادة رأس المال ومساهمات الشركاء", "Proceeds from Capital Increase & Shareholder Injections", 2, true, capChange));
        }

        // 8.2 Partners / Shareholders Current Accounts & Withdrawals (32)
        var partnerAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("32")).ToList();
        decimal partnerOpen = partnerAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Equity));
        decimal partnerEnd = partnerAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Equity));
        decimal partnerChange = partnerEnd - partnerOpen;
        if (partnerChange != 0m)
        {
            finItems.Add(new FinancialStatementItemDto(Guid.Empty, "32", "صافي حركة الحسابات الجارية للشركاء والمسحوبات الشخصية", "Net Movements in Owners' Current Accounts & Drawings", 2, true, partnerChange));
        }

        // 8.3 Long-Term Bank Loans & Borrowings (221)
        var loanAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith("221")).ToList();
        decimal loanOpen = loanAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Liability));
        decimal loanEnd = loanAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Liability));
        decimal loanChange = loanEnd - loanOpen;
        if (loanChange != 0m || !hideZero)
        {
            finItems.Add(new FinancialStatementItemDto(Guid.Empty, "221", "المتحصلات النقدية من / (سداد) قروض وتسهيلات بنكية طويلة الأجل", "Net Proceeds from / (Repayment of) Long-Term Borrowings", 2, true, loanChange));
        }

        decimal totalFinancing = finItems.Sum(i => i.Amount);
        var financingSection = new FinancialStatementSectionDto(
            "FIN-ACT",
            "التدفقات النقدية من الأنشطة التمويلية",
            "Cash Flows from Financing Activities",
            totalFinancing,
            null,
            0m,
            finItems);

        // 9. Net Change in Cash & Cash Equivalents
        decimal netChangeInCash = netCashOperating + totalInvesting + totalFinancing;

        // 10. Cash at Beginning & End of Period (Accounts starting with cashPrefix - typically 111)
        var cashAccounts = allAccounts.Where(a => a.IsPostable && a.AccountCode.StartsWith(cashPrefix)).ToList();
        decimal cashBeginning = cashAccounts.Sum(a => GetBalance(a.Id, priorByAccount, AccountType.Asset));
        decimal actualCashEnding = cashAccounts.Sum(a => GetBalance(a.Id, cumByAccount, AccountType.Asset));
        decimal calculatedCashEnding = cashBeginning + netChangeInCash;

        // In accounting math: Reconciliation difference
        decimal reconciliationDiff = Math.Round(actualCashEnding - calculatedCashEnding, 2);
        bool isReconciled = Math.Abs(reconciliationDiff) <= 0.05m;

        // Tafqeet in Arabic
        string tafqeet = ArabicCurrencyTafqeet.Convert(netChangeInCash);

        var report = new CashFlowStatementReportDto(
            CompanyId: companyId,
            CompanyNameAr: "شركة المحيط الذكي لتقنية المعلومات",
            CompanyNameEn: "Smart Ocean Information Technology Co.",
            CommercialRegistration: "1010789456",
            TaxNumber: "310245678900003",
            FromDate: fromDate,
            ToDate: toDate,
            Currency: companySettings.DefaultCurrency ?? "SAR",
            CashFlowMethod: method,
            CostCenterId: request.CostCenterId,
            CostCenterName: costCenterName,
            HideZeroBalances: hideZero,

            StartingNetProfitOrLoss: netProfitOrLoss,
            NonCashAdjustments: nonCashSection,
            OperatingProfitBeforeWorkingCapitalChanges: opProfitBeforeWC,
            WorkingCapitalChanges: wcSection,
            NetCashFromOperatingActivities: netCashOperating,
            ComparativeNetCashFromOperatingActivities: null,

            InvestingActivities: investingSection,
            NetCashFromInvestingActivities: totalInvesting,
            ComparativeNetCashFromInvestingActivities: null,

            FinancingActivities: financingSection,
            NetCashFromFinancingActivities: totalFinancing,
            ComparativeNetCashFromFinancingActivities: null,

            NetChangeInCashAndEquivalents: netChangeInCash,
            CashAtBeginningOfPeriod: cashBeginning,
            CashAtEndOfPeriod: calculatedCashEnding,
            ActualCashBalanceInGeneralLedger: actualCashEnding,
            IsReconciled: isReconciled,
            ReconciliationDifference: reconciliationDiff,
            NetCashTafqeetAr: tafqeet,
            GeneratedAtUtc: DateTime.UtcNow);

        return Result<CashFlowStatementReportDto>.Success(report);
    }
}
