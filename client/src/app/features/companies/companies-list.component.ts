import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyOnboardingComponent } from '../company-onboarding/company-onboarding.component';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService, Company } from '../../core/services/company-context.service';

interface TenantCompanyRow {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  vatNumber: string;
  crNumber: string;
  adminUserName: string;
  brandColor: string;
  currency: string;
  branchesCount: number;
  fiscalYear: string;
  status: 'Active' | 'Pending';
  zatcaPhase2Ready: boolean;
}

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CompanyOnboardingComponent],
  template: `
    <div class="companies-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="header-badge">
            <i class="pi pi-crown text-amber"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'صلاحيات الشركة المالكة للمنصة (Platform Owner)' : 'Platform Owner Privileges' }}</span>
          </div>
          <h1>{{ langService.currentLang() === 'ar' ? 'إدارة المنشآت والشركات المستأجرة' : 'Tenants & Companies Directory' }}</h1>
          <p>
            {{ langService.currentLang() === 'ar'
              ? 'إدارة اشتراكات المنشآت، تزويد مسؤولي الشركات ببيانات الدخول، وعزل بيانات كل شركة محاسبياً عبر SESSION_CONTEXT'
              : 'Provision tenant companies, assign administrator credentials, and maintain strict multi-tenant isolation' }}
          </p>
        </div>

        <button class="btn-create-company" (click)="openOnboarding()">
          <i class="pi pi-plus-circle"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'إضافة منشأة جديدة وتزويدها ببيانات الدخول' : 'Onboard New Company & Credentials' }}</span>
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="toolbar-card">
        <div class="search-field">
          <i class="pi pi-search"></i>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            [placeholder]="langService.currentLang() === 'ar' ? 'بحث باسم الشركة، الرقم الضريبي، السجل التجاري...' : 'Search by company name, VAT, CR...'" 
          />
        </div>

        <div class="toolbar-stats">
          <span class="stat-pill">
            <i class="pi pi-building"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'إجمالي المنشآت: ' : 'Total Tenants: ' }}<strong>{{ companies.length }}</strong></span>
          </span>
          <span class="stat-pill success">
            <i class="pi pi-check-circle"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'مطابقة لزكاة ودخل: ' : 'ZATCA Ready: ' }}<strong>{{ companies.length }} (100%)</strong></span>
          </span>
        </div>
      </div>

      <!-- Companies Table -->
      <div class="table-card">
        <div class="table-responsive">
          <table class="erp-table">
            <thead>
              <tr>
                <th>{{ langService.currentLang() === 'ar' ? 'المنشأة والرمز' : 'Company & Code' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الرقم الضريبي والسجل' : 'VAT & CR Number' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'المسؤول المالي' : 'Assigned Admin' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الفروع' : 'Branches' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'السنة المالية' : 'Fiscal Year' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'حالة ZATCA فاز 2' : 'ZATCA Status' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let comp of filteredCompanies">
                <!-- Company Name & Branding -->
                <td>
                  <div class="company-cell">
                    <div class="company-color-avatar" [style.background]="comp.brandColor">
                      <span>{{ comp.nameAr.charAt(5) || 'ش' }}</span>
                    </div>
                    <div class="company-names">
                      <strong class="ar-name">{{ comp.nameAr }}</strong>
                      <small class="en-name">{{ comp.nameEn }}</small>
                      <span class="code-badge">{{ comp.code }}</span>
                    </div>
                  </div>
                </td>

                <!-- Tax Info -->
                <td>
                  <div class="tax-cell">
                    <div class="tax-item">
                      <span class="lbl">{{ langService.t('vat.number') }}:</span>
                      <strong class="font-mono">{{ comp.vatNumber }}</strong>
                    </div>
                    <div class="tax-item">
                      <span class="lbl">{{ langService.t('cr.number') }}:</span>
                      <strong class="font-mono">{{ comp.crNumber }}</strong>
                    </div>
                  </div>
                </td>

                <!-- Admin User -->
                <td>
                  <div class="admin-cell">
                    <i class="pi pi-user-check text-cyan"></i>
                    <span class="font-mono">{{ comp.adminUserName }}</span>
                  </div>
                </td>

                <!-- Branches -->
                <td>
                  <span class="badge-count">
                    <i class="pi pi-sitemap"></i>
                    {{ comp.branchesCount }} {{ langService.currentLang() === 'ar' ? 'فروع' : 'branches' }}
                  </span>
                </td>

                <!-- Fiscal Year -->
                <td>
                  <span class="badge-fiscal">{{ comp.fiscalYear }}</span>
                </td>

                <!-- ZATCA Phase 2 -->
                <td>
                  <span class="badge-zatca-tag">
                    <i class="pi pi-shield"></i>
                    {{ langService.currentLang() === 'ar' ? 'معتمد فاز 2' : 'Phase 2 Verified' }}
                  </span>
                </td>

                <!-- Actions -->
                <td>
                  <div class="actions-cell">
                    <button class="btn-switch-tenant" (click)="switchToTenant(comp)" [title]="langService.currentLang() === 'ar' ? 'التبديل إلى بيئة هذه الشركة والعمل بها' : 'Switch context to this tenant'">
                      <i class="pi pi-external-link"></i>
                      <span>{{ langService.currentLang() === 'ar' ? 'دخول نيابة عنها' : 'Impersonate' }}</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Onboarding Modal -->
      <app-company-onboarding *ngIf="showOnboardingModal" (closed)="closeOnboarding()"></app-company-onboarding>
    </div>
  `,
  styles: [`
    .companies-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 1440px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      h1 {
        font-size: 1.75rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
      }
      p {
        font-size: 0.9rem;
        color: #94a3b8;
        margin: 0;
        max-width: 750px;
      }
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      width: fit-content;
    }

    .text-amber { color: #f59e0b; }
    .text-cyan { color: #38bdf8; }
    .font-mono { font-family: monospace; }

    .btn-create-company {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: linear-gradient(135deg, var(--primary-color, #0f766e) 0%, #14b8a6 100%);
      color: #ffffff;
      border: none;
      padding: 0.75rem 1.35rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(15, 118, 110, 0.35);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(15, 118, 110, 0.45);
      }
    }

    /* Toolbar */
    .toolbar-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .search-field {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(2, 6, 23, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.5rem 1rem;
      flex: 1;
      max-width: 450px;

      i {
        color: #64748b;
      }

      input {
        background: transparent;
        border: none;
        color: #ffffff;
        outline: none;
        width: 100%;
        font-size: 0.85rem;

        &::placeholder {
          color: #64748b;
        }
      }
    }

    .toolbar-stats {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.06);
      padding: 0.35rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #94a3b8;

      strong {
        color: #ffffff;
      }

      &.success {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.25);
        color: #34d399;
      }
    }

    /* Table Card */
    .table-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.25rem;
      backdrop-filter: blur(10px);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .erp-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        padding: 0.85rem 1rem;
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #94a3b8;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      td {
        padding: 1rem;
        font-size: 0.85rem;
        color: #cbd5e1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        vertical-align: middle;
      }

      tr:hover td {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    /* Company Cell */
    .company-cell {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .company-color-avatar {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 1.1rem;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
      flex-shrink: 0;
    }

    .company-names {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;

      .ar-name {
        color: #ffffff;
        font-size: 0.9rem;
      }
      .en-name {
        color: #94a3b8;
        font-size: 0.75rem;
        font-family: var(--font-latin);
      }
    }

    .code-badge {
      display: inline-block;
      width: fit-content;
      background: rgba(255, 255, 255, 0.08);
      color: #38bdf8;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      margin-top: 0.2rem;
    }

    /* Tax Cell */
    .tax-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .tax-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;

      .lbl {
        color: #64748b;
      }
      strong {
        color: #e2e8f0;
      }
    }

    /* Admin Cell */
    .admin-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(2, 6, 23, 0.4);
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      width: fit-content;
      font-size: 0.8rem;
    }

    .badge-count {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(59, 130, 246, 0.12);
      color: #60a5fa;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
    }

    .badge-fiscal {
      background: rgba(255, 255, 255, 0.06);
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.78rem;
      color: #cbd5e1;
    }

    .badge-zatca-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* Actions */
    .btn-switch-tenant {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(37, 99, 235, 0.15);
      border: 1px solid rgba(37, 99, 235, 0.35);
      color: #60a5fa;
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #2563eb;
        color: #ffffff;
      }
    }
  `]
})
export class CompaniesListComponent {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  companyContext = inject(CompanyContextService);

  searchQuery = '';
  showOnboardingModal = false;

  companies: TenantCompanyRow[] = [
    {
      id: '11111111-2222-3333-4444-555555555555',
      code: 'KHALEEJ-01',
      nameAr: 'شركة الخليج للحلول والتقنية المحدودة',
      nameEn: 'Al-Khaleej Solutions & Tech Ltd.',
      vatNumber: '310987654300003',
      crNumber: '1010998877',
      adminUserName: 'alkhaleej_admin',
      brandColor: '#2563eb',
      currency: 'SAR',
      branchesCount: 2,
      fiscalYear: '2026',
      status: 'Active',
      zatcaPhase2Ready: true
    },
    {
      id: '22222222-3333-4444-5555-666666666666',
      code: 'NAHDA-02',
      nameAr: 'مؤسسة النهضة للتجارة والتوريدات العامة',
      nameEn: 'Al-Nahda Trading & Supplies Est.',
      vatNumber: '310112233400003',
      crNumber: '1010665544',
      adminUserName: 'nahda_cfo',
      brandColor: '#059669',
      currency: 'SAR',
      branchesCount: 3,
      fiscalYear: '2026',
      status: 'Active',
      zatcaPhase2Ready: true
    },
    {
      id: '33333333-4444-5555-6666-777777777777',
      code: 'RAWASI-03',
      nameAr: 'شركة رواسي التنمية للمقاولات والاستثمار',
      nameEn: 'Rawasi Contracting & Investment Co.',
      vatNumber: '310554433200003',
      crNumber: '1010332211',
      adminUserName: 'rawasi_finance',
      brandColor: '#d97706',
      currency: 'SAR',
      branchesCount: 1,
      fiscalYear: '2026',
      status: 'Active',
      zatcaPhase2Ready: true
    }
  ];

  get filteredCompanies() {
    if (!this.searchQuery) return this.companies;
    const q = this.searchQuery.toLowerCase();
    return this.companies.filter(c => 
      c.nameAr.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.vatNumber.includes(q) ||
      c.crNumber.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  }

  openOnboarding() {
    this.showOnboardingModal = true;
  }

  closeOnboarding() {
    this.showOnboardingModal = false;
  }

  switchToTenant(comp: TenantCompanyRow) {
    const tenantCompany: Company = {
      id: comp.id,
      code: comp.code,
      nameAr: comp.nameAr,
      nameEn: comp.nameEn,
      vatNumber: comp.vatNumber,
      commercialRegistration: comp.crNumber,
      currencyCode: comp.currency,
      brandThemeColor: comp.brandColor,
      branches: [
        {
          id: comp.id + '-b1',
          code: 'MAIN',
          nameAr: 'الفرع الرئيسي',
          nameEn: 'Main Branch',
          isMainBranch: true
        }
      ],
      fiscalYears: []
    };

    this.companyContext.setCompany(tenantCompany);
  }
}
