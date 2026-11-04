import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { GeneralLedgerService, GeneralLedgerReport, GeneralLedgerAccountOverview, AccountStatement, AccountStatementLine } from '../../../core/services/general-ledger.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto } from '../../../core/models/account.model';
import { FinancialSettingsService, CostCenter } from '../../../core/services/financial-settings.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { TafqeetService } from '../../../core/services/tafqeet.service';

@Component({
  selector: 'app-general-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="gl-page" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Top Breadcrumb & Hero Header -->
      <header class="gl-header">
        <div class="gl-breadcrumb">
          <a routerLink="/dashboard" class="bc-link">
            <i class="pi pi-home"></i>
            <span>{{ 'accounting.generalLedger.home' | translate }}</span>
          </a>
          <span class="bc-sep">/</span>
          <span class="bc-link">{{ 'accounting.generalLedger.accountingFinance' | translate }}</span>
          <span class="bc-sep">/</span>
          <span class="bc-current">{{ 'accounting.generalLedger.generalLedgerAccountStatement' | translate }}</span>
        </div>

        <div class="header-main-row">
          <div class="header-titles">
            <div class="title-with-badge">
              <h1 class="page-title">
                {{ 'accounting.generalLedger.generalLedgerStatements' | translate }}
              </h1>
            </div>
            <p class="page-subtitle">
              {{ 'accounting.generalLedger.trackTheImpactOfJournal' | translate }}
            </p>
          </div>

          <!-- Mode Switcher Tabs -->
          <div class="gl-tabs-pill">
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeView() === 'overview'" 
              (click)="switchView('overview')">
              <i class="pi pi-list"></i>
              <span>{{ 'accounting.generalLedger.generalLedgerBook' | translate }}</span>
            </button>

            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeView() === 'statement'" 
              (click)="switchView('statement')">
              <i class="pi pi-file"></i>
              <span>{{ 'accounting.generalLedger.accountStatement' | translate }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Global Filter Bar -->
      <section class="gl-filters-card">
        <div class="filters-grid">
          
          <!-- Date Range: From Date -->
          <div class="filter-field">
            <label class="filter-label">
              <i class="pi pi-calendar"></i>
              <span>{{ 'accounting.generalLedger.fromDate' | translate }}</span>
            </label>
            <input type="date" class="filter-input font-mono" [(ngModel)]="fromDate" (change)="onFilterChanged()" />
          </div>

          <!-- Date Range: To Date -->
          <div class="filter-field">
            <label class="filter-label">
              <i class="pi pi-calendar"></i>
              <span>{{ 'accounting.generalLedger.toDate' | translate }}</span>
            </label>
            <input type="date" class="filter-input font-mono" [(ngModel)]="toDate" (change)="onFilterChanged()" />
          </div>

          <!-- Account Selector (For Detailed Statement mode) -->
          <div class="filter-field account-selector-col" *ngIf="activeView() === 'statement'">
            <label class="filter-label">
              <i class="pi pi-wallet"></i>
              <span>{{ 'accounting.generalLedger.account' | translate }}</span>
            </label>
            <select class="filter-select" [(ngModel)]="selectedAccountId" (change)="onAccountSelected()">
              <option value="" disabled>{{ 'accounting.generalLedger.selectAccount' | translate }}</option>
              <option *ngFor="let acc of postableAccounts" [value]="acc.id">
                {{ acc.accountCode }} - {{ langService.currentLang() === 'ar' ? acc.nameAr : acc.nameEn }}
              </option>
            </select>
          </div>

          <!-- Cost Center Filter -->
          <div class="filter-field">
            <label class="filter-label">
              <i class="pi pi-tags"></i>
              <span>{{ 'accounting.generalLedger.costCenter' | translate }}</span>
            </label>
            <select class="filter-select" [(ngModel)]="selectedCostCenterId" (change)="onFilterChanged()">
              <option value="">{{ 'accounting.generalLedger.allCostCenters' | translate }}</option>
              <option *ngFor="let cc of costCenters" [value]="cc.id">
                {{ cc.code }} - {{ cc.nameAr }}
              </option>
            </select>
          </div>

          <!-- Search (In overview mode) -->
          <div class="filter-field" *ngIf="activeView() === 'overview'">
            <label class="filter-label">
              <i class="pi pi-search"></i>
              <span>{{ 'accounting.generalLedger.search' | translate }}</span>
            </label>
            <input 
              type="text" 
              class="filter-input" 
              [(ngModel)]="searchTerm" 
              (keyup.enter)="onFilterChanged()"
              [placeholder]="('accounting.generalLedger.codeOrName' | translate)" 
            />
          </div>

        </div>

        <!-- Filter Quick Actions & Date Presets -->
        <div class="filters-actions-bar">
          <div class="preset-buttons">
            <span class="preset-label">{{ 'accounting.generalLedger.quickPresets' | translate }}</span>
            <button type="button" class="btn-preset" (click)="setPreset('thisMonth')">
              {{ 'accounting.generalLedger.thisMonth' | translate }}
            </button>
            <button type="button" class="btn-preset" (click)="setPreset('thisQuarter')">
              {{ 'accounting.generalLedger.thisQuarter' | translate }}
            </button>
            <button type="button" class="btn-preset" (click)="setPreset('thisYear')">
              {{ 'accounting.generalLedger.currentYear' | translate }}
            </button>
          </div>

          <div class="action-buttons-group">
            <button type="button" class="btn-refresh" (click)="onFilterChanged()" [disabled]="loading()">
              <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
              <span>{{ 'accounting.generalLedger.refresh' | translate }}</span>
            </button>

            <!-- Print Statement Button (in Statement mode) -->
            <button 
              type="button" 
              class="btn-print-statement" 
              *ngIf="activeView() === 'statement' && currentStatement()" 
              (click)="openPrintStatementModal()">
              <i class="pi pi-print"></i>
              <span>{{ 'accounting.generalLedger.printStatement' | translate }}</span>
            </button>

            <!-- Export to CSV -->
            <button 
              type="button" 
              class="btn-export-csv" 
              (click)="exportToCsv()" 
              [title]="('accounting.generalLedger.exportToCsv' | translate)">
              <i class="pi pi-file-excel"></i>
              <span>{{ 'accounting.generalLedger.export' | translate }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ========================================================= -->
      <!-- VIEW 1: GENERAL LEDGER OVERVIEW (دفتر الأستاذ العام لجميع الحسابات) -->
      <!-- ========================================================= -->
      <section class="gl-view-section" *ngIf="activeView() === 'overview'">
        
        <!-- KPI Strip for All Accounts -->
        <div class="gl-kpi-grid" *ngIf="overviewReport()">
          <div class="kpi-card">
            <div class="kpi-icon-box bg-slate">
              <i class="pi pi-history"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-title">{{ 'accounting.generalLedger.totalOpening' | translate }}</span>
              <strong class="kpi-val font-mono">{{ overviewReport()!.totalOpeningBalance | number:'1.2-2' }} <small>SAR</small></strong>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-box bg-emerald">
              <i class="pi pi-arrow-down-left"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-title">{{ 'accounting.generalLedger.totalPeriodDebit' | translate }}</span>
              <strong class="kpi-val font-mono text-emerald">{{ overviewReport()!.totalPeriodDebit | number:'1.2-2' }} <small>SAR</small></strong>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-box bg-cyan">
              <i class="pi pi-arrow-up-right"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-title">{{ 'accounting.generalLedger.totalPeriodCredit' | translate }}</span>
              <strong class="kpi-val font-mono text-cyan">{{ overviewReport()!.totalPeriodCredit | number:'1.2-2' }} <small>SAR</small></strong>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-box bg-amber">
              <i class="pi pi-check-circle"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-title">{{ 'accounting.generalLedger.balanceStatus' | translate }}</span>
              <strong class="kpi-val font-mono" [class.text-emerald]="isLedgerBalanced()" [class.text-rose]="!isLedgerBalanced()">
                {{ (overviewReport()!.totalPeriodDebit - overviewReport()!.totalPeriodCredit) | number:'1.2-2' }} <small>SAR</small>
              </strong>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-box bg-teal">
              <i class="pi pi-wallet"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-title">{{ 'accounting.generalLedger.totalClosing' | translate }}</span>
              <strong class="kpi-val font-mono">{{ overviewReport()!.totalClosingBalance | number:'1.2-2' }} <small>SAR</small></strong>
            </div>
          </div>
        </div>

        <!-- Ledger Accounts Table -->
        <div class="table-container-card">
          <div class="table-top-bar">
            <h3 class="table-title">
              <i class="pi pi-book text-emerald"></i>
              <span>{{ 'accounting.generalLedger.generalLedgerAccountsMovementB' | translate }}</span>
            </h3>
            <span class="accounts-count-tag" *ngIf="overviewReport()">
              {{ overviewReport()!.accounts.length }} {{ 'accounting.generalLedger.accounts' | translate }}
            </span>
          </div>

          <div class="table-responsive">
            <table class="gl-main-table">
              <thead>
                <tr>
                  <th class="th-code">{{ 'accounting.generalLedger.code' | translate }}</th>
                  <th class="th-name">{{ 'accounting.generalLedger.accountName' | translate }}</th>
                  <th class="th-type">{{ 'accounting.generalLedger.nature' | translate }}</th>
                  <th class="th-amount">{{ 'accounting.generalLedger.openingSar' | translate }}</th>
                  <th class="th-amount text-emerald">{{ 'accounting.generalLedger.debitSar' | translate }}</th>
                  <th class="th-amount text-cyan">{{ 'accounting.generalLedger.creditSar' | translate }}</th>
                  <th class="th-amount">{{ 'accounting.generalLedger.netMovement' | translate }}</th>
                  <th class="th-amount">{{ 'accounting.generalLedger.closingSar' | translate }}</th>
                  <th class="th-actions text-center">{{ 'accounting.generalLedger.statement' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="loading()">
                  <td colspan="9" class="td-loading">
                    <i class="pi pi-spin pi-spinner"></i>
                    <span>{{ 'accounting.generalLedger.loadingGeneralLedger' | translate }}</span>
                  </td>
                </tr>

                <tr *ngIf="!loading() && (!overviewReport() || overviewReport()!.accounts.length === 0)">
                  <td colspan="9" class="td-empty">
                    <i class="pi pi-inbox"></i>
                    <p>{{ 'accounting.generalLedger.noAccountsFoundForSelected' | translate }}</p>
                  </td>
                </tr>

                <tr *ngFor="let acc of overviewReport()?.accounts" [class.has-movement]="acc.periodDebit > 0 || acc.periodCredit > 0">
                  <td class="td-code font-mono text-emerald">
                    <strong>{{ acc.accountCode }}</strong>
                  </td>
                  <td class="td-name">
                    <strong class="name-ar">{{ acc.nameAr }}</strong>
                    <small class="name-en" *ngIf="acc.nameEn">{{ acc.nameEn }}</small>
                  </td>
                  <td class="td-type">
                    <span class="nature-pill" [class.nature-debit]="acc.accountNature === 1" [class.nature-credit]="acc.accountNature === 2">
                      {{ acc.accountNature === 1 ? ('accounting.generalLedger.debit' | translate) : ('accounting.generalLedger.credit' | translate) }}
                    </span>
                  </td>
                  <td class="td-amount font-mono">
                    {{ acc.openingBalance | number:'1.2-2' }}
                  </td>
                  <td class="td-amount font-mono text-emerald" [class.font-bold]="acc.periodDebit > 0">
                    {{ acc.periodDebit > 0 ? (acc.periodDebit | number:'1.2-2') : '—' }}
                  </td>
                  <td class="td-amount font-mono text-cyan" [class.font-bold]="acc.periodCredit > 0">
                    {{ acc.periodCredit > 0 ? (acc.periodCredit | number:'1.2-2') : '—' }}
                  </td>
                  <td class="td-amount font-mono" [class.text-emerald]="acc.netMovement > 0" [class.text-cyan]="acc.netMovement < 0">
                    {{ acc.netMovement | number:'1.2-2' }}
                  </td>
                  <td class="td-amount font-mono font-bold" [class.text-emerald]="acc.closingBalance > 0" [class.text-slate-900]="acc.closingBalance === 0">
                    {{ acc.closingBalance | number:'1.2-2' }}
                  </td>
                  <td class="td-actions text-center">
                    <button type="button" class="btn-drilldown-statement" (click)="drilldownToStatement(acc.accountId)" [title]="'ui.generalLedger.108b08' | translate">
                      <i class="pi pi-file-text"></i>
                      <span>{{ 'accounting.generalLedger.statement' | translate }}</span>
                    </button>
                  </td>
                </tr>
              </tbody>
              <!-- Totals Footer Row -->
              <tfoot *ngIf="overviewReport() && overviewReport()!.accounts.length > 0">
                <tr class="ledger-footer-totals">
                  <td colspan="3" class="total-label">
                    <i class="pi pi-calculator text-emerald"></i>
                    <strong>{{ 'accounting.generalLedger.grandTotalsSar' | translate }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold">{{ overviewReport()!.totalOpeningBalance | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold text-emerald">{{ overviewReport()!.totalPeriodDebit | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold text-cyan">{{ overviewReport()!.totalPeriodCredit | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold">{{ (overviewReport()!.totalPeriodDebit - overviewReport()!.totalPeriodCredit) | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold text-emerald">{{ overviewReport()!.totalClosingBalance | number:'1.2-2' }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </section>

      <!-- ========================================================= -->
      <!-- VIEW 2: DETAILED ACCOUNT STATEMENT (كشف الحساب التفصيلي)   -->
      <!-- ========================================================= -->
      <section class="gl-view-section" *ngIf="activeView() === 'statement'">
        
        <!-- Account Header Identity Card -->
        <div class="account-identity-card" *ngIf="currentStatement()">
          <div class="acc-identity-main">
            <div class="acc-code-badge font-mono">
              {{ currentStatement()!.account.accountCode }}
            </div>
            <div class="acc-titles">
              <h2 class="acc-title-ar">{{ currentStatement()!.account.nameAr }}</h2>
              <span class="acc-title-en" *ngIf="currentStatement()!.account.nameEn">{{ currentStatement()!.account.nameEn }}</span>
            </div>
          </div>

          <div class="acc-meta-pills">
            <div class="meta-pill">
              <span class="lbl">{{ 'accounting.generalLedger.nature1' | translate }}</span>
              <strong class="val" [class.text-emerald]="currentStatement()!.account.accountNature === 1" [class.text-cyan]="currentStatement()!.account.accountNature === 2">
                {{ currentStatement()!.account.accountNature === 1 ? ('accounting.generalLedger.debit' | translate) : ('accounting.generalLedger.credit' | translate) }}
              </strong>
            </div>

            <div class="meta-pill">
              <span class="lbl">{{ 'accounting.generalLedger.currency' | translate }}</span>
              <strong class="val font-mono">{{ currentStatement()!.account.currencyCode || 'SAR' }}</strong>
            </div>

            <div class="meta-pill">
              <span class="lbl">{{ 'accounting.generalLedger.parent' | translate }}</span>
              <strong class="val">{{ currentStatement()!.account.parentAccountNameAr || '—' }}</strong>
            </div>

            <div class="meta-pill">
              <span class="lbl">{{ 'accounting.generalLedger.period' | translate }}</span>
              <strong class="val font-mono">{{ fromDate }} ~ {{ toDate }}</strong>
            </div>
          </div>
        </div>

        <!-- Statement KPI Balances Strip -->
        <div class="statement-kpi-grid" *ngIf="currentStatement()">
          <div class="stmt-kpi-card bg-slate-subtle">
            <span class="stmt-kpi-lbl">{{ 'accounting.generalLedger.openingBalance' | translate }}</span>
            <strong class="stmt-kpi-val font-mono">{{ currentStatement()!.openingBalance | number:'1.2-2' }} <small>SAR</small></strong>
          </div>

          <div class="stmt-kpi-card bg-emerald-subtle">
            <span class="stmt-kpi-lbl text-emerald">{{ 'accounting.generalLedger.totalPeriodDebit' | translate }}</span>
            <strong class="stmt-kpi-val font-mono text-emerald">+ {{ currentStatement()!.totalDebit | number:'1.2-2' }} <small>SAR</small></strong>
          </div>

          <div class="stmt-kpi-card bg-cyan-subtle">
            <span class="stmt-kpi-lbl text-cyan">{{ 'accounting.generalLedger.totalPeriodCredit' | translate }}</span>
            <strong class="stmt-kpi-val font-mono text-cyan">- {{ currentStatement()!.totalCredit | number:'1.2-2' }} <small>SAR</small></strong>
          </div>

          <div class="stmt-kpi-card bg-amber-subtle">
            <span class="stmt-kpi-lbl">{{ 'accounting.generalLedger.netMovement' | translate }}</span>
            <strong class="stmt-kpi-val font-mono">{{ currentStatement()!.netMovement | number:'1.2-2' }} <small>SAR</small></strong>
          </div>

          <div class="stmt-kpi-card bg-emerald-deep">
            <span class="stmt-kpi-lbl text-white">{{ 'accounting.generalLedger.currentClosingBalance' | translate }}</span>
            <strong class="stmt-kpi-val font-mono text-white">{{ currentStatement()!.closingBalance | number:'1.2-2' }} <small>SAR</small></strong>
          </div>
        </div>

        <!-- Detailed Statement Transactions Table -->
        <div class="table-container-card">
          <div class="table-top-bar">
            <h3 class="table-title">
              <i class="pi pi-align-justify text-emerald"></i>
              <span>{{ 'accounting.generalLedger.detailedTransactionsRunningBal' | translate }}</span>
            </h3>
            <span class="accounts-count-tag" *ngIf="currentStatement()">
              {{ currentStatement()!.transactionCount }} {{ 'accounting.generalLedger.movements' | translate }}
            </span>
          </div>

          <div class="table-responsive">
            <table class="gl-main-table statement-table">
              <thead>
                <tr>
                  <th class="th-num">#</th>
                  <th class="th-date">{{ 'accounting.generalLedger.date' | translate }}</th>
                  <th class="th-jv">{{ 'accounting.generalLedger.voucherNo' | translate }}</th>
                  <th class="th-type">{{ 'accounting.generalLedger.entryType' | translate }}</th>
                  <th class="th-desc">{{ 'accounting.generalLedger.narrationDescription' | translate }}</th>
                  <th class="th-cost-center">{{ 'accounting.generalLedger.costCenter1' | translate }}</th>
                  <th class="th-amount text-emerald">{{ 'accounting.generalLedger.debit' | translate }}</th>
                  <th class="th-amount text-cyan">{{ 'accounting.generalLedger.credit' | translate }}</th>
                  <th class="th-amount text-emerald-dark">{{ 'accounting.generalLedger.runningBalance' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="loading()">
                  <td colspan="9" class="td-loading">
                    <i class="pi pi-spin pi-spinner"></i>
                    <span>{{ 'accounting.generalLedger.loadingAccountStatement' | translate }}</span>
                  </td>
                </tr>

                <tr *ngIf="!loading() && (!currentStatement() || currentStatement()!.lines.length === 0)">
                  <td colspan="9" class="td-empty">
                    <i class="pi pi-inbox"></i>
                    <p>{{ 'accounting.generalLedger.noTransactionsRecordedForThis' | translate }}</p>
                    <small>{{ 'accounting.generalLedger.openingBalanceIs' | translate }} {{ (currentStatement()?.openingBalance || 0) | number:'1.2-2' }} SAR</small>
                  </td>
                </tr>

                <!-- Initial Balance Row -->
                <tr class="row-opening-balance" *ngIf="currentStatement()">
                  <td class="text-center font-mono">0</td>
                  <td class="font-mono text-slate-500">{{ fromDate }}</td>
                  <td class="font-mono text-emerald"><strong>—</strong></td>
                  <td><span class="opening-tag">{{ 'accounting.generalLedger.opening' | translate }}</span></td>
                  <td class="td-desc">
                    <strong>{{ langService.currentLang() === 'ar' ? ('accounting.gl.openingBroughtForward' | translate) + fromDate : 'Opening balance brought forward before ' + fromDate }}</strong>
                  </td>
                  <td>—</td>
                  <td class="td-amount">—</td>
                  <td class="td-amount">—</td>
                  <td class="td-amount font-mono font-bold text-emerald-dark">
                    {{ currentStatement()!.openingBalance | number:'1.2-2' }}
                  </td>
                </tr>

                <!-- Transaction Rows -->
                <tr *ngFor="let l of currentStatement()?.lines; let lIdx = index" [class.row-alt]="lIdx % 2 === 1">
                  <td class="td-num font-mono text-center text-slate-400">{{ lIdx + 1 }}</td>
                  <td class="td-date font-mono">{{ l.entryDate | date:'yyyy-MM-dd' }}</td>
                  <td class="td-jv">
                    <span class="jv-link-badge font-mono" (click)="openJournalVoucherPreview(l.journalEntryId)" [title]="'ui.generalLedger.3959d1' | translate">
                      {{ l.entryNumber }}
                    </span>
                  </td>
                  <td class="td-type">
                    <span class="entry-type-pill">{{ getEntryTypeLabel(l.entryType) }}</span>
                  </td>
                  <td class="td-desc">
                    <span class="desc-text">{{ l.description }}</span>
                    <small class="ref-sub font-mono" *ngIf="l.referenceNumber">{{ 'ui.generalLedger.631575' | translate }} {{ l.referenceNumber }}</small>
                  </td>
                  <td class="td-cost-center">{{ l.costCenterName || '—' }}</td>
                  <td class="td-amount font-mono text-emerald" [class.font-bold]="l.debit > 0">
                    {{ l.debit > 0 ? (l.debit | number:'1.2-2') : '—' }}
                  </td>
                  <td class="td-amount font-mono text-cyan" [class.font-bold]="l.credit > 0">
                    {{ l.credit > 0 ? (l.credit | number:'1.2-2') : '—' }}
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald-dark">
                    {{ l.runningBalance | number:'1.2-2' }}
                  </td>
                </tr>
              </tbody>
              <!-- Totals Footer -->
              <tfoot *ngIf="currentStatement()">
                <tr class="ledger-footer-totals">
                  <td colspan="6" class="total-label">
                    <i class="pi pi-calculator text-emerald"></i>
                    <strong>{{ 'accounting.generalLedger.periodTotalsClosingBalanceSar' | translate }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald">{{ currentStatement()!.totalDebit | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold text-cyan">{{ currentStatement()!.totalCredit | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold text-emerald-dark">{{ currentStatement()!.closingBalance | number:'1.2-2' }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </section>

      <!-- ============================================================== -->
      <!-- MODAL: OFFICIAL A4 STATEMENT PRINT & PDF PREVIEW               -->
      <!-- ============================================================== -->
      <div class="modal-backdrop print-modal-backdrop" *ngIf="showPrintModal" (click)="closePrintModal()">
        <div class="print-preview-dialog" (click)="$event.stopPropagation()">
          
          <!-- Sticky Top Toolbar -->
          <div class="print-toolbar no-print">
            <div class="toolbar-left">
              <div class="toolbar-badge">
                <i class="pi pi-print"></i>
              </div>
              <div class="toolbar-titles">
                <strong>{{ 'accounting.generalLedger.officialAccountStatementPrevie' | translate }}</strong>
                <span class="sub-badge font-mono">{{ currentStatement()?.account?.accountCode }} - {{ currentStatement()?.account?.nameAr }}</span>
              </div>
            </div>

            <div class="toolbar-actions">
              <button type="button" class="btn-print-main" (click)="triggerPrint()">
                <i class="pi pi-print"></i>
                <span>{{ 'accounting.generalLedger.printSavePdf' | translate }}</span>
              </button>

              <button type="button" class="btn-toolbar-close" (click)="closePrintModal()">
                <i class="pi pi-times"></i>
                <span>{{ 'accounting.generalLedger.close' | translate }}</span>
              </button>
            </div>
          </div>

          <!-- Printable A4 Paper Container -->
          <div class="print-paper-container">
            <article class="official-statement-sheet" id="printable-account-statement">
              
              <!-- 1. Corporate Header -->
              <header class="statement-print-header">
                <div class="org-info">
                  <h2 class="org-name-ar">{{ companyContext.activeCompany().nameAr || ('ui.vouchers.eae355' | translate) }}</h2>
                  <span class="org-name-en">{{ companyContext.activeCompany().nameEn || 'Al-Roban Smart Solutions Co.' }}</span>
                  <div class="org-tax-row">
                    <span>{{ 'pos.receipt.vatLabel' | translate }} <strong class="font-mono">{{ companyContext.activeCompany().vatNumber || '310123456700003' }}</strong></span>
                    <span class="dot">&bull;</span>
                    <span>{{ 'accounting.journal.ui.cr' | translate }} <strong class="font-mono">{{ companyContext.activeCompany().commercialRegistration || '1010789456' }}</strong></span>
                  </div>
                </div>

                <div class="center-title-box">
                  <h1 class="statement-main-title">{{ 'ui.generalLedger.7469b0' | translate }}</h1>
                  <span class="statement-sub-title">GENERAL LEDGER ACCOUNT STATEMENT</span>
                </div>

                <div class="left-seal-box">
                  <div class="seal-frame">
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="30" cy="30" r="28" stroke="#047857" stroke-width="2" stroke-dasharray="4 2"/>
                      <circle cx="30" cy="30" r="23" stroke="#047857" stroke-width="1"/>
                      <path d="M30 14L34 23H26L30 14Z" fill="#047857"/>
                      <text x="30" y="34" font-size="6.5" font-weight="bold" fill="#047857" text-anchor="middle">{{ 'ui.generalLedger.148f39' | translate }}</text>
                      <text x="30" y="42" font-size="5" fill="#64748B" text-anchor="middle">{{ 'hr.payroll.officialDocText' | translate }}</text>
                    </svg>
                  </div>
                </div>
              </header>

              <!-- 2. Account & Period Meta Grid -->
              <section class="statement-meta-box">
                <div class="meta-cell">
                  <span class="m-lbl">{{ 'ui.generalLedger.317c5e' | translate }}</span>
                  <strong class="m-val font-mono text-emerald">{{ currentStatement()?.account?.accountCode }}</strong>
                </div>

                <div class="meta-cell">
                  <span class="m-lbl">{{ 'ui.generalLedger.b4a36f' | translate }}</span>
                  <strong class="m-val">{{ currentStatement()?.account?.nameAr }}</strong>
                </div>

                <div class="meta-cell">
                  <span class="m-lbl">{{ 'accounting.accountCreate.accountNature' | translate }}</span>
                  <strong class="m-val">{{ currentStatement()?.account?.accountNature === 1 ? ('accounting.journal.ui.debit1' | translate) : ('accounting.journal.ui.credit1' | translate) }}</strong>
                </div>

                <div class="meta-cell">
                  <span class="m-lbl">{{ 'ui.generalLedger.313c8f' | translate }}</span>
                  <strong class="m-val font-mono">{{ currentStatement()?.account?.currencyCode || 'SAR' }}</strong>
                </div>

                <div class="meta-cell">
                  <span class="m-lbl">{{ 'ui.generalLedger.c84d0f' | translate }}</span>
                  <strong class="m-val font-mono">{{ 'common.of' | translate }} {{ fromDate }} {{ 'accounting.financialStatements.ui.to1' | translate }} {{ toDate }}</strong>
                </div>

                <div class="meta-cell">
                  <span class="m-lbl">{{ 'ui.generalLedger.887efc' | translate }}</span>
                  <strong class="m-val font-mono">{{ currentPrintDate | date:'yyyy-MM-dd HH:mm' }}</strong>
                </div>
              </section>

              <!-- 3. Balances Summary Strip -->
              <section class="statement-balances-summary">
                <div class="summary-box">
                  <span class="s-lbl">{{ 'invoices.statementModal.openingBalance' | translate }}</span>
                  <strong class="s-val font-mono">{{ currentStatement()?.openingBalance | number:'1.2-2' }}</strong>
                </div>
                <div class="summary-box">
                  <span class="s-lbl text-emerald">{{ 'accounting.generalLedger.totalPeriodDebit' | translate }}</span>
                  <strong class="s-val font-mono text-emerald">{{ currentStatement()?.totalDebit | number:'1.2-2' }}</strong>
                </div>
                <div class="summary-box">
                  <span class="s-lbl text-cyan">{{ 'accounting.generalLedger.totalPeriodCredit' | translate }}</span>
                  <strong class="s-val font-mono text-cyan">{{ currentStatement()?.totalCredit | number:'1.2-2' }}</strong>
                </div>
                <div class="summary-box highlight-closing">
                  <span class="s-lbl">{{ 'ui.generalLedger.207881' | translate }}</span>
                  <strong class="s-val font-mono text-emerald-dark">{{ currentStatement()?.closingBalance | number:'1.2-2' }}</strong>
                </div>
              </section>

              <!-- 4. Transactions Print Table -->
              <section class="statement-print-table-section">
                <table class="statement-print-table">
                  <thead>
                    <tr>
                      <th class="th-p-num">#</th>
                      <th class="th-p-date">{{ 'accounting.journal.table.date' | translate }}</th>
                      <th class="th-p-jv">{{ 'accounting.vouchers.table.number' | translate }}</th>
                      <th class="th-p-desc">{{ 'ui.generalLedger.0a925c' | translate }}</th>
                      <th class="th-p-cost">{{ 'accounting.journal.create.costCenter' | translate }}</th>
                      <th class="th-p-amount">{{ 'accounting.journal.ui.debit2' | translate }}</th>
                      <th class="th-p-amount">{{ 'accounting.journal.ui.credit2' | translate }}</th>
                      <th class="th-p-amount">{{ 'accounting.gl.table.runningBalance' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="row-print-opening">
                      <td class="text-center font-mono">0</td>
                      <td class="font-mono">{{ fromDate }}</td>
                      <td class="font-mono text-center">—</td>
                      <td><strong>{{ 'ui.generalLedger.56c3a7' | translate }} {{ fromDate }}</strong></td>
                      <td class="text-center">—</td>
                      <td class="text-end">—</td>
                      <td class="text-end">—</td>
                      <td class="text-end font-mono font-bold">{{ currentStatement()?.openingBalance | number:'1.2-2' }}</td>
                    </tr>

                    <tr *ngFor="let l of currentStatement()?.lines; let idx = index">
                      <td class="text-center font-mono">{{ idx + 1 }}</td>
                      <td class="font-mono">{{ l.entryDate | date:'yyyy-MM-dd' }}</td>
                      <td class="font-mono font-bold text-center">{{ l.entryNumber }}</td>
                      <td>{{ l.description }}</td>
                      <td>{{ l.costCenterName || '—' }}</td>
                      <td class="text-end font-mono">{{ l.debit > 0 ? (l.debit | number:'1.2-2') : '—' }}</td>
                      <td class="text-end font-mono">{{ l.credit > 0 ? (l.credit | number:'1.2-2') : '—' }}</td>
                      <td class="text-end font-mono font-bold">{{ l.runningBalance | number:'1.2-2' }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="totals-row">
                      <td colspan="5" class="text-end font-bold">{{ 'ui.generalLedger.33e3b8' | translate }}</td>
                      <td class="text-end font-mono font-bold">{{ currentStatement()?.totalDebit | number:'1.2-2' }}</td>
                      <td class="text-end font-mono font-bold">{{ currentStatement()?.totalCredit | number:'1.2-2' }}</td>
                      <td class="text-end font-mono font-bold">{{ currentStatement()?.closingBalance | number:'1.2-2' }}</td>
                    </tr>
                  </tfoot>
                </table>
              </section>

              <!-- 5. Arabic Tafqeet Box -->
              <section class="statement-tafqeet-box" *ngIf="currentStatement()">
                <div class="tafqeet-card">
                  <span class="tafqeet-label">
                    <i class="pi pi-align-right text-emerald"></i>
                    <span>{{ 'ui.generalLedger.ae4493' | translate }}</span>
                  </span>
                  <span class="tafqeet-text font-bold">
                    {{ getTafqeetClosing() }}
                  </span>
                </div>
              </section>

              <!-- 6. Tripartite Signatures Matrix -->
              <section class="statement-signatures-matrix">
                <div class="signature-box">
                  <span class="sig-header">{{ 'ui.generalLedger.dbf752' | translate }}</span>
                  <div class="sig-content">
                    <span class="sig-name">{{ 'ui.generalLedger.6f6cad' | translate }}</span>
                    <div class="sig-line">{{ 'ui.generalLedger.297f65' | translate }}</div>
                    <span class="sig-date font-mono">{{ 'hr.payroll.date' | translate }} {{ currentPrintDate | date:'yyyy-MM-dd' }}</span>
                  </div>
                </div>

                <div class="signature-box">
                  <span class="sig-header">{{ 'accounting.journal.ui.auditedBy' | translate }}</span>
                  <div class="sig-content">
                    <span class="sig-name">{{ 'ui.generalLedger.c97f64' | translate }}</span>
                    <div class="sig-line">{{ 'ui.generalLedger.297f65' | translate }}</div>
                    <span class="sig-date font-mono">{{ 'hr.payroll.date' | translate }} {{ currentPrintDate | date:'yyyy-MM-dd' }}</span>
                  </div>
                </div>

                <div class="signature-box approved">
                  <span class="sig-header">{{ 'ui.generalLedger.d5013b' | translate }}</span>
                  <div class="sig-content">
                    <span class="sig-name">{{ 'hr.payroll.cfoTitle' | translate }}</span>
                    <div class="sig-line">{{ 'ui.generalLedger.e7da75' | translate }}</div>
                    <span class="sig-date font-mono">{{ 'hr.payroll.date' | translate }} {{ currentPrintDate | date:'yyyy-MM-dd' }}</span>
                  </div>
                </div>
              </section>


            </article>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
    }

    button, input, select, span, strong, h1, h2, h3 {
      font-family: var(--font-arabic) !important;
    }

    .gl-page {
      max-width: 100%;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding: 0.75rem 1rem;
    }

    /* Compact Header Bar */
    .gl-header {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.55rem 0.85rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .gl-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      color: #64748B;
    }

    .bc-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #047857;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.15s ease;
    }

    .bc-link:hover { color: #065F46; }
    .bc-sep { color: #CBD5E1; }
    .bc-current { color: #0F172A; font-weight: 600; }

    .header-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .page-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      color: #0F172A;
    }

    .compliance-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #ECFDF5;
      color: #047857;
      border: 1px solid #A7F3D0;
      padding: 0.12rem 0.45rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .page-subtitle {
      margin: 0;
      color: #64748B;
      font-size: 0.75rem;
      line-height: 1.3;
    }

    /* Tabs Pill */
    .gl-tabs-pill {
      display: flex;
      background: #F1F5F9;
      padding: 0.2rem;
      border-radius: 8px;
      gap: 0.25rem;
      border: 1px solid #E2E8F0;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: transparent;
      border: none;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn:hover:not(.active) {
      color: #0F172A;
      background: rgba(255, 255, 255, 0.6);
    }

    .tab-btn.active {
      background: #FFFFFF;
      color: #047857;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    /* Compact Filters Card */
    .gl-filters-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.55rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.55rem;
      align-items: flex-end;
    }

    .account-selector-col {
      grid-column: span 2;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .filter-label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.74rem;
      font-weight: 700;
      color: #475569;
    }

    .filter-label i {
      color: #047857;
      font-size: 0.72rem;
    }

    .filter-input, .filter-select {
      width: 100%;
      height: 32px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.25rem 0.55rem;
      font-size: 0.8rem;
      color: #0F172A;
      box-sizing: border-box;
      outline: none;
      transition: all 0.15s ease;
    }

    .filter-input:focus, .filter-select:focus {
      background: #FFFFFF;
      border-color: #047857;
      box-shadow: 0 0 0 2px rgba(4, 120, 87, 0.12);
    }

    .filters-actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #F1F5F9;
      padding-top: 0.45rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .preset-buttons {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .preset-label {
      font-size: 0.72rem;
      color: #64748B;
      font-weight: 700;
    }

    .btn-preset {
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 0.2rem 0.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-preset:hover {
      background: #ECFDF5;
      border-color: #86EFAC;
      color: #047857;
    }

    .action-buttons-group {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      height: 32px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.25rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-refresh:hover:not(:disabled) {
      background: #F8FAFC;
      border-color: #94A3B8;
      color: #0F172A;
    }

    .btn-print-statement {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      height: 32px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      padding: 0.25rem 0.85rem;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(4, 120, 87, 0.2);
      transition: all 0.2s ease;
    }

    .btn-print-statement:hover {
      background: linear-gradient(135deg, #047857 0%, #064E3B 100%);
      transform: translateY(-1px);
    }

    .btn-export-csv {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      height: 32px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.25rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #047857;
      cursor: pointer;
    }

    .btn-export-csv:hover {
      background: #ECFDF5;
      border-color: #86EFAC;
    }

    /* Compact KPI Grids */
    .gl-kpi-grid, .statement-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.5rem;
    }

    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.45rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .kpi-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      flex-shrink: 0;
    }

    .bg-slate { background: #F1F5F9; color: #475569; }
    .bg-emerald { background: #ECFDF5; color: #047857; }
    .bg-cyan { background: #E0F2FE; color: #0284C7; }
    .bg-amber { background: #FEF3C7; color: #D97706; }
    .bg-teal { background: #CCFBF1; color: #0F766E; }

    .kpi-content {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .kpi-title {
      font-size: 0.7rem;
      color: #64748B;
      font-weight: 700;
    }

    .kpi-val {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0F172A;
    }

    .kpi-val small {
      font-size: 0.68rem;
      color: #64748B;
      font-weight: 600;
    }

    /* Statement KPI Cards */
    .stmt-kpi-card {
      border-radius: 8px;
      padding: 0.45rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      border: 1px solid #E2E8F0;
    }

    .bg-slate-subtle { background: #F8FAFC; }
    .bg-emerald-subtle { background: #F0FDF4; border-color: #BBF7D0; }
    .bg-cyan-subtle { background: #F0F9FF; border-color: #BAE6FD; }
    .bg-amber-subtle { background: #FFFBEB; border-color: #FDE68A; }
    .bg-emerald-deep {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border: none;
      color: #FFFFFF;
      box-shadow: 0 2px 6px rgba(4, 120, 87, 0.2);
    }

    .stmt-kpi-lbl {
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748B;
    }

    .stmt-kpi-val {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0F172A;
    }

    /* Account Identity Card */
    .account-identity-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.55rem 0.85rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .acc-identity-main {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .acc-code-badge {
      background: #047857;
      color: #FFFFFF;
      font-size: 0.95rem;
      font-weight: 800;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .acc-titles {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .acc-title-ar {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #0F172A;
    }

    .acc-title-en {
      font-size: 0.72rem;
      color: #64748B;
      font-weight: 600;
      font-family: var(--font-latin) !important;
    }

    .acc-meta-pills {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .meta-pill {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 0.2rem 0.55rem;
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
    }

    .meta-pill .lbl {
      font-size: 0.62rem;
      color: #64748B;
      font-weight: 700;
    }

    .meta-pill .val {
      font-size: 0.78rem;
      color: #0F172A;
      font-weight: 600;
    }

    /* Table Container Card */
    .table-container-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .table-top-bar {
      padding: 0.45rem 0.85rem;
      background: #FAFAFA;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-title {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 800;
      color: #0F172A;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .accounts-count-tag {
      background: #F1F5F9;
      color: #475569;
      padding: 0.12rem 0.45rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .gl-main-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.81rem;
      text-align: start;
    }

    .gl-main-table th {
      background: #F8FAFC;
      color: #475569;
      padding: 0.4rem 0.55rem;
      font-weight: 750;
      font-size: 0.76rem;
      border-bottom: 1.5px solid #CBD5E1;
      white-space: nowrap;
    }

    .gl-main-table td {
      padding: 0.32rem 0.55rem;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
      vertical-align: middle;
      font-size: 0.8rem;
    }

    .gl-main-table tr:hover:not(.td-loading):not(.td-empty) {
      background: #F8FAFC;
    }

    .td-amount {
      text-align: end;
      white-space: nowrap;
    }

    .nature-pill {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }

    .nature-debit { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
    .nature-credit { background: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD; }

    .btn-drilldown-statement {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 0.2rem 0.55rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #047857;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-drilldown-statement:hover {
      background: #047857;
      color: #FFFFFF;
      border-color: #047857;
    }

    .ledger-footer-totals td {
      background: #F8FAFC;
      border-top: 2px solid #047857;
      padding: 0.45rem 0.55rem;
      color: #0F172A;
      font-weight: 800;
    }

    .total-label {
      font-size: 0.82rem;
    }

    /* Statement Table specifics */
    .row-opening-balance td {
      background: #F8FAFC;
      font-weight: 700;
      border-bottom: 1.5px solid #E2E8F0;
    }

    .opening-tag {
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #CBD5E1;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .jv-link-badge {
      display: inline-block;
      background: #ECFDF5;
      color: #047857;
      border: 1px solid #A7F3D0;
      padding: 0.1rem 0.45rem;
      border-radius: 4px;
      font-weight: 800;
      font-size: 0.74rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .jv-link-badge:hover {
      background: #047857;
      color: #FFFFFF;
      transform: scale(1.03);
    }

    .entry-type-pill {
      font-size: 0.68rem;
      color: #64748B;
      background: #F1F5F9;
      padding: 0.08rem 0.35rem;
      border-radius: 4px;
    }

    .td-desc .desc-text {
      display: block;
      color: #0F172A;
      font-weight: 600;
    }

    .td-desc .ref-sub {
      color: #94A3B8;
      font-size: 0.68rem;
    }

    .text-emerald-dark { color: #065F46; }
    .text-emerald { color: #047857; }
    .text-cyan { color: #0284C7; }

    /* Print Preview Modal Styles */
    .print-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow-y: auto;
      padding: 1.5rem 1rem;
    }

    .print-preview-dialog {
      width: 100%;
      max-width: 950px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 0 auto;
    }

    .print-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0F172A;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 0.75rem 1.25rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toolbar-badge {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34D399;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }

    .toolbar-titles strong {
      display: block;
      color: #F8FAFC;
      font-size: 0.95rem;
    }

    .toolbar-titles .sub-badge {
      font-size: 0.75rem;
      color: #34D399;
      font-weight: 700;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-print-main {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #10B981 0%, #047857 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .btn-toolbar-close {
      background: rgba(255, 255, 255, 0.1);
      color: #E2E8F0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      cursor: pointer;
    }

    /* Official A4 Statement Paper */
    .print-paper-container {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    .official-statement-sheet {
      width: 210mm;
      min-height: 297mm;
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.35);
      border-radius: 4px;
      padding: 12mm 15mm;
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
      border-bottom: 2px solid #047857;
      margin-bottom: 0.85rem;
    }

    .org-info { flex: 1; }
    .org-name-ar { font-size: 1.15rem; font-weight: 800; color: #065F46; margin: 0; }
    .org-name-en { font-size: 0.74rem; color: #64748B; font-family: var(--font-latin) !important; font-weight: 600; display: block; }
    .org-tax-row { font-size: 0.72rem; color: #475569; margin-top: 0.25rem; }

    .center-title-box {
      flex: 1.4;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .statement-main-title { font-size: 1.35rem; font-weight: 900; color: #0F172A; margin: 0; letter-spacing: 0.5px; }
    .statement-sub-title { font-size: 0.72rem; color: #047857; font-weight: 700; margin-top: 0.15rem; }
    .standard-cert-badge { font-size: 0.62rem; color: #64748B; font-weight: 600; margin-top: 0.15rem; }

    .left-seal-box { flex: 1; display: flex; justify-content: flex-end; }

    /* Statement Meta Box */
    .statement-meta-box {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.45rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.65rem;
    }

    .meta-cell { display: flex; flex-direction: column; gap: 0.1rem; }
    .m-lbl { font-size: 0.64rem; color: #64748B; font-weight: 700; }
    .m-val { font-size: 0.78rem; color: #0F172A; font-weight: 800; }

    /* Balances Summary */
    .statement-balances-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.45rem;
      margin-bottom: 0.75rem;
    }

    .summary-box {
      background: #FAFAFA;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.45rem 0.65rem;
      display: flex;
      flex-direction: column;
      text-align: center;
      gap: 0.15rem;
    }

    .summary-box.highlight-closing {
      background: #ECFDF5;
      border-color: #047857;
    }

    .s-lbl { font-size: 0.66rem; font-weight: 700; color: #475569; }
    .s-val { font-size: 0.92rem; font-weight: 900; color: #0F172A; }

    /* Print Table */
    .statement-print-table-section { margin-bottom: 0.75rem; }
    .statement-print-table { width: 100%; border-collapse: collapse; font-size: 0.74rem; }
    .statement-print-table th { background: #065F46; color: #FFFFFF; padding: 0.45rem 0.55rem; font-weight: 700; border: 1px solid #065F46; }
    .statement-print-table td { padding: 0.38rem 0.55rem; border: 1px solid #CBD5E1; color: #1E293B; vertical-align: middle; }
    .row-print-opening td { background: #F8FAFC; }
    .totals-row td { background: #ECFDF5; border-top: 2px solid #047857; font-weight: 800; }

    /* Tafqeet */
    .statement-tafqeet-box { margin-bottom: 0.85rem; }
    .tafqeet-card {
      background: #F8FAFC;
      border: 1px dashed #047857;
      border-radius: 6px;
      padding: 0.45rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.78rem;
    }

    .tafqeet-label { display: flex; align-items: center; gap: 0.35rem; color: #64748B; font-weight: 700; white-space: nowrap; }
    .tafqeet-text { color: #065F46; }

    /* Signatures */
    .statement-signatures-matrix {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-top: 0.5rem;
      margin-bottom: 1rem;
    }

    .signature-box {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.6rem;
      background: #FAFAFA;
      display: flex;
      flex-direction: column;
      text-align: center;
    }

    .signature-box.approved { border-color: #A7F3D0; background: #F0FDF4; }
    .sig-header { font-size: 0.72rem; font-weight: 700; color: #475569; border-bottom: 1px solid #E2E8F0; padding-bottom: 0.3rem; margin-bottom: 0.4rem; }
    .signature-box.approved .sig-header { color: #065F46; border-color: #BBF7D0; }
    .sig-content { display: flex; flex-direction: column; gap: 0.45rem; }
    .sig-name { font-size: 0.78rem; font-weight: 700; color: #0F172A; }
    .sig-line { font-size: 0.68rem; color: #94A3B8; }
    .sig-date { font-size: 0.66rem; color: #64748B; }

    /* Footer */
    .statement-compliance-footer {
      margin-top: auto;
      padding-top: 0.6rem;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.66rem;
      color: #64748B;
      gap: 0.5rem;
    }

    .compliance-left { display: flex; align-items: center; gap: 0.35rem; flex: 1; }
    .compliance-center { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .page-number-box { display: inline-flex; align-items: center; gap: 0.35rem; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 999px; padding: 0.15rem 0.65rem; font-size: 0.68rem; font-weight: 700; color: #0F172A; }
    .compliance-right { font-family: var(--font-latin) !important; text-align: end; flex: 1; }

    /* Print Media Queries */
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 12mm 10mm;
      @bottom-center {
        content: "صفحة " counter(page) " من " counter(pages);
        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        font-size: 7.5pt;
        font-weight: 700;
        color: #475569;
      }
    }

    @media print {
      body * { visibility: hidden !important; }
      .print-modal-backdrop, .print-modal-backdrop * { visibility: visible !important; }
      .no-print { display: none !important; }

      .print-modal-backdrop {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        min-height: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        background: #FFFFFF !important;
        overflow: visible !important;
        z-index: 999999 !important;
      }

      .print-preview-dialog { max-width: 100% !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
      .print-paper-container { padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
      .official-statement-sheet { width: 100% !important; min-height: auto !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important; }

      .statement-print-table { page-break-inside: auto !important; break-inside: auto !important; }
      .statement-print-table thead { display: table-header-group !important; }
      .statement-print-table tr { page-break-inside: avoid !important; break-inside: avoid !important; }
      .statement-tafqeet-box, .statement-signatures-matrix, .statement-compliance-footer { page-break-inside: avoid !important; break-inside: avoid !important; }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `]
})
export class GeneralLedgerComponent implements OnInit {
  glService = inject(GeneralLedgerService);
  chartService = inject(ChartOfAccountsService);
  settingsService = inject(FinancialSettingsService);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);
  tafqeet = inject(TafqeetService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  activeView = signal<'overview' | 'statement'>('overview');
  loading = signal<boolean>(false);

  // Filters state
  fromDate: string = `${new Date().getFullYear()}-01-01`;
  toDate: string = this.formatLocalDate(new Date());
  searchTerm: string = '';
  selectedCostCenterId: string = '';
  selectedAccountId: string = '';

  private formatLocalDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Data state
  overviewReport = signal<GeneralLedgerReport | null>(null);
  currentStatement = signal<AccountStatement | null>(null);

  // Reference data
  postableAccounts: AccountDto[] = [];
  costCenters: CostCenter[] = [];

  // Print Modal
  showPrintModal = false;
  currentPrintDate = new Date();

  ngOnInit() {
    this.loadReferenceData();

    // Check query params for initial account or view
    this.route.queryParams.subscribe(params => {
      if (params['accountId']) {
        this.selectedAccountId = params['accountId'];
        this.activeView.set('statement');
        this.loadAccountStatement();
      } else {
        this.loadOverview();
      }
    });
  }

  loadReferenceData() {
    const companyId = this.companyContext.activeCompany()?.id;

    // Load accounts
    this.chartService.loadAccountsTree(companyId).subscribe({
      next: (tree) => {
        const flattened: AccountDto[] = [];
        const extractPostable = (nodes: AccountDto[]) => {
          for (const node of nodes) {
            if (node.isPostable) flattened.push(node);
            if (node.subAccounts && node.subAccounts.length > 0) extractPostable(node.subAccounts);
          }
        };
        extractPostable(tree);
        this.postableAccounts = flattened.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      }
    });

    // Load cost centers
    this.settingsService.getOverview(companyId).subscribe({
      next: (overview) => {
        this.costCenters = overview.costCenters || [];
      }
    });
  }

  switchView(view: 'overview' | 'statement') {
    this.activeView.set(view);
    if (view === 'overview') {
      this.loadOverview();
    } else {
      if (!this.selectedAccountId && this.postableAccounts.length > 0) {
        this.selectedAccountId = this.postableAccounts[0].id;
      }
      if (this.selectedAccountId) {
        this.loadAccountStatement();
      }
    }
  }

  loadOverview() {
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany()?.id;

    this.glService.getOverview({
      companyId,
      fromDate: this.fromDate,
      toDate: this.toDate,
      searchTerm: this.searchTerm || undefined,
      costCenterId: this.selectedCostCenterId || undefined,
      includeZeroBalances: true
    }).subscribe({
      next: (report) => {
        this.overviewReport.set(report);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadAccountStatement() {
    if (!this.selectedAccountId) return;
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany()?.id;

    this.glService.getAccountStatement(this.selectedAccountId, {
      companyId,
      fromDate: this.fromDate,
      toDate: this.toDate,
      costCenterId: this.selectedCostCenterId || undefined
    }).subscribe({
      next: (statement) => {
        this.currentStatement.set(statement);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onFilterChanged() {
    if (this.activeView() === 'overview') {
      this.loadOverview();
    } else {
      this.loadAccountStatement();
    }
  }

  onAccountSelected() {
    this.loadAccountStatement();
  }

  drilldownToStatement(accountId: string) {
    this.selectedAccountId = accountId;
    this.activeView.set('statement');
    this.loadAccountStatement();
  }

  setPreset(preset: 'thisMonth' | 'thisQuarter' | 'thisYear') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (preset === 'thisMonth') {
      this.fromDate = this.formatLocalDate(new Date(year, month, 1));
      this.toDate = this.formatLocalDate(new Date(year, month + 1, 0));
    } else if (preset === 'thisQuarter') {
      const q = Math.floor(month / 3);
      this.fromDate = this.formatLocalDate(new Date(year, q * 3, 1));
      this.toDate = this.formatLocalDate(new Date(year, (q + 1) * 3, 0));
    } else if (preset === 'thisYear') {
      this.fromDate = `${year}-01-01`;
      this.toDate = `${year}-12-31`;
    }

    this.onFilterChanged();
  }

  isLedgerBalanced(): boolean {
    const report = this.overviewReport();
    if (!report) return true;
    return Math.abs(report.totalPeriodDebit - report.totalPeriodCredit) < 0.01;
  }

  getEntryTypeLabel(type: number): string {
    const isAr = this.langService.currentLang() === 'ar';
    switch (type) {
      case 1: return isAr ? 'قيد يومية عامة' : 'General Journal';
      case 2: return isAr ? 'قيد افتتاحي' : 'Opening Entry';
      case 3: return isAr ? 'قيد تسوية جردية' : 'Adjustment Entry';
      case 4: return isAr ? 'قيد إقفال ختامي' : 'Closing Entry';
      default: return isAr ? 'قيد محاسبي' : 'Journal Entry';
    }
  }

  openJournalVoucherPreview(entryId: string) {
    this.router.navigate(['/accounting/journal-entries'], { queryParams: { previewId: entryId } });
  }

  openPrintStatementModal() {
    this.currentPrintDate = new Date();
    this.showPrintModal = true;
  }

  closePrintModal() {
    this.showPrintModal = false;
  }

  triggerPrint() {
    window.print();
  }

  getTafqeetClosing(): string {
    const balance = this.currentStatement()?.closingBalance || 0;
    return this.tafqeet.toArabicCurrency(balance, 'ريال سعودي', 'هللة');
  }

  exportToCsv() {
    if (this.activeView() === 'overview') {
      const accounts = this.overviewReport()?.accounts || [];
      let csv = 'رقم الحساب,اسم الحساب,طبيعة الحساب,الرصيد الافتتاحي,مدين الفترة,دائن الفترة,صافي الحركة,الرصيد الختامي\n';
      accounts.forEach(a => {
        csv += `"${a.accountCode}","${a.nameAr}","${a.accountNature === 1 ? 'مدين' : 'دائن'}",${a.openingBalance},${a.periodDebit},${a.periodCredit},${a.netMovement},${a.closingBalance}\n`;
      });
      this.downloadCsv(csv, `GeneralLedger_${this.fromDate}_${this.toDate}.csv`);
    } else {
      const stmt = this.currentStatement();
      if (!stmt) return;
      let csv = 'م,التاريخ,رقم السند,نوع القيد,البيان,مركز التكلفة,مدين,دائن,الرصيد المتحرك\n';
      csv += `0,${this.fromDate},—,رصيد افتتاحي,"رصيد افتتاحي منقول",—,0,0,${stmt.openingBalance}\n`;
      stmt.lines.forEach((l, idx) => {
        csv += `${idx + 1},${l.entryDate},"${l.entryNumber}","${this.getEntryTypeLabel(l.entryType)}","${l.description}","${l.costCenterName || ''}",${l.debit},${l.credit},${l.runningBalance}\n`;
      });
      this.downloadCsv(csv, `Statement_${stmt.account.accountCode}_${this.fromDate}_${this.toDate}.csv`);
    }
  }

  private downloadCsv(csvContent: string, fileName: string) {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
