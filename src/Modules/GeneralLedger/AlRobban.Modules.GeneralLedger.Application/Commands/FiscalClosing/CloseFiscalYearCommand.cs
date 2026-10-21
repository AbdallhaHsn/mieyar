using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.Common;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.FiscalClosing;

public record CloseFiscalYearCommand(
    Guid FiscalYearId,
    Guid? RetainedEarningsAccountId = null,
    bool GenerateOpeningBalanceNextYear = true) : IRequest<Result<YearEndClosingResultDto>>;

public class CloseFiscalYearCommandHandler : IRequestHandler<CloseFiscalYearCommand, Result<YearEndClosingResultDto>>
{
    private readonly IFinancialSettingsRepository _settingsRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IMediator _mediator;

    public CloseFiscalYearCommandHandler(
        IFinancialSettingsRepository settingsRepo,
        IJournalEntryRepository journalRepo,
        IAccountRepository accountRepo,
        IMediator mediator)
    {
        _settingsRepo = settingsRepo;
        _journalRepo = journalRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
    }

    public async Task<Result<YearEndClosingResultDto>> Handle(CloseFiscalYearCommand request, CancellationToken cancellationToken)
    {
        var year = await _settingsRepo.GetFiscalYearByIdAsync(request.FiscalYearId, cancellationToken);

        if (year == null)
        {
            return Result.Failure<YearEndClosingResultDto>(new Error("FiscalYear.NotFound", "السنة المالية المطلوبة غير موجودة"));
        }

        if (year.IsClosed)
        {
            return Result.Failure<YearEndClosingResultDto>(new Error("FiscalYear.AlreadyClosed", "السنة المالية مغلقة بالفعل"));
        }

        // 1. Audit Check: No draft journal entries allowed
        var entries = await _journalRepo.GetListAsync(
            year.CompanyId,
            fromDate: year.StartDate,
            toDate: year.EndDate,
            take: 5000,
            cancellationToken: cancellationToken);

        var draftCount = entries.Count(e => e.Status == JournalEntryStatus.Draft);
        if (draftCount > 0)
        {
            return Result.Failure<YearEndClosingResultDto>(new Error("FiscalYear.DraftEntriesExist",
                $"لا يمكن إقفال السنة المالية لوجود {draftCount} قيد بحالة 'مسودة'. يجب ترحيل كافة القيود أو حذفها أولاً."));
        }

        // 2. Identify Nominal Accounts & Balances
        var allAccounts = await _accountRepo.GetAllByCompanyAsync(year.CompanyId, cancellationToken);
        var postedLines = await _journalRepo.GetPostedLinesAsync(year.CompanyId, year.StartDate, year.EndDate, null, cancellationToken);

        // Retained Earnings Account
        Guid reAccountId = request.RetainedEarningsAccountId ?? Guid.Empty;
        if (reAccountId == Guid.Empty)
        {
            var defaultRe = allAccounts.FirstOrDefault(a => a.AccountCode == "32102" && a.IsPostable)
                            ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("321") && a.IsPostable)
                            ?? allAccounts.FirstOrDefault(a => a.AccountType == AccountType.Equity && a.IsPostable);

            if (defaultRe == null)
            {
                return Result.Failure<YearEndClosingResultDto>(new Error("FiscalYear.NoRetainedEarningsAccount",
                    "لم يتم العثور على حساب الأرباح المبقاة (32102) لإقفال صافي الدخل إليه."));
            }
            reAccountId = defaultRe.Id;
        }

        var closingJournalLines = new List<CreateJournalEntryLineRequest>();
        decimal totalRevenuesClosed = 0;
        decimal totalExpensesClosed = 0;

        foreach (var acc in allAccounts.Where(a => a.IsPostable))
        {
            var lines = postedLines.Where(l => l.AccountId == acc.Id).ToList();
            if (!lines.Any()) continue;

            var debit = lines.Sum(l => l.Debit);
            var credit = lines.Sum(l => l.Credit);

            if (acc.AccountType == AccountType.Revenue)
            {
                var netRev = credit - debit;
                if (netRev != 0)
                {
                    totalRevenuesClosed += netRev;
                    // Debit revenue to zero it out
                    closingJournalLines.Add(new CreateJournalEntryLineRequest(
                        acc.Id,
                        Debit: netRev > 0 ? netRev : 0,
                        Credit: netRev < 0 ? Math.Abs(netRev) : 0,
                        Description: $"إقفال حساب الإيراد {acc.AccountCode} في الأرباح المبقاة لعام {year.YearNumber}",
                        CostCenterId: null));
                }
            }
            else if (acc.AccountType == AccountType.Expense)
            {
                var netExp = debit - credit;
                if (netExp != 0)
                {
                    totalExpensesClosed += netExp;
                    // Credit expense to zero it out
                    closingJournalLines.Add(new CreateJournalEntryLineRequest(
                        acc.Id,
                        Debit: netExp < 0 ? Math.Abs(netExp) : 0,
                        Credit: netExp > 0 ? netExp : 0,
                        Description: $"إقفال حساب المصروف {acc.AccountCode} في الأرباح المبقاة لعام {year.YearNumber}",
                        CostCenterId: null));
                }
            }
        }

        var netProfitOrLoss = totalRevenuesClosed - totalExpensesClosed;

        if (netProfitOrLoss > 0)
        {
            // Net Profit: Credit Retained Earnings
            closingJournalLines.Add(new CreateJournalEntryLineRequest(
                reAccountId,
                Debit: 0,
                Credit: netProfitOrLoss,
                Description: $"صافي أرباح السنة المالية {year.YearNumber} مرحلة إلى حساب الأرباح المبقاة",
                CostCenterId: null));
        }
        else if (netProfitOrLoss < 0)
        {
            // Net Loss: Debit Retained Earnings
            closingJournalLines.Add(new CreateJournalEntryLineRequest(
                reAccountId,
                Debit: Math.Abs(netProfitOrLoss),
                Credit: 0,
                Description: $"صافي خسائر السنة المالية {year.YearNumber} مرحلة إلى حساب الأرباح المبقاة",
                CostCenterId: null));
        }

        // 3. Ensure Closing Period and December Period are Open
        var targetPeriod = year.Periods.FirstOrDefault(p => p.StartDate <= year.EndDate && year.EndDate <= p.EndDate && !p.IsClosingPeriod);
        if (targetPeriod != null && targetPeriod.Status == FiscalPeriodStatus.Locked)
        {
            targetPeriod.SetStatus(FiscalPeriodStatus.Open);
        }

        var closingPeriod = year.Periods.FirstOrDefault(p => p.IsClosingPeriod);
        if (closingPeriod != null && closingPeriod.Status == FiscalPeriodStatus.Locked)
        {
            closingPeriod.SetStatus(FiscalPeriodStatus.Open);
        }
        await _settingsRepo.SaveChangesAsync(cancellationToken);

        string closingEntryNum = "N/A";
        Guid closingEntryId = Guid.Empty;

        if (closingJournalLines.Any())
        {
            var closingCommand = new CreateJournalEntryCommand(
                year.CompanyId,
                year.EndDate,
                JournalEntryType.Closing,
                DescriptionAr: $"قيد إقفال الحسابات الاسمية (الإيرادات والمصروفات) لعام {year.YearNumber} إلى الأرباح المبقاة",
                DescriptionEn: $"Year-End Closing Entry for Fiscal Year {year.YearNumber}",
                ReferenceNumber: $"CLOSE-{year.YearNumber}",
                PostImmediately: true,
                Lines: closingJournalLines);

            var entryResult = await _mediator.Send(closingCommand, cancellationToken);
            if (!entryResult.IsSuccess)
            {
                return Result.Failure<YearEndClosingResultDto>(entryResult.Error);
            }

            closingEntryId = entryResult.Value.Id;
            closingEntryNum = entryResult.Value.EntryNumber;
        }

        // 4. Close the Fiscal Year
        year.CloseYear();
        await _settingsRepo.SaveChangesAsync(cancellationToken);

        // 5. Generate Next Fiscal Year & Opening Balance
        bool nextYearCreated = false;
        Guid? nextYearId = null;
        string? openingEntryNum = null;

        if (request.GenerateOpeningBalanceNextYear)
        {
            var nextYearNum = year.YearNumber + 1;
            var allCompanyYears = await _settingsRepo.GetAllFiscalYearsAsync(year.CompanyId, cancellationToken);
            var nextYear = allCompanyYears.FirstOrDefault(y => y.YearNumber == nextYearNum);

            if (nextYear == null)
            {
                nextYear = FiscalYear.Create(
                    year.TenantId,
                    year.CompanyId,
                    nextYearNum,
                    $"السنة المالية {nextYearNum}",
                    $"Fiscal Year {nextYearNum}",
                    new DateTime(nextYearNum, 1, 1),
                    new DateTime(nextYearNum, 12, 31),
                    includeClosingPeriod: true);

                await _settingsRepo.AddFiscalYearAsync(nextYear, cancellationToken);
                await _settingsRepo.SaveChangesAsync(cancellationToken);
                nextYearCreated = true;
            }
            nextYearId = nextYear.Id;

            var nextYearPeriod1 = nextYear.Periods.FirstOrDefault(p => p.PeriodNumber == 1);
            if (nextYearPeriod1 != null && nextYearPeriod1.Status == FiscalPeriodStatus.Locked)
            {
                nextYearPeriod1.SetStatus(FiscalPeriodStatus.Open);
                await _settingsRepo.SaveChangesAsync(cancellationToken);
            }

            // Generate Opening Balances: Fetch updated lines including the closing entry
            var allYearLines = await _journalRepo.GetPostedLinesAsync(year.CompanyId, year.StartDate, year.EndDate, null, cancellationToken);
            var openingLines = new List<CreateJournalEntryLineRequest>();

            var bsAccounts = allAccounts.Where(a =>
                a.IsPostable && (
                    a.AccountType == AccountType.Asset ||
                    a.AccountType == AccountType.Liability ||
                    a.AccountType == AccountType.Equity
                )).ToList();

            foreach (var acc in bsAccounts)
            {
                var lines = allYearLines.Where(l => l.AccountId == acc.Id).ToList();
                if (!lines.Any()) continue;

                var debit = lines.Sum(l => l.Debit);
                var credit = lines.Sum(l => l.Credit);
                var net = debit - credit;

                if (net > 0)
                {
                    openingLines.Add(new CreateJournalEntryLineRequest(
                        acc.Id,
                        Debit: net,
                        Credit: 0,
                        Description: $"رصيد افتتاحي مرحل من عام {year.YearNumber}",
                        CostCenterId: null));
                }
                else if (net < 0)
                {
                    openingLines.Add(new CreateJournalEntryLineRequest(
                        acc.Id,
                        Debit: 0,
                        Credit: Math.Abs(net),
                        Description: $"رصيد افتتاحي مرحل من عام {year.YearNumber}",
                        CostCenterId: null));
                }
            }

            if (openingLines.Any())
            {
                var openingCommand = new CreateJournalEntryCommand(
                    year.CompanyId,
                    new DateTime(nextYearNum, 1, 1),
                    JournalEntryType.Opening,
                    DescriptionAr: $"قيد الأرصدة الافتتاحية المدورة من إقفال السنة المالية {year.YearNumber}",
                    DescriptionEn: $"Opening Balances Entry rolled from FY {year.YearNumber}",
                    ReferenceNumber: $"OPEN-{nextYearNum}",
                    PostImmediately: true,
                    Lines: openingLines);

                var openResult = await _mediator.Send(openingCommand, cancellationToken);
                if (openResult.IsSuccess)
                {
                    openingEntryNum = openResult.Value.EntryNumber;
                }
            }
        }

        var tafqeetNet = ArabicCurrencyTafqeet.Convert(netProfitOrLoss);

        return Result.Success(new YearEndClosingResultDto(
            FiscalYearId: year.Id,
            YearNumber: year.YearNumber,
            ClosingJournalEntryId: closingEntryId,
            ClosingJournalEntryNumber: closingEntryNum,
            NetProfitOrLoss: netProfitOrLoss,
            NetProfitOrLossTafqeetAr: tafqeetNet,
            TotalRevenuesClosed: totalRevenuesClosed,
            TotalExpensesClosed: totalExpensesClosed,
            ClosedAtUtc: DateTime.UtcNow,
            NextYearCreated: nextYearCreated,
            NextFiscalYearId: nextYearId,
            OpeningJournalEntryNumber: openingEntryNum));
    }
}
