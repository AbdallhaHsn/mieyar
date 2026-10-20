import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService, Company } from '../../core/services/company-context.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-company-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-content glass-panel" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="title-wrap">
            <div class="icon-badge">
              <i class="pi pi-building-columns"></i>
            </div>
            <div>
              <h2>{{ langService.currentLang() === 'ar' ? 'تأسيس شركة جديدة وتعيين مسؤولها الأول' : 'Onboard New Company & Administrator' }}</h2>
              <p class="subtitle">{{ langService.currentLang() === 'ar' ? 'بصفتك الشركة المالكة، يمكنك تسجيل شركة وتزويدها بحساب وصول مستقل' : 'As the platform owner, register a tenant company and provision its login credentials' }}</p>
            </div>
          </div>
          <button class="close-btn" (click)="close()"><i class="pi pi-times"></i></button>
        </div>

        <form (ngSubmit)="submit()" class="onboarding-form">
          <!-- Section 1: Company Profile -->
          <div class="form-section">
            <h4 class="section-title">
              <i class="pi pi-briefcase"></i>
              {{ langService.currentLang() === 'ar' ? '1. بيانات الشركة والهوية البصرية' : '1. Company Profile & Branding' }}
            </h4>

            <div class="grid-2">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'الاسم الرسمي (عربي) *' : 'Company Name (Arabic) *' }}</label>
                <input type="text" [(ngModel)]="model.nameAr" name="nameAr" required placeholder="مثال: شركة الرواد للمقاولات" />
              </div>
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'الاسم الرسمي (إنجليزي) *' : 'Company Name (English) *' }}</label>
                <input type="text" [(ngModel)]="model.nameEn" name="nameEn" required placeholder="e.g. Al-Rowad Contracting Co." />
              </div>
            </div>

            <div class="grid-3">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'كود الشركة *' : 'Company Code *' }}</label>
                <input type="text" [(ngModel)]="model.code" name="code" required placeholder="ROWAD01" />
              </div>
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'الرقم الضريبي (15 رقماً) *' : 'VAT Number (15 digits) *' }}</label>
                <input type="text" [(ngModel)]="model.vatNumber" name="vatNumber" required placeholder="310998877600003" />
              </div>
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'السجل التجاري *' : 'C.R. Number *' }}</label>
                <input type="text" [(ngModel)]="model.commercialRegistration" name="commercialRegistration" required placeholder="1010887766" />
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'رابط شعار الشركة (Logo URL)' : 'Company Logo URL' }}</label>
                <input type="text" [(ngModel)]="model.logoUrl" name="logoUrl" placeholder="https://.../logo.png" />
              </div>
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'لون هوية النظام المخصص (Brand Color)' : 'Brand Theme Color' }}</label>
                <div class="color-picker-wrap">
                  <input type="color" [(ngModel)]="model.brandThemeColor" name="brandThemeColor" />
                  <span class="color-code">{{ model.brandThemeColor }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Initial Company Administrator -->
          <div class="form-section highlight">
            <h4 class="section-title">
              <i class="pi pi-user-plus text-primary"></i>
              {{ langService.currentLang() === 'ar' ? '2. بيانات الحساب الإداري الأول للشركة (لتمكينهم من الدخول)' : '2. Initial Company Admin Credentials (Login Access)' }}
            </h4>

            <div class="grid-2">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'اسم المسؤول (عربي) *' : 'Admin Name (Arabic) *' }}</label>
                <input type="text" [(ngModel)]="model.adminFullNameAr" name="adminFullNameAr" required placeholder="سليمان العبدالله" />
              </div>
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'اسم المسؤول (إنجليزي) *' : 'Admin Name (English) *' }}</label>
                <input type="text" [(ngModel)]="model.adminFullNameEn" name="adminFullNameEn" required placeholder="Sulaiman Al-Abdullah" />
              </div>
            </div>

            <div class="grid-3">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'اسم المستخدم للدخول *' : 'Login Username *' }}</label>
                <input type="text" [(ngModel)]="model.adminUserName" name="adminUserName" required placeholder="admin_rowad" />
              </div>
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *' }}</label>
                <input type="email" [(ngModel)]="model.adminEmail" name="adminEmail" required placeholder="admin@alrowad.com" />
              </div>
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'كلمة المرور الابتدائية *' : 'Initial Password *' }}</label>
                <input type="password" [(ngModel)]="model.adminPassword" name="adminPassword" required placeholder="••••••••" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="button" class="btn-cancel" (click)="close()">
              {{ langService.t('action.cancel') }}
            </button>
            <button type="submit" class="btn-primary" [disabled]="!model.nameAr || !model.adminUserName || !model.adminPassword">
              <i class="pi pi-check"></i>
              {{ langService.currentLang() === 'ar' ? 'تأسيس الشركة وتوليد صلاحيات الدخول' : 'Onboard Company & Create Access' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-content {
      width: 100%;
      max-width: 780px;
      max-height: 90vh;
      overflow-y: auto;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(226, 232, 240, 0.9);
      padding: 2rem;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid #f1f5f9;

      .title-wrap {
        display: flex;
        gap: 1rem;
        align-items: center;

        .icon-badge {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f0fdfa;
          color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
        }

        h2 {
          font-size: 1.35rem;
          color: var(--text-main);
          font-weight: 700;
          margin: 0;
        }

        .subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }
      }

      .close-btn {
        background: transparent;
        border: none;
        font-size: 1.25rem;
        color: #94a3b8;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        transition: all 0.2s;

        &:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
      }
    }

    .form-section {
      margin-bottom: 1.5rem;
      padding: 1.25rem;
      border-radius: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;

      &.highlight {
        background: #f0fdfa;
        border-color: #99f6e4;
      }

      .section-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-main);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 0.85rem;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 0.85rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      label {
        font-size: 0.825rem;
        font-weight: 600;
        color: #334155;
      }

      input[type="text"],
      input[type="email"],
      input[type="password"] {
        padding: 0.65rem 0.85rem;
        border-radius: 8px;
        border: 1.5px solid #cbd5e1;
        font-size: 0.9rem;
        outline: none;
        transition: all 0.2s;

        &:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15);
        }
      }
    }

    .color-picker-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      input[type="color"] {
        width: 44px;
        height: 40px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }

      .color-code {
        font-family: monospace;
        font-weight: 700;
        color: #475569;
      }
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid #f1f5f9;

      .btn-cancel {
        padding: 0.75rem 1.5rem;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #475569;
        font-weight: 600;
        cursor: pointer;
      }

      .btn-primary {
        padding: 0.75rem 1.75rem;
        border-radius: 10px;
        border: none;
        background: var(--primary-color);
        color: #ffffff;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 4px 14px rgba(15, 118, 110, 0.25);

        &:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }
  `]
})
export class CompanyOnboardingComponent {
  @Output() closed = new EventEmitter<void>();

  model = {
    code: 'ROWAD01',
    nameAr: 'شركة الرواد للتقنية والحلول المالية',
    nameEn: 'Al-Rowad Financial Tech & Solutions',
    vatNumber: '310998877600003',
    commercialRegistration: '1010887766',
    currencyCode: 'SAR',
    logoUrl: '',
    brandThemeColor: '#2563eb', // Royal Blue branding for demonstration
    adminFullNameAr: 'سليمان بن إبراهيم',
    adminFullNameEn: 'Sulaiman Ibrahim',
    adminUserName: 'admin_rowad',
    adminEmail: 'admin@alrowad.com',
    adminPassword: 'Password123!',
    phoneNumber: '+966501234567'
  };

  constructor(
    public langService: LanguageService,
    private companyContext: CompanyContextService,
    private authService: AuthService
  ) {}

  close() {
    this.closed.emit();
  }

  submit() {
    // 1. Simulate API onboarding response & dynamic switch
    const newCompany: Company = {
      id: '22222222-3333-4444-5555-666666666666',
      code: this.model.code,
      nameAr: this.model.nameAr,
      nameEn: this.model.nameEn,
      vatNumber: this.model.vatNumber,
      commercialRegistration: this.model.commercialRegistration,
      currencyCode: this.model.currencyCode,
      logoUrl: this.model.logoUrl,
      brandThemeColor: this.model.brandThemeColor,
      branches: [
        {
          id: 'b-main-rowad',
          code: 'MAIN',
          nameAr: 'الفرع الرئيسي',
          nameEn: 'Main Branch',
          isMainBranch: true
        }
      ],
      fiscalYears: [
        {
          id: 'fy-2026-rowad',
          yearNumber: 2026,
          nameAr: 'السنة المالية 2026',
          nameEn: 'Fiscal Year 2026',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          isClosed: false,
          periods: []
        }
      ]
    };

    // 2. Add to available companies
    this.companyContext.availableCompanies.update(list => [...list, newCompany]);

    // 3. Log in as this new company admin to demonstrate instant white-labeling!
    this.authService.loginAsCompanyAdmin({
      id: newCompany.id,
      userName: this.model.adminUserName,
      fullNameAr: this.model.adminFullNameAr,
      fullNameEn: this.model.adminFullNameEn,
      companyNameAr: newCompany.nameAr,
      companyNameEn: newCompany.nameEn,
      logoUrl: newCompany.logoUrl,
      brandColor: newCompany.brandThemeColor
    });

    this.close();
  }
}
