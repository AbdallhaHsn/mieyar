import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { CompanyOnboardingComponent } from '../../features/company-onboarding/company-onboarding.component';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent, CompanyOnboardingComponent],
  template: `
    <div class="erp-shell" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      <!-- White & Clean Sidebar -->
      <app-sidebar></app-sidebar>

      <!-- Main Workspace with Subtle Geometric Green Drawings -->
      <div class="erp-stage geometric-bg">
        <!-- Clean White Topbar -->
        <app-topbar (openQuickAction)="openOnboardingModal()"></app-topbar>

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
      min-height: 100vh;
      background: #F8FAFC;
      color: #0F172A;
      font-family: var(--font-arabic);
      overflow-x: hidden;
    }

    .erp-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 100vh;
    }

    .erp-content-host {
      flex: 1;
      padding: 1.75rem 2.25rem;
      overflow-y: auto;
    }
  `]
})
export class MainLayoutComponent {
  langService = inject(LanguageService);
  showOnboardingModal = false;

  openOnboardingModal() {
    this.showOnboardingModal = true;
  }

  closeOnboardingModal() {
    this.showOnboardingModal = false;
  }
}
