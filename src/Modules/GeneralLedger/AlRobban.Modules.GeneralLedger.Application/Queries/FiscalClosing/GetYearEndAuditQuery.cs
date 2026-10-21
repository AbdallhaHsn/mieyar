using AlRobban.Modules.GeneralLedger.Application.Common;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FiscalClosing;

public record GetYearEndAuditQuery(Guid FiscalYearId) : IRequest<Result<YearEndAuditCheckDto>>;

public class GetYearEndAuditQueryHandler : IRequestHandler<GetYearEndAuditQuery, Result<YearEndAuditCheckDto>>
{
    private readonly IFinancialSettingsRepository _settingsRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly IAccountRepository _accountRepo;

    public GetYearEndAuditQueryHandler(
        IFinancialSettingsRepository settingsRepo,
        IJournalEntryRepository journalRepo,
        IAccountRepository accountRepo)
    {
        _settingsRepo = settingsRepo;
        _journalRepo = journalRepo;
        _accountRepo = accountRepo;
    }

    public async Task<Result<YearEndAuditCheckDto>> Handle(GetYearEndAuditQuery request, CancellationToken cancellationToken)
    {
        var year = await _settingsRepo.GetFiscalYearByIdAsync(request.FiscalYearId, cancellationToken);

        if (year == null)
        {
            return Result.Failure<YearEndAuditCheckDto>(new Error("FiscalYear.NotFound", "السنة المالية المطلوبة غير موجودة"));
        }

        var errors = new List<string>();
        var warnings = new List<string>();

        if (year.IsClosed)
        {
            errors.Add("السنة المالية مغلقة بالفعل ولا يمكن إعادة إقفالها.");
        }

        // 1. Audit Journal Entries
        var entries = await _journalRepo.GetListAsync(
            year.CompanyId,
            fromDate: year.StartDate,
            toDate: year.EndDate,
            take: 5000,
            cancellationToken: cancellationToken);

        var draftCount = entries.Count(e => e.Status == JournalEntryStatus.Draft);
        var postedCount = entries.Count(e => e.Status == JournalEntryStatus.Posted);

        if (draftCount > 0)
        {
            errors.Add($"يوجد {draftCount} قيد يومية بحالة 'مسودة' لم يتم ترحيلها بعد. يجب ترحيل كافة القيود أو حذفها قبل الإقفال النهائي.");
        }

        // 2. Audit Periods
        var openPeriodsCount = year.Periods.Count(p => p.Status == FiscalPeriodStatus.Open && !p.IsClosingPeriod);
        if (openPeriodsCount > 0)
        {
            warnings.Add($"يوجد {openPeriodsCount} فترة شهرية بحالة 'مفتوحة'. سيتم قفلها وإغلاقها نهائياً مع الإقفال السنوي.");
        }

        // 3. Compute Revenues, Expenses, Net Income
        var allAccounts = await _accountRepo.GetAllByCompanyAsync(year.CompanyId, cancellationToken);
        var postedLines = await _journalRepo.GetPostedLinesAsync(year.CompanyId, year.StartDate, year.EndDate, null, cancellationToken);

        decimal totalRevenues = 0;
        decimal totalExpenses = 0;

        foreach (var acc in allAccounts.Where(a => a.IsPostable))
        {
            var lines = postedLines.Where(l => l.AccountId == acc.Id).ToList();
            if (!lines.Any()) continue;

            var debit = lines.Sum(l => l.Debit);
            var credit = lines.Sum(l => l.Credit);

            if (acc.AccountType == AccountType.Revenue)
            {
                var netRev = credit - debit;
                totalRevenues += netRev;
            }
            else if (acc.AccountType == AccountType.Expense)
            {
                var netExp = debit - credit;
                totalExpenses += netExp;
            }
        }

        var projectedNetIncome = totalRevenues - totalExpenses;
        var tafqeet = ArabicCurrencyTafqeet.Convert(projectedNetIncome);

        // 4. Default Retained Earnings Account
        var reAccount = allAccounts.FirstOrDefault(a => a.AccountCode == "32102" && a.IsPostable)
                        ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("321") && a.IsPostable)
                        ?? allAccounts.FirstOrDefault(a => a.AccountNature == AccountNature.Credit && a.AccountType == AccountType.Equity && a.IsPostable);

        var defaultReId = reAccount?.Id ?? Guid.Empty;
        var defaultReCode = reAccount?.AccountCode ?? "32102";
        var defaultReName = reAccount?.NameAr ?? "الأرباح المبقاة / المدورة";

        if (reAccount == null)
        {
            errors.Add("لم يتم العثور على حساب 'الأرباح المبقاة' في شجرة الحسابات (الكود الافتراضي 32102). يرجى تعريفه أولاً.");
        }

        var canClose = !year.IsClosed && errors.Count == 0;

        return Result.Success(new YearEndAuditCheckDto(
            FiscalYearId: year.Id,
            YearNumber: year.YearNumber,
            YearNameAr: year.NameAr,
            StartDate: year.StartDate,
            EndDate: year.EndDate,
            IsAlreadyClosed: year.IsClosed,
            CanClose: canClose,
            BlockingErrors: errors,
            Warnings: warnings,
            DraftJournalEntriesCount: draftCount,
            TotalPostedJournalEntriesCount: postedCount,
            OpenPeriodsCount: openPeriodsCount,
            TotalRevenuesToClose: totalRevenues,
            TotalExpensesToClose: totalExpenses,
            ProjectedNetIncome: projectedNetIncome,
            ProjectedNetIncomeTafqeetAr: tafqeet,
            DefaultRetainedEarningsAccountId: defaultReId,
            DefaultRetainedEarningsAccountCode: defaultReCode,
            DefaultRetainedEarningsAccountNameAr: defaultReName));
    }
}
