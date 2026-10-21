import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService } from '../../core/services/company-context.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="app-header glass-panel">
      <!-- 1. Company Brand & White-labeling Section -->
      <div class="brand-section">
        <div class="logo-container">
          <ng-container *ngIf="companyContext.activeCompany().logoUrl; else defaultLogo">
            <img [src]="companyContext.activeCompany().logoUrl" alt="Company Logo" class="custom-logo" />
          </ng-container>
          <ng-template #defaultLogo>
            <div class="ship-emblem">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
              </svg>
            </div>
          </ng-template>
        </div>

        <div class="company-info">
          <div class="company-name-row">
            <h1 class="company-name">
              {{ companyContext.companyName()(langService.currentLang()) }}
            </h1>
            <span class="badge-zatca">
              <i class="pi pi-shield"></i>
              {{ langService.t('status.zatcaCompliant') }}
            </span>
          </div>
          <div class="company-meta">
            <span>{{ langService.t('vat.number') }}: <strong>{{ companyContext.activeCompany().vatNumber }}</strong></span>
            <span class="divider">•</span>
            <span>{{ langService.t('cr.number') }}: <strong>{{ companyContext.activeCompany().commercialRegistration }}</strong></span>
          </div>
        </div>
      </div>

      <!-- 2. Middle Navigation Section: Dashboard Link -->
      <nav class="header-nav">
        <a 
          routerLink="/dashboard" 
          routerLinkActive="active" 
          class="dashboard-nav-btn"
          [title]="langService.currentLang() === 'ar' ? 'الذهاب إلى لوحة القيادة' : 'Go to Executive Dashboard'">
          <div class="nav-icon-circle">
            <i class="pi pi-th-large"></i>
          </div>
          <span class="nav-text">{{ langService.currentLang() === 'ar' ? 'لوحة القيادة' : 'Dashboard' }}</span>
        </a>
      </nav>

      <!-- 3. Active Branch & Actions -->
      <div class="actions-section">
        <!-- Branch Selector Badge -->
        <div class="branch-pill">
          <i class="pi pi-building"></i>
          <span class="branch-label">{{ langService.t('branch.select') }}:</span>
          <strong>{{ companyContext.branchName()(langService.currentLang()) }}</strong>
        </div>

        <!-- Language Switcher Button -->
        <button class="lang-toggle-btn" (click)="langService.toggleLanguage()" [title]="langService.t('action.switchLanguage')">
          <i class="pi pi-globe"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'English' : 'العربية' }}</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.75rem;
      margin: 1rem 1.25rem;
      border-radius: 16px;
      position: sticky;
      top: 1rem;
      z-index: 100;
      transition: all 0.3s ease;
      gap: 1rem;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .logo-container {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
      color: #ffffff;
      box-shadow: 0 8px 16px -4px rgba(15, 118, 110, 0.3);
      overflow: hidden;
      flex-shrink: 0;
    }

    .custom-logo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .ship-emblem svg {
      animation: gentle-spin 20s linear infinite;
    }

    @keyframes gentle-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .company-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .company-name-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .company-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .company-meta {
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .divider {
      color: #cbd5e1;
    }

    /* Middle Nav: Dashboard Button */
    .header-nav {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dashboard-nav-btn {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #F8FAFC;
      border: 1.5px solid #E2E8F0;
      padding: 0.45rem 1.15rem;
      border-radius: 9999px;
      color: #334155;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 700;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);

      .nav-icon-circle {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #ECFDF5;
        color: #059669;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.82rem;
        transition: all 0.2s ease;
      }

      &:hover {
        background: #F0FDF4;
        border-color: #10B981;
        color: #047857;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);

        .nav-icon-circle {
          background: #10B981;
          color: #FFFFFF;
        }
      }

      &.active {
        background: linear-gradient(135deg, #059669 0%, #10B981 100%);
        border-color: #059669;
        color: #FFFFFF;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.28);

        .nav-icon-circle {
          background: rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
        }
      }
    }

    /* Actions Section */
    .actions-section {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .branch-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f1f5f9;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      color: #334155;
      border: 1px solid #e2e8f0;
    }

    .branch-pill i {
      color: var(--primary-color);
    }

    .lang-toggle-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #ffffff;
      color: var(--primary-color);
      border: 1.5px solid var(--primary-color);
      padding: 0.5rem 1.15rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(15, 118, 110, 0.08);

      &:hover {
        background: var(--primary-color);
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);
      }
    }
  `]
})
export class HeaderComponent {
  constructor(
    public langService: LanguageService,
    public companyContext: CompanyContextService
  ) {}
}
