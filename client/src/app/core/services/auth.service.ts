import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { CompanyContextService, Company } from './company-context.service';
import { LanguageService } from './language.service';
import { environment } from '../../../environments/environment';

import Swal from 'sweetalert2';

export interface CurrentUser {
  id: string;
  userName: string;
  fullNameAr: string;
  fullNameEn: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'Accountant' | 'FinancialAuditor' | 'Salesperson' | string;
  roleCode?: string;
  roleNameAr?: string;
  permissions?: string[];
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
  private langService = inject(LanguageService);

  private readonly STORAGE_KEY = 'alrobban_user';
  private readonly TOKEN_KEY = 'alrobban_token';

  // Initially NULL to force login unless a valid session exists in localStorage
  currentUser = signal<CurrentUser | null>(this.getStoredUser());

  isSuperAdmin = computed(() => this.currentUser()?.role === 'SuperAdmin');
  isCompanyAdmin = computed(() => this.currentUser()?.role === 'CompanyAdmin' || this.currentUser()?.roleCode === 'COMPANY_ADMIN');
  isSalesperson = computed(() => this.currentUser()?.role === 'Salesperson' || this.currentUser()?.roleCode === 'SALES_REP');
  isAccountant = computed(() => this.currentUser()?.role === 'Accountant' || this.currentUser()?.roleCode === 'ACCOUNTANT' || this.currentUser()?.roleCode === 'FINANCE_MANAGER');
  canViewAccounting = computed(() => !this.isSalesperson());
  isAuthenticated = computed(() => !!this.currentUser());

  hasPermission(perm: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (this.isSuperAdmin() || this.isCompanyAdmin()) return true;
    if (!user.permissions || user.permissions.length === 0) return true;
    return user.permissions.includes(perm);
  }

  constructor() {
    // If a user was restored from storage, re-apply branding and synchronize company context
    const user = this.currentUser();
    if (user) {
      if (user.tenantId) {
        this.companyContext.setCompanyFromUser(user);
      } else if (user.brandThemeColor) {
        this.companyContext.applyBrandColor(user.brandThemeColor);
      }
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
    const endpoint = `${environment.apiUrl}/api/auth/login`;
    
    return this.http.post<any>(endpoint, {
      userNameOrEmail: req.username,
      password: req.password
    }).pipe(
      map((res) => {
        if (res && res.token && (res.user || res.userId || res.userName)) {
          const u = res.user || res;
          const user: CurrentUser = {
            id: u.id || u.userId,
            userName: u.userName,
            fullNameAr: u.fullNameAr,
            fullNameEn: u.fullNameEn,
            role: u.role,
            roleCode: u.roleCode,
            roleNameAr: u.roleNameAr,
            permissions: u.permissions || [],
            tenantId: u.tenantId,
            token: res.token,
            companyNameAr: u.companyNameAr,
            companyNameEn: u.companyNameEn,
            companyLogoUrl: u.companyLogoUrl,
            brandThemeColor: u.brandColor || u.brandThemeColor
          };
          this.setSession(user);
          if (user.tenantId) {
            this.companyContext.setCompanyFromUser(user);
          }
          return { success: true, user };
        }
        return { success: false, error: this.langService.t('auth.login.responseIncomplete') };
      }),
      catchError((err) => {
        const msg = err?.error?.description || err?.error?.message || this.langService.t('auth.login.failedDefault');
        return of({ success: false, error: msg });
      })
    );
  }

  private setSession(user: CurrentUser) {
    this.currentUser.set(user);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    if (user.token) {
      localStorage.setItem(this.TOKEN_KEY, user.token);
    }
  }

  private isHandlingExpiry = false;

  /**
   * Graceful session expiration handler
   * Notifies user with SweetAlert2, saves return URL, and navigates to login
   */
  handleSessionExpired() {
    if (this.isHandlingExpiry) return;
    this.isHandlingExpiry = true;

    // Capture current URL so user can seamlessly resume work after re-login
    const currentUrl = this.router.url;
    if (currentUrl && !currentUrl.includes('/login')) {
      sessionStorage.setItem('alrobban_return_url', currentUrl);
    }

    this.currentUser.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    this.companyContext.clear();

    Swal.fire({
      icon: 'warning',
      title: this.langService.t('auth.sessionExpired.title'),
      html: `
        <div style="font-size: 0.95rem; color: #475569; line-height: 1.6;">
          <p style="margin-bottom: 0.5rem;">${this.langService.t('auth.sessionExpired.text1')}</p>
          <p style="font-weight: 600; color: #0f172a;">${this.langService.t('auth.sessionExpired.text2')}</p>
        </div>
      `,
      confirmButtonText: this.langService.t('auth.sessionExpired.reloginBtn'),
      confirmButtonColor: '#059669',
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then(() => {
      this.isHandlingExpiry = false;
      this.router.navigate(['/login']);
    });
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem('alrobban_return_url');
    this.companyContext.clear();
    this.router.navigate(['/login']);
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
    this.companyContext.setCompanyFromUser(user);
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

  /**
   * Request OTP code for password recovery
   */
  forgotPassword(userNameOrEmail: string): Observable<{
    success: boolean;
    userName: string;
    maskedEmail: string;
    otp: string;
    message: string;
  }> {
    const endpoint = `${environment.apiUrl}/api/auth/forgot-password`;
    return this.http.post<any>(endpoint, { userNameOrEmail });
  }

  /**
   * Reset password using OTP code
   */
  resetPassword(payload: { userNameOrEmail: string; otp: string; newPassword: string }): Observable<{
    success: boolean;
    userName: string;
    message: string;
  }> {
    const endpoint = `${environment.apiUrl}/api/auth/reset-password`;
    return this.http.post<any>(endpoint, payload);
  }
}

