import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LanguageService } from '../../../core/services/language.service';
import Swal from 'sweetalert2';

export enum PartnerType {
  Customer = 1, // عميل
  Supplier = 2, // مورد
  Both = 3      // عميل ومورد معاً
}

export interface BusinessPartnerDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: PartnerType;
  typeNameAr: string;
  taxNumber?: string;
  commercialRegistration?: string;
  phone?: string;
  email?: string;
  creditLimit: number;
  paymentTermsDays: number;
  currentBalance: number;
  isActive: boolean;
}

export interface PartnerAgingBucketDto {
  partnerId: string;
  partnerCode: string;
  partnerNameAr: string;
  partnerType: PartnerType;
  currentBucket: number;    // 0 - 30 days
  bucket31To60: number;     // 31 - 60 days
  bucket61To90: number;     // 61 - 90 days
  bucketOver90: number;     // 90+ days
  totalOutstanding: number;
}

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
    <div class="partners-container" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-title-box">
          <div class="icon-frame">
            <i class="pi pi-users"></i>
          </div>
          <div>
            <h1 class="page-title">
              {{ langService.currentLang() === 'ar' ? 'سجلات العملاء والموردين وأعمار الديون (AR & AP Sub-Ledgers)' : 'Business Partners & Debt Aging' }}
            </h1>
            <p class="page-subtitle">
              {{ langService.currentLang() === 'ar' 
                ? 'إدارة بطاقات العملاء والموردين، الحدود الائتمانية، وتحليل أعمار الديون المتأخرة وفق المعايير المالية' 
                : 'Customer & Vendor cards, credit terms, and standard accounts receivable/payable aging analysis' }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-refresh" (click)="loadData()" [title]="langService.currentLang() === 'ar' ? 'تحديث' : 'Refresh'">
            <i class="pi pi-refresh" [class.pi-spin]="isLoading()"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'تحديث' : 'Refresh' }}</span>
          </button>
          <button class="btn-primary" (click)="openCreateModal()">
            <i class="pi pi-user-plus"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'إضافة عميل / مورد' : 'New Partner' }}</span>
          </button>
        </div>
      </header>

      <!-- Main Navigation Tabs: Cards vs Aging Report -->
      <nav class="view-tabs">
        <button [class.active]="activeTab() === 'cards'" (click)="activeTab.set('cards')">
          <i class="pi pi-id-card"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'بطاقات وسجلات الشركاء' : 'Partner Profiles' }}</span>
          <span class="tab-badge">{{ partners().length }}</span>
        </button>
        <button [class.active]="activeTab() === 'aging'" (click)="activeTab.set('aging')">
          <i class="pi pi-chart-bar"></i>
          <span>{{ langService.currentLang() === 'ar' ? 'تقرير أعمار الديون الذكي (Aging Report)' : 'Debt Aging Analysis' }}</span>
          <span class="tab-badge warning" *ngIf="overdueDebtTotal() > 0">{{ overdueDebtTotal() | number:'1.0-0' }} SAR</span>
        </button>
      </nav>

      <!-- TAB 1: Partner Cards View -->
      <div *ngIf="activeTab() === 'cards'" class="tab-content">
        <!-- KPI Strip -->
        <section class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon-box cyan">
              <i class="pi pi-user"></i>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">{{ langService.currentLang() === 'ar' ? 'إجمالي العملاء' : 'Total Customers' }}</span>
              <strong class="kpi-value">{{ customersCount() }}</strong>
              <span class="kpi-count">{{ totalReceivables() | number:'1.2-2' }} SAR مدين</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-box amber">
              <i class="pi pi-truck"></i>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">{{ langService.currentLang() === 'ar' ? 'إجمالي الموردين' : 'Total Suppliers' }}</span>
              <strong class="kpi-value">{{ suppliersCount() }}</strong>
              <span class="kpi-count">{{ totalPayables() | number:'1.2-2' }} SAR دائن</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon-box emerald">
              <i class="pi pi-shield"></i>
            </div>
            <div class="kpi-details">
              <span class="kpi-label">{{ langService.currentLang() === 'ar' ? 'الحدود الائتمانية الممنوحة' : 'Total Credit Line' }}</span>
              <strong class="kpi-value text-emerald">{{ totalCreditLimits() | number:'1.2-2' }} <small>SAR</small></strong>
              <span class="kpi-count">تسهيلات معتمدة</span>
            </div>
          </div>
        </section>

        <!-- Search & Filter Bar -->
        <div class="filters-bar">
          <div class="type-pills">
            <button [class.active]="filterType() === null" (click)="filterType.set(null)">
              {{ langService.currentLang() === 'ar' ? 'الكل' : 'All' }}
            </button>
            <button [class.active]="filterType() === PartnerType.Customer" (click)="filterType.set(PartnerType.Customer)">
              <i class="pi pi-user"></i>
              {{ langService.currentLang() === 'ar' ? 'العملاء' : 'Customers' }}
            </button>
            <button [class.active]="filterType() === PartnerType.Supplier" (click)="filterType.set(PartnerType.Supplier)">
              <i class="pi pi-truck"></i>
              {{ langService.currentLang() === 'ar' ? 'الموردون' : 'Suppliers' }}
            </button>
          </div>

          <input 
            type="text" 
            [placeholder]="langService.currentLang() === 'ar' ? 'بحث بالاسم، الكود، الرقم الضريبي، الهاتف...' : 'Search partners...'" 
            class="search-input"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)" />
        </div>

        <!-- Partners Table -->
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ langService.currentLang() === 'ar' ? 'كود الشريك' : 'Code' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الاسم التجاري' : 'Name' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'النوع' : 'Type' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الرقم الضريبي' : 'VAT / Tax #' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الهاتف / الجوال' : 'Phone' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'شروط السداد' : 'Terms' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الحد الائتماني' : 'Credit Limit' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الرصيد الدفتري الحالي' : 'Current Balance' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="filteredPartners().length === 0">
                <td colspan="8" class="empty-state">
                  <i class="pi pi-users"></i>
                  <p>{{ langService.currentLang() === 'ar' ? 'لا يوجد شركاء مطابقون' : 'No partners found' }}</p>
                </td>
              </tr>
              <tr *ngFor="let p of filteredPartners()">
                <td><strong>{{ p.code }}</strong></td>
                <td>
                  <div class="partner-name-wrap">
                    <span class="name-ar">{{ p.nameAr }}</span>
                    <span class="name-en" *ngIf="p.nameEn">{{ p.nameEn }}</span>
                  </div>
                </td>
                <td>
                  <span class="type-pill" [class.cust]="p.type === PartnerType.Customer" [class.supp]="p.type === PartnerType.Supplier">
                    <i class="pi" [ngClass]="p.type === PartnerType.Customer ? 'pi-user' : 'pi-truck'"></i>
                    {{ p.typeNameAr }}
                  </span>
                </td>
                <td>{{ p.taxNumber || '—' }}</td>
                <td>{{ p.phone || '—' }}</td>
                <td>{{ p.paymentTermsDays }} {{ langService.currentLang() === 'ar' ? 'يوم' : 'days' }}</td>
                <td>{{ p.creditLimit | number:'1.2-2' }} SAR</td>
                <td class="balance-cell" [class.positive]="p.currentBalance > 0" [class.negative]="p.currentBalance < 0">
                  {{ p.currentBalance | number:'1.2-2' }} SAR
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: Debt Aging Report (تقرير أعمار الديون) -->
      <div *ngIf="activeTab() === 'aging'" class="tab-content">
        <!-- Aging Overview Notice -->
        <div class="aging-banner">
          <i class="pi pi-info-circle"></i>
          <div>
            <strong>{{ langService.currentLang() === 'ar' ? 'آلية احتساب أعمار الديون القياسية' : 'Standard Debt Aging Mechanics' }}</strong>
            <p>{{ langService.currentLang() === 'ar' 
              ? 'يتم توزيع مديونيات العملاء والتزامات الموردين حسب تاريخ الاستحقاق الفعلي إلى 4 فترات زمنية رئيسية لتقييم السيولة والمخاطر الائتمانية.' 
              : 'Balances are bucketed into Current, 31-60, 61-90, and +90 days overdue to monitor credit risk and liquidity.' }}</p>
          </div>
        </div>

        <div class="table-card">
          <table class="data-table aging-table">
            <thead>
              <tr>
                <th>{{ langService.currentLang() === 'ar' ? 'كود الشريك' : 'Code' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'الاسم التجاري' : 'Partner Name' }}</th>
                <th>{{ langService.currentLang() === 'ar' ? 'النوع' : 'Type' }}</th>
                <th class="text-end">{{ langService.currentLang() === 'ar' ? 'حالي (0 - 30 يوماً)' : 'Current (0-30d)' }}</th>
                <th class="text-end">{{ langService.currentLang() === 'ar' ? 'متأخر (31 - 60 يوماً)' : '31-60 Days' }}</th>
                <th class="text-end">{{ langService.currentLang() === 'ar' ? 'متأخر (61 - 90 يوماً)' : '61-90 Days' }}</th>
                <th class="text-end text-rose">{{ langService.currentLang() === 'ar' ? 'حرج (+90 يوماً)' : '+90 Days' }}</th>
                <th class="text-end fw-bold">{{ langService.currentLang() === 'ar' ? 'إجمالي المديونية' : 'Total Outstanding' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="agingReport().length === 0">
                <td colspan="8" class="empty-state">
                  <i class="pi pi-check-circle"></i>
                  <p>{{ langService.currentLang() === 'ar' ? 'لا توجد مديونيات متأخرة حالياً' : 'No outstanding aging balances' }}</p>
                </td>
              </tr>
              <tr *ngFor="let row of agingReport()">
                <td><strong>{{ row.partnerCode }}</strong></td>
                <td>{{ row.partnerNameAr }}</td>
                <td>
                  <span class="type-pill" [class.cust]="row.partnerType === PartnerType.Customer" [class.supp]="row.partnerType === PartnerType.Supplier">
                    {{ row.partnerType === PartnerType.Customer ? 'عميل' : 'مورد' }}
                  </span>
                </td>
                <td class="text-end text-emerald fw-semibold">{{ row.currentBucket | number:'1.2-2' }}</td>
                <td class="text-end text-amber fw-semibold">{{ row.bucket31To60 | number:'1.2-2' }}</td>
                <td class="text-end text-orange fw-semibold">{{ row.bucket61To90 | number:'1.2-2' }}</td>
                <td class="text-end text-rose fw-bold">{{ row.bucketOver90 | number:'1.2-2' }}</td>
                <td class="text-end total-cell">{{ row.totalOutstanding | number:'1.2-2' }} SAR</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create Partner Modal -->
      <div class="modal-backdrop" *ngIf="showCreateModal()" (click)="showCreateModal.set(false)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <i class="pi pi-user-plus"></i>
              {{ langService.currentLang() === 'ar' ? 'تسجيل شريك تجاري جديد (عميل / مورد)' : 'Register New Partner' }}
            </h3>
            <button class="close-btn" (click)="showCreateModal.set(false)">&times;</button>
          </div>

          <form (ngSubmit)="submitCreatePartner()" class="modal-form">
            <div class="form-row">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'نوع الشريك *' : 'Partner Type *' }}</label>
                <select [(ngModel)]="newPartnerForm.type" name="type" class="form-control" required>
                  <option [ngValue]="PartnerType.Customer">{{ langService.currentLang() === 'ar' ? 'عميل (Customer)' : 'Customer' }}</option>
                  <option [ngValue]="PartnerType.Supplier">{{ langService.currentLang() === 'ar' ? 'مورد (Supplier / Vendor)' : 'Supplier' }}</option>
                  <option [ngValue]="PartnerType.Both">{{ langService.currentLang() === 'ar' ? 'عميل ومورد معاً (Both)' : 'Both' }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'كود الشريك *' : 'Code *' }}</label>
                <input type="text" [(ngModel)]="newPartnerForm.code" name="code" class="form-control" placeholder="مثال: CUST-002 أو SUPP-001" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'الاسم التجاري بالعربية *' : 'Arabic Name *' }}</label>
                <input type="text" [(ngModel)]="newPartnerForm.nameAr" name="nameAr" class="form-control" placeholder="اسم الشركة أو المؤسسة" required />
              </div>

              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'الاسم بالإنجليزية' : 'English Name' }}</label>
                <input type="text" [(ngModel)]="newPartnerForm.nameEn" name="nameEn" class="form-control" placeholder="e.g. Al-Fursan Trading Co." />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'الرقم الضريبي (15 رقم)' : 'VAT Number' }}</label>
                <input type="text" maxlength="15" [(ngModel)]="newPartnerForm.taxNumber" name="taxNumber" class="form-control" placeholder="300000000000003" />
              </div>

              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'رقم السجل التجاري' : 'CR Number' }}</label>
                <input type="text" [(ngModel)]="newPartnerForm.commercialRegistration" name="commercialRegistration" class="form-control" placeholder="1010xxxxxx" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'رقم الهاتف / الجوال' : 'Phone' }}</label>
                <input type="text" [(ngModel)]="newPartnerForm.phone" name="phone" class="form-control" placeholder="+966 5x xxx xxxx" />
              </div>

              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'البريد الإلكتروني' : 'Email' }}</label>
                <input type="email" [(ngModel)]="newPartnerForm.email" name="email" class="form-control" placeholder="billing@domain.com" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'الحد الائتماني المسموح (SAR)' : 'Credit Limit' }}</label>
                <input type="number" step="1000" [(ngModel)]="newPartnerForm.creditLimit" name="creditLimit" class="form-control" placeholder="50000" />
              </div>

              <div class="form-group">
                <label>{{ langService.currentLang() === 'ar' ? 'فترة السداد بالأيام' : 'Payment Terms (Days)' }}</label>
                <input type="number" [(ngModel)]="newPartnerForm.paymentTermsDays" name="paymentTermsDays" class="form-control" placeholder="30" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="showCreateModal.set(false)">
                {{ langService.currentLang() === 'ar' ? 'إلغاء' : 'Cancel' }}
              </button>
              <button type="submit" class="btn-submit" [disabled]="isSubmitting()">
                <i class="pi pi-check"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'حفظ وتثبيت الشريك' : 'Save Partner' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .partners-container {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: var(--font-arabic) !important;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      padding: 1.25rem 1.5rem;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    }

    .header-title-box {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .icon-frame {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .page-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
    }

    .page-subtitle {
      font-size: 0.8rem;
      color: #64748B;
      margin: 0.2rem 0 0 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 9px;
      padding: 0.55rem 1.25rem;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
      }
    }

    .btn-refresh {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      border-radius: 9px;
      padding: 0.55rem 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;

      &:hover {
        background: #F1F5F9;
        color: #0F172A;
      }
    }

    /* Tabs */
    .view-tabs {
      display: flex;
      gap: 0.65rem;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 0.25rem;

      button {
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -0.35rem;
        padding: 0.6rem 1.15rem;
        font-size: 0.88rem;
        font-weight: 700;
        color: #64748B;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s ease;

        &.active {
          color: #059669;
          border-bottom-color: #059669;

          .tab-badge {
            background: #ECFDF5;
            color: #059669;
          }
        }
      }
    }

    .tab-badge {
      font-size: 0.68rem;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      background: #F1F5F9;
      color: #64748B;

      &.warning {
        background: #FEF3C7;
        color: #B45309;
        font-weight: 800;
      }
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }

    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 1.15rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
    }

    .kpi-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;

      &.cyan { background: #E0F2FE; color: #0284C7; }
      &.amber { background: #FEF3C7; color: #D97706; }
      &.emerald { background: #ECFDF5; color: #059669; }
    }

    .kpi-details {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .kpi-label {
      font-size: 0.74rem;
      color: #64748B;
      font-weight: 600;
    }

    .kpi-value {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0F172A;
    }

    .kpi-count {
      font-size: 0.7rem;
      color: #94A3B8;
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      background: #FFFFFF;
      padding: 0.85rem 1.25rem;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
    }

    .type-pills {
      display: flex;
      gap: 0.5rem;

      button {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        padding: 0.4rem 0.85rem;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: all 0.2s ease;

        &.active {
          background: #ECFDF5;
          border-color: #10B981;
          color: #059669;
          font-weight: 750;
        }
      }
    }

    .search-input {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.82rem;
      color: #1E293B;
      outline: none;
      min-width: 280px;

      &:focus {
        border-color: #10B981;
        background: #FFFFFF;
      }
    }

    /* Table */
    .table-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        background: #F8FAFC;
        padding: 0.85rem 1rem;
        font-size: 0.78rem;
        font-weight: 750;
        color: #475569;
        border-bottom: 1px solid #E2E8F0;
      }

      td {
        padding: 0.85rem 1rem;
        font-size: 0.82rem;
        color: #334155;
        border-bottom: 1px solid #F1F5F9;
      }

      tr:hover td {
        background: #F8FAFC;
      }
    }

    .partner-name-wrap {
      display: flex;
      flex-direction: column;

      .name-ar { font-weight: 700; color: #0F172A; }
      .name-en { font-size: 0.72rem; color: #94A3B8; }
    }

    .type-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;

      &.cust { background: #E0F2FE; color: #0284C7; }
      &.supp { background: #FEF3C7; color: #D97706; }
    }

    .balance-cell {
      font-weight: 800;

      &.positive { color: #0284C7; }
      &.negative { color: #D97706; }
    }

    /* Aging Banner */
    .aging-banner {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 10px;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      color: #065F46;

      i { font-size: 1.25rem; margin-top: 0.15rem; color: #059669; }
      strong { font-size: 0.85rem; font-weight: 750; }
      p { margin: 0.2rem 0 0 0; font-size: 0.78rem; color: #047857; }
    }

    .text-emerald { color: #059669; }
    .text-amber { color: #D97706; }
    .text-orange { color: #EA580C; }
    .text-rose { color: #E11D48; }

    .total-cell {
      font-weight: 800;
      color: #0F172A;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #94A3B8;

      i { font-size: 2.5rem; margin-bottom: 0.5rem; }
      p { font-size: 0.88rem; margin: 0; }
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-box {
      background: #FFFFFF;
      border-radius: 14px;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 1.5rem;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;

      h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        color: #059669;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .close-btn {
        background: transparent;
        border: none;
        font-size: 1.5rem;
        color: #64748B;
        cursor: pointer;
      }
    }

    .modal-form {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      label {
        font-size: 0.78rem;
        font-weight: 700;
        color: #334155;
      }
    }

    .form-control {
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      outline: none;

      &:focus {
        border-color: #10B981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .btn-submit {
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.55rem 1.25rem;
      font-weight: 750;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .btn-cancel {
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      color: #475569;
      border-radius: 8px;
      padding: 0.55rem 1rem;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class PartnersComponent implements OnInit {
  private http = inject(HttpClient);
  langService = inject(LanguageService);

  activeTab = signal<'cards' | 'aging'>('cards');
  partners = signal<BusinessPartnerDto[]>([]);
  agingReport = signal<PartnerAgingBucketDto[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);

  filterType = signal<PartnerType | null>(null);
  searchTerm = signal<string>('');

  PartnerType = PartnerType;

  newPartnerForm = {
    code: '',
    nameAr: '',
    nameEn: '',
    type: PartnerType.Customer,
    taxNumber: '',
    commercialRegistration: '',
    phone: '',
    email: '',
    creditLimit: 50000,
    paymentTermsDays: 30
  };

  // KPIs
  customersCount = computed(() => this.partners().filter(p => p.type === PartnerType.Customer || p.type === PartnerType.Both).length);
  suppliersCount = computed(() => this.partners().filter(p => p.type === PartnerType.Supplier || p.type === PartnerType.Both).length);
  totalCreditLimits = computed(() => this.partners().reduce((s, p) => s + (p.creditLimit || 0), 0));
  totalReceivables = computed(() => this.partners().filter(p => p.currentBalance > 0).reduce((s, p) => s + p.currentBalance, 0));
  totalPayables = computed(() => this.partners().filter(p => p.currentBalance < 0).reduce((s, p) => s + Math.abs(p.currentBalance), 0));
  overdueDebtTotal = computed(() => this.agingReport().reduce((s, r) => s + r.bucket31To60 + r.bucket61To90 + r.bucketOver90, 0));

  filteredPartners = computed(() => {
    return this.partners().filter(p => {
      if (this.filterType() !== null && p.type !== this.filterType() && p.type !== PartnerType.Both) return false;
      if (this.searchTerm()) {
        const q = this.searchTerm().toLowerCase();
        return (p.code || '').toLowerCase().includes(q) ||
               (p.nameAr || '').toLowerCase().includes(q) ||
               (p.taxNumber || '').toLowerCase().includes(q) ||
               (p.phone || '').toLowerCase().includes(q);
      }
      return true;
    });
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.http.get<BusinessPartnerDto[]>('/api/partners').subscribe({
      next: (res) => {
        this.partners.set(res || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.http.get<PartnerAgingBucketDto[]>('/api/partners/aging').subscribe({
      next: (res) => this.agingReport.set(res || []),
      error: () => {}
    });
  }

  openCreateModal() {
    this.newPartnerForm = {
      code: `PART-${Math.floor(1000 + Math.random() * 9000)}`,
      nameAr: '',
      nameEn: '',
      type: PartnerType.Customer,
      taxNumber: '',
      commercialRegistration: '',
      phone: '',
      email: '',
      creditLimit: 50000,
      paymentTermsDays: 30
    };
    this.showCreateModal.set(true);
  }

  submitCreatePartner() {
    if (!this.newPartnerForm.code || !this.newPartnerForm.nameAr) {
      Swal.fire({ icon: 'warning', title: 'بيانات غير مكتملة', text: 'يرجى إدخال الكود والاسم التجاري.' });
      return;
    }

    this.isSubmitting.set(true);
    this.http.post('/api/partners', this.newPartnerForm).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showCreateModal.set(false);
        Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم تسجيل بطاقة الشريك التجاري بنجاح.' });
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        Swal.fire({ icon: 'error', title: 'خطأ', text: err?.error?.description || 'فشل حفظ الشريك' });
      }
    });
  }
}
