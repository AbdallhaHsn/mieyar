import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Branch {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isMainBranch: boolean;
}

export interface FiscalPeriod {
  id: string;
  periodNumber: number;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

export interface FiscalYear {
  id: string;
  yearNumber: number;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  periods: FiscalPeriod[];
}

export interface Company {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  vatNumber: string;
  commercialRegistration: string;
  currencyCode: string;
  logoUrl?: string;
  brandThemeColor?: string;
  branches: Branch[];
  fiscalYears: FiscalYear[];
}

@Injectable({
  providedIn: 'root'
})
export class CompanyContextService {
  private http = inject(HttpClient);
  private readonly STORAGE_KEY = 'alrobban_active_company';

  // Demo initial company for instant rich UX fallback
  private readonly defaultCompany: Company = {
    id: '11111111-2222-3333-4444-555555555555',
    code: 'COMP-01',
    nameAr: 'شركة مِعْيَــــار للحلول الذكية والمحاسبية',
    nameEn: 'Meyar Smart Accounting Solutions Co.',
    vatNumber: '310123456700003',
    commercialRegistration: '1010789456',
    currencyCode: 'SAR',
    logoUrl: '/meyar-logo.jpg',
    brandThemeColor: '#0f766e',
    branches: [
      {
        id: 'b1111111-1111-1111-1111-111111111111',
        code: 'MAIN',
        nameAr: 'الفرع الرئيسي - الرياض',
        nameEn: 'Main Branch - Riyadh',
        isMainBranch: true
      },
      {
        id: 'b2222222-2222-2222-2222-222222222222',
        code: 'JED',
        nameAr: 'فرع المنطقة الغربية - جدة',
        nameEn: 'Western Region Branch - Jeddah',
        isMainBranch: false
      }
    ],
    fiscalYears: [
      {
        id: 'f2026111-1111-1111-1111-111111111111',
        yearNumber: 2026,
        nameAr: 'السنة المالية 2026',
        nameEn: 'Fiscal Year 2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isClosed: false,
        periods: []
      }
    ]
  };

  activeCompany = signal<Company>(this.getInitialCompany());
  activeBranch = signal<Branch>(this.activeCompany().branches[0] || this.defaultCompany.branches[0]);
  availableCompanies = signal<Company[]>([this.activeCompany()]);

  companyName = computed(() => (lang: 'ar' | 'en') => 
    lang === 'ar' ? this.activeCompany().nameAr : this.activeCompany().nameEn
  );

  branchName = computed(() => (lang: 'ar' | 'en') => 
    lang === 'ar' ? this.activeBranch().nameAr : this.activeBranch().nameEn
  );

  companyLogo = computed(() => {
    const comp = this.activeCompany();
    if (comp?.logoUrl) return comp.logoUrl;
    try {
      const modRaw = localStorage.getItem(`alrobban_erp_all_modules_settings_${comp?.id}`);
      if (modRaw) {
        const mod = JSON.parse(modRaw);
        if (mod?.general?.logoUrl) return mod.general.logoUrl;
      }
    } catch {}
    return '';
  });

  constructor() {
    this.applyBrandColor(this.activeCompany().brandThemeColor || '#0f766e');
    this.hydrateFromSessionOrServer();
  }

  private getInitialCompany(): Company {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const userRawForCheck = localStorage.getItem('alrobban_user');
      const sessionTenantId = userRawForCheck ? JSON.parse(userRawForCheck)?.tenantId : undefined;
      if (stored) {
        const parsed = JSON.parse(stored);
        // Never trust a cached company that belongs to a different tenant than the session
        if (!sessionTenantId || parsed?.id === sessionTenantId) {
          if (!parsed.logoUrl && parsed.id) {
            try {
              const modRaw = localStorage.getItem(`alrobban_erp_all_modules_settings_${parsed.id}`);
              if (modRaw) {
                const mod = JSON.parse(modRaw);
                if (mod?.general?.logoUrl) parsed.logoUrl = mod.general.logoUrl;
              }
            } catch {}
          }
          return parsed;
        }
      }
      const userRaw = localStorage.getItem('alrobban_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u.tenantId && u.companyNameAr) {
          return {
            id: u.tenantId,
            code: u.tenantCode || 'CO',
            nameAr: u.companyNameAr,
            nameEn: u.companyNameEn || u.companyNameAr,
            vatNumber: '',
            commercialRegistration: '',
            currencyCode: 'SAR',
            logoUrl: u.companyLogoUrl,
            brandThemeColor: u.brandThemeColor || '#0f766e',
            branches: [
              {
                id: u.tenantId + '-b1',
                code: 'MAIN',
                nameAr: 'الفرع الرئيسي',
                nameEn: 'Main Branch',
                isMainBranch: true
              }
            ],
            fiscalYears: [
              {
                id: u.tenantId + '-y1',
                yearNumber: new Date().getFullYear(),
                nameAr: `السنة المالية ${new Date().getFullYear()}`,
                nameEn: `Fiscal Year ${new Date().getFullYear()}`,
                startDate: `${new Date().getFullYear()}-01-01`,
                endDate: `${new Date().getFullYear()}-12-31`,
                isClosed: false,
                periods: []
              }
            ]
          };
        }
      }
    } catch {}
    return this.defaultCompany;
  }

  public hydrateFromSessionOrServer(): void {
    try {
      const userRaw = localStorage.getItem('alrobban_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u.tenantId) {
          this.setCompanyFromUser(u);
          return;
        }
      }
    } catch {}

    const token = localStorage.getItem('alrobban_token');
    if (token) {
      this.fetchCurrentCompanyFromServer();
    }
  }

  setCompany(company: Company): void {
    if (!company.logoUrl && company.id) {
      try {
        const modRaw = localStorage.getItem(`alrobban_erp_all_modules_settings_${company.id}`);
        if (modRaw) {
          const mod = JSON.parse(modRaw);
          if (mod?.general?.logoUrl) company.logoUrl = mod.general.logoUrl;
        }
      } catch {}
    }
    this.activeCompany.set(company);
    if (company.branches && company.branches.length > 0) {
      this.activeBranch.set(company.branches[0]);
    }
    if (company.brandThemeColor) {
      this.applyBrandColor(company.brandThemeColor);
    }
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(company));
    } catch {}
  }

  setCompanyFromUser(user: any): void {
    if (!user || !user.tenantId) return;
    const current = this.activeCompany();
    const updated: Company = {
      id: user.tenantId,
      code: user.tenantCode || (current.id === user.tenantId ? current.code : 'CO'),
      nameAr: user.companyNameAr || current.nameAr,
      nameEn: user.companyNameEn || current.nameEn,
      vatNumber: current.id === user.tenantId ? current.vatNumber : '',
      commercialRegistration: current.id === user.tenantId ? current.commercialRegistration : '',
      currencyCode: 'SAR',
      logoUrl: user.companyLogoUrl !== undefined && user.companyLogoUrl ? user.companyLogoUrl : current.logoUrl,
      brandThemeColor: user.brandThemeColor || current.brandThemeColor || '#0f766e',
      branches: current.id === user.tenantId && current.branches?.length > 0 ? current.branches : [
        {
          id: user.tenantId + '-b1',
          code: 'MAIN',
          nameAr: 'الفرع الرئيسي',
          nameEn: 'Main Branch',
          isMainBranch: true
        }
      ],
      fiscalYears: current.id === user.tenantId && current.fiscalYears?.length > 0 ? current.fiscalYears : [
        {
          id: user.tenantId + '-y1',
          yearNumber: new Date().getFullYear(),
          nameAr: `السنة المالية ${new Date().getFullYear()}`,
          nameEn: `Fiscal Year ${new Date().getFullYear()}`,
          startDate: `${new Date().getFullYear()}-01-01`,
          endDate: `${new Date().getFullYear()}-12-31`,
          isClosed: false,
          periods: []
        }
      ]
    };
    this.setCompany(updated);
    this.fetchCurrentCompanyFromServer();
  }

  fetchCurrentCompanyFromServer(): void {
    const token = localStorage.getItem('alrobban_token');
    if (!token) return;

    this.http.get<any>(`${environment.apiUrl}/api/companies/current`).subscribe({
      next: (comp) => {
        if (!comp || !comp.id) return;
        const current = this.activeCompany();
        let logo = comp.logoUrl || current.logoUrl;
        if (!logo && comp.id) {
          try {
            const modRaw = localStorage.getItem(`alrobban_erp_all_modules_settings_${comp.id}`);
            if (modRaw) {
              const mod = JSON.parse(modRaw);
              if (mod?.general?.logoUrl) logo = mod.general.logoUrl;
            }
          } catch {}
        }
        const mapped: Company = {
          id: comp.id,
          code: comp.code,
          nameAr: comp.nameAr || current.nameAr,
          nameEn: comp.nameEn || current.nameEn,
          vatNumber: comp.vatNumber || current.vatNumber || '',
          commercialRegistration: comp.commercialRegistration || current.commercialRegistration || '',
          currencyCode: comp.currencyCode || current.currencyCode || 'SAR',
          logoUrl: logo,
          brandThemeColor: comp.brandThemeColor || current.brandThemeColor || '#0f766e',
          branches: comp.branches && comp.branches.length > 0
            ? comp.branches.map((b: any) => ({
                id: b.id,
                code: b.code,
                nameAr: b.nameAr,
                nameEn: b.nameEn,
                isMainBranch: b.isMainBranch
              }))
            : [
                {
                  id: comp.id + '-b1',
                  code: 'MAIN',
                  nameAr: 'الفرع الرئيسي',
                  nameEn: 'Main Branch',
                  isMainBranch: true
                }
              ],
          fiscalYears: comp.fiscalYears && comp.fiscalYears.length > 0
            ? comp.fiscalYears.map((y: any) => ({
                id: y.id,
                yearNumber: y.yearNumber,
                nameAr: y.nameAr,
                nameEn: y.nameEn,
                startDate: y.startDate,
                endDate: y.endDate,
                isClosed: y.isClosed,
                periods: []
              }))
            : []
        };
        this.setCompany(mapped);
      },
      error: () => {}
    });
  }

  clear(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {}
    this.activeCompany.set(this.defaultCompany);
    this.activeBranch.set(this.defaultCompany.branches[0]);
    this.applyBrandColor(this.defaultCompany.brandThemeColor || '#0f766e');
  }

  /** True only for the built-in demo tenant; real tenants must never receive seeded demo data. */
  isDemoCompany(id?: string): boolean {
    return (id || this.activeCompany()?.id) === this.defaultCompany.id;
  }

  setBranch(branch: Branch): void {
    this.activeBranch.set(branch);
  }

  public applyBrandColor(hexColor: string): void {
    document.documentElement.style.setProperty('--primary-color', hexColor);
  }
}
