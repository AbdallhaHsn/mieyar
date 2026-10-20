import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService } from '../../core/services/company-context.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
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

      <!-- 2. Active Branch & Actions -->
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
