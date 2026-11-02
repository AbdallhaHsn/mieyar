import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TranslationPhrase {
  ar: string;
  en: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountingTranslatorService {
  private http = inject(HttpClient, { optional: true });
  private onlineCache = new Map<string, string>();
  private globalDebounceTimer: any;

  // Dictionary of specialized financial, banking, and accounting phrases (Ar <-> En)
  // Ordered from longest to shortest during search
  private readonly phraseDictionary: TranslationPhrase[] = [
    // Saudi & Regional Banks & Financial Institutions
    { ar: 'مصرف الإنماء', en: 'Alinma Bank' },
    { ar: 'بنك الإنماء', en: 'Alinma Bank' },
    { ar: 'مصرف الانماء', en: 'Alinma Bank' },
    { ar: 'بنك الانماء', en: 'Alinma Bank' },
    { ar: 'الإنماء', en: 'Alinma Bank' },
    { ar: 'الانماء', en: 'Alinma Bank' },

    { ar: 'مصرف الراجحي', en: 'Al Rajhi Bank' },
    { ar: 'بنك الراجحي', en: 'Al Rajhi Bank' },
    { ar: 'الراجحي', en: 'Al Rajhi Bank' },

    { ar: 'البنك الأهلي السعودي', en: 'Saudi National Bank (SNB)' },
    { ar: 'البنك الاهلي السعودي', en: 'Saudi National Bank (SNB)' },
    { ar: 'البنك الأهلي', en: 'Saudi National Bank (SNB)' },
    { ar: 'البنك الاهلي', en: 'Saudi National Bank (SNB)' },
    { ar: 'الأهلي', en: 'Saudi National Bank (SNB)' },
    { ar: 'الاهلي', en: 'Saudi National Bank (SNB)' },

    { ar: 'بنك الرياض', en: 'Riyad Bank' },
    { ar: 'مصرف الرياض', en: 'Riyad Bank' },

    { ar: 'بنك البلاد', en: 'Bank Albilad' },
    { ar: 'مصرف البلاد', en: 'Bank Albilad' },
    { ar: 'البلاد', en: 'Bank Albilad' },

    { ar: 'البنك السعودي الفرنسي', en: 'Banque Saudi Fransi (BSF)' },
    { ar: 'السعودي الفرنسي', en: 'Banque Saudi Fransi' },
    { ar: 'بنك الجزيرة', en: 'Bank AlJazira' },
    { ar: 'البنك العربي الوطني', en: 'Arab National Bank (ANB)' },
    { ar: 'البنك السعودي للاستثمار', en: 'Saudi Investment Bank (SAIB)' },
    { ar: 'البنك الأول', en: 'Alawwal Bank (SABB)' },
    { ar: 'البنك الاول', en: 'Alawwal Bank (SABB)' },
    { ar: 'بنك ساب', en: 'SABB Bank' },
    { ar: 'البنك المركزي السعودي', en: 'Saudi Central Bank (SAMA)' },
    { ar: 'مؤسسة النقد العربي السعودي', en: 'SAMA' },
    { ar: 'ساما', en: 'SAMA' },

    // Government & Statutory Authorities
    { ar: 'هيئة الزكاة والضريبة والجمارك', en: 'Zakat, Tax and Customs Authority (ZATCA)' },
    { ar: 'الزكاة والضريبة والجمارك', en: 'ZATCA' },
    { ar: 'مصلحة الزكاة والدخل', en: 'Zakat & Income Tax Authority' },
    { ar: 'المؤسسة العامة للتأمينات الاجتماعية', en: 'General Organization for Social Insurance (GOSI)' },
    { ar: 'التأمينات الاجتماعية', en: 'GOSI' },
    { ar: 'وزارة الموارد البشرية', en: 'Ministry of Human Resources' },
    { ar: 'وزارة التجارة', en: 'Ministry of Commerce' },
    { ar: 'وزارة المالية', en: 'Ministry of Finance' },
    { ar: 'صندوق التنمية العقارية', en: 'Real Estate Development Fund' },
    { ar: 'صندوق الاستثمارات العامة', en: 'Public Investment Fund (PIF)' },

    // Banking, Cash & Payment Accounts
    { ar: 'النقدية وما في حكمها', en: 'Cash and Cash Equivalents' },
    { ar: 'النقدية بالصندوق', en: 'Cash on Hand' },
    { ar: 'النقدية لدى البنوك', en: 'Cash at Banks' },
    { ar: 'النقدية بالبنوك', en: 'Cash at Banks' },
    { ar: 'الصندوق الرئيسي', en: 'Main Cash Fund' },
    { ar: 'صندوق الفرع', en: 'Branch Cash Fund' },
    { ar: 'صندوق المصروفات النثرية', en: 'Petty Cash Fund' },
    { ar: 'العهدة النقدية', en: 'Petty Cash' },
    { ar: 'عهدة نقدية', en: 'Petty Cash Custody' },
    { ar: 'مصروفات نثرية', en: 'Petty Cash Expenses' },
    { ar: 'حساب جاري', en: 'Current Account' },
    { ar: 'حساب توفير', en: 'Savings Account' },
    { ar: 'حساب استثماري', en: 'Investment Account' },
    { ar: 'وديعة لأجل', en: 'Time Deposit' },
    { ar: 'ودائع بنكية', en: 'Bank Deposits' },
    { ar: 'نقاط البيع', en: 'Point of Sale (POS)' },
    { ar: 'أجهزة نقاط البيع', en: 'POS Terminals' },
    { ar: 'شبكة مدى', en: 'Mada Network' },
    { ar: 'بطاقات ائتمانية', en: 'Credit Cards' },
    { ar: 'بوابة الدفع الإلكتروني', en: 'Payment Gateway' },
    { ar: 'سداد', en: 'Sadad' },

    // Receivables & Payables
    { ar: 'الذمم المدينة والعملاء', en: 'Accounts Receivable & Debtors' },
    { ar: 'العملاء التجاريون', en: 'Trade Receivables' },
    { ar: 'العملاء التجاريين', en: 'Trade Receivables' },
    { ar: 'حسابات العملاء', en: 'Customer Accounts' },
    { ar: 'العملاء - محلي', en: 'Local Customers' },
    { ar: 'العملاء - خارجي', en: 'Export Customers' },
    { ar: 'أوراق القبض', en: 'Notes Receivable' },
    { ar: 'شيكات برسم التحصيل', en: 'Checks Under Collection' },
    { ar: 'شيكات تحت التحصيل', en: 'Checks Under Collection' },
    { ar: 'أمانات لدى الغير', en: 'Deposits with Others' },
    { ar: 'تأمينات مستردة', en: 'Refundable Deposits' },
    { ar: 'مخصص الخسائر الائتمانية المتوقعة', en: 'Allowance for Expected Credit Losses (ECL)' },
    { ar: 'مخصص ديون مشكوك فيها', en: 'Allowance for Doubtful Accounts' },
    { ar: 'ديون معدومة', en: 'Bad Debts Written Off' },

    { ar: 'الذمم الدائنة والموردون', en: 'Accounts Payable & Creditors' },
    { ar: 'الموردون التجاريون', en: 'Trade Payables' },
    { ar: 'الموردين التجاريين', en: 'Trade Payables' },
    { ar: 'حسابات الموردين', en: 'Supplier Accounts' },
    { ar: 'الموردون المحليون', en: 'Local Suppliers' },
    { ar: 'الموردون الخارجيون', en: 'Foreign Suppliers' },
    { ar: 'أوراق الدفع', en: 'Notes Payable' },
    { ar: 'شيكات مؤجلة الدفع', en: 'Post-dated Checks Payable' },
    { ar: 'دفعات مقدمة من العملاء', en: 'Customer Advances' },
    { ar: 'دفعات مقدمة للموردين', en: 'Supplier Advances' },

    // Inventory & Assets
    { ar: 'المخزون السلعي', en: 'Merchandise Inventory' },
    { ar: 'مخزون البضائع الجاهزة', en: 'Finished Goods Inventory' },
    { ar: 'مخزون المواد الخام', en: 'Raw Materials Inventory' },
    { ar: 'إنتاج تحت التشغيل', en: 'Work in Progress (WIP)' },
    { ar: 'بضاعة بالطريق', en: 'Goods in Transit' },
    { ar: 'بضاعة أمانة', en: 'Consignment Goods' },
    { ar: 'اعتمادات مستندية', en: 'Letters of Credit (LC)' },
    { ar: 'خطابات ضمان', en: 'Letters of Guarantee (LG)' },
    { ar: 'قطع غيار ومهمات', en: 'Spare Parts & Supplies' },
    { ar: 'أصول متداولة', en: 'Current Assets' },
    { ar: 'أصول غير متداولة', en: 'Non-Current Assets' },
    { ar: 'الأصول الثابتة', en: 'Property, Plant and Equipment (PPE)' },
    { ar: 'العقارات والآلات والمعدات', en: 'Property, Plant and Equipment (PPE)' },
    { ar: 'أصول حق الاستخدام', en: 'Right-of-Use Assets (ROU)' },
    { ar: 'أصول غير ملموسة', en: 'Intangible Assets' },
    { ar: 'شهرة المحل', en: 'Goodwill' },
    { ar: 'مشروعات تحت التنفيذ', en: 'Capital Work in Progress (CWIP)' },
    { ar: 'مجمع الاستهلاك', en: 'Accumulated Depreciation' },
    { ar: 'مجمع الإطفاء', en: 'Accumulated Amortization' },
    { ar: 'مجمع استهلاك المباني', en: 'Accumulated Depreciation - Buildings' },
    { ar: 'مجمع استهلاك الآلات', en: 'Accumulated Depreciation - Machinery' },
    { ar: 'مجمع استهلاك السيارات', en: 'Accumulated Depreciation - Vehicles' },
    { ar: 'مجمع استهلاك الأثاث', en: 'Accumulated Depreciation - Furniture' },
    { ar: 'أجهزة ومعدات تقنية', en: 'IT Hardware & Equipment' },
    { ar: 'برمجيات وتراخيص', en: 'Software & Licenses' },

    // Liabilities & Equity
    { ar: 'التزامات متداولة', en: 'Current Liabilities' },
    { ar: 'التزامات غير متداولة', en: 'Non-Current Liabilities' },
    { ar: 'خصوم متداولة', en: 'Current Liabilities' },
    { ar: 'خصوم غير متداولة', en: 'Non-Current Liabilities' },
    { ar: 'قروض قصيرة الأجل', en: 'Short-term Loans' },
    { ar: 'قروض طويلة الأجل', en: 'Long-term Loans' },
    { ar: 'سحب على المكشوف', en: 'Bank Overdraft' },
    { ar: 'التزامات عقود الإيجار', en: 'Lease Liabilities' },
    { ar: 'مكافأة نهاية الخدمة', en: 'End of Service Benefits (EOSB)' },
    { ar: 'مخصص نهاية الخدمة', en: 'EOSB Provision' },
    { ar: 'مصروفات مستحقة', en: 'Accrued Expenses' },
    { ar: 'إيرادات مقدمة', en: 'Unearned Revenue' },
    { ar: 'إيرادات مؤجلة', en: 'Deferred Revenue' },
    { ar: 'تأمينات للغير', en: 'Customer Deposits Held' },
    { ar: 'رأس المال المدفوع', en: 'Paid-in Share Capital' },
    { ar: 'رأس مال الشركاء', en: 'Partners Capital' },
    { ar: 'رأس المال المصرح به', en: 'Authorized Capital' },
    { ar: 'الاحتياطي النظامي', en: 'Statutory Reserve' },
    { ar: 'الاحتياطي الاتفاقي', en: 'Contractual Reserve' },
    { ar: 'الاحتياطي العام', en: 'General Reserve' },
    { ar: 'الأرباح المبقاة', en: 'Retained Earnings' },
    { ar: 'الأرباح المحتجزة', en: 'Retained Earnings' },
    { ar: 'أرباح العام الحالي', en: 'Current Period Net Profit' },
    { ar: 'خسائر العام الحالي', en: 'Current Period Net Loss' },
    { ar: 'توزيعات أرباح', en: 'Dividends Distributed' },
    { ar: 'جاري الشريك', en: 'Partner Current Account' },
    { ar: 'مسحوبات شخصية', en: 'Owner Drawings' },

    // Taxes & Zakat
    { ar: 'ضريبة القيمة المضافة', en: 'Value Added Tax (VAT)' },
    { ar: 'ضريبة المدخلات المستردة', en: 'Input VAT Recoverable' },
    { ar: 'ضريبة المخرجات المستحقة', en: 'Output VAT Payable' },
    { ar: 'ضريبة القيمة المضافة المستحقة', en: 'VAT Payable' },
    { ar: 'مخصص الزكاة الشرعية', en: 'Zakat Provision' },
    { ar: 'مخصص الزكاة', en: 'Zakat Provision' },
    { ar: 'ضريبة الدخل المستحقة', en: 'Income Tax Payable' },
    { ar: 'ضريبة الاستقطاع', en: 'Withholding Tax' },

    // Revenues & Expenses
    { ar: 'إيرادات المبيعات', en: 'Sales Revenue' },
    { ar: 'مبيعات المنتجات', en: 'Product Sales' },
    { ar: 'إيرادات الخدمات', en: 'Services Revenue' },
    { ar: 'مردودات ومسموحات المبيعات', en: 'Sales Returns and Allowances' },
    { ar: 'مردودات المبيعات', en: 'Sales Returns' },
    { ar: 'مسموحات المبيعات', en: 'Sales Allowances' },
    { ar: 'الخصم المسموح به', en: 'Sales Discounts Allowed' },
    { ar: 'خصم تعجيل الدفع', en: 'Cash Settlement Discount' },
    { ar: 'إيرادات أخرى', en: 'Other Income' },
    { ar: 'أرباح فروق عملة', en: 'Foreign Exchange Gain' },
    { ar: 'خسائر فروق عملة', en: 'Foreign Exchange Loss' },
    { ar: 'عوائد استثمارات', en: 'Investment Income' },
    { ar: 'تكلفة الإيرادات', en: 'Cost of Revenue' },
    { ar: 'تكلفة البضاعة المباعة', en: 'Cost of Goods Sold (COGS)' },
    { ar: 'مشتريات البضاعة', en: 'Merchandise Purchases' },
    { ar: 'مردودات المشتريات', en: 'Purchase Returns' },
    { ar: 'الخصم المكتسب', en: 'Discounts Received' },
    { ar: 'مصاريف الشحن والتوصيل', en: 'Freight & Delivery Expenses' },
    { ar: 'مصاريف بيعية وتسويقية', en: 'Selling & Marketing Expenses' },
    { ar: 'دعاية وإعلان', en: 'Advertising & Promotion' },
    { ar: 'عمولات المبيعات', en: 'Sales Commissions' },
    { ar: 'مصاريف عمومية وإدارية', en: 'General & Administrative Expenses' },
    { ar: 'الرواتب والأجور', en: 'Salaries & Wages' },
    { ar: 'الرواتب الاساسية', en: 'Basic Salaries' },
    { ar: 'الرواتب الأساسية', en: 'Basic Salaries' },
    { ar: 'بدل سكن', en: 'Housing Allowance' },
    { ar: 'بدل مواصلات', en: 'Transportation Allowance' },
    { ar: 'بدل اتصال', en: 'Communication Allowance' },
    { ar: 'مكافآت وحوافز', en: 'Bonuses & Incentives' },
    { ar: 'التأمين الطبي للموظفين', en: 'Employee Medical Insurance' },
    { ar: 'مصروف الاستهلاك', en: 'Depreciation Expense' },
    { ar: 'مصروف الإيجار', en: 'Rent Expense' },
    { ar: 'مصروف الايجار', en: 'Rent Expense' },
    { ar: 'كهرباء ومياه ومرافق', en: 'Electricity, Water & Utilities' },
    { ar: 'هاتف وإنترنت واتصالات', en: 'Telephone, Internet & Telecom' },
    { ar: 'ضيافة ونظافة', en: 'Hospitality & Cleaning' },
    { ar: 'أدوات مكتبية ومطبوعات', en: 'Stationery & Printing' },
    { ar: 'صيانة وتشغيل', en: 'Maintenance & Operations' },
    { ar: 'رسوم حكومية واشتراكات', en: 'Government Fees & Subscriptions' },
    { ar: 'استشارات قانونية ومحاسبية', en: 'Legal & Professional Fees' },
    { ar: 'رسوم بنكية', en: 'Bank Charges' },
    { ar: 'مصاريف تمويلية', en: 'Financing Costs' },
    { ar: 'مصروف الزكاة السنوي', en: 'Annual Zakat Expense' },
    { ar: 'تجديد الإقامات ورخص العمل', en: 'Iqama & Work Permit Renewals' },
    // Journal Entry Narrations & Operations
    { ar: 'سداد مصروف إيجار المقر', en: 'Headquarters Rent Expense Payment' },
    { ar: 'سداد مصروف ايجار المقر', en: 'Headquarters Rent Expense Payment' },
    { ar: 'سداد إيجار المقر', en: 'Headquarters Rent Payment' },
    { ar: 'سداد ايجار المقر', en: 'Headquarters Rent Payment' },
    { ar: 'سداد إيجار', en: 'Rent Payment' },
    { ar: 'سداد ايجار', en: 'Rent Payment' },
    { ar: 'سداد مصروف', en: 'Expense Payment' },
    { ar: 'سداد فاتورة', en: 'Invoice Payment' },
    { ar: 'سداد فواتير', en: 'Invoices Payment' },
    { ar: 'سداد رواتب', en: 'Salaries Payment' },
    { ar: 'سداد مستحقات', en: 'Dues Settlement' },
    { ar: 'تحصيل فاتورة', en: 'Invoice Collection' },
    { ar: 'تحصيل مبيعات', en: 'Sales Collection' },
    { ar: 'تحصيل مستحقات', en: 'Dues Collection' },
    { ar: 'صرف عهدة', en: 'Petty Cash Disbursement' },
    { ar: 'تسوية عهدة', en: 'Petty Cash Settlement' },
    { ar: 'تغذية الصندوق', en: 'Cash Replenishment' },
    { ar: 'تغذية العهدة', en: 'Petty Cash Replenishment' },
    { ar: 'إثبات قيد', en: 'Journal Entry Recording' },
    { ar: 'إثبات مصروف', en: 'Expense Accrual' },
    { ar: 'إثبات استحقاق', en: 'Accrual Recognition' },
    { ar: 'إثبات رواتب', en: 'Salaries Accrual' },
    { ar: 'إثبات فاتورة', en: 'Invoice Recognition' },
    { ar: 'تسوية جردية', en: 'Inventory Adjustment' },
    { ar: 'تحويل بين الحسابات', en: 'Inter-Account Transfer' },
    { ar: 'تحويل بنكي', en: 'Bank Transfer' },
    { ar: 'حوالة بنكية', en: 'Bank Wire Transfer' },
    { ar: 'شراء أصول', en: 'Assets Purchase' },
    { ar: 'شراء بضاعة', en: 'Goods Purchase' },
    { ar: 'دفعة تحت الحساب', en: 'Advance Payment' },
    { ar: 'دفعة مقدمة', en: 'Down Payment' },
    { ar: 'مع توزيع مراكز التكلفة', en: 'with Cost Centers allocation' },
    { ar: 'توزيع مراكز التكلفة', en: 'Cost Centers allocation' },
    { ar: 'لشهر أكتوبر', en: 'for October' },
    { ar: 'لشهر اكتوبر', en: 'for October' },
    { ar: 'لشهر نوفمبر', en: 'for November' },
    { ar: 'لشهر ديسمبر', en: 'for December' },
    { ar: 'لشهر يناير', en: 'for January' },
    { ar: 'لشهر فبراير', en: 'for February' },
    { ar: 'لشهر مارس', en: 'for March' },
    { ar: 'لشهر أبريل', en: 'for April' },
    { ar: 'لشهر مايو', en: 'for May' },
    { ar: 'لشهر يونيو', en: 'for June' },
    { ar: 'لشهر يوليو', en: 'for July' },
    { ar: 'لشهر أغسطس', en: 'for August' },
    { ar: 'لشهر سبتمبر', en: 'for September' },

    // Commercial, Inventory & IT Products
    { ar: 'حاسب آلي محمول', en: 'Laptop Computer' },
    { ar: 'كمبيوتر محمول', en: 'Laptop' },
    { ar: 'حاسب آلي مكتبي', en: 'Desktop Computer' },
    { ar: 'كمبيوتر مكتبي', en: 'Desktop PC' },
    { ar: 'شاشة عرض', en: 'Display Monitor' },
    { ar: 'شاشة كمبيوتر', en: 'Computer Monitor' },
    { ar: 'لوحة مفاتيح', en: 'Keyboard' },
    { ar: 'فأرة لاسلكية', en: 'Wireless Mouse' },
    { ar: 'ماوس لاسلكي', en: 'Wireless Mouse' },
    { ar: 'طابعة ليزر ملونة', en: 'Color Laser Printer' },
    { ar: 'طابعة ليزر', en: 'Laser Printer' },
    { ar: 'طابعة حرارية', en: 'Thermal Printer' },
    { ar: 'طابعة فواتير', en: 'Receipt Printer' },
    { ar: 'طابعة باركود', en: 'Barcode Printer' },
    { ar: 'قارئ باركود', en: 'Barcode Scanner' },
    { ar: 'درج نقدية', en: 'Cash Drawer' },
    { ar: 'شاشة لمس', en: 'Touch Screen' },
    { ar: 'نقطة بيع', en: 'POS Terminal' },
    { ar: 'جهاز بصمة', en: 'Biometric Attendance Device' },
    { ar: 'كاميرا مراقبة', en: 'CCTV Security Camera' },
    { ar: 'كاميرات مراقبة', en: 'CCTV Cameras' },
    { ar: 'جهاز تسجيل رقمي', en: 'Digital Video Recorder (DVR)' },
    { ar: 'ورق تصوير', en: 'Copy Paper' },
    { ar: 'ورق فواتير', en: 'Thermal Receipt Rolls' },
    { ar: 'حبر طابعة', en: 'Printer Cartridge' },
    { ar: 'قرص صلب خارجي', en: 'External Hard Drive' },
    { ar: 'قرص صلب', en: 'Hard Disk Drive' },
    { ar: 'وحدة تخزين سريعة', en: 'SSD Storage' },
    { ar: 'ذاكرة عشوائية', en: 'RAM Memory' },
    { ar: 'كابل شبكة', en: 'Network Cable' },
    { ar: 'كيبل شبكة', en: 'Network Cable' },
    { ar: 'محول طاقة', en: 'Power Adapter' },
    { ar: 'موزع شبكة', en: 'Network Switch' },
    { ar: 'موجه شبكة', en: 'Network Router' },
    { ar: 'مكيف سبليت', en: 'Split Air Conditioner' },
    { ar: 'مكيف دولابي', en: 'Floor Standing AC' },
    { ar: 'مكتب موظف', en: 'Office Desk' },
    { ar: 'كرسي مكتب', en: 'Office Chair' },
    { ar: 'طاولة اجتماعات', en: 'Conference Table' },
    { ar: 'خزانة ملفات', en: 'Filing Cabinet' },
    { ar: 'قطع غيار أصلية', en: 'Genuine Spare Parts' },
    { ar: 'قطع غيار', en: 'Spare Parts' },
    { ar: 'فلتر زيت', en: 'Oil Filter' },
    { ar: 'فلتر هواء', en: 'Air Filter' },
    { ar: 'زيت محرك', en: 'Engine Oil' },
    { ar: 'إطار سيارة', en: 'Car Tire' },
    { ar: 'إطارات سيارات', en: 'Car Tires' },
    { ar: 'صيانة وقائية', en: 'Preventive Maintenance' },
    { ar: 'صيانة تصحيحية', en: 'Corrective Maintenance' },
    { ar: 'صيانة دورية', en: 'Periodic Maintenance' },
    { ar: 'خدمات استشارية', en: 'Consulting Services' },
    { ar: 'استشارات تقنية', en: 'IT Consulting Services' },
    { ar: 'استشارات مالية', en: 'Financial Advisory' },
    { ar: 'دعم فني', en: 'Technical Support' },
    { ar: 'تطوير برمجيات', en: 'Software Development' },
    { ar: 'تصميم مواقع', en: 'Web Design' },
    { ar: 'اشتراك سنوي', en: 'Annual Subscription' },
    { ar: 'اشتراك شهري', en: 'Monthly Subscription' },
    { ar: 'ترخيص برامج', en: 'Software License' },
    { ar: 'ترخيص سنوي', en: 'Annual License' },
    { ar: 'أعمال مقاولات', en: 'Contracting Works' },
    { ar: 'أعمال كهربائية', en: 'Electrical Works' },
    { ar: 'أعمال سباكة', en: 'Plumbing Works' },
    { ar: 'مواد بناء', en: 'Building Materials' },
    { ar: 'مياه شرب', en: 'Drinking Water' },
    { ar: 'أدوات نظافة', en: 'Cleaning Supplies' },
    { ar: 'شحن وتوصيل', en: 'Shipping & Delivery' },
    { ar: 'خدمات نقل', en: 'Transportation Services' },
    { ar: 'تأجير معدات', en: 'Equipment Rental' },
    { ar: 'شركة مساهمة مقفلة', en: 'Closed Joint Stock Co.' },
    { ar: 'شركة ذات مسؤولية محدودة', en: 'Limited Liability Co. (LLC)' },
    { ar: 'شركة الشخص الواحد', en: 'Single Person Co.' },
    { ar: 'مؤسسة فردية', en: 'Sole Proprietorship' },
    { ar: 'الفرع الرئيسي', en: 'Main Branch' },
    { ar: 'فرع الرياض', en: 'Riyadh Branch' },
    { ar: 'فرع جدة', en: 'Jeddah Branch' },
    { ar: 'فرع الدمام', en: 'Dammam Branch' }
  ];

  // Single word dictionary
  private readonly wordDictionary: Record<string, string> = {
    // Entities & Banks
    'انماء': 'Alinma',
    'إنماء': 'Alinma',
    'الانماء': 'Alinma',
    'الإنماء': 'Alinma',
    'راجحي': 'Al Rajhi',
    'الراجحي': 'Al Rajhi',
    'اهلي': 'National',
    'الاهلي': 'National Bank',
    'الأهلي': 'National Bank',
    'بلاد': 'Albilad',
    'البلاد': 'Bank Albilad',
    'جزيرة': 'AlJazira',
    'الجزيرة': 'Bank AlJazira',
    'رياض': 'Riyad',
    'الرياض': 'Riyad Bank',
    'فرنسي': 'Fransi',
    'الفرنسي': 'Banque Saudi Fransi',
    'عربي': 'Arab Bank',
    'العربي': 'Arab Bank',
    'استثمار': 'Investment',
    'الاستثمار': 'Saudi Investment Bank',
    'ساب': 'SABB',
    'سامبا': 'Samba',
    'ساما': 'SAMA',
    'تداول': 'Tadawul',
    'مدى': 'Mada',
    'سداد_نظام': 'Sadad',
    'سداد': 'Payment',
    'تحصيل': 'Collection',
    'صرف': 'Disbursement',
    'قيد': 'Entry',
    'إثبات': 'Recording',
    'اثبات': 'Recording',
    'تسوية': 'Adjustment',
    'شراء': 'Purchase',
    'بيع': 'Sale',
    'المقر': 'Headquarters',
    'مقر': 'Headquarters',
    'شهر': 'Month',
    'لشهر': 'for Month of',
    'يناير': 'January',
    'فبراير': 'February',
    'مارس': 'March',
    'أبريل': 'April',
    'ابريل': 'April',
    'مايو': 'May',
    'يونيو': 'June',
    'يوليو': 'July',
    'أغسطس': 'August',
    'اغسطس': 'August',
    'سبتمبر': 'September',
    'أكتوبر': 'October',
    'اكتوبر': 'October',
    'نوفمبر': 'November',
    'ديسمبر': 'December',
    'ارامكو': 'Aramco',
    'أرامكو': 'Aramco',
    'سابك': 'SABIC',

    // Core Accounting Words
    'اصول': 'Assets',
    'أصول': 'Assets',
    'اصل': 'Asset',
    'أصل': 'Asset',
    'التزامات': 'Liabilities',
    'التزام': 'Liability',
    'خصوم': 'Liabilities',
    'خصم': 'Discount / Liability',
    'حقوق': 'Equity',
    'ملكية': 'Equity',
    'ايراد': 'Revenue',
    'إيراد': 'Revenue',
    'ايرادات': 'Revenues',
    'إيرادات': 'Revenues',
    'مبيعات': 'Sales',
    'مبيعة': 'Sale',
    'مشتريات': 'Purchases',
    'مشتري': 'Purchaser',
    'تكلفة': 'Cost',
    'تكاليف': 'Costs',
    'مصروف': 'Expense',
    'مصاريف': 'Expenses',
    'مصروفات': 'Expenses',
    'نقد': 'Cash',
    'نقدية': 'Cash',
    'بنك': 'Bank',
    'بنوك': 'Banks',
    'مصرف': 'Bank',
    'مصارف': 'Banks',
    'صندوق': 'Cash Fund',
    'صناديق': 'Cash Funds',
    'خزينة': 'Treasury',
    'عملاء': 'Customers',
    'عميل': 'Customer',
    'زبائن': 'Clients',
    'موردون': 'Suppliers',
    'موردين': 'Suppliers',
    'مورد': 'Supplier',
    'مخزون': 'Inventory',
    'بضاعة': 'Merchandise',
    'بضائع': 'Goods',
    'استهلاك': 'Depreciation',
    'اطفاء': 'Amortization',
    'إطفاء': 'Amortization',
    'مجمع': 'Accumulated',
    'راس': 'Capital',
    'رأس': 'Capital',
    'مال': 'Capital',
    'اموال': 'Funds',
    'احتياطي': 'Reserve',
    'احتياطيات': 'Reserves',
    'ارباح': 'Profits',
    'أرباح': 'Profits',
    'ربح': 'Profit',
    'خسائر': 'Losses',
    'خسارة': 'Loss',
    'ضريبة': 'Tax',
    'ضرائب': 'Taxes',
    'زكاة': 'Zakat',
    'جمارك': 'Customs',
    'رواتب': 'Salaries',
    'راتب': 'Salary',
    'اجور': 'Wages',
    'أجور': 'Wages',
    'ايجار': 'Rent',
    'إيجار': 'Rent',
    'تامين': 'Insurance',
    'تأمين': 'Insurance',
    'تامينات': 'Insurances',
    'تأمينات': 'Insurances',
    'كهرباء': 'Electricity',
    'مياه': 'Water',
    'اتصالات': 'Telecom',
    'هاتف': 'Telephone',
    'جوال': 'Mobile',
    'انترنت': 'Internet',
    'إنترنت': 'Internet',
    'صيانة': 'Maintenance',
    'تشغيل': 'Operations',
    'تسويق': 'Marketing',
    'دعاية': 'Advertising',
    'اعلان': 'Promotion',
    'إعلان': 'Promotion',
    'سيارات': 'Vehicles',
    'سيارة': 'Vehicle',
    'شاحنات': 'Trucks',
    'مباني': 'Buildings',
    'مبنى': 'Building',
    'اراضي': 'Lands',
    'أراضي': 'Lands',
    'ارض': 'Land',
    'أرض': 'Land',
    'اثاث': 'Furniture',
    'أثاث': 'Furniture',
    'مفروشات': 'Furnishings',
    'اجهزة': 'Equipment',
    'أجهزة': 'Equipment',
    'معدات': 'Machinery',
    'ادوات': 'Tools',
    'أدوات': 'Tools',
    'برامج': 'Software',
    'برمجيات': 'Software',
    'حاسب': 'Computer',
    'حواسب': 'Computers',
    'كمبيوتر': 'Computer',
    'استشارات': 'Consulting',
    'عمولة': 'Commission',
    'عمولات': 'Commissions',
    'رسوم': 'Fees',
    'رسم': 'Fee',
    'قرض': 'Loan',
    'قروض': 'Loans',
    'سلفة': 'Advance',
    'سلف': 'Advances',
    'تمويل': 'Financing',
    'تسهيلات': 'Facilities',
    'جاري': 'Current',
    'جار': 'Current',
    'ثابت': 'Fixed',
    'متداول': 'Current',
    'رئيسي': 'Main',
    'فرعي': 'Sub',
    'محلي': 'Local',
    'خارجي': 'Foreign',
    'دولي': 'International',
    'مستحق': 'Accrued',
    'مستحقات': 'Accruals',
    'مقدم': 'Prepaid',
    'مقدمات': 'Advances',
    'مؤجل': 'Deferred',
    'سنوي': 'Annual',
    'شهري': 'Monthly',
    'تجاري': 'Trade',
    'عام': 'General',
    'اداري': 'Administrative',
    'إداري': 'Administrative',
    'تشغيلي': 'Operating',
    'تمويلي': 'Financing',
    'استثماري': 'Investment',
    'مخصص': 'Provision',
    'مخصصات': 'Provisions',
    'عهدة': 'Custody / Petty Cash',
    'عهد': 'Custodies',
    'فرع': 'Branch',
    'فروع': 'Branches',
    'مكتب': 'Office',
    'مكاتب': 'Offices',
    'مستودع': 'Warehouse',
    'مستودعات': 'Warehouses',
    'معرض': 'Showroom',
    'معارض': 'Showrooms',
    'مركز': 'Center',
    'تكلفة_مركز': 'Cost Center',
    'مشروع': 'Project',
    'مشاريع': 'Projects',
    'عقد': 'Contract',
    'عقود': 'Contracts',
    'شيك': 'Check',
    'شيكات': 'Checks',
    'حوالة': 'Transfer',
    'حوالات': 'Transfers',
    'ضمان': 'Guarantee',
    'ضمانات': 'Guarantees',
    'وديعة': 'Deposit',
    'ودائع': 'Deposits',
    'سند': 'Bond / Voucher',
    'سندات': 'Bonds / Vouchers',
    'سهم': 'Share',
    'اسهم': 'Shares',
    'أسهم': 'Shares',
    'شريك': 'Partner',
    'شركاء': 'Partners',
    'شركة': 'Company',
    'مؤسسة': 'Establishment',

    // Tech Brands
    'ديل': 'Dell',
    'اتش بي': 'HP',
    'إتش بي': 'HP',
    'لينوفو': 'Lenovo',
    'ابل': 'Apple',
    'آبل': 'Apple',
    'سامسونج': 'Samsung',
    'اسوس': 'Asus',
    'أسوس': 'Asus',
    'ايسر': 'Acer',
    'إيسر': 'Acer',
    'ال جي': 'LG',
    'إل جي': 'LG',
    'سيسكو': 'Cisco',
    'سوني': 'Sony',
    'كانون': 'Canon',
    'ابسون': 'Epson',
    'إبسون': 'Epson',
    'زيروكس': 'Xerox',
    'مايكروسوفت': 'Microsoft',
    'هواوي': 'Huawei',
    'شاومي': 'Xiaomi',
    'تويوتا': 'Toyota',
    'هيونداي': 'Hyundai',
    'شنايدر': 'Schneider',
    'سيمنز': 'Siemens',
    'بوش': 'Bosch',

    // Hardware, IT & Electronics
    'لابتوب': 'Laptop',
    'حاسوب': 'Computer',
    'سيرفر': 'Server',
    'خادم': 'Server',
    'شاشة': 'Monitor',
    'شاشات': 'Monitors',
    'كيبورد': 'Keyboard',
    'ماوس': 'Mouse',
    'طابعة': 'Printer',
    'طابعات': 'Printers',
    'حبر': 'Ink',
    'احبار': 'Inks',
    'أحبار': 'Inks',
    'تونر': 'Toner',
    'سكنر': 'Scanner',
    'ماسح': 'Scanner',
    'راوتر': 'Router',
    'سويتش': 'Switch',
    'كيبل': 'Cable',
    'كابل': 'Cable',
    'اسلاك': 'Wires',
    'سلك': 'Wire',
    'موبايل': 'Mobile',
    'تابلت': 'Tablet',
    'سماعة': 'Headset',
    'سماعات': 'Headsets',
    'كاميرا': 'Camera',
    'كاميرات': 'Cameras',
    'ذاكرة': 'Memory',
    'رام': 'RAM',
    'فلاشة': 'USB Drive',
    'هارد': 'Hard Disk',
    'شاحن': 'Charger',
    'شواحن': 'Chargers',
    'بطارية': 'Battery',
    'بطاريات': 'Batteries',
    'برنامج': 'Software',
    'تطبيق': 'App',
    'تطبيقات': 'Apps',
    'ترخيص': 'License',
    'تراخيص': 'Licenses',
    'اشتراك': 'Subscription',
    'اشتراكات': 'Subscriptions',
    'استضافة': 'Hosting',
    'سحابي': 'Cloud',
    'سحابية': 'Cloud',

    // Stationery & Office
    'ورق': 'Paper',
    'اوراق': 'Papers',
    'أوراق': 'Papers',
    'ملف': 'Folder',
    'ملفات': 'Folders',
    'قلم': 'Pen',
    'اقلام': 'Pens',
    'أقلام': 'Pens',
    'دفتر': 'Notebook',
    'دفاتر': 'Notebooks',
    'دباسة': 'Stapler',
    'خرامة': 'Puncher',
    'مقص': 'Scissors',
    'لاصق': 'Tape',
    'غراء': 'Glue',
    'سبورة': 'Whiteboard',
    'طاولة': 'Table',
    'كرسي': 'Chair',
    'كراسي': 'Chairs',
    'خزانة': 'Cabinet',
    'دولاب': 'Cupboard',
    'رف': 'Shelf',
    'ارفف': 'Shelves',
    'أرفف': 'Shelves',
    'ستارة': 'Curtain',
    'ستائر': 'Curtains',
    'مكيف': 'AC',
    'مكيفات': 'ACs',

    // Industrial & Spare Parts
    'غيار': 'Spare Parts',
    'قطع': 'Parts',
    'قطعة': 'Piece',
    'زيت': 'Oil',
    'زيوت': 'Oils',
    'فلتر': 'Filter',
    'فلاتر': 'Filters',
    'اطار': 'Tire',
    'إطار': 'Tire',
    'اطارات': 'Tires',
    'كفر': 'Tire',
    'كفرات': 'Tires',
    'سير': 'Belt',
    'حزام': 'Belt',
    'مضخة': 'Pump',
    'طلمبة': 'Pump',
    'صمام': 'Valve',
    'محبس': 'Valve',
    'محرك': 'Motor',
    'ماكينة': 'Machine',
    'انبوب': 'Pipe',
    'أنبوب': 'Pipe',
    'مواسير': 'Pipes',
    'حديد': 'Steel',
    'صلب': 'Steel',
    'المنيوم': 'Aluminum',
    'ألمنيوم': 'Aluminum',
    'نحاس': 'Copper',
    'بلاستيك': 'Plastic',
    'كرتون': 'Carton',
    'كرتونة': 'Carton',
    'كراتين': 'Cartons',
    'علبة': 'Box',
    'علب': 'Boxes',
    'كيس': 'Bag',
    'اكياس': 'Bags',
    'أكياس': 'Bags',
    'طرد': 'Package',
    'برميل': 'Barrel',
    'جالون': 'Gallon',
    'رول': 'Roll',

    // Units & Measures
    'حبة': 'Piece',
    'حبات': 'Pieces',
    'درزن': 'Dozen',
    'طقم': 'Set',
    'متر': 'Meter',
    'كيلو': 'Kg',
    'كيلوجرام': 'Kg',
    'جرام': 'Gram',
    'طن': 'Ton',
    'لتر': 'Liter',
    'ساعة': 'Hour',
    'ساعات': 'Hours',
    'يوم': 'Day',
    'ايام': 'Days',
    'أيام': 'Days',
    'اسبوع': 'Week',
    'أسبوع': 'Week',
    'سنة': 'Year',

    // Commercial & Attributes
    'تجارة': 'Trading',
    'مقاولات': 'Contracting',
    'خدمات': 'Services',
    'خدمة': 'Service',
    'استيراد': 'Import',
    'تصدير': 'Export',
    'صناعة': 'Industry',
    'صناعات': 'Industries',
    'توزيع': 'Distribution',
    'تقنية': 'Technology',
    'تكنولوجيا': 'Technology',
    'حلول': 'Solutions',
    'نقل': 'Transport',
    'لوجستيات': 'Logistics',
    'عقارات': 'Real Estate',
    'تطوير': 'Development',
    'قابضة': 'Holding',
    'محدودة': 'Limited',
    'مساهمة': 'Joint Stock',
    'جديد': 'New',
    'مستعمل': 'Used',
    'اصلي': 'Original',
    'أصلي': 'Original',
    'صناعي': 'Industrial',
    'منزلي': 'Domestic',
    'صغير': 'Small',
    'وسط': 'Medium',
    'كبير': 'Large',
    'ابيض': 'White',
    'أبيض': 'White',
    'اسود': 'Black',
    'أسود': 'Black',
    'ازرق': 'Blue',
    'أزرق': 'Blue',
    'احمر': 'Red',
    'أحمر': 'Red',
    'اخضر': 'Green',
    'أخضر': 'Green',
    'رمادي': 'Gray',
    'فضي': 'Silver',
    'ذهبي': 'Gold'
  };

  // Phonetic Arabic to Latin table for proper transliteration of names
  private readonly arToLatinMap: Record<string, string> = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ء': '', 'ئ': 'e', 'ؤ': 'o',
    'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
    'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'ah'
  };

  /**
   * Normalizes Arabic text for flexible matching:
   * Removes tashkeel, standardizes hamzas (أ, إ, آ -> ا), replaces ة with ه, ى with ي
   */
  normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel/diacritics
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .trim();
  }

  /**
   * Translates Arabic text to English accounting name.
   * Guarantees that the resulting English name contains NO raw Arabic characters.
   */
  translateArabicToEnglish(arabicText: string): string {
    if (!arabicText || !arabicText.trim()) return '';

    let text = arabicText.trim();
    const normalizedInput = this.normalizeArabic(text);

    // 1. Direct match on normalized phrase dictionary (exact match)
    for (const phrase of this.phraseDictionary) {
      if (this.normalizeArabic(phrase.ar).toLowerCase() === normalizedInput.toLowerCase()) {
        return phrase.en;
      }
    }

    // 2. Direct single-word dictionary lookup on normalized text
    if (this.wordDictionary[normalizedInput]) {
      return this.wordDictionary[normalizedInput];
    }
    if (this.wordDictionary[text]) {
      return this.wordDictionary[text];
    }

    // 3. Sequential phrase replacement on the text (longest phrases first)
    const sortedPhrases = [...this.phraseDictionary].sort((a, b) => b.ar.length - a.ar.length);
    let workingText = text;

    for (const phrase of sortedPhrases) {
      const normAr = this.normalizeArabic(phrase.ar);
      // Try exact phrase in workingText
      if (workingText.includes(phrase.ar)) {
        workingText = workingText.split(phrase.ar).join(` ${phrase.en} `);
      } else {
        // Try normalized regex match
        const regex = new RegExp(`(^|\\s)${this.escapeRegex(phrase.ar)}($|\\s)`, 'gi');
        if (regex.test(workingText)) {
          workingText = workingText.replace(regex, `$1${phrase.en}$2`);
        }
      }
    }

    // If all Arabic was translated, clean and return
    if (!this.containsArabic(workingText)) {
      return this.cleanEnglishOutput(workingText);
    }

    // 4. Tokenized word-by-word translation & phonetic transliteration
    const tokens = workingText.split(/(\s+|-|\/|\(|\))/);
    const resultTokens: string[] = [];

    for (const token of tokens) {
      const cleanToken = token.trim();
      if (!cleanToken) {
        resultTokens.push(token);
        continue;
      }

      // Preserve punctuation and numbers
      if (token === '-' || token === '/' || token === '(' || token === ')' || /^[0-9]+$/.test(token)) {
        resultTokens.push(token);
        continue;
      }

      // If token is already English/Latin
      if (!this.containsArabic(token)) {
        resultTokens.push(token);
        continue;
      }

      const normToken = this.normalizeArabic(cleanToken);

      // Check word dictionary with original and normalized token
      if (this.wordDictionary[cleanToken]) {
        resultTokens.push(this.wordDictionary[cleanToken]);
        continue;
      }
      if (this.wordDictionary[normToken]) {
        resultTokens.push(this.wordDictionary[normToken]);
        continue;
      }

      // Check without Arabic definite article "ال"
      if (cleanToken.startsWith('ال') && cleanToken.length > 3) {
        const withoutAl = cleanToken.substring(2);
        const normWithoutAl = this.normalizeArabic(withoutAl);

        if (this.wordDictionary[withoutAl]) {
          resultTokens.push(this.wordDictionary[withoutAl]);
          continue;
        }
        if (this.wordDictionary[normWithoutAl]) {
          resultTokens.push(this.wordDictionary[normWithoutAl]);
          continue;
        }
      }

      // 5. Ultimate Fallback: Phonetically transliterate Arabic token into Latin letters
      // so NO raw Arabic characters ever remain in the English field!
      const transliterated = this.transliterateArabicWord(cleanToken);
      resultTokens.push(transliterated);
    }

    const finalEnglish = resultTokens.join('');
    return this.cleanEnglishOutput(finalEnglish);
  }

  /**
   * Translates English text to Arabic accounting name
   */
  translateEnglishToArabic(englishText: string): string {
    if (!englishText || !englishText.trim()) return '';

    let text = englishText.trim();
    const cleanEn = text.toLowerCase();

    // 1. Exact phrase match in reverse
    for (const phrase of this.phraseDictionary) {
      if (cleanEn === phrase.en.toLowerCase()) {
        return phrase.ar;
      }
    }

    // Common Saudi Bank Acronyms & Short forms
    if (cleanEn === 'alinma' || cleanEn === 'al inma' || cleanEn === 'alinma bank') {
      return 'مصرف الإنماء';
    }
    if (cleanEn === 'rajhi' || cleanEn === 'al rajhi' || cleanEn === 'alrajhi') {
      return 'مصرف الراجحي';
    }
    if (cleanEn === 'snb' || cleanEn === 'alahli' || cleanEn === 'national bank') {
      return 'البنك الأهلي السعودي';
    }
    if (cleanEn === 'riyad bank' || cleanEn === 'riyadh bank') {
      return 'بنك الرياض';
    }
    if (cleanEn === 'albilad' || cleanEn === 'bank albilad') {
      return 'بنك البلاد';
    }
    if (cleanEn === 'aljazira' || cleanEn === 'bank aljazira') {
      return 'بنك الجزيرة';
    }
    if (cleanEn === 'sabb' || cleanEn === 'alawwal') {
      return 'البنك الأول (ساب)';
    }

    // 2. Partial phrase match in reverse (longest phrases first)
    const sortedPhrases = [...this.phraseDictionary].sort((a, b) => b.en.length - a.en.length);
    let workingText = text;

    for (const phrase of sortedPhrases) {
      const reg = new RegExp(`\\b${this.escapeRegex(phrase.en)}\\b`, 'gi');
      if (reg.test(workingText)) {
        workingText = workingText.replace(reg, phrase.ar);
      }
    }

    if (!this.containsLatin(workingText)) {
      return this.cleanArabicOutput(workingText);
    }

    // 3. Word-by-word tokenized reverse lookup
    const reverseWordMap = new Map<string, string>();
    for (const [ar, en] of Object.entries(this.wordDictionary)) {
      reverseWordMap.set(en.toLowerCase(), ar);
    }

    const tokens = workingText.split(/(\s+|-|\/|\(|\))/);
    const resultTokens: string[] = [];

    for (const token of tokens) {
      const cleanToken = token.trim();
      if (!cleanToken) {
        resultTokens.push(token);
        continue;
      }

      if (token === '-' || token === '/' || token === '(' || token === ')' || /^[0-9]+$/.test(token)) {
        resultTokens.push(token);
        continue;
      }

      const lower = cleanToken.toLowerCase();
      if (reverseWordMap.has(lower)) {
        resultTokens.push(reverseWordMap.get(lower)!);
        continue;
      }

      // Check if singular/plural or contains in reverse map
      let foundWord = false;
      for (const [enKey, arVal] of reverseWordMap.entries()) {
        if (enKey === lower || lower.startsWith(enKey) || enKey.startsWith(lower)) {
          resultTokens.push(arVal);
          foundWord = true;
          break;
        }
      }

      if (!foundWord) {
        resultTokens.push(cleanToken);
      }
    }

    return this.cleanArabicOutput(resultTokens.join(''));
  }

  /**
   * Phonetically transliterates an Arabic word into proper Latin characters
   * e.g. "الانماء" -> "Alinma", "الراجحي" -> "Alrajhi", "العليان" -> "Alolayan"
   */
  private transliterateArabicWord(word: string): string {
    if (!word) return '';

    let w = word.trim();
    let prefix = '';

    // Detect "ال" prefix
    if (w.startsWith('ال') && w.length > 2) {
      prefix = 'Al-';
      w = w.substring(2);
    } else if (w.startsWith('وال') && w.length > 3) {
      prefix = 'Wa Al-';
      w = w.substring(3);
    }

    let latin = '';
    for (let i = 0; i < w.length; i++) {
      const char = w[i];
      const nextChar = i + 1 < w.length ? w[i + 1] : '';

      // Special combinations
      if (char === 'ا' && nextChar === 'ء') {
        latin += 'aa';
        i++;
        continue;
      }

      if (this.arToLatinMap[char] !== undefined) {
        latin += this.arToLatinMap[char];
      } else {
        // Drop unknown non-ascii Arabic control character
      }
    }

    // Capitalize first letter
    if (latin.length > 0) {
      latin = latin.charAt(0).toUpperCase() + latin.slice(1);
    }

    return prefix + latin;
  }

  public containsArabic(str: string): boolean {
    if (!str) return false;
    return /[\u0600-\u06FF]/.test(str);
  }

  public containsLatin(str: string): boolean {
    if (!str) return false;
    return /[a-zA-Z]/.test(str);
  }

  /**
   * Helper method to translate between Arabic and English automatically based on detected language
   */
  autoTranslate(input: string, sourceLang?: 'ar' | 'en'): string {
    if (!input || !input.trim()) return '';
    const src = sourceLang || (this.containsArabic(input) ? 'ar' : 'en');
    return src === 'ar' ? this.translateArabicToEnglish(input) : this.translateEnglishToArabic(input);
  }

  private cleanEnglishOutput(str: string): string {
    return str
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/\bAl\s*-\s*/gi, 'Al-')
      .replace(/\bWa\s*Al\s*-\s*/gi, 'Wa Al-')
      .replace(/\s*\/\s*/g, ' / ')
      .trim();
  }

  private cleanArabicOutput(str: string): string {
    return str
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/\s*\/\s*/g, ' / ')
      .trim();
  }

  /**
   * Online accurate translation method with local fallback & caching
   * Communicates with public translation service for accurate natural language translation
   * @param text Text to translate
   * @param from Source language ('ar' or 'en', auto-detected if empty)
   * @param to Target language ('en' or 'ar')
   */
  async translateOnline(text: string, from?: 'ar' | 'en', to?: 'ar' | 'en'): Promise<string> {
    if (!text || !text.trim()) return '';
    const trimmed = text.trim();

    const sourceLang = from || (this.containsArabic(trimmed) ? 'ar' : 'en');
    const targetLang = to || (sourceLang === 'ar' ? 'en' : 'ar');

    // 1. Check in-memory cache
    const cacheKey = `${sourceLang}->${targetLang}:${trimmed}`;
    if (this.onlineCache.has(cacheKey)) {
      return this.onlineCache.get(cacheKey)!;
    }

    // 2. Fallback if no HttpClient is injected
    if (!this.http) {
      return sourceLang === 'ar'
        ? this.translateArabicToEnglish(trimmed)
        : this.translateEnglishToArabic(trimmed);
    }

    // 3. Online translation via WebAPI backend proxy (CORS-free server-to-server request)
    try {
      const apiUrl = `${environment.apiUrl}/api/translation/translate?text=${encodeURIComponent(trimmed)}&from=${sourceLang}&to=${targetLang}`;
      const response: any = await firstValueFrom(
        this.http.get(apiUrl).pipe(
          timeout(5000),
          catchError(() => of(null))
        )
      );

      if (response && response.translatedText) {
        const translated = response.translatedText.trim();
        if (translated) {
          const finalResult = targetLang === 'en'
            ? this.cleanEnglishOutput(translated)
            : this.cleanArabicOutput(translated);

          this.onlineCache.set(cacheKey, finalResult);
          return finalResult;
        }
      }
    } catch (err) {
      console.warn('Backend translation proxy failed, using local dictionary fallback:', err);
    }

    // 4. Fallback to local dictionary & transliteration
    const fallback = sourceLang === 'ar'
      ? this.translateArabicToEnglish(trimmed)
      : this.translateEnglishToArabic(trimmed);

    return fallback;
  }

  /**
   * Universal Real-Time Translation with Instant Local Preview and Google Web API Online Refinement:
   * 1. Returns instant local translation immediately (0ms).
   * 2. After debounce (default 450ms), contacts Google Public Web API (via backend proxy)
   *    and calls onRefined with the grammatically & contextually accurate translation.
   */
  translateWithOnlineRefinement(
    text: string,
    onInitial: (initialVal: string) => void,
    onRefined?: (refinedVal: string) => void,
    debounceMs: number = 450
  ): void {
    if (!text || !text.trim()) {
      onInitial('');
      if (onRefined) onRefined('');
      return;
    }

    const trimmed = text.trim();
    // 1. Instant local dictionary translation for zero UI latency
    const initial = this.autoTranslate(trimmed);
    onInitial(initial);

    if (!onRefined) return;

    // 2. Debounced online call for accurate translation
    clearTimeout(this.globalDebounceTimer);
    this.globalDebounceTimer = setTimeout(async () => {
      try {
        const refined = await this.translateOnline(trimmed);
        if (refined) {
          onRefined(refined);
        }
      } catch {
        // preserve initial
      }
    }, debounceMs);
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export { AccountingTranslatorService as TranslationService };
