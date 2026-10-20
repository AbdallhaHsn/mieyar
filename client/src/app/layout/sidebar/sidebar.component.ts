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
      <!-- Brand Header -->
      <div class="sidebar-header">
        <div class="brand-box" (click)="router.navigate(['/dashboard'])">
          <div class="brand-emblem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
            </svg>
          </div>
          <div class="brand-text" *ngIf="!isCollapsed()">
            <h2 class="brand-title">الرّبــــان</h2>
            <span class="brand-edition">Cloud ERP</span>
          </div>
        </div>

        <button class="collapse-toggle-btn" (click)="toggleCollapse()" [title]="isCollapsed() ? 'توسيع' : 'طي'">
          <i class="pi" [ngClass]="isCollapsed() ? 'pi-angle-right' : 'pi-angle-left'"></i>
        </button>
      </div>

      <!-- Active Tenant Pill -->
      <div class="tenant-indicator" *ngIf="!isCollapsed()">
        <div class="tenant-icon">
          <i class="pi pi-building"></i>
        </div>
        <div class="tenant-meta">
          <span class="tenant-role">
            {{ authService.isSuperAdmin() 
              ? (langService.currentLang() === 'ar' ? 'الشركة المالكة' : 'Platform Owner')
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
                </a>
              </li>
            </ul>
          </div>
        </ng-container>
      </nav>

      <!-- Bottom User Profile Strip -->
      <div class="sidebar-footer">
        <div class="user-card" *ngIf="!isCollapsed()">
          <div class="user-avatar">
            <i class="pi" [ngClass]="authService.isSuperAdmin() ? 'pi-shield' : 'pi-user'"></i>
          </div>
          <div class="user-details">
            <strong class="user-name">
              {{ langService.currentLang() === 'ar' ? authService.currentUser()?.fullNameAr : authService.currentUser()?.fullNameEn }}
            </strong>
            <span class="user-role">{{ authService.currentUser()?.userName }}</span>
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
      width: 260px;
      min-width: 260px;
      height: 100vh;
      background: #090D17;
      border-inline-end: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: sticky;
      top: 0;
      z-index: 90;
      color: #94A3B8;
      overflow-y: auto;
      overflow-x: hidden;

      &.collapsed {
        width: 72px;
        min-width: 72px;

        .brand-box {
          justify-content: center;
        }

        .nav-link {
          justify-content: center;
          padding: 0.75rem;
        }

        .sidebar-header {
          padding: 1.25rem 0.5rem;
          justify-content: center;
        }

        .collapse-toggle-btn {
          display: none;
        }

        .sidebar-footer {
          justify-content: center;
          padding: 1rem 0.5rem;
        }
      }

      &::-webkit-scrollbar {
        width: 3px;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    /* Header */
    .sidebar-header {
      padding: 1.25rem 1.25rem 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
    }

    .brand-emblem {
      width: 38px;
      height: 38px;
      border-radius: 9px;
      background: linear-gradient(135deg, #00F5A0 0%, #00F0FF 100%);
      color: #070B14;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 16px rgba(0, 245, 160, 0.3);
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
      color: #FFFFFF;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .brand-edition {
      font-size: 0.68rem;
      color: #00F0FF;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .collapse-toggle-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94A3B8;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(0, 245, 160, 0.15);
        color: #00F5A0;
      }
    }

    /* Active Tenant Indicator */
    .tenant-indicator {
      margin: 0.85rem 1rem 0.25rem 1rem;
      padding: 0.65rem 0.85rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .tenant-icon {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: rgba(0, 245, 160, 0.12);
      color: #00F5A0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .tenant-meta {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      overflow: hidden;
    }

    .tenant-role {
      font-size: 0.65rem;
      color: #00F0FF;
      font-weight: 600;
    }

    .tenant-name {
      font-size: 0.78rem;
      color: #FFFFFF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Nav Tree */
    .sidebar-nav {
      flex: 1;
      padding: 0.75rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .section-title {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
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
      gap: 0.2rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.85rem;
      border-radius: 8px;
      color: #94A3B8;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.04);
        color: #FFFFFF;
      }

      &.active {
        background: rgba(0, 245, 160, 0.08);
        color: #00F5A0;
        border-inline-start: 3px solid #00F5A0;
        font-weight: 600;

        .nav-icon {
          color: #00F5A0;
        }
      }
    }

    .nav-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .nav-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Footer */
    .sidebar-footer {
      padding: 0.85rem 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      overflow: hidden;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(0, 245, 160, 0.12);
      color: #00F5A0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-name {
      font-size: 0.78rem;
      color: #FFFFFF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.65rem;
      color: #64748B;
    }

    .logout-btn {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94A3B8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;

      &:hover {
        background: rgba(255, 71, 87, 0.15);
        border-color: rgba(255, 71, 87, 0.4);
        color: #FF4757;
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
          labelAr: 'لوحة التحكم',
          labelEn: 'Dashboard',
          icon: 'pi pi-th-large',
          route: '/dashboard'
        }
      ]
    },
    {
      titleAr: 'إدارة المنصة',
      titleEn: 'Platform',
      superAdminOnly: true,
      items: [
        {
          labelAr: 'الشركات والمستأجرين',
          labelEn: 'Companies & Tenants',
          icon: 'pi pi-building',
          route: '/companies',
          superAdminOnly: true
        }
      ]
    },
    {
      titleAr: 'المحاسبة والمالية',
      titleEn: 'Accounting',
      items: [
        {
          labelAr: 'دليل الحسابات',
          labelEn: 'Chart of Accounts',
          icon: 'pi pi-sitemap',
          route: '/accounting/chart-of-accounts'
        },
        {
          labelAr: 'قيود اليومية',
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
      titleAr: 'الفوترة الإلكترونية (ZATCA)',
      titleEn: 'E-Invoicing',
      items: [
        {
          labelAr: 'الفواتير الضريبية (B2B)',
          labelEn: 'Tax Invoices',
          icon: 'pi pi-file',
          route: '/invoicing/tax-invoices'
        },
        {
          labelAr: 'الفواتير المبسطة (B2C)',
          labelEn: 'Simplified Invoices',
          icon: 'pi pi-receipt',
          route: '/invoicing/simplified'
        }
      ]
    },
    {
      titleAr: 'التقارير المالية',
      titleEn: 'Financial Reports',
      items: [
        {
          labelAr: 'قائمة الدخل',
          labelEn: 'Income Statement',
          icon: 'pi pi-chart-line',
          route: '/reports/income-statement'
        },
        {
          labelAr: 'الميزانية العمومية',
          labelEn: 'Balance Sheet',
          icon: 'pi pi-sliders-h',
          route: '/reports/balance-sheet'
        }
      ]
    }
  ];
}
