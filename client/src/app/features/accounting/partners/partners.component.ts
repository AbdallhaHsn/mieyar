import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LanguageService } from '../../../core/services/language.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { TafqeetService } from '../../../core/services/tafqeet.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

export enum PartnerType {
  Customer = 1, // عميل
  Supplier = 2, // مورد
  Both = 3      // عميل ومورد معاً
}

export interface BusinessPartnerDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: PartnerType;
  typeNameAr: string;
  taxNumber?: string;
  commercialRegistration?: string;
  phone?: string;
  email?: string;
  address?: string;
  streetName?: string;
  buildingNumber?: string;
  plotIdentification?: string;
  citySubdivisionName?: string;
  cityName?: string;
  postalZone?: string;
  countryCode?: string;
  otherIdType?: string;
  otherIdValue?: string;
  creditLimit: number;
  paymentTermsDays: number;
  currentBalance: number;
  glAccountId?: string;
  glAccountCode?: string;
  glAccountNameAr?: string;
  glAccountNameEn?: string;
  isActive: boolean;
  createdAtUtc?: string | Date;
}

export interface PartnerAgingBucketDto {
  partnerId: string;
  partnerCode: string;
  partnerNameAr: string;
  partnerNameEn?: string;
  partnerType: PartnerType;
  currentBucket: number;    // 0 - 30 days
  bucket31To60: number;     // 31 - 60 days
  bucket61To90: number;     // 61 - 90 days
  bucketOver90: number;     // 90+ days
  totalOutstanding: number;
}

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule, PaginationComponent, TranslatePipe],
  template: `
    <div class="partners-container" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Page Header -->
      <header *ngIf="!showStatementModal()" class="page-header no-print">
        <div class="header-title-box">
          <div class="icon-frame">
            <i class="pi pi-users"></i>
          </div>
          <div>
            <h1 class="page-title">
              {{ 'accounting.partners.ui.businessPartnersDebtAging' | translate }}
            </h1>
            <p class="page-subtitle">
              {{ 'accounting.partners.ui.partnersSubtitle' | translate }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-refresh" (click)="loadData()" [title]="'accounting.partners.ui.refresh' | translate">
            <i class="pi pi-refresh" [class.pi-spin]="isLoading()"></i>
            <span>{{ 'accounting.partners.ui.refresh' | translate }}</span>
          </button>
          <button type="button" class="btn-primary" (click)="openCreateModal()">
            <i class="pi pi-user-plus"></i>
            <span>{{ 'accounting.partners.ui.newPartner' | translate }}</span>
          </button>
        </div>
      </header>

      <!-- Main Navigation Tabs: Cards vs Aging Report -->
      <nav *ngIf="!showStatementModal()" class="view-tabs no-print">
        <button [class.active]="activeTab() === 'cards'" (click)="activeTab.set('cards')">
          <i class="pi pi-id-card"></i>
          <span>{{ 'accounting.partners.ui.partnerProfiles' | translate }}</span>
          <span class="tab-badge">{{ partners().length }}</span>
        </button>
        <button [class.active]="activeTab() === 'aging'" (click)="activeTab.set('aging')">
          <i class="pi pi-chart-bar"></i>
          <span>{{ 'accounting.partners.ui.debtAgingAnalysis' | translate }}</span>
          <span class="tab-badge warning" *ngIf="overdueDebtTotal() > 0">{{ overdueDebtTotal() | number:'1.0-0' }} SAR</span>
        </button>
      </nav>

      <!-- TAB 1: Partner Cards View -->
      <div *ngIf="!showStatementModal() && activeTab() === 'cards'" class="tab-content no-print">
        <!-- KPI Strip -->
        <section class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon-box cyan">
              <i class="pi pi-user"></i>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">{{ 'accounting.partners.ui.totalCustomers' | translate }}</span>
              <strong class="kpi-value">{{ customersCount() }}</strong>
              <span class="kpi-count">{{ totalReceivables() | number:'1.2-2' }} {{ 'ui.partners.d9a590' | translate }}</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-box amber">
              <i class="pi pi-truck"></i>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">{{ 'accounting.partners.ui.totalSuppliers' | translate }}</span>
              <strong class="kpi-value">{{ suppliersCount() }}</strong>
              <span class="kpi-count">{{ totalPayables() | number:'1.2-2' }} {{ 'ui.partners.f23a4e' | translate }}</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-box emerald">
              <i class="pi pi-shield"></i>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">{{ 'accounting.partners.ui.totalCreditLine' | translate }}</span>
              <strong class="kpi-value text-emerald">{{ totalCreditLimits() | number:'1.2-2' }} <small>SAR</small></strong>
              <span class="kpi-count">{{ 'ui.partners.a02144' | translate }}</span>
            </div>
          </div>
        </section>

        <!-- Search & Filter Bar -->
        <div class="filters-bar">
          <div class="type-pills">
            <button [class.active]="filterType() === null" (click)="filterType.set(null); currentPage.set(1)">
              {{ 'accounting.partners.ui.all' | translate }}
            </button>
            <button [class.active]="filterType() === PartnerType.Customer" (click)="filterType.set(PartnerType.Customer); currentPage.set(1)">
              <i class="pi pi-user"></i>
              {{ 'accounting.partners.ui.customers' | translate }}
            </button>
            <button [class.active]="filterType() === PartnerType.Supplier" (click)="filterType.set(PartnerType.Supplier); currentPage.set(1)">
              <i class="pi pi-truck"></i>
              {{ 'accounting.partners.ui.suppliers' | translate }}
            </button>
          </div>

          <div class="filter-actions">
            <button 
              type="button" 
              class="sort-toggle-btn" 
              [class.active]="sortOrder() === 'latest'"
              (click)="sortOrder.set(sortOrder() === 'latest' ? 'code' : 'latest'); currentPage.set(1)"
              [title]="sortOrder() === 'latest' ? ('accounting.partners.ui.latestAddedFirst' | translate) : ('accounting.partners.ui.byCode' | translate)">
              <i class="pi" [ngClass]="sortOrder() === 'latest' ? 'pi-sort-amount-down' : 'pi-sort-alpha-down'"></i>
              <span>{{ sortOrder() === 'latest' ? ('accounting.partners.ui.latestFirst' | translate) : ('accounting.partners.ui.byCode1' | translate) }}</span>
            </button>

            <input 
              type="text" 
              [placeholder]="'accounting.partners.ui.searchPartners' | translate" 
              class="search-input"
              [ngModel]="searchTerm()" 
              (ngModelChange)="searchTerm.set($event); currentPage.set(1)" />
          </div>
        </div>

        <!-- Partners Table -->
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ 'accounting.partners.ui.code' | translate }}</th>
                <th>{{ 'accounting.partners.ui.name' | translate }}</th>
                <th>{{ 'accounting.partners.ui.type' | translate }}</th>
                <th>{{ 'accounting.partners.ui.vatTax' | translate }}</th>
                <th>{{ 'accounting.partners.ui.nationalAddressZatca' | translate }}</th>
                <th>{{ 'accounting.partners.ui.phone' | translate }}</th>
                <th>{{ 'accounting.partners.ui.terms' | translate }}</th>
                <th>{{ 'accounting.partners.ui.creditLimit' | translate }}</th>
                <th>{{ 'accounting.partners.ui.currentBalance' | translate }}</th>
                <th>{{ 'accounting.partners.ui.statement' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="filteredPartners().length === 0">
                <td colspan="10" class="empty-state">
                  <i class="pi pi-users"></i>
                  <p>{{ 'accounting.partners.ui.noPartnersFound' | translate }}</p>
                </td>
              </tr>
              <tr *ngFor="let p of paginatedPartners()">
                <td><strong>{{ p.code }}</strong></td>
                <td>
                  <strong class="partner-name" [title]="langService.currentLang() === 'ar' ? p.nameAr : (p.nameEn || p.nameAr)">
                    {{ langService.currentLang() === 'ar' ? p.nameAr : (p.nameEn || p.nameAr) }}
                  </strong>
                </td>
                <td>
                  <span class="type-pill" [class.cust]="p.type === PartnerType.Customer" [class.supp]="p.type === PartnerType.Supplier">
                    <i class="pi" [ngClass]="p.type === PartnerType.Customer ? 'pi-user' : 'pi-truck'"></i>
                    {{ p.typeNameAr }}
                  </span>
                </td>
                <td>
                  <span *ngIf="p.taxNumber" class="font-code fw-semibold text-emerald">{{ p.taxNumber }}</span>
                  <span *ngIf="!p.taxNumber" class="text-muted">—</span>
                </td>
                <td>
                  <div *ngIf="p.buildingNumber && p.streetName" class="zatca-tag-wrap">
                    <span class="addr-snippet">{{ p.streetName }}{{ 'ui.partnerCreate.2e1a34' | translate }} {{ p.cityName || ('ui.projectsHub.ec7f24' | translate) }} ({{ p.buildingNumber }})</span>
                    <span class="badge-zatca-ok"><i class="pi pi-check"></i> {{ 'ui.partners.df9a8c' | translate }}</span>
                  </div>
                  <span *ngIf="!p.buildingNumber || !p.streetName" class="text-muted font-small">
                    {{ p.cityName || p.address || ('ui.partners.d422b4' | translate) }}
                  </span>
                </td>
                <td>{{ p.phone || '—' }}</td>
                <td>{{ p.paymentTermsDays }} {{ 'accounting.partners.ui.days' | translate }}</td>
                <td>{{ p.creditLimit | number:'1.2-2' }} SAR</td>
                <td class="balance-cell" [class.positive]="p.currentBalance > 0" [class.negative]="p.currentBalance < 0">
                  {{ p.currentBalance | number:'1.2-2' }} SAR
                </td>
                <td class="actions-col">
                  <button type="button" class="btn-statement-pill" (click)="openPartnerStatement(p)">
                    <i class="pi pi-file-text"></i>
                    <span>{{ 'accounting.partners.ui.statement1' | translate }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Table Pagination Bar -->
          <app-pagination
            *ngIf="!isLoading() && filteredPartners().length > 0"
            [totalItems]="filteredPartners().length"
            [pageSize]="pageSize()"
            [currentPage]="currentPage()"
            [pageSizeOptions]="[5, 10, 20, 50, 100]"
            [itemLabelAr]="('ui.partners.ac9ddf' | translate)"
            [itemLabelEn]="'partners'"
            (pageChange)="currentPage.set($event)"
            (pageSizeChange)="pageSize.set($event)">
          </app-pagination>
        </div>
      </div>

      <!-- TAB 2: Debt Aging Report (تقرير أعمار الديون) -->
      <div *ngIf="!showStatementModal() && activeTab() === 'aging'" class="tab-content no-print">
        <div class="table-card">
          <table class="data-table aging-table">
            <thead>
              <tr>
                <th>{{ 'accounting.partners.ui.code' | translate }}</th>
                <th>{{ 'accounting.partners.ui.partnerName' | translate }}</th>
                <th>{{ 'accounting.partners.ui.type' | translate }}</th>
                <th class="text-end">{{ 'accounting.partners.ui.current030d' | translate }}</th>
                <th class="text-end">{{ 'accounting.partners.ui.3160Days' | translate }}</th>
                <th class="text-end">{{ 'accounting.partners.ui.6190Days' | translate }}</th>
                <th class="text-end text-rose">{{ 'accounting.partners.ui.90Days' | translate }}</th>
                <th class="text-end fw-bold">{{ 'accounting.partners.ui.totalOutstanding' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="agingReport().length === 0">
                <td colspan="8" class="empty-state">
                  <i class="pi pi-check-circle"></i>
                  <p>{{ 'accounting.partners.ui.noOutstandingAgingBalances' | translate }}</p>
                </td>
              </tr>
              <tr *ngFor="let row of agingReport()">
                <td><strong>{{ row.partnerCode }}</strong></td>
                <td>
                  <strong class="partner-name" [title]="langService.currentLang() === 'ar' ? row.partnerNameAr : (row.partnerNameEn || row.partnerNameAr)">
                    {{ langService.currentLang() === 'ar' ? row.partnerNameAr : (row.partnerNameEn || row.partnerNameAr) }}
                  </strong>
                </td>
                <td>
                  <span class="type-pill" [class.cust]="row.partnerType === PartnerType.Customer" [class.supp]="row.partnerType === PartnerType.Supplier">
                    {{ row.partnerType === PartnerType.Customer ? ('accounting.partners.table.customer' | translate) : ('accounting.partners.table.supplier' | translate) }}
                  </span>
                </td>
                <td class="text-end text-emerald fw-semibold">{{ row.currentBucket | number:'1.2-2' }}</td>
                <td class="text-end text-amber fw-semibold">{{ row.bucket31To60 | number:'1.2-2' }}</td>
                <td class="text-end text-orange fw-semibold">{{ row.bucket61To90 | number:'1.2-2' }}</td>
                <td class="text-end text-rose fw-bold">{{ row.bucketOver90 | number:'1.2-2' }}</td>
                <td class="text-end total-cell">{{ row.totalOutstanding | number:'1.2-2' }} SAR</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Partner Account Statement Modal (كشف حساب الشريك التجاري الرسمي بهوية الربان) -->
      <div *ngIf="showStatementModal()" class="statement-modal-backdrop print-modal-backdrop" (click)="closePartnerStatementModal()">
        <div class="statement-modal-dialog print-preview-dialog" (click)="$event.stopPropagation()">
          <header class="stmt-modal-header no-print">
            <div class="header-left">
              <i class="pi pi-file-text text-emerald" style="font-size: 1.5rem;"></i>
              <div>
                <h3 class="stmt-title">
                  {{ 'accounting.partners.ui.accountStatement' | translate }}
                  <span class="text-emerald" *ngIf="selectedPartner()">— {{ selectedPartner()?.nameAr }}</span>
                </h3>
                <p class="stmt-sub">
                  {{ 'accounting.partners.ui.detailedAuditTrailOfInvoices' | translate }}
                </p>
              </div>
            </div>
            <div class="stmt-header-actions">
              <button type="button" class="btn-print-stmt" (click)="printPartnerStatement()" [disabled]="!partnerStatement()">
                <i class="pi pi-print me-1"></i>
                <span>{{ 'accounting.gl.printStatement' | translate }}</span>
              </button>
              <button type="button" class="btn-close-modal" (click)="closePartnerStatementModal()">✕</button>
            </div>
          </header>

          <div class="stmt-modal-body">
            <!-- Filter Bar -->
            <div class="stmt-filter-bar no-print">
              <div class="date-pickers">
                <div class="d-field">
                  <label>{{ 'accounting.gl.fromDate' | translate }}</label>
                  <input type="date" [ngModel]="statementFromDate()" (ngModelChange)="statementFromDate.set($event)" />
                </div>
                <div class="d-field">
                  <label>{{ 'accounting.gl.toDate' | translate }}</label>
                  <input type="date" [ngModel]="statementToDate()" (ngModelChange)="statementToDate.set($event)" />
                </div>
                <button type="button" class="btn-refresh-stmt" (click)="loadPartnerStatement()">
                  <i class="pi pi-refresh" [class.pi-spin]="isLoadingStatement()"></i>
                  <span>{{ 'common.refresh' | translate }}</span>
                </button>
              </div>

              <div class="stmt-presets">
                <button type="button" (click)="setStatementPreset('thisMonth')">{{ 'accounting.trialBalance.thisMonth' | translate }}</button>
                <button type="button" (click)="setStatementPreset('thisQuarter')">{{ 'accounting.trialBalance.thisQuarter' | translate }}</button>
                <button type="button" (click)="setStatementPreset('thisYear')">{{ 'accounting.financialSettings.years.yearNumber' | translate }}</button>
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="isLoadingStatement()" class="stmt-loading no-print">
              <i class="pi pi-spin pi-spinner text-emerald"></i>
              <span>{{ 'ui.partners.478738' | translate }}</span>
            </div>

            <!-- Official Al-Roban Printable A4 Statement Sheet -->
            <div *ngIf="!isLoadingStatement() && partnerStatement() as stmt" class="print-paper-container">
              <article class="official-statement-sheet" id="printable-partner-statement">

                <!-- 1. Official Corporate Header -->
                <header class="statement-print-header">
                  <div class="org-info">
                    <div class="org-brand-row">
                      <img *ngIf="companyContext.companyLogo() || companyContext.activeCompany().logoUrl"
                           [src]="companyContext.companyLogo() || companyContext.activeCompany().logoUrl"
                           alt="Logo"
                           class="org-logo-img" />
                      <div *ngIf="!(companyContext.companyLogo() || companyContext.activeCompany().logoUrl)" class="org-logo-fallback">
                        <i class="pi pi-compass"></i>
                      </div>
                      <div class="org-text-box">
                        <h2 class="org-name-ar">{{ companyContext.activeCompany().nameAr || 'شركة الربان للحلول الذكية' }}</h2>
                        <span class="org-name-en">{{ companyContext.activeCompany().nameEn || 'Al-Roban Smart Solutions Co.' }}</span>
                        <div class="org-tax-row">
                          <span>{{ 'pos.receipt.vatLabel' | translate }} <strong class="font-code">{{ companyContext.activeCompany().vatNumber || '310123456700003' }}</strong></span>
                          <span class="dot">&bull;</span>
                          <span>{{ 'accounting.journal.ui.cr' | translate }} <strong class="font-code">{{ companyContext.activeCompany().commercialRegistration || '1010789456' }}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="center-title-box">
                    <h1 class="statement-main-title">
                      {{ stmt.partnerType === 2 ? (langService.currentLang() === 'ar' ? 'كشف حساب مورد تفصيلي' : 'Vendor Statement of Account') : (langService.currentLang() === 'ar' ? 'كشف حساب عميل تفصيلي' : 'Customer Statement of Account') }}
                    </h1>
                    <span class="statement-sub-title">
                      {{ stmt.partnerType === 2 ? 'VENDOR STATEMENT OF ACCOUNT (AP SUB-LEDGER)' : 'CUSTOMER STATEMENT OF ACCOUNT (AR SUB-LEDGER)' }}
                    </span>
                  </div>

                  <div class="left-seal-box">
                    <div class="seal-frame">
                      <svg width="64" height="64" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="30" cy="30" r="28" stroke="#047857" stroke-width="2" stroke-dasharray="4 2"/>
                        <circle cx="30" cy="30" r="23" stroke="#047857" stroke-width="1"/>
                        <path d="M30 13L34 22H26L30 13Z" fill="#047857"/>
                        <text x="30" y="33" font-size="6.2" font-weight="bold" fill="#047857" text-anchor="middle">ختم رسمي معتمد</text>
                        <text x="30" y="42" font-size="4.8" fill="#64748B" text-anchor="middle">مستند مالي رسمي</text>
                      </svg>
                    </div>
                  </div>
                </header>

                <!-- 2. Structured Partner & Period Meta Grid (6 Cells) -->
                <section class="statement-meta-box">
                  <div class="meta-cell">
                    <span class="m-lbl">{{ langService.currentLang() === 'ar' ? 'كود الشريك التجاري' : 'Partner Code' }}</span>
                    <strong class="m-val font-code text-emerald">{{ stmt.partnerCode || '—' }}</strong>
                  </div>

                  <div class="meta-cell">
                    <span class="m-lbl">{{ stmt.partnerType === 2 ? (langService.currentLang() === 'ar' ? 'اسم المورد المعتمد' : 'Supplier Name') : (langService.currentLang() === 'ar' ? 'اسم العميل' : 'Customer Name') }}</span>
                    <strong class="m-val">
                      {{ stmt.partnerNameAr }}
                      <small *ngIf="stmt.partnerNameEn" class="meta-en-sub">({{ stmt.partnerNameEn }})</small>
                    </strong>
                  </div>

                  <div class="meta-cell">
                    <span class="m-lbl">{{ langService.currentLang() === 'ar' ? 'الرقم الضريبي للشريك (VAT)' : 'Partner VAT Number' }}</span>
                    <strong class="m-val font-code">{{ stmt.taxNumber || '—' }}</strong>
                  </div>

                  <div class="meta-cell">
                    <span class="m-lbl">{{ langService.currentLang() === 'ar' ? 'الهاتف والعنوان الوطني' : 'Phone & Address' }}</span>
                    <strong class="m-val">{{ stmt.phone || '—' }} <span *ngIf="stmt.address" class="text-muted">&bull; {{ stmt.address }}</span></strong>
                  </div>

                  <div class="meta-cell">
                    <span class="m-lbl">{{ langService.currentLang() === 'ar' ? 'فترة كشف الحساب' : 'Statement Period' }}</span>
                    <strong class="m-val font-code">{{ stmt.fromDate | date:'yyyy/MM/dd' }} — {{ stmt.toDate | date:'yyyy/MM/dd' }}</strong>
                  </div>

                  <div class="meta-cell">
                    <span class="m-lbl">{{ langService.currentLang() === 'ar' ? 'تاريخ الإصدار والطباعة' : 'Issue Date & Time' }}</span>
                    <strong class="m-val font-code">{{ currentPrintDate | date:'yyyy/MM/dd HH:mm' }}</strong>
                  </div>
                </section>

                <!-- 3. 4-Box Balances Summary Strip -->
                <section class="statement-balances-summary">
                  <div class="summary-box">
                    <span class="s-lbl">{{ 'invoices.statementModal.openingBalance' | translate }}</span>
                    <strong class="s-val font-code">{{ stmt.openingBalance | number:'1.2-2' }} <small>SAR</small></strong>
                  </div>

                  <div class="summary-box">
                    <span class="s-lbl text-rose">{{ stmt.partnerType === 2 ? (langService.currentLang() === 'ar' ? 'إجمالي المسدد للمورد (مدين)' : 'Total Paid (Debit)') : ('ui.partners.d13982' | translate) }}</span>
                    <strong class="s-val font-code text-rose">{{ stmt.totalDebit | number:'1.2-2' }} <small>SAR</small></strong>
                  </div>

                  <div class="summary-box">
                    <span class="s-lbl text-emerald">{{ stmt.partnerType === 2 ? (langService.currentLang() === 'ar' ? 'إجمالي فواتير المشتريات (دائن)' : 'Total Purchase Invoices (Credit)') : ('ui.partners.ec0365' | translate) }}</span>
                    <strong class="s-val font-code text-emerald">{{ stmt.totalCredit | number:'1.2-2' }} <small>SAR</small></strong>
                  </div>

                  <div class="summary-box highlight-closing">
                    <span class="s-lbl">{{ 'ui.partners.5ae2ae' | translate }}</span>
                    <strong class="s-val font-code" [class.text-amber]="stmt.closingBalance > 0" [class.text-emerald-dark]="stmt.closingBalance <= 0">
                      {{ stmt.closingBalance | number:'1.2-2' }} <small>SAR</small>
                    </strong>
                  </div>
                </section>

                <!-- 4. Official Transactions Print Table -->
                <section class="statement-print-table-section">
                  <table class="statement-print-table">
                    <thead>
                      <tr>
                        <th class="col-idx">#</th>
                        <th class="col-date">{{ 'accounting.journal.table.date' | translate }}</th>
                        <th class="col-type">{{ 'ui.stockAdjustments.2579ea' | translate }}</th>
                        <th class="col-ref">{{ 'ui.partners.e56dcc' | translate }}</th>
                        <th class="col-desc">{{ 'ui.partners.f99ddd' | translate }}</th>
                        <th class="col-amt text-end">{{ 'ui.partners.3cb9ad' | translate }}</th>
                        <th class="col-amt text-end">{{ 'ui.partners.b885ef' | translate }}</th>
                        <th class="col-bal text-end">{{ 'accounting.coa.table.balance' | translate }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="row-print-opening">
                        <td class="text-center font-code">0</td>
                        <td class="text-center font-code">{{ stmt.fromDate | date:'yyyy/MM/dd' }}</td>
                        <td class="text-center">—</td>
                        <td class="text-center font-code">—</td>
                        <td><strong>{{ 'ui.partners.6d92dd' | translate }}</strong></td>
                        <td class="text-end font-code">—</td>
                        <td class="text-end font-code">—</td>
                        <td class="text-end font-code fw-bold">{{ stmt.openingBalance | number:'1.2-2' }}</td>
                      </tr>

                      <tr *ngIf="stmt.lines.length === 0">
                        <td colspan="8" class="text-center py-4 text-muted">
                          {{ 'ui.partners.b3c77d' | translate }}
                        </td>
                      </tr>

                      <tr *ngFor="let l of stmt.lines; let idx = index" [class.row-payment]="l.credit > 0">
                        <td class="text-center font-code">{{ idx + 1 }}</td>
                        <td class="text-center font-code">{{ l.date | date:'yyyy/MM/dd' }}</td>
                        <td class="text-center">
                          <span class="stmt-tag" [class.inv]="l.debit > 0" [class.rec]="l.credit > 0">
                            {{ l.documentType }}
                          </span>
                        </td>
                        <td class="text-center font-code fw-bold">{{ l.documentNumber }}</td>
                        <td class="desc-cell">{{ l.description }}</td>
                        <td class="text-end font-code text-rose" [class.fw-bold]="l.debit > 0">
                          {{ l.debit > 0 ? (l.debit | number:'1.2-2') : '—' }}
                        </td>
                        <td class="text-end font-code text-emerald" [class.fw-bold]="l.credit > 0">
                          {{ l.credit > 0 ? (l.credit | number:'1.2-2') : '—' }}
                        </td>
                        <td class="text-end font-code fw-bold" [class.text-amber]="l.balance > 0">
                          {{ l.balance | number:'1.2-2' }}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr class="totals-row">
                        <td colspan="5" class="text-end fw-bold">
                          {{ langService.currentLang() === 'ar' ? 'إجمالي الحركات والرصيد الختامي المستحق (SAR):' : 'Total Movements & Closing Balance (SAR):' }}
                        </td>
                        <td class="text-end font-code fw-bold text-rose">{{ stmt.totalDebit | number:'1.2-2' }}</td>
                        <td class="text-end font-code fw-bold text-emerald">{{ stmt.totalCredit | number:'1.2-2' }}</td>
                        <td class="text-end font-code fw-bold">{{ stmt.closingBalance | number:'1.2-2' }} SAR</td>
                      </tr>
                    </tfoot>
                  </table>
                </section>

                <!-- 5. Arabic Tafqeet Box -->
                <section class="statement-tafqeet-box">
                  <div class="tafqeet-card">
                    <span class="tafqeet-label">
                      <i class="pi pi-check-circle text-emerald"></i>
                      <span>{{ langService.currentLang() === 'ar' ? 'الرصيد الختامي بالحروف (التفقيط):' : 'Closing Balance in Words:' }}</span>
                    </span>
                    <span class="tafqeet-text fw-bold">
                      {{ getStatementTafqeet(stmt.closingBalance) }}
                    </span>
                  </div>
                </section>

                <!-- 6. Tripartite Signatures Matrix -->
                <section class="statement-signatures-matrix">
                  <div class="signature-box">
                    <span class="sig-header">{{ 'ui.partners.cc7bba' | translate }}</span>
                    <div class="sig-content">
                      <span class="sig-name">{{ langService.currentLang() === 'ar' ? 'قسم المحاسبة المالية' : 'Financial Accounting Dept.' }}</span>
                      <div class="sig-line">{{ langService.currentLang() === 'ar' ? 'التوقيع: ........................................' : 'Signature: ..............................' }}</div>
                      <span class="sig-date font-code">{{ langService.currentLang() === 'ar' ? 'التاريخ:' : 'Date:' }} {{ currentPrintDate | date:'yyyy/MM/dd' }}</span>
                    </div>
                  </div>

                  <div class="signature-box">
                    <span class="sig-header">{{ 'ui.partners.c083b0' | translate }}</span>
                    <div class="sig-content">
                      <span class="sig-name">{{ langService.currentLang() === 'ar' ? 'المدير المالي (CFO) — المراجعة والتدقيق' : 'Chief Financial Officer (CFO)' }}</span>
                      <div class="sig-line">{{ langService.currentLang() === 'ar' ? 'التوقيع: ........................................' : 'Signature: ..............................' }}</div>
                      <span class="sig-date font-code">{{ langService.currentLang() === 'ar' ? 'التاريخ:' : 'Date:' }} {{ currentPrintDate | date:'yyyy/MM/dd' }}</span>
                    </div>
                  </div>

                  <div class="signature-box approved">
                    <span class="sig-header">{{ stmt.partnerType === 2 ? (langService.currentLang() === 'ar' ? 'مصادقة المورد على صحة الرصيد' : 'Supplier Balance Confirmation') : (langService.currentLang() === 'ar' ? 'مصادقة العميل على صحة الرصيد' : 'Customer Balance Confirmation') }}</span>
                    <div class="sig-content">
                      <span class="sig-name">{{ stmt.partnerNameAr }}</span>
                      <div class="sig-line">{{ langService.currentLang() === 'ar' ? 'التوقيع والختم الرسمي للمصادقة' : 'Official Stamp & Signature' }}</div>
                      <span class="sig-date font-code">{{ langService.currentLang() === 'ar' ? 'التاريخ: .... / .... / 2026 م' : 'Date: .... / .... / 2026' }}</span>
                    </div>
                  </div>
                </section>


              </article>
            </div>
          </div>

          <footer class="stmt-modal-footer no-print">
            <button type="button" class="btn-secondary" (click)="closePartnerStatementModal()">{{ 'common.close' | translate }}</button>
            <button type="button" class="btn-print-stmt" (click)="printPartnerStatement()" [disabled]="!partnerStatement()">
              <i class="pi pi-print me-1"></i>
              <span>{{ 'accounting.gl.printStatement' | translate }}</span>
            </button>
          </footer>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .partners-container {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: var(--font-arabic) !important;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      padding: 1.25rem 1.5rem;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    }

    .header-title-box {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .icon-frame {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .page-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
    }

    .page-subtitle {
      font-size: 0.8rem;
      color: #64748B;
      margin: 0.2rem 0 0 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 9px;
      padding: 0.55rem 1.25rem;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
      }
    }

    .btn-refresh {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      border-radius: 9px;
      padding: 0.55rem 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;

      &:hover {
        background: #F1F5F9;
        color: #0F172A;
      }
    }

    /* Tabs */
    .view-tabs {
      display: flex;
      gap: 0.65rem;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 0.25rem;

      button {
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -0.35rem;
        padding: 0.6rem 1.15rem;
        font-size: 0.88rem;
        font-weight: 700;
        color: #64748B;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s ease;

        &.active {
          color: #059669;
          border-bottom-color: #059669;

          .tab-badge {
            background: #ECFDF5;
            color: #059669;
          }
        }
      }
    }

    .tab-badge {
      font-size: 0.68rem;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      background: #F1F5F9;
      color: #64748B;

      &.warning {
        background: #FEF3C7;
        color: #B45309;
        font-weight: 800;
      }
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }

    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 1.15rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
    }

    .kpi-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;

      &.cyan { background: #E0F2FE; color: #0284C7; }
      &.amber { background: #FEF3C7; color: #D97706; }
      &.emerald { background: #ECFDF5; color: #059669; }
    }

    .kpi-details {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .kpi-label {
      font-size: 0.74rem;
      color: #64748B;
      font-weight: 600;
    }

    .kpi-value {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0F172A;
    }

    .kpi-count {
      font-size: 0.7rem;
      color: #94A3B8;
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      background: #FFFFFF;
      padding: 0.85rem 1.25rem;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
    }

    .type-pills {
      display: flex;
      gap: 0.5rem;

      button {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        padding: 0.4rem 0.85rem;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: all 0.2s ease;

        &.active {
          background: #ECFDF5;
          border-color: #10B981;
          color: #059669;
          font-weight: 750;
        }
      }
    }

    .filter-actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .sort-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s ease;

      i {
        font-size: 0.85rem;
        color: #059669;
      }

      &.active {
        background: #ECFDF5;
        border-color: #10B981;
        color: #065F46;
      }

      &:hover {
        background: #E2E8F0;
      }
    }

    .search-input {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.82rem;
      color: #1E293B;
      outline: none;
      min-width: 280px;

      &:focus {
        border-color: #10B981;
        background: #FFFFFF;
      }
    }

    /* Table */
    .table-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        background: #F8FAFC;
        padding: 0.85rem 1rem;
        font-size: 0.78rem;
        font-weight: 750;
        color: #475569;
        border-bottom: 1px solid #E2E8F0;
      }

      td {
        padding: 0.85rem 1rem;
        font-size: 0.82rem;
        color: #334155;
        border-bottom: 1px solid #F1F5F9;
      }

      tr:hover td {
        background: #F8FAFC;
      }
    }

    .partner-name-wrap {
      display: flex;
      flex-direction: column;

      .name-ar { font-weight: 700; color: #0F172A; }
      .name-en { font-size: 0.72rem; color: #94A3B8; }
    }

    .type-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;

      &.cust { background: #E0F2FE; color: #0284C7; }
      &.supp { background: #FEF3C7; color: #D97706; }
    }

    .balance-cell {
      font-weight: 800;

      &.positive { color: #0284C7; }
      &.negative { color: #D97706; }
    }

    /* Aging Banner */
    .aging-banner {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 10px;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      color: #065F46;

      i { font-size: 1.25rem; margin-top: 0.15rem; color: #059669; }
      strong { font-size: 0.85rem; font-weight: 750; }
      p { margin: 0.2rem 0 0 0; font-size: 0.78rem; color: #047857; }
    }

    .text-emerald { color: #059669; }
    .text-amber { color: #D97706; }
    .text-orange { color: #EA580C; }
    .text-rose { color: #E11D48; }

    .total-cell {
      font-weight: 800;
      color: #0F172A;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #94A3B8;

      i { font-size: 2.5rem; margin-bottom: 0.5rem; }
      p { font-size: 0.88rem; margin: 0; }
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-box {
      background: #FFFFFF;
      border-radius: 14px;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 1.5rem;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;

      h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        color: #059669;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .close-btn {
        background: transparent;
        border: none;
        font-size: 1.5rem;
        color: #64748B;
        cursor: pointer;
      }
    }

    .modal-form {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      label {
        font-size: 0.78rem;
        font-weight: 700;
        color: #334155;
      }
    }

    .form-control {
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      outline: none;

      &:focus {
        border-color: #10B981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .btn-submit {
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.55rem 1.25rem;
      font-weight: 750;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .zatca-tag-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;

      .addr-snippet {
        font-size: 0.735rem;
        color: #334155;
      }

      .badge-zatca-ok {
        align-self: flex-start;
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
        font-size: 0.65rem;
        font-weight: 750;
        padding: 0.05rem 0.4rem;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;

        i { font-size: 0.65rem; }
      }
    }

    .btn-statement-pill {
      background: #f0fdf4;
      color: #059669;
      border: 1px solid #a7f3d0;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s;

      &:hover {
        background: #059669;
        color: #ffffff;
        border-color: #059669;
        transform: scale(1.03);
      }
    }

    /* Modal Backdrop & Dialog */
    .statement-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .statement-modal-dialog {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 950px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .stmt-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;

      .header-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .stmt-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .stmt-sub {
          font-size: 0.76rem;
          color: #64748b;
          margin: 0.15rem 0 0 0;
        }
      }

      .btn-close-modal {
        background: transparent;
        border: none;
        font-size: 1.25rem;
        color: #64748b;
        cursor: pointer;
        &:hover { color: #0f172a; }
      }
    }

    .stmt-modal-body {
      padding: 1.25rem;
      overflow-y: auto;
      flex: 1;
    }

    .stmt-filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      background: #f8fafc;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 1rem;

      .date-pickers {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;

        .d-field {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;

          input {
            padding: 0.3rem 0.5rem;
            font-size: 0.78rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
          }
        }

        .btn-refresh-stmt {
          background: #059669;
          color: #ffffff;
          border: none;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          &:hover { background: #047857; }
        }
      }

      .stmt-presets {
        display: flex;
        gap: 0.35rem;

        button {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          &:hover { background: #f1f5f9; }
        }
      }
    }

    .stmt-vat-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.65rem 0.9rem;
      border-radius: 8px;
      font-size: 0.78rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stmt-header-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;

      .btn-print-stmt {
        background: #059669;
        color: #ffffff;
        border: none;
        padding: 0.45rem 1rem;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        &:hover { background: #047857; }
      }
    }

    /* Official Al-Roban Statement Sheet Styles */
    .print-paper-container {
      display: flex;
      justify-content: center;
      background: #f1f5f9;
      padding: 1rem;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }

    .official-statement-sheet {
      width: 100%;
      max-width: 210mm;
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12);
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10mm 12mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .statement-print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.85rem;
      border-bottom: 2.5px solid #047857;
      margin-bottom: 0.85rem;
      gap: 0.75rem;
    }

    .org-info {
      flex: 1.15;
    }

    .org-brand-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .org-logo-img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 2px;
      background: #fff;
    }

    .org-logo-fallback {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, #065f46, #059669);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }

    .org-text-box {
      display: flex;
      flex-direction: column;
    }

    .org-name-ar {
      font-size: 1.05rem;
      font-weight: 800;
      color: #065F46;
      margin: 0;
      line-height: 1.25;
    }

    .org-name-en {
      font-size: 0.72rem;
      color: #64748B;
      font-weight: 600;
      display: block;
    }

    .org-tax-row {
      font-size: 0.68rem;
      color: #475569;
      margin-top: 0.2rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .center-title-box {
      flex: 1.45;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .statement-main-title {
      font-size: 1.25rem;
      font-weight: 900;
      color: #0F172A;
      margin: 0;
    }

    .statement-sub-title {
      font-size: 0.68rem;
      color: #047857;
      font-weight: 800;
      margin-top: 0.15rem;
      letter-spacing: 0.4px;
    }

    .standard-cert-badge {
      font-size: 0.62rem;
      color: #64748B;
      font-weight: 600;
      margin-top: 0.2rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.12rem 0.55rem;
      border-radius: 999px;
    }

    .left-seal-box {
      flex: 0.7;
      display: flex;
      justify-content: flex-end;
    }

    /* 2. Statement Meta Box (6 Cells) */
    .statement-meta-box {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem 0.75rem;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.6rem 0.85rem;
      margin-bottom: 0.75rem;
    }

    .meta-cell {
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
    }

    .m-lbl {
      font-size: 0.65rem;
      color: #64748B;
      font-weight: 700;
    }

    .m-val {
      font-size: 0.78rem;
      color: #0F172A;
      font-weight: 800;
    }

    .meta-en-sub {
      font-size: 0.68rem;
      color: #64748b;
      font-weight: 600;
      margin-right: 0.25rem;
    }

    /* 3. Balances Summary (4 Boxes) */
    .statement-balances-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      margin-bottom: 0.85rem;
    }

    .summary-box {
      background: #FAFAFA;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.5rem 0.65rem;
      display: flex;
      flex-direction: column;
      text-align: center;
      gap: 0.18rem;
    }

    .summary-box.highlight-closing {
      background: #ECFDF5;
      border: 1.5px solid #047857;
    }

    .s-lbl {
      font-size: 0.66rem;
      font-weight: 700;
      color: #475569;
    }

    .s-val {
      font-size: 0.95rem;
      font-weight: 900;
      color: #0F172A;
      small { font-size: 0.68rem; font-weight: 700; }
    }

    .text-emerald-dark { color: #065F46 !important; }

    /* 4. Official Transactions Print Table */
    .statement-print-table-section {
      margin-bottom: 0.8rem;
    }

    .statement-print-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 0.75rem;

      th {
        background: #065F46 !important;
        color: #FFFFFF !important;
        padding: 0.48rem 0.5rem;
        font-weight: 700;
        border: 1px solid #065F46;
        text-align: right;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      th.col-idx { width: 34px; text-align: center; }
      th.col-date { width: 84px; text-align: center; }
      th.col-type { width: 96px; text-align: center; }
      th.col-ref { width: 105px; text-align: center; }
      th.col-desc { width: auto; text-align: right; }
      th.col-amt { width: 90px; text-align: left; }
      th.col-bal { width: 98px; text-align: left; }

      td {
        padding: 0.42rem 0.5rem;
        border: 1px solid #CBD5E1;
        color: #1E293B;
        vertical-align: middle;
        word-wrap: break-word;
      }

      td.desc-cell {
        line-height: 1.4;
        font-weight: 600;
        color: #0f172a;
      }

      .row-print-opening td {
        background: #F8FAFC !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .totals-row td {
        background: #ECFDF5 !important;
        border-top: 2px solid #047857 !important;
        font-weight: 800;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .stmt-tag {
        display: inline-block;
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
        font-size: 0.68rem;
        font-weight: 700;
        white-space: nowrap;
        &.inv { background: #e0f2fe !important; color: #0369a1 !important; }
        &.rec { background: #dcfce7 !important; color: #15803d !important; }
      }
    }

    /* 5. Tafqeet Box */
    .statement-tafqeet-box {
      margin-bottom: 0.85rem;
    }

    .tafqeet-card {
      background: #F8FAFC;
      border: 1px dashed #047857;
      border-radius: 6px;
      padding: 0.45rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.78rem;
    }

    .tafqeet-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #475569;
      font-weight: 700;
      white-space: nowrap;
    }

    .tafqeet-text {
      color: #065F46;
    }

    /* 6. Tripartite Signatures Matrix */
    .statement-signatures-matrix {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-top: 0.35rem;
      margin-bottom: 0.85rem;
    }

    .signature-box {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.55rem 0.65rem;
      background: #FAFAFA;
      display: flex;
      flex-direction: column;
      text-align: center;
    }

    .signature-box.approved {
      border-color: #A7F3D0;
      background: #F0FDF4;
    }

    .sig-header {
      font-size: 0.7rem;
      font-weight: 800;
      color: #475569;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 0.3rem;
      margin-bottom: 0.4rem;
    }

    .signature-box.approved .sig-header {
      color: #065F46;
      border-color: #BBF7D0;
    }

    .sig-content {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .sig-name {
      font-size: 0.75rem;
      font-weight: 700;
      color: #0F172A;
    }

    .sig-line {
      font-size: 0.66rem;
      color: #64748B;
      margin-top: 0.35rem;
    }

    .sig-date {
      font-size: 0.64rem;
      color: #64748B;
    }

    /* 7. Compliance Footer */
    .statement-compliance-footer {
      margin-top: auto;
      padding-top: 0.55rem;
      border-top: 1px solid #CBD5E1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.64rem;
      color: #64748B;
      gap: 0.5rem;
    }

    .compliance-left { display: flex; align-items: center; gap: 0.35rem; flex: 1.3; }
    .compliance-center { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .page-number-box {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #F0FDF4;
      border: 1px solid #A7F3D0;
      border-radius: 999px;
      padding: 0.12rem 0.6rem;
      font-size: 0.64rem;
      font-weight: 700;
      color: #065F46;
    }
    .compliance-right { text-align: left; flex: 1; font-weight: 700; color: #475569; }

    .stmt-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;

      .btn-secondary {
        background: #e2e8f0;
        color: #334155;
        border: none;
        padding: 0.5rem 1.25rem;
        border-radius: 6px;
        font-weight: 700;
        cursor: pointer;
        &:hover { background: #cbd5e1; }
      }

      .btn-print-stmt {
        background: #059669;
        color: #ffffff;
        border: none;
        padding: 0.5rem 1.25rem;
        border-radius: 6px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        &:hover { background: #047857; }
      }
    }

    @media screen and (max-width: 768px) {
      .partners-container {
        padding: 0.65rem 0.5rem 1.5rem 0.5rem;
        gap: 0.85rem;
      }

      .page-header {
        flex-direction: column;
        align-items: stretch;
        padding: 0.9rem 0.85rem;
        gap: 0.75rem;
      }

      .kpi-grid {
        grid-template-columns: 1fr;
        gap: 0.6rem;
      }

      .statement-print-header {
        flex-direction: column;
        text-align: center;
      }

      .statement-meta-box {
        grid-template-columns: 1fr 1fr;
      }

      .statement-balances-summary {
        grid-template-columns: 1fr 1fr;
      }

      .statement-signatures-matrix {
        grid-template-columns: 1fr;
      }
    }

    @page {
      size: A4 portrait;
      margin: 8mm 10mm 10mm 10mm;
    }

    @media print {
      .no-print, .page-header, .view-tabs, .tab-content, .stmt-modal-header, .stmt-filter-bar, .stmt-vat-box, .stmt-modal-footer, .btn-close-modal {
        display: none !important;
      }

      .partners-container {
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
        background: #FFFFFF !important;
      }

      .statement-modal-backdrop {
        position: static !important;
        background: #FFFFFF !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .statement-modal-dialog {
        box-shadow: none !important;
        border: none !important;
        width: 100% !important;
        max-width: 100% !important;
        max-height: none !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .stmt-modal-body {
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
        max-height: none !important;
      }

      .print-paper-container {
        padding: 0 !important;
        margin: 0 !important;
        background: #FFFFFF !important;
        border: none !important;
        box-shadow: none !important;
      }

      .official-statement-sheet {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .statement-print-header {
        display: flex !important;
        flex-direction: row !important;
        justify-content: space-between !important;
        align-items: center !important;
      }

      .statement-meta-box {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
      }

      .statement-balances-summary {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
      }

      .statement-print-table {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      .statement-print-table thead {
        display: table-header-group !important;
      }

      .statement-print-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .statement-tafqeet-box, .statement-signatures-matrix, .statement-compliance-footer {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .statement-signatures-matrix {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `]
})
export class PartnersComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  langService = inject(LanguageService);
  companyContext = inject(CompanyContextService);
  tafqeet = inject(TafqeetService);
  currentPrintDate = new Date();

  activeTab = signal<'cards' | 'aging'>('cards');
  partners = signal<BusinessPartnerDto[]>([]);
  agingReport = signal<PartnerAgingBucketDto[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);

  filterType = signal<PartnerType | null>(null);
  searchTerm = signal<string>('');

  PartnerType = PartnerType;

  newPartnerForm = {
    code: '',
    nameAr: '',
    nameEn: '',
    type: PartnerType.Customer,
    taxNumber: '',
    commercialRegistration: '',
    phone: '',
    email: '',
    creditLimit: 50000,
    paymentTermsDays: 30
  };

  // KPIs
  customersCount = computed(() => this.partners().filter(p => p.type === PartnerType.Customer || p.type === PartnerType.Both).length);
  suppliersCount = computed(() => this.partners().filter(p => p.type === PartnerType.Supplier || p.type === PartnerType.Both).length);
  totalCreditLimits = computed(() => this.partners().reduce((s, p) => s + (p.creditLimit || 0), 0));
  totalReceivables = computed(() => this.partners().filter(p => p.currentBalance > 0).reduce((s, p) => s + p.currentBalance, 0));
  totalPayables = computed(() => this.partners().filter(p => p.currentBalance < 0).reduce((s, p) => s + Math.abs(p.currentBalance), 0));
  overdueDebtTotal = computed(() => this.agingReport().reduce((s, r) => s + r.bucket31To60 + r.bucket61To90 + r.bucketOver90, 0));

  // Pagination & Sorting: Default is 'latest' (المضاف أخيراً يظهر أولاً)
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  sortOrder = signal<'latest' | 'code'>('latest');

  filteredPartners = computed(() => {
    const term = (this.searchTerm() || '').toLowerCase().trim();
    const fType = this.filterType();
    const order = this.sortOrder();

    return this.partners()
      .filter(p => {
        if (fType !== null && p.type !== fType && p.type !== PartnerType.Both) return false;
        if (term) {
          return (p.code || '').toLowerCase().includes(term) ||
                 (p.nameAr || '').toLowerCase().includes(term) ||
                 (p.taxNumber || '').toLowerCase().includes(term) ||
                 (p.phone || '').toLowerCase().includes(term);
        }
        return true;
      })
      .sort((a, b) => {
        if (order === 'latest') {
          // المضاف أخيراً يظهر أولاً (الأحدث حسب تاريخ الإنشاء ثم الكود)
          const timeA = a.createdAtUtc ? new Date(a.createdAtUtc).getTime() : 0;
          const timeB = b.createdAtUtc ? new Date(b.createdAtUtc).getTime() : 0;
          if (timeB !== timeA) {
            return timeB - timeA;
          }
          return (b.code || '').localeCompare(a.code || '');
        } else {
          return (a.code || '').localeCompare(b.code || '');
        }
      });
  });

  paginatedPartners = computed(() => {
    const list = this.filteredPartners();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'aging') {
        this.activeTab.set('aging');
      } else {
        this.activeTab.set('cards');
      }

      if (params['filter'] === 'customers' || params['type'] === '1' || params['type'] === 'customer') {
        this.filterType.set(PartnerType.Customer);
      } else if (params['filter'] === 'suppliers' || params['type'] === '2' || params['type'] === 'supplier') {
        this.filterType.set(PartnerType.Supplier);
      }
    });
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/api/partners`).subscribe({
      next: (res) => {
        const mapped = (res || []).map((p: any) => ({
          ...p,
          type: p.partnerType !== undefined ? p.partnerType : p.type,
          typeNameAr: (p.partnerType ?? p.type) === PartnerType.Customer ? 'عميل' : ((p.partnerType ?? p.type) === PartnerType.Supplier ? 'مورد' : 'عميل ومورد')
        }));
        this.partners.set(mapped);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.http.get<any[]>(`${environment.apiUrl}/api/partners/aging`).subscribe({
      next: (res) => {
        const mapped: PartnerAgingBucketDto[] = (res || []).map((r: any) => ({
          partnerId: r.partnerId,
          partnerCode: r.code || r.partnerCode || '',
          partnerNameAr: r.nameAr || r.partnerNameAr || '',
          partnerNameEn: r.nameEn || r.partnerNameEn || '',
          partnerType: r.partnerType,
          currentBucket: Number(r.current0To30 ?? r.currentBucket ?? 0),
          bucket31To60: Number(r.overdue31To60 ?? r.bucket31To60 ?? 0),
          bucket61To90: Number(r.overdue61To90 ?? r.bucket61To90 ?? 0),
          bucketOver90: Number(r.overdueAbove90 ?? r.bucketOver90 ?? 0),
          totalOutstanding: Number(r.totalBalance ?? r.totalOutstanding ?? 0)
        }));
        this.agingReport.set(mapped);
      },
      error: () => {}
    });
  }

  openCreateModal() {
    this.router.navigate(['/accounting/partners/create']);
  }

  submitCreatePartner() {
    if (!this.newPartnerForm.code || !this.newPartnerForm.nameAr) {
      Swal.fire({ icon: 'warning', title: this.langService.t('accounting.partners.alerts.incompleteDataTitle'), text: this.langService.t('accounting.partners.alerts.requiredCodeAndName') });
      return;
    }

    this.isSubmitting.set(true);
    this.http.post(`${environment.apiUrl}/api/partners`, this.newPartnerForm).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showCreateModal.set(false);
        Swal.fire({ icon: 'success', title: this.langService.t('accounting.partners.alerts.savedSuccessTitle'), text: this.langService.t('accounting.partners.alerts.savedSuccessText') });
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 401) {
          return;
        }
        Swal.fire({ icon: 'error', title: this.langService.t('accounting.partners.alerts.saveErrorTitle'), text: err?.error?.description || this.langService.t('accounting.partners.alerts.saveErrorDefault') });
      }
    });
  }

  // --- Statement Actions (كشف الحساب) ---
  showStatementModal = signal<boolean>(false);
  selectedPartner = signal<BusinessPartnerDto | null>(null);
  partnerStatement = signal<any | null>(null);
  isLoadingStatement = signal<boolean>(false);
  statementFromDate = signal<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().substring(0, 10));
  statementToDate = signal<string>(new Date().toISOString().substring(0, 10));

  openPartnerStatement(partner: BusinessPartnerDto) {
    this.currentPrintDate = new Date();
    this.selectedPartner.set(partner);
    this.showStatementModal.set(true);
    this.loadPartnerStatement();
  }

  loadPartnerStatement() {
    const p = this.selectedPartner();
    if (!p) return;
    this.isLoadingStatement.set(true);
    const from = this.statementFromDate();
    const to = this.statementToDate();

    this.http.get<any>(`${environment.apiUrl}/api/partners/${p.id}/statement?fromDate=${from}&toDate=${to}`).subscribe({
      next: (res) => {
        this.partnerStatement.set(res);
        this.isLoadingStatement.set(false);
      },
      error: () => {
        this.isLoadingStatement.set(false);
        Swal.fire({
          icon: 'info',
          title: this.langService.t('accounting.partners.alerts.statementTitle'),
          text: this.langService.t('accounting.partners.alerts.noStatementEntries'),
          confirmButtonColor: '#059669'
        });
      }
    });
  }

  closePartnerStatementModal() {
    this.showStatementModal.set(false);
    this.partnerStatement.set(null);
    this.selectedPartner.set(null);
  }

  getStatementTafqeet(balance: number): string {
    const absBal = Math.abs(balance || 0);
    if (absBal < 0.005) {
      return this.langService.currentLang() === 'ar' ? 'صفر ريال سعودي فقط لا غير — الحساب مُصفّى ومُسدّد بالكامل' : 'Zero Saudi Riyals — Account Fully Settled';
    }
    return this.tafqeet.toArabicCurrency(absBal, 'ريال سعودي', 'هللة');
  }

  printPartnerStatement() {
    this.currentPrintDate = new Date();
    window.print();
  }

  setStatementPreset(preset: 'thisMonth' | 'thisQuarter' | 'thisYear') {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === 'thisMonth') {
      this.statementFromDate.set(new Date(y, m, 1).toISOString().substring(0, 10));
      this.statementToDate.set(new Date(y, m + 1, 0).toISOString().substring(0, 10));
    } else if (preset === 'thisQuarter') {
      const q = Math.floor(m / 3);
      this.statementFromDate.set(new Date(y, q * 3, 1).toISOString().substring(0, 10));
      this.statementToDate.set(new Date(y, (q + 1) * 3, 0).toISOString().substring(0, 10));
    } else if (preset === 'thisYear') {
      this.statementFromDate.set(`${y}-01-01`);
      this.statementToDate.set(`${y}-12-31`);
    }
    this.loadPartnerStatement();
  }
}
