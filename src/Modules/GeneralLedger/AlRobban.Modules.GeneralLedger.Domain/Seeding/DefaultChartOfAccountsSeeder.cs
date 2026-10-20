using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Standards;

namespace AlRobban.Modules.GeneralLedger.Domain.Seeding;

public static class DefaultChartOfAccountsSeeder
{
    public static List<Account> GenerateDefaultAccounts(Guid tenantId, Guid companyId)
    {
        var accounts = new List<Account>();

        // Guidance references from Catalog
        var ias7 = IfrsStandardCatalog.GetByCode("IAS 7");
        var ifrs9 = IfrsStandardCatalog.GetByCode("IFRS 9");
        var ias2 = IfrsStandardCatalog.GetByCode("IAS 2");
        var ias16 = IfrsStandardCatalog.GetByCode("IAS 16");
        var ifrs16 = IfrsStandardCatalog.GetByCode("IFRS 16");
        var ifrs15 = IfrsStandardCatalog.GetByCode("IFRS 15");
        var ias19 = IfrsStandardCatalog.GetByCode("IAS 19");
        var zatcaVat = IfrsStandardCatalog.GetByCode("ZATCA VAT");
        var ias1 = IfrsStandardCatalog.GetByCode("IAS 1");

        // -------------------------------------------------------------
        // 1. الأصول (Assets) - Debit - BalanceSheet
        // -------------------------------------------------------------
        var assetsRoot = Account.CreateRoot(
            tenantId, companyId, "1", "الأصول", "Assets",
            AccountType.Asset, AccountNature.Debit, FinancialStatement.BalanceSheet,
            ias16, "كافة الموارد الاقتصادية التي تسيطر عليها المنشأة نتيجة أحداث سابقة ومتوقع تدفق منافع مستقبلية منها");
        accounts.Add(assetsRoot);

        // 11 الأصول المتداولة
        var currentAssets = Account.CreateSubAccount(
            tenantId, companyId, assetsRoot, "11", "الأصول المتداولة", "Current Assets",
            isPostable: false, guidance: ias7);
        accounts.Add(currentAssets);

        // 111 النقدية وما في حكمها
        var cashGroup = Account.CreateSubAccount(
            tenantId, companyId, currentAssets, "111", "النقدية وما في حكمها", "Cash and Cash Equivalents",
            isPostable: false, guidance: ias7);
        accounts.Add(cashGroup);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, cashGroup, "11101", "الصندوق الرئيسي - الخزينة", "Main Cash Fund", isPostable: true, guidance: ias7));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, cashGroup, "11102", "مصرف الراجحي - حساب جاري", "Al Rajhi Bank Current Account", isPostable: true, guidance: ias7));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, cashGroup, "11103", "البنك الأهلي السعودي - حساب جاري", "SNB Bank Current Account", isPostable: true, guidance: ias7));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, cashGroup, "11104", "وسيط نقاط البيع مدى / فيزا (POS)", "POS Card Clearing", isPostable: true, guidance: ias7));

        // 112 الذمم المدينة والعملاء
        var arGroup = Account.CreateSubAccount(
            tenantId, companyId, currentAssets, "112", "الذمم المدينة والعملاء", "Accounts Receivable & Debtors",
            isPostable: false, guidance: ifrs9);
        accounts.Add(arGroup);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, arGroup, "11201", "العملاء التجاريون", "Trade Receivables", isPostable: true, guidance: ifrs9));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, arGroup, "11202", "مجمع مخصص خسائر الائتمان المتوقعة (ECL)", "Allowance for ECL", isPostable: true, guidance: ifrs9, overrideNature: AccountNature.Credit));

        // 113 المخزون السلعي
        var invGroup = Account.CreateSubAccount(
            tenantId, companyId, currentAssets, "113", "المخزون السلعي", "Merchandise Inventory",
            isPostable: false, guidance: ias2);
        accounts.Add(invGroup);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, invGroup, "11301", "مخزون البضائع الجاهزة والمستودعات", "Finished Goods Inventory", isPostable: true, guidance: ias2));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, invGroup, "11302", "اعتمادات وبضائع بالطريق", "Goods in Transit", isPostable: true, guidance: ias2));

        // 114 ضريبة القيمة المضافة المستردة
        var vatInputGroup = Account.CreateSubAccount(
            tenantId, companyId, currentAssets, "114", "ضريبة القيمة المضافة - المدخلات المستردة", "Input VAT Recoverable",
            isPostable: false, guidance: zatcaVat);
        accounts.Add(vatInputGroup);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, vatInputGroup, "11401", "ضريبة المدخلات على المشتريات المحلية 15%", "Input VAT - Local Purchases", isPostable: true, guidance: zatcaVat));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, vatInputGroup, "11402", "ضريبة المدخلات على الاستيراد الجمركي", "Input VAT - Customs Imports", isPostable: true, guidance: zatcaVat));

        // 12 الأصول غير المتداولة
        var nonCurrentAssets = Account.CreateSubAccount(
            tenantId, companyId, assetsRoot, "12", "الأصول غير المتداولة", "Non-Current Assets",
            isPostable: false, guidance: ias16);
        accounts.Add(nonCurrentAssets);

        // 121 العقارات والآلات والمعدات (الأصول الثابتة)
        var ppeGroup = Account.CreateSubAccount(
            tenantId, companyId, nonCurrentAssets, "121", "العقارات والآلات والمعدات (PPE)", "Property, Plant and Equipment",
            isPostable: false, guidance: ias16);
        accounts.Add(ppeGroup);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, ppeGroup, "12101", "المباني والإنشاءات", "Buildings & Construction", isPostable: true, guidance: ias16));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, ppeGroup, "12102", "مجمع استهلاك المباني", "Accumulated Depreciation - Buildings", isPostable: true, guidance: ias16, overrideNature: AccountNature.Credit));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, ppeGroup, "12103", "الآلات ومعدات الخوادم والتقنية", "Machinery & IT Hardware", isPostable: true, guidance: ias16));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, ppeGroup, "12104", "مجمع استهلاك المعدات التقنية", "Accumulated Depreciation - IT Hardware", isPostable: true, guidance: ias16, overrideNature: AccountNature.Credit));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, ppeGroup, "12105", "أصول حق الاستخدام (ROU)", "Right-of-Use Assets", isPostable: true, guidance: ifrs16));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, ppeGroup, "12106", "مجمع إطفاء أصول حق الاستخدام", "Accumulated Amortization - ROU", isPostable: true, guidance: ifrs16, overrideNature: AccountNature.Credit));

        // -------------------------------------------------------------
        // 2. الالتزامات والخصوم (Liabilities) - Credit - BalanceSheet
        // -------------------------------------------------------------
        var liabRoot = Account.CreateRoot(
            tenantId, companyId, "2", "الالتزامات والخصوم", "Liabilities",
            AccountType.Liability, AccountNature.Credit, FinancialStatement.BalanceSheet,
            ifrs9, "تعهدات والتزامات حالية على المنشأة ناشئة عن أحداث سابقة يستوجب سدادها تدفق موارد اقتصادية");
        accounts.Add(liabRoot);

        // 21 الالتزامات المتداولة
        var currentLiab = Account.CreateSubAccount(
            tenantId, companyId, liabRoot, "21", "الالتزامات المتداولة", "Current Liabilities",
            isPostable: false, guidance: ifrs9);
        accounts.Add(currentLiab);

        // 211 الموردون والذمم الدائنة
        var apGroup = Account.CreateSubAccount(
            tenantId, companyId, currentLiab, "211", "الموردون والذمم الدائنة", "Accounts Payable & Trade Creditors",
            isPostable: false, guidance: ifrs9);
        accounts.Add(apGroup);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, apGroup, "21101", "موردو البضائع والخدمات المحليون", "Local Trade Creditors", isPostable: true, guidance: ifrs9));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, apGroup, "21102", "موردو الاستيراد الخارجي", "Foreign Trade Creditors", isPostable: true, guidance: ifrs9));

        // 212 ضريبة القيمة المضافة المحصلة - المخرجات
        var vatOutputGroup = Account.CreateSubAccount(
            tenantId, companyId, currentLiab, "212", "ضريبة القيمة المضافة - المخرجات المستحقة", "Output VAT Payable",
            isPostable: false, guidance: zatcaVat);
        accounts.Add(vatOutputGroup);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, vatOutputGroup, "21201", "ضريبة القيمة المضافة على المبيعات 15%", "Output VAT on Sales 15%", isPostable: true, guidance: zatcaVat));

        // 213 المصروفات المستحقة
        var accruedGroup = Account.CreateSubAccount(
            tenantId, companyId, currentLiab, "213", "المصروفات المستحقة والأرصدة الدائنة", "Accrued Expenses & Payables",
            isPostable: false, guidance: ias19);
        accounts.Add(accruedGroup);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, accruedGroup, "21301", "الرواتب والأجور المستحقة للموظفين", "Accrued Salaries & Wages", isPostable: true, guidance: ias19));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, accruedGroup, "21302", "التزامات عقود الإيجار المتداولة (أقل من سنة)", "Lease Liabilities - Current", isPostable: true, guidance: ifrs16));

        // 214 مخصص الزكاة الشرعية وضريبة الدخل
        var zakatGroup = Account.CreateSubAccount(
            tenantId, companyId, currentLiab, "214", "مخصص الزكاة الشرعية وضريبة الدخل", "Zakat and Tax Provision",
            isPostable: false);
        accounts.Add(zakatGroup);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, zakatGroup, "21401", "مخصص الزكاة الشرعية السنوية", "Estimated Annual Zakat Provision", isPostable: true));

        // 22 الالتزامات غير المتداولة
        var nonCurrentLiab = Account.CreateSubAccount(
            tenantId, companyId, liabRoot, "22", "الالتزامات غير المتداولة", "Non-Current Liabilities",
            isPostable: false, guidance: ifrs16);
        accounts.Add(nonCurrentLiab);

        accounts.Add(Account.CreateSubAccount(tenantId, companyId, nonCurrentLiab, "22101", "التزامات عقود الإيجار طويلة الأجل (IFRS 16)", "Lease Liabilities - Non-Current", isPostable: true, guidance: ifrs16));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, nonCurrentLiab, "22201", "مخصص مكافأة نهاية الخدمة للموظفين (EOSB)", "Provision for Employee EOSB", isPostable: true, guidance: ias19));

        // -------------------------------------------------------------
        // 3. حقوق الملكية (Equity) - Credit - BalanceSheet
        // -------------------------------------------------------------
        var eqRoot = Account.CreateRoot(
            tenantId, companyId, "3", "حقوق الملكية", "Equity & Capital",
            AccountType.Equity, AccountNature.Credit, FinancialStatement.BalanceSheet,
            ias1, "الحصة المتبقية في أصول المنشأة بعد استبعاد كافة التزاماتها للملاك والمساهمين");
        accounts.Add(eqRoot);

        var capGroup = Account.CreateSubAccount(tenantId, companyId, eqRoot, "31", "رأس المال المدفوع", "Share Capital", isPostable: false, guidance: ias1);
        accounts.Add(capGroup);
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, capGroup, "31101", "رأس مال الشركاء والمساهمين", "Paid-in Capital", isPostable: true, guidance: ias1));

        var resGroup = Account.CreateSubAccount(tenantId, companyId, eqRoot, "32", "الاحتياطيات والأرباح المبقاة", "Reserves & Retained Earnings", isPostable: false, guidance: ias1);
        accounts.Add(resGroup);
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, resGroup, "32101", "الاحتياطي النظامي (10% نظام الشركات)", "Statutory Reserve", isPostable: true, guidance: ias1));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, resGroup, "32102", "الأرباح المبقاة والمحتجزة", "Retained Earnings", isPostable: true, guidance: ias1));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, resGroup, "32103", "صافي أرباح / خسائر العام المالي الحالي", "Current Period P&L", isPostable: true, guidance: ias1));

        // -------------------------------------------------------------
        // 4. الإيرادات والمبيعات (Revenues) - Credit - IncomeStatement
        // -------------------------------------------------------------
        var revRoot = Account.CreateRoot(
            tenantId, companyId, "4", "الإيرادات والمبيعات", "Revenues",
            AccountType.Revenue, AccountNature.Credit, FinancialStatement.IncomeStatement,
            ifrs15, "التدفقات النقدية والمنافع الاقتصادية الداخلة الناتجة عن الأنشطة التشغيلية العادية للشركة");
        accounts.Add(revRoot);

        var opRevGroup = Account.CreateSubAccount(tenantId, companyId, revRoot, "41", "إيرادات النشاط التشغيلي الرئيسي", "Operating Revenues", isPostable: false, guidance: ifrs15);
        accounts.Add(opRevGroup);
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, opRevGroup, "41101", "إيرادات مبيعات البضائع والمنتجات", "Product Sales Revenue", isPostable: true, guidance: ifrs15));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, opRevGroup, "41102", "إيرادات تقديم الخدمات التشغيلية", "Services Revenue", isPostable: true, guidance: ifrs15));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, opRevGroup, "41103", "الخصم المسموح به والمردودات (تخفيض إيراد)", "Sales Discounts & Returns", isPostable: true, guidance: ifrs15, overrideNature: AccountNature.Debit));

        var otherRevGroup = Account.CreateSubAccount(tenantId, companyId, revRoot, "42", "إيرادات أخرى غير تشغيلية", "Other Non-Operating Income", isPostable: false);
        accounts.Add(otherRevGroup);
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, otherRevGroup, "42101", "عوائد استثمارات وأرباح فروق عملة", "Investment & FX Gains", isPostable: true));

        // -------------------------------------------------------------
        // 5. المصروفات والتكاليف (Expenses) - Debit - IncomeStatement
        // -------------------------------------------------------------
        var expRoot = Account.CreateRoot(
            tenantId, companyId, "5", "المصروفات والتكاليف", "Expenses & Costs",
            AccountType.Expense, AccountNature.Debit, FinancialStatement.IncomeStatement,
            ias1, "كافة التكاليف والنفقات المتكبدة لتوليد الإيرادات ومزاولة النشاط التشغيلي خلال الفترة");
        accounts.Add(expRoot);

        // 51 تكلفة الإيرادات
        var cogsGroup = Account.CreateSubAccount(tenantId, companyId, expRoot, "51", "تكلفة المبيعات والإيرادات (COGS)", "Cost of Goods Sold", isPostable: false, guidance: ias2);
        accounts.Add(cogsGroup);
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, cogsGroup, "51101", "تكلفة مشتريات البضاعة المباعة", "Cost of Merchandise Sold", isPostable: true, guidance: ias2));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, cogsGroup, "51102", "مصاريف النقل والمناولة المباشرة", "Direct Freight & Handling", isPostable: true, guidance: ias2));

        // 52 المصروفات البيعية والتسويقية
        var sellingGroup = Account.CreateSubAccount(tenantId, companyId, expRoot, "52", "المصروفات البيعية والتسويقية", "Selling & Marketing Expenses", isPostable: false);
        accounts.Add(sellingGroup);
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, sellingGroup, "52101", "الدعاية والإعلان والتسويق الرقمي", "Advertising & Marketing", isPostable: true));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, sellingGroup, "52102", "عمولات رجال البيع ومصاريف التوزيع", "Sales Commissions & Logistics", isPostable: true));

        // 53 المصروفات العمومية والإدارية
        var adminGroup = Account.CreateSubAccount(tenantId, companyId, expRoot, "53", "المصروفات العمومية والإدارية", "General & Administrative Expenses", isPostable: false, guidance: ias19);
        accounts.Add(adminGroup);
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, adminGroup, "53101", "رواتب وبدلات الموظفين والإدارة", "Admin Salaries & Benefits", isPostable: true, guidance: ias19));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, adminGroup, "53102", "مصروف استهلاك الأصول الثابتة", "Depreciation Expense", isPostable: true, guidance: ias16));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, adminGroup, "53103", "مصروف إطفاء أصول حق الاستخدام (ROU)", "Amortization of ROU Assets", isPostable: true, guidance: ifrs16));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, adminGroup, "53104", "مصاريف الكهرباء والمياه والاتصالات", "Utilities & Telecom Expenses", isPostable: true));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, adminGroup, "53105", "الرسوم الحكومية والتراخيص والاشتراكات", "Government Fees & Subscriptions", isPostable: true));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, adminGroup, "53106", "مصروف مكافأة نهاية الخدمة الدوري", "Periodic EOSB Expense", isPostable: true, guidance: ias19));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, adminGroup, "53107", "مخصص الخسائر الائتمانية المتوقعة ECL", "ECL Provision Expense", isPostable: true, guidance: ifrs9));

        // 54 تكاليف التمويل والزكاة
        var finGroup = Account.CreateSubAccount(tenantId, companyId, expRoot, "54", "تكاليف التمويل ومصروف الزكاة", "Finance Costs & Zakat", isPostable: false);
        accounts.Add(finGroup);
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, finGroup, "54101", "مصروف الزكاة الشرعية السنوية", "Annual Zakat Expense", isPostable: true));
        accounts.Add(Account.CreateSubAccount(tenantId, companyId, finGroup, "54102", "رسوم وعمولات بنكية ومصاريف تمويل", "Bank Charges & Finance Fees", isPostable: true));

        return accounts;
    }
}
