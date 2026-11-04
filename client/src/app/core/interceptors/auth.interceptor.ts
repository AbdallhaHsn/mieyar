import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { CompanyContextService } from '../services/company-context.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Enterprise Multi-Tenant & Security Interceptor for Al-Roban Cloud ERP
 * Automatically injects:
 * 1. Authorization: Bearer <JWT>
 * 2. X-Tenant-Id: Active Tenant Company GUID (for platform owner impersonation)
 * 3. Handles 401 Unauthorized by gracefully logging out
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const companyContext = inject(CompanyContextService);
  const authService = inject(AuthService);

  // Retrieve auth token from storage or current user state
  const token = localStorage.getItem('alrobban_token') || authService.currentUser()?.token;

  // Retrieve active tenant ID (from selected company context or current user or fallback canonical)
  const activeTenantId = companyContext.activeCompany()?.id 
    || authService.currentUser()?.tenantId 
    || '11111111-2222-3333-4444-555555555555';

  let headers = req.headers;

  const activeLang = localStorage.getItem('alrobban_lang') || 'ar';
  headers = headers.set('Accept-Language', activeLang).set('X-Lang', activeLang);

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  if (activeTenantId) {
    headers = headers.set('X-Tenant-Id', activeTenantId);
  }

  let url = req.url;
  if (url.startsWith('/api/')) {
    url = `${environment.apiUrl}${url}`;
  }

  const clonedReq = req.clone({ headers, url });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/login')) {
        authService.handleSessionExpired();
      }
      return throwError(() => error);
    })
  );
};
