import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { 
  TenantManagementService, 
  TenantCompanyDto, 
  CompanyLicenseOverview 
} from '../../core/services/tenant-management.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginationComponent],
  template: `
    <div class="companies-wrap">
      
      <!-- 1. Header & Platform Owner Privacy Shield Banner -->
      <div class="platform-banner">
        <div class="banner-content">
          <div class="shield-badge">
            <i class="pi pi-shield"></i>
          </div>
          <div class="banner-texts">
            <div class="banner-title-row">
              <h1 class="page-title">{{ 'companies.portal.saasMultitenantManagementPorta' | translate }}</h1>
              <span class="role-badge">{{ 'companies.portal.platformOwnerBadge' | translate }}</span>
            </div>
            <p class="banner-privacy-notice">
              <i class="pi pi-lock-open"></i>
              <span>{{ 'companies.portal.dataPrivacyShield' | translate }}</span>
            </p>
          </div>
        </div>

        <div class="banner-actions">
          <button type="button" class="btn-refresh" (click)="loadData()" [disabled]="isLoading()" [title]="'companies.portal.refresh' | translate">
            <i class="pi" [ngClass]="isLoading() ? 'pi-spin pi-spinner' : 'pi-refresh'"></i>
            <span>{{ 'companies.portal.refresh' | translate }}</span>
          </button>
          <button type="button" class="btn-create" (click)="openOnboarding()">
            <i class="pi pi-plus"></i>
            <span>{{ 'companies.portal.onboardCompany' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- 2. KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-box blue">
            <i class="pi pi-building"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">{{ 'companies.portal.totalTenants' | translate }}</span>
            <strong class="kpi-value font-mono">{{ companies().length }}</strong>
            <small class="kpi-hint">{{ 'companies.portal.registered' | translate }}</small>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box emerald">
            <i class="pi pi-check-circle"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">{{ 'companies.portal.activeTenants' | translate }}</span>
            <strong class="kpi-value text-emerald font-mono">{{ activeCompaniesCount() }}</strong>
            <small class="kpi-hint">{{ 'status.active' | translate }}</small>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box amber">
            <i class="pi pi-ban"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">{{ 'companies.portal.suspendedTenants' | translate }}</span>
            <strong class="kpi-value text-amber font-mono">{{ suspendedCompaniesCount() }}</strong>
            <small class="kpi-hint">{{ 'companies.portal.actionRequired' | translate }}</small>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box purple">
            <i class="pi pi-key"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">{{ 'companies.portal.licenseAndLimits' | translate }}</span>
            <strong class="kpi-value text-purple font-mono">{{ totalLicensedUsers() }}</strong>
            <small class="kpi-hint">{{ 'companies.portal.usersUsage' | translate }}</small>
          </div>
        </div>
      </div>

      <!-- 3. Toolbar & Filters -->
      <div class="toolbar">
        <div class="search-box">
          <i class="pi pi-search"></i>
          <input 
            type="text" 
            [ngModel]="searchQuery()" 
            (ngModelChange)="onSearchChange($event)" 
            [placeholder]="'companies.portal.searchPlaceholder' | translate" 
          />
          <button *ngIf="searchQuery()" type="button" class="btn-clear-search" (click)="onSearchChange('')">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="filter-tabs">
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="filterStatus() === 'all'" 
            (click)="onFilterStatusChange('all')">
            {{ 'companies.portal.all' | translate }} ({{ companies().length }})
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="filterStatus() === 'active'" 
            (click)="onFilterStatusChange('active')">
            {{ 'companies.portal.active' | translate }} ({{ activeCompaniesCount() }})
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="filterStatus() === 'suspended'" 
            (click)="onFilterStatusChange('suspended')">
            {{ 'companies.portal.suspended' | translate }} ({{ suspendedCompaniesCount() }})
          </button>
        </div>
      </div>

      <!-- 4. Companies & Licensing Table -->
      <div class="table-card">
        
        <!-- Loading State -->
        <div class="state-container" *ngIf="isLoading()">
          <i class="pi pi-spin pi-spinner state-spinner"></i>
          <p>{{ 'companies.portal.loadingTenantsDirectory' | translate }}</p>
        </div>

        <!-- Empty State -->
        <div class="state-container" *ngIf="!isLoading() && filteredCompanies().length === 0">
          <div class="empty-icon-wrap">
            <i class="pi pi-inbox"></i>
          </div>
          <h3>{{ 'companies.portal.noMatchingCompaniesFound' | translate }}</h3>
          <p>{{ 'companies.portal.tryAdjustingYourSearchCriteria' | translate }}</p>
        </div>

        <!-- Data Table -->
        <div class="table-responsive" *ngIf="!isLoading() && filteredCompanies().length > 0">
          <table class="clean-table">
            <thead>
              <tr>
                <th>{{ 'companies.portal.companyAndCode' | translate }}</th>
                <th><i class="pi pi-user th-icon"></i> {{ 'companies.portal.adminUser' | translate }}</th>
                <th>{{ 'companies.portal.vatNumber' | translate }} / {{ 'companies.portal.crNumber' | translate }}</th>
                <th>{{ 'companies.portal.status' | translate }}</th>
                <th><i class="pi pi-users th-icon"></i> {{ 'companies.portal.usersUsage' | translate }}</th>
                <th><i class="pi pi-box th-icon"></i> {{ 'companies.portal.warehousesUsage' | translate }}</th>
                <th><i class="pi pi-sitemap th-icon"></i> {{ 'companies.portal.branchesUsage' | translate }}</th>
                <th>{{ 'companies.portal.expiryDate' | translate }}</th>
                <th class="text-center">{{ 'companies.portal.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let comp of paginatedCompanies()">
                <!-- Company Identity -->
                <td>
                  <div class="comp-cell">
                    <div class="comp-avatar" [style.backgroundColor]="comp.brandThemeColor || '#0f766e'">
                      <img *ngIf="comp.logoUrl" [src]="comp.logoUrl" (error)="onImgError($event)" [alt]="comp.nameAr" />
                      <span *ngIf="!comp.logoUrl">{{ getInitials(comp.nameAr) }}</span>
                    </div>
                    <div class="comp-info">
                      <strong class="comp-name">{{ langService.currentLang() === 'ar' ? comp.nameAr : comp.nameEn }}</strong>
                      <div class="comp-meta">
                        <span class="code-pill font-mono">{{ comp.code }}</span>
                        <span class="currency-tag">{{ comp.currencyCode }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Admin Username -->
                <td>
                  <div class="admin-user-cell" *ngIf="getAdminUserName(comp.id); else noAdminUserTpl">
                    <div class="user-chip">
                      <i class="pi pi-user"></i>
                      <span class="font-mono user-handle">{{ getAdminUserName(comp.id) }}</span>
                    </div>
                    <span class="user-fullname" *ngIf="getAdminFullName(comp.id) && getAdminFullName(comp.id) !== getAdminUserName(comp.id)">
                      {{ getAdminFullName(comp.id) }}
                    </span>
                  </div>
                  <ng-template #noAdminUserTpl>
                    <span class="empty-user-dash">-</span>
                  </ng-template>
                </td>

                <!-- VAT & CR -->
                <td>
                  <div class="tax-cell font-mono">
                    <div class="tax-row">
                      <span class="tax-label">VAT:</span>
                      <span class="tax-val">{{ comp.vatNumber || '-' }}</span>
                    </div>
                    <div class="tax-row">
                      <span class="tax-label">CR:</span>
                      <span class="tax-val">{{ comp.commercialRegistration || '-' }}</span>
                    </div>
                  </div>
                </td>

                <!-- Status Toggle -->
                <td>
                  <button 
                    type="button" 
                    class="status-pill-btn" 
                    [class.active]="comp.isActive"
                    [class.suspended]="!comp.isActive"
                    (click)="toggleCompanyStatus(comp)"
                    [title]="comp.isActive ? ('companies.portal.suspendTenant' | translate) : ('companies.portal.activateTenant' | translate)">
                    <span class="status-dot"></span>
                    <span>{{ comp.isActive ? ('companies.portal.active' | translate) : ('companies.portal.suspended' | translate) }}</span>
                  </button>
                </td>

                <!-- License: Users Limit -->
                <td>
                  <div 
                    class="quota-pill" 
                    [ngClass]="getQuotaStatusClass(comp.id, 'users')" 
                    [title]="getQuotaTooltip(comp.id, 'users')">
                    <span class="quota-ratio font-mono" dir="ltr">
                      <strong class="used-val">{{ getUsedCount(comp.id, 'users') }}</strong>
                      <span class="sep">/</span>
                      <span class="max-val">{{ getMaxDisplay(comp.id, 'users') }}</span>
                    </span>
                    <span class="quota-tag">{{ getShortStatusLabel(comp.id, 'users') }}</span>
                    <div class="quota-progress" *ngIf="hasLimit(comp.id, 'users')">
                      <div class="quota-progress-bar" [style.width.%]="getUsagePercent(comp.id, 'users')"></div>
                    </div>
                  </div>
                </td>

                <!-- License: Warehouses Limit -->
                <td>
                  <div 
                    class="quota-pill" 
                    [ngClass]="getQuotaStatusClass(comp.id, 'warehouses')" 
                    [title]="getQuotaTooltip(comp.id, 'warehouses')">
                    <span class="quota-ratio font-mono" dir="ltr">
                      <strong class="used-val">{{ getUsedCount(comp.id, 'warehouses') }}</strong>
                      <span class="sep">/</span>
                      <span class="max-val">{{ getMaxDisplay(comp.id, 'warehouses') }}</span>
                    </span>
                    <span class="quota-tag">{{ getShortStatusLabel(comp.id, 'warehouses') }}</span>
                    <div class="quota-progress" *ngIf="hasLimit(comp.id, 'warehouses')">
                      <div class="quota-progress-bar" [style.width.%]="getUsagePercent(comp.id, 'warehouses')"></div>
                    </div>
                  </div>
                </td>

                <!-- License: Branches Limit -->
                <td>
                  <div 
                    class="quota-pill" 
                    [ngClass]="getQuotaStatusClass(comp.id, 'branches')" 
                    [title]="getQuotaTooltip(comp.id, 'branches')">
                    <span class="quota-ratio font-mono" dir="ltr">
                      <strong class="used-val">{{ getUsedCount(comp.id, 'branches') }}</strong>
                      <span class="sep">/</span>
                      <span class="max-val">{{ getMaxDisplay(comp.id, 'branches') }}</span>
                    </span>
                    <span class="quota-tag">{{ getShortStatusLabel(comp.id, 'branches') }}</span>
                    <div class="quota-progress" *ngIf="hasLimit(comp.id, 'branches')">
                      <div class="quota-progress-bar" [style.width.%]="getUsagePercent(comp.id, 'branches')"></div>
                    </div>
                  </div>
                </td>

                <!-- Expiry Date -->
                <td>
                  <div class="expiry-cell">
                    <span 
                      class="expiry-badge" 
                      [ngClass]="getExpiryClass(comp.id)">
                      <i class="pi" [ngClass]="getExpiryIcon(comp.id)"></i>
                      <span>{{ getExpiryLabel(comp.id) }}</span>
                    </span>
                  </div>
                </td>

                <!-- Actions -->
                <td>
                  <div class="actions-cell">
                    <!-- Manage License Button -->
                    <button 
                      type="button" 
                      class="btn-action primary" 
                      (click)="openLicenseModal(comp)"
                      [title]="'companies.portal.manageLicense' | translate">
                      <i class="pi pi-key"></i>
                      <span>{{ 'companies.portal.manageLicense' | translate }}</span>
                    </button>

                    <!-- Reset Admin Password Button -->
                    <button 
                      type="button" 
                      class="btn-action warning" 
                      (click)="openResetPasswordModal(comp)"
                      [title]="'companies.portal.resetPassword' | translate">
                      <i class="pi pi-lock"></i>
                      <span>{{ 'companies.portal.resetPassword' | translate }}</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 5. Table Pagination Footer -->
          <div class="table-pagination-footer" *ngIf="filteredCompanies().length > 0">
            <app-pagination
              [totalItems]="filteredCompanies().length"
              [pageSize]="pageSize()"
              [currentPage]="currentPage()"
              [pageSizeOptions]="[5, 10, 20, 50]"
              [itemLabelAr]="'منشأة'"
              [itemLabelEn]="'companies'"
              (currentPageChange)="onPageChange($event)"
              (pageSizeChange)="onPageSizeChange($event)">
            </app-pagination>
          </div>
        </div>
      </div>

      <!-- 5. Edit License Modal -->
      <div class="modal-overlay" *ngIf="showLicenseModal" (click)="closeLicenseModal()">
        <div class="license-modal-card" (click)="$event.stopPropagation()">
          
          <div class="modal-head">
            <div class="modal-title-wrap">
              <div class="modal-icon-badge">
                <i class="pi pi-key"></i>
              </div>
              <div>
                <h2>{{ 'companies.portal.licenseModalTitle' | translate }}</h2>
                <p>{{ selectedCompanyForLicense()?.nameAr }} ({{ selectedCompanyForLicense()?.code }})</p>
              </div>
            </div>
            <button type="button" class="btn-close-modal" (click)="closeLicenseModal()">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <form (ngSubmit)="saveLicense()" class="modal-form">
            <div class="modal-body">
              
              <div class="license-intro">
                <i class="pi pi-info-circle"></i>
                <span>{{ 'companies.portal.licenseModalSubtitle' | translate }}</span>
              </div>

              <!-- Max Users -->
              <div class="form-row">
                <div class="form-group">
                  <label>
                    <i class="pi pi-users"></i>
                    <span>{{ 'companies.portal.maxUsers' | translate }}</span>
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    [(ngModel)]="licenseForm.maxUsers" 
                    name="maxUsers"
                    placeholder="∞ ({{ 'companies.portal.unlimited' | translate }})" 
                    class="font-mono"
                  />
                  <small class="field-hint">{{ 'companies.portal.unlimitedHint' | translate }}</small>
                </div>

                <!-- Max Warehouses -->
                <div class="form-group">
                  <label>
                    <i class="pi pi-box"></i>
                    <span>{{ 'companies.portal.maxWarehouses' | translate }}</span>
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    [(ngModel)]="licenseForm.maxWarehouses" 
                    name="maxWarehouses"
                    placeholder="∞ ({{ 'companies.portal.unlimited' | translate }})" 
                    class="font-mono"
                  />
                  <small class="field-hint">{{ 'companies.portal.unlimitedHint' | translate }}</small>
                </div>
              </div>

              <div class="form-row">
                <!-- Max Branches -->
                <div class="form-group">
                  <label>
                    <i class="pi pi-sitemap"></i>
                    <span>{{ 'companies.portal.maxBranches' | translate }}</span>
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    [(ngModel)]="licenseForm.maxBranches" 
                    name="maxBranches"
                    placeholder="∞ ({{ 'companies.portal.unlimited' | translate }})" 
                    class="font-mono"
                  />
                  <small class="field-hint">{{ 'companies.portal.unlimitedHint' | translate }}</small>
                </div>

                <!-- Expiry Date -->
                <div class="form-group">
                  <label>
                    <i class="pi pi-calendar"></i>
                    <span>{{ 'companies.portal.expiryDate' | translate }}</span>
                  </label>
                  <input 
                    type="date" 
                    [(ngModel)]="licenseForm.expiresAtUtc" 
                    name="expiresAtUtc"
                    class="font-mono"
                  />
                  <small class="field-hint">{{ 'companies.portal.noExpiryHint' | translate }}</small>
                </div>
              </div>

            </div>

            <div class="modal-foot">
              <button type="button" class="btn-cancel" (click)="closeLicenseModal()">
                {{ 'companies.portal.cancelBtn' | translate }}
              </button>
              <button type="submit" class="btn-save" [disabled]="isSavingLicense()">
                <i class="pi" [ngClass]="isSavingLicense() ? 'pi-spin pi-spinner' : 'pi-check'"></i>
                <span>{{ isSavingLicense() ? ('companies.portal.saving' | translate) : ('companies.portal.saveLicense' | translate) }}</span>
              </button>
            </div>
          </form>

        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic, 'Inter', -apple-system, sans-serif) !important;
      color: #0F172A;
    }

    button, input, select {
      font-family: inherit !important;
      box-sizing: border-box;
    }

    .companies-wrap {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 1440px;
      margin: 0 auto;
      padding-bottom: 2rem;
    }

    /* 1. Platform Owner Privacy Shield Banner */
    .platform-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 1.25rem 1.75rem;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
      flex-wrap: wrap;
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .shield-badge {
      width: 52px;
      height: 52px;
      min-width: 52px;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }

    .banner-texts {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .banner-title-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .page-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #FFFFFF;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .role-badge {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 0.15rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .banner-privacy-notice {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin: 0;
      color: #94A3B8;
      font-size: 0.825rem;

      i {
        color: #38bdf8;
        font-size: 0.85rem;
      }
    }

    .banner-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #1E293B;
      color: #E2E8F0;
      border: 1px solid #475569;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: #334155;
        color: #FFFFFF;
      }
    }

    .btn-create {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      border: none;
      padding: 0.55rem 1.25rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(16, 185, 129, 0.45);
      }
    }

    /* 2. KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }

    .kpi-icon-box {
      width: 46px;
      height: 46px;
      min-width: 46px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;

      &.blue { background: #EFF6FF; color: #2563EB; }
      &.emerald { background: #ECFDF5; color: #059669; }
      &.amber { background: #FFFBEB; color: #D97706; }
      &.purple { background: #FAF5FF; color: #9333EA; }
    }

    .kpi-details {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .kpi-label {
      font-size: 0.775rem;
      color: #64748B;
      font-weight: 600;
    }

    .kpi-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.15;
    }

    .kpi-hint {
      font-size: 0.7rem;
      color: #94A3B8;
    }

    .text-emerald { color: #059669 !important; }
    .text-amber { color: #D97706 !important; }
    .text-purple { color: #9333EA !important; }

    /* 3. Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      flex: 1;
      max-width: 420px;

      i { color: #94A3B8; font-size: 0.85rem; }
      input {
        background: transparent;
        border: none;
        color: #0F172A;
        outline: none;
        width: 100%;
        font-size: 0.825rem;
        &::placeholder { color: #94A3B8; }
      }
    }

    .btn-clear-search {
      background: none;
      border: none;
      padding: 0;
      color: #94A3B8;
      cursor: pointer;
      &:hover { color: #0F172A; }
    }

    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: #F1F5F9;
      padding: 0.25rem;
      border-radius: 8px;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: #64748B;
      padding: 0.35rem 0.85rem;
      border-radius: 6px;
      font-size: 0.775rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;

      &.active {
        background: #FFFFFF;
        color: #0F172A;
        font-weight: 700;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
      }
    }

    /* 4. Table */
    .table-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.03);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .clean-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        padding: 0.85rem 1rem;
        font-size: 0.725rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748B;
        background: #F8FAFC;
        border-bottom: 1px solid #E2E8F0;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }

      td {
        padding: 0.85rem 1rem;
        font-size: 0.825rem;
        color: #334155;
        border-bottom: 1px solid #F1F5F9;
        vertical-align: middle;
      }

      tr:hover td {
        background: #F8FAFC;
      }
    }

    /* Comp cell */
    .comp-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .comp-avatar {
      width: 38px;
      height: 38px;
      min-width: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.85rem;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .comp-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .comp-name {
      color: #0F172A;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .comp-meta {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .code-pill {
      font-size: 0.675rem;
      color: #0284C7;
      background: #F0F9FF;
      border: 1px solid rgba(2, 132, 199, 0.2);
      padding: 0.05rem 0.35rem;
      border-radius: 4px;
      font-weight: 700;
    }

    .currency-tag {
      font-size: 0.65rem;
      color: #64748B;
      background: #F1F5F9;
      padding: 0.05rem 0.3rem;
      border-radius: 4px;
    }

    /* Admin User Cell */
    .admin-user-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      align-items: flex-start;

      .user-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: #F0F9FF;
        border: 1px solid #BAE6FD;
        padding: 0.15rem 0.5rem;
        border-radius: 6px;
        color: #0369A1;
        font-size: 0.725rem;
        white-space: nowrap;

        i {
          font-size: 0.7rem;
          color: #0284C7;
        }

        .user-handle {
          font-weight: 700;
        }
      }

      .user-fullname {
        font-size: 0.675rem;
        color: #64748B;
        font-weight: 500;
        white-space: nowrap;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .empty-user-dash {
      color: #94A3B8;
      font-size: 0.85rem;
      padding: 0 0.5rem;
    }

    /* Tax Cell */
    .tax-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.75rem;
    }

    .tax-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .tax-label {
      color: #94A3B8;
      font-size: 0.65rem;
    }

    .tax-val {
      color: #334155;
      font-weight: 500;
    }

    /* Status Pill Button */
    .status-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.725rem;
      font-weight: 700;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s;

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      &.active {
        background: #ECFDF5;
        color: #059669;
        border-color: rgba(16, 185, 129, 0.3);
        .status-dot { background: #10B981; }
      }

      &.suspended {
        background: #FFF1F2;
        color: #E11D48;
        border-color: rgba(225, 29, 72, 0.3);
        .status-dot { background: #E11D48; }
      }
    }

    .th-icon {
      font-size: 0.75rem;
      color: #94A3B8;
      margin-inline-end: 0.35rem;
    }

    /* Modern Compact Quota Pill */
    .quota-pill {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      min-width: 92px;
      padding: 0.2rem 0.55rem 0.3rem;
      border-radius: 6px;
      position: relative;
      overflow: hidden;
      border: 1px solid transparent;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      transition: all 0.15s ease-in-out;
      cursor: default;

      .quota-ratio {
        display: inline-flex;
        align-items: baseline;
        gap: 0.15rem;
        direction: ltr !important;
        unicode-bidi: isolate;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.775rem;
        letter-spacing: -0.01em;

        .used-val {
          font-weight: 800;
        }
        .sep {
          opacity: 0.35;
          font-size: 0.7rem;
        }
        .max-val {
          font-weight: 600;
          opacity: 0.75;
          font-size: 0.725rem;
        }
      }

      .quota-tag {
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.05rem 0.35rem;
        border-radius: 4px;
        white-space: nowrap;
        line-height: 1.2;
      }

      .quota-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2.5px;
        background: rgba(0, 0, 0, 0.06);

        .quota-progress-bar {
          height: 100%;
          border-radius: 0 2px 2px 0;
          transition: width 0.3s ease;
        }
      }

      /* State: Available */
      &.state-available {
        background: #F0FDF4;
        border-color: #BBF7D0;
        color: #166534;

        .quota-tag {
          background: #DCFCE7;
          color: #15803D;
        }
        .quota-progress-bar {
          background: #10B981;
        }
      }

      /* State: Warning (>=80%) */
      &.state-warning {
        background: #FFFBEB;
        border-color: #FDE68A;
        color: #92400E;

        .quota-tag {
          background: #FEF3C7;
          color: #B45309;
        }
        .quota-progress-bar {
          background: #F59E0B;
        }
      }

      /* State: Full */
      &.state-full {
        background: #FEF2F2;
        border-color: #FECACA;
        color: #991B1B;

        .quota-tag {
          background: #FEE2E2;
          color: #DC2626;
        }
        .quota-progress-bar {
          background: #EF4444;
        }
      }

      /* State: Unlimited */
      &.state-unlimited {
        background: #F8FAFC;
        border-color: #E2E8F0;
        color: #334155;

        .quota-tag {
          background: #F1F5F9;
          color: #64748B;
        }
      }

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
      }
    }

    /* Expiry Cell */
    .expiry-cell {
      display: flex;
      align-items: center;
    }

    .expiry-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.725rem;
      font-weight: 600;

      &.active {
        background: #ECFDF5;
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }

      &.warning {
        background: #FFFBEB;
        color: #D97706;
        border: 1px solid rgba(217, 119, 6, 0.25);
      }

      &.expired {
        background: #FEF2F2;
        color: #DC2626;
        border: 1px solid rgba(220, 38, 38, 0.25);
        font-weight: 700;
      }

      &.permanent {
        background: #F1F5F9;
        color: #475569;
        border: 1px solid #E2E8F0;
      }
    }

    /* Actions */
    .actions-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.725rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;

      &.primary {
        background: #F0FDF4;
        border: 1px solid rgba(5, 150, 105, 0.25);
        color: #059669;

        &:hover {
          background: #059669;
          color: #FFFFFF;
        }
      }

      &.secondary {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        color: #64748B;
        padding: 0.35rem 0.55rem;

        &:hover {
          background: #E2E8F0;
          color: #0F172A;
        }
      }

      &.warning {
        background: #FFFBEB;
        border: 1px solid rgba(217, 119, 6, 0.25);
        color: #B45309;

        &:hover {
          background: #D97706;
          color: #FFFFFF;
        }
      }
    }

    /* Table Pagination Footer */
    .table-pagination-footer {
      border-top: 1px solid #F1F5F9;
      background: #FAFAFA;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
    }

    /* State container */
    .state-container {
      padding: 3.5rem 1rem;
      text-align: center;
      color: #64748B;

      .state-spinner {
        font-size: 2rem;
        color: #059669;
        margin-bottom: 0.75rem;
      }

      .empty-icon-wrap {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #F1F5F9;
        color: #94A3B8;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 0.75rem auto;
        font-size: 1.5rem;
      }

      h3 {
        color: #0F172A;
        font-size: 1rem;
        margin: 0 0 0.35rem 0;
      }

      p {
        font-size: 0.825rem;
        margin: 0;
      }
    }

    /* 5. License Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }

    .license-modal-card {
      width: 100%;
      max-width: 540px;
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
      overflow: hidden;
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.97) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.15rem 1.5rem;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }

    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      h2 {
        font-size: 1.05rem;
        font-weight: 800;
        color: #0F172A;
        margin: 0;
      }

      p {
        font-size: 0.75rem;
        color: #64748B;
        margin: 0.15rem 0 0 0;
      }
    }

    .modal-icon-badge {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: #EFF6FF;
      color: #2563EB;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
    }

    .btn-close-modal {
      background: none;
      border: none;
      color: #94A3B8;
      font-size: 0.95rem;
      cursor: pointer;
      padding: 0.25rem;
      &:hover { color: #0F172A; }
    }

    .modal-body {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .license-intro {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #F0FDF4;
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      color: #065F46;
      font-size: 0.775rem;

      i { color: #059669; }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      label {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.775rem;
        font-weight: 700;
        color: #334155;

        i { color: #64748B; }
      }

      input {
        background: #FFFFFF;
        border: 1px solid #CBD5E1;
        border-radius: 8px;
        padding: 0.5rem 0.75rem;
        font-size: 0.825rem;
        color: #0F172A;
        outline: none;
        transition: border-color 0.15s;

        &:focus {
          border-color: #059669;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }
      }

      .field-hint {
        font-size: 0.675rem;
        color: #94A3B8;
      }
    }

    .modal-foot {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.65rem;
      padding: 1rem 1.5rem;
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
    }

    .btn-cancel {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #475569;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      &:hover { background: #F1F5F9; }
    }

    .btn-save {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #059669;
      color: #FFFFFF;
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
      &:hover:not(:disabled) { background: #047857; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
  `]
})
export class CompaniesListComponent implements OnInit {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  tenantService = inject(TenantManagementService);
  private router = inject(Router);

  companies = signal<TenantCompanyDto[]>([]);
  licenses = signal<Record<string, CompanyLicenseOverview>>({});
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  filterStatus = signal<'all' | 'active' | 'suspended'>('all');

  showOnboardingModal = false;
  showLicenseModal = false;
  selectedCompanyForLicense = signal<TenantCompanyDto | null>(null);

  licenseForm = {
    maxUsers: null as number | null,
    maxWarehouses: null as number | null,
    maxBranches: null as number | null,
    expiresAtUtc: null as string | null
  };
  isSavingLicense = signal<boolean>(false);

  // Computeds
  activeCompaniesCount = computed(() => this.companies().filter(c => c.isActive).length);
  suspendedCompaniesCount = computed(() => this.companies().filter(c => !c.isActive).length);
  totalLicensedUsers = computed(() => {
    return Object.values(this.licenses()).reduce((sum, l) => sum + (l.usedUsers || 0), 0);
  });

  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  filteredCompanies = computed(() => {
    let list = this.companies();
    const status = this.filterStatus();
    if (status === 'active') list = list.filter(c => c.isActive);
    if (status === 'suspended') list = list.filter(c => !c.isActive);

    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return list;

    const licMap = this.licenses();

    return list.filter(c => {
      const lic = licMap[c.id];
      const adminUser = (lic?.adminUserName || '').toLowerCase();
      const adminFull = (lic?.adminFullName || '').toLowerCase();
      return (
        (c.nameAr && c.nameAr.toLowerCase().includes(q)) ||
        (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.vatNumber && c.vatNumber.includes(q)) ||
        (c.commercialRegistration && c.commercialRegistration.includes(q)) ||
        adminUser.includes(q) ||
        adminFull.includes(q)
      );
    });
  });

  paginatedCompanies = computed(() => {
    const list = this.filteredCompanies();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onFilterStatusChange(status: 'all' | 'active' | 'suspended'): void {
    this.filterStatus.set(status);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  getAdminUserName(companyId: string): string | null {
    return this.licenses()[companyId]?.adminUserName || null;
  }

  getAdminFullName(companyId: string): string | null {
    return this.licenses()[companyId]?.adminFullName || null;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    forkJoin({
      companies: this.tenantService.getAllCompanies(),
      licenses: this.tenantService.getLicenseOverview()
    }).subscribe({
      next: ({ companies, licenses }) => {
        this.companies.set(companies || []);
        
        const licMap: Record<string, CompanyLicenseOverview> = {};
        for (const l of (licenses || [])) {
          licMap[l.companyId] = l;
        }
        this.licenses.set(licMap);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        const errMsg = err?.error?.description || err?.error?.message || 'تعذر تحميل بيانات المنشآت والتراخيص';
        Swal.fire({
          icon: 'error',
          title: this.langService.t('companies.portal.updateFailed'),
          text: errMsg,
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  getLicense(companyId: string): CompanyLicenseOverview | undefined {
    return this.licenses()[companyId];
  }

  getUsedCount(companyId: string, type: 'users' | 'warehouses' | 'branches'): number {
    const lic = this.getLicense(companyId);
    if (!lic) return 0;
    return type === 'users' ? lic.usedUsers : type === 'warehouses' ? lic.usedWarehouses : lic.usedBranches;
  }

  getMaxDisplay(companyId: string, type: 'users' | 'warehouses' | 'branches'): string {
    const lic = this.getLicense(companyId);
    if (!lic) return '∞';
    const max = type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches;
    return (max === null || max === undefined) ? '∞' : max.toString();
  }

  hasLimit(companyId: string, type: 'users' | 'warehouses' | 'branches'): boolean {
    const lic = this.getLicense(companyId);
    if (!lic) return false;
    const max = type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches;
    return max !== null && max !== undefined;
  }

  getUsagePercent(companyId: string, type: 'users' | 'warehouses' | 'branches'): number {
    const lic = this.getLicense(companyId);
    if (!lic) return 0;
    const used = type === 'users' ? lic.usedUsers : type === 'warehouses' ? lic.usedWarehouses : lic.usedBranches;
    const max = type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches;
    if (max === null || max === undefined || max <= 0) return 0;
    return Math.min(100, Math.round((used / max) * 100));
  }

  getQuotaStatusClass(companyId: string, type: 'users' | 'warehouses' | 'branches'): string {
    const lic = this.getLicense(companyId);
    if (!lic) return 'state-unlimited';
    const used = type === 'users' ? lic.usedUsers : type === 'warehouses' ? lic.usedWarehouses : lic.usedBranches;
    const max = type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches;
    if (max === null || max === undefined) return 'state-unlimited';
    if (used >= max) return 'state-full';
    const pct = (used / max) * 100;
    return pct >= 80 ? 'state-warning' : 'state-available';
  }

  getShortStatusLabel(companyId: string, type: 'users' | 'warehouses' | 'branches'): string {
    const lic = this.getLicense(companyId);
    if (!lic) return this.langService.t('companies.portal.quotaUnlimitedShort');
    const used = type === 'users' ? lic.usedUsers : type === 'warehouses' ? lic.usedWarehouses : lic.usedBranches;
    const max = type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches;
    if (max === null || max === undefined) {
      return this.langService.t('companies.portal.quotaUnlimitedShort');
    }
    const rem = Math.max(0, max - used);
    if (rem === 0) {
      return this.langService.t('companies.portal.quotaFullShort');
    }
    return this.langService.t('companies.portal.quotaAvailableShort', { count: rem });
  }

  getQuotaTooltip(companyId: string, type: 'users' | 'warehouses' | 'branches'): string {
    const lic = this.getLicense(companyId);
    const used = this.getUsedCount(companyId, type);
    const max = lic ? (type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches) : undefined;
    const isAr = this.langService.currentLang() === 'ar';
    const typeLabel = isAr 
      ? (type === 'users' ? 'المستخدمون' : type === 'warehouses' ? 'المستودعات' : 'الفروع')
      : (type === 'users' ? 'Users' : type === 'warehouses' ? 'Warehouses' : 'Branches');

    if (max === null || max === undefined) {
      return isAr ? `${typeLabel}: ${used} (ترخيص غير محدود)` : `${typeLabel}: ${used} (Unlimited license)`;
    }
    const rem = Math.max(0, max - used);
    if (rem === 0) {
      return isAr ? `${typeLabel}: تم استهلاك الحد الأقصى بالكامل (${used} من ${max})` : `${typeLabel}: Maximum quota reached (${used} of ${max})`;
    }
    return isAr ? `${typeLabel}: ${used} من أصل ${max} (المتبقي: ${rem})` : `${typeLabel}: ${used} of ${max} (${rem} remaining)`;
  }

  getUsageText(companyId: string, type: 'users' | 'warehouses' | 'branches'): string {
    const lic = this.getLicense(companyId);
    if (!lic) return '-';

    const used = type === 'users' ? lic.usedUsers : type === 'warehouses' ? lic.usedWarehouses : lic.usedBranches;
    const max = type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches;

    if (max === null || max === undefined) {
      return `${used} / ∞`;
    }
    return `${used} / ${max}`;
  }

  isLimitFull(companyId: string, type: 'users' | 'warehouses' | 'branches'): boolean {
    const lic = this.getLicense(companyId);
    if (!lic) return false;

    const used = type === 'users' ? lic.usedUsers : type === 'warehouses' ? lic.usedWarehouses : lic.usedBranches;
    const max = type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches;

    return max !== null && max !== undefined && used >= max;
  }

  getRemainingText(companyId: string, type: 'users' | 'warehouses' | 'branches'): string {
    const lic = this.getLicense(companyId);
    if (!lic) return '-';

    const used = type === 'users' ? lic.usedUsers : type === 'warehouses' ? lic.usedWarehouses : lic.usedBranches;
    const max = type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches;

    if (max === null || max === undefined) {
      return this.langService.t('companies.portal.unlimitedRemaining');
    }
    const rem = Math.max(0, max - used);
    if (rem === 0) {
      return this.langService.t('companies.portal.noneRemaining');
    }
    return this.langService.t('companies.portal.availableRemaining', { count: rem });
  }

  getRemainingBadgeClass(companyId: string, type: 'users' | 'warehouses' | 'branches'): string {
    const lic = this.getLicense(companyId);
    if (!lic) return '';
    const used = type === 'users' ? lic.usedUsers : type === 'warehouses' ? lic.usedWarehouses : lic.usedBranches;
    const max = type === 'users' ? lic.maxUsers : type === 'warehouses' ? lic.maxWarehouses : lic.maxBranches;
    if (max === null || max === undefined) return 'badge-quota-unlimited';
    const rem = Math.max(0, max - used);
    return rem === 0 ? 'badge-quota-full' : 'badge-quota-available';
  }

  getExpiryLabel(companyId: string): string {
    const lic = this.getLicense(companyId);
    if (!lic || !lic.expiresAtUtc) {
      return this.langService.t('companies.portal.permanent');
    }

    const exp = new Date(lic.expiresAtUtc);
    const now = new Date();
    if (exp < now) {
      return this.langService.t('companies.portal.expired');
    }

    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 14) {
      return this.langService.t('companies.portal.daysLeft', { days: daysLeft });
    }

    return exp.toISOString().slice(0, 10);
  }

  getExpiryClass(companyId: string): string {
    const lic = this.getLicense(companyId);
    if (!lic || !lic.expiresAtUtc) return 'permanent';

    const exp = new Date(lic.expiresAtUtc);
    const now = new Date();
    if (exp < now) return 'expired';

    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 14 ? 'warning' : 'active';
  }

  getExpiryIcon(companyId: string): string {
    const cls = this.getExpiryClass(companyId);
    switch (cls) {
      case 'expired': return 'pi-times-circle';
      case 'warning': return 'pi-exclamation-triangle';
      case 'active': return 'pi-check-circle';
      default: return 'pi-infinity';
    }
  }

  toggleCompanyStatus(comp: TenantCompanyDto): void {
    const actionKey = comp.isActive ? 'confirmSuspend' : 'confirmActivate';
    const title = this.langService.t(`companies.portal.${actionKey}Title`);
    const text = this.langService.t(`companies.portal.${actionKey}Text`);

    Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: comp.isActive ? '#dc2626' : '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.langService.t('companies.portal.confirmActionBtn'),
      cancelButtonText: this.langService.t('companies.portal.cancelBtn')
    }).then((res) => {
      if (res.isConfirmed) {
        const nextState = !comp.isActive;
        this.tenantService.updateCompanyStatus(comp.id, nextState).subscribe({
          next: () => {
            this.companies.update(list => list.map(c => c.id === comp.id ? { ...c, isActive: nextState } : c));
            Swal.fire({
              icon: 'success',
              title: this.langService.t('companies.portal.statusUpdated'),
              confirmButtonColor: '#059669',
              timer: 1800,
              showConfirmButton: false
            });
          },
          error: (err) => {
            const msg = err?.error?.description || err?.error?.message || this.langService.t('companies.portal.updateFailed');
            Swal.fire({
              icon: 'error',
              title: this.langService.t('companies.portal.updateFailed'),
              text: msg,
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  reseedDefaults(comp: TenantCompanyDto): void {
    Swal.fire({
      title: this.langService.t('companies.portal.reseedDefaults'),
      text: comp.nameAr,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.langService.t('companies.portal.yesSeedDefaults'),
      cancelButtonText: this.langService.t('companies.portal.cancelBtn')
    }).then((res) => {
      if (res.isConfirmed) {
        this.tenantService.seedCompanyDefaults(comp.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.langService.t('companies.portal.defaultsSeeded'),
              text: this.langService.t('companies.portal.companyDefaultsSeededSuccessfu'),
              confirmButtonColor: '#059669'
            });
          },
          error: (err) => {
            const msg = err?.error?.description || err?.error?.message || this.langService.t('companies.portal.seedingFailed');
            Swal.fire({
              icon: 'error',
              title: this.langService.t('companies.portal.seedingFailed'),
              text: msg,
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // License Modal Handlers
  openLicenseModal(comp: TenantCompanyDto): void {
    this.selectedCompanyForLicense.set(comp);
    const lic = this.getLicense(comp.id);
    
    this.licenseForm = {
      maxUsers: lic?.maxUsers ?? null,
      maxWarehouses: lic?.maxWarehouses ?? null,
      maxBranches: lic?.maxBranches ?? null,
      expiresAtUtc: lic?.expiresAtUtc ? lic.expiresAtUtc.slice(0, 10) : null
    };

    this.showLicenseModal = true;
  }

  closeLicenseModal(): void {
    this.showLicenseModal = false;
    this.selectedCompanyForLicense.set(null);
  }

  saveLicense(): void {
    const comp = this.selectedCompanyForLicense();
    if (!comp) return;

    this.isSavingLicense.set(true);

    const payload = {
      maxUsers: this.licenseForm.maxUsers ? Number(this.licenseForm.maxUsers) : null,
      maxWarehouses: this.licenseForm.maxWarehouses ? Number(this.licenseForm.maxWarehouses) : null,
      maxBranches: this.licenseForm.maxBranches ? Number(this.licenseForm.maxBranches) : null,
      expiresAtUtc: this.licenseForm.expiresAtUtc ? new Date(this.licenseForm.expiresAtUtc).toISOString() : null
    };

    this.tenantService.setLicense(comp.id, payload).subscribe({
      next: (updatedLic) => {
        this.isSavingLicense.set(false);
        this.licenses.update(map => {
          const prev = map[comp.id] || { companyId: comp.id, usedUsers: 0, usedWarehouses: 0, usedBranches: 0 };
          return {
            ...map,
            [comp.id]: {
              ...prev,
              ...updatedLic
            }
          };
        });

        this.closeLicenseModal();

        Swal.fire({
          icon: 'success',
          title: this.langService.t('companies.portal.licenseSaveSuccess'),
          confirmButtonColor: '#059669',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.isSavingLicense.set(false);
        const msg = err?.error?.description || err?.error?.message || this.langService.t('companies.portal.licenseSaveError');
        Swal.fire({
          icon: 'error',
          title: this.langService.t('companies.portal.licenseSaveError'),
          text: msg,
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  openOnboarding(): void {
    this.router.navigate(['/companies/new']);
  }

  openResetPasswordModal(comp: TenantCompanyDto): void {
    const isAr = this.langService.currentLang() === 'ar';
    const adminUser = this.licenses()[comp.id]?.adminUserName || comp.code.toLowerCase();
    const compName = isAr ? comp.nameAr : (comp.nameEn || comp.nameAr);

    const title = this.langService.t('companies.portal.resetPasswordModalTitle');
    const customHint = this.langService.t('companies.portal.resetPasswordCustomHint');
    const confirmBtn = this.langService.t('companies.portal.resetPasswordConfirmBtn');
    const cancelBtn = this.langService.t('companies.portal.cancelBtn');

    Swal.fire({
      title,
      html: `
        <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.875rem; color: #334155; margin-bottom: 0.75rem; line-height: 1.6;">
          <p style="margin: 0 0 0.35rem 0;"><strong>${isAr ? 'المنشأة:' : 'Company:'}</strong> ${compName} (${comp.code})</p>
          <p style="margin: 0 0 0.75rem 0;"><strong>${isAr ? 'اسم المستخدم للمسؤول:' : 'Admin Username:'}</strong> <code style="background: #EFF6FF; color: #1D4ED8; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${adminUser}</code></p>
          <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 0.35rem;">
            ${customHint}
          </label>
          <input id="swal-admin-new-pwd" type="text" class="swal2-input" style="width: 100%; margin: 0; height: 2.6rem; font-size: 0.95rem; font-family: monospace;" placeholder="${comp.code}@2026!">
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmBtn,
      cancelButtonText: cancelBtn,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const inputEl = document.getElementById('swal-admin-new-pwd') as HTMLInputElement;
        const newPwd = inputEl?.value?.trim() || undefined;
        return this.tenantService.resetAdminPassword(comp.id, newPwd).toPromise()
          .catch(err => {
            const msg = err?.error?.description || err?.error?.message || this.langService.t('companies.portal.resetPasswordError');
            Swal.showValidationMessage(msg);
          });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const res = result.value;
        const successTitle = this.langService.t('companies.portal.resetPasswordSuccessTitle');
        const copyBtnText = this.langService.t('companies.portal.resetPasswordSuccessCopy');

        Swal.fire({
          icon: 'success',
          title: successTitle,
          html: `
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 1rem; text-align: center; margin-top: 0.5rem;">
              <div style="font-size: 0.85rem; color: #64748B; margin-bottom: 0.35rem;">
                ${isAr ? 'المستخدم:' : 'User:'} <strong style="color: #0F172A;">${res.userName}</strong>
              </div>
              <div style="font-size: 0.85rem; color: #64748B; margin-bottom: 0.75rem;">
                ${isAr ? 'الاسم:' : 'Name:'} <strong style="color: #0F172A;">${res.fullName || '-'}</strong>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #ECFDF5; border: 1px dashed #10B981; border-radius: 8px; padding: 0.75rem 1rem;">
                <span style="font-family: monospace; font-size: 1.35rem; font-weight: 800; color: #047857; letter-spacing: 1px;">${res.newPassword}</span>
              </div>
            </div>
          `,
          confirmButtonText: copyBtnText,
          confirmButtonColor: '#059669'
        }).then(() => {
          if (navigator.clipboard && res.newPassword) {
            navigator.clipboard.writeText(res.newPassword);
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true
            });
            Toast.fire({
              icon: 'success',
              title: this.langService.t('companies.portal.resetPasswordCopied')
            });
          }
        });
      }
    });
  }

  getInitials(name?: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLElement;
    if (target) target.style.display = 'none';
  }
}
