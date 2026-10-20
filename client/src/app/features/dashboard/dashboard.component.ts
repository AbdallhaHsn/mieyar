import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService } from '../../core/services/company-context.service';

interface MetricCard {
  titleAr: string;
  titleEn: string;
  amount: string;
  trend: string;
  isPositive: boolean;
  accent: 'green' | 'cyan';
}

interface JournalEntryPreview {
  voucherNo: string;
  date: string;
  descriptionAr: string;
  descriptionEn: string;
  amount: string;
  branchAr: string;
  branchEn: string;
  status: 'Posted' | 'Audited';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-wrap">
      <!-- Minimalist Header -->
      <div class="dash-top">
        <div>
          <h1 class="page-title">
            {{ langService.currentLang() === 'ar' ? 'المؤشرات المالية ولوحة القيادة' : 'Financial Overview' }}
          </h1>
          <span class="page-subtitle">
            {{ langService.currentLang() === 'ar' ? 'السنة المالية 2026 • الفترة النشطة' : 'Fiscal Year 2026 • Active Period' }}
          </span>
        </div>

        <div class="quick-nav-actions">
          <button class="btn-action green" (click)="router.navigate(['/accounting/journal-entries'])">
            <i class="pi pi-plus"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'قيد جديد' : 'New Entry' }}</span>
          </button>
          <button class="btn-action cyan" (click)="router.navigate(['/invoicing/tax-invoices'])">
            <i class="pi pi-receipt"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'فاتورة ضريبية' : 'Tax Invoice' }}</span>
          </button>
        </div>
      </div>

      <!-- 4 High-Contrast KPI Cards (Pure White & Cyber Green/Cyan) -->
      <div class="kpi-row">
        <div class="kpi-card" *ngFor="let kpi of metricCards" [ngClass]="kpi.accent">
          <div class="kpi-head">
            <span class="kpi-title">
              {{ langService.currentLang() === 'ar' ? kpi.titleAr : kpi.titleEn }}
            </span>
            <span class="kpi-badge" [class.green]="kpi.accent === 'green'" [class.cyan]="kpi.accent === 'cyan'">
              {{ kpi.trend }}
            </span>
          </div>
          <div class="kpi-value font-mono">{{ kpi.amount }}</div>
        </div>
      </div>

      <!-- Two-Column Operations & ZATCA Strip -->
      <div class="grid-two">
        <!-- Quick Financial Launchpad -->
        <div class="panel-card">
          <div class="panel-header">
            <h3>{{ langService.currentLang() === 'ar' ? 'الوصول السريع' : 'Quick Actions' }}</h3>
          </div>
          <div class="launch-grid">
            <button class="launch-card" (click)="router.navigate(['/accounting/chart-of-accounts'])">
              <div class="launch-icon-frame green">
                <i class="pi pi-sitemap"></i>
              </div>
              <div class="launch-info">
                <strong>{{ langService.currentLang() === 'ar' ? 'دليل الحسابات' : 'Chart of Accounts' }}</strong>
                <small>{{ langService.currentLang() === 'ar' ? 'شجرة الحسابات العامة' : 'General Ledger Tree' }}</small>
              </div>
            </button>

            <button class="launch-card" (click)="router.navigate(['/accounting/journal-entries'])">
              <div class="launch-icon-frame cyan">
                <i class="pi pi-book"></i>
              </div>
              <div class="launch-info">
                <strong>{{ langService.currentLang() === 'ar' ? 'دفتر اليومية' : 'Journal Entries' }}</strong>
                <small>{{ langService.currentLang() === 'ar' ? 'القيود المحاسبية المزدوجة' : 'Double-Entry Vouchers' }}</small>
              </div>
            </button>

            <button class="launch-card" (click)="router.navigate(['/accounting/trial-balance'])">
              <div class="launch-icon-frame green">
                <i class="pi pi-chart-bar"></i>
              </div>
              <div class="launch-info">
                <strong>{{ langService.currentLang() === 'ar' ? 'ميزان المراجعة' : 'Trial Balance' }}</strong>
                <small>{{ langService.currentLang() === 'ar' ? 'أرصدة ومطابقة الحسابات' : 'Account Balances' }}</small>
              </div>
            </button>

            <button class="launch-card" *ngIf="authService.isSuperAdmin()" (click)="router.navigate(['/companies'])">
              <div class="launch-icon-frame cyan">
                <i class="pi pi-building"></i>
              </div>
              <div class="launch-info">
                <strong>{{ langService.currentLang() === 'ar' ? 'الشركات والمستأجرين' : 'Tenants & Companies' }}</strong>
                <small>{{ langService.currentLang() === 'ar' ? 'إدارة المنشآت والاشتراكات' : 'Manage Tenant Accounts' }}</small>
              </div>
            </button>
          </div>
        </div>

        <!-- Sleek ZATCA Phase 2 Status -->
        <div class="panel-card">
          <div class="panel-header">
            <div class="header-zatca-tag">
              <span class="live-dot"></span>
              <h3>{{ langService.currentLang() === 'ar' ? 'منظومة ZATCA فاز 2 (الفاتورة الإلكترونية)' : 'ZATCA Phase 2 E-Invoicing' }}</h3>
            </div>
            <span class="state-pill">{{ langService.currentLang() === 'ar' ? 'متصل ومطابق' : 'Live & Cleared' }}</span>
          </div>

          <div class="zatca-kpis">
            <div class="z-item">
              <span class="z-num text-cyber-green font-mono">1,428</span>
              <span class="z-label">{{ langService.currentLang() === 'ar' ? 'فواتير معتمدة' : 'Cleared Invoices' }}</span>
            </div>
            <div class="z-item">
              <span class="z-num text-cyber-cyan font-mono" dir="ltr">8 ms</span>
              <span class="z-label">{{ langService.currentLang() === 'ar' ? 'زمن التشفير ECDSA' : 'Signing Latency' }}</span>
            </div>
            <div class="z-item">
              <span class="z-num text-dark font-mono">100%</span>
              <span class="z-label">{{ langService.currentLang() === 'ar' ? 'نسبة الامتثال' : 'Compliance Rate' }}</span>
            </div>
          </div>

          <div class="security-chip">
            <i class="pi pi-check-circle text-cyber-green"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'التوقيع الرقمي والتشفير فوري مع منصة "فاتورة" بهيئة الزكاة' : 'Real-time ECDSA signatures & cryptographic stamps with ZATCA' }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Entries Table -->
      <div class="panel-card">
        <div class="panel-header">
          <h3>{{ langService.currentLang() === 'ar' ? 'أحدث قيود اليومية العامة' : 'Recent Journal Entries' }}</h3>
          <button class="btn-link" (click)="router.navigate(['/accounting/journal-entries'])">
            <span>{{ langService.currentLang() === 'ar' ? 'عرض الكل' : 'View All' }}</span>
            <i class="pi pi-arrow-left"></i>
          </button>
        </div>

        <div class="table-wrap">
          <table class="clean-table">
            <thead>
              <tr>
                <th>{{ langService.currentLang() === 'ar' ? 'رقم القيد' : 'Voucher No.' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'التاريخ' : 'Date' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'البيان' : 'Description' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الفرع' : 'Branch' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'المبلغ (ر.س)' : 'Amount (SAR)' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الحالة' : 'Status' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of recentEntries">
                <td class="font-mono text-cyber-cyan font-bold">{{ item.voucherNo }}</td>
                <td class="font-mono">{{ item.date }}</td>
                <td class="text-dark font-medium">{{ langService.currentLang() === 'ar' ? item.descriptionAr : item.descriptionEn }}</td>
                <td><span class="branch-pill">{{ langService.currentLang() === 'ar' ? item.branchAr : item.branchEn }}</span></td>
                <td class="font-mono text-dark font-bold">{{ item.amount }}</td>
                <td>
                  <span class="badge-status" [class.posted]="item.status === 'Posted'" [class.audited]="item.status === 'Audited'">
                    <i class="pi pi-check"></i>
                    <span>
                      {{ item.status === 'Posted' 
                        ? (langService.currentLang() === 'ar' ? 'مرحّل' : 'Posted') 
                        : (langService.currentLang() === 'ar' ? 'مدقق' : 'Audited') }}
                    </span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrap {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header */
    .dash-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .page-title {
      font-size: 1.55rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 0.8rem;
      color: #64748B;
    }

    .quick-nav-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-action {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 1.15rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;

      &.green {
        background: #10B981;
        color: #FFFFFF;
        border: none;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);

        &:hover {
          background: #059669;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
        }
      }

      &.cyan {
        background: #FFFFFF;
        color: #0284C7;
        border: 1.5px solid #0284C7;

        &:hover {
          background: #F0F9FF;
        }
      }
    }

    /* 4 High-Contrast KPI Cards */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.15rem;
    }

    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 1.25rem 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.06);
      }

      &.green {
        border-top: 3px solid #10B981;
      }

      &.cyan {
        border-top: 3px solid #0284C7;
      }
    }

    .kpi-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .kpi-title {
      font-size: 0.825rem;
      font-weight: 600;
      color: #64748B;
    }

    .kpi-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;

      &.green {
        background: #ECFDF5;
        color: #059669;
      }
      &.cyan {
        background: #F0F9FF;
        color: #0284C7;
      }
    }

    .kpi-value {
      font-size: 1.65rem;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.02em;
    }

    /* Grid Two */
    .grid-two {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .panel-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 1.35rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      h3 {
        font-size: 1.05rem;
        font-weight: 700;
        color: #0F172A;
        margin: 0;
      }
    }

    .header-zatca-tag {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }

    .state-pill {
      font-size: 0.75rem;
      font-weight: 700;
      color: #059669;
      background: #ECFDF5;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
    }

    /* Launch Grid */
    .launch-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .launch-card {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 0.85rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      text-align: start;
      transition: all 0.15s ease;

      &:hover {
        background: #FFFFFF;
        border-color: #10B981;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);
        transform: translateY(-1px);
      }
    }

    .launch-icon-frame {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.05rem;
      flex-shrink: 0;

      &.green {
        background: #ECFDF5;
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }

      &.cyan {
        background: #F0F9FF;
        color: #0284C7;
        border: 1px solid rgba(2, 132, 199, 0.2);
      }
    }

    .launch-info {
      display: flex;
      flex-direction: column;

      strong {
        font-size: 0.85rem;
        color: #0F172A;
      }
      small {
        font-size: 0.72rem;
        color: #64748B;
      }
    }

    /* ZATCA KPIs */
    .zatca-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      background: #F8FAFC;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
    }

    .z-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .z-num {
      font-size: 1.45rem;
      font-weight: 800;
    }

    .z-label {
      font-size: 0.75rem;
      color: #64748B;
    }

    .security-chip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #475569;
      background: #ECFDF5;
      padding: 0.5rem 0.85rem;
      border-radius: 6px;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    /* Table */
    .btn-link {
      background: transparent;
      border: none;
      color: #0284C7;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;

      &:hover {
        text-decoration: underline;
      }
    }

    .table-wrap {
      overflow-x: auto;
    }

    .clean-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        padding: 0.75rem 1rem;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748B;
        background: #F8FAFC;
        border-bottom: 1px solid #E2E8F0;
      }

      td {
        padding: 0.85rem 1rem;
        font-size: 0.825rem;
        color: #334155;
        border-bottom: 1px solid #F1F5F9;
      }

      tr:hover td {
        background: #F8FAFC;
      }
    }

    .branch-pill {
      background: #F1F5F9;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #475569;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;

      &.posted {
        background: #ECFDF5;
        color: #059669;
      }
      &.audited {
        background: #F0F9FF;
        color: #0284C7;
      }
    }

    .font-bold { font-weight: 700; }
    .font-medium { font-weight: 500; }
  `]
})
export class DashboardComponent {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  companyContext = inject(CompanyContextService);
  router = inject(Router);

  metricCards: MetricCard[] = [
    {
      titleAr: 'إجمالي الإيرادات المكتسبة',
      titleEn: 'Total Revenue',
      amount: 'SAR 2,845,900.00',
      trend: '+16.2%',
      isPositive: true,
      accent: 'green'
    },
    {
      titleAr: 'المصروفات التشغيلية',
      titleEn: 'Total Expenses',
      amount: 'SAR 1,412,300.00',
      trend: '-2.8%',
      isPositive: true,
      accent: 'cyan'
    },
    {
      titleAr: 'صافي الأرباح التشغيلية',
      titleEn: 'Operating Profit',
      amount: 'SAR 1,433,600.00',
      trend: '+24.5%',
      isPositive: true,
      accent: 'green'
    },
    {
      titleAr: 'ضريبة القيمة المضافة (15%)',
      titleEn: 'VAT Payable (15%)',
      amount: 'SAR 215,040.00',
      trend: 'مطابق ZATCA',
      isPositive: true,
      accent: 'cyan'
    }
  ];

  recentEntries: JournalEntryPreview[] = [
    {
      voucherNo: 'JV-2026-00412',
      date: '2026-10-20',
      descriptionAr: 'مبيعات خدمات سحابية - شركة النهضة',
      descriptionEn: 'Cloud Consulting Revenue - Al-Nahda',
      amount: '115,000.00',
      branchAr: 'الفرع الرئيسي',
      branchEn: 'Main Branch',
      status: 'Posted'
    },
    {
      voucherNo: 'JV-2026-00411',
      date: '2026-10-19',
      descriptionAr: 'سداد إيجار مستودعات ودعم فني',
      descriptionEn: 'Warehouse & Technical Support Rent',
      amount: '45,000.00',
      branchAr: 'فرع جدة',
      branchEn: 'Jeddah Branch',
      status: 'Posted'
    },
    {
      voucherNo: 'JV-2026-00410',
      date: '2026-10-18',
      descriptionAr: 'تسوية ضريبة القيمة المضافة للفترة الحالية',
      descriptionEn: 'VAT Periodic Settlement Voucher',
      amount: '28,400.00',
      branchAr: 'الفرع الرئيسي',
      branchEn: 'Main Branch',
      status: 'Audited'
    },
    {
      voucherNo: 'JV-2026-00409',
      date: '2026-10-17',
      descriptionAr: 'تحصيل مستحقات فواتير ضريبية عبر البنك الأهلي',
      descriptionEn: 'SNB Customer Receivable Inward Remittance',
      amount: '250,000.00',
      branchAr: 'الفرع الرئيسي',
      branchEn: 'Main Branch',
      status: 'Posted'
    }
  ];
}
