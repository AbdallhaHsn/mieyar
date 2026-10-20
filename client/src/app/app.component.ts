import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './layout/header/header.component';
import { LanguageService } from './core/services/language.service';
import { CompanyContextService } from './core/services/company-context.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  constructor(
    public langService: LanguageService,
    public companyContext: CompanyContextService
  ) {}
}
