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

      <!-- 4 High-Contrast KPI Cards (Cyber Green & Cyan) -->
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
              <i class="pi pi-sitemap text-cyber-green"></i>
              <div class="launch-info">
                <strong>{{ langService.currentLang() === 'ar' ? 'دليل الحسابات' : 'Chart of Accounts' }}</strong>
                <small>{{ langService.currentLang() === 'ar' ? 'شجرة الحسابات العامة' : 'General Ledger Tree' }}</small>
              </div>
            </button>

            <button class="launch-card" (click)="router.navigate(['/accounting/journal-entries'])">
              <i class="pi pi-book text-cyber-cyan"></i>
              <div class="launch-info">
                <strong>{{ langService.currentLang() === 'ar' ? 'دفتر اليومية' : 'Journal Entries' }}</strong>
                <small>{{ langService.currentLang() === 'ar' ? 'القيود المحاسبية المزدوجة' : 'Double-Entry Vouchers' }}</small>
              </div>
            </button>

            <button class="launch-card" (click)="router.navigate(['/accounting/trial-balance'])">
              <i class="pi pi-chart-bar text-cyber-green"></i>
              <div class="launch-info">
                <strong>{{ langService.currentLang() === 'ar' ? 'ميزان المراجعة' : 'Trial Balance' }}</strong>
                <small>{{ langService.currentLang() === 'ar' ? 'أرصدة ومطابقة الحسابات' : 'Account Balances' }}</small>
              </div>
            </button>

            <button class="launch-card" *ngIf="authService.isSuperAdmin()" (click)="router.navigate(['/companies'])">
              <i class="pi pi-building text-cyber-cyan"></i>
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
              <span class="z-num text-cyber-cyan font-mono">8 ms</span>
              <span class="z-label">{{ langService.currentLang() === 'ar' ? 'زمن التشفير ECDSA' : 'Signing Latency' }}</span>
            </div>
            <div class="z-item">
              <span class="z-num text-white font-mono">100%</span>
              <span class="z-label">{{ langService.currentLang() === 'ar' ? 'نسبة الامتثال' : 'Compliance Rate' }}</span>
            </div>
          </div>

          <div class="security-chip">
            <i class="pi pi-shield text-cyber-green"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'التوقيع الرقمي والتشفير فوري مع منصة "فاتورة" بهيئة الزكاة' : 'Real-time ECDSA signatures & cryptographic stamps with ZATCA' }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Entries Table -->
      <div class="panel-card">
        <div class="panel-header">
          <h3>{{ langService.currentLang() === 'ar' ? 'أحدث قيود اليومية العامة' : 'Recent Journal Entries' }}</h3>
          <button class="btn-link" (click)="router.navigate(['/accounting/journal-entries'])">
            {{ langService.currentLang() === 'ar' ? 'عرض الكل' : 'View All' }}
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
                <td class="font-mono text-cyber-cyan">{{ item.voucherNo }}</td>
                <td>{{ item.date }}</td>
                <td class="text-white">{{ langService.currentLang() === 'ar' ? item.descriptionAr : item.descriptionEn }}</td>
                <td><span class="branch-pill">{{ langService.currentLang() === 'ar' ? item.branchAr : item.branchEn }}</span></td>
                <td class="font-mono text-white font-bold">{{ item.amount }}</td>
                <td>
                  <span class="badge-status" [class.posted]="item.status === 'Posted'" [class.audited]="item.status === 'Audited'">
                    {{ item.status === 'Posted' 
                      ? (langService.currentLang() === 'ar' ? 'مرحّل' : 'Posted') 
                      : (langService.currentLang() === 'ar' ? 'مدقق' : 'Audited') }}
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
      font-size: 1.6rem;
      font-weight: 800;
      color: #FFFFFF;
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
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;

      &.green {
        background: #00F5A0;
        color: #070B14;
        border: none;
        box-shadow: 0 0 15px rgba(0, 245, 160, 0.25);

        &:hover {
          background: #5CFFC6;
          box-shadow: 0 0 20px rgba(0, 245, 160, 0.4);
        }
      }

      &.cyan {
        background: transparent;
        color: #00F0FF;
        border: 1px solid rgba(0, 240, 255, 0.4);

        &:hover {
          background: rgba(0, 240, 255, 0.1);
          border-color: #00F0FF;
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
      background: #0D1424;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 1.25rem 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      position: relative;
      transition: border-color 0.2s ease, transform 0.2s ease;

      &:hover {
        transform: translateY(-2px);
      }

      &.green {
        border-top: 2px solid #00F5A0;
        &:hover { border-color: rgba(0, 245, 160, 0.4); }
      }

      &.cyan {
        border-top: 2px solid #00F0FF;
        &:hover { border-color: rgba(0, 240, 255, 0.4); }
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
      color: #94A3B8;
    }

    .kpi-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;

      &.green {
        background: rgba(0, 245, 160, 0.12);
        color: #00F5A0;
      }
      &.cyan {
        background: rgba(0, 240, 255, 0.12);
        color: #00F0FF;
      }
    }

    .kpi-value {
      font-size: 1.65rem;
      font-weight: 800;
      color: #FFFFFF;
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
      background: #0D1424;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 1.35rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      h3 {
        font-size: 1.05rem;
        font-weight: 700;
        color: #FFFFFF;
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
      background: #00F5A0;
      box-shadow: 0 0 8px #00F5A0;
    }

    .state-pill {
      font-size: 0.75rem;
      font-weight: 600;
      color: #00F5A0;
      background: rgba(0, 245, 160, 0.1);
      border: 1px solid rgba(0, 245, 160, 0.25);
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
      gap: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 0.85rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      text-align: start;
      transition: all 0.15s ease;

      i {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(0, 245, 160, 0.25);
        transform: translateY(-1px);
      }
    }

    .launch-info {
      display: flex;
      flex-direction: column;

      strong {
        font-size: 0.85rem;
        color: #FFFFFF;
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
      background: rgba(0, 0, 0, 0.25);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
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
      color: #94A3B8;
    }

    .security-chip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #94A3B8;
      background: rgba(0, 245, 160, 0.04);
      padding: 0.5rem 0.85rem;
      border-radius: 6px;
      border: 1px solid rgba(0, 245, 160, 0.1);
    }

    /* Table */
    .btn-link {
      background: transparent;
      border: none;
      color: #00F0FF;
      font-size: 0.8rem;
      font-weight: 600;
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
        font-weight: 600;
        text-transform: uppercase;
        color: #64748B;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      td {
        padding: 0.85rem 1rem;
        font-size: 0.825rem;
        color: #CBD5E1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      }

      tr:hover td {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    .branch-pill {
      background: rgba(255, 255, 255, 0.04);
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #94A3B8;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      padding: 0.15rem 0.55rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;

      &.posted {
        background: rgba(0, 245, 160, 0.12);
        color: #00F5A0;
      }
      &.audited {
        background: rgba(0, 240, 255, 0.12);
        color: #00F0FF;
      }
    }

    .font-bold { font-weight: 700; }
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
