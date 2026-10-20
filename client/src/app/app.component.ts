import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './layout/header/header.component';
import { CompanyOnboardingComponent } from './features/company-onboarding/company-onboarding.component';
import { LanguageService } from './core/services/language.service';
import { CompanyContextService } from './core/services/company-context.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HeaderComponent, CompanyOnboardingComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  showOnboardingModal = false;

  constructor(
    public langService: LanguageService,
    public companyContext: CompanyContextService,
    public authService: AuthService
  ) {}

  openOnboarding() {
    this.showOnboardingModal = true;
  }

  closeOnboarding() {
    this.showOnboardingModal = false;
  }
}
