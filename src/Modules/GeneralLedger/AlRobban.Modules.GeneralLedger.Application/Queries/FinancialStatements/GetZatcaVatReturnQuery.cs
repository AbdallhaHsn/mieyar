using AlRobban.Modules.GeneralLedger.Application.Common;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.FinancialStatements;

public record GetZatcaVatReturnQuery(
    Guid? CompanyId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    decimal AdjustmentsFromPrevious = 0m) : IRequest<Result<ZatcaVatReturnDto>>;

public class GetZatcaVatReturnQueryHandler : IRequestHandler<GetZatcaVatReturnQuery, Result<ZatcaVatReturnDto>>
{
    private readonly IAccountRepository _accountRepo;
    private readonly IJournalEntryRepository _journalRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public GetZatcaVatReturnQueryHandler(
        IAccountRepository accountRepo,
        IJournalEntryRepository journalRepo,
        ICurrentTenantContext tenantContext)
    {
        _accountRepo = accountRepo;
        _journalRepo = journalRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<ZatcaVatReturnDto>> Handle(GetZatcaVatReturnQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var now = DateTime.UtcNow;

        // Default to current quarter if not specified
        int quarter = (now.Month - 1) / 3 + 1;
        var qStartMonth = (quarter - 1) * 3 + 1;
        var defaultFrom = new DateTime(now.Year, qStartMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var defaultTo = defaultFrom.AddMonths(3).AddSeconds(-1);

        var fromDate = request.FromDate ?? defaultFrom;
        var toDate = request.ToDate ?? defaultTo;

        var allAccounts = await _accountRepo.GetAllByCompanyAsync(companyId, cancellationToken);
        var postedLines = await _journalRepo.GetPostedLinesAsync(companyId, fromDate, toDate, null, cancellationToken);

        // Map accounts
        var vatOutput15Accs = allAccounts.Where(a => (a.AccountCode == "21201" || a.AccountCode == "212") && a.IsPostable).Select(a => a.Id).ToHashSet();
        var vatInputDomesticAccs = allAccounts.Where(a => a.AccountCode == "11401" && a.IsPostable).Select(a => a.Id).ToHashSet();
        var vatInputCustomsAccs = allAccounts.Where(a => a.AccountCode == "11402" && a.IsPostable).Select(a => a.Id).ToHashSet();
        var salesAccs = allAccounts.Where(a => a.AccountCode.StartsWith("41") && a.IsPostable).Select(a => a.Id).ToHashSet();
        var purchaseCostAccs = allAccounts.Where(a => (a.AccountCode.StartsWith("51") || a.AccountCode.StartsWith("52") || a.AccountCode.StartsWith("53")) && a.IsPostable).Select(a => a.Id).ToHashSet();

        // 1. Output VAT (ضريبة المخرجات)
        var vatOutputLines = postedLines.Where(l => vatOutput15Accs.Contains(l.AccountId)).ToList();
        var vatOutputAmount = vatOutputLines.Sum(l => l.Credit) - vatOutputLines.Sum(l => l.Debit);
        if (vatOutputAmount < 0) vatOutputAmount = 0m;

        // Standard Rated Sales base amount
        var salesLines = postedLines.Where(l => salesAccs.Contains(l.AccountId)).ToList();
        var totalSalesBase = salesLines.Sum(l => l.Credit) - salesLines.Sum(l => l.Debit);
        if (totalSalesBase < 0) totalSalesBase = 0m;
        // If tax was calculated directly without posted base lines, infer base
        if (totalSalesBase == 0 && vatOutputAmount > 0)
        {
            totalSalesBase = Math.Round(vatOutputAmount / 0.15m, 2);
        }
        else if (totalSalesBase > 0 && vatOutputAmount == 0)
        {
            vatOutputAmount = Math.Round(totalSalesBase * 0.15m, 2);
        }

        // 2. Input VAT Domestic (ضريبة المدخلات المحلية)
        var vatInputLines = postedLines.Where(l => vatInputDomesticAccs.Contains(l.AccountId)).ToList();
        var vatInputAmount = vatInputLines.Sum(l => l.Debit) - vatInputLines.Sum(l => l.Credit);
        if (vatInputAmount < 0) vatInputAmount = 0m;

        // Domestic Purchases base amount
        var purchaseLines = postedLines.Where(l => purchaseCostAccs.Contains(l.AccountId)).ToList();
        var totalPurchasesBase = purchaseLines.Sum(l => l.Debit) - purchaseLines.Sum(l => l.Credit);
        if (totalPurchasesBase < 0) totalPurchasesBase = 0m;
        if (totalPurchasesBase == 0 && vatInputAmount > 0)
        {
            totalPurchasesBase = Math.Round(vatInputAmount / 0.15m, 2);
        }
        else if (totalPurchasesBase > 0 && vatInputAmount == 0)
        {
            vatInputAmount = Math.Round(totalPurchasesBase * 0.15m, 2);
        }

        // 3. Input VAT Customs (استيراد جمركي)
        var vatCustomsLines = postedLines.Where(l => vatInputCustomsAccs.Contains(l.AccountId)).ToList();
        var vatCustomsAmount = vatCustomsLines.Sum(l => l.Debit) - vatCustomsLines.Sum(l => l.Credit);
        if (vatCustomsAmount < 0) vatCustomsAmount = 0m;
        var customsBase = vatCustomsAmount > 0 ? Math.Round(vatCustomsAmount / 0.15m, 2) : 0m;

        // Build ZATCA Boxes (1 to 16)
        var box1 = new VatBoxDto(1, "المبيعات الخاضعة للنسبة الأساسية 15%", "Standard rated 15% sales", totalSalesBase, 0m, vatOutputAmount);
        var box2 = new VatBoxDto(2, "المبيعات لعملاء مسجلين في دول مجلس التعاون", "Special sales to GCC customers", 0m, 0m, 0m);
        var box3 = new VatBoxDto(3, "المبيعات الخاضعة للنسبة الصفرية (صادرات)", "Zero-rated supplies", 0m, 0m, 0m);
        var box4 = new VatBoxDto(4, "التوريدات المعفاة من الضريبة", "Exempt supplies", 0m, 0m, 0m);
        var box5 = new VatBoxDto(5, "إجمالي المبيعات والتوريدات", "Total sales / supplies", totalSalesBase, 0m, vatOutputAmount);

        var box6 = new VatBoxDto(6, "المشتريات المحلية الخاضعة للنسبة الأساسية 15%", "Standard rated 15% domestic purchases", totalPurchasesBase, 0m, vatInputAmount);
        var box7 = new VatBoxDto(7, "الاستيراد الخاضع لضريبة القيمة المضافة المدفوعة في الجمارك", "Imports subject to VAT paid at customs", customsBase, 0m, vatCustomsAmount);
        var box8 = new VatBoxDto(8, "الاستيراد الخاضع لآلية الاحتساب العكسي", "Imports subject to reverse charge mechanism", 0m, 0m, 0m);
        var box9 = new VatBoxDto(9, "المشتريات الخاضعة للنسبة الصفرية", "Zero-rated purchases", 0m, 0m, 0m);
        var box10 = new VatBoxDto(10, "المشتريات المعفاة من الضريبة", "Exempt purchases", 0m, 0m, 0m);
        var box11 = new VatBoxDto(11, "إجمالي المشتريات والنفقات", "Total purchases", totalPurchasesBase + customsBase, 0m, vatInputAmount + vatCustomsAmount);

        var box12TotalVatDue = box5.VatAmount;
        var box13TotalVatDeductible = box11.VatAmount;
        var box14NetVatDue = box12TotalVatDue - box13TotalVatDeductible;
        var box15Adjustments = request.AdjustmentsFromPrevious;
        var box16NetPayableOrRefundable = box14NetVatDue + box15Adjustments;
        var isRefundable = box16NetPayableOrRefundable < 0;

        var periodLabelAr = $"الربع {(fromDate.Month - 1) / 3 + 1} لسنة {fromDate.Year} ({fromDate:yyyy/MM/dd} إلى {toDate:yyyy/MM/dd})";
        var tafqeet = ArabicCurrencyTafqeet.Convert(Math.Abs(box16NetPayableOrRefundable));

        var returnDto = new ZatcaVatReturnDto(
            CompanyId: companyId,
            CompanyNameAr: "شركة الربان للحلول الذكية",
            CompanyNameEn: "Al-Roban Smart Solutions Co.",
            CommercialRegistration: "1010789456",
            TaxNumber: "310245678900003",
            VatRegistrationNumber: "310245678900003",
            TaxPeriod: periodLabelAr,
            FromDate: fromDate,
            ToDate: toDate,
            Currency: "SAR",
            StandardRatedSales: box1,
            SpecialSalesToGcc: box2,
            ZeroRatedSales: box3,
            ExemptSales: box4,
            TotalSales: box5,
            StandardRatedPurchases: box6,
            CustomsImports: box7,
            ReverseChargeImports: box8,
            ZeroRatedPurchases: box9,
            ExemptPurchases: box10,
            TotalPurchases: box11,
            TotalVatDue: box12TotalVatDue,
            TotalVatDeductible: box13TotalVatDeductible,
            NetVatDue: box14NetVatDue,
            AdjustmentsFromPrevious: box15Adjustments,
            NetVatPayableOrRefundable: box16NetPayableOrRefundable,
            IsRefundable: isRefundable,
            NetVatTafqeetAr: tafqeet,
            GeneratedAtUtc: DateTime.UtcNow);

        return Result.Success(returnDto);
    }
}
