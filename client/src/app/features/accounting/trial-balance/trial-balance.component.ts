import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TrialBalanceService, TrialBalanceReport, TrialBalanceAccount } from '../../../core/services/trial-balance.service';
import { FinancialSettingsService, CostCenter } from '../../../core/services/financial-settings.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { TafqeetService } from '../../../core/services/tafqeet.service';

interface FlatRowItem {
  account: TrialBalanceAccount;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isVisible: boolean;
}

@Component({
  selector: 'app-trial-balance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="tb-page" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Compact Header Bar -->
      <header class="tb-header">
        <div class="tb-header-inner">
          <div class="tb-header-left">
            <div class="tb-breadcrumb">
              <a routerLink="/dashboard" class="bc-link"><i class="pi pi-home"></i> {{ langService.currentLang() === 'ar' ? 'الرئيسية' : 'Home' }}</a>
              <span class="bc-sep">/</span>
              <span>{{ langService.currentLang() === 'ar' ? 'المحاسبة والمالية' : 'Accounting' }}</span>
              <span class="bc-sep">/</span>
              <span class="bc-highlight">{{ langService.currentLang() === 'ar' ? 'ميزان المراجعة' : 'Trial Balance' }}</span>
            </div>
            <div class="tb-title-row">
              <h1 class="tb-title">{{ langService.currentLang() === 'ar' ? 'ميزان المراجعة بالمجاميع والأرصدة' : 'Trial Balance (Totals & Balances)' }}</h1>
              <span class="socpa-badge"><i class="pi pi-verified"></i> SOCPA & IFRS Compliant</span>
            </div>
          </div>

          <!-- Compact Balance Health Pill -->
          <div class="tb-header-right" *ngIf="report()">
            <div class="balance-health-pill" [class.is-balanced]="report()!.isBalanced" [class.is-unbalanced]="!report()!.isBalanced">
              <i [class]="report()!.isBalanced ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'"></i>
              <div class="pill-info">
                <span class="health-text">
                  {{ report()!.isBalanced 
                    ? (langService.currentLang() === 'ar' ? 'الميزان متوازن تماماً (0.00)' : 'Perfect Balance (0.00)') 
                    : (langService.currentLang() === 'ar' ? 'يوجد فارق غير متوازن!' : 'Out of Balance!') }}
                </span>
                <span class="health-sub font-mono" *ngIf="!report()!.isBalanced">
                  الفرق: {{ report()!.balanceDifference | number:'1.2-2' }} SAR
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Compact Unified Metrics Bar (Totals & Balances) -->
      <section class="tb-metrics-bar" *ngIf="report()">
        <!-- Opening Segment -->
        <div class="metric-segment">
          <div class="seg-top">
            <span class="seg-lbl"><i class="pi pi-history"></i> {{ langService.currentLang() === 'ar' ? 'الأرصدة الافتتاحية' : 'Opening Balances' }}</span>
            <span class="seg-tag" [class.tag-ok]="isOpeningBalanced()">{{ isOpeningBalanced() ? (langService.currentLang() === 'ar' ? 'متطابق' : 'Equal') : (langService.currentLang() === 'ar' ? 'فارق' : 'Diff') }}</span>
          </div>
          <div class="seg-numbers font-mono">
            <span class="num-box"><small>{{ langService.currentLang() === 'ar' ? 'مدين:' : 'Dr:' }}</small> <strong>{{ report()!.totalOpeningDebit | number:'1.2-2' }}</strong></span>
            <span class="num-sep">/</span>
            <span class="num-box"><small>{{ langService.currentLang() === 'ar' ? 'دائن:' : 'Cr:' }}</small> <strong>{{ report()!.totalOpeningCredit | number:'1.2-2' }}</strong></span>
          </div>
        </div>

        <div class="metric-divider"></div>

        <!-- Period Movement Segment -->
        <div class="metric-segment">
          <div class="seg-top">
            <span class="seg-lbl"><i class="pi pi-sync"></i> {{ langService.currentLang() === 'ar' ? 'حركات الفترة (المجاميع)' : 'Period Movement' }}</span>
            <span class="seg-tag" [class.tag-ok]="isPeriodBalanced()">{{ isPeriodBalanced() ? (langService.currentLang() === 'ar' ? 'متوازن' : 'Equal') : (langService.currentLang() === 'ar' ? 'فارق' : 'Diff') }}</span>
          </div>
          <div class="seg-numbers font-mono">
            <span class="num-box text-emerald"><small>{{ langService.currentLang() === 'ar' ? 'مدين:' : 'Dr:' }}</small> <strong>{{ report()!.totalPeriodDebit | number:'1.2-2' }}</strong></span>
            <span class="num-sep">/</span>
            <span class="num-box text-cyan"><small>{{ langService.currentLang() === 'ar' ? 'دائن:' : 'Cr:' }}</small> <strong>{{ report()!.totalPeriodCredit | number:'1.2-2' }}</strong></span>
          </div>
        </div>

        <div class="metric-divider"></div>

        <!-- Ending Balances Segment -->
        <div class="metric-segment">
          <div class="seg-top">
            <span class="seg-lbl"><i class="pi pi-wallet"></i> {{ langService.currentLang() === 'ar' ? 'الأرصدة الختامية' : 'Ending Balances' }}</span>
            <span class="seg-tag" [class.tag-ok]="report()!.isBalanced">{{ report()!.isBalanced ? (langService.currentLang() === 'ar' ? 'متطابق وموزون' : 'Balanced') : (langService.currentLang() === 'ar' ? 'غير متطابق' : 'Diff') }}</span>
          </div>
          <div class="seg-numbers font-mono">
            <span class="num-box text-emerald font-bold"><small>{{ langService.currentLang() === 'ar' ? 'مدين:' : 'Dr:' }}</small> <strong>{{ report()!.totalEndingDebit | number:'1.2-2' }}</strong></span>
            <span class="num-sep">/</span>
            <span class="num-box text-cyan font-bold"><small>{{ langService.currentLang() === 'ar' ? 'دائن:' : 'Cr:' }}</small> <strong>{{ report()!.totalEndingCredit | number:'1.2-2' }}</strong></span>
          </div>
        </div>
      </section>

      <!-- Advanced Filter Controls Card -->
      <section class="tb-filter-card">
        <div class="filter-row">
          
          <!-- From Date -->
          <div class="form-group date-group">
            <label>
              <i class="pi pi-calendar"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'من تاريخ:' : 'From Date:' }}</span>
            </label>
            <input type="date" class="form-control" [(ngModel)]="fromDate" (change)="onFilterChanged()" />
          </div>

          <!-- To Date -->
          <div class="form-group date-group">
            <label>
              <i class="pi pi-calendar"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'إلى تاريخ:' : 'To Date:' }}</span>
            </label>
            <input type="date" class="form-control" [(ngModel)]="toDate" (change)="onFilterChanged()" />
          </div>

          <!-- Cost Center -->
          <div class="form-group cc-group">
            <label>
              <i class="pi pi-compass"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'مركز التكلفة:' : 'Cost Center:' }}</span>
            </label>
            <select class="form-control" [(ngModel)]="selectedCostCenterId" (change)="onFilterChanged()">
              <option value="">{{ langService.currentLang() === 'ar' ? 'جميع مراكز التكلفة' : 'All Cost Centers' }}</option>
              <option *ngFor="let cc of costCenters" [value]="cc.id">
                {{ cc.code }} - {{ cc.nameAr }}
              </option>
            </select>
          </div>

          <!-- Tree Level Depth Selector -->
          <div class="form-group level-group">
            <label>
              <i class="pi pi-sitemap"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'مستوى الحسابات:' : 'Tree Level:' }}</span>
            </label>
            <select class="form-control" [(ngModel)]="selectedMaxLevel" (change)="onFilterChanged()">
              <option [ngValue]="null">{{ langService.currentLang() === 'ar' ? 'كافة المستويات الشجرية' : 'All Levels' }}</option>
              <option [ngValue]="1">{{ langService.currentLang() === 'ar' ? 'المستوى 1 (رئيسي فقط)' : 'Level 1 (Major Only)' }}</option>
              <option [ngValue]="2">{{ langService.currentLang() === 'ar' ? 'حتى المستوى 2 (مجموعات رئيسية)' : 'Up to Level 2' }}</option>
              <option [ngValue]="3">{{ langService.currentLang() === 'ar' ? 'حتى المستوى 3' : 'Up to Level 3' }}</option>
              <option [ngValue]="4">{{ langService.currentLang() === 'ar' ? 'حتى المستوى 4 (الحسابات التحليلية)' : 'Up to Level 4' }}</option>
            </select>
          </div>

          <!-- Search Input -->
          <div class="form-group search-group">
            <label>
              <i class="pi pi-search"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'بحث سريع:' : 'Search:' }}</span>
            </label>
            <input 
              type="text" 
              class="form-control" 
              [placeholder]="langService.currentLang() === 'ar' ? 'رقم أو اسم الحساب...' : 'Code or name...'" 
              [(ngModel)]="searchTerm" 
              (input)="onSearchInput()" />
          </div>

        </div>

        <!-- Filter Sub-bar: Presets & View Controls -->
        <div class="filter-subbar">
          <div class="presets-group">
            <span class="preset-label">{{ langService.currentLang() === 'ar' ? 'فترات قياسية:' : 'Presets:' }}</span>
            <button class="preset-btn" (click)="setPreset('thisMonth')">{{ langService.currentLang() === 'ar' ? 'هذا الشهر' : 'This Month' }}</button>
            <button class="preset-btn" (click)="setPreset('thisQuarter')">{{ langService.currentLang() === 'ar' ? 'الربع الحالي' : 'This Quarter' }}</button>
            <button class="preset-btn active" (click)="setPreset('thisYear')">{{ langService.currentLang() === 'ar' ? 'السنة المالية الحالية' : 'Current Year' }}</button>
          </div>

          <div class="options-group">
            <!-- Hide Zero Balances Toggle -->
            <label class="toggle-control" title="إخفاء الحسابات التي لا توجد بها أرصدة أو حركات">
              <input type="checkbox" [(ngModel)]="hideZeroBalances" (change)="onFilterChanged()" />
              <span class="toggle-slider"></span>
              <span class="toggle-text">{{ langService.currentLang() === 'ar' ? 'إخفاء الحسابات الصفرية' : 'Hide Zero Balances' }}</span>
            </label>

            <!-- Flat view vs Hierarchical toggle -->
            <button class="mode-toggle-btn" [class.active]="viewMode === 'tree'" (click)="toggleViewMode('tree')" title="عرض هرمي شجري">
              <i class="pi pi-align-right"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'عرض شجري' : 'Tree' }}</span>
            </button>
            <button class="mode-toggle-btn" [class.active]="viewMode === 'flat'" (click)="toggleViewMode('flat')" title="عرض جدول منبسط">
              <i class="pi pi-table"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'عرض تفصيلي' : 'Flat' }}</span>
            </button>

            <!-- Expand / Collapse All -->
            <button class="secondary-btn" *ngIf="viewMode === 'tree'" (click)="toggleExpandAll()">
              <i [class]="allExpanded ? 'pi pi-folder' : 'pi pi-folder-open'"></i>
              <span>{{ allExpanded ? (langService.currentLang() === 'ar' ? 'طي الكل' : 'Collapse') : (langService.currentLang() === 'ar' ? 'توسيع الكل' : 'Expand') }}</span>
            </button>

            <!-- Refresh Button -->
            <button class="secondary-btn" (click)="loadTrialBalance()" [disabled]="loading()">
              <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'تحديث' : 'Refresh' }}</span>
            </button>

            <!-- Export Styled Excel -->
            <button class="secondary-btn btn-export" (click)="exportToExcel()">
              <i class="pi pi-file-excel"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'تصدير Excel منسق' : 'Export Excel' }}</span>
            </button>

            <!-- Official Print Button -->
            <button class="primary-btn btn-print" (click)="openPrintModal()">
              <i class="pi pi-print"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'طباعة الميزان الرسمي A4' : 'Print Report' }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Main Trial Balance 6-Column Data Grid Table -->
      <section class="tb-table-card">
        <div class="table-top-header">
          <div class="table-title-box">
            <i class="pi pi-calculator text-emerald"></i>
            <h3 class="table-title-text">{{ langService.currentLang() === 'ar' ? 'جدول ميزان المراجعة بالمجاميع والأرصدة (Standard 6-Column Matrix)' : '6-Column Trial Balance Grid' }}</h3>
          </div>
          <span class="count-badge" *ngIf="report()">
            {{ displayedRows.length }} {{ langService.currentLang() === 'ar' ? 'سطراً معروضاً' : 'rows' }}
          </span>
        </div>

        <div class="table-responsive">
          <table class="tb-main-grid">
            
            <!-- Multi-level Header Row Group -->
            <thead>
              <tr class="header-group-row">
                <th rowspan="2" class="th-code">{{ langService.currentLang() === 'ar' ? 'رمز الحساب' : 'Code' }}</th>
                <th rowspan="2" class="th-name">{{ langService.currentLang() === 'ar' ? 'اسم الحساب المحاسبي' : 'Account Name' }}</th>
                <th rowspan="2" class="th-type">{{ langService.currentLang() === 'ar' ? 'الطبيعة' : 'Nature' }}</th>
                
                <!-- Group 1: Opening Balances -->
                <th colspan="2" class="th-group-opening">{{ langService.currentLang() === 'ar' ? 'الأرصدة الافتتاحية' : 'Opening Balances' }}</th>
                
                <!-- Group 2: Period Movements -->
                <th colspan="2" class="th-group-movement">{{ langService.currentLang() === 'ar' ? 'حركة الفترة (المجاميع)' : 'Period Movement' }}</th>
                
                <!-- Group 3: Ending Balances -->
                <th colspan="2" class="th-group-ending">{{ langService.currentLang() === 'ar' ? 'الأرصدة الختامية' : 'Ending Balances' }}</th>
                
                <th rowspan="2" class="th-drill">{{ langService.currentLang() === 'ar' ? 'كشف الحساب' : 'Ledger' }}</th>
              </tr>

              <!-- Sub-headers: Debit & Credit for each group -->
              <tr class="sub-header-row">
                <th class="th-sub-debit">{{ langService.currentLang() === 'ar' ? 'مدين' : 'Debit' }}</th>
                <th class="th-sub-credit">{{ langService.currentLang() === 'ar' ? 'دائن' : 'Credit' }}</th>

                <th class="th-sub-debit text-emerald">{{ langService.currentLang() === 'ar' ? 'مدين' : 'Debit' }}</th>
                <th class="th-sub-credit text-cyan">{{ langService.currentLang() === 'ar' ? 'دائن' : 'Credit' }}</th>

                <th class="th-sub-debit text-emerald">{{ langService.currentLang() === 'ar' ? 'مدين' : 'Debit' }}</th>
                <th class="th-sub-credit text-cyan">{{ langService.currentLang() === 'ar' ? 'دائن' : 'Credit' }}</th>
              </tr>
            </thead>

            <!-- Table Body -->
            <tbody>
              
              <!-- Loading State -->
              <tr *ngIf="loading()">
                <td colspan="10" class="td-state td-loading">
                  <i class="pi pi-spin pi-spinner"></i>
                  <span>{{ langService.currentLang() === 'ar' ? 'جاري استخراج وتجميع ميزان المراجعة بالمجاميع والأرصدة...' : 'Calculating Trial Balance...' }}</span>
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="!loading() && displayedRows.length === 0">
                <td colspan="10" class="td-state td-empty">
                  <i class="pi pi-inbox"></i>
                  <p>{{ langService.currentLang() === 'ar' ? 'لا توجد بيانات أو حسابات مطابقة لمعايير البحث المحددة' : 'No trial balance accounts found' }}</p>
                </td>
              </tr>

              <!-- Data Rows -->
              <ng-container *ngIf="!loading()">
                <tr 
                  *ngFor="let row of displayedRows" 
                  [class.row-level-1]="row.level === 1"
                  [class.row-level-2]="row.level === 2"
                  [class.row-level-3]="row.level === 3"
                  [class.row-postable]="row.account.isPostable"
                  [class.has-movement]="row.account.periodDebit > 0 || row.account.periodCredit > 0"
                  [hidden]="viewMode === 'tree' && !row.isVisible">
                  
                  <!-- Account Code -->
                  <td class="td-code font-mono">
                    <strong [class.text-emerald]="row.account.isPostable">{{ row.account.accountCode }}</strong>
                  </td>

                  <!-- Account Name with Indentation & Collapse Toggle -->
                  <td class="td-name">
                    <div class="name-wrapper" [style.padding-inline-start.px]="viewMode === 'tree' ? (row.level - 1) * 22 : 0">
                      
                      <!-- Expand / Collapse chevron for tree -->
                      <button 
                        type="button"
                        class="tree-toggle-btn" 
                        *ngIf="viewMode === 'tree' && row.hasChildren"
                        (click)="toggleRow(row)">
                        <i [class]="row.isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-left'"></i>
                      </button>
                      <span class="tree-bullet" *ngIf="viewMode === 'tree' && !row.hasChildren"></span>

                      <!-- Account Category Icon -->
                      <i [class]="getAccountTypeIcon(row.account.accountType)" class="acc-type-icon"></i>

                      <span class="account-name-text">
                        {{ row.account.nameAr }}
                      </span>

                      <!-- Level Tag -->
                      <span class="level-tag" [class.tag-main]="row.level === 1" [class.tag-sub]="row.level > 1">
                        {{ row.level === 1 ? (langService.currentLang() === 'ar' ? 'رئيسي' : 'Major') : 'L' + row.level }}
                      </span>
                    </div>
                  </td>

                  <!-- Account Nature -->
                  <td class="td-type text-center">
                    <span class="nature-pill" [class.nature-debit]="row.account.accountNature === 1" [class.nature-credit]="row.account.accountNature === 2">
                      {{ row.account.accountNature === 1 ? (langService.currentLang() === 'ar' ? 'مدين' : 'Debit') : (langService.currentLang() === 'ar' ? 'دائن' : 'Credit') }}
                    </span>
                  </td>

                  <!-- Opening Debit -->
                  <td class="td-num font-mono">
                    {{ row.account.openingDebit > 0 ? (row.account.openingDebit | number:'1.2-2') : '—' }}
                  </td>

                  <!-- Opening Credit -->
                  <td class="td-num font-mono">
                    {{ row.account.openingCredit > 0 ? (row.account.openingCredit | number:'1.2-2') : '—' }}
                  </td>

                  <!-- Period Debit -->
                  <td class="td-num font-mono text-emerald" [class.font-bold]="row.account.periodDebit > 0">
                    {{ row.account.periodDebit > 0 ? (row.account.periodDebit | number:'1.2-2') : '—' }}
                  </td>

                  <!-- Period Credit -->
                  <td class="td-num font-mono text-cyan" [class.font-bold]="row.account.periodCredit > 0">
                    {{ row.account.periodCredit > 0 ? (row.account.periodCredit | number:'1.2-2') : '—' }}
                  </td>

                  <!-- Ending Debit -->
                  <td class="td-num font-mono text-emerald" [class.font-bold]="row.account.endingDebit > 0">
                    {{ row.account.endingDebit > 0 ? (row.account.endingDebit | number:'1.2-2') : '—' }}
                  </td>

                  <!-- Ending Credit -->
                  <td class="td-num font-mono text-cyan" [class.font-bold]="row.account.endingCredit > 0">
                    {{ row.account.endingCredit > 0 ? (row.account.endingCredit | number:'1.2-2') : '—' }}
                  </td>

                  <!-- Drilldown to Account Statement in GL -->
                  <td class="td-drill text-center">
                    <button 
                      class="drilldown-btn" 
                      *ngIf="row.account.isPostable" 
                      (click)="drilldownToStatement(row.account.accountId)"
                      title="فتح كشف حساب تفصيلي في دفتر الأستاذ">
                      <i class="pi pi-external-link"></i>
                      <span>{{ langService.currentLang() === 'ar' ? 'كشف' : 'View' }}</span>
                    </button>
                    <span class="group-placeholder" *ngIf="!row.account.isPostable">—</span>
                  </td>

                </tr>
              </ng-container>

            </tbody>

            <!-- Pinned Footer Totals Row -->
            <tfoot *ngIf="report() && !loading()">
              
              <!-- Grand Totals Row -->
              <tr class="footer-totals-row font-mono">
                <td colspan="3" class="td-total-lbl">
                  <div class="total-badge-box">
                    <i class="pi pi-check-circle text-emerald"></i>
                    <strong>{{ langService.currentLang() === 'ar' ? 'إجمالي ميزان المراجعة العام (Grand Total):' : 'Grand Totals:' }}</strong>
                  </div>
                </td>
                
                <!-- Opening Totals -->
                <td class="td-num total-val">{{ report()!.totalOpeningDebit | number:'1.2-2' }}</td>
                <td class="td-num total-val">{{ report()!.totalOpeningCredit | number:'1.2-2' }}</td>

                <!-- Period Totals -->
                <td class="td-num total-val text-emerald">{{ report()!.totalPeriodDebit | number:'1.2-2' }}</td>
                <td class="td-num total-val text-cyan">{{ report()!.totalPeriodCredit | number:'1.2-2' }}</td>

                <!-- Ending Totals -->
                <td class="td-num total-val text-emerald">{{ report()!.totalEndingDebit | number:'1.2-2' }}</td>
                <td class="td-num total-val text-cyan">{{ report()!.totalEndingCredit | number:'1.2-2' }}</td>

                <td class="text-center">—</td>
              </tr>

              <!-- Balance Proof Status Row -->
              <tr class="footer-proof-row" [class.proof-passed]="report()!.isBalanced" [class.proof-failed]="!report()!.isBalanced">
                <td colspan="7" class="td-proof-msg">
                  <div class="proof-msg-box">
                    <i [class]="report()!.isBalanced ? 'pi pi-verified' : 'pi pi-times-circle'"></i>
                    <span>
                      {{ report()!.isBalanced 
                        ? (langService.currentLang() === 'ar' 
                            ? 'إثبات توازن الميزان: مجموع الأرصدة المدينة يطابق تماماً مجموع الأرصدة الدائنة (متوازن 100% وفق معايير الهيئة السعودية للمحاسبين SOCPA)' 
                            : 'Trial Balance Proof: Total Debits match Total Credits (100% in compliance with SOCPA & IFRS)')
                        : (langService.currentLang() === 'ar' 
                            ? 'تنبيه تدقيق: يوجد عدم توازن بين طرفي الميزان! يرجى مراجعة القيود غير المرحلة أو غير المتزنة.' 
                            : 'Audit Warning: Trial Balance is out of balance!') }}
                    </span>
                  </div>
                </td>
                <td colspan="3" class="td-proof-diff font-mono">
                  <span>{{ langService.currentLang() === 'ar' ? 'فارق التوازن:' : 'Difference:' }}</span>
                  <strong>{{ report()!.balanceDifference | number:'1.2-2' }} SAR</strong>
                </td>
              </tr>

            </tfoot>

          </table>
        </div>
      </section>

      <!-- ========================================================= -->
      <!-- OFFICIAL A4 PRINTABLE MODAL FOR TRIAL BALANCE REPORT -->
      <!-- ========================================================= -->
      <div class="print-overlay" *ngIf="showPrintModal">
        <div class="print-modal-container">
          
          <!-- Top Modal Action Bar (Hidden on actual print) -->
          <div class="print-action-bar no-print">
            <div class="print-act-left">
              <i class="pi pi-print text-emerald"></i>
              <strong>{{ langService.currentLang() === 'ar' ? 'معاينة ميزان المراجعة المعتمد للطباعة A4' : 'A4 Trial Balance Print Preview' }}</strong>
            </div>
            <div class="print-act-right">
              <button class="secondary-btn" (click)="closePrintModal()">
                <i class="pi pi-times"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'إغلاق' : 'Close' }}</span>
              </button>
              <button class="primary-btn" (click)="triggerPrint()">
                <i class="pi pi-print"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'إرسال إلى الطابعة / حفظ PDF' : 'Print / Save PDF' }}</span>
              </button>
            </div>
          </div>

          <!-- Printable A4 Paper Document -->
          <div class="print-paper" id="trial-balance-a4">
            
            <!-- Company Letterhead Header -->
            <div class="paper-header">
              <div class="header-logo-side">
                <div class="corporate-emblem">
                  <i class="pi pi-compass"></i>
                </div>
                <div class="company-details">
                  <h2 class="company-name-ar">{{ companyContext.activeCompany().nameAr }}</h2>
                  <span class="company-name-en">{{ companyContext.activeCompany().nameEn }}</span>
                  <div class="tax-info font-mono">
                    <span>الرقم الضريبي VAT: {{ companyContext.activeCompany().vatNumber }}</span>
                    <span>س.ت CR: {{ companyContext.activeCompany().commercialRegistration }}</span>
                  </div>
                </div>
              </div>

              <div class="header-doc-title">
                <h1 class="doc-main-title">ميزان المراجعة بالمجاميع والأرصدة</h1>
                <span class="doc-sub-title">TRIAL BALANCE REPORT (TOTALS & BALANCES)</span>
                <div class="doc-meta-badge font-mono">
                  <span>الفترة: من {{ fromDate }} إلى {{ toDate }}</span>
                </div>
              </div>

              <div class="header-qr-side">
                <div class="official-audit-badge">
                  <i class="pi pi-shield"></i>
                  <span>معتمد رسمياً</span>
                  <small>SOCPA / IFRS</small>
                </div>
                <span class="print-date font-mono">تاريخ الاستخراج: {{ printDate | date:'yyyy-MM-dd HH:mm' }}</span>
              </div>
            </div>

            <div class="paper-divider"></div>

            <!-- Summary KPI Strip on Print Document -->
            <div class="paper-summary-strip" *ngIf="report()">
              <div class="summary-box">
                <span class="s-label">الافتتاحي (مدين / دائن)</span>
                <strong class="s-val font-mono">{{ report()!.totalOpeningDebit | number:'1.2-2' }} SAR</strong>
              </div>
              <div class="summary-box">
                <span class="s-label">حركة الفترة (مدين / دائن)</span>
                <strong class="s-val font-mono text-emerald">{{ report()!.totalPeriodDebit | number:'1.2-2' }} SAR</strong>
              </div>
              <div class="summary-box">
                <span class="s-label">الختامي (مدين / دائن)</span>
                <strong class="s-val font-mono text-cyan">{{ report()!.totalEndingDebit | number:'1.2-2' }} SAR</strong>
              </div>
              <div class="summary-box">
                <span class="s-label">حالة التوازن</span>
                <strong class="s-val text-emerald font-mono">{{ report()!.isBalanced ? 'متوازن تماماً (0.00)' : 'فارق: ' + report()!.balanceDifference }}</strong>
              </div>
            </div>

            <!-- Print Data Table -->
            <table class="paper-data-table" *ngIf="report()">
              <thead>
                <tr class="p-head-top">
                  <th rowspan="2" class="p-th-code">كود الحساب</th>
                  <th rowspan="2" class="p-th-name">اسم الحساب المحاسبي</th>
                  <th rowspan="2" class="p-th-nature">الطبيعة</th>
                  <th colspan="2" class="p-th-group">الرصيد الافتتاحي</th>
                  <th colspan="2" class="p-th-group">حركة الفترة</th>
                  <th colspan="2" class="p-th-group">الرصيد الختامي</th>
                </tr>
                <tr class="p-head-sub">
                  <th>مدين</th>
                  <th>دائن</th>
                  <th>مدين</th>
                  <th>دائن</th>
                  <th>مدين</th>
                  <th>دائن</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  *ngFor="let row of displayedRows" 
                  [class.p-row-level-1]="row.level === 1"
                  [class.p-row-level-2]="row.level === 2"
                  [class.p-row-postable]="row.account.isPostable">
                  
                  <td class="font-mono text-center">{{ row.account.accountCode }}</td>
                  
                  <td [style.padding-inline-start.px]="(row.level - 1) * 14">
                    <strong>{{ row.account.nameAr }}</strong>
                  </td>

                  <td class="text-center">
                    {{ row.account.accountNature === 1 ? 'مدين' : 'دائن' }}
                  </td>

                  <td class="font-mono text-end">{{ row.account.openingDebit > 0 ? (row.account.openingDebit | number:'1.2-2') : '—' }}</td>
                  <td class="font-mono text-end">{{ row.account.openingCredit > 0 ? (row.account.openingCredit | number:'1.2-2') : '—' }}</td>

                  <td class="font-mono text-end">{{ row.account.periodDebit > 0 ? (row.account.periodDebit | number:'1.2-2') : '—' }}</td>
                  <td class="font-mono text-end">{{ row.account.periodCredit > 0 ? (row.account.periodCredit | number:'1.2-2') : '—' }}</td>

                  <td class="font-mono text-end">{{ row.account.endingDebit > 0 ? (row.account.endingDebit | number:'1.2-2') : '—' }}</td>
                  <td class="font-mono text-end">{{ row.account.endingCredit > 0 ? (row.account.endingCredit | number:'1.2-2') : '—' }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="p-foot-total font-mono">
                  <td colspan="3" class="text-center font-bold">المجموع العام لميزان المراجعة</td>
                  <td class="text-end">{{ report()!.totalOpeningDebit | number:'1.2-2' }}</td>
                  <td class="text-end">{{ report()!.totalOpeningCredit | number:'1.2-2' }}</td>
                  <td class="text-end">{{ report()!.totalPeriodDebit | number:'1.2-2' }}</td>
                  <td class="text-end">{{ report()!.totalPeriodCredit | number:'1.2-2' }}</td>
                  <td class="text-end">{{ report()!.totalEndingDebit | number:'1.2-2' }}</td>
                  <td class="text-end">{{ report()!.totalEndingCredit | number:'1.2-2' }}</td>
                </tr>
              </tfoot>
            </table>

            <!-- Arabic Tafqeet Closing Text -->
            <div class="tafqeet-strip">
              <span class="tf-label">تفقيط مجاميع الميزان الختامي:</span>
              <strong class="tf-text">{{ getTafqeetText() }}</strong>
            </div>

            <!-- Corporate Tripartite Signatures Matrix -->
            <div class="paper-signatures-matrix">
              <div class="sig-box">
                <span class="sig-title">المحاسب المالي المسؤول</span>
                <span class="sig-name">Financial Accountant</span>
                <div class="sig-line">التوقيع: ............................</div>
              </div>
              <div class="sig-box">
                <span class="sig-title">رئيس قسم الحسابات والمراجعة</span>
                <span class="sig-name">Chief Accountant / Auditor</span>
                <div class="sig-line">التوقيع: ............................</div>
              </div>
              <div class="sig-box">
                <span class="sig-title">المدير المالي التنفيذي (CFO)</span>
                <span class="sig-name">Chief Financial Officer</span>
                <div class="sig-line">التوقيع والختم: ............................</div>
              </div>
            </div>

            <!-- Official Footer Note -->
            <div class="paper-footer-legal">
              <span>نظام الربان المحاسبي المتكامل | Al-Roban ERP | تم استخراج هذا الميزان آلياً من واقع القيود المرحلة ودفتر الأستاذ العام المعتمد.</span>
            </div>

          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    .tb-page {
      padding: 0.75rem 1rem;
      min-height: 100vh;
      background: #f8fafc;
      font-family: inherit;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    /* Compact Header Bar */
    .tb-header {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.6rem 0.85rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .tb-header-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
    .tb-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      color: #64748b;
      margin-bottom: 0.2rem;
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

    .tb-title-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }
    .tb-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .socpa-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #ecfdf5;
      color: #059669;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
    }

    /* Balance Health Pill */
    .balance-health-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      border: 1.5px solid;
      font-size: 0.78rem;
    }
    .balance-health-pill.is-balanced {
      background: #f0fdf4;
      border-color: #86efac;
      color: #15803d;
    }
    .balance-health-pill.is-unbalanced {
      background: #fef2f2;
      border-color: #fca5a5;
      color: #b91c1c;
    }
    .balance-health-pill i {
      font-size: 1.1rem;
    }
    .pill-info {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .health-text {
      font-weight: 700;
    }
    .health-sub {
      font-size: 0.75rem;
    }

    /* Compact Unified Metrics Bar */
    .tb-metrics-bar {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr;
      align-items: center;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.5rem 0.85rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .metric-segment {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .seg-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .seg-lbl {
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .seg-lbl i {
      color: #0f766e;
      font-size: 0.8rem;
    }
    .seg-tag {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      background: #fef2f2;
      color: #dc2626;
    }
    .seg-tag.tag-ok {
      background: #ecfdf5;
      color: #059669;
    }
    .seg-numbers {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.88rem;
      color: #0f172a;
    }
    .num-box small {
      font-size: 0.7rem;
      color: #64748b;
      margin-inline-end: 0.2rem;
    }
    .num-sep {
      color: #cbd5e1;
    }
    .metric-divider {
      width: 1px;
      height: 32px;
      background: #e2e8f0;
      margin: 0 0.85rem;
    }

    /* Compact Filter Card */
    .tb-filter-card {
      background: white;
      border-radius: 8px;
      padding: 0.55rem 0.85rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .filter-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.55rem;
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
      font-weight: 600;
      color: #475569;
    }
    .form-group label i {
      color: #0f766e;
      font-size: 0.75rem;
    }
    .form-control {
      height: 32px;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 0.55rem;
      font-size: 0.78rem;
      color: #0f172a;
      outline: none;
      transition: all 0.2s;
      background: white;
    }
    .form-control:focus {
      border-color: #0f766e;
      box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.12);
    }

    .filter-subbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.55rem;
      padding-top: 0.4rem;
      border-top: 1px solid #f1f5f9;
    }
    .presets-group {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .preset-label {
      font-size: 0.7rem;
      color: #64748b;
      font-weight: 600;
    }
    .preset-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 0.2rem 0.55rem;
      border-radius: 5px;
      font-size: 0.72rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
    }
    .preset-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .preset-btn.active {
      background: #0f766e;
      color: white;
      border-color: #0f766e;
    }

    .options-group {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .toggle-control {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
      font-size: 0.75rem;
      color: #334155;
      font-weight: 600;
      user-select: none;
      margin-inline-end: 0.35rem;
    }
    .mode-toggle-btn, .secondary-btn, .primary-btn {
      height: 30px;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      border: none;
    }
    .mode-toggle-btn {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #cbd5e1;
    }
    .mode-toggle-btn.active {
      background: #ecfdf5;
      color: #059669;
      border-color: #86efac;
    }
    .secondary-btn {
      background: white;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .secondary-btn:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .primary-btn {
      background: #0f766e;
      color: white;
    }
    .primary-btn:hover {
      background: #115e59;
    }
    .btn-export {
      color: #059669;
      border-color: #a7f3d0;
      background: #ecfdf5;
    }
    .btn-print {
      box-shadow: 0 1px 3px rgba(15, 118, 110, 0.2);
    }

    /* Main Table Grid Card (High Density) */
    .tb-table-card {
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      overflow: hidden;
    }
    .table-top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .table-title-box {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .table-title-text {
      font-size: 0.88rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .count-badge {
      background: #e2e8f0;
      color: #475569;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 9999px;
    }

    .table-responsive {
      overflow-x: auto;
    }
    .tb-main-grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
      text-align: start;
    }

    /* Compact Multi-level Headers */
    .header-group-row th {
      background: #0f172a;
      color: #f8fafc;
      font-weight: 700;
      padding: 0.45rem 0.55rem;
      text-align: center;
      border-inline-end: 1px solid #334155;
      font-size: 0.76rem;
    }
    .th-group-opening {
      background: #1e293b !important;
      border-bottom: 1.5px solid #64748b;
    }
    .th-group-movement {
      background: #064e3b !important;
      border-bottom: 1.5px solid #10b981;
    }
    .th-group-ending {
      background: #164e63 !important;
      border-bottom: 1.5px solid #06b6d4;
    }

    .sub-header-row th {
      background: #1e293b;
      color: #cbd5e1;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.28rem 0.55rem;
      text-align: end;
      border-inline-end: 1px solid #334155;
    }

    /* High-Density Data Rows */
    .tb-main-grid tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.1s;
    }
    .tb-main-grid tbody tr:hover {
      background: #f8fafc;
    }

    /* Level styling */
    .row-level-1 {
      background: #f1f5f9;
      font-weight: 800;
      border-top: 1.5px solid #cbd5e1;
    }
    .row-level-1 td {
      color: #0f172a;
      font-size: 0.84rem;
    }
    .row-level-2 {
      background: #fafafa;
      font-weight: 700;
    }
    .row-level-3 {
      font-weight: 500;
    }
    .row-postable {
      background: #ffffff;
    }
    .has-movement {
      background: rgba(16, 185, 129, 0.025);
    }

    .tb-main-grid td {
      padding: 0.3rem 0.55rem;
      vertical-align: middle;
      border-inline-end: 1px solid #f1f5f9;
    }
    .td-num {
      text-align: end;
      font-variant-numeric: tabular-nums;
      font-size: 0.8rem;
    }

    .name-wrapper {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .tree-toggle-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      padding: 0.1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .tree-toggle-btn:hover { color: #0f766e; }
    .tree-bullet { width: 10px; display: inline-block; }
    .acc-type-icon { color: #94a3b8; font-size: 0.75rem; }
    .account-name-text { color: #1e293b; }
    .level-tag {
      font-size: 0.6rem;
      padding: 0.05rem 0.3rem;
      border-radius: 3px;
      font-weight: 700;
    }
    .tag-main { background: #0f172a; color: white; }
    .tag-sub { background: #e2e8f0; color: #475569; }

    .nature-pill {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }
    .nature-debit { background: #ecfdf5; color: #059669; }
    .nature-credit { background: #ecfeff; color: #0891b2; }

    .drilldown-btn {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #16a34a;
      padding: 0.12rem 0.45rem;
      border-radius: 4px;
      font-size: 0.68rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      transition: all 0.15s;
    }
    .drilldown-btn:hover {
      background: #16a34a;
      color: white;
    }

    /* Pinned Footer Totals */
    .footer-totals-row td {
      background: #0f172a;
      color: white;
      font-weight: 800;
      padding: 0.45rem 0.55rem;
      border-inline-end: 1px solid #334155;
      font-size: 0.82rem;
    }
    .total-badge-box {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .total-val {
      font-size: 0.84rem;
    }

    .footer-proof-row td {
      padding: 0.35rem 0.65rem;
      font-weight: 700;
      font-size: 0.74rem;
    }
    .proof-passed td {
      background: #f0fdf4;
      color: #15803d;
      border-top: 1px solid #86efac;
    }
    .proof-failed td {
      background: #fef2f2;
      color: #b91c1c;
      border-top: 1px solid #fca5a5;
    }
    .proof-msg-box {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .td-proof-diff {
      text-align: end;
      font-size: 0.8rem;
    }

    /* Print Modal & Overlay */
    .print-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 2rem 1rem;
      overflow-y: auto;
    }
    .print-modal-container {
      background: white;
      border-radius: 16px;
      max-width: 1050px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }
    .print-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: #0f172a;
      color: white;
    }
    .print-act-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
    }
    .print-act-right {
      display: flex;
      gap: 0.75rem;
    }

    /* A4 Paper */
    .print-paper {
      padding: 2.5rem;
      background: white;
      color: #0f172a;
      font-family: inherit;
    }
    .paper-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .header-logo-side {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .corporate-emblem {
      width: 55px;
      height: 55px;
      border-radius: 12px;
      background: #0f766e;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
    }
    .company-name-ar {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0;
    }
    .company-name-en {
      font-size: 0.8rem;
      color: #64748b;
      display: block;
    }
    .tax-info {
      font-size: 0.75rem;
      color: #475569;
      display: flex;
      gap: 1rem;
      margin-top: 0.25rem;
    }
    .header-doc-title {
      text-align: center;
    }
    .doc-main-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f766e;
      margin: 0;
    }
    .doc-sub-title {
      font-size: 0.75rem;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .doc-meta-badge {
      font-size: 0.78rem;
      background: #f1f5f9;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      margin-top: 0.35rem;
      display: inline-block;
    }
    .header-qr-side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.35rem;
    }
    .official-audit-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1.5px dashed #059669;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      color: #059669;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .print-date {
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .paper-divider {
      height: 2px;
      background: linear-gradient(to right, #0f766e, #06b6d4, #0f766e);
      margin-bottom: 1.25rem;
    }

    .paper-summary-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 1.25rem;
      text-align: center;
    }
    .s-label {
      font-size: 0.72rem;
      color: #64748b;
      display: block;
    }
    .s-val {
      font-size: 0.95rem;
    }

    .paper-data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .paper-data-table th, .paper-data-table td {
      border: 1px solid #cbd5e1;
      padding: 0.4rem 0.5rem;
    }
    .p-head-top th {
      background: #0f172a;
      color: white;
      text-align: center;
    }
    .p-head-sub th {
      background: #334155;
      color: white;
      text-align: center;
      font-size: 0.7rem;
    }
    .p-row-level-1 {
      background: #f1f5f9;
      font-weight: 800;
    }
    .p-row-level-2 {
      font-weight: 700;
    }
    .p-foot-total {
      background: #e2e8f0;
      font-weight: 800;
    }

    .tafqeet-strip {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .tf-label {
      color: #065f46;
      font-weight: 700;
    }
    .tf-text {
      color: #047857;
    }

    .paper-signatures-matrix {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-box {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      text-align: center;
    }
    .sig-title {
      font-weight: 700;
      font-size: 0.85rem;
      color: #0f172a;
    }
    .sig-name {
      font-size: 0.72rem;
      color: #64748b;
    }
    .sig-line {
      margin-top: 2.5rem;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .paper-footer-legal {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.7rem;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 0.75rem;
    }

    @media print {
      body * {
        visibility: hidden;
      }
      .print-overlay, .print-modal-container, .print-paper, .print-paper * {
        visibility: visible;
      }
      .print-overlay {
        position: static !important;
        padding: 0 !important;
        background: none !important;
      }
      .print-modal-container {
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
      @page {
        size: A4 landscape;
        margin: 1cm;
      }
    }
  `]
})
export class TrialBalanceComponent implements OnInit {
  tbService = inject(TrialBalanceService);
  settingsService = inject(FinancialSettingsService);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);
  tafqeet = inject(TafqeetService);
  router = inject(Router);

  loading = signal<boolean>(false);
  report = signal<TrialBalanceReport | null>(null);

  // Filters State
  fromDate: string = `${new Date().getFullYear()}-01-01`;
  toDate: string = this.formatLocalDate(new Date());
  selectedCostCenterId: string = '';
  selectedMaxLevel: number | null = null;
  searchTerm: string = '';
  hideZeroBalances: boolean = false;

  // View state
  viewMode: 'tree' | 'flat' = 'tree';
  allExpanded: boolean = true;
  displayedRows: FlatRowItem[] = [];

  // Reference data
  costCenters: CostCenter[] = [];

  // Print modal
  showPrintModal = false;
  printDate = new Date();

  ngOnInit() {
    this.loadReferenceData();
    this.loadTrialBalance();
  }

  loadReferenceData() {
    const companyId = this.companyContext.activeCompany().id;
    this.settingsService.getOverview(companyId).subscribe({
      next: (data) => {
        this.costCenters = data.costCenters || [];
      }
    });
  }

  loadTrialBalance() {
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany().id;

    this.tbService.getTrialBalance({
      companyId,
      fromDate: this.fromDate,
      toDate: this.toDate,
      costCenterId: this.selectedCostCenterId || undefined,
      hideZeroBalances: this.hideZeroBalances,
      maxLevel: this.selectedMaxLevel ?? undefined,
      searchTerm: this.searchTerm || undefined
    }).subscribe({
      next: (rep) => {
        this.report.set(rep);
        this.rebuildDisplayedRows();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load trial balance', err);
        this.loading.set(false);
      }
    });
  }

  onFilterChanged() {
    this.loadTrialBalance();
  }

  onSearchInput() {
    this.rebuildDisplayedRows();
  }

  toggleViewMode(mode: 'tree' | 'flat') {
    this.viewMode = mode;
    this.rebuildDisplayedRows();
  }

  rebuildDisplayedRows() {
    const rep = this.report();
    if (!rep) {
      this.displayedRows = [];
      return;
    }

    const rows: FlatRowItem[] = [];

    const traverse = (node: TrialBalanceAccount, level: number, parentExpanded: boolean) => {
      const hasChildren = node.subAccounts && node.subAccounts.length > 0;
      
      const item: FlatRowItem = {
        account: node,
        level: level,
        hasChildren: hasChildren,
        isExpanded: this.allExpanded,
        isVisible: parentExpanded
      };

      if (this.viewMode === 'flat') {
        // In flat mode, only show postable accounts or matching accounts
        if (node.isPostable) {
          rows.push(item);
        }
      } else {
        rows.push(item);
      }

      if (hasChildren) {
        for (const child of node.subAccounts) {
          traverse(child, level + 1, parentExpanded && item.isExpanded);
        }
      }
    };

    for (const rootNode of rep.accounts) {
      traverse(rootNode, 1, true);
    }

    this.displayedRows = rows;
  }

  toggleRow(row: FlatRowItem) {
    row.isExpanded = !row.isExpanded;
    this.updateVisibility(this.displayedRows);
  }

  toggleExpandAll() {
    this.allExpanded = !this.allExpanded;
    for (const r of this.displayedRows) {
      r.isExpanded = this.allExpanded;
    }
    this.updateVisibility(this.displayedRows);
  }

  private updateVisibility(rows: FlatRowItem[]) {
    const map = new Map<string, FlatRowItem>();
    rows.forEach(r => map.set(r.account.accountId, r));

    for (const r of rows) {
      if (r.level === 1) {
        r.isVisible = true;
      } else {
        const parent = map.get(r.account.parentAccountId || '');
        r.isVisible = parent ? parent.isVisible && parent.isExpanded : true;
      }
    }
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

  isOpeningBalanced(): boolean {
    const r = this.report();
    if (!r) return true;
    return Math.abs(r.totalOpeningDebit - r.totalOpeningCredit) < 0.01;
  }

  isPeriodBalanced(): boolean {
    const r = this.report();
    if (!r) return true;
    return Math.abs(r.totalPeriodDebit - r.totalPeriodCredit) < 0.01;
  }

  getAccountTypeIcon(type: number): string {
    switch (type) {
      case 1: return 'pi pi-building'; // Asset
      case 2: return 'pi pi-credit-card'; // Liability
      case 3: return 'pi pi-star'; // Equity
      case 4: return 'pi pi-chart-line'; // Revenue
      case 5: return 'pi pi-shopping-cart'; // Expense
      default: return 'pi pi-folder';
    }
  }

  drilldownToStatement(accountId: string) {
    this.router.navigate(['/accounting/general-ledger'], {
      queryParams: {
        accountId: accountId,
        fromDate: this.fromDate,
        toDate: this.toDate
      }
    });
  }

  exportToExcel() {
    const rep = this.report();
    if (!rep) return;

    const company = this.companyContext.activeCompany();
    const companyName = company.nameAr || 'شركة الربان للحلول الذكية';
    const vatNo = company.vatNumber || '310123456700003';
    const crNo = company.commercialRegistration || '1010789456';
    const nowStr = new Date().toLocaleString('ar-SA');
    const tafqeetText = this.getTafqeetText();

    let rowsHtml = '';
    for (const r of this.displayedRows) {
      const acc = r.account;
      const nature = acc.accountNature === 1 ? 'مدين' : 'دائن';
      const lvlClass = acc.level === 1 ? 'lvl-1' : (acc.level === 2 ? 'lvl-2' : 'lvl-3');
      const indent = (acc.level - 1) * 16;

      rowsHtml += `
        <tr class="${lvlClass}">
          <td class="td-code">${acc.accountCode}</td>
          <td class="td-name" style="padding-right: ${indent}px;">${acc.nameAr}</td>
          <td class="td-center">${acc.level}</td>
          <td class="td-nature">${nature}</td>
          <td class="td-num">${acc.openingDebit ? acc.openingDebit.toFixed(2) : '0.00'}</td>
          <td class="td-num">${acc.openingCredit ? acc.openingCredit.toFixed(2) : '0.00'}</td>
          <td class="td-num">${acc.periodDebit ? acc.periodDebit.toFixed(2) : '0.00'}</td>
          <td class="td-num">${acc.periodCredit ? acc.periodCredit.toFixed(2) : '0.00'}</td>
          <td class="td-num">${acc.endingDebit ? acc.endingDebit.toFixed(2) : '0.00'}</td>
          <td class="td-num">${acc.endingCredit ? acc.endingCredit.toFixed(2) : '0.00'}</td>
        </tr>
      `;
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>ميزان المراجعة بالمجاميع والأرصدة</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }
          .header-main { background-color: #0B1528; color: #FFFFFF; font-size: 15pt; font-weight: bold; text-align: center; height: 35px; }
          .header-sub { background-color: #0B1528; color: #94A3B8; font-size: 10pt; text-align: center; }
          .tax-bar { background-color: #F8FAFC; color: #334155; font-size: 9pt; text-align: center; border-bottom: 2px solid #0F766E; }
          .title-bar { background-color: #0F766E; color: #FFFFFF; font-size: 13pt; font-weight: bold; text-align: center; height: 32px; }
          .meta-bar { background-color: #F1F5F9; color: #1E293B; font-size: 9pt; text-align: center; }
          
          .th-code { background-color: #0F172A; color: #FFFFFF; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #334155; }
          .th-name { background-color: #0F172A; color: #FFFFFF; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #334155; }
          .th-group-open { background-color: #1E293B; color: #FFFFFF; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #475569; }
          .th-group-mov { background-color: #064E3B; color: #FFFFFF; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #059669; }
          .th-group-end { background-color: #164E63; color: #FFFFFF; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #0891B2; }
          
          .th-sub-debit { background-color: #334155; color: #10B981; font-size: 8.5pt; font-weight: bold; text-align: center; border: 1px solid #475569; }
          .th-sub-credit { background-color: #334155; color: #06B6D4; font-size: 8.5pt; font-weight: bold; text-align: center; border: 1px solid #475569; }

          .td-code { font-family: 'Consolas', monospace; text-align: center; font-weight: bold; border: 1px solid #CBD5E1; mso-number-format: "\\@"; }
          .td-name { text-align: right; border: 1px solid #CBD5E1; }
          .td-center { text-align: center; border: 1px solid #CBD5E1; }
          .td-nature { text-align: center; border: 1px solid #CBD5E1; font-weight: bold; }
          .td-num { text-align: left; direction: ltr; font-family: 'Consolas', monospace; border: 1px solid #CBD5E1; mso-number-format: "\\#\\,\\#\\#0\\.00"; }

          .lvl-1 { background-color: #E2E8F0; font-weight: bold; font-size: 10.5pt; color: #0F172A; }
          .lvl-2 { background-color: #F1F5F9; font-weight: bold; font-size: 9.5pt; color: #1E293B; }
          .lvl-3 { background-color: #FFFFFF; font-weight: normal; font-size: 9pt; }

          .row-total { background-color: #0F172A; color: #FFFFFF; font-size: 11pt; font-weight: bold; border: 1px solid #000000; height: 30px; }
          .row-proof { background-color: #ECFDF5; color: #065F46; font-size: 10pt; font-weight: bold; border: 1px solid #A7F3D0; text-align: center; height: 26px; }
          .row-tafqeet { background-color: #F0FDF4; color: #047857; font-size: 9.5pt; font-weight: bold; border: 1px solid #BBF7D0; text-align: center; height: 24px; }
          
          .sig-box { text-align: center; vertical-align: top; padding-top: 15px; font-size: 9pt; font-weight: bold; border: none; }
          .sig-line { padding-top: 35px; color: #64748B; font-weight: normal; }
        </style>
      </head>
      <body>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr>
            <th colspan="10" class="header-main">${companyName} - نظام الربان المحاسبي المتكامل Al-Roban ERP</th>
          </tr>
          <tr>
            <td colspan="10" class="header-sub">نظام تخطيط موارد المنشآت والفوترة الإلكترونية المعتمدة (ZATCA / SOCPA / IFRS)</td>
          </tr>
          <tr>
            <td colspan="10" class="tax-bar">الرقم الضريبي VAT: ${vatNo} | السجل التجاري CR: ${crNo} | المركز الرئيسي - المملكة العربية السعودية</td>
          </tr>
          <tr>
            <th colspan="10" class="title-bar">ميزان المراجعة بالمجاميع والأرصدة (TRIAL BALANCE - TOTALS & BALANCES)</th>
          </tr>
          <tr>
            <td colspan="10" class="meta-bar">الفترة المالية: من ${this.fromDate} إلى ${this.toDate} | تاريخ ووقت الاستخراج: ${nowStr} | معتمد محاسبياً</td>
          </tr>
          
          <!-- Table Header -->
          <tr>
            <th rowspan="2" class="th-code">كود الحساب</th>
            <th rowspan="2" class="th-name">اسم الحساب المحاسبي</th>
            <th rowspan="2" class="th-code">المستوى</th>
            <th rowspan="2" class="th-code">طبيعة الحساب</th>
            <th colspan="2" class="th-group-open">الأرصدة الافتتاحية</th>
            <th colspan="2" class="th-group-mov">حركة الفترة (المجاميع)</th>
            <th colspan="2" class="th-group-end">الأرصدة الختامية</th>
          </tr>
          <tr>
            <th class="th-sub-debit">مدين</th>
            <th class="th-sub-credit">دائن</th>
            <th class="th-sub-debit">مدين</th>
            <th class="th-sub-credit">دائن</th>
            <th class="th-sub-debit">مدين</th>
            <th class="th-sub-credit">دائن</th>
          </tr>

          <!-- Data Rows -->
          ${rowsHtml}

          <!-- Grand Totals -->
          <tr class="row-total">
            <td colspan="4" style="text-align: center; font-weight: bold; color: #FFFFFF;">المجموع العام لميزان المراجعة (Grand Totals):</td>
            <td class="td-num" style="font-weight: bold; color: #FFFFFF;">${rep.totalOpeningDebit.toFixed(2)}</td>
            <td class="td-num" style="font-weight: bold; color: #FFFFFF;">${rep.totalOpeningCredit.toFixed(2)}</td>
            <td class="td-num" style="font-weight: bold; color: #10B981;">${rep.totalPeriodDebit.toFixed(2)}</td>
            <td class="td-num" style="font-weight: bold; color: #06B6D4;">${rep.totalPeriodCredit.toFixed(2)}</td>
            <td class="td-num" style="font-weight: bold; color: #10B981;">${rep.totalEndingDebit.toFixed(2)}</td>
            <td class="td-num" style="font-weight: bold; color: #06B6D4;">${rep.totalEndingCredit.toFixed(2)}</td>
          </tr>

          <!-- Balance Proof Row -->
          <tr>
            <td colspan="10" class="row-proof">
              ${rep.isBalanced 
                ? 'إثبات توازن الميزان: ميزان المراجعة متوازن تماماً ومطابق 100% وفق معايير الهيئة السعودية للمحاسبين SOCPA ومعايير المحاسبة الدولية IFRS (الفارق: 0.00 ريال سعودي)'
                : 'تنبيه تدقيق: ميزان المراجعة غير متوازن! يوجد فارق: ' + rep.balanceDifference.toFixed(2) + ' ريال سعودي'}
            </td>
          </tr>

          <!-- Tafqeet Row -->
          <tr>
            <td colspan="10" class="row-tafqeet">
              تفقيط المجاميع الختامية: ${tafqeetText}
            </td>
          </tr>

          <!-- Signatures Matrix -->
          <tr>
            <td colspan="3" class="sig-box">
              المحاسب المالي المسؤول<br>
              Financial Accountant
              <div class="sig-line">التوقيع: .................................</div>
            </td>
            <td colspan="4" class="sig-box">
              رئيس قسم الحسابات والمراجعة<br>
              Chief Accountant / Auditor
              <div class="sig-line">التوقيع: .................................</div>
            </td>
            <td colspan="3" class="sig-box">
              المدير المالي التنفيذي (CFO)<br>
              Chief Financial Officer
              <div class="sig-line">التوقيع والختم: .................................</div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ميزان_المراجعة_بالمجاميع_والأرصدة_${this.fromDate}_${this.toDate}.xls`;
    link.click();
  }

  openPrintModal() {
    this.printDate = new Date();
    this.showPrintModal = true;
  }

  closePrintModal() {
    this.showPrintModal = false;
  }

  triggerPrint() {
    window.print();
  }

  getTafqeetText(): string {
    const endingDebit = this.report()?.totalEndingDebit || 0;
    return this.tafqeet.toArabicCurrency(endingDebit, 'ريال سعودي', 'هللة');
  }

  private formatLocalDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
