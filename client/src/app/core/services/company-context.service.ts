import { Injectable, signal, computed } from '@angular/core';

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
  // Demo initial company for instant rich UX
  private readonly defaultCompany: Company = {
    id: '11111111-2222-3333-4444-555555555555',
    code: 'COMP-01',
    nameAr: 'شركة الربان للحلول الذكية',
    nameEn: 'Al-Roban Smart Solutions Co.',
    vatNumber: '310123456700003',
    commercialRegistration: '1010789456',
    currencyCode: 'SAR',
    logoUrl: '', // Will use elegant SVG emblem when empty
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

  activeCompany = signal<Company>(this.defaultCompany);
  activeBranch = signal<Branch>(this.defaultCompany.branches[0]);
  availableCompanies = signal<Company[]>([this.defaultCompany]);

  companyName = computed(() => (lang: 'ar' | 'en') => 
    lang === 'ar' ? this.activeCompany().nameAr : this.activeCompany().nameEn
  );

  branchName = computed(() => (lang: 'ar' | 'en') => 
    lang === 'ar' ? this.activeBranch().nameAr : this.activeBranch().nameEn
  );

  constructor() {
    this.applyBrandColor(this.defaultCompany.brandThemeColor || '#0f766e');
  }

  setCompany(company: Company) {
    this.activeCompany.set(company);
    if (company.branches && company.branches.length > 0) {
      this.activeBranch.set(company.branches[0]);
    }
    if (company.brandThemeColor) {
      this.applyBrandColor(company.brandThemeColor);
    }
  }

  setBranch(branch: Branch) {
    this.activeBranch.set(branch);
  }

  public applyBrandColor(hexColor: string) {
    document.documentElement.style.setProperty('--primary-color', hexColor);
  }
}
