import { Injectable, signal, computed } from '@angular/core';
import { CompanyContextService } from './company-context.service';

export interface CurrentUser {
  id: string;
  userName: string;
  fullNameAr: string;
  fullNameEn: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'Accountant' | 'FinancialAuditor';
  tenantId?: string;
  companyNameAr?: string;
  companyNameEn?: string;
  companyLogoUrl?: string;
  brandThemeColor?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Demo initially authenticated as Platform Owner (الشركة المالكة للمشروع)
  currentUser = signal<CurrentUser>({
    id: '00000000-0000-0000-0000-000000000001',
    userName: 'superadmin',
    fullNameAr: 'الشركة المالكة - مدير المنصة',
    fullNameEn: 'Platform Owner - Super Admin',
    role: 'SuperAdmin'
  });

  isSuperAdmin = computed(() => this.currentUser().role === 'SuperAdmin');
  isCompanyAdmin = computed(() => this.currentUser().role === 'CompanyAdmin');
  isAuthenticated = computed(() => !!this.currentUser().id);

  constructor(private companyContext: CompanyContextService) {}

  loginAsSuperAdmin() {
    this.currentUser.set({
      id: '00000000-0000-0000-0000-000000000001',
      userName: 'superadmin',
      fullNameAr: 'الشركة المالكة - مدير المنصة',
      fullNameEn: 'Platform Owner - Super Admin',
      role: 'SuperAdmin'
    });
  }

  loginAsCompanyAdmin(tenant: {
    id: string;
    userName: string;
    fullNameAr: string;
    fullNameEn: string;
    companyNameAr: string;
    companyNameEn: string;
    logoUrl?: string;
    brandColor?: string;
  }) {
    this.currentUser.set({
      id: '00000000-0000-0000-0000-000000000002',
      userName: tenant.userName,
      fullNameAr: tenant.fullNameAr,
      fullNameEn: tenant.fullNameEn,
      role: 'CompanyAdmin',
      tenantId: tenant.id,
      companyNameAr: tenant.companyNameAr,
      companyNameEn: tenant.companyNameEn,
      companyLogoUrl: tenant.logoUrl,
      brandThemeColor: tenant.brandColor
    });

    // Update Company Context & Branding
    this.companyContext.setCompany({
      id: tenant.id,
      code: 'NEW-TENANT',
      nameAr: tenant.companyNameAr,
      nameEn: tenant.companyNameEn,
      vatNumber: '310999999900003',
      commercialRegistration: '1010555444',
      currencyCode: 'SAR',
      logoUrl: tenant.logoUrl,
      brandThemeColor: tenant.brandColor || '#0f766e',
      branches: [
        {
          id: 'b-new-1',
          code: 'MAIN',
          nameAr: 'الفرع الرئيسي',
          nameEn: 'Main Branch',
          isMainBranch: true
        }
      ],
      fiscalYears: []
    });
  }
}
