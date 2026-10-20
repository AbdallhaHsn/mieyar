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
  branchesCount: number;
  fiscalYear: string;
}

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CompanyOnboardingComponent],
  template: `
    <div class="companies-wrap">
      <!-- Minimalist Header -->
      <div class="page-top">
        <div>
          <h1 class="page-title">
            {{ langService.currentLang() === 'ar' ? 'إدارة المنشآت والشركات المستأجرة' : 'Tenants & Companies Directory' }}
          </h1>
          <span class="page-sub">
            {{ langService.currentLang() === 'ar' ? 'عزل كامل للبيانات المحاسبية عبر SESSION_CONTEXT وتزويد مدراء الشركات ببيانات الدخول' : 'Multi-tenant isolation & credential provisioning' }}
          </span>
        </div>

        <button class="btn-create" (click)="openOnboarding()">
          <i class="pi pi-plus"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'إضافة منشأة جديدة' : 'Onboard Company' }}</span>
        </button>
      </div>

      <!-- Search & Counter Bar -->
      <div class="toolbar">
        <div class="search-box">
          <i class="pi pi-search"></i>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            [placeholder]="langService.currentLang() === 'ar' ? 'بحث بالاسم، الرقم الضريبي، السجل التجاري...' : 'Search company, VAT, CR...'" 
          />
        </div>

        <div class="count-tag">
          {{ langService.currentLang() === 'ar' ? 'الشركات النشطة: ' : 'Active Tenants: ' }}
          <strong class="text-cyber-green">{{ companies.length }}</strong>
        </div>
      </div>

      <!-- Companies Table -->
      <div class="table-card">
        <div class="table-responsive">
          <table class="clean-table">
            <thead>
              <tr>
                <th>{{ langService.currentLang() === 'ar' ? 'الشركة والرمز' : 'Company & Code' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الرقم الضريبي' : 'VAT Number' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'السجل التجاري' : 'CR Number' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'المسؤول' : 'Admin' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الفروع' : 'Branches' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'ZATCA فاز 2' : 'ZATCA' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الإجراء' : 'Action' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let comp of filteredCompanies">
                <td>
                  <div class="comp-col">
                    <strong class="text-white">{{ comp.nameAr }}</strong>
                    <small class="code-pill font-mono">{{ comp.code }}</small>
                  </div>
                </td>
                <td class="font-mono text-white">{{ comp.vatNumber }}</td>
                <td class="font-mono text-white">{{ comp.crNumber }}</td>
                <td><span class="user-pill font-mono text-cyber-cyan">{{ comp.adminUserName }}</span></td>
                <td><span class="branch-count">{{ comp.branchesCount }}</span></td>
                <td><span class="badge-active">100%</span></td>
                <td>
                  <button class="btn-impersonate" (click)="switchToTenant(comp)">
                    <i class="pi pi-external-link"></i>
                    <span>{{ langService.currentLang() === 'ar' ? 'دخول نيابة عنها' : 'Impersonate' }}</span>
                  </button>
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
    .companies-wrap {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .page-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #FFFFFF;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .page-sub {
      font-size: 0.8rem;
      color: #64748B;
    }

    .btn-create {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      background: #00F5A0;
      color: #070B14;
      border: none;
      padding: 0.55rem 1.15rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 0 15px rgba(0, 245, 160, 0.25);
      transition: all 0.2s ease;

      &:hover {
        background: #5CFFC6;
        box-shadow: 0 0 20px rgba(0, 245, 160, 0.4);
      }
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: #0D1424;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 10px;
      padding: 0.75rem 1rem;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 0.4rem 0.85rem;
      flex: 1;
      max-width: 420px;

      i {
        color: #64748B;
        font-size: 0.85rem;
      }

      input {
        background: transparent;
        border: none;
        color: #FFFFFF;
        outline: none;
        width: 100%;
        font-size: 0.825rem;

        &::placeholder {
          color: #475569;
        }
      }
    }

    .count-tag {
      font-size: 0.825rem;
      color: #94A3B8;
    }

    /* Table */
    .table-card {
      background: #0D1424;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 1.25rem;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .clean-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        padding: 0.75rem 1rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #64748B;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      td {
        padding: 0.95rem 1rem;
        font-size: 0.825rem;
        color: #CBD5E1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        vertical-align: middle;
      }

      tr:hover td {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    .comp-col {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .code-pill {
      font-size: 0.7rem;
      color: #00F0FF;
      background: rgba(0, 240, 255, 0.08);
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      width: fit-content;
    }

    .user-pill {
      background: rgba(255, 255, 255, 0.04);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.78rem;
    }

    .branch-count {
      background: rgba(255, 255, 255, 0.04);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.78rem;
      color: #FFFFFF;
    }

    .badge-active {
      background: rgba(0, 245, 160, 0.1);
      color: #00F5A0;
      border: 1px solid rgba(0, 245, 160, 0.25);
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .btn-impersonate {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: transparent;
      border: 1px solid rgba(0, 240, 255, 0.3);
      color: #00F0FF;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: rgba(0, 240, 255, 0.1);
        border-color: #00F0FF;
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
      branchesCount: 2,
      fiscalYear: '2026'
    },
    {
      id: '22222222-3333-4444-5555-666666666666',
      code: 'NAHDA-02',
      nameAr: 'مؤسسة النهضة للتجارة والتوريدات العامة',
      nameEn: 'Al-Nahda Trading & Supplies Est.',
      vatNumber: '310112233400003',
      crNumber: '1010665544',
      adminUserName: 'nahda_cfo',
      branchesCount: 3,
      fiscalYear: '2026'
    },
    {
      id: '33333333-4444-5555-6666-777777777777',
      code: 'RAWASI-03',
      nameAr: 'شركة رواسي التنمية للمقاولات والاستثمار',
      nameEn: 'Rawasi Contracting & Investment Co.',
      vatNumber: '310554433200003',
      crNumber: '1010332211',
      adminUserName: 'rawasi_finance',
      branchesCount: 1,
      fiscalYear: '2026'
    }
  ];

  get filteredCompanies() {
    if (!this.searchQuery) return this.companies;
    const q = this.searchQuery.toLowerCase();
    return this.companies.filter(c => 
      c.nameAr.toLowerCase().includes(q) ||
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
      currencyCode: 'SAR',
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
