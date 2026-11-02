import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Enterprise Role-Based Access Control (RBAC) Guard
 * Ensures only authorized roles can access administrative and sensitive modules.
 * Salespersons are strictly confined to Invoicing, Quotations, Returns, POS, and Customers.
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const expectedRoles = (route.data?.['roles'] as string[]) || [];
  if (expectedRoles.length === 0) {
    return true;
  }

  const userRole = authService.currentUser()?.role;
  if (!userRole) {
    router.navigate(['/login']);
    return false;
  }

  // SuperAdmin has full platform access
  if (userRole === 'SuperAdmin') {
    return true;
  }

  const roleCode = authService.currentUser()?.roleCode;

  if (expectedRoles.includes(userRole) || (roleCode && expectedRoles.includes(roleCode))) {
    return true;
  }

  // Restricted: Salesperson attempting to access accounting, fixed assets, or admin settings
  if (authService.isSalesperson() || userRole === 'Salesperson' || roleCode === 'SALES_REP') {
    router.navigate(['/invoicing/tax-invoices']);
    return false;
  }

  router.navigate(['/dashboard']);
  return false;
};
