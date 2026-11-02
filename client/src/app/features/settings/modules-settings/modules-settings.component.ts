import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  ModulesSettingsService, 
  AllModulesSettings,
  EnterpriseGeneralSettings,
  AccountingModuleSettings,
  InvoicingZatcaSettings,
  SalesPosSettings,
  PurchasingInventorySettings,
  HrPayrollSettings,
  ProjectsContractingSettings,
  SystemSecuritySettings
} from '../../../core/services/modules-settings.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

export type ModuleSettingsTab = 
  | 'general' 
  | 'accounting' 
  | 'invoicing' 
  | 'pos' 
  | 'purchasing' 
  | 'hr' 
  | 'projects' 
  | 'system';

@Component({
  selector: 'app-modules-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './modules-settings.component.html',
  styleUrls: ['./modules-settings.component.scss']
})
export class ModulesSettingsComponent implements OnInit {
  public langService = inject(LanguageService);
  public settingsService = inject(ModulesSettingsService);
  private translator = inject(AccountingTranslatorService);
  private route = inject(ActivatedRoute);

  activeTab: ModuleSettingsTab = 'general';
  saving = false;
  settingsLogoMode: 'file' | 'url' = 'file';

  // Working copy for live editing
  formSettings: AllModulesSettings = JSON.parse(JSON.stringify(this.settingsService.settings()));

  get moduleTabs(): { id: ModuleSettingsTab; titleAr: string; titleEn: string; icon: string; badge: string }[] {
    return [
      { id: 'general', titleAr: 'المنشأة والهوية العامة', titleEn: 'General & Enterprise', icon: 'pi pi-building', badge: this.langService.t('settings.modules.badges.primary') },
      { id: 'accounting', titleAr: 'المحاسبة والمالية', titleEn: 'Accounting & GL', icon: 'pi pi-book', badge: this.langService.t('settings.modules.badges.ifrs') },
      { id: 'invoicing', titleAr: 'الفوترة الإلكترونية وزاتكا', titleEn: 'ZATCA & Invoicing', icon: 'pi pi-file-edit', badge: this.langService.t('settings.modules.badges.phase2') },
      { id: 'pos', titleAr: 'المبيعات ونقاط البيع', titleEn: 'Sales & POS', icon: 'pi pi-shopping-cart', badge: this.langService.t('settings.modules.badges.cashier') },
      { id: 'purchasing', titleAr: 'المشتريات والمستودعات', titleEn: 'Purchasing & WMS', icon: 'pi pi-box', badge: this.langService.t('settings.modules.badges.inventory') },
      { id: 'hr', titleAr: 'الموارد البشرية والرواتب', titleEn: 'HR & Payroll', icon: 'pi pi-users', badge: this.langService.t('settings.modules.badges.gosi') },
      { id: 'projects', titleAr: 'المشاريع والمقاولات', titleEn: 'Projects & Contracts', icon: 'pi pi-briefcase', badge: this.langService.t('settings.modules.badges.extracts') },
      { id: 'system', titleAr: 'الأمان وسياسات النظام', titleEn: 'Security & System', icon: 'pi pi-shield', badge: this.langService.t('settings.modules.badges.security') }
    ];
  }

  ngOnInit(): void {
    this.reloadFromService();
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && this.moduleTabs.some(t => t.id === tab)) {
        this.activeTab = tab as ModuleSettingsTab;
      }
    });
  }

  unifiedCompanyName = '';
  backgroundTranslation = '';

  reloadFromService(): void {
    this.formSettings = JSON.parse(JSON.stringify(this.settingsService.settings()));
    this.unifiedCompanyName = this.formSettings.general.companyNameAr || this.formSettings.general.companyNameEn || '';
    this.backgroundTranslation = this.formSettings.general.companyNameEn ? `${this.langService.t('accounting.fixedAssets.englishTranslationPrefix')}${this.formSettings.general.companyNameEn}` : '';
  }

  setTab(tab: ModuleSettingsTab): void {
    this.activeTab = tab;
  }

  // Smart Unified Auto-Translation for Company Name
  onUnifiedCompanyNameChange(text: string): void {
    this.unifiedCompanyName = text;
    if (!text.trim()) {
      this.formSettings.general.companyNameAr = '';
      this.formSettings.general.companyNameEn = '';
      this.backgroundTranslation = '';
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.formSettings.general.companyNameAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.formSettings.general.companyNameEn = instant;
      this.backgroundTranslation = `${this.langService.t('accounting.fixedAssets.englishTranslationPrefix')}${instant}`;
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.formSettings.general.companyNameEn = refined;
          this.backgroundTranslation = `${this.langService.t('accounting.fixedAssets.englishTranslationPrefix')}${refined}`;
        }
      );
    } else {
      this.formSettings.general.companyNameEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.formSettings.general.companyNameAr = instant;
      this.backgroundTranslation = `${this.langService.t('accounting.fixedAssets.arabicTranslationPrefix')}${instant}`;
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.formSettings.general.companyNameAr = refined;
          this.backgroundTranslation = `${this.langService.t('accounting.fixedAssets.arabicTranslationPrefix')}${refined}`;
        }
      });
    }
  }

  onCompanyNameArChange(val: string): void {
    this.onUnifiedCompanyNameChange(val);
  }

  async forceTranslateCompanyName(): Promise<void> {
    const text = this.unifiedCompanyName || this.formSettings.general.companyNameAr || this.formSettings.general.companyNameEn;
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const refined = await this.translator.translateOnline(text, 'ar', 'en');
      this.formSettings.general.companyNameEn = refined || this.translator.translateArabicToEnglish(text);
      this.backgroundTranslation = `${this.langService.t('accounting.fixedAssets.englishTranslationPrefix')}${this.formSettings.general.companyNameEn}`;
    } else {
      const refined = await this.translator.translateOnline(text, 'en', 'ar');
      this.formSettings.general.companyNameAr = refined || this.translator.translateEnglishToArabic(text);
      this.backgroundTranslation = `${this.langService.t('accounting.fixedAssets.arabicTranslationPrefix')}${this.formSettings.general.companyNameAr}`;
    }
  }

  toggleSettingsLogoMode(): void {
    this.settingsLogoMode = this.settingsLogoMode === 'file' ? 'url' : 'file';
  }

  onSettingsLogoSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processLogoFile(input.files[0]);
    }
  }

  private processLogoFile(file: File): void {
    const isAr = this.langService.currentLang() === 'ar';
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('settings.modules.alerts.unsupportedFormatTitle'),
        text: this.langService.t('settings.modules.alerts.unsupportedFormatText'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('settings.modules.alerts.fileTooLargeTitle'),
        text: this.langService.t('settings.modules.alerts.fileTooLargeText'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        this.formSettings.general.logoUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          this.formSettings.general.logoUrl = canvas.toDataURL('image/png', 0.9);
        } else {
          this.formSettings.general.logoUrl = readerEvent.target?.result as string;
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeSettingsLogo(input?: HTMLInputElement): void {
    this.formSettings.general.logoUrl = '';
    if (input) input.value = '';
  }

  saveCurrentTabSettings(): void {
    const isAr = this.langService.currentLang() === 'ar';
    this.saving = true;

    // Apply & Save
    this.settingsService.saveAllSettings(this.formSettings);

    setTimeout(() => {
      this.saving = false;
      Swal.fire({
        icon: 'success',
        title: this.langService.t('settings.modules.alerts.settingsSavedTitle'),
        text: this.langService.t('settings.modules.alerts.settingsSavedText'),
        confirmButtonColor: '#059669',
        confirmButtonText: this.langService.t('common.ok')
      });
    }, 300);
  }

  confirmReset(): void {
    const isAr = this.langService.currentLang() === 'ar';
    Swal.fire({
      icon: 'warning',
      title: this.langService.t('settings.modules.alerts.confirmResetTitle'),
      text: this.langService.t('settings.modules.alerts.confirmResetText'),
      showCancelButton: true,
      confirmButtonText: this.langService.t('settings.modules.alerts.confirmResetBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.settingsService.resetToDefaults();
        this.reloadFromService();
        Swal.fire({
          icon: 'success',
          title: this.langService.t('settings.modules.alerts.resetCompletedTitle'),
          confirmButtonColor: '#059669'
        });
      }
    });
  }
}
