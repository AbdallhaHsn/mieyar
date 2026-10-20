import { Component, inject, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService, Branch } from '../../core/services/company-context.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="erp-topbar">
      <!-- Left Side: Search & Breadcrumbs -->
      <div class="topbar-left">
        <!-- Global Command Palette Search -->
        <div class="search-box">
          <i class="pi pi-search search-icon"></i>
          <input 
            type="text" 
            [placeholder]="langService.currentLang() === 'ar' ? 'بحث سريع في الحسابات، القيود، الفواتير... (Ctrl + K)' : 'Search accounts, entries, invoices... (Ctrl + K)'" 
          />
          <span class="search-kbd">⌘K</span>
        </div>
      </div>

      <!-- Right Side: Company & Branch Switcher, ZATCA Shield, Notifications, User Menu -->
      <div class="topbar-right">
        <!-- ZATCA Phase 2 Live Compliance Shield -->
        <div class="zatca-live-shield">
          <span class="live-pulse-dot"></span>
          <i class="pi pi-shield"></i>
          <div class="shield-text">
            <span class="shield-title">ZATCA Phase 2</span>
            <small class="shield-sub">{{ langService.currentLang() === 'ar' ? 'متصل ومعتمد' : 'Online & Cleared' }}</small>
          </div>
        </div>

        <!-- Active Branch Selector Pill -->
        <div class="branch-selector" (click)="cycleBranch()">
          <i class="pi pi-building"></i>
          <div class="branch-info">
            <span class="branch-label">{{ langService.t('branch.select') }}</span>
            <strong class="branch-value">{{ companyContext.branchName()(langService.currentLang()) }}</strong>
          </div>
          <i class="pi pi-chevron-down text-muted"></i>
        </div>

        <!-- Quick Action "+ قيد جديد" / "+ فاتورة" -->
        <button class="btn-quick-action" (click)="openQuickAction.emit()">
          <i class="pi pi-plus-circle"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'إجراء سريع' : 'Quick Action' }}</span>
        </button>

        <!-- Notification Bell -->
        <div class="icon-btn-wrapper">
          <button class="icon-btn" title="التنبيهات">
            <i class="pi pi-bell"></i>
            <span class="badge-dot">3</span>
          </button>
        </div>

        <!-- Language Switcher -->
        <button class="icon-btn lang-btn" (click)="langService.toggleLanguage()" [title]="langService.t('action.switchLanguage')">
          <i class="pi pi-globe"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'EN' : 'عربي' }}</span>
        </button>

        <!-- User Profile Pill -->
        <div class="user-profile-pill">
          <div class="profile-avatar" [class.super]="authService.isSuperAdmin()">
            <i class="pi" [ngClass]="authService.isSuperAdmin() ? 'pi-crown' : 'pi-user'"></i>
          </div>
          <div class="profile-info">
            <span class="profile-name">
              {{ langService.currentLang() === 'ar' ? authService.currentUser()?.fullNameAr : authService.currentUser()?.fullNameEn }}
            </span>
            <span class="profile-role">
              {{ authService.isSuperAdmin() 
                ? (langService.currentLang() === 'ar' ? 'الشركة المالكة' : 'Platform Owner') 
                : (langService.currentLang() === 'ar' ? 'مدير المنشأة' : 'Tenant Admin') }}
            </span>
          </div>
          <button class="logout-mini-btn" (click)="authService.logout()" title="تسجيل الخروج">
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .erp-topbar {
      height: 64px;
      background: #0d1527;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 80;
      color: #e2e8f0;
      backdrop-filter: blur(12px);
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      max-width: 480px;
    }

    .search-box {
      width: 100%;
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        inset-inline-start: 0.95rem;
        color: #64748b;
        font-size: 0.9rem;
      }

      input {
        width: 100%;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        color: #ffffff;
        font-size: 0.85rem;
        padding: 0.55rem 2.5rem;
        outline: none;
        transition: all 0.2s ease;

        &:focus {
          border-color: var(--primary-light, #14b8a6);
          background: rgba(15, 23, 42, 0.9);
          box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
        }

        &::placeholder {
          color: #64748b;
        }
      }

      .search-kbd {
        position: absolute;
        inset-inline-end: 0.75rem;
        background: rgba(255, 255, 255, 0.08);
        color: #94a3b8;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    /* ZATCA Phase 2 Live Shield */
    .zatca-live-shield {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 0.4rem 0.85rem;
      border-radius: 9999px;
      color: #34d399;

      i {
        font-size: 1rem;
      }
    }

    .live-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse-ring 2s infinite;
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    .shield-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;

      .shield-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: #ecfdf5;
      }
      .shield-sub {
        font-size: 0.65rem;
        color: #6ee7b7;
      }
    }

    /* Branch selector */
    .branch-selector {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.35rem 0.85rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(15, 23, 42, 0.9);
      }

      i.pi-building {
        color: var(--primary-light, #14b8a6);
        font-size: 0.95rem;
      }
    }

    .branch-info {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .branch-label {
      font-size: 0.65rem;
      color: #64748b;
    }

    .branch-value {
      font-size: 0.8rem;
      color: #f1f5f9;
      font-weight: 600;
    }

    .text-muted {
      font-size: 0.7rem;
      color: #64748b;
    }

    /* Quick Action Button */
    .btn-quick-action {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      background: linear-gradient(135deg, var(--primary-color, #0f766e) 0%, #14b8a6 100%);
      color: #ffffff;
      border: none;
      padding: 0.45rem 0.95rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(15, 118, 110, 0.3);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15, 118, 110, 0.4);
      }
    }

    /* Icon Buttons */
    .icon-btn-wrapper {
      position: relative;
    }

    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
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

    .lang-btn {
      width: auto;
      padding: 0 0.75rem;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .badge-dot {
      position: absolute;
      top: -3px;
      inset-inline-end: -3px;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 700;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #0d1527;
    }

    /* User Profile Pill */
    .user-profile-pill {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.3rem 0.6rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
    }

    .profile-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.25);
      color: #60a5fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;

      &.super {
        background: rgba(245, 158, 11, 0.25);
        color: #fbbf24;
      }
    }

    .profile-info {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .profile-name {
      font-size: 0.78rem;
      font-weight: 600;
      color: #ffffff;
      max-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .profile-role {
      font-size: 0.65rem;
      color: #94a3b8;
    }

    .logout-mini-btn {
      background: transparent;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.75;
      transition: opacity 0.2s ease;

      &:hover {
        opacity: 1;
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
