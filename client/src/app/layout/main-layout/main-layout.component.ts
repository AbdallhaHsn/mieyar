import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { CompanyOnboardingComponent } from '../../features/company-onboarding/company-onboarding.component';
import { LanguageService } from '../../core/services/language.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent, CompanyOnboardingComponent],
  template: `
    <div class="erp-shell" 
         [class.mobile-sidebar-open]="layoutService.isMobileSidebarOpen()" 
         [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      <!-- Mobile Backdrop -->
      <div class="mobile-sidebar-backdrop" 
           *ngIf="layoutService.isMobileSidebarOpen()" 
           (click)="layoutService.closeMobileSidebar()">
      </div>

      <!-- White & Clean Sidebar -->
      <app-sidebar></app-sidebar>

      <!-- Main Workspace with Subtle Geometric Green Drawings -->
      <div class="erp-stage geometric-bg">
        <!-- Clean White Topbar -->
        <app-topbar></app-topbar>

        <!-- Dynamic Content Router Host -->
        <main class="erp-content-host">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Onboarding Modal (Opens on demand only) -->
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
      height: 100vh;
      max-height: 100vh;
      background: #F8FAFC;
      color: #0F172A;
      font-family: var(--font-arabic);
      overflow: hidden;
      position: relative;
    }

    .erp-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
    }

    .erp-content-host {
      flex: 1;
      padding: 0.55rem 0.95rem;
      overflow-y: auto;
      overflow-x: hidden;
      min-width: 0;

      @media (max-width: 1023px) {
        padding: 0.5rem 0.75rem;
      }

      @media (max-width: 767px) {
        padding: 0.4rem 0.45rem;
      }
    }

    .mobile-sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(2px);
      z-index: 98;
      cursor: pointer;
    }
  `]
})
export class MainLayoutComponent {
  langService = inject(LanguageService);
  layoutService = inject(LayoutService);
  showOnboardingModal = false;

  openOnboardingModal() {
    this.showOnboardingModal = true;
  }

  closeOnboardingModal() {
    this.showOnboardingModal = false;
  }
}
