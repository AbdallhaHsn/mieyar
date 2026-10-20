import { Injectable, signal } from '@angular/core';
import { PrimeNG } from 'primeng/config';

export type Language = 'ar' | 'en';

export interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const APP_TRANSLATIONS: Translations = {
  // Brand & Header
  'app.title': { ar: 'نظام الربان المحاسبي', en: 'Al-Roban ERP' },
  'app.subtitle': { ar: 'المنصة السحابية المعتمدة للمالية والفوترة', en: 'Certified Financial & E-Invoicing Cloud Platform' },
  'company.select': { ar: 'اختر الشركة', en: 'Select Company' },
  'branch.select': { ar: 'الفرع النشط', en: 'Active Branch' },
  'branch.main': { ar: 'الفرع الرئيسي', en: 'Main Branch' },
  
  // Navigation
  'nav.dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'nav.generalLedger': { ar: 'الحسابات العامة', en: 'General Ledger' },
  'nav.chartOfAccounts': { ar: 'شجرة الحسابات', en: 'Chart of Accounts' },
  'nav.journalEntries': { ar: 'قيود اليومية', en: 'Journal Entries' },
  'nav.trialBalance': { ar: 'ميزان المراجعة', en: 'Trial Balance' },
  'nav.invoicing': { ar: 'الفوترة الإلكترونية (ZATCA)', en: 'E-Invoicing (ZATCA)' },
  'nav.companies': { ar: 'إدارة الشركات والفروع', en: 'Companies & Branches' },
  
  // Actions & Common
  'action.newEntry': { ar: 'إضافة قيد جديد', en: 'New Journal Entry' },
  'action.save': { ar: 'حفظ', en: 'Save' },
  'action.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'action.switchLanguage': { ar: 'English', en: 'العربية' },
  'status.active': { ar: 'نشط', en: 'Active' },
  'status.zatcaCompliant': { ar: 'متوافق مع زكاة ودخل - فاز 2', en: 'ZATCA Phase 2 Compliant' },
  'vat.number': { ar: 'الرقم الضريبي', en: 'VAT Number' },
  'cr.number': { ar: 'السجل التجاري', en: 'C.R. Number' }
};

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  currentLang = signal<Language>('ar');

  constructor(private primeng: PrimeNG) {
    const saved = (localStorage.getItem('alrobban_lang') as Language) || 'ar';
    this.setLanguage(saved);
  }

  setLanguage(lang: Language) {
    this.currentLang.set(lang);
    localStorage.setItem('alrobban_lang', lang);

    const isArabic = lang === 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';

    if (isArabic) {
      this.primeng.setTranslation({
        startsWith: 'يبدأ بـ',
        contains: 'يحتوي على',
        notContains: 'لا يحتوي على',
        endsWith: 'ينتهي بـ',
        equals: 'يساوي',
        notEquals: 'لا يساوي',
        noFilter: 'بدون تصفية',
        clear: 'مسح',
        apply: 'تطبيق',
        matchAll: 'مطابقة الكل',
        matchAny: 'مطابقة أي',
        addRule: 'إضافة شرط',
        removeRule: 'إزالة الشرط',
        accept: 'نعم',
        reject: 'لا',
        choose: 'اختر',
        upload: 'رفع',
        cancel: 'إلغاء',
        dayNames: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
        dayNamesShort: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
        dayNamesMin: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
        monthNames: [
          'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
          'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ],
        monthNamesShort: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس']
      });
    } else {
      this.primeng.setTranslation({
        startsWith: 'Starts with',
        contains: 'Contains',
        notContains: 'Not contains',
        endsWith: 'Ends with',
        equals: 'Equals',
        notEquals: 'Not equals',
        noFilter: 'No Filter',
        clear: 'Clear',
        apply: 'Apply',
        matchAll: 'Match All',
        matchAny: 'Match Any',
        addRule: 'Add Rule',
        removeRule: 'Remove Rule',
        accept: 'Yes',
        reject: 'No',
        choose: 'Choose',
        upload: 'Upload',
        cancel: 'Cancel',
        dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        monthNames: [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ],
        monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      });
    }
  }

  toggleLanguage() {
    this.setLanguage(this.currentLang() === 'ar' ? 'en' : 'ar');
  }

  t(key: string): string {
    const item = APP_TRANSLATIONS[key];
    if (!item) return key;
    return item[this.currentLang()];
  }
}
