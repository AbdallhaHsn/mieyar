import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import {
  FinancialStatementsService,
  IncomeStatementReport,
  BalanceSheetReport,
  CashFlowStatementReport,
  FinancialStatementSettings,
  FinancialStatementItem,
  EquityStatementReport,
  ZatcaVatReturn
} from '../../../core/services/financial-statements.service';
import { FinancialSettingsService, CostCenter } from '../../../core/services/financial-settings.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { TafqeetService } from '../../../core/services/tafqeet.service';

type ActiveTab = 'income-statement' | 'balance-sheet' | 'cash-flow' | 'equity' | 'vat-return' | 'settings';

@Component({
  selector: 'app-financial-statements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="fs-page" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Compact Header Bar -->
      <header class="fs-header">
        <div class="fs-header-inner">
          <div class="fs-header-left">
            <div class="fs-breadcrumb">
              <a routerLink="/dashboard" class="bc-link"><i class="pi pi-home"></i> {{ langService.currentLang() === 'ar' ? 'الرئيسية' : 'Home' }}</a>
              <span class="bc-sep">/</span>
              <span>{{ langService.currentLang() === 'ar' ? 'المحاسبة والمالية' : 'Accounting' }}</span>
              <span class="bc-sep">/</span>
              <span class="bc-highlight">{{ langService.currentLang() === 'ar' ? 'القوائم المالية الختامية' : 'Financial Statements' }}</span>
            </div>
            <div class="fs-title-row">
              <h1 class="fs-title">{{ langService.currentLang() === 'ar' ? 'القوائم المالية الختامية والتقارير التنفيذية' : 'Financial Statements & Executive Reports' }}</h1>
              <span class="socpa-badge"><i class="pi pi-verified"></i> SOCPA & IFRS Compliant</span>
            </div>
          </div>

          <!-- Top Navigation Tabs Pill -->
          <div class="fs-tabs-pill">
            <button 
              type="button"
              class="fs-tab-btn" 
              [class.active]="activeTab === 'income-statement'" 
              (click)="switchTab('income-statement')">
              <i class="pi pi-chart-line"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'قائمة الدخل (الأرباح والخسائر)' : 'Income Statement (P&L)' }}</span>
            </button>
            <button 
              type="button"
              class="fs-tab-btn" 
              [class.active]="activeTab === 'balance-sheet'" 
              (click)="switchTab('balance-sheet')">
              <i class="pi pi-building"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'قائمة المركز المالي (الميزانية العمومية)' : 'Balance Sheet' }}</span>
            </button>
            <button 
              type="button"
              class="fs-tab-btn" 
              [class.active]="activeTab === 'cash-flow'" 
              (click)="switchTab('cash-flow')">
              <i class="pi pi-money-bill"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'قائمة التدفقات النقدية (IAS 7)' : 'Statement of Cash Flows' }}</span>
            </button>
            <button 
              type="button"
              class="fs-tab-btn" 
              [class.active]="activeTab === 'equity'" 
              (click)="switchTab('equity')">
              <i class="pi pi-users"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'التغير في حقوق الملكية (IAS 1)' : 'Statement of Changes in Equity' }}</span>
            </button>
            <button 
              type="button"
              class="fs-tab-btn" 
              [class.active]="activeTab === 'vat-return'" 
              (click)="switchTab('vat-return')">
              <i class="pi pi-percentage"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'إقرار ضريبة القيمة المضافة (ZATCA)' : 'ZATCA VAT Return' }}</span>
            </button>
            <button 
              type="button"
              class="fs-tab-btn" 
              [class.active]="activeTab === 'settings'" 
              (click)="switchTab('settings')">
              <i class="pi pi-cog"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'محددات وسياسات العرض' : 'Settings' }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- =========================================================================
           TAB 1: INCOME STATEMENT (قائمة الدخل والأرباح والخسائر)
           ========================================================================= -->
      <ng-container *ngIf="activeTab === 'income-statement'">
        
        <!-- Compact Unified Metrics Bar (P&L) -->
        <section class="fs-metrics-bar" *ngIf="incomeStatement()">
          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-arrow-circle-up text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'إيرادات النشاط التشغيلي' : 'Operating Revenue' }}</span>
              <span class="seg-badge bg-emerald-subtle">100%</span>
            </div>
            <div class="seg-val font-mono text-emerald">
              {{ incomeStatement()!.operatingRevenues.totalAmount | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-calculator text-cyan"></i> {{ langService.currentLang() === 'ar' ? 'مجمل الربح (Gross Profit)' : 'Gross Profit' }}</span>
              <span class="seg-badge" [class.bg-emerald-subtle]="incomeStatement()!.grossProfit >= 0" [class.bg-rose-subtle]="incomeStatement()!.grossProfit < 0">
                {{ incomeStatement()!.grossMarginPercentage }}%
              </span>
            </div>
            <div class="seg-val font-mono" [class.text-emerald]="incomeStatement()!.grossProfit >= 0" [class.text-rose]="incomeStatement()!.grossProfit < 0">
              {{ incomeStatement()!.grossProfit | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-cog text-amber"></i> {{ langService.currentLang() === 'ar' ? 'الربح التشغيلي (EBIT)' : 'Operating Profit' }}</span>
              <span class="seg-badge bg-amber-subtle">{{ incomeStatement()!.operatingMarginPercentage }}%</span>
            </div>
            <div class="seg-val font-mono text-amber">
              {{ incomeStatement()!.operatingProfit | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment metric-segment-highlight" [class.is-profit]="incomeStatement()!.isProfit" [class.is-loss]="!incomeStatement()!.isProfit">
            <div class="seg-top">
              <span class="seg-lbl">
                <i [class]="incomeStatement()!.isProfit ? 'pi pi-check-circle text-emerald' : 'pi pi-exclamation-circle text-rose'"></i>
                <strong>{{ langService.currentLang() === 'ar' ? 'صافي نتيجة الفترة' : 'Net Income' }}</strong>
              </span>
              <span class="seg-badge-solid" [class.bg-emerald]="incomeStatement()!.isProfit" [class.bg-rose]="!incomeStatement()!.isProfit">
                {{ incomeStatement()!.isProfit ? (langService.currentLang() === 'ar' ? 'صافي ربح' : 'Net Profit') : (langService.currentLang() === 'ar' ? 'صافي خسارة' : 'Net Loss') }}
                ({{ incomeStatement()!.netMarginPercentage }}%)
              </span>
            </div>
            <div class="seg-val font-mono font-bold" [class.text-emerald]="incomeStatement()!.isProfit" [class.text-rose]="!incomeStatement()!.isProfit">
              {{ incomeStatement()!.netProfitOrLoss | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>
        </section>

        <!-- Compact Filters & Controls Bar -->
        <section class="fs-filters-card">
          <div class="filters-row">
            
            <!-- From Date -->
            <div class="form-group date-group">
              <label><i class="pi pi-calendar"></i> <span>{{ langService.currentLang() === 'ar' ? 'من تاريخ:' : 'From:' }}</span></label>
              <input type="date" class="form-control" [(ngModel)]="fromDate" (change)="loadIncomeStatement()" />
            </div>

            <!-- To Date -->
            <div class="form-group date-group">
              <label><i class="pi pi-calendar"></i> <span>{{ langService.currentLang() === 'ar' ? 'إلى تاريخ:' : 'To:' }}</span></label>
              <input type="date" class="form-control" [(ngModel)]="toDate" (change)="loadIncomeStatement()" />
            </div>

            <!-- Cost Center -->
            <div class="form-group cc-group">
              <label><i class="pi pi-compass"></i> <span>{{ langService.currentLang() === 'ar' ? 'مركز التكلفة:' : 'Cost Center:' }}</span></label>
              <select class="form-control" [(ngModel)]="selectedCostCenterId" (change)="loadIncomeStatement()">
                <option value="">{{ langService.currentLang() === 'ar' ? 'جميع مراكز التكلفة' : 'All Cost Centers' }}</option>
                <option *ngFor="let cc of costCenters" [value]="cc.id">{{ cc.code }} - {{ cc.nameAr }}</option>
              </select>
            </div>

            <!-- Tree Level Selector -->
            <div class="form-group level-group">
              <label><i class="pi pi-sitemap"></i> <span>{{ langService.currentLang() === 'ar' ? 'المستوى الشجري:' : 'Level:' }}</span></label>
              <select class="form-control" [(ngModel)]="selectedMaxLevel" (change)="loadIncomeStatement()">
                <option [ngValue]="null">{{ langService.currentLang() === 'ar' ? 'كافة المستويات التحليلية' : 'All Levels' }}</option>
                <option [ngValue]="1">{{ langService.currentLang() === 'ar' ? 'المستوى 1 (رئيسي فقط)' : 'Level 1' }}</option>
                <option [ngValue]="2">{{ langService.currentLang() === 'ar' ? 'حتى المستوى 2 (مجموعات رئيسية)' : 'Up to Level 2' }}</option>
                <option [ngValue]="3">{{ langService.currentLang() === 'ar' ? 'حتى المستوى 3' : 'Up to Level 3' }}</option>
              </select>
            </div>

            <!-- Presentation Format -->
            <div class="form-group format-group">
              <label><i class="pi pi-sliders-h"></i> <span>{{ langService.currentLang() === 'ar' ? 'هيكل العرض:' : 'Format:' }}</span></label>
              <select class="form-control" [(ngModel)]="presentationFormat" (change)="loadIncomeStatement()">
                <option value="multi-step">{{ langService.currentLang() === 'ar' ? 'متعدد المراحل (IFRS القياسي)' : 'Multi-Step (IFRS)' }}</option>
                <option value="single-step">{{ langService.currentLang() === 'ar' ? 'مرحلة واحدة (Single-Step)' : 'Single-Step' }}</option>
              </select>
            </div>

            <!-- Hide Zero Toggle -->
            <div class="form-group toggle-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="hideZeroBalances" (change)="loadIncomeStatement()" />
                <span>{{ langService.currentLang() === 'ar' ? 'إخفاء الأرصدة الصفرية' : 'Hide Zeros' }}</span>
              </label>
            </div>

          </div>

          <!-- Presets and Action Buttons -->
          <div class="filters-subbar">
            <div class="presets-group">
              <span class="preset-label">{{ langService.currentLang() === 'ar' ? 'فترات سريعة:' : 'Presets:' }}</span>
              <button class="preset-btn" (click)="setPreset('thisYear')">{{ langService.currentLang() === 'ar' ? 'هذا العام' : 'This Year' }}</button>
              <button class="preset-btn" (click)="setPreset('thisQuarter')">{{ langService.currentLang() === 'ar' ? 'الربع الحالي' : 'This Quarter' }}</button>
              <button class="preset-btn" (click)="setPreset('thisMonth')">{{ langService.currentLang() === 'ar' ? 'هذا الشهر' : 'This Month' }}</button>
            </div>

            <div class="actions-group">
              <button class="secondary-btn" (click)="loadIncomeStatement()" [disabled]="loading()">
                <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'تحديث' : 'Refresh' }}</span>
              </button>
              <button class="secondary-btn btn-export" (click)="exportIncomeStatementExcel()">
                <i class="pi pi-file-excel"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'تصدير Excel منسق' : 'Export Excel' }}</span>
              </button>
              <button class="primary-btn btn-print" (click)="openPrintModal('income-statement')">
                <i class="pi pi-print"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'طباعة القائمة A4' : 'Print A4' }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Income Statement Data Table -->
        <section class="fs-table-card" *ngIf="incomeStatement()">
          <div class="table-top-header">
            <div class="table-title-box">
              <i class="pi pi-chart-bar text-emerald"></i>
              <h3 class="table-title-text">
                {{ langService.currentLang() === 'ar' ? 'قائمة الدخل عن الفترة من' : 'Income Statement for period' }}
                {{ incomeStatement()!.fromDate | date:'yyyy-MM-dd' }} 
                {{ langService.currentLang() === 'ar' ? 'إلى' : 'to' }} 
                {{ incomeStatement()!.toDate | date:'yyyy-MM-dd' }}
              </h3>
            </div>
            <span class="count-badge">
              {{ langService.currentLang() === 'ar' ? 'العملة المعتمدة: ريال سعودي (SAR)' : 'Currency: SAR' }}
            </span>
          </div>

          <div class="table-responsive">
            <table class="fs-statement-table">
              <thead>
                <tr>
                  <th class="th-code">{{ langService.currentLang() === 'ar' ? 'رمز الحساب' : 'Code' }}</th>
                  <th class="th-name">{{ langService.currentLang() === 'ar' ? 'البيان والبنود المالية' : 'Account / Financial Item' }}</th>
                  <th class="th-level">{{ langService.currentLang() === 'ar' ? 'المستوى' : 'Level' }}</th>
                  <th class="th-pct">{{ langService.currentLang() === 'ar' ? '% من المبيعات' : '% of Revenue' }}</th>
                  <th class="th-amount">{{ langService.currentLang() === 'ar' ? 'المبلغ (SAR)' : 'Amount (SAR)' }}</th>
                  <th class="th-action">{{ langService.currentLang() === 'ar' ? 'كشف الحساب' : 'Ledger' }}</th>
                </tr>
              </thead>
              <tbody>

                <!-- 1. Operating Revenues -->
                <tr class="section-header-row bg-emerald-tint">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-emerald"></i> {{ incomeStatement()!.operatingRevenues.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald">
                    {{ incomeStatement()!.operatingRevenues.totalAmount | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of incomeStatement()!.operatingRevenues.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono">{{ item.amount | number:'1.2-2' }}</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- 2. Cost of Sales -->
                <tr class="section-header-row bg-slate-tint">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-slate"></i> {{ incomeStatement()!.costOfSales.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-slate">
                    ({{ incomeStatement()!.costOfSales.totalAmount | number:'1.2-2' }})
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of incomeStatement()!.costOfSales.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono text-rose">({{ item.amount | number:'1.2-2' }})</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- SUB-TOTAL 1: GROSS PROFIT -->
                <tr class="subtotal-row gross-profit-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-calculator text-emerald"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'مجمل الربح / الخسارة (Gross Profit)' : 'Gross Profit' }}</strong>
                    </div>
                  </td>
                  <td class="td-pct font-mono font-bold">{{ incomeStatement()!.grossMarginPercentage }}%</td>
                  <td class="td-amount font-mono font-bold" [class.text-emerald]="incomeStatement()!.grossProfit >= 0" [class.text-rose]="incomeStatement()!.grossProfit < 0">
                    {{ incomeStatement()!.grossProfit | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- 3. Selling & Marketing Expenses -->
                <tr class="section-header-row bg-slate-tint">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-slate"></i> {{ incomeStatement()!.sellingExpenses.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-slate">
                    ({{ incomeStatement()!.sellingExpenses.totalAmount | number:'1.2-2' }})
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of incomeStatement()!.sellingExpenses.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono text-rose">({{ item.amount | number:'1.2-2' }})</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- 4. General & Administrative Expenses -->
                <tr class="section-header-row bg-slate-tint">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-slate"></i> {{ incomeStatement()!.generalAdminExpenses.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-slate">
                    ({{ incomeStatement()!.generalAdminExpenses.totalAmount | number:'1.2-2' }})
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of incomeStatement()!.generalAdminExpenses.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono text-rose">({{ item.amount | number:'1.2-2' }})</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- SUB-TOTAL 2: OPERATING PROFIT (EBIT) -->
                <tr class="subtotal-row operating-profit-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-cog text-amber"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'الربح التشغيلي قبل التمويل والزكاة (EBIT)' : 'Operating Profit (EBIT)' }}</strong>
                    </div>
                  </td>
                  <td class="td-pct font-mono font-bold">{{ incomeStatement()!.operatingMarginPercentage }}%</td>
                  <td class="td-amount font-mono font-bold text-amber">
                    {{ incomeStatement()!.operatingProfit | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- 5. Other Income & Finance / Zakat -->
                <tr class="section-header-row bg-slate-tint" *ngIf="incomeStatement()!.otherIncome.items.length > 0">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-slate"></i> {{ incomeStatement()!.otherIncome.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald">
                    {{ incomeStatement()!.otherIncome.totalAmount | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of incomeStatement()!.otherIncome.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono text-emerald">{{ item.amount | number:'1.2-2' }}</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <tr class="section-header-row bg-slate-tint" *ngIf="incomeStatement()!.financeAndZakatCosts.items.length > 0">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-slate"></i> {{ incomeStatement()!.financeAndZakatCosts.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-slate">
                    ({{ incomeStatement()!.financeAndZakatCosts.totalAmount | number:'1.2-2' }})
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of incomeStatement()!.financeAndZakatCosts.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono text-rose">({{ item.amount | number:'1.2-2' }})</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- GRAND TOTAL: NET PROFIT OR LOSS -->
                <tr class="grand-total-row" [class.is-profit]="incomeStatement()!.isProfit" [class.is-loss]="!incomeStatement()!.isProfit">
                  <td colspan="3">
                    <div class="grand-total-title">
                      <i [class]="incomeStatement()!.isProfit ? 'pi pi-verified text-emerald' : 'pi pi-exclamation-triangle text-rose'"></i>
                      <span>{{ langService.currentLang() === 'ar' ? 'صافي أرباح / (خسائر) الفترة المالية' : 'Net Profit / (Loss) for the Period' }}</span>
                    </div>
                  </td>
                  <td class="td-pct font-mono font-bold">{{ incomeStatement()!.netMarginPercentage }}%</td>
                  <td class="td-amount font-mono font-bold grand-total-amount">
                    {{ incomeStatement()!.netProfitOrLoss | number:'1.2-2' }} SAR
                  </td>
                  <td></td>
                </tr>

              </tbody>
            </table>
          </div>

          <!-- Arabic Tafqeet Strip -->
          <div class="tafqeet-strip">
            <i class="pi pi-info-circle text-emerald"></i>
            <span class="tafqeet-label">{{ langService.currentLang() === 'ar' ? 'التفقيع المالي المعتمد:' : 'Amount in words:' }}</span>
            <strong class="tafqeet-text">{{ incomeStatement()!.netProfitTafqeetAr }}</strong>
          </div>
        </section>

      </ng-container>

      <!-- =========================================================================
           TAB 2: BALANCE SHEET (قائمة المركز المالي / الميزانية العمومية)
           ========================================================================= -->
      <ng-container *ngIf="activeTab === 'balance-sheet'">
        
        <!-- Compact Unified Metrics Bar (Balance Sheet) -->
        <section class="fs-metrics-bar" *ngIf="balanceSheet()">
          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-box text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'إجمالي الأصول (Assets)' : 'Total Assets' }}</span>
              <span class="seg-badge bg-emerald-subtle">الموارد</span>
            </div>
            <div class="seg-val font-mono text-emerald">
              {{ balanceSheet()!.totalAssets | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-file text-cyan"></i> {{ langService.currentLang() === 'ar' ? 'إجمالي الالتزامات (Liabilities)' : 'Total Liabilities' }}</span>
              <span class="seg-badge bg-cyan-subtle">الخصوم</span>
            </div>
            <div class="seg-val font-mono text-cyan">
              {{ balanceSheet()!.totalLiabilities | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-shield text-amber"></i> {{ langService.currentLang() === 'ar' ? 'حقوق الملكية (Equity)' : 'Total Equity' }}</span>
              <span class="seg-badge bg-amber-subtle">{{ langService.currentLang() === 'ar' ? 'شامل الأرباح' : 'With Net' }}</span>
            </div>
            <div class="seg-val font-mono text-amber">
              {{ balanceSheet()!.totalEquity | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment metric-segment-highlight" [class.is-profit]="balanceSheet()!.isBalanced" [class.is-loss]="!balanceSheet()!.isBalanced">
            <div class="seg-top">
              <span class="seg-lbl">
                <i [class]="balanceSheet()!.isBalanced ? 'pi pi-check-circle text-emerald' : 'pi pi-exclamation-triangle text-rose'"></i>
                <strong>{{ langService.currentLang() === 'ar' ? 'معادلة التوازن المحاسبي' : 'Accounting Balance' }}</strong>
              </span>
              <span class="seg-badge-solid" [class.bg-emerald]="balanceSheet()!.isBalanced" [class.bg-rose]="!balanceSheet()!.isBalanced">
                {{ balanceSheet()!.isBalanced ? (langService.currentLang() === 'ar' ? 'متوازنة 100%' : 'Balanced') : (langService.currentLang() === 'ar' ? 'غير متوازنة' : 'Unbalanced') }}
              </span>
            </div>
            <div class="seg-val font-mono font-bold" [class.text-emerald]="balanceSheet()!.isBalanced" [class.text-rose]="!balanceSheet()!.isBalanced">
              {{ balanceSheet()!.isBalanced ? (langService.currentLang() === 'ar' ? 'الفرق: 0.00' : 'Diff: 0.00') : ('فرق: ' + (balanceSheet()!.balanceDifference | number:'1.2-2')) }}
            </div>
          </div>
        </section>

        <!-- Compact Filters & Controls Bar (Balance Sheet) -->
        <section class="fs-filters-card">
          <div class="filters-row">
            
            <!-- As of Date -->
            <div class="form-group date-group">
              <label><i class="pi pi-calendar"></i> <span>{{ langService.currentLang() === 'ar' ? 'في تاريخ (As of):' : 'As of Date:' }}</span></label>
              <input type="date" class="form-control" [(ngModel)]="asOfDate" (change)="loadBalanceSheet()" />
            </div>

            <!-- Cost Center -->
            <div class="form-group cc-group">
              <label><i class="pi pi-compass"></i> <span>{{ langService.currentLang() === 'ar' ? 'مركز التكلفة:' : 'Cost Center:' }}</span></label>
              <select class="form-control" [(ngModel)]="selectedCostCenterId" (change)="loadBalanceSheet()">
                <option value="">{{ langService.currentLang() === 'ar' ? 'جميع مراكز التكلفة' : 'All Cost Centers' }}</option>
                <option *ngFor="let cc of costCenters" [value]="cc.id">{{ cc.code }} - {{ cc.nameAr }}</option>
              </select>
            </div>

            <!-- Tree Level Selector -->
            <div class="form-group level-group">
              <label><i class="pi pi-sitemap"></i> <span>{{ langService.currentLang() === 'ar' ? 'المستوى الشجري:' : 'Level:' }}</span></label>
              <select class="form-control" [(ngModel)]="selectedMaxLevel" (change)="loadBalanceSheet()">
                <option [ngValue]="null">{{ langService.currentLang() === 'ar' ? 'كافة المستويات التحليلية' : 'All Levels' }}</option>
                <option [ngValue]="1">{{ langService.currentLang() === 'ar' ? 'المستوى 1 (رئيسي فقط)' : 'Level 1' }}</option>
                <option [ngValue]="2">{{ langService.currentLang() === 'ar' ? 'حتى المستوى 2 (مجموعات رئيسية)' : 'Up to Level 2' }}</option>
                <option [ngValue]="3">{{ langService.currentLang() === 'ar' ? 'حتى المستوى 3' : 'Up to Level 3' }}</option>
              </select>
            </div>

            <!-- Hide Zero Toggle -->
            <div class="form-group toggle-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="hideZeroBalances" (change)="loadBalanceSheet()" />
                <span>{{ langService.currentLang() === 'ar' ? 'إخفاء الأرصدة الصفرية' : 'Hide Zeros' }}</span>
              </label>
            </div>

          </div>

          <!-- Presets and Actions -->
          <div class="filters-subbar">
            <div class="presets-group">
              <span class="preset-label">{{ langService.currentLang() === 'ar' ? 'محطات المركز المالي:' : 'Dates:' }}</span>
              <button class="preset-btn" (click)="setAsOfPreset('today')">{{ langService.currentLang() === 'ar' ? 'تاريخ اليوم' : 'Today' }}</button>
              <button class="preset-btn" (click)="setAsOfPreset('endOfYear')">{{ langService.currentLang() === 'ar' ? 'نهاية العام الحالي' : 'Year End' }}</button>
              <button class="preset-btn" (click)="setAsOfPreset('prevYearEnd')">{{ langService.currentLang() === 'ar' ? 'نهاية العام السابق' : 'Prev Year End' }}</button>
            </div>

            <div class="actions-group">
              <button class="secondary-btn" (click)="loadBalanceSheet()" [disabled]="loading()">
                <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'تحديث' : 'Refresh' }}</span>
              </button>
              <button class="secondary-btn btn-export" (click)="exportBalanceSheetExcel()">
                <i class="pi pi-file-excel"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'تصدير Excel منسق' : 'Export Excel' }}</span>
              </button>
              <button class="primary-btn btn-print" (click)="openPrintModal('balance-sheet')">
                <i class="pi pi-print"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'طباعة الميزانية A4' : 'Print A4' }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Balance Sheet Data Table -->
        <section class="fs-table-card" *ngIf="balanceSheet()">
          <div class="table-top-header">
            <div class="table-title-box">
              <i class="pi pi-building text-emerald"></i>
              <h3 class="table-title-text">
                {{ langService.currentLang() === 'ar' ? 'قائمة المركز المالي (الميزانية العمومية) كما هي في' : 'Statement of Financial Position as of' }}
                {{ balanceSheet()!.asOfDate | date:'yyyy-MM-dd' }}
              </h3>
            </div>
            <span class="count-badge" [class.badge-balanced]="balanceSheet()!.isBalanced">
              <i class="pi pi-verified"></i>
              {{ balanceSheet()!.isBalanced ? (langService.currentLang() === 'ar' ? 'الميزانية مطابقة ومتوازنة (الأصول = الخصوم + الملكية)' : 'Balanced Equation') : 'Imbalance' }}
            </span>
          </div>

          <div class="table-responsive">
            <table class="fs-statement-table">
              <thead>
                <tr>
                  <th class="th-code">{{ langService.currentLang() === 'ar' ? 'رمز الحساب' : 'Code' }}</th>
                  <th class="th-name">{{ langService.currentLang() === 'ar' ? 'البيان والبنود المالية' : 'Account / Financial Item' }}</th>
                  <th class="th-level">{{ langService.currentLang() === 'ar' ? 'المستوى' : 'Level' }}</th>
                  <th class="th-pct">{{ langService.currentLang() === 'ar' ? '% من الأصول' : '% of Assets' }}</th>
                  <th class="th-amount">{{ langService.currentLang() === 'ar' ? 'المبلغ (SAR)' : 'Amount (SAR)' }}</th>
                  <th class="th-action">{{ langService.currentLang() === 'ar' ? 'كشف الحساب' : 'Ledger' }}</th>
                </tr>
              </thead>
              <tbody>

                <!-- ================= 1. ASSETS ================= -->
                <!-- Current Assets -->
                <tr class="section-header-row bg-emerald-tint">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-emerald"></i> {{ balanceSheet()!.currentAssets.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald">
                    {{ balanceSheet()!.currentAssets.totalAmount | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of balanceSheet()!.currentAssets.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono">{{ item.amount | number:'1.2-2' }}</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- Non-Current Assets -->
                <tr class="section-header-row bg-emerald-tint">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-emerald"></i> {{ balanceSheet()!.nonCurrentAssets.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald">
                    {{ balanceSheet()!.nonCurrentAssets.totalAmount | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of balanceSheet()!.nonCurrentAssets.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono">{{ item.amount | number:'1.2-2' }}</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- TOTAL ASSETS -->
                <tr class="subtotal-row total-assets-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-check-circle text-emerald"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'إجمالي الأصول والموجودات (Total Assets)' : 'Total Assets' }}</strong>
                    </div>
                  </td>
                  <td class="td-pct font-mono font-bold">100.00%</td>
                  <td class="td-amount font-mono font-bold text-emerald">
                    {{ balanceSheet()!.totalAssets | number:'1.2-2' }} SAR
                  </td>
                  <td></td>
                </tr>

                <!-- ================= 2. LIABILITIES ================= -->
                <!-- Current Liabilities -->
                <tr class="section-header-row bg-cyan-tint">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-cyan"></i> {{ balanceSheet()!.currentLiabilities.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-cyan">
                    {{ balanceSheet()!.currentLiabilities.totalAmount | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of balanceSheet()!.currentLiabilities.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono">{{ item.amount | number:'1.2-2' }}</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- Non-Current Liabilities -->
                <tr class="section-header-row bg-cyan-tint">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-cyan"></i> {{ balanceSheet()!.nonCurrentLiabilities.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-cyan">
                    {{ balanceSheet()!.nonCurrentLiabilities.totalAmount | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of balanceSheet()!.nonCurrentLiabilities.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono">{{ item.amount | number:'1.2-2' }}</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- TOTAL LIABILITIES -->
                <tr class="subtotal-row total-liabilities-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-file text-cyan"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'إجمالي الالتزامات والخصوم (Total Liabilities)' : 'Total Liabilities' }}</strong>
                    </div>
                  </td>
                  <td class="td-pct font-mono font-bold">{{ balanceSheet()!.totalAssets > 0 ? ((balanceSheet()!.totalLiabilities / balanceSheet()!.totalAssets) * 100 | number:'1.2-2') : '0.00' }}%</td>
                  <td class="td-amount font-mono font-bold text-cyan">
                    {{ balanceSheet()!.totalLiabilities | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- ================= 3. EQUITY ================= -->
                <tr class="section-header-row bg-amber-tint">
                  <td colspan="4">
                    <strong><i class="pi pi-folder-open text-amber"></i> {{ balanceSheet()!.equityItems.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-amber">
                    {{ balanceSheet()!.totalEquity | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let item of balanceSheet()!.equityItems.items" class="item-row">
                  <td class="td-code font-mono">{{ item.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(item.level - 1) * 20">
                    <span class="tree-bullet"></span>
                    <span>{{ item.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ item.level }}</span></td>
                  <td class="td-pct font-mono text-muted">{{ item.percentage }}%</td>
                  <td class="td-amount font-mono">{{ item.amount | number:'1.2-2' }}</td>
                  <td class="td-action">
                    <a *ngIf="item.isPostable" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: item.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- DYNAMIC ROW: Current Period Net Income -->
                <tr class="item-row current-period-profit-row">
                  <td class="td-code font-mono text-emerald"><strong>32103</strong></td>
                  <td class="td-name" style="padding-inline-start: 40px;">
                    <i class="pi pi-sparkles text-emerald"></i>
                    <strong>{{ langService.currentLang() === 'ar' ? 'صافي أرباح / (خسائر) الفترة المحاسبية الحالية (منقولة من قائمة الدخل)' : 'Current Period Net Income (from P&L)' }}</strong>
                  </td>
                  <td class="td-level"><span class="level-pill bg-emerald-subtle">آلي</span></td>
                  <td class="td-pct font-mono text-emerald font-bold">
                    {{ balanceSheet()!.totalAssets > 0 ? ((balanceSheet()!.currentPeriodNetIncome / balanceSheet()!.totalAssets) * 100 | number:'1.2-2') : '0.00' }}%
                  </td>
                  <td class="td-amount font-mono font-bold" [class.text-emerald]="balanceSheet()!.currentPeriodNetIncome >= 0" [class.text-rose]="balanceSheet()!.currentPeriodNetIncome < 0">
                    {{ balanceSheet()!.currentPeriodNetIncome | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- TOTAL EQUITY -->
                <tr class="subtotal-row total-equity-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-shield text-amber"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'إجمالي حقوق الملكية (Total Equity)' : 'Total Equity' }}</strong>
                    </div>
                  </td>
                  <td class="td-pct font-mono font-bold">{{ balanceSheet()!.totalAssets > 0 ? ((balanceSheet()!.totalEquity / balanceSheet()!.totalAssets) * 100 | number:'1.2-2') : '0.00' }}%</td>
                  <td class="td-amount font-mono font-bold text-amber">
                    {{ balanceSheet()!.totalEquity | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- GRAND TOTAL: LIABILITIES & EQUITY -->
                <tr class="grand-total-row" [class.is-profit]="balanceSheet()!.isBalanced" [class.is-loss]="!balanceSheet()!.isBalanced">
                  <td colspan="3">
                    <div class="grand-total-title">
                      <i [class]="balanceSheet()!.isBalanced ? 'pi pi-verified text-emerald' : 'pi pi-exclamation-triangle text-rose'"></i>
                      <span>{{ langService.currentLang() === 'ar' ? 'مجموع الالتزامات وحقوق الملكية (Total Liabilities & Equity)' : 'Total Liabilities & Equity' }}</span>
                    </div>
                  </td>
                  <td class="td-pct font-mono font-bold">100.00%</td>
                  <td class="td-amount font-mono font-bold grand-total-amount">
                    {{ balanceSheet()!.totalLiabilitiesAndEquity | number:'1.2-2' }} SAR
                  </td>
                  <td></td>
                </tr>

              </tbody>
            </table>
          </div>

          <!-- Ratios & Tafqeet Footer Strip -->
          <div class="ratios-footer-strip">
            <div class="ratio-pill">
              <span class="lbl">{{ langService.currentLang() === 'ar' ? 'رأس المال العامل:' : 'Working Capital:' }}</span>
              <strong class="val font-mono">{{ balanceSheet()!.workingCapital | number:'1.2-2' }} SAR</strong>
            </div>
            <div class="ratio-pill">
              <span class="lbl">{{ langService.currentLang() === 'ar' ? 'نسبة التداول (السيولة):' : 'Current Ratio:' }}</span>
              <strong class="val font-mono">{{ balanceSheet()!.currentRatio }}</strong>
            </div>
            <div class="ratio-pill">
              <span class="lbl">{{ langService.currentLang() === 'ar' ? 'نسبة المديونية للملكية:' : 'Debt to Equity:' }}</span>
              <strong class="val font-mono">{{ balanceSheet()!.debtToEquityRatio }}%</strong>
            </div>
          </div>
        </section>

      </ng-container>

      <!-- =========================================================================
           TAB: CASH FLOW STATEMENT (قائمة التدفقات النقدية - IAS 7)
           ========================================================================= -->
      <ng-container *ngIf="activeTab === 'cash-flow'">
        
        <!-- Executive KPI Metrics Bar (Cash Flow) -->
        <section class="fs-metrics-bar cash-flow-metrics" *ngIf="cashFlow()">
          <!-- 1. Operating -->
          <div class="metric-card-box">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-bolt text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'التدفقات التشغيلية' : 'Operating Cash Flow' }}</span>
              <span class="seg-badge" [class.bg-emerald-subtle]="cashFlow()!.netCashFromOperatingActivities >= 0" [class.bg-rose-subtle]="cashFlow()!.netCashFromOperatingActivities < 0">
                {{ cashFlow()!.netCashFromOperatingActivities >= 0 ? '+' : '' }}SAR
              </span>
            </div>
            <div class="seg-val font-mono" [class.text-emerald]="cashFlow()!.netCashFromOperatingActivities >= 0" [class.text-rose]="cashFlow()!.netCashFromOperatingActivities < 0">
              {{ cashFlow()!.netCashFromOperatingActivities | number:'1.2-2' }}
            </div>
          </div>

          <!-- 2. Investing -->
          <div class="metric-card-box">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-box text-cyan"></i> {{ langService.currentLang() === 'ar' ? 'التدفقات الاستثمارية' : 'Investing (CapEx)' }}</span>
              <span class="seg-badge bg-cyan-subtle">SAR</span>
            </div>
            <div class="seg-val font-mono text-cyan">
              {{ cashFlow()!.netCashFromInvestingActivities | number:'1.2-2' }}
            </div>
          </div>

          <!-- 3. Financing -->
          <div class="metric-card-box">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-briefcase text-amber"></i> {{ langService.currentLang() === 'ar' ? 'التدفقات التمويلية' : 'Financing' }}</span>
              <span class="seg-badge bg-amber-subtle">SAR</span>
            </div>
            <div class="seg-val font-mono text-amber">
              {{ cashFlow()!.netCashFromFinancingActivities | number:'1.2-2' }}
            </div>
          </div>

          <!-- 4. Net Change -->
          <div class="metric-card-box">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-dollar text-purple"></i> {{ langService.currentLang() === 'ar' ? 'صافي التغير في النقدية' : 'Net Cash Change' }}</span>
              <span class="seg-badge" [class.bg-emerald-subtle]="cashFlow()!.netChangeInCashAndEquivalents >= 0" [class.bg-rose-subtle]="cashFlow()!.netChangeInCashAndEquivalents < 0">
                {{ cashFlow()!.netChangeInCashAndEquivalents >= 0 ? '+' : '' }}SAR
              </span>
            </div>
            <div class="seg-val font-mono font-bold" [class.text-emerald]="cashFlow()!.netChangeInCashAndEquivalents >= 0" [class.text-rose]="cashFlow()!.netChangeInCashAndEquivalents < 0">
              {{ cashFlow()!.netChangeInCashAndEquivalents | number:'1.2-2' }}
            </div>
          </div>

          <!-- 5. Ending Cash -->
          <div class="metric-card-box">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-wallet text-slate"></i> {{ langService.currentLang() === 'ar' ? 'نقدية نهاية الفترة' : 'Ending Cash' }}</span>
              <span class="seg-badge bg-slate-subtle">111</span>
            </div>
            <div class="seg-val font-mono font-bold text-slate">
              {{ cashFlow()!.cashAtEndOfPeriod | number:'1.2-2' }}
            </div>
          </div>

          <!-- 6. GL Reconciliation -->
          <div class="metric-card-box" [class.metric-box-success]="cashFlow()!.isReconciled" [class.metric-box-danger]="!cashFlow()!.isReconciled">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-shield" [class.text-emerald]="cashFlow()!.isReconciled" [class.text-rose]="!cashFlow()!.isReconciled"></i> {{ langService.currentLang() === 'ar' ? 'مطابقة الخزينة' : 'Reconciliation' }}</span>
              <span class="badge-balanced" *ngIf="cashFlow()!.isReconciled">
                <i class="pi pi-check"></i> 100%
              </span>
              <span class="badge-unbalanced" *ngIf="!cashFlow()!.isReconciled">
                <i class="pi pi-exclamation-triangle"></i> فارق
              </span>
            </div>
            <div class="seg-val font-mono font-bold text-emerald" *ngIf="cashFlow()!.isReconciled">
              0.00 <small>SAR</small>
            </div>
            <div class="seg-val font-mono font-bold text-rose" *ngIf="!cashFlow()!.isReconciled">
              {{ cashFlow()!.reconciliationDifference | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>
        </section>

        <!-- Compact Filters & Controls Bar (Identical ERP Standard) -->
        <section class="fs-filters-card">
          <div class="filters-row">
            <!-- From Date -->
            <div class="form-group date-group">
              <label><i class="pi pi-calendar"></i> <span>{{ langService.currentLang() === 'ar' ? 'من تاريخ:' : 'From:' }}</span></label>
              <input type="date" class="form-control" [(ngModel)]="fromDate" (change)="loadCashFlowStatement()" />
            </div>

            <!-- To Date -->
            <div class="form-group date-group">
              <label><i class="pi pi-calendar"></i> <span>{{ langService.currentLang() === 'ar' ? 'إلى تاريخ:' : 'To:' }}</span></label>
              <input type="date" class="form-control" [(ngModel)]="toDate" (change)="loadCashFlowStatement()" />
            </div>

            <!-- Cost Center -->
            <div class="form-group cc-group">
              <label><i class="pi pi-compass"></i> <span>{{ langService.currentLang() === 'ar' ? 'مركز التكلفة:' : 'Cost Center:' }}</span></label>
              <select class="form-control" [(ngModel)]="selectedCostCenterId" (change)="loadCashFlowStatement()">
                <option value="">{{ langService.currentLang() === 'ar' ? 'كافة مراكز التكلفة' : 'All Cost Centers' }}</option>
                <option *ngFor="let cc of costCenters" [value]="cc.id">{{ cc.code }} - {{ cc.nameAr }}</option>
              </select>
            </div>

            <!-- Calculation Method -->
            <div class="form-group format-group">
              <label><i class="pi pi-sliders-h"></i> <span>{{ langService.currentLang() === 'ar' ? 'طريقة الاحتساب:' : 'Method:' }}</span></label>
              <select class="form-control" [(ngModel)]="cashFlowMethod" (change)="loadCashFlowStatement()">
                <option value="indirect">{{ langService.currentLang() === 'ar' ? 'غير مباشرة (IAS 7 القياسي)' : 'Indirect (IAS 7)' }}</option>
                <option value="direct">{{ langService.currentLang() === 'ar' ? 'مباشرة (Direct Method)' : 'Direct' }}</option>
              </select>
            </div>

            <!-- Hide Zero Toggle -->
            <div class="form-group toggle-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="hideZeroBalances" (change)="loadCashFlowStatement()" />
                <span>{{ langService.currentLang() === 'ar' ? 'إخفاء الأرصدة الصفرية' : 'Hide Zeros' }}</span>
              </label>
            </div>
          </div>

          <!-- Presets and Action Buttons -->
          <div class="filters-subbar">
            <div class="presets-group">
              <span class="preset-label">{{ langService.currentLang() === 'ar' ? 'فترات سريعة:' : 'Presets:' }}</span>
              <button class="preset-btn" (click)="setPreset('thisYear')">{{ langService.currentLang() === 'ar' ? 'هذا العام' : 'This Year' }}</button>
              <button class="preset-btn" (click)="setPreset('thisQuarter')">{{ langService.currentLang() === 'ar' ? 'الربع الحالي' : 'This Quarter' }}</button>
              <button class="preset-btn" (click)="setPreset('thisMonth')">{{ langService.currentLang() === 'ar' ? 'هذا الشهر' : 'This Month' }}</button>
            </div>

            <div class="actions-group">
              <button class="secondary-btn" (click)="loadCashFlowStatement()" [disabled]="loading()">
                <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'تحديث' : 'Refresh' }}</span>
              </button>
              <button class="secondary-btn btn-export" (click)="exportCashFlowExcel()" [disabled]="!cashFlow()">
                <i class="pi pi-file-excel text-emerald"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'تصدير Excel منسق' : 'Export Excel' }}</span>
              </button>
              <button class="primary-btn btn-print" (click)="openPrintModal('cash-flow')" [disabled]="!cashFlow()">
                <i class="pi pi-print"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'طباعة القائمة A4' : 'Print A4' }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Cash Flow Statement Data Table Card -->
        <section class="fs-table-card" *ngIf="cashFlow()">
          <div class="table-top-header">
            <div class="table-title-box">
              <i class="pi pi-money-bill text-emerald"></i>
              <h3 class="table-title-text">
                {{ langService.currentLang() === 'ar' ? 'قائمة التدفقات النقدية (IAS 7) عن الفترة من' : 'Statement of Cash Flows (IAS 7) for period' }}
                {{ cashFlow()!.fromDate | date:'yyyy-MM-dd' }} 
                {{ langService.currentLang() === 'ar' ? 'إلى' : 'to' }} 
                {{ cashFlow()!.toDate | date:'yyyy-MM-dd' }}
              </h3>
            </div>
            <div class="header-status-group">
              <span class="count-badge" [class.badge-balanced]="cashFlow()!.isReconciled">
                <i class="pi pi-verified"></i>
                {{ cashFlow()!.isReconciled ? (langService.currentLang() === 'ar' ? 'مطابقة 100% مع أرصدة الخزينة والبنوك' : '100% Reconciled') : 'فارق تسوية' }}
              </span>
              <span class="count-badge">
                {{ langService.currentLang() === 'ar' ? 'العملة: ريال سعودي (SAR)' : 'Currency: SAR' }}
              </span>
            </div>
          </div>

          <div class="table-responsive">
            <table class="fs-statement-table">
              <thead>
                <tr>
                  <th class="th-code">{{ langService.currentLang() === 'ar' ? 'رمز الحساب' : 'Code' }}</th>
                  <th class="th-name">{{ langService.currentLang() === 'ar' ? 'البيان والبنود المحاسبية' : 'Account / Financial Item' }}</th>
                  <th class="th-level">{{ langService.currentLang() === 'ar' ? 'المستوى' : 'Level' }}</th>
                  <th class="th-amount">{{ langService.currentLang() === 'ar' ? 'المبلغ (SAR)' : 'Amount (SAR)' }}</th>
                  <th class="th-action">{{ langService.currentLang() === 'ar' ? 'كشف الحساب' : 'Ledger' }}</th>
                </tr>
              </thead>
              <tbody>

                <!-- ================= 1. OPERATING ACTIVITIES ================= -->
                <tr class="section-header-row bg-emerald-tint">
                  <td colspan="3">
                    <strong><i class="pi pi-bolt text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'أولاً: التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)' : 'I. Cash Flows from Operating Activities' }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald">
                    {{ cashFlow()!.netCashFromOperatingActivities | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- Starting Net Profit / Loss -->
                <tr class="item-row">
                  <td class="td-code font-mono">-</td>
                  <td class="td-name" style="padding-inline-start: 10px;">
                    <span class="tree-bullet"></span>
                    <strong>{{ langService.currentLang() === 'ar' ? 'صافي أرباح / (خسائر) الفترة المحاسبية (محول آلياً من قائمة الدخل)' : 'Net Profit / (Loss) for the period' }}</strong>
                  </td>
                  <td class="td-level"><span class="level-pill">P&L</span></td>
                  <td class="td-amount font-mono font-bold" [class.text-emerald]="cashFlow()!.startingNetProfitOrLoss >= 0" [class.text-rose]="cashFlow()!.startingNetProfitOrLoss < 0">
                    {{ cashFlow()!.startingNetProfitOrLoss | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- Non-Cash Adjustments Head -->
                <tr class="sub-section-head bg-slate-subtle">
                  <td class="td-code font-mono text-muted">{{ cashFlow()!.nonCashAdjustments.code }}</td>
                  <td colspan="2" class="td-name" style="padding-inline-start: 15px;">
                    <i class="pi pi-sliders-v text-emerald"></i>
                    <strong>{{ cashFlow()!.nonCashAdjustments.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald">
                    {{ cashFlow()!.nonCashAdjustments.totalAmount | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let it of cashFlow()!.nonCashAdjustments.items" class="item-row">
                  <td class="td-code font-mono">{{ it.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(it.level * 16)">
                    <span class="tree-bullet"></span>
                    <span>{{ it.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ it.level }}</span></td>
                  <td class="td-amount font-mono">{{ it.amount | number:'1.2-2' }}</td>
                  <td class="td-action">
                    <a *ngIf="it.isPostable && it.accountId" [routerLink]="['/accounting/general-ledger']" [queryParams]="{ accountId: it.accountId }" class="btn-statement-link">
                      <i class="pi pi-external-link"></i>
                    </a>
                  </td>
                </tr>

                <!-- Subtotal: Operating profit before WC -->
                <tr class="subtotal-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-check text-amber"></i>
                      <span>{{ langService.currentLang() === 'ar' ? 'الربح التشغيلي قبل التغيرات في رأس المال العامل' : 'Operating Profit before Working Capital Changes' }}</span>
                    </div>
                  </td>
                  <td class="td-amount font-mono font-bold text-amber">
                    {{ cashFlow()!.operatingProfitBeforeWorkingCapitalChanges | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- Working Capital Changes Head -->
                <tr class="sub-section-head bg-slate-subtle">
                  <td class="td-code font-mono text-muted">{{ cashFlow()!.workingCapitalChanges.code }}</td>
                  <td colspan="2" class="td-name" style="padding-inline-start: 15px;">
                    <i class="pi pi-refresh text-cyan"></i>
                    <strong>{{ cashFlow()!.workingCapitalChanges.titleAr }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-cyan">
                    {{ cashFlow()!.workingCapitalChanges.totalAmount | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let it of cashFlow()!.workingCapitalChanges.items" class="item-row">
                  <td class="td-code font-mono">{{ it.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(it.level * 16)">
                    <span class="tree-bullet"></span>
                    <span>{{ it.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ it.level }}</span></td>
                  <td class="td-amount font-mono" [class.text-rose]="it.amount < 0" [class.text-emerald]="it.amount > 0">
                    {{ it.amount < 0 ? '(' + (-it.amount | number:'1.2-2') + ')' : (it.amount | number:'1.2-2') }}
                  </td>
                  <td></td>
                </tr>

                <!-- TOTAL OPERATING -->
                <tr class="subtotal-row gross-profit-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-check-circle text-emerald"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'صافي النقدية المتولدة من الأنشطة التشغيلية' : 'Net Cash from Operating Activities' }}</strong>
                    </div>
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald">
                    {{ cashFlow()!.netCashFromOperatingActivities | number:'1.2-2' }} SAR
                  </td>
                  <td></td>
                </tr>

                <!-- ================= 2. INVESTING ACTIVITIES ================= -->
                <tr class="section-header-row bg-cyan-tint">
                  <td colspan="3">
                    <strong><i class="pi pi-box text-cyan"></i> {{ langService.currentLang() === 'ar' ? 'ثانياً: التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities / CapEx)' : 'II. Cash Flows from Investing Activities' }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-cyan">
                    {{ cashFlow()!.netCashFromInvestingActivities | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let it of cashFlow()!.investingActivities.items" class="item-row">
                  <td class="td-code font-mono">{{ it.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(it.level * 16)">
                    <span class="tree-bullet"></span>
                    <span>{{ it.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ it.level }}</span></td>
                  <td class="td-amount font-mono" [class.text-rose]="it.amount < 0" [class.text-emerald]="it.amount > 0">
                    {{ it.amount < 0 ? '(' + (-it.amount | number:'1.2-2') + ')' : (it.amount | number:'1.2-2') }}
                  </td>
                  <td></td>
                </tr>
                <tr class="subtotal-row total-liabilities-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-check-circle text-cyan"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'صافي النقدية المستخدمة في الأنشطة الاستثمارية' : 'Net Cash used in Investing Activities' }}</strong>
                    </div>
                  </td>
                  <td class="td-amount font-mono font-bold text-cyan">
                    {{ cashFlow()!.netCashFromInvestingActivities | number:'1.2-2' }} SAR
                  </td>
                  <td></td>
                </tr>

                <!-- ================= 3. FINANCING ACTIVITIES ================= -->
                <tr class="section-header-row bg-amber-tint">
                  <td colspan="3">
                    <strong><i class="pi pi-briefcase text-amber"></i> {{ langService.currentLang() === 'ar' ? 'ثالثاً: التدفقات النقدية من الأنشطة التمويلية (Financing Activities)' : 'III. Cash Flows from Financing Activities' }}</strong>
                  </td>
                  <td class="td-amount font-mono font-bold text-amber">
                    {{ cashFlow()!.netCashFromFinancingActivities | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
                <tr *ngFor="let it of cashFlow()!.financingActivities.items" class="item-row">
                  <td class="td-code font-mono">{{ it.accountCode }}</td>
                  <td class="td-name" [style.padding-inline-start.px]="(it.level * 16)">
                    <span class="tree-bullet"></span>
                    <span>{{ it.nameAr }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">L{{ it.level }}</span></td>
                  <td class="td-amount font-mono" [class.text-rose]="it.amount < 0" [class.text-emerald]="it.amount > 0">
                    {{ it.amount < 0 ? '(' + (-it.amount | number:'1.2-2') + ')' : (it.amount | number:'1.2-2') }}
                  </td>
                  <td></td>
                </tr>
                <tr class="subtotal-row total-equity-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-check-circle text-amber"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'صافي النقدية من الأنشطة التمويلية' : 'Net Cash from Financing Activities' }}</strong>
                    </div>
                  </td>
                  <td class="td-amount font-mono font-bold text-amber">
                    {{ cashFlow()!.netCashFromFinancingActivities | number:'1.2-2' }} SAR
                  </td>
                  <td></td>
                </tr>

                <!-- ================= 4. SUMMARY & RECONCILIATION ================= -->
                <!-- Grand Total: Net Change in Cash -->
                <tr class="grand-total-row" [class.is-profit]="cashFlow()!.netChangeInCashAndEquivalents >= 0" [class.is-loss]="cashFlow()!.netChangeInCashAndEquivalents < 0">
                  <td colspan="3">
                    <div class="grand-total-title">
                      <i class="pi pi-star-fill text-emerald"></i>
                      <span>{{ langService.currentLang() === 'ar' ? 'صافي التغير في النقدية وما في حكمها خلال الفترة' : 'Net Change in Cash and Cash Equivalents' }}</span>
                    </div>
                  </td>
                  <td class="td-amount font-mono font-bold grand-total-amount" [class.text-emerald]="cashFlow()!.netChangeInCashAndEquivalents >= 0" [class.text-rose]="cashFlow()!.netChangeInCashAndEquivalents < 0">
                    {{ cashFlow()!.netChangeInCashAndEquivalents | number:'1.2-2' }} SAR
                  </td>
                  <td></td>
                </tr>

                <!-- Cash at beginning of period -->
                <tr class="item-row">
                  <td class="td-code font-mono">-</td>
                  <td class="td-name" style="padding-inline-start: 10px;">
                    <i class="pi pi-calendar text-muted"></i>
                    <span>{{ langService.currentLang() === 'ar' ? 'رصيد النقدية وما في حكمها في بداية الفترة' : 'Cash at beginning of period' }}</span>
                  </td>
                  <td class="td-level"><span class="level-pill">Start</span></td>
                  <td class="td-amount font-mono font-bold">
                    {{ cashFlow()!.cashAtBeginningOfPeriod | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- Cash at end of period -->
                <tr class="item-row bg-slate-subtle">
                  <td class="td-code font-mono">-</td>
                  <td class="td-name" style="padding-inline-start: 10px;">
                    <i class="pi pi-calendar-plus text-muted"></i>
                    <strong>{{ langService.currentLang() === 'ar' ? 'رصيد النقدية وما في حكمها المحسوب في نهاية الفترة' : 'Calculated cash at end of period' }}</strong>
                  </td>
                  <td class="td-level"><span class="level-pill">End</span></td>
                  <td class="td-amount font-mono font-bold text-slate">
                    {{ cashFlow()!.cashAtEndOfPeriod | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>

                <!-- Actual Cash in General Ledger (Prefix 111) -->
                <tr class="subtotal-row total-assets-row">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-building-columns text-emerald"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'الرصيد الفعلي في دفتر الأستاذ لحسابات الصندوق والبنوك (كود 111)' : 'Actual Cash & Bank balance in General Ledger (111)' }}</strong>
                    </div>
                  </td>
                  <td class="td-amount font-mono font-bold text-emerald">
                    {{ cashFlow()!.actualCashBalanceInGeneralLedger | number:'1.2-2' }} SAR
                  </td>
                  <td></td>
                </tr>

                <!-- Audit Reconciliation Status Row -->
                <tr class="item-row" [class.bg-emerald-tint]="cashFlow()!.isReconciled" [class.bg-rose-tint]="!cashFlow()!.isReconciled">
                  <td colspan="3">
                    <div class="subtotal-title">
                      <i class="pi pi-check-circle" [class.text-emerald]="cashFlow()!.isReconciled" [class.text-rose]="!cashFlow()!.isReconciled"></i>
                      <strong>{{ langService.currentLang() === 'ar' ? 'حالة المطابقة المحاسبية مع دفتر الأستاذ:' : 'Audit Reconciliation Status:' }}</strong>
                      <span class="badge-balanced mr-2" *ngIf="cashFlow()!.isReconciled">
                        {{ langService.currentLang() === 'ar' ? 'مطابقة تامة 100% (فارق 0.00 ريال)' : '100% Reconciled (Diff: 0.00 SAR)' }}
                      </span>
                      <span class="badge-unbalanced mr-2" *ngIf="!cashFlow()!.isReconciled">
                        {{ langService.currentLang() === 'ar' ? 'يوجد فارق تسوية قدره:' : 'Reconciliation Diff:' }} {{ cashFlow()!.reconciliationDifference | number:'1.2-2' }} SAR
                      </span>
                    </div>
                  </td>
                  <td class="td-amount font-mono font-bold" [class.text-emerald]="cashFlow()!.isReconciled" [class.text-rose]="!cashFlow()!.isReconciled">
                    {{ cashFlow()!.reconciliationDifference | number:'1.2-2' }} SAR
                  </td>
                  <td></td>
                </tr>

              </tbody>
            </table>
          </div>

          <!-- Tafqeet & Reconciliation Strip -->
          <div class="tafqeet-strip">
            <i class="pi pi-receipt text-emerald"></i>
            <span class="tafqeet-label">{{ langService.currentLang() === 'ar' ? 'صافي التدفق كتابة:' : 'Amount in Words:' }}</span>
            <span class="tafqeet-text">{{ cashFlow()!.netCashTafqeetAr }}</span>
          </div>

          <div class="ratios-footer-strip">
            <div class="ratio-pill">
              <span class="lbl"><i class="pi pi-bolt text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'التشغيلية:' : 'Operating:' }}</span>
              <span class="val font-mono">{{ cashFlow()!.netCashFromOperatingActivities | number:'1.2-2' }} SAR</span>
            </div>
            <div class="ratio-pill">
              <span class="lbl"><i class="pi pi-box text-cyan"></i> {{ langService.currentLang() === 'ar' ? 'الاستثمارية:' : 'Investing:' }}</span>
              <span class="val font-mono">{{ cashFlow()!.netCashFromInvestingActivities | number:'1.2-2' }} SAR</span>
            </div>
            <div class="ratio-pill">
              <span class="lbl"><i class="pi pi-briefcase text-amber"></i> {{ langService.currentLang() === 'ar' ? 'التمويلية:' : 'Financing:' }}</span>
              <span class="val font-mono">{{ cashFlow()!.netCashFromFinancingActivities | number:'1.2-2' }} SAR</span>
            </div>
            <div class="ratio-pill">
              <span class="lbl"><i class="pi pi-verified text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'نسبة المطابقة:' : 'Reconciliation:' }}</span>
              <span class="val font-mono text-emerald">{{ cashFlow()!.isReconciled ? '100%' : 'فارق تسوية' }}</span>
            </div>
          </div>
        </section>

      </ng-container>

      <!-- =========================================================================
           TAB 4: EQUITY (قائمة التغير في حقوق الملكية وفق معيار IAS 1)
           ========================================================================= -->
      <ng-container *ngIf="activeTab === 'equity'">

        <!-- Compact Unified Metrics Bar (Equity) -->
        <section class="fs-metrics-bar" *ngIf="equityStatement()">
          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-building text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'رأس المال المدفوع' : 'Share Capital' }}</span>
              <span class="seg-badge bg-emerald-subtle">حساب 31</span>
            </div>
            <div class="seg-val font-mono text-emerald">
              {{ (equityStatement()!.rows.length > 0 ? equityStatement()!.rows[equityStatement()!.rows.length - 1].shareCapital : 0) | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-shield text-cyan"></i> {{ langService.currentLang() === 'ar' ? 'الاحتياطي النظامي (10%)' : 'Statutory Reserve' }}</span>
              <span class="seg-badge bg-cyan-subtle">نظام الشركات</span>
            </div>
            <div class="seg-val font-mono text-cyan">
              {{ (equityStatement()!.rows.length > 0 ? equityStatement()!.rows[equityStatement()!.rows.length - 1].statutoryReserve : 0) | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-database text-amber"></i> {{ langService.currentLang() === 'ar' ? 'الأرباح المبقاة والمحتجزة' : 'Retained Earnings' }}</span>
              <span class="seg-badge bg-amber-subtle">حساب 32102</span>
            </div>
            <div class="seg-val font-mono text-amber">
              {{ (equityStatement()!.rows.length > 0 ? equityStatement()!.rows[equityStatement()!.rows.length - 1].retainedEarnings : 0) | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment metric-segment-highlight" [class.is-profit]="equityStatement()!.endingTotalEquity >= 0" [class.is-loss]="equityStatement()!.endingTotalEquity < 0">
            <div class="seg-top">
              <span class="seg-lbl">
                <i [class]="equityStatement()!.endingTotalEquity >= 0 ? 'pi pi-check-circle text-emerald' : 'pi pi-exclamation-triangle text-rose'"></i>
                <strong>{{ langService.currentLang() === 'ar' ? 'إجمالي حقوق الملكية الختامية' : 'Ending Total Equity' }}</strong>
              </span>
              <span class="seg-badge-solid" [class.bg-emerald]="equityStatement()!.endingTotalEquity >= 0" [class.bg-rose]="equityStatement()!.endingTotalEquity < 0">
                IAS 1 Mapped
              </span>
            </div>
            <div class="seg-val font-mono font-bold" [class.text-emerald]="equityStatement()!.endingTotalEquity >= 0" [class.text-rose]="equityStatement()!.endingTotalEquity < 0">
              {{ equityStatement()!.endingTotalEquity | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>
        </section>

        <!-- Compact Filters & Controls Bar (Equity) -->
        <section class="fs-filters-card">
          <div class="filters-row">
            <div class="form-group date-group">
              <label><i class="pi pi-calendar"></i> <span>{{ langService.currentLang() === 'ar' ? 'من تاريخ:' : 'From:' }}</span></label>
              <input type="date" class="form-control" [(ngModel)]="fromDate" (change)="loadEquityStatement()" />
            </div>

            <div class="form-group date-group">
              <label><i class="pi pi-calendar"></i> <span>{{ langService.currentLang() === 'ar' ? 'إلى تاريخ:' : 'To:' }}</span></label>
              <input type="date" class="form-control" [(ngModel)]="toDate" (change)="loadEquityStatement()" />
            </div>
          </div>

          <div class="filters-subbar">
            <div class="presets-group">
              <span class="preset-label">{{ langService.currentLang() === 'ar' ? 'فترات سريعة:' : 'Presets:' }}</span>
              <button class="preset-btn" (click)="setPreset('thisYear')">{{ langService.currentLang() === 'ar' ? 'هذا العام' : 'This Year' }}</button>
              <button class="preset-btn" (click)="setPreset('thisQuarter')">{{ langService.currentLang() === 'ar' ? 'الربع الحالي' : 'This Quarter' }}</button>
              <button class="preset-btn" (click)="setPreset('thisMonth')">{{ langService.currentLang() === 'ar' ? 'هذا الشهر' : 'This Month' }}</button>
            </div>

            <div class="actions-group">
              <button class="secondary-btn" (click)="loadEquityStatement()" [disabled]="loading()">
                <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'تحديث' : 'Refresh' }}</span>
              </button>
              <button class="primary-btn btn-print" (click)="windowPrint()">
                <i class="pi pi-print"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'طباعة القائمة A4' : 'Print A4' }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Equity Statement Data Table -->
        <section class="fs-table-card" *ngIf="equityStatement()">
          <div class="table-top-header">
            <div class="table-title-box">
              <i class="pi pi-users text-emerald"></i>
              <h3 class="table-title-text">
                {{ langService.currentLang() === 'ar' ? 'قائمة التغير في حقوق الملكية عن الفترة من' : 'Statement of Changes in Equity for period' }}
                {{ equityStatement()!.fromDate | date:'yyyy-MM-dd' }} 
                {{ langService.currentLang() === 'ar' ? 'إلى' : 'to' }} 
                {{ equityStatement()!.toDate | date:'yyyy-MM-dd' }}
              </h3>
            </div>
            <span class="count-badge">
              <i class="pi pi-verified"></i>
              {{ langService.currentLang() === 'ar' ? 'متوافقة مع معيار المحاسبة الدولي (IAS 1)' : 'IAS 1 Compliant' }}
            </span>
          </div>

          <div class="table-responsive">
            <table class="fs-statement-table">
              <thead>
                <tr>
                  <th class="th-name" style="min-width: 280px;">{{ langService.currentLang() === 'ar' ? 'بيان حركة العمليات وحقوق المساهمين' : 'Equity Transaction / Movement' }}</th>
                  <th class="th-amount font-mono">{{ langService.currentLang() === 'ar' ? 'رأس المال (SAR)' : 'Share Capital' }}</th>
                  <th class="th-amount font-mono">{{ langService.currentLang() === 'ar' ? 'الاحتياطي النظامي (SAR)' : 'Statutory Reserve' }}</th>
                  <th class="th-amount font-mono">{{ langService.currentLang() === 'ar' ? 'الأرباح المبقاة (SAR)' : 'Retained Earnings' }}</th>
                  <th class="th-amount font-mono">{{ langService.currentLang() === 'ar' ? 'أرباح / (خسائر) الفترة' : 'Period Net P&L' }}</th>
                  <th class="th-amount font-mono" style="background: rgba(16, 185, 129, 0.08);">{{ langService.currentLang() === 'ar' ? 'إجمالي حقوق الملكية (SAR)' : 'Total Equity' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of equityStatement()!.rows" [class.subtotal-row]="row.isBold" [class.grand-total-row]="row === equityStatement()!.rows[equityStatement()!.rows.length - 1]">
                  <td class="td-name">
                    <strong *ngIf="row.isBold">{{ langService.currentLang() === 'ar' ? row.activityAr : row.activityEn }}</strong>
                    <span *ngIf="!row.isBold">{{ langService.currentLang() === 'ar' ? row.activityAr : row.activityEn }}</span>
                  </td>
                  <td class="td-amount font-mono" [class.font-bold]="row.isBold">{{ row.shareCapital | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono" [class.font-bold]="row.isBold">{{ row.statutoryReserve | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono" [class.font-bold]="row.isBold" [class.text-rose]="row.retainedEarnings < 0">{{ row.retainedEarnings | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono" [class.font-bold]="row.isBold" [class.text-emerald]="row.currentYearProfit > 0" [class.text-rose]="row.currentYearProfit < 0">{{ row.currentYearProfit | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold" [class.text-emerald]="row.totalEquity >= 0" [class.text-rose]="row.totalEquity < 0" style="background: rgba(16, 185, 129, 0.04);">
                    {{ row.totalEquity | number:'1.2-2' }} SAR
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="tafqeet-strip">
            <i class="pi pi-info-circle text-emerald"></i>
            <span class="tafqeet-label">{{ langService.currentLang() === 'ar' ? 'إجمالي حقوق الملكية كتابة:' : 'Total Equity in Words:' }}</span>
            <strong class="tafqeet-text">{{ equityStatement()!.endingEquityTafqeetAr }}</strong>
          </div>
        </section>

      </ng-container>

      <!-- =========================================================================
           TAB 5: ZATCA VAT RETURN (إقرار ضريبة القيمة المضافة الرسمي لهيئة الزكاة)
           ========================================================================= -->
      <ng-container *ngIf="activeTab === 'vat-return'">

        <!-- Compact Unified Metrics Bar (VAT Return) -->
        <section class="fs-metrics-bar" *ngIf="vatReturn()">
          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-shopping-bag text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'إجمالي المبيعات الخاضعة 15%' : 'Standard Sales (15%)' }}</span>
              <span class="seg-badge bg-emerald-subtle">بند 1</span>
            </div>
            <div class="seg-val font-mono text-emerald">
              {{ vatReturn()!.standardRatedSales.amount | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-arrow-up-right text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'إجمالي ضريبة المخرجات' : 'Total Output VAT' }}</span>
              <span class="seg-badge bg-emerald-subtle">بند 12</span>
            </div>
            <div class="seg-val font-mono text-emerald">
              {{ vatReturn()!.totalVatDue | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment">
            <div class="seg-top">
              <span class="seg-lbl"><i class="pi pi-arrow-down-left text-cyan"></i> {{ langService.currentLang() === 'ar' ? 'إجمالي ضريبة المدخلات' : 'Total Input VAT' }}</span>
              <span class="seg-badge bg-cyan-subtle">بند 13</span>
            </div>
            <div class="seg-val font-mono text-cyan">
              {{ vatReturn()!.totalVatDeductible | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>

          <div class="seg-divider"></div>

          <div class="metric-segment metric-segment-highlight" [class.is-profit]="!vatReturn()!.isRefundable" [class.is-loss]="vatReturn()!.isRefundable">
            <div class="seg-top">
              <span class="seg-lbl">
                <i [class]="!vatReturn()!.isRefundable ? 'pi pi-exclamation-circle text-amber' : 'pi pi-check-circle text-emerald'"></i>
                <strong>{{ langService.currentLang() === 'ar' ? 'صافي الضريبة (بند 16)' : 'Net VAT Due / Refundable' }}</strong>
              </span>
              <span class="seg-badge-solid" [class.bg-amber]="!vatReturn()!.isRefundable" [class.bg-emerald]="vatReturn()!.isRefundable">
                {{ !vatReturn()!.isRefundable ? (langService.currentLang() === 'ar' ? 'واجبة السداد' : 'Payable') : (langService.currentLang() === 'ar' ? 'مستردة للمكلف' : 'Refundable') }}
              </span>
            </div>
            <div class="seg-val font-mono font-bold" [class.text-amber]="!vatReturn()!.isRefundable" [class.text-emerald]="vatReturn()!.isRefundable">
              {{ vatReturn()!.netVatPayableOrRefundable | number:'1.2-2' }} <small>SAR</small>
            </div>
          </div>
        </section>

        <!-- Compact Filters & Controls Bar (VAT Return) -->
        <section class="fs-filters-card">
          <div class="filters-row">
            <div class="form-group date-group">
              <label><i class="pi pi-calendar"></i> <span>{{ langService.currentLang() === 'ar' ? 'من تاريخ:' : 'From:' }}</span></label>
              <input type="date" class="form-control" [(ngModel)]="fromDate" (change)="loadZatcaVatReturn()" />
            </div>

            <div class="form-group date-group">
              <label><i class="pi pi-calendar"></i> <span>{{ langService.currentLang() === 'ar' ? 'إلى تاريخ:' : 'To:' }}</span></label>
              <input type="date" class="form-control" [(ngModel)]="toDate" (change)="loadZatcaVatReturn()" />
            </div>

            <div class="form-group cc-group">
              <label><i class="pi pi-sliders-h"></i> <span>{{ langService.currentLang() === 'ar' ? 'تعديلات فترات سابقة (بند 15):' : 'Prior Adjustments:' }}</span></label>
              <input type="number" class="form-control font-mono" [(ngModel)]="vatAdjustments" (change)="loadZatcaVatReturn()" placeholder="0.00" />
            </div>
          </div>

          <div class="filters-subbar">
            <div class="presets-group">
              <span class="preset-label">{{ langService.currentLang() === 'ar' ? 'الفترات الضريبية:' : 'Tax Quarters:' }}</span>
              <button class="preset-btn" (click)="setPreset('thisQuarter')">{{ langService.currentLang() === 'ar' ? 'الربع الحالي' : 'Current Quarter' }}</button>
              <button class="preset-btn" (click)="setPreset('thisYear')">{{ langService.currentLang() === 'ar' ? 'السنة الضريبية كاملة' : 'Full Tax Year' }}</button>
            </div>

            <div class="actions-group">
              <button class="secondary-btn" (click)="loadZatcaVatReturn()" [disabled]="loading()">
                <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'تحديث' : 'Refresh' }}</span>
              </button>
              <button class="primary-btn btn-print" (click)="windowPrint()">
                <i class="pi pi-print"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'طباعة نموذج الإقرار A4' : 'Print ZATCA Form A4' }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Official ZATCA 16-Boxes Table Card -->
        <section class="fs-table-card" *ngIf="vatReturn()">
          <div class="table-top-header">
            <div class="table-title-box">
              <i class="pi pi-percentage text-emerald"></i>
              <h3 class="table-title-text">
                {{ langService.currentLang() === 'ar' ? 'إقرار ضريبة القيمة المضافة - هيئة الزكاة والضريبة والجمارك (ZATCA)' : 'ZATCA VAT Return Form' }}
              </h3>
            </div>
            <span class="count-badge">
              <i class="pi pi-id-card"></i>
              {{ langService.currentLang() === 'ar' ? 'الرقم الضريبي:' : 'TIN:' }} {{ vatReturn()!.vatRegistrationNumber }}
            </span>
          </div>

          <div class="table-responsive">
            <table class="fs-statement-table">
              <thead>
                <tr>
                  <th style="width: 70px;">{{ langService.currentLang() === 'ar' ? 'رقم البند' : 'Box' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'البيان والوصف الرسمي لهيئة الزكاة والضريبة والجمارك' : 'ZATCA Description' }}</th>
                  <th class="th-amount font-mono">{{ langService.currentLang() === 'ar' ? 'المبلغ الخاضع للضريبة (SAR)' : 'Taxable Amount' }}</th>
                  <th class="th-amount font-mono">{{ langService.currentLang() === 'ar' ? 'التعديل (SAR)' : 'Adjustment' }}</th>
                  <th class="th-amount font-mono">{{ langService.currentLang() === 'ar' ? 'مبلغ الضريبة (SAR)' : 'VAT Amount' }}</th>
                </tr>
              </thead>
              <tbody>

                <!-- Section 1: Sales / Supplies -->
                <tr class="section-header-row bg-emerald-tint">
                  <td colspan="5">
                    <strong><i class="pi pi-folder-open text-emerald"></i> أولاً: المبيعات / التوريدات (Sales & Supplies)</strong>
                  </td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">1</td>
                  <td>المبيعات الخاضعة للنسبة الأساسية (15%)</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.standardRatedSales.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.standardRatedSales.adjustment | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold text-emerald">{{ vatReturn()!.standardRatedSales.vatAmount | number:'1.2-2' }}</td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">2</td>
                  <td>المبيعات لعملاء مسجلين في دول مجلس التعاون الخليجي</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.specialSalesToGcc.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.specialSalesToGcc.adjustment | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.specialSalesToGcc.vatAmount | number:'1.2-2' }}</td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">3</td>
                  <td>التوريدات الخاضعة للنسبة الصفرية (الصادرات والخدمات المؤهلة)</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.zeroRatedSales.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.zeroRatedSales.adjustment | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.zeroRatedSales.vatAmount | number:'1.2-2' }}</td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">4</td>
                  <td>التوريدات المعفاة من الضريبة</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.exemptSales.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.exemptSales.adjustment | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.exemptSales.vatAmount | number:'1.2-2' }}</td>
                </tr>
                <tr class="subtotal-row gross-profit-row">
                  <td class="font-mono text-center font-bold">5</td>
                  <td><strong>إجمالي المبيعات والتوريدات (البنود 1 + 2 + 3 + 4)</strong></td>
                  <td class="td-amount font-mono font-bold">{{ vatReturn()!.totalSales.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold">0.00</td>
                  <td class="td-amount font-mono font-bold text-emerald">{{ vatReturn()!.totalSales.vatAmount | number:'1.2-2' }}</td>
                </tr>

                <!-- Section 2: Purchases -->
                <tr class="section-header-row bg-slate-tint">
                  <td colspan="5">
                    <strong><i class="pi pi-folder-open text-slate"></i> ثانياً: المشتريات / النفقات (Purchases & Expenses)</strong>
                  </td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">6</td>
                  <td>المشتريات المحلية الخاضعة للنسبة الأساسية (15%)</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.standardRatedPurchases.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.standardRatedPurchases.adjustment | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold text-cyan">{{ vatReturn()!.standardRatedPurchases.vatAmount | number:'1.2-2' }}</td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">7</td>
                  <td>الاستيراد الخاضع لضريبة القيمة المضافة المدفوعة في الجمارك (15%)</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.customsImports.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.customsImports.adjustment | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono text-cyan">{{ vatReturn()!.customsImports.vatAmount | number:'1.2-2' }}</td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">8</td>
                  <td>الاستيراد الخاضع لآلية الاحتساب العكسي</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.reverseChargeImports.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.reverseChargeImports.adjustment | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono text-cyan">{{ vatReturn()!.reverseChargeImports.vatAmount | number:'1.2-2' }}</td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">9</td>
                  <td>المشتريات الخاضعة للنسبة الصفرية</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.zeroRatedPurchases.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.zeroRatedPurchases.adjustment | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.zeroRatedPurchases.vatAmount | number:'1.2-2' }}</td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">10</td>
                  <td>المشتريات المعفاة من الضريبة</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.exemptPurchases.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.exemptPurchases.adjustment | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.exemptPurchases.vatAmount | number:'1.2-2' }}</td>
                </tr>
                <tr class="subtotal-row gross-profit-row">
                  <td class="font-mono text-center font-bold">11</td>
                  <td><strong>إجمالي المشتريات والنفقات (البنود 6 + 7 + 8 + 9 + 10)</strong></td>
                  <td class="td-amount font-mono font-bold">{{ vatReturn()!.totalPurchases.amount | number:'1.2-2' }}</td>
                  <td class="td-amount font-mono font-bold">0.00</td>
                  <td class="td-amount font-mono font-bold text-cyan">{{ vatReturn()!.totalPurchases.vatAmount | number:'1.2-2' }}</td>
                </tr>

                <!-- Section 3: Totals & Net VAT -->
                <tr class="section-header-row bg-slate-tint">
                  <td colspan="5">
                    <strong><i class="pi pi-folder-open text-slate"></i> ثالثاً: احتساب صافي الضريبة (Net VAT Calculation)</strong>
                  </td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">12</td>
                  <td colspan="3">إجمالي ضريبة القيمة المضافة المستحقة عن الفترة الحالية (ضريبة المخرجات)</td>
                  <td class="td-amount font-mono font-bold text-emerald">{{ vatReturn()!.totalVatDue | number:'1.2-2' }} SAR</td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">13</td>
                  <td colspan="3">إجمالي ضريبة القيمة المضافة القابلة للخصم عن الفترة الحالية (ضريبة المدخلات)</td>
                  <td class="td-amount font-mono font-bold text-cyan">({{ vatReturn()!.totalVatDeductible | number:'1.2-2' }}) SAR</td>
                </tr>
                <tr class="item-row bg-slate-tint">
                  <td class="font-mono text-center font-bold">14</td>
                  <td colspan="3">صافي ضريبة القيمة المضافة للفترة الحالية (البند 12 - البند 13)</td>
                  <td class="td-amount font-mono font-bold">{{ vatReturn()!.netVatDue | number:'1.2-2' }} SAR</td>
                </tr>
                <tr class="item-row">
                  <td class="font-mono text-center font-bold">15</td>
                  <td colspan="3">تصحيحات أو تعديلات من فترات سابقة (وفق إشعارات الهيئة)</td>
                  <td class="td-amount font-mono">{{ vatReturn()!.adjustmentsFromPrevious | number:'1.2-2' }} SAR</td>
                </tr>
                <tr class="grand-total-row" [class.is-profit]="!vatReturn()!.isRefundable" [class.is-loss]="vatReturn()!.isRefundable">
                  <td class="font-mono text-center font-bold text-white">16</td>
                  <td colspan="3">
                    <div class="grand-total-title">
                      <i [class]="!vatReturn()!.isRefundable ? 'pi pi-exclamation-circle text-amber' : 'pi pi-check-circle text-emerald'"></i>
                      <span>{{ !vatReturn()!.isRefundable ? 'صافي الضريبة واجبة السداد للهيئة' : 'صافي الضريبة المستردة لصالح المكلف' }}</span>
                    </div>
                  </td>
                  <td class="td-amount font-mono font-bold grand-total-amount">
                    {{ vatReturn()!.netVatPayableOrRefundable | number:'1.2-2' }} SAR
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          <div class="tafqeet-strip">
            <i class="pi pi-info-circle text-emerald"></i>
            <span class="tafqeet-label">{{ langService.currentLang() === 'ar' ? 'صافي الضريبة المعتمد كتابة:' : 'Net VAT in Words:' }}</span>
            <strong class="tafqeet-text">{{ vatReturn()!.netVatTafqeetAr }}</strong>
          </div>
        </section>

      </ng-container>

      <!-- =========================================================================
           TAB 3: SETTINGS & CONFIGURATION (محددات وسياسات القوائم المالية)
           ========================================================================= -->
      <ng-container *ngIf="activeTab === 'settings'">
        <section class="fs-settings-card">
          <div class="settings-header">
            <div class="settings-title-group">
              <i class="pi pi-sliders-h text-emerald"></i>
              <div>
                <h3 class="settings-title">{{ langService.currentLang() === 'ar' ? 'سياسات ومحددات عرض القوائم المالية' : 'Financial Statement Presentation Policies' }}</h3>
                <p class="settings-sub">{{ langService.currentLang() === 'ar' ? 'تخصيص هيكل العرض ومستوى التفصيل وسياسات الإقفال وفق دورة عمل المنشأة' : 'Configure statement presentation, detail levels, and closing policies' }}</p>
              </div>
            </div>

            <button class="primary-btn btn-save" (click)="saveSettings()" [disabled]="savingSettings()">
              <i class="pi pi-check" [class.pi-spin]="savingSettings()"></i>
              <span>{{ savingSettings() ? (langService.currentLang() === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (langService.currentLang() === 'ar' ? 'حفظ السياسات' : 'Save Policies') }}</span>
            </button>
          </div>

          <!-- Settings Form Grid -->
          <div class="settings-grid" *ngIf="settings()">
            
            <!-- Card 1: Presentation & Formatting -->
            <div class="setting-box">
              <div class="box-head">
                <i class="pi pi-palette text-emerald"></i>
                <h4>{{ langService.currentLang() === 'ar' ? 'طريقة ونمط العرض' : 'Presentation Format' }}</h4>
              </div>
              <div class="box-body">
                <div class="form-group">
                  <label>{{ langService.currentLang() === 'ar' ? 'نمط هيكل قائمة الدخل المعتمد:' : 'Income Statement Presentation:' }}</label>
                  <select class="form-control" [(ngModel)]="settings()!.incomeStatementFormat">
                    <option value="multi-step">{{ langService.currentLang() === 'ar' ? 'متعدد المراحل IFRS (إيرادات، تكلفة مبيعات، مجمل ربح، أرباح تشغيل، صافي ربح)' : 'Multi-Step IFRS (Revenues, COGS, Gross, Operating, Net)' }}</option>
                    <option value="single-step">{{ langService.currentLang() === 'ar' ? 'مرحلة واحدة (إجمالي الإيرادات - إجمالي المصروفات)' : 'Single-Step (Total Revenues - Total Expenses)' }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>{{ langService.currentLang() === 'ar' ? 'دقة الأرقام والكسور:' : 'Decimal Precision:' }}</label>
                  <select class="form-control" [(ngModel)]="settings()!.decimalPlaces">
                    <option [ngValue]="2">{{ langService.currentLang() === 'ar' ? 'خانتان عشريتان (هللات 0.00) - القياسي محاسبياً' : '2 Decimals (0.00)' }}</option>
                    <option [ngValue]="0">{{ langService.currentLang() === 'ar' ? 'تقريب لأقرب ريال صحيح (0) - للتقارير التنفيذية ومجالس الإدارة' : 'Whole SAR (0)' }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>{{ langService.currentLang() === 'ar' ? 'الأساس المحاسبي المتبع:' : 'Accounting Basis:' }}</label>
                  <select class="form-control" [(ngModel)]="settings()!.accountingBasis">
                    <option value="accrual">{{ langService.currentLang() === 'ar' ? 'أساس الاستحقاق (Accrual Basis) - معايير المحاسبة الدولية' : 'Accrual Basis (IFRS)' }}</option>
                    <option value="cash">{{ langService.currentLang() === 'ar' ? 'الأساس النقدي (Cash Basis) - للأنشطة والمنشآت الصغيرة' : 'Cash Basis' }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Card 2: Accounting Policies & Retained Earnings -->
            <div class="setting-box">
              <div class="box-head">
                <i class="pi pi-database text-cyan"></i>
                <h4>{{ langService.currentLang() === 'ar' ? 'الحسابات ومستوى التفصيل' : 'Accounts & Depth' }}</h4>
              </div>
              <div class="box-body">
                <div class="form-group">
                  <label>{{ langService.currentLang() === 'ar' ? 'كود حساب الأرباح المبقاة والمحتجزة:' : 'Retained Earnings Account Code:' }}</label>
                  <input type="text" class="form-control font-mono" [(ngModel)]="settings()!.retainedEarningsAccountCode" placeholder="32102" />
                  <small class="hint-text">{{ langService.currentLang() === 'ar' ? 'الحساب المعتمد لترحيل أرباح وخسائر الفترات السابقة في حقوق الملكية (الافتراضي 32102)' : 'Account code for retained earnings in equity' }}</small>
                </div>

                <div class="form-group">
                  <label>{{ langService.currentLang() === 'ar' ? 'مستوى التفصيل الافتراضي للقوائم:' : 'Default Level Depth:' }}</label>
                  <select class="form-control" [(ngModel)]="settings()!.defaultLevelDepth">
                    <option [ngValue]="null">{{ langService.currentLang() === 'ar' ? 'كافة المستويات الشجرية التحليلية' : 'All Levels' }}</option>
                    <option [ngValue]="1">{{ langService.currentLang() === 'ar' ? 'المستوى 1 (مجموعات رئيسية فقط)' : 'Level 1' }}</option>
                    <option [ngValue]="2">{{ langService.currentLang() === 'ar' ? 'حتى المستوى 2 (مجموعات ثانوية)' : 'Up to Level 2' }}</option>
                    <option [ngValue]="3">{{ langService.currentLang() === 'ar' ? 'حتى المستوى 3' : 'Up to Level 3' }}</option>
                  </select>
                </div>

                <div class="checkbox-box">
                  <label class="toggle-control">
                    <input type="checkbox" [(ngModel)]="settings()!.defaultHideZeroBalances" />
                    <span>{{ langService.currentLang() === 'ar' ? 'إخفاء الحسابات الصفرية تلقائياً عند فتح القوائم' : 'Hide zero-balance accounts by default' }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Card 3: Printing & Auditing -->
            <div class="setting-box">
              <div class="box-head">
                <i class="pi pi-print text-amber"></i>
                <h4>{{ langService.currentLang() === 'ar' ? 'الاعتمادات والمقارنات والطباعة' : 'Auditing & Printing' }}</h4>
              </div>
              <div class="box-body">
                <div class="checkbox-box">
                  <label class="toggle-control">
                    <input type="checkbox" [(ngModel)]="settings()!.showSignaturesBlock" />
                    <span>{{ langService.currentLang() === 'ar' ? 'إظهار مربعات التواقيع الثلاثية (المحاسب، رئيس الحسابات، المدير المالي)' : 'Show tripartite signatures block' }}</span>
                  </label>
                </div>

                <div class="checkbox-box">
                  <label class="toggle-control">
                    <input type="checkbox" [(ngModel)]="settings()!.showComparativePeriod" />
                    <span>{{ langService.currentLang() === 'ar' ? 'تفعيل عامود المقارنة مع الفترة السابقة (Year-over-Year)' : 'Enable comparative prior period' }}</span>
                  </label>
                </div>

                <div class="checkbox-box">
                  <label class="toggle-control">
                    <input type="checkbox" [(ngModel)]="settings()!.allowDraftSimulation" />
                    <span>{{ langService.currentLang() === 'ar' ? 'السماح بتضمين مسودات القيود في التحليل التقديري (What-if Simulation)' : 'Allow draft simulation entries' }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Card 4: Cash Flow Policies (IAS 7) -->
            <div class="setting-box">
              <div class="box-head">
                <i class="pi pi-money-bill text-emerald"></i>
                <h4>{{ langService.currentLang() === 'ar' ? 'سياسات قائمة التدفقات النقدية (IAS 7)' : 'Cash Flow Policies (IAS 7)' }}</h4>
              </div>
              <div class="box-body">
                <div class="form-group">
                  <label>{{ langService.currentLang() === 'ar' ? 'طريقة احتساب التدفقات النقدية:' : 'Cash Flow Calculation Method:' }}</label>
                  <select class="form-control" [(ngModel)]="settings()!.cashFlowMethod">
                    <option value="indirect">{{ langService.currentLang() === 'ar' ? 'الطريقة غير المباشرة (Indirect Method) - المعيار الدولي IAS 7' : 'Indirect Method (IAS 7 - Standard)' }}</option>
                    <option value="direct">{{ langService.currentLang() === 'ar' ? 'الطريقة المباشرة (Direct Method) - المقبوضات والمدفوعات' : 'Direct Method' }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>{{ langService.currentLang() === 'ar' ? 'بادئة كود حسابات النقدية وما في حكمها:' : 'Cash Accounts Prefix in COA:' }}</label>
                  <input type="text" class="form-control font-mono" [(ngModel)]="settings()!.cashAccountPrefix" placeholder="111" />
                  <small class="hint-text">{{ langService.currentLang() === 'ar' ? 'بادئة الحسابات المعتمدة للصناديق والبنوك للمطابقة والتسوية (الافتراضي 111)' : 'Account prefix for Cash & Bank reconciliation (default: 111)' }}</small>
                </div>
              </div>
            </div>

          </div>

          <!-- Success Alert -->
          <div class="save-success-alert" *ngIf="settingsSavedAlert()">
            <i class="pi pi-check-circle"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'تم حفظ وتحديث سياسات ومحددات القوائم المالية للشركة بنجاح!' : 'Policies saved successfully!' }}</span>
          </div>

        </section>
      </ng-container>

      <!-- =========================================================================
           PRINT PREVIEW MODAL (A4)
           ========================================================================= -->
      <div class="print-modal-backdrop" *ngIf="showPrintModal()" (click)="closePrintModal()">
        <div class="print-preview-dialog" (click)="$event.stopPropagation()">
          <div class="print-toolbar">
            <div class="toolbar-info">
              <i class="pi pi-file-pdf text-emerald"></i>
              <strong>{{ langService.currentLang() === 'ar' ? 'معاينة القائمة المالية الرسمية للطباعة (A4)' : 'Official Financial Statement Print Preview' }}</strong>
            </div>
            <div class="toolbar-actions">
              <button class="primary-btn" (click)="triggerBrowserPrint()">
                <i class="pi pi-print"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'طباعة المستند الآن' : 'Print Document' }}</span>
              </button>
              <button class="secondary-btn" (click)="closePrintModal()">
                <i class="pi pi-times"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'إغلاق' : 'Close' }}</span>
              </button>
            </div>
          </div>

          <div class="print-paper" id="financial-statement-a4">
            
            <!-- Letterhead -->
            <div class="paper-header">
              <div class="corp-brand">
                <h2 class="corp-name-ar">شركة المحيط الذكي لتقنية المعلومات</h2>
                <h4 class="corp-name-en">Smart Ocean Information Technology Co.</h4>
                <div class="corp-meta">س.ت: 1010789456 | الرقم الضريبي: 310245678900003</div>
              </div>
              <div class="doc-badge-box">
                <span class="report-main-title">
                  {{ printModalType === 'income-statement' ? 'قائمة الدخل (الأرباح والخسائر)' : (printModalType === 'cash-flow' ? 'قائمة التدفقات النقدية (IAS 7)' : 'قائمة المركز المالي (الميزانية العمومية)') }}
                </span>
                <span class="report-subtitle">
                  {{ printModalType === 'income-statement' || printModalType === 'cash-flow' 
                    ? ('عن الفترة من ' + (fromDate | date:'yyyy-MM-dd') + ' إلى ' + (toDate | date:'yyyy-MM-dd')) 
                    : ('كما في ' + (asOfDate | date:'yyyy-MM-dd')) }}
                </span>
                <span class="socpa-tag">معتمدة وفق معايير المحاسبة السعودية والدولية SOCPA / IFRS</span>
              </div>
            </div>

            <!-- Summary Table for Print -->
            <div class="print-body-content">
              <table class="print-data-table" *ngIf="printModalType === 'income-statement' && incomeStatement()">
                <thead>
                  <tr>
                    <th>رمز الحساب</th>
                    <th>البيان المحاسبي</th>
                    <th style="text-align: end;">المبلغ (ريال سعودي)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>1. إيرادات النشاط التشغيلي الرئيسي</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>{{ incomeStatement()!.operatingRevenues.totalAmount | number:'1.2-2' }}</strong></td>
                  </tr>
                  <tr *ngFor="let it of incomeStatement()!.operatingRevenues.items">
                    <td class="font-mono">{{ it.accountCode }}</td>
                    <td [style.padding-inline-start.px]="(it.level - 1) * 15">{{ it.nameAr }}</td>
                    <td style="text-align: end;" class="font-mono">{{ it.amount | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>2. تكلفة المبيعات والإيرادات (COGS)</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>({{ incomeStatement()!.costOfSales.totalAmount | number:'1.2-2' }})</strong></td>
                  </tr>
                  <tr class="highlight-p-row">
                    <td colspan="2"><strong>مجمل الربح / الخسارة (Gross Profit)</strong></td>
                    <td style="text-align: end;" class="font-mono font-bold">{{ incomeStatement()!.grossProfit | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>3. المصروفات التشغيلية (بيعية وإدارية وعمومية)</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>({{ incomeStatement()!.totalOperatingExpenses | number:'1.2-2' }})</strong></td>
                  </tr>
                  <tr class="highlight-p-row">
                    <td colspan="2"><strong>الربح التشغيلي قبل التمويل والزكاة (EBIT)</strong></td>
                    <td style="text-align: end;" class="font-mono font-bold">{{ incomeStatement()!.operatingProfit | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="th-p-sub" *ngIf="incomeStatement()!.financeAndZakatCosts.items.length > 0">
                    <td colspan="2"><strong>4. تكاليف التمويل ومصروف الزكاة التقديرية</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>({{ incomeStatement()!.financeAndZakatCosts.totalAmount | number:'1.2-2' }})</strong></td>
                  </tr>
                  <tr class="grand-p-row">
                    <td colspan="2"><strong>صافي نتيجة الفترة (أرباح / خسائر)</strong></td>
                    <td style="text-align: end;" class="font-mono font-bold">{{ incomeStatement()!.netProfitOrLoss | number:'1.2-2' }} ريال</td>
                  </tr>
                </tbody>
              </table>

              <table class="print-data-table" *ngIf="printModalType === 'balance-sheet' && balanceSheet()">
                <thead>
                  <tr>
                    <th>رمز الحساب</th>
                    <th>البيان المحاسبي</th>
                    <th style="text-align: end;">المبلغ (ريال سعودي)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>الأصول المتداولة</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>{{ balanceSheet()!.currentAssets.totalAmount | number:'1.2-2' }}</strong></td>
                  </tr>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>الأصول غير المتداولة</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>{{ balanceSheet()!.nonCurrentAssets.totalAmount | number:'1.2-2' }}</strong></td>
                  </tr>
                  <tr class="highlight-p-row">
                    <td colspan="2"><strong>إجمالي الأصول والموجودات (Total Assets)</strong></td>
                    <td style="text-align: end;" class="font-mono font-bold">{{ balanceSheet()!.totalAssets | number:'1.2-2' }} ريال</td>
                  </tr>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>الالتزامات والخصوم المتداولة</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>{{ balanceSheet()!.currentLiabilities.totalAmount | number:'1.2-2' }}</strong></td>
                  </tr>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>الالتزامات غير المتداولة</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>{{ balanceSheet()!.nonCurrentLiabilities.totalAmount | number:'1.2-2' }}</strong></td>
                  </tr>
                  <tr class="highlight-p-row">
                    <td colspan="2"><strong>إجمالي الالتزامات (Total Liabilities)</strong></td>
                    <td style="text-align: end;" class="font-mono font-bold">{{ balanceSheet()!.totalLiabilities | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>حقوق الملكية ورأس المال</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>{{ balanceSheet()!.totalEquity | number:'1.2-2' }}</strong></td>
                  </tr>
                  <tr class="grand-p-row">
                    <td colspan="2"><strong>إجمالي الالتزامات وحقوق الملكية</strong></td>
                    <td style="text-align: end;" class="font-mono font-bold">{{ balanceSheet()!.totalLiabilitiesAndEquity | number:'1.2-2' }} ريال</td>
                  </tr>
                </tbody>
              </table>

              <table class="print-data-table" *ngIf="printModalType === 'cash-flow' && cashFlow()">
                <thead>
                  <tr>
                    <th>الرمز</th>
                    <th>البيان المحاسبي (معيار المحاسبة الدولي IAS 7)</th>
                    <th style="text-align: end;">المبلغ (ريال سعودي)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>أولاً: التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>{{ cashFlow()!.netCashFromOperatingActivities | number:'1.2-2' }}</strong></td>
                  </tr>
                  <tr>
                    <td class="font-mono">-</td>
                    <td>صافي أرباح / (خسائر) الفترة من قائمة الدخل</td>
                    <td style="text-align: end;" class="font-mono">{{ cashFlow()!.startingNetProfitOrLoss | number:'1.2-2' }}</td>
                  </tr>
                  <tr *ngFor="let it of cashFlow()!.nonCashAdjustments.items">
                    <td class="font-mono">{{ it.accountCode }}</td>
                    <td [style.padding-inline-start.px]="15">{{ it.nameAr }}</td>
                    <td style="text-align: end;" class="font-mono">{{ it.amount | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="highlight-p-row">
                    <td colspan="2"><strong>الربح التشغيلي قبل التغيرات في رأس المال العامل</strong></td>
                    <td style="text-align: end;" class="font-mono font-bold">{{ cashFlow()!.operatingProfitBeforeWorkingCapitalChanges | number:'1.2-2' }}</td>
                  </tr>
                  <tr *ngFor="let it of cashFlow()!.workingCapitalChanges.items">
                    <td class="font-mono">{{ it.accountCode }}</td>
                    <td [style.padding-inline-start.px]="15">{{ it.nameAr }}</td>
                    <td style="text-align: end;" class="font-mono">{{ it.amount | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>ثانياً: التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>{{ cashFlow()!.netCashFromInvestingActivities | number:'1.2-2' }}</strong></td>
                  </tr>
                  <tr *ngFor="let it of cashFlow()!.investingActivities.items">
                    <td class="font-mono">{{ it.accountCode }}</td>
                    <td [style.padding-inline-start.px]="15">{{ it.nameAr }}</td>
                    <td style="text-align: end;" class="font-mono">{{ it.amount | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="th-p-sub">
                    <td colspan="2"><strong>ثالثاً: التدفقات النقدية من الأنشطة التمويلية (Financing Activities)</strong></td>
                    <td style="text-align: end;" class="font-mono"><strong>{{ cashFlow()!.netCashFromFinancingActivities | number:'1.2-2' }}</strong></td>
                  </tr>
                  <tr *ngFor="let it of cashFlow()!.financingActivities.items">
                    <td class="font-mono">{{ it.accountCode }}</td>
                    <td [style.padding-inline-start.px]="15">{{ it.nameAr }}</td>
                    <td style="text-align: end;" class="font-mono">{{ it.amount | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="grand-p-row">
                    <td colspan="2"><strong>صافي التغير في النقدية وما في حكمها خلال الفترة</strong></td>
                    <td style="text-align: end;" class="font-mono font-bold">{{ cashFlow()!.netChangeInCashAndEquivalents | number:'1.2-2' }} ريال</td>
                  </tr>
                  <tr>
                    <td colspan="2">رصيد النقدية وما في حكمها في بداية الفترة</td>
                    <td style="text-align: end;" class="font-mono">{{ cashFlow()!.cashAtBeginningOfPeriod | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="highlight-p-row">
                    <td colspan="2"><strong>رصيد النقدية وما في حكمها في نهاية الفترة (المطابق للخزينة والبنوك)</strong></td>
                    <td style="text-align: end;" class="font-mono font-bold">{{ cashFlow()!.cashAtEndOfPeriod | number:'1.2-2' }} ريال</td>
                  </tr>
                </tbody>
              </table>

              <!-- Tafqeet -->
              <div class="print-tafqeet">
                <span>المبلغ كتابة: </span>
                <strong>{{ printModalType === 'income-statement' ? incomeStatement()?.netProfitTafqeetAr : (printModalType === 'cash-flow' ? cashFlow()?.netCashTafqeetAr : balanceSheet()?.totalAssetsTafqeetAr) }}</strong>
              </div>

              <!-- Signatures -->
              <div class="print-signatures">
                <div class="sig-col">
                  <span class="sig-title">المحاسب المالي المسؤول</span>
                  <div class="sig-line">التوقيع: ............................</div>
                </div>
                <div class="sig-col">
                  <span class="sig-title">رئيس قسم الحسابات والمراجعة</span>
                  <div class="sig-line">التوقيع: ............................</div>
                </div>
                <div class="sig-col">
                  <span class="sig-title">المدير المالي التنفيذي (CFO)</span>
                  <div class="sig-line">التوقيع والختم: ............................</div>
                </div>
              </div>

              <div class="print-legal-footer">
                نظام الربان المحاسبي المتكامل | تم استخراج هذه القائمة المالية آلياً من واقع القيود المحاسبية المرحلة ودفتر الأستاذ العام المعتمد.
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .fs-page {
      padding: 0.75rem 1rem;
      min-height: 100vh;
      background: #f8fafc;
      font-family: inherit;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    /* Header Bar */
    .fs-header {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.55rem 0.85rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .fs-header-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
    .fs-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      color: #64748b;
      margin-bottom: 0.15rem;
    }
    .bc-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #0f766e;
      text-decoration: none;
      font-weight: 500;
    }
    .bc-sep { color: #cbd5e1; }
    .bc-highlight { color: #0f172a; font-weight: 600; }

    .fs-title-row {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
    }
    .fs-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .socpa-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #ecfdf5;
      color: #059669;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.12rem 0.45rem;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
    }

    /* Navigation Tabs */
    .fs-tabs-pill {
      display: flex;
      background: #f1f5f9;
      padding: 0.2rem;
      border-radius: 8px;
      gap: 0.25rem;
      border: 1px solid #e2e8f0;
    }
    .fs-tab-btn {
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
    .fs-tab-btn:hover:not(.active) {
      color: #0f172a;
      background: rgba(255, 255, 255, 0.6);
    }
    .fs-tab-btn.active {
      background: white;
      color: #059669;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    /* Compact Metrics Strip */
    .fs-metrics-bar {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr auto 1.25fr;
      align-items: center;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.45rem 0.75rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      gap: 0.65rem;
    }
    .fs-metrics-bar.cash-flow-metrics {
      grid-template-columns: repeat(6, 1fr);
      gap: 0.55rem;
      padding: 0.45rem 0.65rem;
    }
    @media (max-width: 1400px) {
      .fs-metrics-bar.cash-flow-metrics {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (max-width: 768px) {
      .fs-metrics-bar.cash-flow-metrics {
        grid-template-columns: 1fr;
      }
    }
    .metric-card-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.35rem 0.55rem;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      transition: all 0.15s ease;
    }
    .metric-card-box:hover {
      background: white;
      border-color: #cbd5e1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .metric-card-box.metric-box-success {
      background: #f0fdf4;
      border-color: #a7f3d0;
    }
    .metric-card-box.metric-box-danger {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    .metric-segment {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .metric-segment-highlight {
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      border: 1.5px solid;
    }
    .metric-segment-highlight.is-profit {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .metric-segment-highlight.is-loss {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    .seg-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.35rem;
    }
    .seg-lbl {
      font-size: 0.7rem;
      font-weight: 700;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .seg-badge {
      font-size: 0.66rem;
      font-weight: 700;
      padding: 0.08rem 0.35rem;
      border-radius: 4px;
    }
    .bg-emerald-subtle { background: #ecfdf5; color: #047857; }
    .bg-cyan-subtle { background: #e0f2fe; color: #0284c7; }
    .bg-amber-subtle { background: #fef3c7; color: #d97706; }
    .bg-rose-subtle { background: #ffe4e6; color: #e11d48; }

    .seg-badge-solid {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.1rem 0.45rem;
      border-radius: 4px;
      color: white;
    }
    .bg-emerald { background: #059669; }
    .bg-rose { background: #e11d48; }

    .seg-val {
      font-size: 1.05rem;
      font-weight: 800;
    }
    .seg-val small {
      font-size: 0.66rem;
      color: #64748b;
      font-weight: 600;
    }
    .seg-divider {
      width: 1px;
      height: 28px;
      background: #e2e8f0;
    }

    /* Filters Card */
    .fs-filters-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.55rem 0.85rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .filters-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.55rem;
      align-items: flex-end;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .form-group label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
    }
    .form-control {
      height: 32px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.25rem 0.55rem;
      font-size: 0.8rem;
      color: #0f172a;
      outline: none;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }
    .form-control:focus {
      background: white;
      border-color: #059669;
      box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.12);
    }
    .toggle-group {
      justify-content: flex-end;
      height: 32px;
    }
    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
      font-size: 0.76rem;
      font-weight: 600;
      color: #334155;
      user-select: none;
    }

    .filters-subbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 0.45rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .presets-group {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .preset-label {
      font-size: 0.72rem;
      color: #64748b;
      font-weight: 700;
    }
    .preset-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 0.2rem 0.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .preset-btn:hover {
      background: #ecfdf5;
      border-color: #86efac;
      color: #059669;
    }
    .actions-group {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .secondary-btn, .primary-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      height: 32px;
      padding: 0.25rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .secondary-btn {
      background: white;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .secondary-btn:hover {
      background: #f8fafc;
      color: #0f172a;
    }
    .primary-btn {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      border: none;
      box-shadow: 0 2px 6px rgba(4, 120, 87, 0.2);
    }
    .primary-btn:hover {
      background: linear-gradient(135deg, #047857 0%, #064e3b 100%);
    }

    /* Table Container Card */
    .fs-table-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .table-top-header {
      padding: 0.45rem 0.85rem;
      background: #fafafa;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .table-title-box {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .table-title-text {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 800;
      color: #0f172a;
    }
    .count-badge {
      background: #f1f5f9;
      color: #475569;
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .badge-balanced {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .table-responsive {
      overflow-x: auto;
    }
    .fs-statement-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.81rem;
      text-align: start;
    }
    .fs-statement-table th {
      background: #f8fafc;
      color: #475569;
      padding: 0.4rem 0.55rem;
      font-weight: 750;
      font-size: 0.76rem;
      border-bottom: 1.5px solid #cbd5e1;
      white-space: nowrap;
    }
    .fs-statement-table td {
      padding: 0.32rem 0.55rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }
    .fs-statement-table tr:hover:not(.section-header-row):not(.subtotal-row):not(.grand-total-row) {
      background: #f8fafc;
    }

    .th-code { width: 90px; }
    .th-level { width: 65px; text-align: center; }
    .th-pct { width: 90px; text-align: end; }
    .th-amount { width: 140px; text-align: end; }
    .th-action { width: 60px; text-align: center; }

    .td-code { color: #64748b; font-size: 0.78rem; }
    .td-name {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .tree-bullet {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .level-pill {
      font-size: 0.66rem;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.08rem 0.35rem;
      border-radius: 4px;
    }
    .td-amount { text-align: end; white-space: nowrap; }
    .td-pct { text-align: end; }
    .td-action { text-align: center; }
    .btn-statement-link {
      color: #059669;
      text-decoration: none;
      font-size: 0.8rem;
    }
    .btn-statement-link:hover { color: #047857; }

    /* Section Headers */
    .section-header-row td {
      font-size: 0.82rem;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .bg-emerald-tint { background: #f0fdf4 !important; }
    .bg-cyan-tint { background: #f0f9ff !important; }
    .bg-amber-tint { background: #fffbeb !important; }
    .bg-slate-tint { background: #f8fafc !important; }

    /* Subtotal Rows */
    .subtotal-row td {
      background: #f1f5f9;
      border-top: 1.5px solid #cbd5e1;
      border-bottom: 1.5px solid #cbd5e1;
      padding: 0.45rem 0.55rem;
    }
    .subtotal-title {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.84rem;
    }
    .sub-section-head td {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      padding: 0.32rem 0.55rem;
      font-size: 0.78rem;
    }
    .header-status-group {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .bg-rose-tint { background: #fef2f2 !important; }
    .gross-profit-row td { background: #ecfdf5 !important; }
    .operating-profit-row td { background: #fef3c7 !important; }
    .total-assets-row td { background: #ecfdf5 !important; border-top: 2px solid #059669; }
    .total-liabilities-row td { background: #e0f2fe !important; }
    .total-equity-row td { background: #fef3c7 !important; }

    /* Grand Total Row */
    .grand-total-row td {
      padding: 0.55rem 0.55rem;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
    }
    .grand-total-row.is-profit td { background: #ecfdf5 !important; }
    .grand-total-row.is-loss td { background: #fef2f2 !important; }
    .grand-total-title {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.92rem;
      font-weight: 800;
    }
    .grand-total-amount {
      font-size: 1.05rem;
    }

    /* Tafqeet & Ratios Footer */
    .tafqeet-strip {
      padding: 0.45rem 0.85rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.78rem;
    }
    .tafqeet-label { color: #64748b; font-weight: 700; }
    .tafqeet-text { color: #047857; }

    .ratios-footer-strip {
      padding: 0.45rem 0.85rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }
    .ratio-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.2rem 0.55rem;
      font-size: 0.76rem;
    }
    .ratio-pill .lbl { color: #64748b; font-weight: 600; }
    .ratio-pill .val { color: #0f172a; font-weight: 800; }

    /* ================= TAB 3: SETTINGS ================= */
    .fs-settings-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.85rem 1.15rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.65rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .settings-title-group {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
    .settings-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
    }
    .settings-sub {
      margin: 0;
      font-size: 0.74rem;
      color: #64748b;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 0.85rem;
    }
    .setting-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .box-head {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.45rem;
    }
    .box-head h4 {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 800;
      color: #0f172a;
    }
    .box-body {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .hint-text {
      font-size: 0.68rem;
      color: #64748b;
    }
    .checkbox-box {
      margin-top: 0.25rem;
    }
    .toggle-control {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.76rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }

    .save-success-alert {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      background: #ecfdf5;
      border: 1px solid #86efac;
      color: #15803d;
      padding: 0.45rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
    }

    /* Print Preview Modal */
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
      padding: 1rem;
    }
    .print-preview-dialog {
      width: 100%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      margin: 0 auto;
    }
    .print-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: white;
      padding: 0.55rem 0.85rem;
      border-radius: 8px;
    }
    .toolbar-info {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.84rem;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .print-paper {
      background: white;
      color: #0f172a;
      padding: 1.5rem 1.75rem;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }
    .paper-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #047857;
      padding-bottom: 0.85rem;
      margin-bottom: 1rem;
    }
    .corp-name-ar { margin: 0; font-size: 1.25rem; font-weight: 900; color: #047857; }
    .corp-name-en { margin: 0; font-size: 0.76rem; color: #64748b; font-family: monospace; }
    .corp-meta { font-size: 0.72rem; color: #475569; margin-top: 0.25rem; }
    .doc-badge-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.15rem;
    }
    .report-main-title { font-size: 1.15rem; font-weight: 900; color: #0f172a; }
    .report-subtitle { font-size: 0.76rem; color: #64748b; }
    .socpa-tag { font-size: 0.66rem; color: #059669; font-weight: 700; background: #ecfdf5; padding: 0.1rem 0.4rem; border-radius: 4px; }

    .print-data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      margin-bottom: 1rem;
    }
    .print-data-table th {
      background: #f1f5f9;
      padding: 0.4rem 0.55rem;
      border-bottom: 2px solid #cbd5e1;
      font-weight: 800;
      text-align: start;
    }
    .print-data-table td {
      padding: 0.35rem 0.55rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .th-p-sub td { background: #f8fafc; font-weight: 750; border-top: 1px solid #cbd5e1; }
    .highlight-p-row td { background: #ecfdf5; font-weight: 800; }
    .grand-p-row td { background: #0f172a; color: white; font-weight: 900; font-size: 0.95rem; }

    .print-tafqeet {
      padding: 0.45rem 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.78rem;
      margin-bottom: 1.5rem;
    }
    .print-signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-top: 2rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    .sig-col {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .sig-title { font-size: 0.8rem; font-weight: 700; color: #334155; }
    .sig-line { font-size: 0.72rem; color: #94a3b8; }
    .print-legal-footer {
      font-size: 0.66rem;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 0.5rem;
    }

    /* Print media */
    @media print {
      body * { visibility: hidden; }
      #financial-statement-a4, #financial-statement-a4 * { visibility: visible; }
      #financial-statement-a4 {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        box-shadow: none;
        padding: 0;
      }
      .print-modal-backdrop { background: white; padding: 0; }
      .print-toolbar { display: none; }
    }

    .text-emerald { color: #047857 !important; }
    .text-cyan { color: #0284c7 !important; }
    .text-amber { color: #d97706 !important; }
    .text-rose { color: #e11d48 !important; }
    .text-slate { color: #475569 !important; }
    .text-muted { color: #94a3b8 !important; }
    .font-mono { font-family: var(--font-latin), monospace !important; }
    .font-bold { font-weight: 800 !important; }
  `]
})
export class FinancialStatementsComponent implements OnInit {
  private fsService = inject(FinancialStatementsService);
  private finSettingsService = inject(FinancialSettingsService);
  private companyContext = inject(CompanyContextService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public langService = inject(LanguageService);

  activeTab: ActiveTab = 'income-statement';
  loading = signal(false);
  savingSettings = signal(false);
  settingsSavedAlert = signal(false);
  showPrintModal = signal(false);
  printModalType: 'income-statement' | 'balance-sheet' | 'cash-flow' = 'income-statement';

  incomeStatement = signal<IncomeStatementReport | null>(null);
  balanceSheet = signal<BalanceSheetReport | null>(null);
  cashFlow = signal<CashFlowStatementReport | null>(null);
  equityStatement = signal<EquityStatementReport | null>(null);
  vatReturn = signal<ZatcaVatReturn | null>(null);
  settings = signal<FinancialStatementSettings | null>(null);

  // Filters
  fromDate = '';
  toDate = '';
  asOfDate = '';
  vatAdjustments = 0;
  selectedCostCenterId = '';
  selectedMaxLevel: number | null = null;
  presentationFormat = 'multi-step';
  cashFlowMethod = 'indirect';
  hideZeroBalances = true;
  costCenters: CostCenter[] = [];

  ngOnInit() {
    this.initDates();
    this.loadCostCenters();
    this.loadSettings();

    // Check query params for tab
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'balance-sheet') {
        this.activeTab = 'balance-sheet';
        this.loadBalanceSheet();
      } else if (params['tab'] === 'cash-flow') {
        this.activeTab = 'cash-flow';
        this.loadCashFlowStatement();
      } else if (params['tab'] === 'equity') {
        this.activeTab = 'equity';
        this.loadEquityStatement();
      } else if (params['tab'] === 'vat-return') {
        this.activeTab = 'vat-return';
        this.loadZatcaVatReturn();
      } else if (params['tab'] === 'settings') {
        this.activeTab = 'settings';
      } else {
        this.activeTab = 'income-statement';
        this.loadIncomeStatement();
      }
    });
  }

  initDates() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    this.fromDate = `${year}-01-01`;
    this.toDate = `${year}-${month}-${day}`;
    this.asOfDate = `${year}-${month}-${day}`;
  }

  loadCostCenters() {
    const companyId = this.companyContext.activeCompany().id;
    this.finSettingsService.getOverview(companyId).subscribe({
      next: (res) => { this.costCenters = res?.costCenters || []; },
      error: () => {}
    });
  }

  loadSettings() {
    const companyId = this.companyContext.activeCompany().id;
    this.fsService.getSettings(companyId).subscribe({
      next: (res) => {
        this.settings.set(res);
        if (res) {
          this.presentationFormat = res.incomeStatementFormat || 'multi-step';
          this.hideZeroBalances = res.defaultHideZeroBalances;
          this.selectedMaxLevel = res.defaultLevelDepth;
          this.cashFlowMethod = res.cashFlowMethod || 'indirect';
        }
      },
      error: () => {}
    });
  }

  saveSettings() {
    if (!this.settings()) return;
    this.savingSettings.set(true);
    this.settingsSavedAlert.set(false);

    const payload = {
      ...this.settings()!,
      companyId: this.companyContext.activeCompany().id
    };

    this.fsService.updateSettings(payload).subscribe({
      next: (res) => {
        this.settings.set(res);
        this.savingSettings.set(false);
        this.settingsSavedAlert.set(true);
        setTimeout(() => this.settingsSavedAlert.set(false), 4000);
      },
      error: () => {
        this.savingSettings.set(false);
      }
    });
  }

  switchTab(tab: ActiveTab) {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });

    if (tab === 'income-statement') {
      this.loadIncomeStatement();
    } else if (tab === 'balance-sheet') {
      this.loadBalanceSheet();
    } else if (tab === 'cash-flow') {
      this.loadCashFlowStatement();
    } else if (tab === 'equity') {
      this.loadEquityStatement();
    } else if (tab === 'vat-return') {
      this.loadZatcaVatReturn();
    } else if (tab === 'settings') {
      this.loadSettings();
    }
  }

  loadEquityStatement() {
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany().id;
    this.fsService.getEquityStatement({
      companyId,
      fromDate: this.fromDate,
      toDate: this.toDate
    }).subscribe({
      next: (res) => {
        this.equityStatement.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadZatcaVatReturn() {
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany().id;
    this.fsService.getZatcaVatReturn({
      companyId,
      fromDate: this.fromDate,
      toDate: this.toDate,
      adjustments: this.vatAdjustments
    }).subscribe({
      next: (res) => {
        this.vatReturn.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  windowPrint() {
    window.print();
  }

  loadIncomeStatement() {
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany().id;
    this.fsService.getIncomeStatement({
      companyId,
      fromDate: this.fromDate,
      toDate: this.toDate,
      costCenterId: this.selectedCostCenterId || undefined,
      maxLevel: this.selectedMaxLevel,
      hideZeroBalances: this.hideZeroBalances,
      presentationFormat: this.presentationFormat
    }).subscribe({
      next: (res) => {
        this.incomeStatement.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadBalanceSheet() {
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany().id;
    this.fsService.getBalanceSheet({
      companyId,
      asOfDate: this.asOfDate,
      costCenterId: this.selectedCostCenterId || undefined,
      maxLevel: this.selectedMaxLevel,
      hideZeroBalances: this.hideZeroBalances
    }).subscribe({
      next: (res) => {
        this.balanceSheet.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadCashFlowStatement() {
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany().id;
    this.fsService.getCashFlowStatement({
      companyId,
      fromDate: this.fromDate,
      toDate: this.toDate,
      costCenterId: this.selectedCostCenterId || undefined,
      hideZeroBalances: this.hideZeroBalances,
      method: this.cashFlowMethod
    }).subscribe({
      next: (res) => {
        this.cashFlow.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  setPreset(preset: 'thisYear' | 'thisQuarter' | 'thisMonth') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'thisYear') {
      this.fromDate = `${year}-01-01`;
      this.toDate = `${year}-${pad(month + 1)}-${pad(now.getDate())}`;
    } else if (preset === 'thisQuarter') {
      const qMonth = Math.floor(month / 3) * 3;
      this.fromDate = `${year}-${pad(qMonth + 1)}-01`;
      this.toDate = `${year}-${pad(month + 1)}-${pad(now.getDate())}`;
    } else if (preset === 'thisMonth') {
      this.fromDate = `${year}-${pad(month + 1)}-01`;
      this.toDate = `${year}-${pad(month + 1)}-${pad(now.getDate())}`;
    }

    if (this.activeTab === 'cash-flow') {
      this.loadCashFlowStatement();
    } else {
      this.loadIncomeStatement();
    }
  }

  setAsOfPreset(preset: 'today' | 'endOfYear' | 'prevYearEnd') {
    const now = new Date();
    const year = now.getFullYear();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'today') {
      this.asOfDate = `${year}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    } else if (preset === 'endOfYear') {
      this.asOfDate = `${year}-12-31`;
    } else if (preset === 'prevYearEnd') {
      this.asOfDate = `${year - 1}-12-31`;
    }

    this.loadBalanceSheet();
  }

  openPrintModal(type: 'income-statement' | 'balance-sheet' | 'cash-flow') {
    this.printModalType = type;
    this.showPrintModal.set(true);
  }

  closePrintModal() {
    this.showPrintModal.set(false);
  }

  triggerBrowserPrint() {
    window.print();
  }

  // =========================================================================
  // BRANDED ARABIC EXCEL EXPORT (SpreadsheetML)
  // =========================================================================
  exportIncomeStatementExcel() {
    const is = this.incomeStatement();
    if (!is) return;

    let rowsHtml = '';
    const renderSection = (sec: any, isExpense = false) => {
      rowsHtml += `
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="4" style="font-size: 11pt; color: #047857; text-align: right;">${sec.titleAr}</td>
          <td style="text-align: left; font-weight: bold; mso-number-format:'\\#\\,\\#\\#0\\.00';">${isExpense ? `(${sec.totalAmount.toFixed(2)})` : sec.totalAmount.toFixed(2)}</td>
        </tr>
      `;
      for (const item of sec.items) {
        rowsHtml += `
          <tr>
            <td style="text-align: center; mso-number-format:'\\@';">${item.accountCode}</td>
            <td style="text-align: right; padding-right: ${(item.level - 1) * 15}px;">${item.nameAr}</td>
            <td style="text-align: center;">L${item.level}</td>
            <td style="text-align: left;">${item.percentage}%</td>
            <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${isExpense ? `(${item.amount.toFixed(2)})` : item.amount.toFixed(2)}</td>
          </tr>
        `;
      }
    };

    renderSection(is.operatingRevenues);
    renderSection(is.costOfSales, true);

    rowsHtml += `
      <tr style="background-color: #ecfdf5; font-weight: bold; border-top: 2px solid #059669;">
        <td colspan="3" style="text-align: right; font-size: 11pt;">مجمل الربح / الخسارة (Gross Profit)</td>
        <td style="text-align: left;">${is.grossMarginPercentage}%</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${is.grossProfit.toFixed(2)}</td>
      </tr>
    `;

    renderSection(is.sellingExpenses, true);
    renderSection(is.generalAdminExpenses, true);

    rowsHtml += `
      <tr style="background-color: #fef3c7; font-weight: bold;">
        <td colspan="3" style="text-align: right; font-size: 11pt;">الربح التشغيلي قبل التمويل والزكاة (EBIT)</td>
        <td style="text-align: left;">${is.operatingMarginPercentage}%</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${is.operatingProfit.toFixed(2)}</td>
      </tr>
    `;

    if (is.otherIncome.items.length > 0) renderSection(is.otherIncome);
    if (is.financeAndZakatCosts.items.length > 0) renderSection(is.financeAndZakatCosts, true);

    rowsHtml += `
      <tr style="background-color: #047857; color: #ffffff; font-weight: bold; font-size: 12pt;">
        <td colspan="3" style="text-align: right;">صافي أرباح / (خسائر) الفترة المالية</td>
        <td style="text-align: left;">${is.netMarginPercentage}%</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${is.netProfitOrLoss.toFixed(2)} SAR</td>
      </tr>
    `;

    this.downloadExcelSpreadsheet(
      `IncomeStatement_${this.fromDate}_${this.toDate}`,
      'قائمة الدخل',
      `عن الفترة من ${this.fromDate} إلى ${this.toDate}`,
      rowsHtml,
      is.netProfitTafqeetAr
    );
  }

  exportBalanceSheetExcel() {
    const bs = this.balanceSheet();
    if (!bs) return;

    let rowsHtml = '';
    const renderSection = (sec: any) => {
      rowsHtml += `
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="4" style="font-size: 11pt; color: #047857; text-align: right;">${sec.titleAr}</td>
          <td style="text-align: left; font-weight: bold; mso-number-format:'\\#\\,\\#\\#0\\.00';">${sec.totalAmount.toFixed(2)}</td>
        </tr>
      `;
      for (const item of sec.items) {
        rowsHtml += `
          <tr>
            <td style="text-align: center; mso-number-format:'\\@';">${item.accountCode}</td>
            <td style="text-align: right; padding-right: ${(item.level - 1) * 15}px;">${item.nameAr}</td>
            <td style="text-align: center;">L${item.level}</td>
            <td style="text-align: left;">${item.percentage}%</td>
            <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${item.amount.toFixed(2)}</td>
          </tr>
        `;
      }
    };

    renderSection(bs.currentAssets);
    renderSection(bs.nonCurrentAssets);
    rowsHtml += `
      <tr style="background-color: #ecfdf5; font-weight: bold; font-size: 11pt; border-top: 2px solid #059669;">
        <td colspan="4" style="text-align: right;">إجمالي الأصول والموجودات (Total Assets)</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${bs.totalAssets.toFixed(2)} SAR</td>
      </tr>
    `;

    renderSection(bs.currentLiabilities);
    renderSection(bs.nonCurrentLiabilities);
    rowsHtml += `
      <tr style="background-color: #e0f2fe; font-weight: bold; font-size: 11pt;">
        <td colspan="4" style="text-align: right;">إجمالي الالتزامات والخصوم (Total Liabilities)</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${bs.totalLiabilities.toFixed(2)} SAR</td>
      </tr>
    `;

    renderSection(bs.equityItems);
    rowsHtml += `
      <tr style="background-color: #ecfdf5;">
        <td style="text-align: center;">32103</td>
        <td style="text-align: right;">صافي أرباح / (خسائر) الفترة الحالية (منقول من قائمة الدخل)</td>
        <td style="text-align: center;">L3</td>
        <td style="text-align: left;">-</td>
        <td style="text-align: left; font-weight: bold; mso-number-format:'\\#\\,\\#\\#0\\.00';">${bs.currentPeriodNetIncome.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #fef3c7; font-weight: bold; font-size: 11pt;">
        <td colspan="4" style="text-align: right;">إجمالي حقوق الملكية (Total Equity)</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${bs.totalEquity.toFixed(2)} SAR</td>
      </tr>
      <tr style="background-color: #047857; color: #ffffff; font-weight: bold; font-size: 12pt;">
        <td colspan="4" style="text-align: right;">مجموع الالتزامات وحقوق الملكية (Total Liabilities & Equity)</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${bs.totalLiabilitiesAndEquity.toFixed(2)} SAR</td>
      </tr>
    `;

    this.downloadExcelSpreadsheet(
      `BalanceSheet_${this.asOfDate}`,
      'قائمة المركز المالي (الميزانية العمومية)',
      `كما في ${this.asOfDate}`,
      rowsHtml,
      bs.totalAssetsTafqeetAr
    );
  }

  exportCashFlowExcel() {
    const cf = this.cashFlow();
    if (!cf) return;

    let rowsHtml = '';
    const renderSection = (sec: any) => {
      rowsHtml += `
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="4" style="font-size: 11pt; color: #047857; text-align: right;">${sec.titleAr}</td>
          <td style="text-align: left; font-weight: bold; mso-number-format:'\\#\\,\\#\\#0\\.00';">${sec.totalAmount < 0 ? `(${Math.abs(sec.totalAmount).toFixed(2)})` : sec.totalAmount.toFixed(2)}</td>
        </tr>
      `;
      for (const item of sec.items) {
        rowsHtml += `
          <tr>
            <td style="text-align: center; mso-number-format:'\\@';">${item.accountCode}</td>
            <td style="text-align: right; padding-right: ${(item.level - 1) * 15}px;">${item.nameAr}</td>
            <td style="text-align: center;">L${item.level}</td>
            <td style="text-align: left;">-</td>
            <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${item.amount < 0 ? `(${Math.abs(item.amount).toFixed(2)})` : item.amount.toFixed(2)}</td>
          </tr>
        `;
      }
    };

    rowsHtml += `
      <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 11pt;">
        <td colspan="5" style="text-align: right; color: #0f172a;">أولاً: التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)</td>
      </tr>
      <tr>
        <td style="text-align: center;">-</td>
        <td style="text-align: right; font-weight: 600;">صافي أرباح / (خسائر) الفترة المحاسبية (من قائمة الدخل)</td>
        <td style="text-align: center;">-</td>
        <td style="text-align: left;">-</td>
        <td style="text-align: left; font-weight: bold; mso-number-format:'\\#\\,\\#\\#0\\.00';">${cf.startingNetProfitOrLoss < 0 ? `(${Math.abs(cf.startingNetProfitOrLoss).toFixed(2)})` : cf.startingNetProfitOrLoss.toFixed(2)}</td>
      </tr>
    `;

    renderSection(cf.nonCashAdjustments);

    rowsHtml += `
      <tr style="background-color: #fef3c7; font-weight: bold;">
        <td colspan="4" style="text-align: right;">الربح التشغيلي قبل التغيرات في رأس المال العامل</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${cf.operatingProfitBeforeWorkingCapitalChanges.toFixed(2)}</td>
      </tr>
    `;

    renderSection(cf.workingCapitalChanges);

    rowsHtml += `
      <tr style="background-color: #ecfdf5; font-weight: bold; border-top: 2px solid #059669;">
        <td colspan="4" style="text-align: right; font-size: 11pt;">صافي النقدية المتولدة من الأنشطة التشغيلية</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${cf.netCashFromOperatingActivities.toFixed(2)} SAR</td>
      </tr>
      <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 11pt;">
        <td colspan="5" style="text-align: right; color: #0f172a;">ثانياً: التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)</td>
      </tr>
    `;

    renderSection(cf.investingActivities);

    rowsHtml += `
      <tr style="background-color: #ecfdf5; font-weight: bold;">
        <td colspan="4" style="text-align: right; font-size: 11pt;">صافي النقدية المستخدمة في الأنشطة الاستثمارية</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${cf.netCashFromInvestingActivities < 0 ? `(${Math.abs(cf.netCashFromInvestingActivities).toFixed(2)})` : cf.netCashFromInvestingActivities.toFixed(2)} SAR</td>
      </tr>
      <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 11pt;">
        <td colspan="5" style="text-align: right; color: #0f172a;">ثالثاً: التدفقات النقدية من الأنشطة التمويلية (Financing Activities)</td>
      </tr>
    `;

    renderSection(cf.financingActivities);

    rowsHtml += `
      <tr style="background-color: #ecfdf5; font-weight: bold;">
        <td colspan="4" style="text-align: right; font-size: 11pt;">صافي النقدية من الأنشطة التمويلية</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${cf.netCashFromFinancingActivities.toFixed(2)} SAR</td>
      </tr>
      <tr style="background-color: #047857; color: #ffffff; font-weight: bold; font-size: 12pt;">
        <td colspan="4" style="text-align: right;">صافي التغير في النقدية وما في حكمها خلال الفترة</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${cf.netChangeInCashAndEquivalents.toFixed(2)} SAR</td>
      </tr>
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colspan="4" style="text-align: right;">رصيد النقدية وما في حكمها في بداية الفترة</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${cf.cashAtBeginningOfPeriod.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colspan="4" style="text-align: right;">رصيد النقدية وما في حكمها في نهاية الفترة (المحسوب)</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${cf.cashAtEndOfPeriod.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #f0fdf4; font-weight: bold; color: #059669;">
        <td colspan="4" style="text-align: right;">الرصيد الفعلي في دفتر الأستاذ لحسابات الصندوق والبنوك (111)</td>
        <td style="text-align: left; mso-number-format:'\\#\\,\\#\\#0\\.00';">${cf.actualCashBalanceInGeneralLedger.toFixed(2)} SAR</td>
      </tr>
    `;

    this.downloadExcelSpreadsheet(
      `CashFlowStatement_${this.fromDate}_${this.toDate}`,
      'قائمة التدفقات النقدية (IAS 7)',
      `عن الفترة من ${this.fromDate} إلى ${this.toDate} - الطريقة غير المباشرة`,
      rowsHtml,
      cf.netCashTafqeetAr
    );
  }

  private downloadExcelSpreadsheet(filename: string, title: string, subtitle: string, rowsHtml: string, tafqeet: string) {
    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${title}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayRightToLeft/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; direction: rtl; }
            th, td { border: 0.5pt solid #cbd5e1; padding: 6px 8px; font-size: 10pt; }
            th { background-color: #0f172a; color: #ffffff; text-align: center; }
          </style>
        </head>
        <body dir="rtl">
          <table>
            <tr><td colspan="5" style="font-size: 16pt; font-weight: bold; color: #047857; text-align: center;">شركة المحيط الذكي لتقنية المعلومات</td></tr>
            <tr><td colspan="5" style="font-size: 13pt; font-weight: bold; text-align: center;">${title}</td></tr>
            <tr><td colspan="5" style="font-size: 10pt; color: #475569; text-align: center;">${subtitle}</td></tr>
            <tr><td colspan="5" style="font-size: 9pt; color: #059669; text-align: center;">معتمدة وفق معايير المحاسبة السعودية والدولية SOCPA / IFRS | العملة: ريال سعودي (SAR)</td></tr>
            <tr><td colspan="5" style="height: 12px;"></td></tr>
            <tr>
              <th style="width: 100px;">رمز الحساب</th>
              <th style="width: 320px;">البيان المحاسبي</th>
              <th style="width: 80px;">المستوى</th>
              <th style="width: 90px;">النسبة %</th>
              <th style="width: 150px;">المبلغ (SAR)</th>
            </tr>
            ${rowsHtml}
            <tr><td colspan="5" style="height: 10px;"></td></tr>
            <tr><td colspan="5" style="background-color: #f8fafc; font-weight: bold;">المبلغ كتابة: ${tafqeet}</td></tr>
            <tr><td colspan="5" style="height: 20px;"></td></tr>
            <tr>
              <td colspan="2" style="text-align: center; font-weight: bold;">المحاسب المالي المسؤول<br><br>التوقيع: ............................</td>
              <td></td>
              <td colspan="2" style="text-align: center; font-weight: bold;">المدير المالي التنفيذي (CFO)<br><br>التوقيع والختم: ............................</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', template], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
