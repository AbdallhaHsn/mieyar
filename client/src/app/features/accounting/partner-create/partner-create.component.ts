import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto } from '../../../core/models/account.model';
import { AccountPickerComponent } from '../../../shared/components/account-picker/account-picker.component';
import Swal from 'sweetalert2';

export enum PartnerType {
  Customer = 1, // عميل
  Supplier = 2, // مورد
  Both = 3      // عميل ومورد معاً
}

export interface IdSchemeOption {
  code: string;
  nameAr: string;
  nameEn: string;
  hintAr: string;
  placeholder: string;
}

@Component({
  selector: 'app-partner-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, AccountPickerComponent],
  templateUrl: './partner-create.component.html',
  styleUrls: ['./partner-create.component.scss']
})
export class PartnerCreateComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  public langService = inject(LanguageService);
  private translator = inject(AccountingTranslatorService);
  private coaService = inject(ChartOfAccountsService);

  PartnerType = PartnerType;

  // Multi-step Wizard Navigation
  currentStep = signal<number>(1); // 1 = بيانات الشريك والضريبة, 2 = العنوان الوطني, 3 = السياسات المالية والمراجعة

  // Loading & Action States
  isSaving = signal<boolean>(false);
  isAutoTranslating = signal<boolean>(false);
  accountsList = signal<AccountDto[]>([]);

  // Scheme IDs options approved by ZATCA
  idSchemeOptions: IdSchemeOption[] = [
    { code: 'CRN', nameAr: 'السجل التجاري (CRN)', nameEn: 'Commercial Registration', hintAr: 'مكون من 10 أرقام يصدر من وزارة التجارة', placeholder: 'مثال: 1010123456' },
    { code: '700', nameAr: 'الرقم الوطني الموحد (700)', nameEn: 'Unified National Number 700', hintAr: 'رقم المنشأة الموحد يبدأ بـ 700', placeholder: 'مثال: 7001234567' },
    { code: 'MOM', nameAr: 'ترخيص بلدي (MOM)', nameEn: 'Municipal License', hintAr: 'رخصة البلدية للمنشأة', placeholder: 'رقم رخصة البلدية' },
    { code: 'MLS', nameAr: 'ترخيص الموارد البشرية (MLS)', nameEn: 'HRSD License', hintAr: 'رخصة مكتب العمل / وزارة الموارد البشرية', placeholder: 'رقم رخصة الموارد البشرية' },
    { code: 'SAG', nameAr: 'رخصة هيئة الاستثمار (MISA)', nameEn: 'Investment License (MISA)', hintAr: 'ترخيص وزارة الاستثمار للشركات الأجنبية', placeholder: 'رقم ترخيص الاستثمار' },
    { code: 'NAT', nameAr: 'الهوية الوطنية (NAT)', nameEn: 'National ID', hintAr: 'هوية وطنية للمواطن الممارس للتجارة', placeholder: '10 أرقام تبدأ بـ 1' },
    { code: 'IQA', nameAr: 'رقم الإقامة (IQA)', nameEn: 'Iqama ID', hintAr: 'إقامة للمقيم الممارس للتجارة', placeholder: '10 أرقام تبدأ بـ 2' },
    { code: 'PAS', nameAr: 'جواز السفر (PAS)', nameEn: 'Passport Number', hintAr: 'خاص بالعملاء الدوليين والتصدير خارج المملكة', placeholder: 'رقم جواز السفر' },
    { code: 'OTH', nameAr: 'معرف تنظيمي آخر (OTH)', nameEn: 'Other ID', hintAr: 'أي معرف رسمي آخر صادر من جهة حكومية', placeholder: 'رقم المعرف البديل' }
  ];

  // Common Saudi Cities
  saudiCities = [
    'الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة',
    'الخبر', 'الأحساء', 'الظهران', 'القصيم (بريدة)', 'عنيزة',
    'تبوك', 'حائل', 'خميس مشيط', 'أبها', 'نجران', 'جازان',
    'ينبع', 'الجبيل', 'الطائف', 'حفر الباطن', 'أخرى'
  ];

  // Step 1: Partner Model Signals
  partnerType = signal<PartnerType>(PartnerType.Customer);
  code = signal<string>('');
  nameAr = signal<string>('');
  nameEn = signal<string>('');
  phone = signal<string>('');
  email = signal<string>('');
  taxNumber = signal<string>('');
  otherIdType = signal<string>('CRN');
  otherIdValue = signal<string>('');

  // Step 2: Saudi National Address Signals
  streetName = signal<string>('');
  buildingNumber = signal<string>('');
  plotIdentification = signal<string>(''); // الرقم الإضافي 4 أرقام
  citySubdivisionName = signal<string>(''); // اسم الحي
  cityName = signal<string>('الرياض');
  customCity = signal<string>('');
  postalZone = signal<string>(''); // 5 أرقام
  countryCode = signal<string>('SA');

  // Step 3: Credit & Financials
  creditLimit = signal<number>(50000);
  paymentTermsDays = signal<number>(30);
  glAccountId = signal<string>('');

  // Computed: Effective City Name
  effectiveCity = computed(() => {
    return this.cityName() === 'أخرى' ? (this.customCity().trim() || 'الرياض') : this.cityName();
  });

  // Computed: VAT Validation
  vatValidation = computed(() => {
    const raw = this.taxNumber().trim();
    if (!raw) {
      return { isValid: false, isEmpty: true, message: 'اختياري للأفراد وغير المسجلين' };
    }
    const is15Digits = /^\d{15}$/.test(raw);
    const startsWith3 = raw.startsWith('3');
    const endsWith3 = raw.endsWith('3');

    if (!is15Digits) {
      return { isValid: false, isEmpty: false, message: `يجب أن يكون 15 رقماً (الحالي: ${raw.length})` };
    }
    if (!startsWith3 || !endsWith3) {
      return { isValid: false, isEmpty: false, message: 'الرقم الضريبي السعودي يبدأ وينتهي بـ 3' };
    }

    return { isValid: true, isEmpty: false, message: '✓ الرقم الضريبي سليم ومتوافق مع ZATCA' };
  });

  // Computed: Building Number Validation (4 digits)
  buildingValidation = computed(() => {
    const val = this.buildingNumber().trim();
    if (!val) return { isValid: false, isEmpty: true, message: 'مطلوب (4 أرقام)' };
    const isValid = /^\d{4}$/.test(val);
    return {
      isValid,
      isEmpty: false,
      message: isValid ? '✓ 4 أرقام' : 'يجب أن يتكون من 4 أرقام'
    };
  });

  // Computed: Postal Zone Validation (5 digits)
  postalValidation = computed(() => {
    const val = this.postalZone().trim();
    if (!val) return { isValid: false, isEmpty: true, message: 'مطلوب (5 أرقام)' };
    const isValid = /^\d{5}$/.test(val);
    return {
      isValid,
      isEmpty: false,
      message: isValid ? '✓ 5 أرقام' : 'يجب أن يتكون من 5 أرقام'
    };
  });

  // Computed: ZATCA Compliance Score & Checklist
  complianceChecklist = computed(() => {
    const hasNameAr = this.nameAr().trim().length > 2;
    const vatOk = this.vatValidation().isValid;
    const hasId = this.otherIdValue().trim().length > 3;
    const hasStreet = this.streetName().trim().length > 2;
    const bldOk = this.buildingValidation().isValid;
    const hasDistrict = this.citySubdivisionName().trim().length > 1;
    const hasCity = this.effectiveCity().trim().length > 1;
    const postOk = this.postalValidation().isValid;

    const items = [
      { key: 'name', label: 'الاسم القانوني للمنشأة بالعربية', ok: hasNameAr, mandatory: true },
      { key: 'vat', label: 'الرقم الضريبي السعودي (15 رقماً)', ok: vatOk, mandatory: false },
      { key: 'id', label: 'معرف المنشأة (السجل التجاري أو 700)', ok: hasId, mandatory: true },
      { key: 'street', label: 'اسم الشارع بالعنوان الوطني', ok: hasStreet, mandatory: true },
      { key: 'building', label: 'رقم المبنى (4 أرقام)', ok: bldOk, mandatory: true },
      { key: 'district', label: 'اسم الحي', ok: hasDistrict, mandatory: true },
      { key: 'city', label: 'المدينة', ok: hasCity, mandatory: true },
      { key: 'postal', label: 'الرمز البريدي (5 أرقام)', ok: postOk, mandatory: true }
    ];

    const passedCount = items.filter(i => i.ok).length;
    const score = Math.round((passedCount / items.length) * 100);

    return {
      items,
      score,
      isFullyCompliant: score === 100,
      canIssueStandardTaxInvoice: hasNameAr && (vatOk || hasId) && hasStreet && bldOk && hasDistrict && hasCity && postOk
    };
  });

  ngOnInit(): void {
    this.generateSmartCode(this.partnerType());
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.coaService.loadAccountsTree().subscribe(tree => {
      const flattened: AccountDto[] = [];
      const flatten = (nodes: AccountDto[]) => {
        for (const n of nodes) {
          flattened.push(n);
          if (n.subAccounts?.length) flatten(n.subAccounts);
        }
      };
      flatten(tree || []);
      this.accountsList.set(flattened.filter(a => a.isPostable));
    });
  }

  setPartnerType(type: PartnerType): void {
    this.partnerType.set(type);
    this.generateSmartCode(type);
  }

  generateSmartCode(type: PartnerType): void {
    const prefix = type === PartnerType.Customer ? 'CUST' : (type === PartnerType.Supplier ? 'SUPP' : 'PART');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.code.set(`${prefix}-${randomNum}`);
  }

  onNameArChange(val: string): void {
    this.nameAr.set(val);
    if (!this.nameEn() || this.isAutoTranslating()) {
      this.isAutoTranslating.set(true);
      const translated = this.translator.translateArabicToEnglish(val);
      this.nameEn.set(translated);
      this.isAutoTranslating.set(false);
    }
  }

  translateManually(): void {
    if (!this.nameAr()) return;
    this.nameEn.set(this.translator.translateArabicToEnglish(this.nameAr()));
  }

  onAccountPicked(acc: AccountDto | null): void {
    this.glAccountId.set(acc ? acc.id : '');
  }

  fillSampleAddress(): void {
    this.streetName.set('طريق الملك فهد الفرعي');
    this.buildingNumber.set('7254');
    this.plotIdentification.set('3411');
    this.citySubdivisionName.set('حي العليا');
    this.cityName.set('الرياض');
    this.postalZone.set('12214');
    this.countryCode.set('SA');
  }

  // Multi-step Navigation
  goToStep(step: number): void {
    if (step === 2 && !this.validateStep1()) return;
    if (step === 3 && (!this.validateStep1() || !this.validateStep2())) return;
    this.currentStep.set(step);
  }

  nextStep(): void {
    const s = this.currentStep();
    if (s === 1) {
      if (this.validateStep1()) {
        this.currentStep.set(2);
      }
    } else if (s === 2) {
      if (this.validateStep2()) {
        this.currentStep.set(3);
      }
    }
  }

  prevStep(): void {
    const s = this.currentStep();
    if (s > 1) {
      this.currentStep.set(s - 1);
    }
  }

  private validateStep1(): boolean {
    if (!this.code().trim()) {
      Swal.fire({ icon: 'warning', title: 'كود الشريك مطلوب', text: 'يرجى إدخال أو توليد كود الشريك التجاري.' });
      return false;
    }
    if (!this.nameAr().trim()) {
      Swal.fire({ icon: 'warning', title: 'اسم الشريك مطلوب', text: 'يرجى إدخال الاسم التجاري للعميل أو المنشأة بالعربية.' });
      return false;
    }
    return true;
  }

  private validateStep2(): boolean {
    // Street & City recommended for ZATCA
    return true;
  }

  savePartner(addAnother: boolean = false): void {
    if (!this.validateStep1()) {
      this.currentStep.set(1);
      return;
    }

    const readiness = this.complianceChecklist();
    if (!readiness.canIssueStandardTaxInvoice) {
      Swal.fire({
        title: 'تنبيه: بيانات العنوان الوطني غير مكتملة',
        html: `
          <div style="text-align: right; font-size: 0.85rem; color: #475569; line-height: 1.6;">
            <p style="margin-bottom: 0.5rem; font-weight: 700; color: #b45309;">
              ⚠️ وفق اشتراطات هيئة الزكاة والضريبة والجمارك (ZATCA)، لن تتمكن من إصدار فاتورة ضريبية قياسية (B2B) لهذا العميل قبل استكمال:
            </p>
            <ul style="padding-right: 1.2rem; margin: 0;">
              ${!this.streetName() ? '<li>اسم الشارع</li>' : ''}
              ${!this.buildingValidation().isValid ? '<li>رقم المبنى (4 أرقام)</li>' : ''}
              ${!this.citySubdivisionName() ? '<li>اسم الحي</li>' : ''}
              ${!this.postalValidation().isValid ? '<li>الرمز البريدي (5 أرقام)</li>' : ''}
              ${!this.vatValidation().isValid && !this.otherIdValue() ? '<li>الرقم الضريبي أو السجل التجاري</li>' : ''}
            </ul>
            <p style="margin-top: 0.75rem; font-size: 0.8rem; color: #64748b;">
              هل ترغب في حفظ بطاقة العميل الآن ومتابعة الحفظ؟
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'نعم، حفظ ومتابعة',
        cancelButtonText: 'إلغاء واستكمال العنوان'
      }).then(res => {
        if (res.isConfirmed) {
          this.executeSave(addAnother);
        }
      });
      return;
    }

    this.executeSave(addAnother);
  }

  private executeSave(addAnother: boolean): void {
    this.isSaving.set(true);

    const payload = {
      code: this.code().trim(),
      partnerType: this.partnerType(),
      nameAr: this.nameAr().trim(),
      nameEn: this.nameEn().trim() || this.nameAr().trim(),
      taxNumber: this.taxNumber().trim() || null,
      commercialRegistration: this.otherIdType() === 'CRN' ? (this.otherIdValue().trim() || null) : null,
      phone: this.phone().trim() || null,
      email: this.email().trim() || null,
      address: `${this.streetName().trim()}، ${this.citySubdivisionName().trim()}، ${this.effectiveCity()}`.trim(),
      streetName: this.streetName().trim() || null,
      buildingNumber: this.buildingNumber().trim() || null,
      plotIdentification: this.plotIdentification().trim() || null,
      citySubdivisionName: this.citySubdivisionName().trim() || null,
      cityName: this.effectiveCity() || null,
      postalZone: this.postalZone().trim() || null,
      countryCode: this.countryCode().trim() || 'SA',
      otherIdType: this.otherIdType() || null,
      otherIdValue: this.otherIdValue().trim() || null,
      creditLimit: Number(this.creditLimit()) || 0,
      paymentTermsDays: Number(this.paymentTermsDays()) || 30,
      glAccountId: this.glAccountId() || null
    };

    this.http.post('/api/partners', payload).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);

        Swal.fire({
          icon: 'success',
          title: 'تم تسجيل الشريك بنجاح',
          html: `
            <div style="text-align: center; font-size: 0.9rem;">
              <strong style="color: #065f46; font-size: 1.1rem; display: block; margin-bottom: 0.25rem;">
                ${payload.code} - ${payload.nameAr}
              </strong>
              <span style="color: #64748b;">تم حفظ بطاقة الشريك وبيانات العنوان الوطني والامتثال الضريبي.</span>
            </div>
          `,
          timer: 2000,
          timerProgressBar: true,
          confirmButtonColor: '#059669',
          confirmButtonText: 'حسناً'
        });

        if (addAnother) {
          this.resetForm();
          this.currentStep.set(1);
        } else {
          this.router.navigate(['/accounting/partners']);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        Swal.fire({
          icon: 'error',
          title: 'تعذر الحفظ',
          text: err?.error?.description || 'حدث خطأ أثناء حفظ بطاقة الشريك في قاعدة البيانات.'
        });
      }
    });
  }

  private resetForm(): void {
    this.generateSmartCode(this.partnerType());
    this.nameAr.set('');
    this.nameEn.set('');
    this.phone.set('');
    this.email.set('');
    this.taxNumber.set('');
    this.otherIdValue.set('');
    this.streetName.set('');
    this.buildingNumber.set('');
    this.plotIdentification.set('');
    this.citySubdivisionName.set('');
    this.postalZone.set('');
  }
}
