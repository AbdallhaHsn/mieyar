import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { 
  FinancialSettingsService, 
  FinancialSettingsOverview, 
  FiscalYear, 
  FiscalPeriod, 
  CostCenter, 
  CompanyFinancialSettings,
  YearEndAuditCheck,
  YearEndClosingResult
} from '../../../core/services/financial-settings.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-financial-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="settings-page" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Top Header Strip -->
      <header class="page-header">
        <div class="header-titles">
          <div class="badge-icon">
            <i class="pi pi-sliders-h"></i>
          </div>
          <div>
            <h1 class="page-title">
              {{ 'accounting.financialSettings.ui.financialSettingsFiscalPeriodsCost' | translate }}
            </h1>
            <p class="page-subtitle">
              {{ 'accounting.financialSettings.ui.manageYearsSubtitle' | translate }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-refresh" (click)="loadData()" [title]="'accounting.financialSettings.ui.refresh' | translate">
            <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
            <span>{{ 'accounting.financialSettings.ui.refresh1' | translate }}</span>
          </button>
        </div>
      </header>

      <!-- Navigation Tabs -->
      <nav class="settings-tabs">
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'periods'" 
          (click)="activeTab.set('periods')">
          <i class="pi pi-calendar"></i>
          <span>{{ 'accounting.financialSettings.ui.fiscalYearsPeriods' | translate }}</span>
          <span class="tab-badge" *ngIf="overview()?.activeFiscalYear">
            {{ overview()?.activeFiscalYear?.yearNumber }}
          </span>
        </button>

        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'cost-centers'" 
          (click)="activeTab.set('cost-centers')">
          <i class="pi pi-tags"></i>
          <span>{{ 'accounting.financialSettings.ui.costCenters' | translate }}</span>
          <span class="tab-badge" *ngIf="overview()?.costCenters">
            {{ overview()?.costCenters?.length }}
          </span>
        </button>

        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'policies'" 
          (click)="activeTab.set('policies')">
          <i class="pi pi-shield"></i>
          <span>{{ 'accounting.financialSettings.ui.financialControlsPolicies' | translate }}</span>
        </button>

        <button 
          class="tab-btn tab-btn-closing" 
          [class.active]="activeTab() === 'closing'" 
          (click)="openClosingTab()">
          <i class="pi pi-lock"></i>
          <span>{{ 'accounting.financialSettings.ui.yearendClosingRollforward' | translate }}</span>
        </button>

        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'currencies'" 
          (click)="activeTab.set('currencies'); loadCurrencies()">
          <i class="pi pi-dollar"></i>
          <span>{{ 'accounting.financialSettings.ui.exchangeRatesIas21' | translate }}</span>
        </button>
      </nav>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-state">
        <i class="pi pi-spin pi-spinner text-emerald text-3xl"></i>
        <span>{{ 'accounting.financialSettings.ui.loadingFinancialSettings' | translate }}</span>
      </div>

      <!-- Tab 1: Fiscal Years & Periods -->
      <section *ngIf="!loading() && activeTab() === 'periods'" class="tab-content">
        <!-- Fiscal Year Summary Bar -->
        <div class="year-card" *ngIf="selectedYear()">
          <div class="year-info">
            <div class="year-badge">
              <span class="year-number">{{ selectedYear()?.yearNumber }}</span>
              <span class="year-state" [class.closed]="selectedYear()?.isClosed">
                {{ selectedYear()?.isClosed 
                  ? ('accounting.financialSettings.ui.closedYear' | translate)
                  : ('accounting.financialSettings.ui.activeYear' | translate) }}
              </span>
            </div>
            <div class="year-details">
              <h3>{{ langService.currentLang() === 'ar' ? selectedYear()?.nameAr : selectedYear()?.nameEn }}</h3>
              <div class="dates-meta">
                <span><i class="pi pi-calendar-plus text-emerald"></i> {{ 'accounting.financialSettings.ui.from' | translate }} {{ selectedYear()?.startDate | date:'yyyy-MM-dd' }}</span>
                <span><i class="pi pi-calendar-times text-cyan"></i> {{ 'accounting.financialSettings.ui.to' | translate }} {{ selectedYear()?.endDate | date:'yyyy-MM-dd' }}</span>
                <span><i class="pi pi-list"></i> {{ selectedYear()?.periods?.length }} {{ 'accounting.financialSettings.ui.periods' | translate }}</span>
              </div>
            </div>
          </div>

          <div class="year-actions">
            <!-- Year Selector Dropdown if multiple years exist -->
            <select 
              *ngIf="(overview()?.allFiscalYears?.length || 0) > 1" 
              class="year-select" 
              [ngModel]="selectedYear()?.id" 
              (ngModelChange)="onYearChange($event)">
              <option *ngFor="let yr of overview()?.allFiscalYears" [value]="yr.id">
                {{ yr.yearNumber }} - {{ langService.currentLang() === 'ar' ? yr.nameAr : yr.nameEn }}
              </option>
            </select>

            <button class="btn-primary" (click)="openCreateYearModal()">
              <i class="pi pi-plus"></i>
              <span>{{ 'accounting.financialSettings.ui.newFiscalYear' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Periods Table -->
        <div class="periods-panel">
          <div class="panel-header">
            <h4>{{ 'accounting.financialSettings.ui.accountingPeriodsLockStatus' | translate }}</h4>
            <div class="status-legend">
              <span class="legend-pill open"><i class="pi pi-check-circle"></i> {{ 'accounting.financialSettings.ui.open' | translate }}</span>
              <span class="legend-pill locked"><i class="pi pi-lock"></i> {{ 'accounting.financialSettings.ui.locked' | translate }}</span>
              <span class="legend-pill closed"><i class="pi pi-times-circle"></i> {{ 'accounting.financialSettings.ui.closed' | translate }}</span>
            </div>
          </div>

          <div class="table-responsive">
            <table class="periods-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ 'accounting.financialSettings.ui.periodName' | translate }}</th>
                  <th>{{ 'accounting.financialSettings.ui.startDate' | translate }}</th>
                  <th>{{ 'accounting.financialSettings.ui.endDate' | translate }}</th>
                  <th>{{ 'accounting.financialSettings.ui.type' | translate }}</th>
                  <th>{{ 'accounting.financialSettings.ui.status' | translate }}</th>
                  <th>{{ 'accounting.financialSettings.ui.actions' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of selectedYear()?.periods" [class.closing-row]="p.isClosingPeriod">
                  <td class="col-num">{{ p.periodNumber }}</td>
                  <td class="col-name">
                    <strong>{{ langService.currentLang() === 'ar' ? p.periodNameAr : p.periodNameEn }}</strong>
                  </td>
                  <td>{{ p.startDate | date:'yyyy-MM-dd' }}</td>
                  <td>{{ p.endDate | date:'yyyy-MM-dd' }}</td>
                  <td>
                    <span *ngIf="p.isClosingPeriod" class="badge-period-13">
                      <i class="pi pi-star"></i> {{ 'accounting.financialSettings.ui.period13' | translate }}
                    </span>
                    <span *ngIf="!p.isClosingPeriod" class="text-muted">
                      {{ 'accounting.financialSettings.ui.monthly' | translate }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="getStatusClass(p.status)">
                      <i class="pi" [ngClass]="getStatusIcon(p.status)"></i>
                      {{ getStatusLabel(p.status) }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <div class="action-btn-group">
                      <button 
                        class="btn-status open" 
                        [class.active]="p.status === 1" 
                        [disabled]="p.status === 1"
                        (click)="changePeriodStatus(p, 1)" 
                        [title]="'accounting.financialSettings.ui.open1' | translate">
                        <i class="pi pi-lock-open"></i>
                      </button>
                      <button 
                        class="btn-status lock" 
                        [class.active]="p.status === 2" 
                        [disabled]="p.status === 2"
                        (click)="changePeriodStatus(p, 2)" 
                        [title]="'accounting.financialSettings.ui.lock' | translate">
                        <i class="pi pi-lock"></i>
                      </button>
                      <button 
                        class="btn-status close" 
                        [class.active]="p.status === 3" 
                        [disabled]="p.status === 3"
                        (click)="changePeriodStatus(p, 3)" 
                        [title]="'accounting.financialSettings.ui.close' | translate">
                        <i class="pi pi-ban"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Tab 2: Cost Centers -->
      <section *ngIf="!loading() && activeTab() === 'cost-centers'" class="tab-content">
        <!-- Cost Centers Policy Card -->
        <div class="policy-quick-card">
          <div class="policy-meta">
            <i class="pi pi-info-circle text-emerald text-xl"></i>
            <div>
              <strong>{{ 'accounting.financialSettings.ui.costCenterEntryEnforcement' | translate }}</strong>
              <span>
                {{ getCostCenterPolicyLabel() }}
              </span>
            </div>
          </div>
          <button class="btn-primary" (click)="openCreateCostCenterModal()">
            <i class="pi pi-plus"></i>
            <span>{{ 'accounting.financialSettings.ui.newCostCenter' | translate }}</span>
          </button>
        </div>

        <!-- Cost Centers Table -->
        <div class="cost-centers-panel">
          <table class="cc-table">
            <thead>
              <tr>
                <th>{{ 'accounting.financialSettings.ui.code' | translate }}</th>
                <th>{{ 'accounting.financialSettings.ui.arabicName' | translate }}</th>
                <th>{{ 'accounting.financialSettings.ui.englishName' | translate }}</th>
                <th>{{ 'accounting.financialSettings.ui.description' | translate }}</th>
                <th>{{ 'accounting.financialSettings.ui.status1' | translate }}</th>
                <th>{{ 'accounting.financialSettings.ui.actions1' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cc of overview()?.costCenters">
                <td class="col-code">
                  <span class="code-pill">{{ cc.code }}</span>
                </td>
                <td class="col-name"><strong>{{ cc.nameAr }}</strong></td>
                <td class="col-name-en">{{ cc.nameEn }}</td>
                <td class="col-desc">{{ cc.description || '—' }}</td>
                <td>
                  <span class="active-pill">
                    <span class="dot"></span>
                    {{ 'accounting.financialSettings.ui.active' | translate }}
                  </span>
                </td>
                <td>
                  <button class="btn-del" (click)="deleteCostCenter(cc)" [title]="'accounting.financialSettings.ui.delete' | translate">
                    <i class="pi pi-trash"></i>
                  </button>
                </td>
              </tr>
              <tr *ngIf="!overview()?.costCenters?.length">
                <td colspan="6" class="text-center py-6 text-muted">
                  {{ 'accounting.financialSettings.ui.noCostCentersFound' | translate }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Tab 3: Policies & Financial Controls -->
      <section *ngIf="!loading() && activeTab() === 'policies'" class="tab-content">
        <div class="policies-grid">
          
          <!-- Policy 1: Cost Centers Policy -->
          <div class="policy-box">
            <div class="box-header">
              <i class="pi pi-tags text-emerald"></i>
              <h4>{{ 'accounting.financialSettings.ui.costCentersPolicy' | translate }}</h4>
            </div>
            <p class="box-desc">
              {{ 'accounting.financialSettings.ui.costCenterRuleDesc' | translate }}
            </p>
            <div class="radio-options">
              <label class="radio-item">
                <input type="radio" name="ccPolicy" [value]="1" [(ngModel)]="policyModel.costCenterPolicy" />
                <span>{{ 'accounting.financialSettings.ui.mandatoryForRevenueExpenseAccounts' | translate }}</span>
              </label>
              <label class="radio-item">
                <input type="radio" name="ccPolicy" [value]="2" [(ngModel)]="policyModel.costCenterPolicy" />
                <span>{{ 'accounting.financialSettings.ui.optionalForAllAccounts' | translate }}</span>
              </label>
              <label class="radio-item">
                <input type="radio" name="ccPolicy" [value]="3" [(ngModel)]="policyModel.costCenterPolicy" />
                <span>{{ 'accounting.financialSettings.ui.disabled' | translate }}</span>
              </label>
            </div>
          </div>

          <!-- Policy 2: Currency & Calendar -->
          <div class="policy-box">
            <div class="box-header">
              <i class="pi pi-globe text-cyan"></i>
              <h4>{{ 'accounting.financialSettings.ui.currencyCalendar' | translate }}</h4>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>{{ 'accounting.financialSettings.ui.baseCurrency' | translate }}</label>
                <select class="form-select" [(ngModel)]="policyModel.defaultCurrency">
                  <option value="SAR">{{ 'ui.financialSettings.49620d' | translate }}</option>
                  <option value="USD">{{ 'accounting.accountCreate.usdCurrency' | translate }}</option>
                  <option value="EUR">{{ 'accounting.accountCreate.eurCurrency' | translate }}</option>
                  <option value="AED">{{ 'accounting.accountCreate.aedCurrency' | translate }}</option>
                </select>
              </div>

              <div class="form-field">
                <label>{{ 'accounting.financialSettings.ui.calendarSystem' | translate }}</label>
                <select class="form-select" [(ngModel)]="policyModel.calendarType">
                  <option [value]="1">{{ 'accounting.financialSettings.ui.gregorian' | translate }}</option>
                  <option [value]="2">{{ 'accounting.financialSettings.ui.hijri' | translate }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Policy 3: Backdated Entries & Security -->
          <div class="policy-box">
            <div class="box-header">
              <i class="pi pi-shield text-danger"></i>
              <h4>{{ 'accounting.financialSettings.ui.backdatedEntriesAuditSecurity' | translate }}</h4>
            </div>
            <p class="box-desc">
              {{ 'accounting.financialSettings.ui.backdatedRuleDesc' | translate }}
            </p>
            <div class="switch-row">
              <label class="switch-container">
                <input type="checkbox" [(ngModel)]="policyModel.allowBackdatedEntries" />
                <span class="slider"></span>
              </label>
              <span>{{ 'accounting.financialSettings.ui.allowBackdatedEntries' | translate }}</span>
            </div>

            <div *ngIf="policyModel.allowBackdatedEntries" class="form-field mt-3">
              <label>{{ 'accounting.financialSettings.ui.maxBackdatedDays' | translate }}</label>
              <input type="number" class="form-input w-36" [(ngModel)]="policyModel.maxBackdatedDays" min="1" max="90" />
            </div>
          </div>

          <!-- Policy 4: Period 13 Adjustments -->
          <div class="policy-box">
            <div class="box-header">
              <i class="pi pi-calendar-plus text-emerald"></i>
              <h4>{{ 'accounting.financialSettings.ui.closingAdjustmentsPeriod13' | translate }}</h4>
            </div>
            <p class="box-desc">
              {{ 'accounting.financialSettings.ui.period13Desc' | translate }}
            </p>
            <div class="switch-row">
              <label class="switch-container">
                <input type="checkbox" [(ngModel)]="policyModel.include13thClosingPeriod" />
                <span class="slider"></span>
              </label>
              <span>{{ 'accounting.financialSettings.ui.enable13thAdjustmentPeriod' | translate }}</span>
            </div>
          </div>

        </div>

        <div class="save-bar">
          <button class="btn-save-policies" (click)="savePolicies()" [disabled]="savingPolicies()">
            <i class="pi pi-check" *ngIf="!savingPolicies()"></i>
            <i class="pi pi-spin pi-spinner" *ngIf="savingPolicies()"></i>
            <span>{{ 'accounting.financialSettings.ui.saveFinancialPolicies' | translate }}</span>
          </button>
        </div>
      </section>

      <!-- Tab 4: Year-End Closing & Roll-Forward -->
      <section *ngIf="!loading() && activeTab() === 'closing'" class="tab-content">
        <div class="closing-container">
          
          <!-- Header Card & Year Selector -->
          <div class="closing-header-card">
            <div class="closing-header-info">
              <div class="icon-wrap-closing">
                <i class="pi pi-book"></i>
              </div>
              <div>
                <h3>{{ 'accounting.financialSettings.ui.yearendClosingOpeningBalancesRollforward' | translate }}</h3>
                <p>{{ 'accounting.financialSettings.ui.closeNominalAccountsToRetained' | translate }}</p>
              </div>
            </div>

            <div class="closing-year-picker">
              <label>{{ 'accounting.financialSettings.ui.fiscalYear' | translate }}</label>
              <select class="form-select font-mono" [ngModel]="selectedYear()?.id" (ngModelChange)="onYearChange($event); loadClosingPreview()">
                @for (y of overview()?.allFiscalYears; track y.id) {
                  <option [value]="y.id">{{ y.nameAr }} ({{ y.yearNumber }}) {{ y.isClosed ? ('ui.financialSettings.54c96e' | translate) : ('ui.financialSettings.dabd00' | translate) }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Loading Preview Spinner -->
          <div *ngIf="loadingPreview()" class="loading-state py-8">
            <i class="pi pi-spin pi-spinner text-emerald text-3xl"></i>
            <span>{{ 'accounting.financialSettings.ui.auditingBalancesForYearendClosing' | translate }}</span>
          </div>

          <!-- Preview Content -->
          <div *ngIf="!loadingPreview() && closingPreview()" class="closing-body">
            
            <!-- Audit Checklist KPI Strip (4 Columns) -->
            <div class="audit-kpi-grid">
              
              <div class="audit-card" [class.card-clean]="closingPreview()?.draftJournalEntriesCount === 0" [class.card-alert]="closingPreview()!.draftJournalEntriesCount > 0">
                <div class="audit-icon">{{ closingPreview()?.draftJournalEntriesCount === 0 ? '✓' : '⚠' }}</div>
                <div class="audit-data">
                  <span class="audit-lbl">{{ 'accounting.financialSettings.ui.draftJournalEntries' | translate }}</span>
                  <span class="audit-val font-mono">{{ closingPreview()?.draftJournalEntriesCount }}</span>
                  <span class="audit-desc">{{ closingPreview()?.draftJournalEntriesCount === 0 ? ('accounting.financialSettings.ui.allEntriesPosted' | translate) : ('accounting.financialSettings.ui.mustPostBeforeClosing' | translate) }}</span>
                </div>
              </div>

              <div class="audit-card card-info">
                <div class="audit-icon">📅</div>
                <div class="audit-data">
                  <span class="audit-lbl">{{ 'accounting.financialSettings.ui.openFiscalPeriods' | translate }}</span>
                  <span class="audit-val font-mono">{{ closingPreview()?.openPeriodsCount }}</span>
                  <span class="audit-desc">{{ 'accounting.financialSettings.ui.willBeClosedOnYearend' | translate }}</span>
                </div>
              </div>

              <div class="audit-card card-equity">
                <div class="audit-icon">🏛️</div>
                <div class="audit-data">
                  <span class="audit-lbl">{{ 'accounting.financialSettings.ui.targetRetainedEarnings' | translate }}</span>
                  <span class="audit-val font-mono text-sm">{{ closingPreview()?.defaultRetainedEarningsAccountCode }}</span>
                  <span class="audit-desc">{{ closingPreview()?.defaultRetainedEarningsAccountNameAr }}</span>
                </div>
              </div>

              <div class="audit-card" [class.card-profit]="closingPreview()!.projectedNetIncome >= 0" [class.card-loss]="closingPreview()!.projectedNetIncome < 0">
                <div class="audit-icon">{{ closingPreview()!.projectedNetIncome >= 0 ? '📈' : '📉' }}</div>
                <div class="audit-data">
                  <span class="audit-lbl">{{ 'accounting.financialSettings.ui.projectedNetIncome' | translate }}</span>
                  <span class="audit-val font-mono font-bold">{{ closingPreview()?.projectedNetIncome | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></span>
                  <span class="audit-desc font-serif">{{ closingPreview()?.projectedNetIncomeTafqeetAr }}</span>
                </div>
              </div>

            </div>

            <!-- Audit Alerts (Blocking Errors & Warnings) -->
            <div *ngIf="closingPreview()?.blockingErrors?.length" class="alert-box alert-danger-box">
              <div class="alert-title">
                <i class="pi pi-times-circle"></i>
                <strong>{{ 'accounting.financialSettings.ui.closingBlockersMustResolveFirst' | translate }}</strong>
              </div>
              <ul>
                @for (err of closingPreview()?.blockingErrors; track err) {
                  <li>{{ err }}</li>
                }
              </ul>
            </div>

            <div *ngIf="closingPreview()?.warnings?.length" class="alert-box alert-warning-box">
              <div class="alert-title">
                <i class="pi pi-exclamation-triangle"></i>
                <strong>{{ 'accounting.financialSettings.ui.auditWarnings' | translate }}</strong>
              </div>
              <ul>
                @for (warn of closingPreview()?.warnings; track warn) {
                  <li>{{ warn }}</li>
                }
              </ul>
            </div>

            <!-- Closing Action Box -->
            <div class="closing-action-box">
              
              <div *ngIf="selectedYear()?.isClosed" class="already-closed-state">
                <div class="closed-stamp">
                  <i class="pi pi-lock text-3xl"></i>
                  <div>
                    <h4>{{ 'accounting.financialSettings.ui.fiscalYearIsFullyClosed' | translate }}</h4>
                    <p>{{ 'accounting.financialSettings.ui.closingEntryAndOpeningBalances' | translate }}</p>
                  </div>
                </div>
                <button class="btn-reopen" (click)="confirmReopenYear()">
                  <i class="pi pi-unlock"></i>
                  <span>{{ 'accounting.financialSettings.ui.reopenFiscalYear' | translate }}</span>
                </button>
              </div>

              <div *ngIf="!selectedYear()?.isClosed" class="open-action-state">
                <div class="roll-forward-option">
                  <label class="checkbox-row">
                    <input type="checkbox" [(ngModel)]="generateNextYearOpening" />
                    <span><strong>{{ 'accounting.financialSettings.ui.createNextFiscalYearRoll' | translate }}</strong></span>
                  </label>
                  <p class="text-xs text-muted">{{ 'accounting.financialSettings.ui.generatesOpeningBalancedEntryFor' | translate }}</p>
                </div>

                <div class="action-footer">
                  <button 
                    class="btn-execute-close" 
                    [disabled]="!closingPreview()?.canClose || executingClose()" 
                    (click)="confirmCloseYear()">
                    <i class="pi pi-check-circle" *ngIf="!executingClose()"></i>
                    <i class="pi pi-spin pi-spinner" *ngIf="executingClose()"></i>
                    <span>{{ executingClose() ? ('accounting.financialSettings.ui.executingClosing' | translate) : ('accounting.financialSettings.ui.executeYearendClosing' | translate) }}</span>
                  </button>
                </div>
              </div>

            </div>

            <!-- Success Closing Result Details Banner -->
            <div *ngIf="closingResult()" class="closing-result-card">
              <div class="res-head">
                <i class="pi pi-check-circle text-emerald text-2xl"></i>
                <div>
                  <h4>{{ 'accounting.financialSettings.ui.yearendClosedSuccessfully' | translate }}</h4>
                  <p>{{ 'accounting.financialSettings.ui.allNominalAccountsZeroedOut' | translate }}</p>
                </div>
              </div>
              <div class="res-details-grid">
                <div><strong>{{ 'ui.financialSettings.7222b1' | translate }}</strong> {{ closingResult()?.closingJournalEntryNumber }}</div>
                <div><strong>{{ 'ui.financialSettings.5aa5cf' | translate }}</strong> {{ closingResult()?.netProfitOrLoss | number:'1.2-2' }} {{ 'common.sar' | translate }}</div>
                <div><strong>{{ 'ui.financialSettings.0fdfeb' | translate }}</strong> {{ closingResult()?.openingJournalEntryNumber || '—' }}</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Tab 5: Multi-Currency & IAS 21 FX Revaluation -->
      <section *ngIf="!loading() && activeTab() === 'currencies'" class="tab-content">
        <div class="fiscal-summary-bar">
          <div class="year-info-strip">
            <span class="active-pill" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white;">IAS 21</span>
            <h3>{{ 'accounting.financialSettings.ui.foreignExchangeRatesIas21' | translate }}</h3>
            <span class="dates-range">{{ 'accounting.financialSettings.ui.functionalCurrencySar' | translate }}</span>
          </div>

          <div class="year-actions-strip">
            <button class="btn-primary" (click)="openCurrencyModal()">
              <i class="pi pi-plus"></i>
              <span>{{ 'accounting.financialSettings.ui.addUpdateRate' | translate }}</span>
            </button>
            <button class="btn-primary" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);" (click)="runFxRevaluation()">
              <i class="pi pi-bolt"></i>
              <span>{{ 'accounting.financialSettings.ui.runIas21Revaluation' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Currencies Table Card -->
        <div class="periods-card mt-3">
          <div class="card-header">
            <h4><i class="pi pi-dollar text-emerald me-2"></i>{{ 'accounting.financialSettings.ui.approvedCurrencyExchangeRatesSar' | translate }}</h4>
            <span class="badge-total">{{ currencyRates().length }} {{ 'accounting.financialSettings.ui.currencies' | translate }}</span>
          </div>

          <div *ngIf="loadingCurrencies()" class="loading-state">
            <i class="pi pi-spin pi-spinner text-emerald text-3xl"></i>
            <span>{{ 'accounting.financialSettings.ui.loadingExchangeRates' | translate }}</span>
          </div>

          <div class="table-responsive" *ngIf="!loadingCurrencies()">
            <table class="erp-dense-table">
              <thead>
                <tr>
                  <th style="width: 100px;">{{ 'accounting.financialSettings.ui.code1' | translate }}</th>
                  <th>{{ 'accounting.financialSettings.ui.nameArabic' | translate }}</th>
                  <th>{{ 'accounting.financialSettings.ui.nameEnglish' | translate }}</th>
                  <th style="text-align: left; width: 180px;">{{ 'accounting.financialSettings.ui.rateToSar' | translate }}</th>
                  <th style="width: 140px;">{{ 'accounting.financialSettings.ui.effectiveDate' | translate }}</th>
                  <th style="text-align: center; width: 100px;">{{ 'accounting.financialSettings.ui.status1' | translate }}</th>
                  <th style="text-align: center; width: 100px;">{{ 'accounting.financialSettings.ui.actions1' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let rate of currencyRates()">
                  <td class="font-mono font-bold" style="color: #0284c7; font-size: 1.05rem;">{{ rate.currencyCode }}</td>
                  <td><strong>{{ rate.currencyNameAr }}</strong></td>
                  <td class="text-muted">{{ rate.currencyNameEn }}</td>
                  <td class="font-mono font-bold text-emerald" style="text-align: left; font-size: 1.05rem;">
                    1 {{ rate.currencyCode }} = {{ rate.exchangeRateToSar | number:'1.4-4' }} SAR
                  </td>
                  <td>{{ rate.effectiveDate | date:'yyyy-MM-dd' }}</td>
                  <td style="text-align: center;">
                    <span class="status-pill status-posted">{{ 'accounting.financialSettings.ui.active1' | translate }}</span>
                  </td>
                  <td style="text-align: center;">
                    <button class="btn-icon" (click)="openCurrencyModal(rate)" [title]="'accounting.financialSettings.ui.editRate' | translate">
                      <i class="pi pi-pencil"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Currency Rate Modal -->
      <div class="modal-backdrop" *ngIf="showCurrencyModal()" (click)="showCurrencyModal.set(false)">
        <div class="modal-card" style="max-width: 500px;" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="modal-title-box">
              <i class="pi pi-dollar text-emerald"></i>
              <h3>{{ 'accounting.financialSettings.ui.updateExchangeRate' | translate }}</h3>
            </div>
            <button class="btn-close" (click)="showCurrencyModal.set(false)"><i class="pi pi-times"></i></button>
          </header>

          <section class="modal-body">
            <div class="form-grid">
              <div class="form-field">
                <label>{{ 'accounting.financialSettings.ui.currencyCode' | translate }}</label>
                <input type="text" [(ngModel)]="currencyForm.currencyCode" placeholder="USD, EUR, GBP..." />
              </div>

              <div class="form-field">
                <label>{{ 'accounting.financialSettings.ui.exchangeRateToSar' | translate }}</label>
                <input type="number" step="0.0001" [(ngModel)]="currencyForm.exchangeRateToSar" placeholder="3.7500" />
              </div>

              <div class="form-field full">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <label style="margin-bottom: 0;">{{ 'accounting.financialSettings.ui.currencyName' | translate }}
                    <small class="text-muted ms-1 me-1" style="font-weight: normal;">{{ 'common.arOrEn' | translate }}</small>
                  </label>
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span *ngIf="currencyBgTranslation" style="font-size: 0.72rem; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1px 6px; border-radius: 4px; font-weight: 600;">
                      {{ currencyBgTranslation }}
                    </span>
                    <button type="button" class="btn-micro-translate" (click)="forceRetranslateCurrency()" [title]="'projects.hub.workspace.wbs.retranslate' | translate" style="border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.72rem;">
                      <i class="pi pi-globe"></i>
                    </button>
                  </div>
                </div>
                <input type="text" [ngModel]="unifiedCurrencyName || currencyForm.currencyNameAr || currencyForm.currencyNameEn" (ngModelChange)="onUnifiedCurrencyNameChange($event)" [placeholder]="'ui.financialSettings.83a983' | translate" required />
              </div>

              <div class="form-field full">
                <label>{{ 'accounting.financialSettings.ui.effectiveDate1' | translate }}</label>
                <input type="date" [(ngModel)]="currencyForm.effectiveDate" />
              </div>
            </div>
          </section>

          <footer class="modal-footer">
            <button class="btn-secondary" (click)="showCurrencyModal.set(false)">{{ 'accounting.financialSettings.ui.cancel' | translate }}</button>
            <button class="btn-primary" (click)="saveCurrencyRate()">
              <i class="pi pi-check"></i>
              <span>{{ 'accounting.financialSettings.ui.saveRate' | translate }}</span>
            </button>
          </footer>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
      padding: 1.5rem;
      background: #F8FAFC;
      min-height: calc(100vh - 60px);
    }

    button, input, select, span, strong, h1, h2, h3, h4 {
      font-family: var(--font-arabic) !important;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      background: #FFFFFF;
      padding: 1.25rem 1.75rem;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .header-titles {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .badge-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .page-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 0.2rem;
    }

    .page-subtitle {
      font-size: 0.85rem;
      color: #64748B;
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 1rem;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-refresh:hover {
      background: #F1F5F9;
      border-color: #94A3B8;
    }

    /* Tabs */
    .settings-tabs {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 0.75rem;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 1.25rem;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .tab-btn:hover {
      color: #0F172A;
      border-color: #CBD5E1;
    }

    .tab-btn.active {
      background: #ECFDF5;
      color: #059669;
      border-color: #10B981;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.15);
    }

    .tab-badge {
      padding: 0.15rem 0.5rem;
      background: #10B981;
      color: #FFFFFF;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      font-family: var(--font-latin) !important;
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1rem;
      color: #64748B;
      font-size: 0.95rem;
    }

    /* Tab 1: Fiscal Year Card */
    .year-card {
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      padding: 1.25rem 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .year-info {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .year-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      background: #F1F5F9;
      border-radius: 14px;
      border: 1.5px solid #CBD5E1;
    }

    .year-number {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0F172A;
      font-family: var(--font-latin) !important;
    }

    .year-state {
      font-size: 0.65rem;
      font-weight: 700;
      color: #059669;
    }

    .year-state.closed {
      color: #EF4444;
    }

    .year-details h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 0.35rem;
    }

    .dates-meta {
      display: flex;
      gap: 1.25rem;
      font-size: 0.82rem;
      color: #64748B;
    }

    .dates-meta span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .year-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .year-select {
      height: 40px;
      padding: 0 1rem;
      border: 1.5px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #0F172A;
      background: #FFFFFF;
      outline: none;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 40px;
      padding: 0 1.25rem;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
      transition: all 0.2s ease;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
    }

    /* Periods Panel */
    .periods-panel {
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .panel-header h4 {
      font-size: 1rem;
      font-weight: 700;
      color: #0F172A;
    }

    .status-legend {
      display: flex;
      gap: 0.75rem;
    }

    .legend-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-weight: 600;
    }

    .legend-pill.open { background: #ECFDF5; color: #059669; }
    .legend-pill.locked { background: #FFFBEB; color: #D97706; }
    .legend-pill.closed { background: #F1F5F9; color: #64748B; }

    .table-responsive {
      overflow-x: auto;
    }

    .periods-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .periods-table th {
      background: #F8FAFC;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      text-align: start;
      border-bottom: 1.5px solid #E2E8F0;
    }

    .periods-table td {
      padding: 0.85rem 1rem;
      font-size: 0.85rem;
      color: #334155;
      border-bottom: 1px solid #F1F5F9;
      vertical-align: middle;
    }

    .periods-table tr:hover td {
      background: #FAFBFC;
    }

    .closing-row td {
      background: #F0FDF4;
    }

    .col-num {
      font-weight: 700;
      color: #94A3B8;
      font-family: var(--font-latin) !important;
    }

    .badge-period-13 {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.6rem;
      background: #ECFDF5;
      color: #059669;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .status-open { background: #ECFDF5; color: #059669; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-locked { background: #FFFBEB; color: #D97706; border: 1px solid rgba(217, 119, 6, 0.3); }
    .status-closed { background: #F1F5F9; color: #64748B; border: 1px solid #CBD5E1; }

    .action-btn-group {
      display: inline-flex;
      background: #F1F5F9;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }

    .btn-status {
      width: 32px;
      height: 30px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #64748B;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: all 0.15s ease;
    }

    .btn-status.active {
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .btn-status.open.active { color: #059669; }
    .btn-status.lock.active { color: #D97706; }
    .btn-status.close.active { color: #EF4444; }

    .btn-status:disabled {
      cursor: default;
    }

    /* Tab 2: Cost Centers */
    .policy-quick-card {
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      padding: 1.25rem 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .policy-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .policy-meta strong {
      color: #0F172A;
      margin-inline-end: 0.4rem;
    }

    .policy-meta span {
      color: #059669;
      font-weight: 700;
    }

    .cost-centers-panel {
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      padding: 1.5rem;
    }

    .cc-table {
      width: 100%;
      border-collapse: collapse;
    }

    .cc-table th {
      background: #F8FAFC;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      text-align: start;
      border-bottom: 1.5px solid #E2E8F0;
    }

    .cc-table td {
      padding: 0.85rem 1rem;
      font-size: 0.85rem;
      color: #334155;
      border-bottom: 1px solid #F1F5F9;
    }

    .code-pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      color: #0F172A;
      font-family: var(--font-latin) !important;
    }

    .active-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: #059669;
      font-weight: 600;
    }

    .active-pill .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
    }

    .btn-del {
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      padding: 0.3rem;
      border-radius: 6px;
      transition: all 0.15s ease;
    }

    .btn-del:hover {
      color: #EF4444;
      background: #FEF2F2;
    }

    /* Tab 3: Policies */
    .policies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .policy-box {
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      padding: 1.5rem;
    }

    .box-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.6rem;
    }

    .box-header h4 {
      font-size: 1rem;
      font-weight: 700;
      color: #0F172A;
    }

    .box-desc {
      font-size: 0.8rem;
      color: #64748B;
      line-height: 1.5;
      margin-bottom: 1rem;
    }

    .radio-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .radio-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.82rem;
      color: #334155;
      font-weight: 500;
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .form-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-field label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
    }

    .form-select, .form-input {
      height: 40px;
      padding: 0 0.75rem;
      border: 1.5px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #0F172A;
      background: #FFFFFF;
      outline: none;
    }

    .form-select:focus, .form-input:focus {
      border-color: #10B981;
    }

    .switch-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .switch-container {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .switch-container input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: #CBD5E1;
      transition: .2s;
      border-radius: 999px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #10B981;
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    .save-bar {
      display: flex;
      justify-content: flex-end;
    }

    .btn-save-policies {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 2rem;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
      transition: all 0.2s ease;
    }

    .btn-save-policies:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4);
    }

    .btn-save-policies:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    /* Tab 4: Year-End Closing Styles */
    .tab-btn-closing.active {
      background: #0f172a !important;
      color: #f8fafc !important;
      border-color: #0f172a !important;
    }

    .closing-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .closing-header-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      padding: 1.25rem 1.75rem;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .closing-header-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .icon-wrap-closing {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #FEF3C7;
      color: #D97706;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
    }

    .closing-header-info h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }

    .closing-header-info p {
      font-size: 0.8rem;
      color: #64748B;
      margin: 0.2rem 0 0 0;
    }

    .closing-year-picker {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .audit-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .audit-card {
      background: #FFFFFF;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      border: 1px solid #E2E8F0;
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      border-top-width: 3px;
    }

    .card-clean { border-top-color: #10B981; }
    .card-alert { border-top-color: #EF4444; background: #FFF5F5; }
    .card-info { border-top-color: #3B82F6; }
    .card-equity { border-top-color: #8B5CF6; }
    .card-profit { border-top-color: #10B981; }
    .card-loss { border-top-color: #F97316; }

    .audit-icon {
      font-size: 1.4rem;
      line-height: 1;
    }

    .audit-data {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .audit-lbl {
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748B;
    }

    .audit-val {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0F172A;
    }

    .audit-desc {
      font-size: 0.72rem;
      color: #94A3B8;
    }

    .alert-box {
      border-radius: 10px;
      padding: 1rem 1.25rem;
      font-size: 0.84rem;
    }

    .alert-danger-box {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #991B1B;
    }

    .alert-warning-box {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      color: #92400E;
    }

    .alert-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.88rem;
    }

    .alert-box ul {
      margin: 0;
      padding-inline-start: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .closing-action-box {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      padding: 1.25rem 1.75rem;
    }

    .already-closed-state {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .closed-stamp {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: #065F46;
    }

    .closed-stamp h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }

    .closed-stamp p {
      margin: 0.2rem 0 0 0;
      font-size: 0.8rem;
      color: #64748B;
    }

    .btn-reopen {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #334155;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-reopen:hover {
      background: #F8FAFC;
      border-color: #94A3B8;
    }

    .open-action-state {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      cursor: pointer;
      font-size: 0.88rem;
      color: #0F172A;
    }

    .btn-execute-close {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1.75rem;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #10B981 0%, #047857 100%);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      box-shadow: 0 3px 8px rgba(16, 185, 129, 0.25);
      transition: all 0.15s;
    }
    .btn-execute-close:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    .closing-result-card {
      background: #F0FDF4;
      border: 1.5px solid #86EFAC;
      border-radius: 12px;
      padding: 1.25rem 1.75rem;
    }

    .res-head {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 0.85rem;
    }

    .res-head h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #14532D;
    }

    .res-head p {
      margin: 0.2rem 0 0 0;
      font-size: 0.8rem;
      color: #166534;
    }

    .res-details-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      background: #FFFFFF;
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      border: 1px solid #BBF7D0;
      font-size: 0.84rem;
      color: #1E293B;
    }

    /* Currency Rate Modal Styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }
    .modal-card {
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.25);
      width: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.35rem;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }
    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .modal-title-box h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #0F172A;
    }
    .btn-close {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
      background: #FFFFFF;
      color: #64748B;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .btn-close:hover {
      background: #FEE2E2;
      color: #DC2626;
      border-color: #FCA5A5;
    }
    .modal-body {
      padding: 1.25rem 1.35rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .form-field.full {
      grid-column: span 2;
    }
    .form-field label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #334155;
    }
    .form-field input {
      height: 36px;
      padding: 0 0.75rem;
      border: 1px solid #CBD5E1;
      border-radius: 7px;
      font-size: 0.85rem;
      color: #0F172A;
      outline: none;
    }
    .form-field input:focus {
      border-color: #059669;
      box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.15);
    }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.65rem;
      padding: 0.85rem 1.35rem;
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
    }
    @media (max-width: 768px) {
      .page-header, .closing-header-card, .already-closed-state, .open-action-state {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.85rem;
      }
      .settings-tabs { overflow-x: auto; flex-wrap: nowrap; }
      .audit-kpi-grid, .res-details-grid, .form-grid { grid-template-columns: 1fr; }
      .form-field.full { grid-column: span 1; }
    }  `]
})
export class FinancialSettingsComponent implements OnInit {
  private settingsService = inject(FinancialSettingsService);
  private http = inject(HttpClient);
  private activeRoute = inject(ActivatedRoute);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);
  translator = inject(AccountingTranslatorService);

  unifiedCurrencyName: string = '';
  currencyBgTranslation: string = '';

  onUnifiedCurrencyNameChange(val: string) {
    this.unifiedCurrencyName = val;
    if (!val || !val.trim()) {
      this.currencyForm.currencyNameAr = '';
      this.currencyForm.currencyNameEn = '';
      this.currencyBgTranslation = '';
      return;
    }
    const isAr = this.translator.containsArabic(val);
    if (isAr) {
      this.currencyForm.currencyNameAr = val;
      const instant = this.translator.translateArabicToEnglish(val);
      this.currencyForm.currencyNameEn = instant;
      this.currencyBgTranslation = `English: ${instant}`;
      this.translator.translateWithOnlineRefinement(
        val,
        () => {},
        (refined) => {
          if (refined) {
            this.currencyForm.currencyNameEn = refined;
            this.currencyBgTranslation = `English: ${refined}`;
          }
        }
      );
    } else {
      this.currencyForm.currencyNameEn = val;
      const instant = this.translator.translateEnglishToArabic(val);
      this.currencyForm.currencyNameAr = instant;
      this.currencyBgTranslation = `عربي: ${instant}`;
      this.translator.translateOnline(val, 'en', 'ar').then(refined => {
        if (refined) {
          this.currencyForm.currencyNameAr = refined;
          this.currencyBgTranslation = `عربي: ${refined}`;
        }
      });
    }
  }

  forceRetranslateCurrency() {
    const val = this.unifiedCurrencyName || this.currencyForm.currencyNameAr || this.currencyForm.currencyNameEn;
    if (val) {
      this.onUnifiedCurrencyNameChange(val);
    }
  }

  onCurrencyNameArChange(val: string) {
    this.onUnifiedCurrencyNameChange(val);
  }

  loading = signal<boolean>(true);
  savingPolicies = signal<boolean>(false);
  activeTab = signal<'periods' | 'cost-centers' | 'policies' | 'closing' | 'currencies'>('periods');

  // Currencies & IAS 21
  currencyRates = signal<any[]>([]);
  loadingCurrencies = signal<boolean>(false);
  showCurrencyModal = signal<boolean>(false);
  currencyForm = {
    currencyCode: 'USD',
    currencyNameAr: 'دولار أمريكي',
    currencyNameEn: 'US Dollar',
    exchangeRateToSar: 3.7500,
    effectiveDate: new Date().toISOString().substring(0, 10)
  };

  overview = signal<FinancialSettingsOverview | null>(null);
  selectedYear = signal<FiscalYear | null>(null);

  // Year-End Closing Signals
  closingPreview = signal<YearEndAuditCheck | null>(null);
  loadingPreview = signal<boolean>(false);
  executingClose = signal<boolean>(false);
  closingResult = signal<YearEndClosingResult | null>(null);
  generateNextYearOpening: boolean = true;

  policyModel: Partial<CompanyFinancialSettings> = {
    defaultCurrency: 'SAR',
    calendarType: 1,
    costCenterPolicy: 1,
    allowBackdatedEntries: false,
    maxBackdatedDays: 0,
    requireApprovalForEntries: true,
    include13thClosingPeriod: true
  };

  constructor() {
    effect(() => {
      // Reload if company changes
      const comp = this.companyContext.activeCompany();
      if (comp) {
        this.loadData();
        if (this.activeTab() === 'currencies') {
          this.loadCurrencies();
        }
      }
    });
  }

  ngOnInit() {
    this.activeRoute.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      if (tab === 'currencies') {
        this.activeTab.set('currencies');
        this.loadCurrencies();
      }
    });
    this.loadData();
  }

  loadCurrencies() {
    this.loadingCurrencies.set(true);
    const companyId = this.companyContext.activeCompany()?.id;
    this.http.get<any[]>(`/api/currencies/rates${companyId ? '?companyId=' + companyId : ''}`).subscribe({
      next: (rates) => {
        this.currencyRates.set(rates || []);
        this.loadingCurrencies.set(false);
      },
      error: () => this.loadingCurrencies.set(false)
    });
  }

  openCurrencyModal(existing?: any) {
    if (existing) {
      this.currencyForm = {
        currencyCode: existing.currencyCode,
        currencyNameAr: existing.currencyNameAr,
        currencyNameEn: existing.currencyNameEn,
        exchangeRateToSar: existing.exchangeRateToSar,
        effectiveDate: existing.effectiveDate ? existing.effectiveDate.substring(0, 10) : new Date().toISOString().substring(0, 10)
      };
    } else {
      this.currencyForm = {
        currencyCode: 'USD',
        currencyNameAr: 'دولار أمريكي',
        currencyNameEn: 'US Dollar',
        exchangeRateToSar: 3.7500,
        effectiveDate: new Date().toISOString().substring(0, 10)
      };
    }
    this.showCurrencyModal.set(true);
  }

  saveCurrencyRate() {
    const payload = {
      companyId: this.companyContext.activeCompany()?.id,
      currencyCode: this.currencyForm.currencyCode,
      currencyNameAr: this.currencyForm.currencyNameAr,
      currencyNameEn: this.currencyForm.currencyNameEn,
      exchangeRateToSar: Number(this.currencyForm.exchangeRateToSar),
      effectiveDate: this.currencyForm.effectiveDate
    };

    this.http.post('/api/currencies/rates', payload).subscribe({
      next: () => {
        Swal.fire(this.langService.t('common.saved'), this.langService.t('accounting.financialSettings.alerts.currencyRateUpdated'), 'success');
        this.showCurrencyModal.set(false);
        this.loadCurrencies();
      },
      error: (err) => {
        Swal.fire(this.langService.t('accounting.financialSettings.alerts.saveError'), err.error?.description || err.message, 'error');
      }
    });
  }

  runFxRevaluation() {
    Swal.fire({
      title: this.langService.t('accounting.financialSettings.alerts.revalTitle'),
      text: this.langService.t('accounting.financialSettings.alerts.revalConfirmText'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.financialSettings.alerts.revalRunConfirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669'
    }).then(res => {
      if (res.isConfirmed) {
        const companyId = this.companyContext.activeCompany()?.id;
        this.http.post<any>('/api/currencies/revalue', { companyId, revaluationDate: new Date().toISOString() }).subscribe({
          next: (r) => {
            Swal.fire({
              title: this.langService.t('accounting.financialSettings.alerts.revalSuccessTitle'),
              html: `<strong>${r.message}</strong><br><br>
                     ${this.langService.t('accounting.financialSettings.alerts.revalRealizedGain')} <span class="text-emerald font-bold">${r.totalGain} SAR</span><br>
                     ${this.langService.t('accounting.financialSettings.alerts.revalRealizedLoss')} <span class="text-rose font-bold">${r.totalLoss} SAR</span><br>
                     ${this.langService.t('accounting.financialSettings.alerts.revalNetIncomeImpact')} <strong>${r.netImpact} SAR</strong>`,
              icon: 'success'
            });
            this.loadCurrencies();
          },
          error: (err) => {
            Swal.fire(this.langService.t('common.error'), err.error?.description || err.message, 'error');
          }
        });
      }
    });
  }

  loadData() {
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany()?.id;

    this.settingsService.getOverview(companyId).subscribe({
      next: (res) => {
        this.overview.set(res);
        this.selectedYear.set(res.activeFiscalYear || res.allFiscalYears[0] || null);
        if (res.settings) {
          this.policyModel = { ...res.settings };
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onYearChange(yearId: string) {
    const yr = this.overview()?.allFiscalYears.find(y => y.id === yearId);
    if (yr) {
      this.selectedYear.set(yr);
    }
  }

  getStatusClass(status: number): string {
    switch (status) {
      case 1: return 'status-open';
      case 2: return 'status-locked';
      case 3: return 'status-closed';
      default: return '';
    }
  }

  getStatusIcon(status: number): string {
    switch (status) {
      case 1: return 'pi-check-circle';
      case 2: return 'pi-lock';
      case 3: return 'pi-times-circle';
      default: return '';
    }
  }

  getStatusLabel(status: number): string {
    switch (status) {
      case 1: return this.langService.t('accounting.financialSettings.status.open');
      case 2: return this.langService.t('accounting.financialSettings.status.locked');
      case 3: return this.langService.t('accounting.financialSettings.status.closed');
      default: return '';
    }
  }

  getCostCenterPolicyLabel(): string {
    const policy = this.policyModel.costCenterPolicy;
    if (policy === 1) {
      return this.langService.t('accounting.financialSettings.policy.mandatoryPL');
    } else if (policy === 2) {
      return this.langService.t('accounting.financialSettings.policy.optionalAll');
    } else {
      return this.langService.t('accounting.financialSettings.policy.disabled');
    }
  }

  changePeriodStatus(period: FiscalPeriod, newStatus: number) {
    const isAr = this.langService.currentLang() === 'ar';
    const statusName = newStatus === 1 
      ? this.langService.t('accounting.financialSettings.period.openPeriod')
      : newStatus === 2 
        ? this.langService.t('accounting.financialSettings.period.lockPeriod')
        : this.langService.t('accounting.financialSettings.period.closePeriod');

    const periodName = isAr ? period.periodNameAr : (period.periodNameEn || period.periodNameAr);

    Swal.fire({
      title: this.langService.t('accounting.financialSettings.alerts.confirmStatusChange', { status: statusName }),
      text: this.langService.t('accounting.financialSettings.alerts.confirmStatusChangeText', { name: periodName, status: statusName }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.financialSettings.alerts.yesChangeStatus'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: newStatus === 1 ? '#10B981' : newStatus === 2 ? '#D97706' : '#EF4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.settingsService.togglePeriodStatus(period.id, newStatus).subscribe({
          next: () => {
            period.status = newStatus;
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: this.langService.t('accounting.financialSettings.alerts.periodStatusUpdated'),
              showConfirmButton: false,
              timer: 2000
            });
          },
          error: () => {
            Swal.fire(this.langService.t('common.error'), this.langService.t('accounting.financialSettings.alerts.periodStatusFailed'), 'error');
          }
        });
      }
    });
  }

  openCreateYearModal() {
    const nextYear = (this.selectedYear()?.yearNumber || new Date().getFullYear()) + 1;
    const defaultYearName = this.langService.t('accounting.financialSettings.yearModal.defaultYearName', { year: nextYear });

    Swal.fire({
      title: this.langService.t('accounting.financialSettings.yearModal.title'),
      html: `
        <div style="text-align: start; font-family: inherit; font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.8rem;">
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${this.langService.t('accounting.financialSettings.yearModal.yearNumber')}</label>
            <input id="swal-year" type="number" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" value="${nextYear}" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${this.langService.t('accounting.financialSettings.yearModal.yearNameAr')}</label>
            <input id="swal-nameAr" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" value="${defaultYearName}" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${this.langService.t('accounting.financialSettings.yearModal.startDate')}</label>
            <input id="swal-start" type="date" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" value="${nextYear}-01-01" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${this.langService.t('accounting.financialSettings.yearModal.endDate')}</label>
            <input id="swal-end" type="date" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" value="${nextYear}-12-31" />
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem;">
            <input id="swal-13th" type="checkbox" checked style="width: 18px; height: 18px;" />
            <label for="swal-13th">${this.langService.t('accounting.financialSettings.yearModal.include13th')}</label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.financialSettings.yearModal.createBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#10B981',
      preConfirm: () => {
        const year = +(document.getElementById('swal-year') as HTMLInputElement).value;
        const nameAr = (document.getElementById('swal-nameAr') as HTMLInputElement).value;
        const start = (document.getElementById('swal-start') as HTMLInputElement).value;
        const end = (document.getElementById('swal-end') as HTMLInputElement).value;
        const include13 = (document.getElementById('swal-13th') as HTMLInputElement).checked;

        if (!year || !start || !end) {
          Swal.showValidationMessage(this.langService.t('common.fillRequiredFields'));
          return false;
        }

        return { year, nameAr, start, end, include13 };
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const companyId = this.companyContext.activeCompany()?.id;
        this.settingsService.createFiscalYear({
          companyId,
          yearNumber: res.value.year,
          nameAr: res.value.nameAr,
          nameEn: this.translator.translateArabicToEnglish(res.value.nameAr) || `Fiscal Year ${res.value.year}`,
          startDate: res.value.start,
          endDate: res.value.end,
          includeClosingPeriod: res.value.include13
        }).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.langService.t('accounting.financialSettings.yearModal.createdSuccess'),
              text: this.langService.t('accounting.financialSettings.yearModal.createdSuccessText')
            });
            this.loadData();
          },
          error: (err) => {
            Swal.fire(this.langService.t('common.error'), err?.error?.description || this.langService.t('accounting.financialSettings.yearModal.createFailed'), 'error');
          }
        });
      }
    });
  }

  openCreateCostCenterModal() {
    Swal.fire({
      title: this.langService.t('accounting.financialSettings.ccModal.title'),
      html: `
        <div style="text-align: start; font-family: inherit; font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.8rem;">
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${this.langService.t('accounting.financialSettings.ccModal.code')}</label>
            <input id="swal-cc-code" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" placeholder="${this.langService.t('accounting.financialSettings.ccModal.codePlaceholder')}" />
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
              <label style="font-weight: 600; margin: 0;">${this.langService.t('accounting.financialSettings.ccModal.name')} <small style="font-weight: normal; color: #64748b;">${this.langService.t('accounting.financialSettings.ccModal.nameHint')}</small></label>
              <span id="swal-cc-preview" style="font-size: 0.72rem; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1px 6px; border-radius: 4px; font-weight: 600; display: none;"></span>
            </div>
            <input id="swal-cc-unifiedName" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" placeholder="${this.langService.t('accounting.financialSettings.ccModal.namePlaceholder')}" />
            <input id="swal-cc-nameAr" type="hidden" />
            <input id="swal-cc-nameEn" type="hidden" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${this.langService.t('accounting.financialSettings.ccModal.desc')}</label>
            <input id="swal-cc-desc" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" placeholder="${this.langService.t('accounting.financialSettings.ccModal.descPlaceholder')}" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.financialSettings.ccModal.addBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#10B981',
      didOpen: () => {
        const unifiedInput = document.getElementById('swal-cc-unifiedName') as HTMLInputElement;
        const arHidden = document.getElementById('swal-cc-nameAr') as HTMLInputElement;
        const enHidden = document.getElementById('swal-cc-nameEn') as HTMLInputElement;
        const preview = document.getElementById('swal-cc-preview') as HTMLElement;
        if (unifiedInput) {
          unifiedInput.addEventListener('input', () => {
            const val = unifiedInput.value.trim();
            if (!val) {
              if (arHidden) arHidden.value = '';
              if (enHidden) enHidden.value = '';
              if (preview) { preview.innerText = ''; preview.style.display = 'none'; }
              return;
            }
            const isInputAr = this.translator.containsArabic(val);
            if (isInputAr) {
              if (arHidden) arHidden.value = val;
              const instant = this.translator.translateArabicToEnglish(val);
              if (enHidden) enHidden.value = instant;
              if (preview) {
                preview.innerText = `English: ${instant}`;
                preview.style.display = 'inline-block';
              }
              this.translator.translateWithOnlineRefinement(val, () => {}, (refined) => {
                if (enHidden && refined) enHidden.value = refined;
                if (preview && refined) preview.innerText = `English: ${refined}`;
              });
            } else {
              if (enHidden) enHidden.value = val;
              const instant = this.translator.translateEnglishToArabic(val);
              if (arHidden) arHidden.value = instant;
              if (preview) {
                preview.innerText = `عربي: ${instant}`;
                preview.style.display = 'inline-block';
              }
              this.translator.translateOnline(val, 'en', 'ar').then(refined => {
                if (arHidden && refined) arHidden.value = refined;
                if (preview && refined) preview.innerText = `عربي: ${refined}`;
              });
            }
          });
        }
      },
      preConfirm: () => {
        const code = (document.getElementById('swal-cc-code') as HTMLInputElement).value;
        const unified = (document.getElementById('swal-cc-unifiedName') as HTMLInputElement).value.trim();
        let nameAr = (document.getElementById('swal-cc-nameAr') as HTMLInputElement).value.trim();
        let nameEn = (document.getElementById('swal-cc-nameEn') as HTMLInputElement).value.trim();
        const desc = (document.getElementById('swal-cc-desc') as HTMLInputElement).value;

        if (!code || (!nameAr && !unified)) {
          Swal.showValidationMessage(this.langService.t('accounting.financialSettings.ccModal.validation'));
          return false;
        }

        if (!nameAr && unified) {
          if (this.translator.containsArabic(unified)) {
            nameAr = unified;
            nameEn = this.translator.translateArabicToEnglish(unified);
          } else {
            nameEn = unified;
            nameAr = this.translator.translateEnglishToArabic(unified);
          }
        }

        return { code, nameAr, nameEn: nameEn || nameAr, desc };
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const companyId = this.companyContext.activeCompany()?.id;
        this.settingsService.createCostCenter({
          companyId,
          code: res.value.code,
          nameAr: res.value.nameAr,
          nameEn: res.value.nameEn,
          description: res.value.desc
        }).subscribe({
          next: () => {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: this.langService.t('accounting.financialSettings.ccModal.addedSuccess'),
              showConfirmButton: false,
              timer: 2000
            });
            this.loadData();
          },
          error: (err) => {
            Swal.fire(this.langService.t('common.error'), err?.error?.description || this.langService.t('accounting.financialSettings.ccModal.addFailed'), 'error');
          }
        });
      }
    });
  }

  deleteCostCenter(cc: CostCenter) {
    const isAr = this.langService.currentLang() === 'ar';
    const ccName = isAr ? cc.nameAr : (cc.nameEn || cc.nameAr);
    Swal.fire({
      title: this.langService.t('common.confirmDelete'),
      text: this.langService.t('accounting.financialSettings.ccModal.confirmDelete', { name: ccName }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('common.yesDelete'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#EF4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.settingsService.deleteCostCenter(cc.id).subscribe({
          next: () => {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: this.langService.t('accounting.financialSettings.ccModal.deletedSuccess'),
              showConfirmButton: false,
              timer: 2000
            });
            this.loadData();
          },
          error: () => {
            Swal.fire(this.langService.t('common.error'), this.langService.t('accounting.financialSettings.ccModal.deleteFailed'), 'error');
          }
        });
      }
    });
  }

  savePolicies() {
    this.savingPolicies.set(true);
    const companyId = this.companyContext.activeCompany()?.id;

    this.settingsService.updateSettings({
      ...this.policyModel,
      companyId
    }).subscribe({
      next: (updated) => {
        this.policyModel = { ...updated };
        this.savingPolicies.set(false);
        Swal.fire({
          icon: 'success',
          title: this.langService.t('accounting.financialSettings.policies.savedTitle'),
          text: this.langService.t('accounting.financialSettings.policies.savedText')
        });
      },
      error: () => {
        this.savingPolicies.set(false);
        Swal.fire(this.langService.t('common.error'), this.langService.t('accounting.financialSettings.policies.saveFailed'), 'error');
      }
    });
  }

  openClosingTab() {
    this.activeTab.set('closing');
    this.loadClosingPreview();
  }

  loadClosingPreview() {
    const yearId = this.selectedYear()?.id;
    if (!yearId) return;

    this.loadingPreview.set(true);
    this.closingResult.set(null);

    this.settingsService.getClosingPreview(yearId).subscribe({
      next: (preview) => {
        this.closingPreview.set(preview);
        this.loadingPreview.set(false);
      },
      error: (err) => {
        this.loadingPreview.set(false);
        Swal.fire(this.langService.t('common.warning'), err?.error?.description || this.langService.t('accounting.financialSettings.closing.fetchAuditFailed'), 'warning');
      }
    });
  }

  confirmCloseYear() {
    const preview = this.closingPreview();
    if (!preview || !preview.canClose) return;

    const isAr = this.langService.currentLang() === 'ar';
    const retainedAcc = preview.defaultRetainedEarningsAccountNameAr;
    const formattedIncome = preview.projectedNetIncome.toLocaleString('en-US', { minimumFractionDigits: 2 });

    Swal.fire({
      title: this.langService.t('accounting.financialSettings.closing.confirmTitle', { year: preview.yearNumber }),
      html: `
        <div style="text-align: start; font-size: 0.88rem; line-height: 1.6;">
          <p>${this.langService.t('accounting.financialSettings.closing.aboutToExecute', { year: preview.yearNumber })}</p>
          <ul style="padding-inline-start: 1.2rem; margin: 0.5rem 0;">
            <li>${this.langService.t('accounting.financialSettings.closing.bullet1')}</li>
            <li>${this.langService.t('accounting.financialSettings.closing.bullet2', { netIncome: formattedIncome, retainedAccount: retainedAcc })}</li>
            <li>${this.langService.t('accounting.financialSettings.closing.bullet3')}</li>
          </ul>
          <p style="color: #B91C1C; font-weight: 700; margin-top: 0.5rem;">${this.langService.t('accounting.financialSettings.closing.warningIrreversible')}</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.financialSettings.closing.executeNow'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#64748B'
    }).then((res) => {
      if (res.isConfirmed) {
        this.executingClose.set(true);

        this.settingsService.closeFiscalYear(preview.fiscalYearId, {
          retainedEarningsAccountId: preview.defaultRetainedEarningsAccountId,
          generateOpeningBalanceNextYear: this.generateNextYearOpening
        }).subscribe({
          next: (closingRes) => {
            this.executingClose.set(false);
            this.closingResult.set(closingRes);
            Swal.fire({
              icon: 'success',
              title: this.langService.t('accounting.financialSettings.closing.successTitle'),
              text: this.langService.t('accounting.financialSettings.closing.successText', { number: closingRes.closingJournalEntryNumber })
            });
            this.loadData();
            this.loadClosingPreview();
          },
          error: (err) => {
            this.executingClose.set(false);
            Swal.fire(this.langService.t('accounting.financialSettings.closing.closingError'), err?.error?.description || this.langService.t('accounting.financialSettings.closing.failed'), 'error');
          }
        });
      }
    });
  }

  confirmReopenYear() {
    const yearId = this.selectedYear()?.id;
    if (!yearId) return;

    Swal.fire({
      title: this.langService.t('accounting.financialSettings.reopen.title'),
      input: 'textarea',
      inputLabel: this.langService.t('accounting.financialSettings.reopen.reasonLabel'),
      inputPlaceholder: this.langService.t('accounting.financialSettings.reopen.reasonPlaceholder'),
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.financialSettings.reopen.confirmBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#F59E0B',
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return this.langService.t('accounting.financialSettings.reopen.reasonRequired');
        }
        return null;
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        this.settingsService.reopenFiscalYear(yearId, res.value.trim()).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.langService.t('accounting.financialSettings.reopen.successTitle'),
              text: this.langService.t('accounting.financialSettings.reopen.successText')
            });
            this.loadData();
            this.loadClosingPreview();
          },
          error: (err) => {
            Swal.fire(this.langService.t('common.error'), err?.error?.description || this.langService.t('accounting.financialSettings.reopen.failed'), 'error');
          }
        });
      }
    });
  }
}

