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
      <!-- Official Al-Roban Brand Header -->
      <div class="sidebar-header">
        <div class="brand-box" (click)="router.navigate(['/dashboard'])">
          <div class="brand-logo-frame">
            <img src="/alruban-logo.jpg" alt="Al-Roban Logo" class="official-logo" />
          </div>
          <div class="brand-text" *ngIf="!isCollapsed()">
            <h2 class="brand-title">الرّبــــان</h2>
            <span class="brand-edition">نظام ERP السحابي</span>
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
              <span class="title-text">{{ langService.currentLang() === 'ar' ? section.titleAr : section.titleEn }}</span>
              <span class="title-line"></span>
            </div>

            <ul class="nav-list">
              <li *ngFor="let item of section.items">
                <a 
                  [routerLink]="item.route" 
                  routerLinkActive="active" 
                  class="nav-link"
                  [title]="isCollapsed() ? (langService.currentLang() === 'ar' ? item.labelAr : item.labelEn) : ''"
                  *ngIf="!item.superAdminOnly || authService.isSuperAdmin()">
                  <div class="nav-icon-box">
                    <i [class]="item.icon + ' nav-icon'"></i>
                  </div>
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
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
    }

    button, a, span, strong {
      font-family: var(--font-arabic) !important;
    }

    .erp-sidebar {
      width: 265px;
      min-width: 265px;
      height: 100vh;
      background: #FFFFFF;
      border-inline-end: 1px solid #E2E8F0;
      display: flex;
      flex-direction: column;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: sticky;
      top: 0;
      z-index: 90;
      color: #64748B;
      overflow-y: auto;
      overflow-x: hidden;
      box-shadow: 2px 0 12px rgba(15, 23, 42, 0.02);

      &.collapsed {
        width: 72px;
        min-width: 72px;

        .brand-box {
          justify-content: center;
        }

        .nav-link {
          justify-content: center;
          padding: 0.65rem 0.5rem;
        }

        .sidebar-header {
          padding: 1rem 0.5rem;
          justify-content: center;
        }

        .collapse-toggle-btn {
          display: none;
        }

        .sidebar-footer {
          justify-content: center;
          padding: 0.85rem 0.5rem;
        }
      }

      &::-webkit-scrollbar {
        width: 3px;
      }
      &::-webkit-scrollbar-thumb {
        background: #E2E8F0;
      }
    }

    /* Header */
    .sidebar-header {
      padding: 1.15rem 1.25rem 0.95rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #F1F5F9;
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
    }

    .brand-logo-frame {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0B1528;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
      flex-shrink: 0;

      .official-logo {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .brand-edition {
      font-size: 0.7rem;
      color: #059669;
      font-weight: 600;
    }

    .collapse-toggle-btn {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #64748B;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #ECFDF5;
        border-color: #10B981;
        color: #059669;
      }
    }

    /* Active Tenant Indicator */
    .tenant-indicator {
      margin: 0.85rem 1rem 0.25rem 1rem;
      padding: 0.65rem 0.85rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .tenant-icon {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: #ECFDF5;
      color: #059669;
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
      color: #0284C7;
      font-weight: 700;
    }

    .tenant-name {
      font-size: 0.78rem;
      color: #0F172A;
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
      gap: 1.15rem;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-inline: 0.65rem;
      margin-bottom: 0.35rem;

      .title-text {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #94A3B8;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }

      .title-line {
        flex: 1;
        height: 1px;
        background: #F1F5F9;
      }
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
      padding: 0.45rem 0.65rem;
      border-radius: 8px;
      color: #475569;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.15s ease;

      &:hover {
        background: #F8FAFC;
        color: #0F172A;

        .nav-icon-box {
          background: #FFFFFF;
          border-color: #CBD5E1;
          color: #0F172A;
        }
      }

      &.active {
        background: #ECFDF5;
        color: #059669;
        font-weight: 700;

        .nav-icon-box {
          background: #10B981;
          border-color: #10B981;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
        }
      }
    }

    .nav-icon-box {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748B;
      transition: all 0.15s ease;
      flex-shrink: 0;

      .nav-icon {
        font-size: 0.9rem;
      }
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
      border-top: 1px solid #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: #FFFFFF;
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
      background: #ECFDF5;
      color: #059669;
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
      color: #0F172A;
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
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;

      &:hover {
        background: #FEF2F2;
        border-color: #FCA5A5;
        color: #EF4444;
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
