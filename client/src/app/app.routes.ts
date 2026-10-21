import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CompaniesListComponent } from './features/companies/companies-list.component';
import { authGuard, loginGuard } from './core/guards/auth.guard';

import { ChartOfAccountsComponent } from './features/accounting/chart-of-accounts/chart-of-accounts.component';
import { AccountCreateComponent } from './features/accounting/account-create/account-create.component';
import { FinancialSettingsComponent } from './features/accounting/financial-settings/financial-settings.component';
import { JournalEntriesComponent } from './features/accounting/journal-entries/journal-entries.component';
import { JournalEntryCreateComponent } from './features/accounting/journal-entry-create/journal-entry-create.component';
import { GeneralLedgerComponent } from './features/accounting/general-ledger/general-ledger.component';
import { TrialBalanceComponent } from './features/accounting/trial-balance/trial-balance.component';
import { FinancialStatementsComponent } from './features/accounting/financial-statements/financial-statements.component';
import { VouchersComponent } from './features/accounting/vouchers/vouchers.component';
import { BankReconciliationComponent } from './features/accounting/bank-reconciliation/bank-reconciliation.component';
import { FixedAssetsComponent } from './features/accounting/fixed-assets/fixed-assets.component';
import { PersonalWorkspaceComponent } from './features/personal-workspace/personal-workspace.component';
import { TaxInvoicesComponent } from './features/invoicing/tax-invoices/tax-invoices.component';
import { ChecksComponent } from './features/accounting/checks/checks.component';
import { PartnersComponent } from './features/accounting/partners/partners.component';
import { PartnerCreateComponent } from './features/accounting/partner-create/partner-create.component';

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
        path: 'accounting/financial-settings',
        component: FinancialSettingsComponent
      },
      {
        path: 'accounting/cost-centers',
        component: FinancialSettingsComponent
      },
      {
        path: 'accounting/vouchers',
        component: VouchersComponent
      },
      {
        path: 'accounting/bank-reconciliation',
        component: BankReconciliationComponent
      },
      {
        path: 'accounting/fixed-assets',
        component: FixedAssetsComponent
      },
      {
        path: 'accounting/checks',
        component: ChecksComponent
      },
      {
        path: 'accounting/partners',
        component: PartnersComponent
      },
      {
        path: 'accounting/partners/create',
        component: PartnerCreateComponent
      },
      {
        path: 'accounting/customers/create',
        redirectTo: 'accounting/partners/create'
      },
      {
        path: 'accounting/journal-entries',
        component: JournalEntriesComponent
      },
      {
        path: 'accounting/journal-entries/create',
        component: JournalEntryCreateComponent
      },
      {
        path: 'accounting/general-ledger',
        component: GeneralLedgerComponent
      },
      {
        path: 'accounting/trial-balance',
        component: TrialBalanceComponent
      },
      {
        path: 'accounting/financial-statements',
        component: FinancialStatementsComponent
      },
      {
        path: 'accounting/income-statement',
        component: FinancialStatementsComponent
      },
      {
        path: 'accounting/balance-sheet',
        component: FinancialStatementsComponent
      },
      {
        path: 'invoicing/tax-invoices',
        component: TaxInvoicesComponent
      },
      {
        path: 'invoicing/simplified',
        component: TaxInvoicesComponent
      },
      {
        path: 'workspace/agenda',
        component: PersonalWorkspaceComponent
      },
      {
        path: 'workspace/notes',
        component: PersonalWorkspaceComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
