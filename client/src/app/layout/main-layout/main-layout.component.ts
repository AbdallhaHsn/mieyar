import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { CompanyOnboardingComponent } from '../../features/company-onboarding/company-onboarding.component';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService } from '../../core/services/company-context.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent, CompanyOnboardingComponent],
  template: `
    <div class="erp-shell" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      <!-- Collapsible Enterprise Sidebar -->
      <app-sidebar></app-sidebar>

      <!-- Main Content Stage -->
      <div class="erp-stage">
        <!-- Enterprise Topbar -->
        <app-topbar (openQuickAction)="handleQuickAction()"></app-topbar>

        <!-- Platform Owner Impersonation/Support Notification Ribbon -->
        <div class="platform-owner-ribbon" *ngIf="authService.isSuperAdmin()">
          <div class="ribbon-content">
            <div class="ribbon-label">
              <i class="pi pi-crown"></i>
              <span>
                {{ langService.currentLang() === 'ar' 
                  ? 'أنت تعمل بصلاحيات الشركة المالكة للمشروع (الوصول الشامل لكافة الشركات والبيانات المحاسبية)' 
                  : 'Operating under Platform Owner Privileges (Universal Access to all Tenants & Ledgers)' }}
              </span>
            </div>
            <button class="ribbon-btn" (click)="openOnboardingModal()">
              <i class="pi pi-plus"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'إضافة شركة مستأجرة جديدة' : 'Onboard New Tenant' }}</span>
            </button>
          </div>
        </div>

        <!-- Router Outlet Content Host -->
        <main class="erp-content-host">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Global Onboarding Modal -->
      <app-company-onboarding 
        *ngIf="showOnboardingModal" 
        (closed)="closeOnboardingModal()">
      </app-company-onboarding>
    </div>
  `,
  styles: [`
    .erp-shell {
      display: flex;
      width: 100vw;
      min-height: 100vh;
      background: #060b18;
      color: #f1f5f9;
      font-family: var(--font-arabic);
      overflow-x: hidden;
    }

    .erp-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: radial-gradient(circle at top right, rgba(15, 118, 110, 0.04) 0%, transparent 60%),
                  #070d1e;
    }

    .platform-owner-ribbon {
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%);
      border-bottom: 1px solid rgba(245, 158, 11, 0.3);
      padding: 0.5rem 1.5rem;
    }

    .ribbon-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .ribbon-label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.8rem;
      color: #fbbf24;
      font-weight: 600;

      i {
        font-size: 0.95rem;
      }
    }

    .ribbon-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #f59e0b;
      color: #000000;
      border: none;
      padding: 0.35rem 0.85rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #fbbf24;
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
      }
    }

    .erp-content-host {
      flex: 1;
      padding: 1.5rem 1.75rem;
      overflow-y: auto;
    }
  `]
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  companyContext = inject(CompanyContextService);

  showOnboardingModal = false;

  handleQuickAction() {
    if (this.authService.isSuperAdmin()) {
      this.openOnboardingModal();
    }
  }

  openOnboardingModal() {
    this.showOnboardingModal = true;
  }

  closeOnboardingModal() {
    this.showOnboardingModal = false;
  }
}
