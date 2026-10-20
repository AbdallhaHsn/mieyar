import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AccountingTranslatorService {

  // Dictionary of specialized financial, banking, and accounting terms (Ar <-> En)
  private readonly phraseDictionary: { ar: string; en: string }[] = [
    // Banking & Cash
    { ar: 'النقدية وما في حكمها', en: 'Cash and Cash Equivalents' },
    { ar: 'النقدية بالصندوق', en: 'Cash on Hand' },
    { ar: 'الصندوق الرئيسي', en: 'Main Cash Fund' },
    { ar: 'العهدة النقدية', en: 'Petty Cash' },
    { ar: 'مصروفات نثرية', en: 'Petty Cash Expenses' },
    { ar: 'حساب جاري', en: 'Current Account' },
    { ar: 'حساب استثماري', en: 'Investment Account' },
    { ar: 'نقاط البيع', en: 'Point of Sale (POS)' },
    { ar: 'مصرف الراجحي', en: 'Al Rajhi Bank' },
    { ar: 'البنك الأهلي السعودي', en: 'Saudi National Bank (SNB)' },
    { ar: 'مصرف الإنماء', en: 'Alinma Bank' },
    { ar: 'بنك الرياض', en: 'Riyadh Bank' },
    { ar: 'بنك البلاد', en: 'Bank Albilad' },
    { ar: 'البنك السعودي الفرنسي', en: 'Banque Saudi Fransi' },
    { ar: 'البنك العربي الوطني', en: 'Arab National Bank' },
    { ar: 'بنك الجزيرة', en: 'Bank AlJazira' },
    { ar: 'البنك الأول', en: 'SABB / Alawwal Bank' },

    // Receivables & Payables
    { ar: 'الذمم المدينة والعملاء', en: 'Accounts Receivable & Debtors' },
    { ar: 'العملاء التجاريون', en: 'Trade Receivables' },
    { ar: 'العملاء - محلي', en: 'Local Customers' },
    { ar: 'العملاء - خارجي', en: 'Export Customers' },
    { ar: 'أوراق القبض', en: 'Notes Receivable' },
    { ar: 'الذمم الدائنة والموردون', en: 'Accounts Payable & Creditors' },
    { ar: 'الموردون التجاريون', en: 'Trade Payables' },
    { ar: 'الموردون المحليون', en: 'Local Vendors' },
    { ar: 'الموردون الخارجيون', en: 'Foreign Vendors' },
    { ar: 'أوراق الدفع', en: 'Notes Payable' },
    { ar: 'مخصص الخسائر الائتمانية المتوقعة', en: 'Allowance for Expected Credit Losses (ECL)' },
    { ar: 'مخصص ديون مشكوك فيها', en: 'Allowance for Doubtful Debts' },
    { ar: 'ديون معدومة', en: 'Bad Debts Written Off' },

    // Inventory & Assets
    { ar: 'المخزون السلعي', en: 'Merchandise Inventory' },
    { ar: 'مخزون البضائع الجاهزة', en: 'Finished Goods Inventory' },
    { ar: 'بضاعة بالطريق', en: 'Goods in Transit' },
    { ar: 'اعتمادات مستندية', en: 'Letters of Credit (LC)' },
    { ar: 'قطع غيار ومهمات', en: 'Spare Parts & Supplies' },
    { ar: 'أصول متداولة', en: 'Current Assets' },
    { ar: 'أصول غير متداولة', en: 'Non-Current Assets' },
    { ar: 'الأصول الثابتة', en: 'Fixed Assets' },
    { ar: 'العقارات والآلات والمعدات', en: 'Property, Plant and Equipment (PPE)' },
    { ar: 'أصول حق الاستخدام', en: 'Right-of-Use Assets (ROU)' },
    { ar: 'أصول غير ملموسة', en: 'Intangible Assets' },
    { ar: 'مشروعات تحت التنفيذ', en: 'Capital Work in Progress (CWIP)' },
    { ar: 'مجمع الاستهلاك', en: 'Accumulated Depreciation' },
    { ar: 'مجمع الإطفاء', en: 'Accumulated Amortization' },
    { ar: 'مجمع استهلاك المباني', en: 'Accumulated Depreciation - Buildings' },
    { ar: 'مجمع استهلاك الآلات', en: 'Accumulated Depreciation - Machinery' },
    { ar: 'مجمع استهلاك السيارات', en: 'Accumulated Depreciation - Vehicles' },
    { ar: 'أجهزة ومعدات تقنية', en: 'IT Hardware & Equipment' },
    { ar: 'برمجيات وتراخيص', en: 'Software & Licenses' },

    // Liabilities & Equity
    { ar: 'التزامات متداولة', en: 'Current Liabilities' },
    { ar: 'التزامات غير متداولة', en: 'Non-Current Liabilities' },
    { ar: 'قروض قصيرة الأجل', en: 'Short-term Loans' },
    { ar: 'قروض طويلة الأجل', en: 'Long-term Loans' },
    { ar: 'التزامات عقود الإيجار', en: 'Lease Liabilities' },
    { ar: 'مكافأة نهاية الخدمة', en: 'End of Service Benefits (EOSB)' },
    { ar: 'مخصص نهاية الخدمة', en: 'EOSB Provision' },
    { ar: 'مصروفات مستحقة', en: 'Accrued Expenses' },
    { ar: 'إيرادات مقدمة', en: 'Unearned Revenue' },
    { ar: 'تأمينات للغير', en: 'Customer Deposits' },
    { ar: 'رأس المال المدفوع', en: 'Paid-in Share Capital' },
    { ar: 'رأس مال الشركاء', en: 'Partners Capital' },
    { ar: 'الاحتياطي النظامي', en: 'Statutory Reserve' },
    { ar: 'الاحتياطي العام', en: 'General Reserve' },
    { ar: 'الأرباح المبقاة', en: 'Retained Earnings' },
    { ar: 'الأرباح المحتجزة', en: 'Retained Earnings' },
    { ar: 'أرباح العام الحالي', en: 'Current Period Net Profit' },
    { ar: 'توزيعات أرباح', en: 'Dividends Distributed' },
    { ar: 'جاري الشريك', en: 'Partner Current Account' },

    // Taxes & Zakat
    { ar: 'ضريبة القيمة المضافة', en: 'Value Added Tax (VAT)' },
    { ar: 'ضريبة المدخلات المستردة', en: 'Input VAT Recoverable' },
    { ar: 'ضريبة المخرجات المستحقة', en: 'Output VAT Payable' },
    { ar: 'هيئة الزكاة والضريبة والجمارك', en: 'ZATCA' },
    { ar: 'مخصص الزكاة الشرعية', en: 'Zakat Provision' },
    { ar: 'ضريبة الدخل المستحقة', en: 'Income Tax Payable' },
    { ar: 'ضريبة الاستقطاع', en: 'Withholding Tax' },

    // Revenues & Expenses
    { ar: 'إيرادات المبيعات', en: 'Sales Revenue' },
    { ar: 'مبيعات المنتجات', en: 'Product Sales' },
    { ar: 'إيرادات الخدمات', en: 'Services Revenue' },
    { ar: 'مردودات ومسموحات المبيعات', en: 'Sales Returns and Allowances' },
    { ar: 'الخصم المسموح به', en: 'Sales Discounts Allowed' },
    { ar: 'إيرادات أخرى', en: 'Other Income' },
    { ar: 'أرباح فروق عملة', en: 'Foreign Exchange Gain' },
    { ar: 'عوائد استثمارات', en: 'Investment Income' },
    { ar: 'تكلفة الإيرادات', en: 'Cost of Revenue' },
    { ar: 'تكلفة البضاعة المباعة', en: 'Cost of Goods Sold (COGS)' },
    { ar: 'مشتريات البضاعة', en: 'Merchandise Purchases' },
    { ar: 'مصاريف الشحن والتوصيل', en: 'Freight & Delivery Expenses' },
    { ar: 'مصاريف بيعية وتسويقية', en: 'Selling & Marketing Expenses' },
    { ar: 'دعاية وإعلان', en: 'Advertising & Promotion' },
    { ar: 'عمولات المبيعات', en: 'Sales Commissions' },
    { ar: 'مصاريف عمومية وإدارية', en: 'General & Administrative Expenses' },
    { ar: 'الرواتب والأجور', en: 'Salaries & Wages' },
    { ar: 'بدل سكن', en: 'Housing Allowance' },
    { ar: 'بدل مواصلات', en: 'Transportation Allowance' },
    { ar: 'التأمينات الاجتماعية', en: 'GOSI Contributions' },
    { ar: 'التأمين الطبي للموظفين', en: 'Employee Medical Insurance' },
    { ar: 'مصروف الاستهلاك', en: 'Depreciation Expense' },
    { ar: 'مصروف الإيجار', en: 'Rent Expense' },
    { ar: 'كهرباء ومياه ومرافق', en: 'Electricity, Water & Utilities' },
    { ar: 'هاتف وإنترنت واتصالات', en: 'Telephone, Internet & Telecom' },
    { ar: 'ضيافة ونظافة', en: 'Hospitality & Cleaning' },
    { ar: 'أدوات مكتبية ومطبوعات', en: 'Stationery & Printing' },
    { ar: 'صيانة وتشغيل', en: 'Maintenance & Operations' },
    { ar: 'رسوم حكومية واشتراكات', en: 'Government Fees & Subscriptions' },
    { ar: 'استشارات قانونية ومحاسبية', en: 'Legal & Professional Fees' },
    { ar: 'رسوم بنكية', en: 'Bank Charges' },
    { ar: 'مصاريف تمويلية', en: 'Financing Costs' },
    { ar: 'مصروف الزكاة السنوي', en: 'Annual Zakat Expense' }
  ];

  // Word-level mapping
  private readonly wordDictionary: Record<string, string> = {
    'أصول': 'Assets',
    'أصل': 'Asset',
    'التزامات': 'Liabilities',
    'التزام': 'Liability',
    'خصوم': 'Liabilities',
    'خصم': 'Liability',
    'حقوق': 'Equity',
    'ملكية': 'Equity',
    'إيراد': 'Revenue',
    'إيرادات': 'Revenues',
    'مبيعات': 'Sales',
    'مبيعة': 'Sale',
    'تكلفة': 'Cost',
    'تكاليف': 'Costs',
    'مصروف': 'Expense',
    'مصاريف': 'Expenses',
    'مصروفات': 'Expenses',
    'نقد': 'Cash',
    'نقدية': 'Cash',
    'بنك': 'Bank',
    'مصرف': 'Bank',
    'صندوق': 'Cash Fund',
    'خزينة': 'Treasury',
    'عملاء': 'Customers',
    'عميل': 'Customer',
    'موردون': 'Vendors',
    'مورد': 'Vendor',
    'مخزون': 'Inventory',
    'بضاعة': 'Merchandise',
    'بضائع': 'Goods',
    'استهلاك': 'Depreciation',
    'إطفاء': 'Amortization',
    'مجمع': 'Accumulated',
    'رأس': 'Capital',
    'مال': 'Capital',
    'احتياطي': 'Reserve',
    'أرباح': 'Profits',
    'ربح': 'Profit',
    'خسائر': 'Losses',
    'خسارة': 'Loss',
    'ضريبة': 'Tax',
    'ضرائب': 'Taxes',
    'زكاة': 'Zakat',
    'رواتب': 'Salaries',
    'راتب': 'Salary',
    'أجور': 'Wages',
    'إيجار': 'Rent',
    'تأمين': 'Insurance',
    'كهرباء': 'Electricity',
    'مياه': 'Water',
    'اتصالات': 'Telecom',
    'إنترنت': 'Internet',
    'صيانة': 'Maintenance',
    'تسويق': 'Marketing',
    'دعاية': 'Advertising',
    'إعلان': 'Promotion',
    'سيارات': 'Vehicles',
    'سيارة': 'Vehicle',
    'شاحنات': 'Trucks',
    'مباني': 'Buildings',
    'مبنى': 'Building',
    'أراضي': 'Lands',
    'أرض': 'Land',
    'أثاث': 'Furniture',
    'أجهزة': 'Equipment',
    'معدات': 'Machinery',
    'برامج': 'Software',
    'برمجيات': 'Software',
    'استشارات': 'Consulting',
    'عمولة': 'Commission',
    'عمولات': 'Commissions',
    'رسوم': 'Fees',
    'رسم': 'Fee',
    'قرض': 'Loan',
    'قروض': 'Loans',
    'سلفة': 'Advance',
    'سلف': 'Advances',
    'جاري': 'Current',
    'ثابت': 'Fixed',
    'متداول': 'Current',
    'رئيسي': 'Main',
    'فرعي': 'Sub',
    'محلي': 'Local',
    'خارجي': 'Foreign',
    'مستحق': 'Accrued',
    'مقدم': 'Prepaid',
    'مؤجل': 'Deferred',
    'سنوي': 'Annual',
    'شهري': 'Monthly',
    'تجاري': 'Trade',
    'عام': 'General',
    'إداري': 'Administrative',
    'تشغيلي': 'Operating',
    'تمويلي': 'Financing',
    'استثماري': 'Investment'
  };

  /**
   * Translates Arabic text to English accounting name
   */
  translateArabicToEnglish(arabicText: string): string {
    if (!arabicText || !arabicText.trim()) return '';

    let text = arabicText.trim();

    // 1. Check for exact phrase matches first
    for (const phrase of this.phraseDictionary) {
      if (text.toLowerCase() === phrase.ar.toLowerCase()) {
        return phrase.en;
      }
    }

    // 2. Check for partial phrase replacements
    let translated = text;
    for (const phrase of this.phraseDictionary) {
      if (translated.includes(phrase.ar)) {
        translated = translated.replace(new RegExp(phrase.ar, 'gi'), phrase.en);
      }
    }

    // If whole text was matched or phrases replaced
    if (translated !== text) {
      return this.cleanEnglishOutput(translated);
    }

    // 3. Word-by-word tokenized translation
    const words = text.split(/(\s+|-|\/)/);
    const translatedWords = words.map(w => {
      const cleanW = w.trim();
      if (!cleanW) return w;

      // Exact word lookup
      if (this.wordDictionary[cleanW]) {
        return this.wordDictionary[cleanW];
      }

      // Strip "ال" prefix
      if (cleanW.startsWith('ال') && cleanW.length > 3) {
        const withoutAl = cleanW.substring(2);
        if (this.wordDictionary[withoutAl]) {
          return this.wordDictionary[withoutAl];
        }
      }

      // Retain punctuation/hyphen
      if (w === '-' || w === '/') return w;

      // If untranslated, leave word or transliterate simple letters
      return cleanW;
    });

    return this.cleanEnglishOutput(translatedWords.join(''));
  }

  /**
   * Translates English text to Arabic accounting name
   */
  translateEnglishToArabic(englishText: string): string {
    if (!englishText || !englishText.trim()) return '';

    let text = englishText.trim();

    // 1. Exact phrase match in reverse
    for (const phrase of this.phraseDictionary) {
      if (text.toLowerCase() === phrase.en.toLowerCase()) {
        return phrase.ar;
      }
    }

    // 2. Partial phrase match in reverse
    let translated = text;
    for (const phrase of this.phraseDictionary) {
      const reg = new RegExp(`\\b${this.escapeRegex(phrase.en)}\\b`, 'gi');
      if (reg.test(translated)) {
        translated = translated.replace(reg, phrase.ar);
      }
    }

    if (translated !== text) {
      return this.cleanArabicOutput(translated);
    }

    // 3. Word-by-word tokenized reverse lookup
    const reverseWordMap = new Map<string, string>();
    for (const [ar, en] of Object.entries(this.wordDictionary)) {
      reverseWordMap.set(en.toLowerCase(), ar);
    }

    const words = text.split(/(\s+|-|\/)/);
    const translatedWords = words.map(w => {
      const cleanW = w.trim().toLowerCase();
      if (!cleanW) return w;
      if (reverseWordMap.has(cleanW)) {
        return reverseWordMap.get(cleanW)!;
      }
      return w;
    });

    return this.cleanArabicOutput(translatedWords.join(''));
  }

  private cleanEnglishOutput(str: string): string {
    return str
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*/g, ' - ')
      .trim();
  }

  private cleanArabicOutput(str: string): string {
    return str
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*/g, ' - ')
      .trim();
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
