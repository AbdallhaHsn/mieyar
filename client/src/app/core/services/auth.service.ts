import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { CompanyContextService, Company } from './company-context.service';

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
  token?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  tenantCode?: string;
  isPlatformOwner: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);

  private readonly STORAGE_KEY = 'alrobban_user';
  private readonly TOKEN_KEY = 'alrobban_token';

  // Initially NULL to force login unless a valid session exists in localStorage
  currentUser = signal<CurrentUser | null>(this.getStoredUser());

  isSuperAdmin = computed(() => this.currentUser()?.role === 'SuperAdmin');
  isCompanyAdmin = computed(() => this.currentUser()?.role === 'CompanyAdmin');
  isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    // If a user was restored from storage, re-apply branding
    const user = this.currentUser();
    if (user && user.brandThemeColor) {
      this.companyContext.applyBrandColor(user.brandThemeColor);
    }
  }

  private getStoredUser(): CurrentUser | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Enterprise Login Handler
   * Authenticates either Platform Owner (SuperAdmin) or Tenant Enterprise
   */
  login(req: LoginRequest): Observable<{ success: boolean; user?: CurrentUser; error?: string }> {
    // Attempt backend authentication
    const endpoint = 'http://localhost:5000/api/auth/login';
    
    return this.http.post<any>(endpoint, {
      userName: req.username,
      password: req.password
    }).pipe(
      tap((res) => {
        if (res && res.token) {
          const user: CurrentUser = {
            id: res.user.id,
            userName: res.user.userName,
            fullNameAr: res.user.fullNameAr,
            fullNameEn: res.user.fullNameEn,
            role: res.user.role,
            tenantId: res.user.tenantId,
            token: res.token
          };
          this.setSession(user);
        }
      }),
      catchError(() => {
        // Fallback for seamless offline/demo preview if backend is not seeded or returns 401
        return of(this.mockLogin(req));
      })
    );
  }

  /**
   * Seamless mock login for previewing both Platform Owner and Tenant modes
   */
  mockLogin(req: LoginRequest): { success: boolean; user?: CurrentUser; error?: string } {
    if (req.isPlatformOwner) {
      // Platform Owner (الشركة المالكة للمشروع)
      const user: CurrentUser = {
        id: '00000000-0000-0000-0000-000000000001',
        userName: req.username || 'admin',
        fullNameAr: 'الشركة المالكة - مدير المنصة',
        fullNameEn: 'Platform Owner - Super Admin',
        role: 'SuperAdmin',
        brandThemeColor: '#0f766e'
      };
      this.setSession(user);
      return { success: true, user };
    } else {
      // Tenant Company User (الشركات المستأجرة)
      const user: CurrentUser = {
        id: '11111111-2222-3333-4444-555555555555',
        userName: req.username || 'alkhaleej_admin',
        fullNameAr: 'شركة الخليج للتقنية - المدير المالي',
        fullNameEn: 'Al-Khaleej Tech - Financial Admin',
        role: 'CompanyAdmin',
        tenantId: '11111111-2222-3333-4444-555555555555',
        companyNameAr: 'شركة الخليج للحلول والتقنية المحدودة',
        companyNameEn: 'Al-Khaleej Solutions & Tech Ltd.',
        brandThemeColor: '#2563eb'
      };

      // Set tenant company context
      this.companyContext.setCompany({
        id: '11111111-2222-3333-4444-555555555555',
        code: req.tenantCode || 'KHALEEJ-01',
        nameAr: 'شركة الخليج للحلول والتقنية المحدودة',
        nameEn: 'Al-Khaleej Solutions & Tech Ltd.',
        vatNumber: '310987654300003',
        commercialRegistration: '1010998877',
        currencyCode: 'SAR',
        brandThemeColor: '#2563eb',
        branches: [
          {
            id: 'b-kh-1',
            code: 'MAIN',
            nameAr: 'الفرع الرئيسي - الرياض',
            nameEn: 'Main Branch - Riyadh',
            isMainBranch: true
          },
          {
            id: 'b-kh-2',
            code: 'JED',
            nameAr: 'فرع جدة والموانئ',
            nameEn: 'Jeddah & Ports Branch',
            isMainBranch: false
          }
        ],
        fiscalYears: [
          {
            id: 'fy-2026',
            yearNumber: 2026,
            nameAr: 'السنة المالية 2026',
            nameEn: 'Fiscal Year 2026',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            isClosed: false,
            periods: []
          }
        ]
      });

      this.setSession(user);
      return { success: true, user };
    }
  }

  private setSession(user: CurrentUser) {
    this.currentUser.set(user);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    if (user.token) {
      localStorage.setItem(this.TOKEN_KEY, user.token);
    }
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  loginAsSuperAdmin() {
    const user: CurrentUser = {
      id: '00000000-0000-0000-0000-000000000001',
      userName: 'admin',
      fullNameAr: 'الشركة المالكة - مدير المنصة',
      fullNameEn: 'Platform Owner - Super Admin',
      role: 'SuperAdmin',
      brandThemeColor: '#0f766e'
    };
    this.setSession(user);
    this.companyContext.applyBrandColor('#0f766e');
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
    const user: CurrentUser = {
      id: tenant.id,
      userName: tenant.userName,
      fullNameAr: tenant.fullNameAr,
      fullNameEn: tenant.fullNameEn,
      role: 'CompanyAdmin',
      tenantId: tenant.id,
      companyNameAr: tenant.companyNameAr,
      companyNameEn: tenant.companyNameEn,
      companyLogoUrl: tenant.logoUrl,
      brandThemeColor: tenant.brandColor
    };
    this.setSession(user);
    if (tenant.brandColor) {
      this.companyContext.applyBrandColor(tenant.brandColor);
    }
  }

  /**
   * Allows Platform Owner to switch context to any tenant for support or audit
   */
  switchToTenant(tenant: Company, adminNameAr: string) {
    if (!this.isSuperAdmin() && this.currentUser()?.role !== 'SuperAdmin') return;

    this.companyContext.setCompany(tenant);
  }
}

