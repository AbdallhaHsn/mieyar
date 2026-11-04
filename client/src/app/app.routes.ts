import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard, loginGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

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
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'companies',
        loadComponent: () => import('./features/companies/companies-list.component').then(m => m.CompaniesListComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin'] }
      },
      {
        path: 'companies/new',
        loadComponent: () => import('./features/company-onboarding/company-onboarding.component').then(m => m.CompanyOnboardingComponent),
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin'] }
      },
      {
        path: 'companies/create',
        redirectTo: 'companies/new'
      },
      {
        path: 'settings/branches',
        loadComponent: () => import('./features/settings/branches/branches.component').then(m => m.BranchesComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin', 'Accountant'] }
      },
      {
        path: 'system/branches',
        redirectTo: 'settings/branches'
      },
      {
        path: 'system/branches-warehouses',
        redirectTo: 'settings/branches'
      },
      {
        path: 'purchasing/warehouses',
        loadComponent: () => import('./features/inventory/warehouses/warehouses.component').then(m => m.WarehousesComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin', 'Accountant'] }
      },
      {
        path: 'purchasing/warehouses/:id/analytics',
        loadComponent: () => import('./features/inventory/warehouses/warehouse-analytics-page/warehouse-analytics-page.component').then(m => m.WarehouseAnalyticsPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin', 'Accountant'] }
      },
      {
        path: 'inventory/warehouses/:id/analytics',
        redirectTo: 'purchasing/warehouses/:id/analytics'
      },
      {
        path: 'inventory/warehouses',
        redirectTo: 'purchasing/warehouses'
      },
      {
        path: 'accounting/chart-of-accounts',
        loadComponent: () => import('./features/accounting/chart-of-accounts/chart-of-accounts.component').then(m => m.ChartOfAccountsComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin', 'Accountant', 'FinancialAuditor'] }
      },
      {
        path: 'accounting/chart-of-accounts/create',
        loadComponent: () => import('./features/accounting/account-create/account-create.component').then(m => m.AccountCreateComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin', 'Accountant', 'FinancialAuditor'] }
      },
      {
        path: 'accounting/financial-settings',
        loadComponent: () => import('./features/accounting/financial-settings/financial-settings.component').then(m => m.FinancialSettingsComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin', 'Accountant'] }
      },
      {
        path: 'accounting/cost-centers',
        loadComponent: () => import('./features/accounting/financial-settings/financial-settings.component').then(m => m.FinancialSettingsComponent)
      },
      {
        path: 'accounting/year-end-closing',
        loadComponent: () => import('./features/accounting/year-end-closing/year-end-closing.component').then(m => m.YearEndClosingComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin', 'Accountant', 'FinancialAuditor'] }
      },
      {
        path: 'accounting/fiscal-closing',
        redirectTo: 'accounting/year-end-closing'
      },
      {
        path: 'accounting/vouchers',
        loadComponent: () => import('./features/accounting/vouchers/vouchers.component').then(m => m.VouchersComponent)
      },
      {
        path: 'accounting/bank-reconciliation',
        loadComponent: () => import('./features/accounting/bank-reconciliation/bank-reconciliation.component').then(m => m.BankReconciliationComponent)
      },
      {
        path: 'accounting/fixed-assets',
        loadComponent: () => import('./features/accounting/fixed-assets/fixed-assets.component').then(m => m.FixedAssetsComponent)
      },
      {
        path: 'accounting/checks',
        loadComponent: () => import('./features/accounting/checks/checks.component').then(m => m.ChecksComponent)
      },
      {
        path: 'accounting/partners',
        loadComponent: () => import('./features/accounting/partners/partners.component').then(m => m.PartnersComponent)
      },
      {
        path: 'accounting/partners/create',
        loadComponent: () => import('./features/accounting/partner-create/partner-create.component').then(m => m.PartnerCreateComponent)
      },
      {
        path: 'accounting/customers/create',
        redirectTo: 'accounting/partners/create'
      },
      {
        path: 'accounting/journal-entries',
        loadComponent: () => import('./features/accounting/journal-entries/journal-entries.component').then(m => m.JournalEntriesComponent)
      },
      {
        path: 'accounting/journal-entries/create',
        loadComponent: () => import('./features/accounting/journal-entry-create/journal-entry-create.component').then(m => m.JournalEntryCreateComponent)
      },
      {
        path: 'accounting/general-ledger',
        loadComponent: () => import('./features/accounting/general-ledger/general-ledger.component').then(m => m.GeneralLedgerComponent)
      },
      {
        path: 'accounting/account-statement',
        loadComponent: () => import('./features/accounting/general-ledger/general-ledger.component').then(m => m.GeneralLedgerComponent),
        data: { defaultView: 'statement' }
      },
      {
        path: 'accounting/trial-balance',
        loadComponent: () => import('./features/accounting/trial-balance/trial-balance.component').then(m => m.TrialBalanceComponent)
      },
      {
        path: 'accounting/financial-statements',
        loadComponent: () => import('./features/accounting/financial-statements/financial-statements.component').then(m => m.FinancialStatementsComponent)
      },
      {
        path: 'accounting/income-statement',
        redirectTo: 'accounting/financial-statements'
      },
      {
        path: 'accounting/balance-sheet',
        redirectTo: 'accounting/financial-statements'
      },
      {
        path: 'invoicing/tax-invoices',
        loadComponent: () => import('./features/invoicing/tax-invoices/tax-invoices.component').then(m => m.TaxInvoicesComponent)
      },
      {
        path: 'invoicing/credit-notes',
        loadComponent: () => import('./features/invoicing/tax-invoices/tax-invoices.component').then(m => m.TaxInvoicesComponent)
      },
      {
        path: 'invoicing/quotations',
        loadComponent: () => import('./features/invoicing/tax-invoices/tax-invoices.component').then(m => m.TaxInvoicesComponent)
      },
      {
        path: 'invoicing/tax-invoices/create',
        loadComponent: () => import('./features/invoicing/invoice-create/invoice-create.component').then(m => m.InvoiceCreateComponent)
      },
      {
        path: 'invoicing/credit-notes/create',
        loadComponent: () => import('./features/invoicing/invoice-create/invoice-create.component').then(m => m.InvoiceCreateComponent)
      },
      {
        path: 'invoicing/quotations/create',
        loadComponent: () => import('./features/invoicing/invoice-create/invoice-create.component').then(m => m.InvoiceCreateComponent)
      },
      {
        path: 'invoicing/view/:id',
        loadComponent: () => import('./features/invoicing/invoice-view/invoice-view.component').then(m => m.InvoiceViewComponent)
      },
      {
        path: 'invoicing/tax-invoices/:id',
        redirectTo: 'invoicing/view/:id'
      },
      {
        path: 'invoicing/credit-notes/:id',
        redirectTo: 'invoicing/view/:id'
      },
      {
        path: 'invoicing/zatca-onboarding',
        loadComponent: () => import('./features/invoicing/zatca-onboarding/zatca-onboarding.component').then(m => m.ZatcaOnboardingComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin', 'Accountant'] }
      },
      {
        path: 'zatca/onboarding',
        redirectTo: 'invoicing/zatca-onboarding'
      },
      {
        path: 'invoicing/create',
        redirectTo: 'invoicing/tax-invoices/create'
      },
      {
        path: 'invoicing/simplified',
        loadComponent: () => import('./features/pos/pos-cashier/pos-cashier.component').then(m => m.PosCashierComponent)
      },
      {
        path: 'pos/cashier',
        redirectTo: 'invoicing/simplified'
      },
      {
        path: 'pos/shifts',
        loadComponent: () => import('./features/pos/pos-shifts/pos-shifts.component').then(m => m.PosShiftsComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin', 'Accountant'] }
      },
      {
        path: 'invoicing/pos-shifts',
        redirectTo: 'pos/shifts'
      },
      {
        path: 'invoicing/salespersons',
        loadComponent: () => import('./features/invoicing/salespersons/salespersons.component').then(m => m.SalespersonsComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin'] }
      },
      {
        path: 'purchasing/items',
        loadComponent: () => import('./features/purchasing/items/items-list.component').then(m => m.ItemsListComponent)
      },
      {
        path: 'purchasing/inventory/stocks',
        loadComponent: () => import('./features/inventory/warehouse-stocks/warehouse-stocks.component').then(m => m.WarehouseStocksComponent)
      },
      {
        path: 'inventory/stocks',
        redirectTo: 'purchasing/inventory/stocks'
      },
      {
        path: 'purchasing/inventory/adjustments',
        loadComponent: () => import('./features/purchasing/stock-adjustments/stock-adjustments.component').then(m => m.StockAdjustmentsComponent)
      },
      {
        path: 'purchasing/adjustments',
        redirectTo: 'purchasing/inventory/adjustments'
      },
      {
        path: 'purchasing/inventory/transfers',
        loadComponent: () => import('./features/purchasing/stock-transfers/stock-transfers.component').then(m => m.StockTransfersComponent)
      },
      {
        path: 'purchasing/transfers',
        redirectTo: 'purchasing/inventory/transfers'
      },
      {
        path: 'purchasing/procurement',
        loadComponent: () => import('./features/purchasing/procurement/procurement-hub.component').then(m => m.ProcurementHubComponent)
      },
      {
        path: 'purchasing/requisitions',
        redirectTo: 'purchasing/procurement'
      },
      {
        path: 'purchasing/orders',
        redirectTo: 'purchasing/procurement'
      },
      {
        path: 'purchasing/receipts',
        redirectTo: 'purchasing/procurement'
      },
      {
        path: 'purchasing/invoices',
        loadComponent: () => import('./features/purchasing/purchase-invoices/purchase-invoices-list.component').then(m => m.PurchaseInvoicesListComponent)
      },
      {
        path: 'purchasing/invoices/create',
        loadComponent: () => import('./features/purchasing/purchase-invoice-create/purchase-invoice-create.component').then(m => m.PurchaseInvoiceCreateComponent)
      },
      {
        path: 'workspace/agenda',
        loadComponent: () => import('./features/personal-workspace/personal-workspace.component').then(m => m.PersonalWorkspaceComponent)
      },
      {
        path: 'workspace/notes',
        loadComponent: () => import('./features/personal-workspace/personal-workspace.component').then(m => m.PersonalWorkspaceComponent)
      },
      {
        path: 'hr',
        redirectTo: 'hr/employees',
        pathMatch: 'full'
      },
      {
        path: 'hr/employees',
        loadComponent: () => import('./features/hr/employees/employees-list.component').then(m => m.EmployeesListComponent)
      },
      {
        path: 'hr/payroll',
        loadComponent: () => import('./features/hr/payroll/payroll-worksheet.component').then(m => m.PayrollWorksheetComponent)
      },
      {
        path: 'hr/advances',
        loadComponent: () => import('./features/hr/advances/hr-advances.component').then(m => m.HrAdvancesComponent)
      },
      {
        path: 'hr/custody',
        loadComponent: () => import('./features/hr/custody/hr-custody.component').then(m => m.HrCustodyComponent)
      },
      {
        path: 'hr/settings',
        loadComponent: () => import('./features/hr/settings/hr-settings.component').then(m => m.HrSettingsComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/projects-hub/projects-hub.component').then(m => m.ProjectsHubComponent),
        data: { activeTab: 'projects' }
      },
      {
        path: 'projects/contracts',
        redirectTo: 'projects'
      },
      {
        path: 'projects/billings',
        loadComponent: () => import('./features/projects/projects-hub/projects-hub.component').then(m => m.ProjectsHubComponent),
        data: { activeTab: 'billings' }
      },
      {
        path: 'projects/guarantees',
        loadComponent: () => import('./features/projects/projects-hub/projects-hub.component').then(m => m.ProjectsHubComponent),
        data: { activeTab: 'guarantees' }
      },
      {
        path: 'projects/planning',
        loadComponent: () => import('./features/projects/projects-hub/projects-hub.component').then(m => m.ProjectsHubComponent),
        data: { activeTab: 'planning' }
      },
      {
        path: 'projects/timesheet',
        loadComponent: () => import('./features/projects/projects-hub/projects-hub.component').then(m => m.ProjectsHubComponent),
        data: { activeTab: 'timesheet' }
      },
      {
        path: 'projects/settings',
        loadComponent: () => import('./features/projects/projects-hub/projects-hub.component').then(m => m.ProjectsHubComponent),
        data: { activeTab: 'settings' }
      },
      {
        path: 'manufacturing',
        loadComponent: () => import('./features/manufacturing/manufacturing-hub/manufacturing-hub.component').then(m => m.ManufacturingHubComponent)
      },
      {
        path: 'manufacturing/work-orders',
        loadComponent: () => import('./features/manufacturing/manufacturing-hub/manufacturing-hub.component').then(m => m.ManufacturingHubComponent)
      },
      {
        path: 'manufacturing/bom',
        loadComponent: () => import('./features/manufacturing/manufacturing-hub/manufacturing-hub.component').then(m => m.ManufacturingHubComponent)
      },
      {
        path: 'settings',
        redirectTo: 'settings/modules',
        pathMatch: 'full'
      },
      {
        path: 'settings/modules',
        loadComponent: () => import('./features/settings/modules-settings/modules-settings.component').then(m => m.ModulesSettingsComponent)
      },
      {
        path: 'settings/users-and-roles',
        loadComponent: () => import('./features/settings/users-and-roles/users-and-roles.component').then(m => m.UsersAndRolesComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin'] }
      },
      {
        path: 'settings/users-and-roles/roles/create',
        loadComponent: () => import('./features/settings/users-and-roles/role-editor/role-editor.component').then(m => m.RoleEditorComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin'] }
      },
      {
        path: 'settings/users-and-roles/roles/:id/edit',
        loadComponent: () => import('./features/settings/users-and-roles/role-editor/role-editor.component').then(m => m.RoleEditorComponent),
        canActivate: [roleGuard],
        data: { roles: ['CompanyAdmin'] }
      },
      {
        path: 'settings/roles/create',
        redirectTo: 'settings/users-and-roles/roles/create'
      },
      {
        path: 'settings/roles/:id/edit',
        redirectTo: 'settings/users-and-roles/roles/:id/edit'
      },
      {
        path: 'settings/users',
        redirectTo: 'settings/users-and-roles'
      },
      {
        path: 'settings/roles',
        redirectTo: 'settings/users-and-roles'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
