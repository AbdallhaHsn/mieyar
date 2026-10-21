namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

/// <summary>
/// بند في القائمة المالية (شجري مع دعم المستويات والحسابات الفرعية)
/// </summary>
public record FinancialStatementItemDto(
    Guid AccountId,
    string AccountCode,
    string NameAr,
    string NameEn,
    int Level,
    bool IsPostable,
    decimal Amount,
    decimal? ComparativeAmount = null,
    decimal Percentage = 0m,
    List<FinancialStatementItemDto>? SubItems = null);

/// <summary>
/// مجموعة رئيسية في قائمة الدخل أو الميزانية
/// </summary>
public record FinancialStatementSectionDto(
    string Code,
    string TitleAr,
    string TitleEn,
    decimal TotalAmount,
    decimal? ComparativeTotalAmount,
    decimal Percentage,
    List<FinancialStatementItemDto> Items);

/// <summary>
/// تقرير قائمة الدخل (الأرباح والخسائر) الشامل
/// </summary>
public record IncomeStatementReportDto(
    Guid CompanyId,
    string CompanyNameAr,
    string CompanyNameEn,
    string? CommercialRegistration,
    string? TaxNumber,
    DateTime FromDate,
    DateTime ToDate,
    string Currency,
    string PresentationFormat, // "multi-step" or "single-step"
    Guid? CostCenterId,
    string? CostCenterName,
    int? MaxLevel,
    bool HideZeroBalances,

    // 1. الأنشطة التشغيلية (Operating Activities)
    FinancialStatementSectionDto OperatingRevenues,      // إيرادات النشاط
    FinancialStatementSectionDto CostOfSales,            // تكلفة المبيعات
    decimal GrossProfit,                                // مجمل الربح
    decimal? ComparativeGrossProfit,                    // مجمل ربح الفترة السابقة
    decimal GrossMarginPercentage,                      // هامش مجمل الربح %

    // 2. مصاريف التشغيل (Operating Expenses)
    FinancialStatementSectionDto SellingExpenses,        // المصاريف البيعية والتسويقية
    FinancialStatementSectionDto GeneralAdminExpenses,   // المصاريف العمومية والإدارية
    decimal TotalOperatingExpenses,                     // إجمالي مصاريف التشغيل
    decimal OperatingProfit,                            // الربح التشغيلي (EBIT)
    decimal? ComparativeOperatingProfit,                // الربح التشغيلي للفترة السابقة
    decimal OperatingMarginPercentage,                  // هامش الربح التشغيلي %

    // 3. بنود غير تشغيلية وتمويلية (Non-Operating & Financing)
    FinancialStatementSectionDto OtherIncome,            // إيرادات وأرباح أخرى
    FinancialStatementSectionDto FinanceAndZakatCosts,  // تكاليف التمويل والزكاة والضريبة
    decimal TotalOtherExpenses,                         // إجمالي المصاريف الأخرى

    // 4. صافي النتيجة الختامية (Net Result)
    decimal NetProfitBeforeZakat,                       // صافي الربح قبل الزكاة والضريبة
    decimal NetProfitOrLoss,                            // صافي الربح أو الخسارة للفترة
    decimal? ComparativeNetProfitOrLoss,                // صافي ربح الفترة المقارنة
    decimal NetMarginPercentage,                        // هامش صافي الربح %
    bool IsProfit,                                      // هل النتيجة ربح أم خسارة
    string NetProfitTafqeetAr,                          // التفقيع العربي كتابة
    DateTime GeneratedAtUtc);

/// <summary>
/// تقرير قائمة المركز المالي (الميزانية العمومية)
/// </summary>
public record BalanceSheetReportDto(
    Guid CompanyId,
    string CompanyNameAr,
    string CompanyNameEn,
    string? CommercialRegistration,
    string? TaxNumber,
    DateTime AsOfDate,
    string Currency,
    Guid? CostCenterId,
    string? CostCenterName,
    int? MaxLevel,
    bool HideZeroBalances,

    // 1. الأصول (Assets)
    FinancialStatementSectionDto CurrentAssets,          // الأصول المتداولة
    FinancialStatementSectionDto NonCurrentAssets,       // الأصول غير المتداولة
    decimal TotalAssets,                                // إجمالي الأصول
    decimal? ComparativeTotalAssets,

    // 2. الالتزامات والخصوم (Liabilities)
    FinancialStatementSectionDto CurrentLiabilities,     // الالتزامات المتداولة
    FinancialStatementSectionDto NonCurrentLiabilities,  // الالتزامات غير المتداولة
    decimal TotalLiabilities,                           // إجمالي الالتزامات
    decimal? ComparativeTotalLiabilities,

    // 3. حقوق الملكية (Equity)
    FinancialStatementSectionDto EquityItems,            // بنود حقوق الملكية (رأس المال، الاحتياطيات، الأرباح المبقاة)
    decimal CurrentPeriodNetIncome,                     // صافي ربح/خسارة الفترة الحالية (منقول آلياً من قائمة الدخل)
    decimal TotalEquity,                                // إجمالي حقوق الملكية (شامل أرباح الفترة الحالية)
    decimal? ComparativeTotalEquity,

    // 4. معادلة الميزانية والتحقق (Balance Verification)
    decimal TotalLiabilitiesAndEquity,                  // إجمالي الالتزامات وحقوق الملكية
    bool IsBalanced,                                    // هل الميزانية متوازنة؟ (الأصول = الخصوم + الملكية)
    decimal BalanceDifference,                          // فرق التوازن (0.00)

    // 5. المؤشرات والنسب المالية الأساسية (Financial Key Ratios)
    decimal WorkingCapital,                             // رأس المال العامل (الأصول المتداولة - الالتزامات المتداولة)
    decimal CurrentRatio,                               // نسبة التداول (الأصول المتداولة / الالتزامات المتداولة)
    decimal DebtToEquityRatio,                          // نسبة المديونية إلى حقوق الملكية
    string TotalAssetsTafqeetAr,                        // التفقيع العربي لإجمالي الأصول
    DateTime GeneratedAtUtc);

/// <summary>
/// إعدادات ومحددات عرض القوائم المالية المخصصة للشركة
/// </summary>
public record FinancialStatementSettingsDto(
    Guid Id,
    Guid CompanyId,
    string IncomeStatementFormat,
    bool DefaultHideZeroBalances,
    int? DefaultLevelDepth,
    string RetainedEarningsAccountCode,
    bool ShowComparativePeriod,
    bool ShowSignaturesBlock,
    int DecimalPlaces,
    string AccountingBasis,
    bool AllowDraftSimulation,
    string CashFlowMethod,
    string CashAccountPrefix);

/// <summary>
/// تقرير قائمة التدفقات النقدية الشامل وفق معيار المحاسبة الدولي (IAS 7)
/// </summary>
public record CashFlowStatementReportDto(
    Guid CompanyId,
    string CompanyNameAr,
    string CompanyNameEn,
    string? CommercialRegistration,
    string? TaxNumber,
    DateTime FromDate,
    DateTime ToDate,
    string Currency,
    string CashFlowMethod, // "indirect" or "direct"
    Guid? CostCenterId,
    string? CostCenterName,
    bool HideZeroBalances,

    // 1. الأنشطة التشغيلية (Operating Activities)
    decimal StartingNetProfitOrLoss,
    FinancialStatementSectionDto NonCashAdjustments,
    decimal OperatingProfitBeforeWorkingCapitalChanges,
    FinancialStatementSectionDto WorkingCapitalChanges,
    decimal NetCashFromOperatingActivities,
    decimal? ComparativeNetCashFromOperatingActivities,

    // 2. الأنشطة الاستثمارية (Investing Activities)
    FinancialStatementSectionDto InvestingActivities,
    decimal NetCashFromInvestingActivities,
    decimal? ComparativeNetCashFromInvestingActivities,

    // 3. الأنشطة التمويلية (Financing Activities)
    FinancialStatementSectionDto FinancingActivities,
    decimal NetCashFromFinancingActivities,
    decimal? ComparativeNetCashFromFinancingActivities,

    // 4. تسوية ومطابقة النقدية (Cash Reconciliation)
    decimal NetChangeInCashAndEquivalents,
    decimal CashAtBeginningOfPeriod,
    decimal CashAtEndOfPeriod,
    decimal ActualCashBalanceInGeneralLedger,
    bool IsReconciled,
    decimal ReconciliationDifference,
    string NetCashTafqeetAr,
    DateTime GeneratedAtUtc);

/// <summary>
/// صف في قائمة التغير في حقوق الملكية (IAS 1)
/// </summary>
public record EquityStatementRowDto(
    string ActivityAr,
    string ActivityEn,
    decimal ShareCapital,
    decimal StatutoryReserve,
    decimal RetainedEarnings,
    decimal CurrentYearProfit,
    decimal TotalEquity,
    bool IsBold = false);

/// <summary>
/// تقرير قائمة التغير في حقوق الملكية وفق معيار المحاسبة الدولي IAS 1
/// </summary>
public record EquityStatementReportDto(
    Guid CompanyId,
    string CompanyNameAr,
    string CompanyNameEn,
    string? CommercialRegistration,
    string? TaxNumber,
    DateTime FromDate,
    DateTime ToDate,
    string Currency,
    List<EquityStatementRowDto> Rows,
    decimal EndingTotalEquity,
    string EndingEquityTafqeetAr,
    DateTime GeneratedAtUtc);

/// <summary>
/// بند في إقرار ضريبة القيمة المضافة (ZATCA)
/// </summary>
public record VatBoxDto(
    int BoxNumber,
    string TitleAr,
    string TitleEn,
    decimal Amount,
    decimal Adjustment,
    decimal VatAmount);

/// <summary>
/// إقرار ضريبة القيمة المضافة المعتمد لهيئة الزكاة والضريبة والجمارك (ZATCA 16-Box Form)
/// </summary>
public record ZatcaVatReturnDto(
    Guid CompanyId,
    string CompanyNameAr,
    string CompanyNameEn,
    string? CommercialRegistration,
    string TaxNumber,
    string VatRegistrationNumber,
    string TaxPeriod,
    DateTime FromDate,
    DateTime ToDate,
    string Currency,

    // 1. المبيعات والتوريدات (Boxes 1 to 5)
    VatBoxDto StandardRatedSales,
    VatBoxDto SpecialSalesToGcc,
    VatBoxDto ZeroRatedSales,
    VatBoxDto ExemptSales,
    VatBoxDto TotalSales,

    // 2. المشتريات والنفقات (Boxes 6 to 11)
    VatBoxDto StandardRatedPurchases,
    VatBoxDto CustomsImports,
    VatBoxDto ReverseChargeImports,
    VatBoxDto ZeroRatedPurchases,
    VatBoxDto ExemptPurchases,
    VatBoxDto TotalPurchases,

    // 3. احتساب صافي الضريبة (Boxes 12 to 16)
    decimal TotalVatDue,
    decimal TotalVatDeductible,
    decimal NetVatDue,
    decimal AdjustmentsFromPrevious,
    decimal NetVatPayableOrRefundable,
    bool IsRefundable,
    string NetVatTafqeetAr,
    DateTime GeneratedAtUtc);

