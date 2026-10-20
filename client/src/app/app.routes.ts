import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CompaniesListComponent } from './features/companies/companies-list.component';
import { authGuard, loginGuard } from './core/guards/auth.guard';

import { ChartOfAccountsComponent } from './features/accounting/chart-of-accounts/chart-of-accounts.component';
import { AccountCreateComponent } from './features/accounting/account-create/account-create.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'companies',
        component: CompaniesListComponent
      },
      {
        path: 'accounting/chart-of-accounts',
        component: ChartOfAccountsComponent
      },
      {
        path: 'accounting/chart-of-accounts/create',
        component: AccountCreateComponent
      },
      {
        path: 'accounting/journal-entries',
        component: DashboardComponent
      },
      {
        path: 'invoicing/tax-invoices',
        component: DashboardComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
