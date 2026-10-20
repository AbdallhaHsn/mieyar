import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="erp-topbar">
      <!-- Search Input -->
      <div class="topbar-search">
        <i class="pi pi-search search-icon"></i>
        <input 
          type="text" 
          [placeholder]="langService.currentLang() === 'ar' ? 'بحث سريع... (Ctrl + K)' : 'Search... (Ctrl + K)'" 
        />
      </div>

      <!-- Right Action Items -->
      <div class="topbar-actions">
        <!-- ZATCA Phase 2 Badge -->
        <div class="zatca-pill">
          <span class="pulse-dot"></span>
          <span class="zatca-label">ZATCA 2</span>
          <small class="zatca-state">{{ langService.currentLang() === 'ar' ? 'متصل' : 'Active' }}</small>
        </div>

        <!-- Active Branch -->
        <div class="branch-pill" (click)="cycleBranch()" title="تبديل الفرع">
          <i class="pi pi-map-marker text-cyan"></i>
          <span>{{ companyContext.branchName()(langService.currentLang()) }}</span>
          <i class="pi pi-chevron-down text-muted"></i>
        </div>

        <!-- Language Switcher -->
        <button class="lang-btn" (click)="langService.toggleLanguage()">
          {{ langService.currentLang() === 'ar' ? 'English' : 'العربية' }}
        </button>

        <!-- User Profile -->
        <div class="user-pill">
          <div class="user-avatar">
            <i class="pi pi-user"></i>
          </div>
          <span class="user-name">
            {{ langService.currentLang() === 'ar' ? authService.currentUser()?.fullNameAr : authService.currentUser()?.fullNameEn }}
          </span>
          <button class="logout-btn" (click)="authService.logout()" title="خروج">
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .erp-topbar {
      height: 60px;
      background: #090D17;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.75rem;
      position: sticky;
      top: 0;
      z-index: 80;
    }

    .topbar-search {
      position: relative;
      width: 320px;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        inset-inline-start: 0.85rem;
        color: #64748B;
        font-size: 0.85rem;
      }

      input {
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        color: #FFFFFF;
        font-size: 0.825rem;
        padding: 0.45rem 2.25rem;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;

        &:focus {
          border-color: #00F5A0;
          box-shadow: 0 0 10px rgba(0, 245, 160, 0.15);
          background: rgba(255, 255, 255, 0.05);
        }

        &::placeholder {
          color: #475569;
        }
      }
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 1.15rem;
    }

    /* ZATCA Pill */
    .zatca-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(0, 245, 160, 0.08);
      border: 1px solid rgba(0, 245, 160, 0.25);
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #00F5A0;
      box-shadow: 0 0 8px #00F5A0;
    }

    .zatca-label {
      color: #FFFFFF;
      font-weight: 700;
      font-family: var(--font-latin);
    }

    .zatca-state {
      color: #00F5A0;
      font-weight: 600;
    }

    /* Branch Pill */
    .branch-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #CBD5E1;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: rgba(0, 240, 255, 0.3);
        color: #FFFFFF;
      }
    }

    .text-cyan {
      color: #00F0FF;
    }

    .text-muted {
      color: #64748B;
      font-size: 0.65rem;
    }

    /* Lang Btn */
    .lang-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #CBD5E1;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: #00F5A0;
        color: #00F5A0;
      }
    }

    /* User Pill */
    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
    }

    .user-avatar {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: rgba(0, 245, 160, 0.12);
      color: #00F5A0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
    }

    .user-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: #FFFFFF;
      max-width: 130px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .logout-btn {
      background: transparent;
      border: none;
      color: #64748B;
      cursor: pointer;
      padding: 0.15rem;
      display: flex;
      align-items: center;
      transition: color 0.15s ease;

      &:hover {
        color: #FF4757;
      }
    }
  `]
})
export class TopbarComponent {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  companyContext = inject(CompanyContextService);
  router = inject(Router);

  @Output() openQuickAction = new EventEmitter<void>();

  cycleBranch() {
    const branches = this.companyContext.activeCompany().branches;
    if (!branches || branches.length <= 1) return;

    const current = this.companyContext.activeBranch();
    const idx = branches.findIndex(b => b.id === current.id);
    const nextIdx = (idx + 1) % branches.length;
    this.companyContext.setBranch(branches[nextIdx]);
  }
}
