import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto } from '../../../core/models/account.model';
import { AccountPickerComponent } from '../../../shared/components/account-picker/account-picker.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, AccountPickerComponent, TranslatePipe],
  templateUrl: './partner-create.component.html',
  styleUrls: ['./partner-create.component.scss']
})
export class PartnerCreateComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
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
    { ar: 'الرياض', en: 'Riyadh' },
    { ar: 'جدة', en: 'Jeddah' },
    { ar: 'الدمام', en: 'Dammam' },
    { ar: 'مكة المكرمة', en: 'Makkah' },
    { ar: 'المدينة المنورة', en: 'Madinah' },
    { ar: 'الخبر', en: 'Khobar' },
    { ar: 'الأحساء', en: 'Al-Ahsa' },
    { ar: 'الظهران', en: 'Dhahran' },
    { ar: 'القصيم (بريدة)', en: 'Al-Qassim (Buraidah)' },
    { ar: 'عنيزة', en: 'Unaizah' },
    { ar: 'تبوك', en: 'Tabuk' },
    { ar: 'حائل', en: 'Hail' },
    { ar: 'خميس مشيط', en: 'Khamis Mushait' },
    { ar: 'أبها', en: 'Abha' },
    { ar: 'نجران', en: 'Najran' },
    { ar: 'جازان', en: 'Jazan' },
    { ar: 'ينبع', en: 'Yanbu' },
    { ar: 'الجبيل', en: 'Jubail' },
    { ar: 'الطائف', en: 'Taif' },
    { ar: 'حفر الباطن', en: 'Hafar Al-Batin' },
    { ar: 'أخرى', en: 'Other' }
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
    const isOther = this.cityName() === 'أخرى' || this.cityName() === 'Other';
    return isOther ? (this.customCity().trim() || 'الرياض') : this.cityName();
  });

  // Computed: VAT Validation
  vatValidation = computed(() => {
    this.langService.currentLang();
    const raw = this.taxNumber().trim();
    if (!raw) {
      return { isValid: false, isEmpty: true, message: this.langService.t('accounting.partnerCreate.validation.vatOptional') };
    }
    const is15Digits = /^\d{15}$/.test(raw);
    const startsWith3 = raw.startsWith('3');
    const endsWith3 = raw.endsWith('3');

    if (!is15Digits) {
      return { isValid: false, isEmpty: false, message: this.langService.t('accounting.partnerCreate.validation.vatMustBe15', { len: raw.length }) };
    }
    if (!startsWith3 || !endsWith3) {
      return { isValid: false, isEmpty: false, message: this.langService.t('accounting.partnerCreate.validation.vatMustStartEnd3') };
    }

    return { isValid: true, isEmpty: false, message: this.langService.t('accounting.partnerCreate.validation.vatValid') };
  });

  // Computed: Building Number Validation (4 digits)
  buildingValidation = computed(() => {
    this.langService.currentLang();
    const val = this.buildingNumber().trim();
    if (!val) return { isValid: false, isEmpty: true, message: this.langService.t('accounting.partnerCreate.validation.buildingRequired') };
    const isValid = /^\d{4}$/.test(val);
    return {
      isValid,
      isEmpty: false,
      message: isValid
        ? this.langService.t('accounting.partnerCreate.validation.buildingValid')
        : this.langService.t('accounting.partnerCreate.validation.buildingInvalid')
    };
  });

  // Computed: Postal Zone Validation (5 digits)
  postalValidation = computed(() => {
    this.langService.currentLang();
    const val = this.postalZone().trim();
    if (!val) return { isValid: false, isEmpty: true, message: this.langService.t('accounting.partnerCreate.validation.postalRequired') };
    const isValid = /^\d{5}$/.test(val);
    return {
      isValid,
      isEmpty: false,
      message: isValid
        ? this.langService.t('accounting.partnerCreate.validation.postalValid')
        : this.langService.t('accounting.partnerCreate.validation.postalInvalid')
    };
  });

  // Computed: ZATCA Compliance Score & Checklist
  complianceChecklist = computed(() => {
    this.langService.currentLang();
    const hasNameAr = this.nameAr().trim().length > 2;
    const vatOk = this.vatValidation().isValid;
    const hasId = this.otherIdValue().trim().length > 3;
    const hasStreet = this.streetName().trim().length > 2;
    const bldOk = this.buildingValidation().isValid;
    const hasDistrict = this.citySubdivisionName().trim().length > 1;
    const hasCity = this.effectiveCity().trim().length > 1;
    const postOk = this.postalValidation().isValid;

    const items = [
      { key: 'name', label: this.langService.t('accounting.partnerCreate.validation.chkName'), ok: hasNameAr, mandatory: true },
      { key: 'vat', label: this.langService.t('accounting.partnerCreate.validation.chkVat'), ok: vatOk, mandatory: false },
      { key: 'id', label: this.langService.t('accounting.partnerCreate.validation.chkId'), ok: hasId, mandatory: true },
      { key: 'street', label: this.langService.t('accounting.partnerCreate.validation.chkStreet'), ok: hasStreet, mandatory: true },
      { key: 'building', label: this.langService.t('accounting.partnerCreate.validation.chkBuilding'), ok: bldOk, mandatory: true },
      { key: 'district', label: this.langService.t('accounting.partnerCreate.validation.chkDistrict'), ok: hasDistrict, mandatory: true },
      { key: 'city', label: this.langService.t('accounting.partnerCreate.validation.chkCity'), ok: hasCity, mandatory: true },
      { key: 'postal', label: this.langService.t('accounting.partnerCreate.validation.chkPostal'), ok: postOk, mandatory: true }
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
    this.route.queryParams.subscribe(params => {
      if (params['type'] === 'customer' || params['type'] === '1') {
        this.setPartnerType(PartnerType.Customer);
      } else if (params['type'] === 'supplier' || params['type'] === '2') {
        this.setPartnerType(PartnerType.Supplier);
      } else {
        this.generateSmartCode(this.partnerType());
      }
    });

    this.restoreDraftIfAny();
    this.loadAccounts();
  }

  private restoreDraftIfAny(): void {
    try {
      const draftStr = sessionStorage.getItem('alrobban_partner_draft');
      if (draftStr) {
        const d = JSON.parse(draftStr);
        if (d.code) this.code.set(d.code);
        if (d.partnerType) this.partnerType.set(d.partnerType);
        if (d.nameAr) this.nameAr.set(d.nameAr);
        if (d.nameEn) this.nameEn.set(d.nameEn);
        if (d.phone) this.phone.set(d.phone);
        if (d.email) this.email.set(d.email);
        if (d.taxNumber) this.taxNumber.set(d.taxNumber);
        if (d.otherIdType) this.otherIdType.set(d.otherIdType);
        if (d.otherIdValue) this.otherIdValue.set(d.otherIdValue);
        if (d.streetName) this.streetName.set(d.streetName);
        if (d.buildingNumber) this.buildingNumber.set(d.buildingNumber);
        if (d.plotIdentification) this.plotIdentification.set(d.plotIdentification);
        if (d.citySubdivisionName) this.citySubdivisionName.set(d.citySubdivisionName);
        if (d.cityName) this.cityName.set(d.cityName);
        if (d.postalZone) this.postalZone.set(d.postalZone);
        if (d.creditLimit) this.creditLimit.set(d.creditLimit);
        if (d.paymentTermsDays) this.paymentTermsDays.set(d.paymentTermsDays);
        if (d.glAccountId) this.glAccountId.set(d.glAccountId);
        sessionStorage.removeItem('alrobban_partner_draft');
      }
    } catch {
      // Ignore draft restore errors
    }
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

  unifiedPartnerName = signal<string>('');
  backgroundTranslation = signal<string>('');
  nameEnManuallyEdited = signal<boolean>(false);

  onNameArInput(val: string): void {
    this.nameAr.set(val);
    const text = (val || '').trim();
    if (!text) {
      if (!this.nameEnManuallyEdited()) {
        this.nameEn.set('');
      }
      return;
    }

    if (!this.nameEnManuallyEdited()) {
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const instant = this.translator.translateArabicToEnglish(text);
        this.nameEn.set(instant);
        this.translator.translateWithOnlineRefinement(
          text,
          () => {},
          (refined) => {
            if (!this.nameEnManuallyEdited() && refined) {
              this.nameEn.set(refined);
            }
          }
        );
      }
    }
  }

  onNameEnInput(val: string): void {
    this.nameEn.set(val);
    this.nameEnManuallyEdited.set(true);
    const currentAr = (this.nameAr() || '').trim();
    const text = (val || '').trim();
    if (!currentAr && text) {
      this.nameAr.set(this.translator.translateEnglishToArabic(text));
    }
  }

  async translateManually(): Promise<void> {
    const text = (this.nameAr() || '').trim();
    if (!text) return;
    this.nameEnManuallyEdited.set(false);
    this.isAutoTranslating.set(true);
    try {
      const instant = this.translator.translateArabicToEnglish(text);
      this.nameEn.set(instant);
      const onlineEn = await this.translator.translateOnline(text, 'ar', 'en');
      if (onlineEn) {
        this.nameEn.set(onlineEn);
      }
    } finally {
      this.isAutoTranslating.set(false);
    }
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
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('accounting.partnerCreate.alerts.codeRequiredTitle'),
        text: this.langService.t('accounting.partnerCreate.alerts.codeRequiredText')
      });
      return false;
    }
    if (!this.nameAr().trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('accounting.partnerCreate.alerts.nameRequiredTitle'),
        text: this.langService.t('accounting.partnerCreate.alerts.nameRequiredText')
      });
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
      const isAr = this.langService.isArabic();
      Swal.fire({
        title: this.langService.t('accounting.partnerCreate.alerts.incompleteAddressTitle'),
        html: `
          <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; color: #475569; line-height: 1.6;">
            <p style="margin-bottom: 0.5rem; font-weight: 700; color: #b45309;">
              ${this.langService.t('accounting.partnerCreate.alerts.zatcaB2bWarning')}
            </p>
            <ul style="padding-${isAr ? 'right' : 'left'}: 1.2rem; margin: 0;">
              ${!this.streetName() ? `<li>${this.langService.t('accounting.partnerCreate.alerts.missingStreet')}</li>` : ''}
              ${!this.buildingValidation().isValid ? `<li>${this.langService.t('accounting.partnerCreate.alerts.missingBuilding')}</li>` : ''}
              ${!this.citySubdivisionName() ? `<li>${this.langService.t('accounting.partnerCreate.alerts.missingDistrict')}</li>` : ''}
              ${!this.postalValidation().isValid ? `<li>${this.langService.t('accounting.partnerCreate.alerts.missingPostal')}</li>` : ''}
              ${!this.vatValidation().isValid && !this.otherIdValue() ? `<li>${this.langService.t('accounting.partnerCreate.alerts.missingVatOrCr')}</li>` : ''}
            </ul>
            <p style="margin-top: 0.75rem; font-size: 0.8rem; color: #64748b;">
              ${this.langService.t('accounting.partnerCreate.alerts.confirmSavePrompt')}
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b',
        confirmButtonText: this.langService.t('accounting.partnerCreate.alerts.confirmSaveBtn'),
        cancelButtonText: this.langService.t('accounting.partnerCreate.alerts.cancelCompleteAddressBtn')
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

    this.http.post(`${environment.apiUrl}/api/partners`, payload).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        sessionStorage.removeItem('alrobban_partner_draft');

        const displayName = this.langService.isArabic() ? payload.nameAr : (payload.nameEn || payload.nameAr);
        Swal.fire({
          icon: 'success',
          title: this.langService.t('accounting.partnerCreate.alerts.partnerRegisteredSuccess'),
          html: `
            <div style="text-align: center; font-size: 0.9rem;">
              <strong style="color: #065f46; font-size: 1.1rem; display: block; margin-bottom: 0.25rem;">
                ${payload.code} - ${displayName}
              </strong>
              <span style="color: #64748b;">${this.langService.t('accounting.partnerCreate.alerts.partnerSavedSub')}</span>
            </div>
          `,
          timer: 2000,
          timerProgressBar: true,
          confirmButtonColor: '#059669',
          confirmButtonText: this.langService.t('common.ok')
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
        if (err.status === 401) {
          // Preserve draft so user doesn't lose entered partner data
          sessionStorage.setItem('alrobban_partner_draft', JSON.stringify(payload));
          return;
        }
        Swal.fire({
          icon: 'error',
          title: this.langService.t('accounting.partnerCreate.alerts.saveFailedTitle'),
          text: err?.error?.description || this.langService.t('accounting.partnerCreate.alerts.saveFailedDefault')
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
