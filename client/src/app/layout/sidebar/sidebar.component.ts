import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService } from '../../core/services/company-context.service';

interface NavItem {
  labelAr: string;
  labelEn: string;
  icon: string;
  route: string;
  badge?: string;
  badgeClass?: string;
  superAdminOnly?: boolean;
}

interface NavSection {
  titleAr: string;
  titleEn: string;
  items: NavItem[];
  superAdminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="erp-sidebar" [class.collapsed]="isCollapsed()">
      <!-- Brand & Active Company Header -->
      <div class="sidebar-header">
        <div class="brand-box" (click)="router.navigate(['/dashboard'])">
          <div class="brand-emblem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
            </svg>
          </div>
          <div class="brand-text" *ngIf="!isCollapsed()">
            <h2 class="brand-title">الرّبــــان</h2>
            <span class="brand-edition">Enterprise Cloud</span>
          </div>
        </div>

        <button class="collapse-toggle-btn" (click)="toggleCollapse()" [title]="isCollapsed() ? 'توسيع القائمة' : 'طي القائمة'">
          <i class="pi" [ngClass]="isCollapsed() ? 'pi-angle-right' : 'pi-angle-left'"></i>
        </button>
      </div>

      <!-- Active Tenant Indicator Card (When Expanded) -->
      <div class="tenant-indicator" *ngIf="!isCollapsed()">
        <div class="tenant-logo">
          <ng-container *ngIf="companyContext.activeCompany().logoUrl; else defaultLogo">
            <img [src]="companyContext.activeCompany().logoUrl" alt="Logo" />
          </ng-container>
          <ng-template #defaultLogo>
            <i class="pi pi-building"></i>
          </ng-template>
        </div>
        <div class="tenant-meta">
          <span class="tenant-badge" [class.super]="authService.isSuperAdmin()">
            {{ authService.isSuperAdmin() 
              ? (langService.currentLang() === 'ar' ? 'الشركة المالكة للمشروع' : 'Platform Owner')
              : (langService.currentLang() === 'ar' ? 'الشركة المستأجرة' : 'Tenant Company') }}
          </span>
          <strong class="tenant-name" [title]="companyContext.companyName()(langService.currentLang())">
            {{ companyContext.companyName()(langService.currentLang()) }}
          </strong>
        </div>
      </div>

      <!-- Navigation Tree -->
      <nav class="sidebar-nav">
        <ng-container *ngFor="let section of navSections">
          <div class="nav-section" *ngIf="!section.superAdminOnly || authService.isSuperAdmin()">
            <div class="section-title" *ngIf="!isCollapsed()">
              {{ langService.currentLang() === 'ar' ? section.titleAr : section.titleEn }}
            </div>

            <ul class="nav-list">
              <li *ngFor="let item of section.items">
                <a 
                  [routerLink]="item.route" 
                  routerLinkActive="active" 
                  class="nav-link"
                  [title]="isCollapsed() ? (langService.currentLang() === 'ar' ? item.labelAr : item.labelEn) : ''"
                  *ngIf="!item.superAdminOnly || authService.isSuperAdmin()">
                  <i [class]="item.icon + ' nav-icon'"></i>
                  <span class="nav-label" *ngIf="!isCollapsed()">
                    {{ langService.currentLang() === 'ar' ? item.labelAr : item.labelEn }}
                  </span>
                  <span class="nav-badge" [ngClass]="item.badgeClass || 'badge-default'" *ngIf="item.badge && !isCollapsed()">
                    {{ item.badge }}
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </ng-container>
      </nav>

      <!-- Bottom User Profile Strip -->
      <div class="sidebar-footer">
        <div class="user-card" *ngIf="!isCollapsed()">
          <div class="user-avatar" [class.super]="authService.isSuperAdmin()">
            <i class="pi" [ngClass]="authService.isSuperAdmin() ? 'pi-crown' : 'pi-user'"></i>
          </div>
          <div class="user-details">
            <strong class="user-name">
              {{ langService.currentLang() === 'ar' ? authService.currentUser()?.fullNameAr : authService.currentUser()?.fullNameEn }}
            </strong>
            <span class="user-role">
              {{ authService.currentUser()?.userName }}
            </span>
          </div>
        </div>

        <button class="logout-btn" (click)="authService.logout()" [title]="langService.currentLang() === 'ar' ? 'تسجيل الخروج' : 'Sign Out'">
          <i class="pi pi-power-off"></i>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .erp-sidebar {
      width: 275px;
      min-width: 275px;
      height: 100vh;
      background: #090e1a;
      border-inline-end: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: sticky;
      top: 0;
      z-index: 90;
      color: #94a3b8;
      overflow-y: auto;
      overflow-x: hidden;

      &.collapsed {
        width: 78px;
        min-width: 78px;

        .brand-box {
          justify-content: center;
        }

        .nav-link {
          justify-content: center;
          padding: 0.75rem;
        }

        .sidebar-header {
          padding: 1.25rem 0.75rem;
          justify-content: center;
        }

        .collapse-toggle-btn {
          position: absolute;
          top: 1.25rem;
          inset-inline-end: -12px;
          background: var(--primary-color, #0f766e);
          color: #ffffff;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .sidebar-footer {
          justify-content: center;
          padding: 1rem 0.5rem;
        }
      }

      /* Scrollbar */
      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
    }

    /* Header */
    .sidebar-header {
      padding: 1.25rem 1.25rem 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      position: relative;
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      cursor: pointer;
    }

    .brand-emblem {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--primary-color, #0f766e) 0%, #14b8a6 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
      flex-shrink: 0;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .brand-edition {
      font-size: 0.7rem;
      color: #14b8a6;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .collapse-toggle-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }
    }

    /* Tenant indicator card */
    .tenant-indicator {
      margin: 1rem 1.15rem 0.5rem 1.15rem;
      padding: 0.75rem 0.9rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .tenant-logo {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #14b8a6;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
      }
    }

    .tenant-meta {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      overflow: hidden;
    }

    .tenant-badge {
      font-size: 0.68rem;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;

      &.super {
        color: #fbbf24;
      }
    }

    .tenant-name {
      font-size: 0.825rem;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Nav Tree */
    .sidebar-nav {
      flex: 1;
      padding: 0.75rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .section-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      padding-inline: 0.65rem;
      margin-bottom: 0.25rem;
      letter-spacing: 0.05em;
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
      }

      &.active {
        background: linear-gradient(90deg, rgba(15, 118, 110, 0.25) 0%, rgba(20, 184, 166, 0.1) 100%);
        color: #14b8a6;
        border-inline-start: 3px solid #14b8a6;
        font-weight: 600;

        .nav-icon {
          color: #14b8a6;
        }
      }
    }

    .nav-icon {
      font-size: 1.05rem;
      flex-shrink: 0;
    }

    .nav-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-badge {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;

      &.badge-new {
        background: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
      }
      &.badge-default {
        background: rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
      }
      &.badge-zatca {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
      }
    }

    /* Footer */
    .sidebar-footer {
      padding: 1rem 1.15rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: rgba(15, 23, 42, 0.5);
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      overflow: hidden;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;

      &.super {
        background: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
      }
    }

    .user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-name {
      font-size: 0.8rem;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.7rem;
      color: #64748b;
    }

    .logout-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #f87171;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;

      &:hover {
        background: #ef4444;
        color: #ffffff;
      }
    }
  `]
})
export class SidebarComponent {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  companyContext = inject(CompanyContextService);
  router = inject(Router);

  isCollapsed = signal<boolean>(false);

  toggleCollapse() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  navSections: NavSection[] = [
    {
      titleAr: 'الرئيسية',
      titleEn: 'Main',
      items: [
        {
          labelAr: 'لوحة التحكم التنفيذية',
          labelEn: 'Executive Dashboard',
          icon: 'pi pi-th-large',
          route: '/dashboard'
        }
      ]
    },
    {
      titleAr: 'إدارة المنصة (الشركة المالكة)',
      titleEn: 'Platform Management',
      superAdminOnly: true,
      items: [
        {
          labelAr: 'الشركات والمستأجرين',
          labelEn: 'Tenants & Companies',
          icon: 'pi pi-building',
          route: '/companies',
          badge: 'إدارة',
          badgeClass: 'badge-new',
          superAdminOnly: true
        }
      ]
    },
    {
      titleAr: 'المحاسبة والمالية',
      titleEn: 'General Ledger',
      items: [
        {
          labelAr: 'دليل الحسابات (شجرة الحسابات)',
          labelEn: 'Chart of Accounts',
          icon: 'pi pi-sitemap',
          route: '/accounting/chart-of-accounts',
          badge: 'IFRS',
          badgeClass: 'badge-default'
        },
        {
          labelAr: 'قيود اليومية العامة',
          labelEn: 'Journal Entries',
          icon: 'pi pi-book',
          route: '/accounting/journal-entries'
        },
        {
          labelAr: 'ميزان المراجعة',
          labelEn: 'Trial Balance',
          icon: 'pi pi-chart-bar',
          route: '/accounting/trial-balance'
        },
        {
          labelAr: 'مراكز التكلفة',
          labelEn: 'Cost Centers',
          icon: 'pi pi-tags',
          route: '/accounting/cost-centers'
        }
      ]
    },
    {
      titleAr: 'الفوترة وهيئة الزكاة',
      titleEn: 'ZATCA E-Invoicing',
      items: [
        {
          labelAr: 'الفواتير الضريبية (B2B)',
          labelEn: 'Tax Invoices (B2B)',
          icon: 'pi pi-file',
          route: '/invoicing/tax-invoices'
        },
        {
          labelAr: 'الفواتير المبسطة (B2C)',
          labelEn: 'Simplified Invoices',
          icon: 'pi pi-receipt',
          route: '/invoicing/simplified'
        },
        {
          labelAr: 'سجل الامتثال والتشفير',
          labelEn: 'ZATCA Compliance Shield',
          icon: 'pi pi-verified',
          route: '/invoicing/zatca-status',
          badge: 'فاز 2',
          badgeClass: 'badge-zatca'
        }
      ]
    },
    {
      titleAr: 'التقارير المالية',
      titleEn: 'Financial Reports',
      items: [
        {
          labelAr: 'قائمة الدخل والأرباح',
          labelEn: 'Income Statement',
          icon: 'pi pi-chart-line',
          route: '/reports/income-statement'
        },
        {
          labelAr: 'الميزانية والمركز المالي',
          labelEn: 'Balance Sheet',
          icon: 'pi pi-sliders-h',
          route: '/reports/balance-sheet'
        },
        {
          labelAr: 'إقرار ضريبة القيمة المضافة',
          labelEn: 'VAT Declaration',
          icon: 'pi pi-percentage',
          route: '/reports/vat'
        }
      ]
    }
  ];
}
