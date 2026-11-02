import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanyContextService } from './company-context.service';
import { environment } from '../../../environments/environment';

export interface EnterpriseGeneralSettings {
  companyNameAr: string;
  companyNameEn: string;
  vatNumber: string;
  commercialRegistration: string;
  logoUrl: string;
  baseCurrency: string;
  phone: string;
  email: string;
  nationalAddress: string;
  brandThemeColor: string;
}

export interface AccountingModuleSettings {
  defaultCurrency: string;
  calendarType: 'Gregorian' | 'Hijri';
  costCenterPolicy: 'MandatoryForIncomeAndExpense' | 'Optional' | 'MandatoryAll';
  allowBackdatedEntries: boolean;
  maxBackdatedDays: number;
  requireApprovalForEntries: boolean;
  include13thClosingPeriod: boolean;
  retainedEarningsAccount: string;
  currentPnlAccount: string;
  inventoryDiscrepancyAccount: string;
  accruedSalariesAccount: string;
}

export interface InvoicingZatcaSettings {
  zatcaEnvironment: 'Simulation' | 'Production' | 'Developer-Portal';
  deviceSerialNumber: string;
  defaultVatRate: number;
  defaultInvoiceType: 'Tax' | 'Simplified';
  taxInvoicePrefix: string;
  simplifiedInvoicePrefix: string;
  autoGenerateQrCode: boolean;
  invoicePrintTemplate: 'StandardA4' | 'Thermal80mm' | 'ModernBilingual';
}

export interface SalesPosSettings {
  defaultPosWarehouse: string;
  allowNegativeStock: boolean;
  maxCashierDiscountPercent: number;
  enforceCashDrawerCount: boolean;
  autoPrintReceipt: boolean;
  showCustomerRewardPoints: boolean;
}

export interface PurchasingInventorySettings {
  inventoryValuationMethod: 'WeightedAverage' | 'FIFO';
  enableReorderAlerts: boolean;
  defaultPurchaseTaxRate: number;
  enforceThreeWayMatching: boolean;
  autoPostStockAdjustments: boolean;
}

export interface HrPayrollSettings {
  saudiEmployeeGosiRate: number;
  saudiEmployerGosiRate: number;
  nonSaudiHazardRate: number;
  mudadEstablishmentId: string;
  employerBankCode: string;
  employerIban: string;
  payrollCalculationBasis: '30Days' | 'ActualDays';
  overtimeMultiplier: number;
}

export interface ProjectsContractingSettings {
  defaultRetentionPercent: number;
  guaranteeExpiryAlertDays: number;
  requireProjectManagerApproval: boolean;
}

export interface SystemSecuritySettings {
  sessionTimeoutMinutes: number;
  enforceTwoFactorAuth: boolean;
  enableAuditLogging: boolean;
  themeMode: 'Light' | 'Dark' | 'System';
}

export interface AllModulesSettings {
  general: EnterpriseGeneralSettings;
  accounting: AccountingModuleSettings;
  invoicing: InvoicingZatcaSettings;
  pos: SalesPosSettings;
  purchasing: PurchasingInventorySettings;
  hr: HrPayrollSettings;
  projects: ProjectsContractingSettings;
  system: SystemSecuritySettings;
}

const STORAGE_KEY = 'alrobban_erp_all_modules_settings';

@Injectable({
  providedIn: 'root'
})
export class ModulesSettingsService {
  private companyContext = inject(CompanyContextService);
  private http = inject(HttpClient);

  private readonly defaultSettings: AllModulesSettings = {
    general: {
      companyNameAr: 'شركة مِعْيَــــار للحلول الذكية والمحاسبية',
      companyNameEn: 'Meyar Smart Accounting Solutions Co.',
      vatNumber: '310123456700003',
      commercialRegistration: '1010789456',
      logoUrl: '/meyar-logo.jpg',
      baseCurrency: 'SAR',
      phone: '+966 11 234 5678',
      email: 'info@meyar-erp.sa',
      nationalAddress: 'الرياض - طريق الملك فهد - حي العليا - ص.ب 12345',
      brandThemeColor: '#059669'
    },
    accounting: {
      defaultCurrency: 'SAR',
      calendarType: 'Gregorian',
      costCenterPolicy: 'MandatoryForIncomeAndExpense',
      allowBackdatedEntries: false,
      maxBackdatedDays: 3,
      requireApprovalForEntries: true,
      include13thClosingPeriod: true,
      retainedEarningsAccount: '32102',
      currentPnlAccount: '32103',
      inventoryDiscrepancyAccount: '51102',
      accruedSalariesAccount: '21301'
    },
    invoicing: {
      zatcaEnvironment: 'Simulation',
      deviceSerialNumber: 'MEYAR-ZATCA-EGS-2026',
      defaultVatRate: 15,
      defaultInvoiceType: 'Tax',
      taxInvoicePrefix: 'INV-2026-',
      simplifiedInvoicePrefix: 'POS-2026-',
      autoGenerateQrCode: true,
      invoicePrintTemplate: 'ModernBilingual'
    },
    pos: {
      defaultPosWarehouse: 'المستودع الرئيسي - الرياض',
      allowNegativeStock: false,
      maxCashierDiscountPercent: 10,
      enforceCashDrawerCount: true,
      autoPrintReceipt: true,
      showCustomerRewardPoints: true
    },
    purchasing: {
      inventoryValuationMethod: 'WeightedAverage',
      enableReorderAlerts: true,
      defaultPurchaseTaxRate: 15,
      enforceThreeWayMatching: true,
      autoPostStockAdjustments: true
    },
    hr: {
      saudiEmployeeGosiRate: 9.75,
      saudiEmployerGosiRate: 11.75,
      nonSaudiHazardRate: 2.0,
      mudadEstablishmentId: '7001234567',
      employerBankCode: 'RJHI',
      employerIban: 'SA0380000000608010167519',
      payrollCalculationBasis: '30Days',
      overtimeMultiplier: 1.5
    },
    projects: {
      defaultRetentionPercent: 10,
      guaranteeExpiryAlertDays: 30,
      requireProjectManagerApproval: true
    },
    system: {
      sessionTimeoutMinutes: 30,
      enforceTwoFactorAuth: false,
      enableAuditLogging: true,
      themeMode: 'Light'
    }
  };

  settings = signal<AllModulesSettings>(this.loadPersistedSettings());

  // Quick Access Computed Signals
  generalSettings = computed(() => this.settings().general);
  accountingSettings = computed(() => this.settings().accounting);
  invoicingSettings = computed(() => this.settings().invoicing);
  posSettings = computed(() => this.settings().pos);
  purchasingSettings = computed(() => this.settings().purchasing);
  hrSettings = computed(() => this.settings().hr);
  projectsSettings = computed(() => this.settings().projects);
  systemSettings = computed(() => this.settings().system);

  constructor() {
    this.loadedCompanyId = this.companyContext.activeCompany().id;
    // Reload the settings whenever the active company changes (login / company switch)
    effect(() => {
      const id = this.companyContext.activeCompany().id;
      if (id !== this.loadedCompanyId) {
        this.loadedCompanyId = id;
        this.settings.set(this.loadPersistedSettings());
      }
    });
  }

  private loadedCompanyId = '';

  private get storageKey(): string {
    return `${STORAGE_KEY}_${this.companyContext.activeCompany().id}`;
  }

  /** Defaults for the active company: demo tenant keeps demo values, real tenants start from their own data. */
  private buildDefaultsForActiveCompany(): AllModulesSettings {
    const c = this.companyContext.activeCompany();
    if (this.companyContext.isDemoCompany(c.id)) {
      return this.defaultSettings;
    }
    const d = this.defaultSettings;
    return {
      ...d,
      general: {
        ...d.general,
        companyNameAr: c.nameAr,
        companyNameEn: c.nameEn,
        vatNumber: c.vatNumber || '',
        commercialRegistration: c.commercialRegistration || '',
        logoUrl: c.logoUrl || '',
        baseCurrency: c.currencyCode || 'SAR',
        phone: '',
        email: '',
        nationalAddress: '',
        brandThemeColor: c.brandThemeColor || d.general.brandThemeColor
      },
      invoicing: { ...d.invoicing, deviceSerialNumber: '' },
      pos: { ...d.pos, defaultPosWarehouse: '' },
      hr: { ...d.hr, mudadEstablishmentId: '', employerBankCode: '', employerIban: '' }
    };
  }

  private loadPersistedSettings(): AllModulesSettings {
    const defaults = this.buildDefaultsForActiveCompany();
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          general: { ...defaults.general, ...parsed.general },
          accounting: { ...defaults.accounting, ...parsed.accounting },
          invoicing: { ...defaults.invoicing, ...parsed.invoicing },
          pos: { ...defaults.pos, ...parsed.pos },
          purchasing: { ...defaults.purchasing, ...parsed.purchasing },
          hr: { ...defaults.hr, ...parsed.hr },
          projects: { ...defaults.projects, ...parsed.projects },
          system: { ...defaults.system, ...parsed.system }
        };
      }
    } catch {
      // fallback to default
    }
    return defaults;
  }

  saveAllSettings(newSettings: AllModulesSettings): void {
    this.settings.set(newSettings);
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save modules settings to local storage', e);
    }
    this.syncWithCompanyContext(newSettings.general);
  }

  updateSection<K extends keyof AllModulesSettings>(section: K, data: Partial<AllModulesSettings[K]>): void {
    const current = this.settings();
    const updated = {
      ...current,
      [section]: {
        ...current[section],
        ...data
      }
    };
    this.saveAllSettings(updated);
  }

  private syncWithCompanyContext(general: EnterpriseGeneralSettings): void {
    const currentComp = this.companyContext.activeCompany();
    const updated = {
      ...currentComp,
      nameAr: general.companyNameAr,
      nameEn: general.companyNameEn,
      vatNumber: general.vatNumber,
      commercialRegistration: general.commercialRegistration,
      logoUrl: general.logoUrl,
      currencyCode: general.baseCurrency,
      brandThemeColor: general.brandThemeColor
    };
    this.companyContext.setCompany(updated);

    // Persist company profile directly to backend server
    const token = localStorage.getItem('alrobban_token');
    if (token) {
      this.http.put(`${environment.apiUrl}/api/companies/current`, {
        nameAr: general.companyNameAr,
        nameEn: general.companyNameEn,
        vatNumber: general.vatNumber,
        commercialRegistration: general.commercialRegistration,
        logoUrl: general.logoUrl,
        brandThemeColor: general.brandThemeColor
      }).subscribe({
        next: () => {},
        error: (err) => console.warn('Failed to sync company profile with server:', err)
      });
    }
  }

  resetToDefaults(): void {
    this.saveAllSettings(this.buildDefaultsForActiveCompany());
  }
}
