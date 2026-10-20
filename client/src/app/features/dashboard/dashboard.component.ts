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
  icon: string;
  colorClass: string;
  subtitleAr: string;
  subtitleEn: string;
}

interface JournalEntryPreview {
  voucherNo: string;
  date: string;
  descriptionAr: string;
  descriptionEn: string;
  debit: string;
  credit: string;
  branchAr: string;
  branchEn: string;
  status: 'Posted' | 'Draft' | 'Audited';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <!-- Executive Page Header -->
      <header class="dash-header">
        <div class="dash-title-group">
          <div class="welcome-row">
            <span class="welcome-chip">
              <i class="pi pi-sparkles"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'نظام المحاسبة المالية المتقدم' : 'Advanced Financial ERP' }}</span>
            </span>
            <span class="fiscal-chip">
              <i class="pi pi-calendar"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'السنة المالية 2026 (الفترة 10 - أكتوبر)' : 'Fiscal Year 2026 (Period 10 - Oct)' }}</span>
            </span>
          </div>

          <h1 class="dash-heading">
            {{ langService.currentLang() === 'ar' 
              ? 'لوحة القيادة والمؤشرات المالية التنفيذية' 
              : 'Executive Financial & Accounting Dashboard' }}
          </h1>
          <p class="dash-sub">
            {{ langService.currentLang() === 'ar'
              ? 'نظرة شاملة ومباشرة على الإيرادات، التدفقات النقدية، قيود اليومية، وحالة التوافق مع هيئة الزكاة (ZATCA فاز 2)'
              : 'Real-time overview of revenues, cash flow, double-entry journals, and ZATCA Phase 2 compliance' }}
          </p>
        </div>

        <div class="dash-actions">
          <button class="btn-refresh" (click)="refreshMetrics()">
            <i class="pi pi-sync"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'تحديث البيانات' : 'Refresh' }}</span>
          </button>
        </div>
      </header>

      <!-- 4 Principal KPI Metric Cards -->
      <section class="kpi-grid">
        <div class="kpi-card" *ngFor="let kpi of metricCards" [ngClass]="kpi.colorClass">
          <div class="kpi-top">
            <span class="kpi-label">
              {{ langService.currentLang() === 'ar' ? kpi.titleAr : kpi.titleEn }}
            </span>
            <div class="kpi-icon-wrap">
              <i [class]="kpi.icon"></i>
            </div>
          </div>

          <div class="kpi-amount">{{ kpi.amount }}</div>

          <div class="kpi-bottom">
            <span class="kpi-trend" [class.positive]="kpi.isPositive" [class.negative]="!kpi.isPositive">
              <i class="pi" [ngClass]="kpi.isPositive ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
              {{ kpi.trend }}
            </span>
            <span class="kpi-sub">
              {{ langService.currentLang() === 'ar' ? kpi.subtitleAr : kpi.subtitleEn }}
            </span>
          </div>
        </div>
      </section>

      <!-- Middle Grid: ZATCA Compliance Radar & Quick Actions -->
      <section class="middle-grid">
        <!-- ZATCA Phase 2 E-Invoicing Live Radar -->
        <div class="dash-card zatca-radar-card">
          <div class="card-header-row">
            <div class="header-left">
              <i class="pi pi-shield text-emerald"></i>
              <h3>{{ langService.currentLang() === 'ar' ? 'رادار الفوترة الإلكترونية (ZATCA Phase 2)' : 'ZATCA Phase 2 Live Radar' }}</h3>
            </div>
            <span class="badge-live">
              <span class="pulse-dot"></span>
              {{ langService.currentLang() === 'ar' ? 'الربط المباشر فعال 100%' : 'Direct Link Active 100%' }}
            </span>
          </div>

          <p class="radar-desc">
            {{ langService.currentLang() === 'ar'
              ? 'المنظومة مرتبطة بمنصة "فاتورة" التابعة لهيئة الزكاة والضريبة والجمارك مع توقيع رقمي فوري ECDSA secp256k1 وتشفير تام لكافة الفواتير الضريبية والمبسطة.'
              : 'Directly integrated with ZATCA FATOORA portal featuring instant ECDSA secp256k1 digital signatures and full cryptographic compliance.' }}
          </p>

          <div class="zatca-metrics-row">
            <div class="z-stat">
              <span class="z-val text-emerald">1,428</span>
              <span class="z-lbl">{{ langService.currentLang() === 'ar' ? 'فاتورة معتمدة ومطابقة' : 'Cleared Invoices' }}</span>
            </div>
            <div class="z-stat">
              <span class="z-val text-cyan">8 ms</span>
              <span class="z-lbl">{{ langService.currentLang() === 'ar' ? 'سرعة التوقيع الرقمي' : 'Signing Latency' }}</span>
            </div>
            <div class="z-stat">
              <span class="z-val text-amber">0</span>
              <span class="z-lbl">{{ langService.currentLang() === 'ar' ? 'أخطاء أو رفض في الهيئة' : 'Rejected Invoices' }}</span>
            </div>
          </div>

          <div class="latest-clearance-box">
            <div class="box-icon">
              <i class="pi pi-check"></i>
            </div>
            <div class="box-details">
              <strong>{{ langService.currentLang() === 'ar' ? 'آخر فاتورة ضريبية تم اعتمادها وتوليد الختم بنجاح' : 'Latest Cleared Tax Invoice' }}</strong>
              <small class="text-mono">UUID: a98f4c21-789a-412e-b124-9f88d7c92b51 • QR TLV Phase 2 Verified</small>
            </div>
          </div>
        </div>

        <!-- Quick Launchpad -->
        <div class="dash-card launchpad-card">
          <div class="card-header-row">
            <div class="header-left">
              <i class="pi pi-compass text-primary"></i>
              <h3>{{ langService.currentLang() === 'ar' ? 'منصة العمليات السريعة' : 'Operations Launchpad' }}</h3>
            </div>
          </div>

          <div class="launch-actions-grid">
            <button class="launch-btn" (click)="router.navigate(['/accounting/chart-of-accounts'])">
              <div class="launch-icon bg-emerald">
                <i class="pi pi-sitemap"></i>
              </div>
              <div class="launch-text">
                <strong>{{ langService.currentLang() === 'ar' ? 'دليل الحسابات' : 'Chart of Accounts' }}</strong>
                <span>{{ langService.currentLang() === 'ar' ? 'استعراض شجرة الحسابات المتفرعة' : 'Explore multi-level tree' }}</span>
              </div>
            </button>

            <button class="launch-btn" (click)="router.navigate(['/accounting/journal-entries'])">
              <div class="launch-icon bg-blue">
                <i class="pi pi-book"></i>
              </div>
              <div class="launch-text">
                <strong>{{ langService.currentLang() === 'ar' ? 'قيد يومية جديد' : 'New Journal Entry' }}</strong>
                <span>{{ langService.currentLang() === 'ar' ? 'تسجيل قيد مزدوج مدين / دائن' : 'Double-entry voucher' }}</span>
              </div>
            </button>

            <button class="launch-btn" (click)="router.navigate(['/invoicing/tax-invoices'])">
              <div class="launch-icon bg-purple">
                <i class="pi pi-file"></i>
              </div>
              <div class="launch-text">
                <strong>{{ langService.currentLang() === 'ar' ? 'إصدار فاتورة ZATCA' : 'Issue Tax Invoice' }}</strong>
                <span>{{ langService.currentLang() === 'ar' ? 'فاتورة ضريبية B2B معتمدة' : 'Compliant B2B Tax Invoice' }}</span>
              </div>
            </button>

            <button class="launch-btn" *ngIf="authService.isSuperAdmin()" (click)="router.navigate(['/companies'])">
              <div class="launch-icon bg-amber">
                <i class="pi pi-building"></i>
              </div>
              <div class="launch-text">
                <strong>{{ langService.currentLang() === 'ar' ? 'إدارة الشركات والمستأجرين' : 'Tenant Management' }}</strong>
                <span>{{ langService.currentLang() === 'ar' ? 'إضافة شركة وتزويدها ببيانات الدخول' : 'Manage & onboard companies' }}</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      <!-- Bottom: Recent Double-Entry Journal Entries Stream -->
      <section class="dash-card recent-journals-card">
        <div class="card-header-row">
          <div class="header-left">
            <i class="pi pi-list text-cyan"></i>
            <div>
              <h3>{{ langService.currentLang() === 'ar' ? 'أحدث القيود المحاسبية المسجلة' : 'Recent Journal Entries' }}</h3>
              <small class="text-muted">{{ langService.currentLang() === 'ar' ? 'قيود يومية مزدوجة مرتبطة بالسنة المالية النشطة والفروع' : 'Double-entry vouchers linked to active fiscal periods' }}</small>
            </div>
          </div>
          <button class="btn-view-all" (click)="router.navigate(['/accounting/journal-entries'])">
            <span>{{ langService.currentLang() === 'ar' ? 'عرض دفتر اليومية كاملاً' : 'View All Entries' }}</span>
            <i class="pi pi-arrow-left"></i>
          </button>
        </div>

        <div class="table-responsive">
          <table class="erp-table">
            <thead>
              <tr>
                <th>{{ langService.currentLang() === 'ar' ? 'رقم السند' : 'Voucher No.' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'التاريخ' : 'Date' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'البيان والشرح' : 'Description' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الفرع' : 'Branch' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'إجمالي المدين' : 'Debit (SAR)' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'إجمالي الدائن' : 'Credit (SAR)' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الحالة' : 'Status' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let entry of recentEntries">
                <td class="font-mono text-cyan font-bold">{{ entry.voucherNo }}</td>
                <td>{{ entry.date }}</td>
                <td class="font-medium">
                  {{ langService.currentLang() === 'ar' ? entry.descriptionAr : entry.descriptionEn }}
                </td>
                <td>
                  <span class="branch-tag">
                    {{ langService.currentLang() === 'ar' ? entry.branchAr : entry.branchEn }}
                  </span>
                </td>
                <td class="font-mono font-bold">{{ entry.debit }}</td>
                <td class="font-mono font-bold">{{ entry.credit }}</td>
                <td>
                  <span class="status-badge" [ngClass]="entry.status.toLowerCase()">
                    <i class="pi pi-check"></i>
                    {{ entry.status === 'Posted' 
                      ? (langService.currentLang() === 'ar' ? 'مرحّل' : 'Posted') 
                      : (langService.currentLang() === 'ar' ? 'مدقق' : 'Audited') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
      max-width: 1440px;
      margin: 0 auto;
    }

    /* Header */
    .dash-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .dash-title-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .welcome-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .welcome-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(20, 184, 166, 0.15);
      color: #2dd4bf;
      border: 1px solid rgba(20, 184, 166, 0.3);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .fiscal-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .dash-heading {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .dash-sub {
      font-size: 0.9rem;
      color: #94a3b8;
      margin: 0;
      max-width: 780px;
      line-height: 1.5;
    }

    .btn-refresh {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 0.55rem 1.15rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(15, 23, 42, 0.95);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
      }
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
    }

    .kpi-card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.35rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(10px);
      transition: transform 0.2s ease, border-color 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.2);
      }

      &.emerald {
        &::before {
          content: '';
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          inset-inline-end: 0;
          height: 3px;
          background: linear-gradient(90deg, #10b981, #14b8a6);
        }
        .kpi-icon-wrap { background: rgba(16, 185, 129, 0.15); color: #34d399; }
      }

      &.amber {
        &::before {
          content: '';
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          inset-inline-end: 0;
          height: 3px;
          background: linear-gradient(90deg, #f59e0b, #d97706);
        }
        .kpi-icon-wrap { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
      }

      &.blue {
        &::before {
          content: '';
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          inset-inline-end: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #6366f1);
        }
        .kpi-icon-wrap { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
      }

      &.purple {
        &::before {
          content: '';
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          inset-inline-end: 0;
          height: 3px;
          background: linear-gradient(90deg, #8b5cf6, #ec4899);
        }
        .kpi-icon-wrap { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
      }
    }

    .kpi-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .kpi-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #94a3b8;
    }

    .kpi-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
    }

    .kpi-amount {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      font-family: var(--font-latin);
      letter-spacing: -0.02em;
    }

    .kpi-bottom {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.78rem;
    }

    .kpi-trend {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;

      &.positive {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }
      &.negative {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
      }
    }

    .kpi-sub {
      color: #64748b;
    }

    /* Middle Grid */
    .middle-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 1.25rem;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .dash-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      backdrop-filter: blur(10px);
    }

    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      h3 {
        font-size: 1.1rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0;
      }

      i {
        font-size: 1.35rem;
      }
    }

    .text-emerald { color: #10b981; }
    .text-primary { color: #14b8a6; }
    .text-cyan { color: #38bdf8; }
    .text-amber { color: #f59e0b; }
    .text-muted { color: #64748b; font-size: 0.8rem; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .font-medium { font-weight: 500; }

    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    .radar-desc {
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0;
    }

    .zatca-metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      background: rgba(2, 6, 23, 0.5);
      padding: 1rem;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .z-stat {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .z-val {
      font-size: 1.35rem;
      font-weight: 800;
      font-family: var(--font-latin);
    }

    .z-lbl {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .latest-clearance-box {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 0.85rem 1rem;
      border-radius: 10px;
    }

    .box-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #10b981;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .box-details {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;

      strong {
        font-size: 0.85rem;
        color: #e2e8f0;
      }
      small {
        font-size: 0.72rem;
        color: #6ee7b7;
      }
    }

    /* Launchpad */
    .launch-actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }

    .launch-btn {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      background: rgba(2, 6, 23, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.9rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      text-align: start;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(15, 23, 42, 0.8);
        border-color: rgba(20, 184, 166, 0.3);
        transform: translateY(-2px);
      }
    }

    .launch-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      color: #ffffff;
      flex-shrink: 0;

      &.bg-emerald { background: linear-gradient(135deg, #059669, #10b981); }
      &.bg-blue { background: linear-gradient(135deg, #2563eb, #3b82f6); }
      &.bg-purple { background: linear-gradient(135deg, #7c3aed, #8b5cf6); }
      &.bg-amber { background: linear-gradient(135deg, #d97706, #f59e0b); }
    }

    .launch-text {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;

      strong {
        font-size: 0.85rem;
        color: #ffffff;
      }
      span {
        font-size: 0.75rem;
        color: #94a3b8;
      }
    }

    /* Table */
    .btn-view-all {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: transparent;
      border: none;
      color: #38bdf8;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .table-responsive {
      overflow-x: auto;
    }

    .erp-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        padding: 0.85rem 1rem;
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #94a3b8;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      td {
        padding: 0.95rem 1rem;
        font-size: 0.85rem;
        color: #cbd5e1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      tr:hover td {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    .branch-tag {
      background: rgba(255, 255, 255, 0.06);
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;

      &.posted {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }
      &.audited {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
      }
    }
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
      icon: 'pi pi-chart-line',
      colorClass: 'emerald',
      subtitleAr: 'مقارنة بالفترة المالية السابقة',
      subtitleEn: 'vs previous fiscal period'
    },
    {
      titleAr: 'إجمالي المصروفات التشغيلية',
      titleEn: 'Total Expenses',
      amount: 'SAR 1,412,300.00',
      trend: '-2.8%',
      isPositive: true,
      icon: 'pi pi-wallet',
      colorClass: 'amber',
      subtitleAr: 'ضمن الميزانية التقديرية',
      subtitleEn: 'within allocated budget'
    },
    {
      titleAr: 'صافي الأرباح التشغيلية',
      titleEn: 'Net Operating Profit',
      amount: 'SAR 1,433,600.00',
      trend: '+24.5%',
      isPositive: true,
      icon: 'pi pi-dollar',
      colorClass: 'blue',
      subtitleAr: 'هامش ربح تشغيلي 50.4%',
      subtitleEn: '50.4% operating margin'
    },
    {
      titleAr: 'ضريبة القيمة المضافة (15%)',
      titleEn: 'VAT Payable (15%)',
      amount: 'SAR 215,040.00',
      trend: 'مطابق ZATCA',
      isPositive: true,
      icon: 'pi pi-percentage',
      colorClass: 'purple',
      subtitleAr: 'جاهز للإقرار الضريبي الربع سنوي',
      subtitleEn: 'Ready for quarterly VAT return'
    }
  ];

  recentEntries: JournalEntryPreview[] = [
    {
      voucherNo: 'JV-2026-00412',
      date: '2026-10-20',
      descriptionAr: 'إثبات مبيعات استشارات وحلول سحابية - شركة النهضة',
      descriptionEn: 'Cloud Consulting Revenue - Al-Nahda Corp',
      debit: '115,000.00',
      credit: '115,000.00',
      branchAr: 'الفرع الرئيسي - الرياض',
      branchEn: 'Main Branch - Riyadh',
      status: 'Posted'
    },
    {
      voucherNo: 'JV-2026-00411',
      date: '2026-10-19',
      descriptionAr: 'سداد إيجار المستودعات المركزية والدعم الفني',
      descriptionEn: 'Central Warehouse & Technical Support Rent',
      debit: '45,000.00',
      credit: '45,000.00',
      branchAr: 'فرع المنطقة الغربية - جدة',
      branchEn: 'Western Region Branch - Jeddah',
      status: 'Posted'
    },
    {
      voucherNo: 'JV-2026-00410',
      date: '2026-10-18',
      descriptionAr: 'قيد تسوية ضريبة القيمة المضافة المحصلة والمسددة',
      descriptionEn: 'Output vs Input VAT Settlement Voucher',
      debit: '28,400.00',
      credit: '28,400.00',
      branchAr: 'الفرع الرئيسي - الرياض',
      branchEn: 'Main Branch - Riyadh',
      status: 'Audited'
    },
    {
      voucherNo: 'JV-2026-00409',
      date: '2026-10-17',
      descriptionAr: 'تحصيل مستحقات فواتير ضريبية عبر البنك الأهلي السعودي',
      descriptionEn: 'SNB Bank Customer Receivable Inward Remittance',
      debit: '250,000.00',
      credit: '250,000.00',
      branchAr: 'الفرع الرئيسي - الرياض',
      branchEn: 'Main Branch - Riyadh',
      status: 'Posted'
    }
  ];

  refreshMetrics() {
    // Simulates live metric refresh
  }
}
