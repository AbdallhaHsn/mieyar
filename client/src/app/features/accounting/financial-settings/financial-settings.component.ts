import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import Swal from 'sweetalert2';

@Component({
  selector: 'app-financial-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
              {{ langService.currentLang() === 'ar' ? 'الإعدادات والسياسات المالية ومراكز التكلفة' : 'Financial Settings, Fiscal Periods & Cost Centers' }}
            </h1>
            <p class="page-subtitle">
              {{ langService.currentLang() === 'ar' 
                ? 'إدارة السنوات والفترات المحاسبية، ضبط سياسة مراكز التكلفة، والرقابة على القيود' 
                : 'Manage accounting years & periods, cost center dimensions, and financial controls' }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-refresh" (click)="loadData()" [title]="langService.currentLang() === 'ar' ? 'تحديث البيانات' : 'Refresh'">
            <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'تحديث' : 'Refresh' }}</span>
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
          <span>{{ langService.currentLang() === 'ar' ? 'السنوات والفترات المالية (Fiscal Periods)' : 'Fiscal Years & Periods' }}</span>
          <span class="tab-badge" *ngIf="overview()?.activeFiscalYear">
            {{ overview()?.activeFiscalYear?.yearNumber }}
          </span>
        </button>

        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'cost-centers'" 
          (click)="activeTab.set('cost-centers')">
          <i class="pi pi-tags"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'مراكز التكلفة (Cost Centers)' : 'Cost Centers' }}</span>
          <span class="tab-badge" *ngIf="overview()?.costCenters">
            {{ overview()?.costCenters?.length }}
          </span>
        </button>

        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'policies'" 
          (click)="activeTab.set('policies')">
          <i class="pi pi-shield"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'سياسات الرقابة والإقفال' : 'Financial Controls & Policies' }}</span>
        </button>

        <button 
          class="tab-btn tab-btn-closing" 
          [class.active]="activeTab() === 'closing'" 
          (click)="openClosingTab()">
          <i class="pi pi-lock"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'إقفال نهاية السنة وترحيل الأرصدة' : 'Year-End Closing & Roll-Forward' }}</span>
        </button>

        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'currencies'" 
          (click)="activeTab.set('currencies'); loadCurrencies()">
          <i class="pi pi-dollar"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'أسعار العملات وإعادة التقييم (IAS 21)' : 'Exchange Rates & IAS 21' }}</span>
        </button>
      </nav>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-state">
        <i class="pi pi-spin pi-spinner text-emerald text-3xl"></i>
        <span>{{ langService.currentLang() === 'ar' ? 'جارٍ تحميل البيانات المالية...' : 'Loading financial settings...' }}</span>
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
                  ? (langService.currentLang() === 'ar' ? 'سنة مقفلة' : 'Closed Year')
                  : (langService.currentLang() === 'ar' ? 'سنة نشطة' : 'Active Year') }}
              </span>
            </div>
            <div class="year-details">
              <h3>{{ langService.currentLang() === 'ar' ? selectedYear()?.nameAr : selectedYear()?.nameEn }}</h3>
              <div class="dates-meta">
                <span><i class="pi pi-calendar-plus text-emerald"></i> {{ langService.currentLang() === 'ar' ? 'من: ' : 'From: ' }} {{ selectedYear()?.startDate | date:'yyyy-MM-dd' }}</span>
                <span><i class="pi pi-calendar-times text-cyan"></i> {{ langService.currentLang() === 'ar' ? 'إلى: ' : 'To: ' }} {{ selectedYear()?.endDate | date:'yyyy-MM-dd' }}</span>
                <span><i class="pi pi-list"></i> {{ selectedYear()?.periods?.length }} {{ langService.currentLang() === 'ar' ? 'فترات مالية' : 'periods' }}</span>
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
              <span>{{ langService.currentLang() === 'ar' ? 'إنشاء سنة مالية جديدة' : 'New Fiscal Year' }}</span>
            </button>
          </div>
        </div>

        <!-- Periods Table -->
        <div class="periods-panel">
          <div class="panel-header">
            <h4>{{ langService.currentLang() === 'ar' ? 'جدول الفترات وحالات الفتح والإقفال' : 'Accounting Periods & Lock Status' }}</h4>
            <div class="status-legend">
              <span class="legend-pill open"><i class="pi pi-check-circle"></i> {{ langService.currentLang() === 'ar' ? 'مفتوحة (متاح الترحيل)' : 'Open' }}</span>
              <span class="legend-pill locked"><i class="pi pi-lock"></i> {{ langService.currentLang() === 'ar' ? 'مقفلة مؤقتاً (مراجعة)' : 'Locked' }}</span>
              <span class="legend-pill closed"><i class="pi pi-times-circle"></i> {{ langService.currentLang() === 'ar' ? 'مغلقة نهائياً' : 'Closed' }}</span>
            </div>
          </div>

          <div class="table-responsive">
            <table class="periods-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'اسم الفترة المحاسبية' : 'Period Name' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'تاريخ البدء' : 'Start Date' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'تاريخ الانتهاء' : 'End Date' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'نوع الفترة' : 'Type' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'حالة الترحيل' : 'Status' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'التحكم وتغيير الحالة' : 'Actions' }}</th>
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
                      <i class="pi pi-star"></i> {{ langService.currentLang() === 'ar' ? 'فترة تسويات 13' : 'Period 13' }}
                    </span>
                    <span *ngIf="!p.isClosingPeriod" class="text-muted">
                      {{ langService.currentLang() === 'ar' ? 'فترة تشغيلية شهرية' : 'Monthly' }}
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
                        [title]="langService.currentLang() === 'ar' ? 'فتح الفترة' : 'Open'">
                        <i class="pi pi-lock-open"></i>
                      </button>
                      <button 
                        class="btn-status lock" 
                        [class.active]="p.status === 2" 
                        [disabled]="p.status === 2"
                        (click)="changePeriodStatus(p, 2)" 
                        [title]="langService.currentLang() === 'ar' ? 'قفل مؤقت' : 'Lock'">
                        <i class="pi pi-lock"></i>
                      </button>
                      <button 
                        class="btn-status close" 
                        [class.active]="p.status === 3" 
                        [disabled]="p.status === 3"
                        (click)="changePeriodStatus(p, 3)" 
                        [title]="langService.currentLang() === 'ar' ? 'إقفال نهائي' : 'Close'">
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
              <strong>{{ langService.currentLang() === 'ar' ? 'سياسة ربط مراكز التكلفة في القيود:' : 'Cost Center Entry Enforcement:' }}</strong>
              <span>
                {{ getCostCenterPolicyLabel() }}
              </span>
            </div>
          </div>
          <button class="btn-primary" (click)="openCreateCostCenterModal()">
            <i class="pi pi-plus"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'إضافة مركز تكلفة جديد' : 'New Cost Center' }}</span>
          </button>
        </div>

        <!-- Cost Centers Table -->
        <div class="cost-centers-panel">
          <table class="cc-table">
            <thead>
              <tr>
                <th>{{ langService.currentLang() === 'ar' ? 'كود المركز' : 'Code' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'اسم مركز التكلفة (عربي)' : 'Arabic Name' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'اسم مركز التكلفة (إنجليزي)' : 'English Name' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الوصف والغرض' : 'Description' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الحالة' : 'Status' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'إجراءات' : 'Actions' }}</th>
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
                    {{ langService.currentLang() === 'ar' ? 'نشط' : 'Active' }}
                  </span>
                </td>
                <td>
                  <button class="btn-del" (click)="deleteCostCenter(cc)" [title]="langService.currentLang() === 'ar' ? 'حذف المركز' : 'Delete'">
                    <i class="pi pi-trash"></i>
                  </button>
                </td>
              </tr>
              <tr *ngIf="!overview()?.costCenters?.length">
                <td colspan="6" class="text-center py-6 text-muted">
                  {{ langService.currentLang() === 'ar' ? 'لم يتم إضافة مراكز تكلفة بعد. انقر على إضافة مركز تكلفة جديد.' : 'No cost centers found.' }}
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
              <h4>{{ langService.currentLang() === 'ar' ? 'إلزامية مراكز التكلفة في القيود' : 'Cost Centers Policy' }}</h4>
            </div>
            <p class="box-desc">
              {{ langService.currentLang() === 'ar'
                ? 'تحديد هل يُشترط ربط كل سطر قيد مصروفات أو إيرادات بمركز تكلفة محدد.'
                : 'Define if cost centers are mandatory when posting income/expense journal lines.' }}
            </p>
            <div class="radio-options">
              <label class="radio-item">
                <input type="radio" name="ccPolicy" [value]="1" [(ngModel)]="policyModel.costCenterPolicy" />
                <span>{{ langService.currentLang() === 'ar' ? 'إلزامية في حسابات المصروفات والإيرادات (موصى به وفق معايير المحاسبة)' : 'Mandatory for Revenue & Expense accounts (Recommended)' }}</span>
              </label>
              <label class="radio-item">
                <input type="radio" name="ccPolicy" [value]="2" [(ngModel)]="policyModel.costCenterPolicy" />
                <span>{{ langService.currentLang() === 'ar' ? 'اختيارية في جميع الحسابات' : 'Optional for all accounts' }}</span>
              </label>
              <label class="radio-item">
                <input type="radio" name="ccPolicy" [value]="3" [(ngModel)]="policyModel.costCenterPolicy" />
                <span>{{ langService.currentLang() === 'ar' ? 'تعطيل مراكز التكلفة' : 'Disabled' }}</span>
              </label>
            </div>
          </div>

          <!-- Policy 2: Currency & Calendar -->
          <div class="policy-box">
            <div class="box-header">
              <i class="pi pi-globe text-cyan"></i>
              <h4>{{ langService.currentLang() === 'ar' ? 'العملة الأساسية والتقويم' : 'Currency & Calendar' }}</h4>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>{{ langService.currentLang() === 'ar' ? 'العملة الأساسية للنظام' : 'Base Currency' }}</label>
                <select class="form-select" [(ngModel)]="policyModel.defaultCurrency">
                  <option value="SAR">SAR - ريال سعودي</option>
                  <option value="USD">USD - دولار أمريكي</option>
                  <option value="EUR">EUR - يورو</option>
                  <option value="AED">AED - درهم إماراتي</option>
                </select>
              </div>

              <div class="form-field">
                <label>{{ langService.currentLang() === 'ar' ? 'التقويم المالي المعتمد' : 'Calendar System' }}</label>
                <select class="form-select" [(ngModel)]="policyModel.calendarType">
                  <option [value]="1">{{ langService.currentLang() === 'ar' ? 'التقويم الميلادي (Gregorian)' : 'Gregorian' }}</option>
                  <option [value]="2">{{ langService.currentLang() === 'ar' ? 'التقويم الهجري (Hijri)' : 'Hijri' }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Policy 3: Backdated Entries & Security -->
          <div class="policy-box">
            <div class="box-header">
              <i class="pi pi-shield text-danger"></i>
              <h4>{{ langService.currentLang() === 'ar' ? 'الأمان ومنع القيود بأثر رجعي' : 'Backdated Entries & Audit Security' }}</h4>
            </div>
            <p class="box-desc">
              {{ langService.currentLang() === 'ar'
                ? 'وفقاً لمعايير التدقيق ومصلحة الزكاة والضريبة، يُمنع إدخال قيود بأثر رجعي إلا بإذن صريح من المدير المالي.'
                : 'Prevent backdated entries according to auditing standards and tax authority compliance.' }}
            </p>
            <div class="switch-row">
              <label class="switch-container">
                <input type="checkbox" [(ngModel)]="policyModel.allowBackdatedEntries" />
                <span class="slider"></span>
              </label>
              <span>{{ langService.currentLang() === 'ar' ? 'السماح بإدخال قيود بتاريخ سابق لفترة محددة' : 'Allow backdated entries' }}</span>
            </div>

            <div *ngIf="policyModel.allowBackdatedEntries" class="form-field mt-3">
              <label>{{ langService.currentLang() === 'ar' ? 'الحد الأقصى للأيام المسموح بها بأثر رجعي' : 'Max Backdated Days' }}</label>
              <input type="number" class="form-input w-36" [(ngModel)]="policyModel.maxBackdatedDays" min="1" max="90" />
            </div>
          </div>

          <!-- Policy 4: Period 13 Adjustments -->
          <div class="policy-box">
            <div class="box-header">
              <i class="pi pi-calendar-plus text-emerald"></i>
              <h4>{{ langService.currentLang() === 'ar' ? 'فترة التسويات الختامية (الفترة 13)' : 'Closing Adjustments Period 13' }}</h4>
            </div>
            <p class="box-desc">
              {{ langService.currentLang() === 'ar'
                ? 'إضافة فترة محاسبية رقم 13 خاصة بتسويات نهاية العام والجرد وإقفال الأرباح والخسائر.'
                : 'Enable dedicated 13th adjustment period for year-end inventory and audit adjustments.' }}
            </p>
            <div class="switch-row">
              <label class="switch-container">
                <input type="checkbox" [(ngModel)]="policyModel.include13thClosingPeriod" />
                <span class="slider"></span>
              </label>
              <span>{{ langService.currentLang() === 'ar' ? 'تفعيل فترة التسويات الختامية 13' : 'Enable 13th Adjustment Period' }}</span>
            </div>
          </div>

        </div>

        <div class="save-bar">
          <button class="btn-save-policies" (click)="savePolicies()" [disabled]="savingPolicies()">
            <i class="pi pi-check" *ngIf="!savingPolicies()"></i>
            <i class="pi pi-spin pi-spinner" *ngIf="savingPolicies()"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'حفظ السياسات والإعدادات المالية' : 'Save Financial Policies' }}</span>
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
                <h3>{{ langService.currentLang() === 'ar' ? 'معالج إقفال نهاية السنة المالية وترحيل الأرصدة' : 'Year-End Closing & Opening Balances Roll-Forward' }}</h3>
                <p>{{ langService.currentLang() === 'ar' ? 'إقفال الحسابات الاسمية (الإيرادات والمصروفات) إلى حساب الأرباح المبقاة وتوليد السنة المالية الجديدة' : 'Close nominal accounts to Retained Earnings and roll forward opening balances' }}</p>
              </div>
            </div>

            <div class="closing-year-picker">
              <label>{{ langService.currentLang() === 'ar' ? 'السنة المالية:' : 'Fiscal Year:' }}</label>
              <select class="form-select font-mono" [ngModel]="selectedYear()?.id" (ngModelChange)="onYearChange($event); loadClosingPreview()">
                @for (y of overview()?.allFiscalYears; track y.id) {
                  <option [value]="y.id">{{ y.nameAr }} ({{ y.yearNumber }}) {{ y.isClosed ? '🔒 مغلقة' : '🟢 مفتوحة' }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Loading Preview Spinner -->
          <div *ngIf="loadingPreview()" class="loading-state py-8">
            <i class="pi pi-spin pi-spinner text-emerald text-3xl"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'جارٍ فحص القيود وتدقيق ميزان المراجعة للإقفال...' : 'Auditing balances for year-end closing...' }}</span>
          </div>

          <!-- Preview Content -->
          <div *ngIf="!loadingPreview() && closingPreview()" class="closing-body">
            
            <!-- Audit Checklist KPI Strip (4 Columns) -->
            <div class="audit-kpi-grid">
              
              <div class="audit-card" [class.card-clean]="closingPreview()?.draftJournalEntriesCount === 0" [class.card-alert]="closingPreview()!.draftJournalEntriesCount > 0">
                <div class="audit-icon">{{ closingPreview()?.draftJournalEntriesCount === 0 ? '✓' : '⚠' }}</div>
                <div class="audit-data">
                  <span class="audit-lbl">{{ langService.currentLang() === 'ar' ? 'قيود اليومية غير المرحلة (مسودات)' : 'Draft Journal Entries' }}</span>
                  <span class="audit-val font-mono">{{ closingPreview()?.draftJournalEntriesCount }}</span>
                  <span class="audit-desc">{{ closingPreview()?.draftJournalEntriesCount === 0 ? (langService.currentLang() === 'ar' ? 'جميع القيود مرحّلة وجاهزة' : 'All entries posted') : (langService.currentLang() === 'ar' ? 'يجب ترحيلها قبل الإقفال' : 'Must post before closing') }}</span>
                </div>
              </div>

              <div class="audit-card card-info">
                <div class="audit-icon">📅</div>
                <div class="audit-data">
                  <span class="audit-lbl">{{ langService.currentLang() === 'ar' ? 'الفترات الشهرية المفتوحة' : 'Open Fiscal Periods' }}</span>
                  <span class="audit-val font-mono">{{ closingPreview()?.openPeriodsCount }}</span>
                  <span class="audit-desc">{{ langService.currentLang() === 'ar' ? 'سيتم قفلها وإغلاقها تلقائياً' : 'Will be closed on year-end' }}</span>
                </div>
              </div>

              <div class="audit-card card-equity">
                <div class="audit-icon">🏛️</div>
                <div class="audit-data">
                  <span class="audit-lbl">{{ langService.currentLang() === 'ar' ? 'حساب الأرباح المبقاة المستهدف' : 'Target Retained Earnings' }}</span>
                  <span class="audit-val font-mono text-sm">{{ closingPreview()?.defaultRetainedEarningsAccountCode }}</span>
                  <span class="audit-desc">{{ closingPreview()?.defaultRetainedEarningsAccountNameAr }}</span>
                </div>
              </div>

              <div class="audit-card" [class.card-profit]="closingPreview()!.projectedNetIncome >= 0" [class.card-loss]="closingPreview()!.projectedNetIncome < 0">
                <div class="audit-icon">{{ closingPreview()!.projectedNetIncome >= 0 ? '📈' : '📉' }}</div>
                <div class="audit-data">
                  <span class="audit-lbl">{{ langService.currentLang() === 'ar' ? 'صافي دخل العام المقدر' : 'Projected Net Income' }}</span>
                  <span class="audit-val font-mono font-bold">{{ closingPreview()?.projectedNetIncome | number:'1.2-2' }} <small>ر.س</small></span>
                  <span class="audit-desc font-serif">{{ closingPreview()?.projectedNetIncomeTafqeetAr }}</span>
                </div>
              </div>

            </div>

            <!-- Audit Alerts (Blocking Errors & Warnings) -->
            <div *ngIf="closingPreview()?.blockingErrors?.length" class="alert-box alert-danger-box">
              <div class="alert-title">
                <i class="pi pi-times-circle"></i>
                <strong>{{ langService.currentLang() === 'ar' ? 'موانع الإقفال المالي النهائي (يجب معالجتها أولاً):' : 'Closing Blockers (Must resolve first):' }}</strong>
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
                <strong>{{ langService.currentLang() === 'ar' ? 'تنبيهات تدقيقية وملاحظات نظامية:' : 'Audit Warnings:' }}</strong>
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
                    <h4>{{ langService.currentLang() === 'ar' ? 'السنة المالية مقفلة نهائياً ومرحلة' : 'Fiscal Year is Fully Closed' }}</h4>
                    <p>{{ langService.currentLang() === 'ar' ? 'تم ترحيل قيد إقفال الأرباح والخسائر وحسابات المركز المالي إلى السنة الجديدة.' : 'Closing entry and opening balances generated.' }}</p>
                  </div>
                </div>
                <button class="btn-reopen" (click)="confirmReopenYear()">
                  <i class="pi pi-unlock"></i>
                  <span>{{ langService.currentLang() === 'ar' ? 'إعادة فتح السنة المالية للتدقيق' : 'Reopen Fiscal Year' }}</span>
                </button>
              </div>

              <div *ngIf="!selectedYear()?.isClosed" class="open-action-state">
                <div class="roll-forward-option">
                  <label class="checkbox-row">
                    <input type="checkbox" [(ngModel)]="generateNextYearOpening" />
                    <span><strong>{{ langService.currentLang() === 'ar' ? 'إنشاء السنة المالية التالية تلقائياً وترحيل الأرصدة الافتتاحية' : 'Create next fiscal year & roll forward opening balances' }}</strong></span>
                  </label>
                  <p class="text-xs text-muted">{{ langService.currentLang() === 'ar' ? 'سيقوم النظام بإنشاء قيد افتتاحي متوازن يضم أرصدة الأصول والالتزامات وحقوق الملكية للعام الجديد.' : 'Generates opening balanced entry for balance sheet accounts.' }}</p>
                </div>

                <div class="action-footer">
                  <button 
                    class="btn-execute-close" 
                    [disabled]="!closingPreview()?.canClose || executingClose()" 
                    (click)="confirmCloseYear()">
                    <i class="pi pi-check-circle" *ngIf="!executingClose()"></i>
                    <i class="pi pi-spin pi-spinner" *ngIf="executingClose()"></i>
                    <span>{{ executingClose() ? (langService.currentLang() === 'ar' ? 'جارٍ الإقفال وتوليد القيود...' : 'Executing closing...') : (langService.currentLang() === 'ar' ? 'تنفيذ الإقفال السنوي وترحيل القيود الختامية' : 'Execute Year-End Closing') }}</span>
                  </button>
                </div>
              </div>

            </div>

            <!-- Success Closing Result Details Banner -->
            <div *ngIf="closingResult()" class="closing-result-card">
              <div class="res-head">
                <i class="pi pi-check-circle text-emerald text-2xl"></i>
                <div>
                  <h4>{{ langService.currentLang() === 'ar' ? 'تم إقفال السنة المالية بنجاح تام' : 'Year-End Closed Successfully' }}</h4>
                  <p>{{ langService.currentLang() === 'ar' ? 'صدرت القيود المحاسبية الختامية وفق المعايير المهنية SOCPA / IFRS' : 'All nominal accounts zeroed out.' }}</p>
                </div>
              </div>
              <div class="res-details-grid">
                <div><strong>قيد إقفال الأرباح والخسائر:</strong> {{ closingResult()?.closingJournalEntryNumber }}</div>
                <div><strong>صافي دخل العام المقفل:</strong> {{ closingResult()?.netProfitOrLoss | number:'1.2-2' }} ر.س</div>
                <div><strong>قيد الأرصدة الافتتاحية للسنة الجديدة:</strong> {{ closingResult()?.openingJournalEntryNumber || '—' }}</div>
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
            <h3>{{ langService.currentLang() === 'ar' ? 'أسعار صرف العملات الأجنبية وإعادة التقييم الدوري (IAS 21)' : 'Foreign Exchange Rates & IAS 21 Revaluation' }}</h3>
            <span class="dates-range">{{ langService.currentLang() === 'ar' ? 'العملة الأساسية للنظام: الريال السعودي (SAR)' : 'Functional Currency: SAR' }}</span>
          </div>

          <div class="year-actions-strip">
            <button class="btn-primary" (click)="openCurrencyModal()">
              <i class="pi pi-plus"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'إضافة / تحديث سعر عملة' : 'Add / Update Rate' }}</span>
            </button>
            <button class="btn-primary" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);" (click)="runFxRevaluation()">
              <i class="pi pi-bolt"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'إعادة تقييم الأرصدة (IAS 21 Revalue)' : 'Run IAS 21 Revaluation' }}</span>
            </button>
          </div>
        </div>

        <!-- Currencies Table Card -->
        <div class="periods-card mt-3">
          <div class="card-header">
            <h4><i class="pi pi-dollar text-emerald me-2"></i>{{ langService.currentLang() === 'ar' ? 'جدول أسعار صرف العملات المعتمدة مقابل الريال السعودي' : 'Approved Currency Exchange Rates (SAR)' }}</h4>
            <span class="badge-total">{{ currencyRates().length }} {{ langService.currentLang() === 'ar' ? 'عملات مسجلة' : 'Currencies' }}</span>
          </div>

          <div *ngIf="loadingCurrencies()" class="loading-state">
            <i class="pi pi-spin pi-spinner text-emerald text-3xl"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'جارٍ تحميل أسعار الصرف...' : 'Loading exchange rates...' }}</span>
          </div>

          <div class="table-responsive" *ngIf="!loadingCurrencies()">
            <table class="erp-dense-table">
              <thead>
                <tr>
                  <th style="width: 100px;">{{ langService.currentLang() === 'ar' ? 'رمز العملة' : 'Code' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'اسم العملة (عربي)' : 'Name (Arabic)' }}</th>
                  <th>{{ langService.currentLang() === 'ar' ? 'اسم العملة (إنجليزي)' : 'Name (English)' }}</th>
                  <th style="text-align: left; width: 180px;">{{ langService.currentLang() === 'ar' ? 'سعر الصرف (SAR)' : 'Rate to SAR' }}</th>
                  <th style="width: 140px;">{{ langService.currentLang() === 'ar' ? 'تاريخ السريان' : 'Effective Date' }}</th>
                  <th style="text-align: center; width: 100px;">{{ langService.currentLang() === 'ar' ? 'الحالة' : 'Status' }}</th>
                  <th style="text-align: center; width: 100px;">{{ langService.currentLang() === 'ar' ? 'إجراءات' : 'Actions' }}</th>
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
                    <span class="status-pill status-posted">{{ langService.currentLang() === 'ar' ? 'معتمد ونشط' : 'Active' }}</span>
                  </td>
                  <td style="text-align: center;">
                    <button class="btn-icon" (click)="openCurrencyModal(rate)" [title]="langService.currentLang() === 'ar' ? 'تعديل السعر' : 'Edit Rate'">
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
              <h3>{{ langService.currentLang() === 'ar' ? 'تسجيل / تحديث سعر صرف عملة' : 'Update Exchange Rate' }}</h3>
            </div>
            <button class="btn-close" (click)="showCurrencyModal.set(false)"><i class="pi pi-times"></i></button>
          </header>

          <section class="modal-body">
            <div class="form-grid">
              <div class="form-field">
                <label>{{ langService.currentLang() === 'ar' ? 'رمز العملة (ISO Code) *' : 'Currency Code *' }}</label>
                <input type="text" [(ngModel)]="currencyForm.currencyCode" placeholder="USD, EUR, GBP..." />
              </div>

              <div class="form-field">
                <label>{{ langService.currentLang() === 'ar' ? 'سعر الصرف مقابل الريال (SAR) *' : 'Exchange Rate to SAR *' }}</label>
                <input type="number" step="0.0001" [(ngModel)]="currencyForm.exchangeRateToSar" placeholder="3.7500" />
              </div>

              <div class="form-field full">
                <label>{{ langService.currentLang() === 'ar' ? 'اسم العملة بالعربية *' : 'Currency Name (Arabic) *' }}</label>
                <input type="text" [(ngModel)]="currencyForm.currencyNameAr" placeholder="دولار أمريكي، يورو..." />
              </div>

              <div class="form-field full">
                <label>{{ langService.currentLang() === 'ar' ? 'اسم العملة بالإنجليزية' : 'Currency Name (English)' }}</label>
                <input type="text" [(ngModel)]="currencyForm.currencyNameEn" placeholder="US Dollar, Euro..." />
              </div>

              <div class="form-field full">
                <label>{{ langService.currentLang() === 'ar' ? 'تاريخ السريان *' : 'Effective Date *' }}</label>
                <input type="date" [(ngModel)]="currencyForm.effectiveDate" />
              </div>
            </div>
          </section>

          <footer class="modal-footer">
            <button class="btn-secondary" (click)="showCurrencyModal.set(false)">{{ langService.currentLang() === 'ar' ? 'إلغاء' : 'Cancel' }}</button>
            <button class="btn-primary" (click)="saveCurrencyRate()">
              <i class="pi pi-check"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'حفظ سعر الصرف' : 'Save Rate' }}</span>
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
  `]
})
export class FinancialSettingsComponent implements OnInit {
  private settingsService = inject(FinancialSettingsService);
  private http = inject(HttpClient);
  private activeRoute = inject(ActivatedRoute);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);

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
        Swal.fire('تم الحفظ', 'تم تحديث سعر صرف العملة بنجاح', 'success');
        this.showCurrencyModal.set(false);
        this.loadCurrencies();
      },
      error: (err) => {
        Swal.fire('خطأ في الحفظ', err.error?.description || err.message, 'error');
      }
    });
  }

  runFxRevaluation() {
    Swal.fire({
      title: 'إعادة تقييم العملات وفق معيار IAS 21',
      text: 'سيتم احتساب فروق أسعار الصرف غير المحققة لجميع الحسابات النقدية بالعملات الأجنبية وتوليد قيد يومية آلي بأرباح أو خسائر فروق العملة. هل تريد المتابعة؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، تشغيل إعادة التقييم',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#059669'
    }).then(res => {
      if (res.isConfirmed) {
        const companyId = this.companyContext.activeCompany()?.id;
        this.http.post<any>('/api/currencies/revalue', { companyId, revaluationDate: new Date().toISOString() }).subscribe({
          next: (r) => {
            Swal.fire({
              title: 'اكتملت إعادة التقييم بنجاح! 💹',
              html: `<strong>${r.message}</strong><br><br>
                     الأرباح المحققة: <span class="text-emerald font-bold">${r.totalGain} SAR</span><br>
                     الخسائر المحققة: <span class="text-rose font-bold">${r.totalLoss} SAR</span><br>
                     صافي الأثر على قائمة الدخل: <strong>${r.netImpact} SAR</strong>`,
              icon: 'success'
            });
            this.loadCurrencies();
          },
          error: (err) => {
            Swal.fire('فشلت العملية', err.error?.description || err.message, 'error');
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
    const isAr = this.langService.currentLang() === 'ar';
    switch (status) {
      case 1: return isAr ? 'مفتوحة (متاح الترحيل)' : 'Open';
      case 2: return isAr ? 'مقفلة مؤقتاً (مراجعة)' : 'Locked';
      case 3: return isAr ? 'مغلقة نهائياً' : 'Closed';
      default: return '';
    }
  }

  getCostCenterPolicyLabel(): string {
    const isAr = this.langService.currentLang() === 'ar';
    const policy = this.policyModel.costCenterPolicy;
    if (policy === 1) {
      return isAr ? 'إلزامية في حسابات المصروفات والإيرادات (موصى به)' : 'Mandatory for P&L';
    } else if (policy === 2) {
      return isAr ? 'اختيارية في جميع الحسابات' : 'Optional';
    } else {
      return isAr ? 'معطلة بالكامل' : 'Disabled';
    }
  }

  changePeriodStatus(period: FiscalPeriod, newStatus: number) {
    const isAr = this.langService.currentLang() === 'ar';
    const statusName = isAr 
      ? (newStatus === 1 ? 'فتح الفترة' : newStatus === 2 ? 'قفل الفترة مؤقتاً' : 'إقفال الفترة نهائياً')
      : (newStatus === 1 ? 'Open' : newStatus === 2 ? 'Lock' : 'Close');

    Swal.fire({
      title: isAr ? `تأكيد ${statusName}` : `Confirm ${statusName}`,
      text: isAr 
        ? `هل أنت متأكد من تغيير حالة (${period.periodNameAr}) إلى ${statusName}؟`
        : `Are you sure you want to change status of (${period.periodNameEn}) to ${statusName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، تغيير الحالة' : 'Yes, Change',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
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
              title: isAr ? 'تم تحديث حالة الفترة بنجاح' : 'Period status updated',
              showConfirmButton: false,
              timer: 2000
            });
          },
          error: () => {
            Swal.fire(isAr ? 'خطأ' : 'Error', isAr ? 'تعذر تغيير حالة الفترة' : 'Failed to update period status', 'error');
          }
        });
      }
    });
  }

  openCreateYearModal() {
    const isAr = this.langService.currentLang() === 'ar';
    const nextYear = (this.selectedYear()?.yearNumber || new Date().getFullYear()) + 1;

    Swal.fire({
      title: isAr ? 'إنشاء سنة مالية جديدة' : 'Create New Fiscal Year',
      html: `
        <div style="text-align: start; font-family: inherit; font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.8rem;">
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${isAr ? 'رقم السنة:' : 'Year Number:'}</label>
            <input id="swal-year" type="number" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" value="${nextYear}" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${isAr ? 'اسم السنة (عربي):' : 'Year Name (Ar):'}</label>
            <input id="swal-nameAr" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" value="السنة المالية ${nextYear}" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${isAr ? 'تاريخ البداية:' : 'Start Date:'}</label>
            <input id="swal-start" type="date" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" value="${nextYear}-01-01" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${isAr ? 'تاريخ الانتهاء:' : 'End Date:'}</label>
            <input id="swal-end" type="date" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" value="${nextYear}-12-31" />
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem;">
            <input id="swal-13th" type="checkbox" checked style="width: 18px; height: 18px;" />
            <label for="swal-13th">${isAr ? 'تضمين فترة التسويات الختامية 13' : 'Include 13th Adjustment Period'}</label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isAr ? 'إنشاء وتوليد الفترات' : 'Create & Generate',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#10B981',
      preConfirm: () => {
        const year = +(document.getElementById('swal-year') as HTMLInputElement).value;
        const nameAr = (document.getElementById('swal-nameAr') as HTMLInputElement).value;
        const start = (document.getElementById('swal-start') as HTMLInputElement).value;
        const end = (document.getElementById('swal-end') as HTMLInputElement).value;
        const include13 = (document.getElementById('swal-13th') as HTMLInputElement).checked;

        if (!year || !start || !end) {
          Swal.showValidationMessage(isAr ? 'يرجى إكمال جميع الحقول المطلوبة' : 'Please fill all required fields');
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
          nameEn: `Fiscal Year ${res.value.year}`,
          startDate: res.value.start,
          endDate: res.value.end,
          includeClosingPeriod: res.value.include13
        }).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: isAr ? 'تم إنشاء السنة المالية بنجاح' : 'Fiscal Year Created',
              text: isAr ? 'تم توليد فترات الأشهر تلقائياً وجاهزة للاستخدام' : 'Periods generated successfully'
            });
            this.loadData();
          },
          error: (err) => {
            Swal.fire(isAr ? 'خطأ' : 'Error', err?.error?.description || (isAr ? 'تعذر إنشاء السنة المالية' : 'Failed to create year'), 'error');
          }
        });
      }
    });
  }

  openCreateCostCenterModal() {
    const isAr = this.langService.currentLang() === 'ar';

    Swal.fire({
      title: isAr ? 'إضافة مركز تكلفة جديد' : 'Add Cost Center',
      html: `
        <div style="text-align: start; font-family: inherit; font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.8rem;">
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${isAr ? 'كود المركز:' : 'Code:'}</label>
            <input id="swal-cc-code" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" placeholder="مثال: 104" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${isAr ? 'الاسم بالعربية:' : 'Arabic Name:'}</label>
            <input id="swal-cc-nameAr" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" placeholder="مثال: فرع جدة الإقليمي" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${isAr ? 'الاسم بالإنجليزية:' : 'English Name:'}</label>
            <input id="swal-cc-nameEn" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" placeholder="e.g. Jeddah Branch" />
          </div>
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 0.3rem;">${isAr ? 'الوصف والغرض:' : 'Description:'}</label>
            <input id="swal-cc-desc" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 38px;" placeholder="وصف اختياري" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isAr ? 'إضافة المركز' : 'Add Center',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#10B981',
      preConfirm: () => {
        const code = (document.getElementById('swal-cc-code') as HTMLInputElement).value;
        const nameAr = (document.getElementById('swal-cc-nameAr') as HTMLInputElement).value;
        const nameEn = (document.getElementById('swal-cc-nameEn') as HTMLInputElement).value;
        const desc = (document.getElementById('swal-cc-desc') as HTMLInputElement).value;

        if (!code || !nameAr) {
          Swal.showValidationMessage(isAr ? 'يرجى إدخال الكود واسم المركز بالعربية' : 'Please provide code and name');
          return false;
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
              title: isAr ? 'تمت إضافة مركز التكلفة' : 'Cost center added',
              showConfirmButton: false,
              timer: 2000
            });
            this.loadData();
          },
          error: (err) => {
            Swal.fire(isAr ? 'خطأ' : 'Error', err?.error?.description || (isAr ? 'تعذر إضافة المركز' : 'Failed to add cost center'), 'error');
          }
        });
      }
    });
  }

  deleteCostCenter(cc: CostCenter) {
    const isAr = this.langService.currentLang() === 'ar';
    Swal.fire({
      title: isAr ? 'تأكيد الحذف' : 'Confirm Delete',
      text: isAr ? `هل أنت متأكد من حذف مركز التكلفة (${cc.nameAr})؟` : `Delete cost center (${cc.nameEn})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، حذف' : 'Yes, Delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#EF4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.settingsService.deleteCostCenter(cc.id).subscribe({
          next: () => {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: isAr ? 'تم حذف مركز التكلفة' : 'Cost center deleted',
              showConfirmButton: false,
              timer: 2000
            });
            this.loadData();
          },
          error: () => {
            Swal.fire(isAr ? 'خطأ' : 'Error', isAr ? 'تعذر حذف مركز التكلفة' : 'Failed to delete cost center', 'error');
          }
        });
      }
    });
  }

  savePolicies() {
    this.savingPolicies.set(true);
    const companyId = this.companyContext.activeCompany()?.id;
    const isAr = this.langService.currentLang() === 'ar';

    this.settingsService.updateSettings({
      ...this.policyModel,
      companyId
    }).subscribe({
      next: (updated) => {
        this.policyModel = { ...updated };
        this.savingPolicies.set(false);
        Swal.fire({
          icon: 'success',
          title: isAr ? 'تم حفظ السياسات المالية بنجاح' : 'Policies Saved Successfully',
          text: isAr ? 'تم تحديث سياسة مراكز التكلفة والعملة وإجراءات الرقابة' : 'Financial controls updated'
        });
      },
      error: () => {
        this.savingPolicies.set(false);
        Swal.fire(isAr ? 'خطأ' : 'Error', isAr ? 'تعذر حفظ السياسات المالية' : 'Failed to save policies', 'error');
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
        const isAr = this.langService.currentLang() === 'ar';
        Swal.fire(isAr ? 'تنبيه' : 'Alert', err?.error?.description || (isAr ? 'تعذر جلب بيانات التدقيق للإقفال' : 'Failed to fetch audit data'), 'warning');
      }
    });
  }

  confirmCloseYear() {
    const preview = this.closingPreview();
    if (!preview || !preview.canClose) return;

    const isAr = this.langService.currentLang() === 'ar';

    Swal.fire({
      title: isAr ? `تأكيد إقفال السنة المالية ${preview.yearNumber}` : `Close Fiscal Year ${preview.yearNumber}?`,
      html: `
        <div style="text-align: start; font-size: 0.88rem; line-height: 1.6;">
          <p>أنت على وشك تنفيذ الإقفال المحاسبي النهائي للسنة المالية <strong>${preview.yearNumber}</strong>.</p>
          <ul style="padding-inline-start: 1.2rem; margin: 0.5rem 0;">
            <li>تصفير وإقفال كافة حسابات الإيرادات والمصروفات.</li>
            <li>ترحيل صافي الدخل (<strong>${preview.projectedNetIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س</strong>) إلى حساب <strong>${preview.defaultRetainedEarningsAccountNameAr}</strong>.</li>
            <li>توليد قيد إقفال ختامي معتمد وتوليد السنة المالية التالية وترحيل الأرصدة.</li>
          </ul>
          <p style="color: #B91C1C; font-weight: 700; margin-top: 0.5rem;">لا يمكن التراجع عن هذا الإجراء إلا بموافقة صريحة من المدير المالي.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، نفذ الإقفال السنوي الآن' : 'Yes, Execute Closing',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
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
              title: isAr ? 'تم إقفال السنة المالية بنجاح' : 'Year Closed Successfully',
              text: isAr ? `صدر قيد الإقفال رقم ${closingRes.closingJournalEntryNumber}` : 'Closing entry created'
            });
            this.loadData();
            this.loadClosingPreview();
          },
          error: (err) => {
            this.executingClose.set(false);
            Swal.fire(isAr ? 'خطأ في الإقفال' : 'Closing Error', err?.error?.description || (isAr ? 'فشل تنفيذ الإقفال' : 'Failed to execute closing'), 'error');
          }
        });
      }
    });
  }

  confirmReopenYear() {
    const yearId = this.selectedYear()?.id;
    if (!yearId) return;

    const isAr = this.langService.currentLang() === 'ar';

    Swal.fire({
      title: isAr ? 'إعادة فتح السنة المالية للتدقيق' : 'Reopen Fiscal Year',
      input: 'textarea',
      inputLabel: isAr ? 'يرجى كتابة سبب إعادة فتح السنة المالية:' : 'Reason for reopening year:',
      inputPlaceholder: isAr ? 'مثال: إجراء تسويات تدقيقية إضافية بطلب من المحاسب القانوني...' : 'Audit adjustments...',
      showCancelButton: true,
      confirmButtonText: isAr ? 'تأكيد إعادة الفتح' : 'Confirm Reopen',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#F59E0B',
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return isAr ? 'يجب إدخال سبب إعادة الفتح للرقابة والتدقيق' : 'Reason is required';
        }
        return null;
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        this.settingsService.reopenFiscalYear(yearId, res.value.trim()).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: isAr ? 'تمت إعادة فتح السنة المالية بنجاح' : 'Fiscal Year Reopened',
              text: isAr ? 'السنة المالية الآن مفتوحة لإجراء التسويات المطلوبة' : 'Year is now open for adjustments'
            });
            this.loadData();
            this.loadClosingPreview();
          },
          error: (err) => {
            Swal.fire(isAr ? 'خطأ' : 'Error', err?.error?.description || (isAr ? 'فشل إعادة فتح السنة' : 'Failed to reopen year'), 'error');
          }
        });
      }
    });
  }
}

