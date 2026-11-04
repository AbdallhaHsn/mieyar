import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService, Company } from '../../core/services/company-context.service';
import { AuthService } from '../../core/services/auth.service';
import { AccountingTranslatorService } from '../../core/services/accounting-translator.service';
import { TenantManagementService, TenantCompanyDto } from '../../core/services/tenant-management.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-company-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="onboarding-page" [dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Top Sticky Action Header -->
      <div class="page-topbar">
        <div class="topbar-info">
          <div class="breadcrumbs">
            <span class="crumb-link" (click)="close()">
              <i class="pi pi-building"></i>
              {{ 'companies.portal.tenantsDirectory' | translate }}
            </span>
            <i class="pi" [ngClass]="langService.currentLang() === 'ar' ? 'pi-angle-left' : 'pi-angle-right'"></i>
            <span class="crumb-active">{{ 'companies.onboarding.title' | translate }}</span>
          </div>
          <div class="topbar-title-row">
            <div class="header-icon-box">
              <i class="pi pi-building-columns"></i>
            </div>
            <div>
              <h1 class="page-title">{{ 'companies.onboarding.title' | translate }}</h1>
              <p class="page-subtitle">{{ 'companies.onboarding.subtitle' | translate }}</p>
            </div>
          </div>
        </div>

        <div class="topbar-actions">
          <button type="button" class="btn-compact-cancel" (click)="close()" [disabled]="isSubmitting">
            <i class="pi pi-times"></i>
            <span>{{ langService.t('action.cancel') }}</span>
          </button>
          <button 
            type="button" 
            class="btn-compact-submit" 
            (click)="submit()"
            [disabled]="isSubmitting || !model.nameAr || !model.code || !model.adminUserName || !model.adminPassword">
            <i class="pi" [ngClass]="isSubmitting ? 'pi-spin pi-spinner' : 'pi-check'"></i>
            <span>
              {{ isSubmitting ? ('companies.onboarding.provisioning' | translate) : ('companies.onboarding.onboardAction' | translate) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Main Form Container -->
      <form (ngSubmit)="submit()" class="onboarding-form">
        
        <!-- SECTION 1: Company Profile & Commercial Data -->
        <section class="form-card">
          <div class="card-header">
            <div class="card-title-wrap">
              <span class="step-badge">1</span>
              <div>
                <h2 class="card-title">{{ 'companies.onboarding.sec1Title' | translate }}</h2>
                <span class="card-desc">{{ 'companies.onboarding.sec1Subtitle' | translate }}</span>
              </div>
            </div>
            <span class="pill-tag">{{ 'companies.onboarding.coreProfile' | translate }}</span>
          </div>

          <div class="card-body">
            <!-- Row 1: Dual Names (AR & EN with auto-translation) -->
            <div class="grid-row cols-2">
              <div class="form-item">
                <div class="label-row">
                  <label class="compact-label required">{{ 'companies.onboarding.companyNameAr' | translate }}</label>
                  <span class="tag-ar">{{ 'accounting.accountCreate.nameArTag' | translate }}</span>
                </div>
                <div class="compact-input-wrap">
                  <i class="pi pi-building field-icon"></i>
                  <input 
                    type="text" 
                    [ngModel]="model.nameAr" 
                    (ngModelChange)="onNameArChange($event)" 
                    name="nameAr" 
                    required 
                    class="compact-input"
                    [placeholder]="'ui.companyOnboarding.d051ae' | translate" 
                  />
                </div>
              </div>

              <div class="form-item">
                <div class="label-row">
                  <label class="compact-label required">{{ 'companies.onboarding.companyNameEn' | translate }}</label>
                  <button type="button" class="btn-instant-translate" (click)="retranslateCompanyName()" [title]="'projects.hub.workspace.wbs.retranslate' | translate">
                    <i class="pi pi-globe"></i>
                    <span>{{ 'companies.onboarding.autoTranslate' | translate }}</span>
                  </button>
                </div>
                <div class="compact-input-wrap">
                  <i class="pi pi-globe field-icon"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="model.nameEn" 
                    name="nameEn" 
                    required 
                    dir="ltr"
                    class="compact-input"
                    placeholder="e.g. Al-Rowad Smart Contracting Co." 
                  />
                </div>
              </div>
            </div>

            <!-- Row 2: Code, Currency, VAT, CR (High-Density 4 Columns) -->
            <div class="grid-row cols-4">
              <div class="form-item">
                <label class="compact-label required">{{ 'companies.onboarding.companyCode' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-hashtag field-icon"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="model.code" 
                    name="code" 
                    required 
                    class="compact-input font-mono text-uppercase" 
                    placeholder="ROWAD01" 
                  />
                </div>
              </div>

              <div class="form-item">
                <label class="compact-label required">{{ 'companies.onboarding.defaultCurrency' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-money-bill field-icon"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="model.currencyCode" 
                    name="currencyCode" 
                    required 
                    class="compact-input font-mono" 
                    placeholder="SAR" 
                  />
                </div>
              </div>

              <div class="form-item">
                <div class="label-row">
                  <label class="compact-label required">{{ 'companies.onboarding.vatNumber' | translate }}</label>
                  <span class="tag-zatca"><i class="pi pi-shield"></i> ZATCA</span>
                </div>
                <div class="compact-input-wrap">
                  <i class="pi pi-id-card field-icon"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="model.vatNumber" 
                    name="vatNumber" 
                    required 
                    maxlength="15"
                    class="compact-input font-mono" 
                    placeholder="310998877600003" 
                  />
                </div>
              </div>

              <div class="form-item">
                <label class="compact-label required">{{ 'companies.onboarding.crNumber' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-file-edit field-icon"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="model.commercialRegistration" 
                    name="commercialRegistration" 
                    required 
                    class="compact-input font-mono" 
                    placeholder="1010887766" 
                  />
                </div>
              </div>
            </div>

            <!-- Row 3: Logo & Brand Theme Color -->
            <div class="grid-row cols-2 branding-row">
              <!-- Compact Logo Uploader -->
              <div class="form-item">
                <div class="label-row">
                  <label class="compact-label">
                    <i class="pi pi-image text-emerald"></i>
                    <span>{{ 'companies.onboarding.officialLogo' | translate }}</span>
                  </label>
                  <button 
                    type="button" 
                    class="btn-mode-toggle" 
                    (click)="toggleLogoInputMode()">
                    <i [class]="logoInputMode === 'file' ? 'pi pi-link' : 'pi pi-upload'"></i>
                    <span>{{ logoInputMode === 'file' ? ('companies.onboarding.useDirectUrl' | translate) : ('companies.onboarding.uploadFromDevice' | translate) }}</span>
                  </button>
                </div>

                <!-- Mode 1: File Upload -->
                <div *ngIf="logoInputMode === 'file'" class="compact-upload-container">
                  <input 
                    type="file" 
                    #logoFileInput 
                    (change)="onLogoFileSelected($event)" 
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
                    style="display: none;" 
                  />

                  <div 
                    *ngIf="!model.logoUrl" 
                    class="compact-dropzone" 
                    (click)="logoFileInput.click()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onFileDropped($event, logoFileInput)"
                    [class.dragover]="isDragging">
                    <i class="pi pi-cloud-upload upload-mini-icon"></i>
                    <span class="upload-txt">{{ 'companies.onboarding.clickToSelectLogo' | translate }}</span>
                    <span class="upload-ext font-mono">PNG, JPG, SVG, WebP (&lt; 5MB)</span>
                  </div>

                  <div *ngIf="model.logoUrl" class="compact-logo-preview">
                    <img [src]="model.logoUrl" alt="Logo" class="preview-thumb" (error)="onLogoError()" />
                    <span class="preview-filename font-mono">{{ logoFileName || ('companies.onboarding.selectedLogo' | translate) }}</span>
                    <button type="button" class="btn-mini-change" (click)="logoFileInput.click()">
                      <i class="pi pi-refresh"></i>
                    </button>
                    <button type="button" class="btn-mini-remove" (click)="removeLogo(logoFileInput)">
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                </div>

                <!-- Mode 2: Direct URL -->
                <div *ngIf="logoInputMode === 'url'" class="compact-url-container">
                  <div class="compact-input-wrap">
                    <i class="pi pi-link field-icon"></i>
                    <input 
                      type="text" 
                      [(ngModel)]="model.logoUrl" 
                      name="logoUrl" 
                      class="compact-input"
                      placeholder="https://.../logo.png" 
                    />
                    <button *ngIf="model.logoUrl" type="button" class="btn-clear-inline" (click)="model.logoUrl = ''">
                      <i class="pi pi-times"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Brand Theme Color -->
              <div class="form-item">
                <label class="compact-label">{{ 'companies.onboarding.brandColor' | translate }}</label>
                <div class="compact-color-bar">
                  <div class="swatches-wrap">
                    <button 
                      type="button" 
                      *ngFor="let c of presetColors" 
                      class="swatch-dot" 
                      [style.background-color]="c"
                      [class.active]="model.brandThemeColor === c"
                      (click)="model.brandThemeColor = c">
                    </button>
                  </div>
                  <div class="custom-color-chip">
                    <input type="color" [(ngModel)]="model.brandThemeColor" name="brandThemeColor" class="native-color-input" />
                    <span class="font-mono color-code">{{ model.brandThemeColor }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 2: Initial Company Administrator Credentials -->
        <section class="form-card admin-card">
          <div class="card-header">
            <div class="card-title-wrap">
              <span class="step-badge admin-badge">2</span>
              <div>
                <h2 class="card-title">{{ 'companies.onboarding.sec2Title' | translate }}</h2>
                <span class="card-desc">{{ 'companies.onboarding.sec2Subtitle' | translate }}</span>
              </div>
            </div>
            <span class="pill-tag admin-tag">{{ 'companies.onboarding.adminBadge' | translate }}</span>
          </div>

          <div class="card-body">
            <!-- Row 1: Admin Full Names (AR & EN) -->
            <div class="grid-row cols-2">
              <div class="form-item">
                <div class="label-row">
                  <label class="compact-label required">{{ 'companies.onboarding.adminNameAr' | translate }}</label>
                  <span class="tag-ar">{{ 'accounting.accountCreate.nameArTag' | translate }}</span>
                </div>
                <div class="compact-input-wrap">
                  <i class="pi pi-user field-icon"></i>
                  <input 
                    type="text" 
                    [ngModel]="model.adminFullNameAr" 
                    (ngModelChange)="onAdminFullNameArChange($event)" 
                    name="adminFullNameAr" 
                    required 
                    class="compact-input"
                    [placeholder]="'ui.companyOnboarding.909076' | translate" 
                  />
                </div>
              </div>

              <div class="form-item">
                <div class="label-row">
                  <label class="compact-label required">{{ 'companies.onboarding.adminNameEn' | translate }}</label>
                  <button type="button" class="btn-instant-translate" (click)="retranslateAdminName()" [title]="'projects.hub.workspace.wbs.retranslate' | translate">
                    <i class="pi pi-globe"></i>
                    <span>{{ 'companies.onboarding.autoTranslate' | translate }}</span>
                  </button>
                </div>
                <div class="compact-input-wrap">
                  <i class="pi pi-globe field-icon"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="model.adminFullNameEn" 
                    name="adminFullNameEn" 
                    required 
                    dir="ltr"
                    class="compact-input"
                    placeholder="Sulaiman Ibrahim Al-Abdullah" 
                  />
                </div>
              </div>
            </div>

            <!-- Row 2: Username, Email, Password, Phone (High-Density 4 Columns) -->
            <div class="grid-row cols-4">
              <div class="form-item">
                <label class="compact-label required">{{ 'companies.onboarding.adminUsername' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-at field-icon"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="model.adminUserName" 
                    name="adminUserName" 
                    required 
                    class="compact-input font-mono" 
                    placeholder="admin_rowad" 
                  />
                </div>
              </div>

              <div class="form-item">
                <label class="compact-label required">{{ 'companies.onboarding.adminEmail' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-envelope field-icon"></i>
                  <input 
                    type="email" 
                    [(ngModel)]="model.adminEmail" 
                    name="adminEmail" 
                    required 
                    dir="ltr"
                    class="compact-input font-mono" 
                    placeholder="admin@alrowad.com" 
                  />
                </div>
              </div>

              <div class="form-item">
                <label class="compact-label required">{{ 'companies.onboarding.initialPassword' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-lock field-icon"></i>
                  <input 
                    [type]="showPassword ? 'text' : 'password'" 
                    [(ngModel)]="model.adminPassword" 
                    name="adminPassword" 
                    required 
                    class="compact-input font-mono" 
                    placeholder="••••••••" 
                  />
                  <button type="button" class="btn-toggle-eye" (click)="showPassword = !showPassword">
                    <i class="pi" [ngClass]="showPassword ? 'pi-eye-slash' : 'pi-eye'"></i>
                  </button>
                </div>
              </div>

              <div class="form-item">
                <label class="compact-label">{{ 'companies.onboarding.contactPhone' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-phone field-icon"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="model.phoneNumber" 
                    name="phoneNumber" 
                    dir="ltr"
                    class="compact-input font-mono" 
                    placeholder="+966501234567" 
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 3: Initial License Quota & Subscription Caps (SuperAdmin Only) -->
        <section class="form-card license-card">
          <div class="card-header">
            <div class="card-title-wrap">
              <span class="step-badge license-badge">3</span>
              <div>
                <h2 class="card-title">{{ 'companies.portal.licenseModalTitle' | translate }}</h2>
                <span class="card-desc">{{ 'companies.portal.unlimitedHint' | translate }} ({{ 'companies.portal.noExpiryHint' | translate }})</span>
              </div>
            </div>
            <span class="pill-tag license-tag">{{ 'companies.portal.licenseAndLimits' | translate }}</span>
          </div>

          <div class="card-body">
            <div class="grid-row cols-4">
              <div class="form-item">
                <label class="compact-label">{{ 'companies.portal.maxUsers' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-users field-icon"></i>
                  <input 
                    type="number" 
                    [(ngModel)]="licenseForm.maxUsers" 
                    name="maxUsers" 
                    min="1"
                    class="compact-input font-mono" 
                    placeholder="∞ غير محدود" 
                  />
                </div>
              </div>

              <div class="form-item">
                <label class="compact-label">{{ 'companies.portal.maxWarehouses' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-box field-icon"></i>
                  <input 
                    type="number" 
                    [(ngModel)]="licenseForm.maxWarehouses" 
                    name="maxWarehouses" 
                    min="1"
                    class="compact-input font-mono" 
                    placeholder="∞ غير محدود" 
                  />
                </div>
              </div>

              <div class="form-item">
                <label class="compact-label">{{ 'companies.portal.maxBranches' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-sitemap field-icon"></i>
                  <input 
                    type="number" 
                    [(ngModel)]="licenseForm.maxBranches" 
                    name="maxBranches" 
                    min="1"
                    class="compact-input font-mono" 
                    placeholder="∞ غير محدود" 
                  />
                </div>
              </div>

              <div class="form-item">
                <label class="compact-label">{{ 'companies.portal.expiryDate' | translate }}</label>
                <div class="compact-input-wrap">
                  <i class="pi pi-calendar field-icon"></i>
                  <input 
                    type="date" 
                    [(ngModel)]="licenseForm.expiresAtUtc" 
                    name="expiresAtUtc" 
                    class="compact-input font-mono" 
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Form Bottom Actions Bar -->
        <div class="form-bottom-bar">
          <button type="button" class="btn-compact-cancel" (click)="close()" [disabled]="isSubmitting">
            <i class="pi pi-arrow-right"></i>
            <span>{{ langService.t('action.cancel') }}</span>
          </button>
          <button 
            type="submit" 
            class="btn-compact-submit" 
            [disabled]="isSubmitting || !model.nameAr || !model.code || !model.adminUserName || !model.adminPassword">
            <i class="pi" [ngClass]="isSubmitting ? 'pi-spin pi-spinner' : 'pi-check'"></i>
            <span>
              {{ isSubmitting ? ('companies.onboarding.provisioning' | translate) : ('companies.onboarding.onboardAction' | translate) }}
            </span>
          </button>
        </div>

      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic, 'Inter', -apple-system, sans-serif) !important;
      color: #0f172a;
    }

    button, input, select {
      font-family: inherit !important;
      box-sizing: border-box;
    }

    .onboarding-page {
      padding: 1rem 1.5rem 2rem 1.5rem;
      background: #f8fafc;
      min-height: calc(100vh - 65px);
      box-sizing: border-box;
      max-width: 1240px;
      margin: 0 auto;
    }

    /* Top Sticky Action Header */
    .page-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      flex-wrap: wrap;
    }

    .topbar-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .breadcrumbs {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.775rem;
      color: #64748b;
    }

    .crumb-link {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #0f766e;
      font-weight: 600;
      transition: color 0.15s;
      &:hover { color: #0d5f58; text-decoration: underline; }
    }

    .crumb-active {
      color: #334155;
      font-weight: 500;
    }

    .topbar-title-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .header-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      box-shadow: 0 2px 6px rgba(15, 118, 110, 0.25);
    }

    .page-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .page-subtitle {
      font-size: 0.775rem;
      color: #64748b;
      margin: 0;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-compact-cancel {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.42rem 0.85rem;
      border-radius: 7px;
      font-size: 0.825rem;
      font-weight: 600;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
      &:hover:not(:disabled) { background: #f1f5f9; color: #1e293b; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .btn-compact-submit {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.42rem 1.15rem;
      border-radius: 7px;
      font-size: 0.825rem;
      font-weight: 700;
      background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
      color: #ffffff;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(15, 118, 110, 0.3);
      transition: all 0.15s;
      &:hover:not(:disabled) { background: linear-gradient(135deg, #0d5f58 0%, #0f4b46 100%); transform: translateY(-1px); }
      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }

    /* Form Container */
    .onboarding-form {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    /* Cards */
    .form-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.9rem 1.15rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

      &.admin-card {
        border-color: #cbd5e1;
        background: #ffffff;
      }

      &.license-card {
        border-color: #ddd6fe;
        background: #faf8ff;
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-bottom: 0.65rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .card-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .step-badge {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #0f766e;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;

      &.admin-badge { background: #0284c7; }
      &.license-badge { background: #7c3aed; }
    }

    .card-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .card-desc {
      font-size: 0.725rem;
      color: #64748b;
    }

    .pill-tag {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.25);

      &.admin-tag {
        background: #f0f9ff;
        color: #0284c7;
        border-color: rgba(2, 132, 199, 0.25);
      }

      &.license-tag {
        background: #f5f3ff;
        color: #7c3aed;
        border-color: rgba(124, 58, 237, 0.25);
      }
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    /* Grids */
    .grid-row {
      display: grid;
      gap: 0.65rem;

      &.cols-2 {
        grid-template-columns: repeat(2, 1fr);
        @media (max-width: 768px) { grid-template-columns: 1fr; }
      }

      &.cols-4 {
        grid-template-columns: repeat(4, 1fr);
        @media (max-width: 992px) { grid-template-columns: repeat(2, 1fr); }
        @media (max-width: 576px) { grid-template-columns: 1fr; }
      }
    }

    /* Form Items & Compact Inputs */
    .form-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .compact-label {
      font-size: 0.76rem;
      font-weight: 700;
      color: #334155;

      &.required::after {
        content: " *";
        color: #e11d48;
      }
    }

    .tag-ar {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.05rem 0.35rem;
      border-radius: 4px;
      background: #f1f5f9;
      color: #475569;
    }

    .tag-zatca {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.05rem 0.35rem;
      border-radius: 4px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .btn-instant-translate {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
      font-size: 0.68rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      &:hover { background: #dcfce7; }
    }

    .compact-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .field-icon {
      position: absolute;
      right: 9px;
      color: #94a3b8;
      font-size: 0.8rem;
      pointer-events: none;
    }

    [dir="ltr"] .field-icon {
      right: auto;
      left: 9px;
    }

    .compact-input {
      width: 100%;
      height: 33px;
      padding: 0.25rem 2rem 0.25rem 0.65rem;
      font-size: 0.8125rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      color: #0f172a;
      transition: border-color 0.15s, box-shadow 0.15s;

      &:focus {
        outline: none;
        border-color: #0f766e;
        box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.12);
      }

      &::placeholder {
        color: #94a3b8;
        font-size: 0.775rem;
      }
    }

    [dir="ltr"] .compact-input {
      padding: 0.25rem 0.65rem 0.25rem 2rem;
    }

    .text-uppercase { text-transform: uppercase; }

    .btn-toggle-eye {
      position: absolute;
      left: 7px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 2px 4px;
      font-size: 0.85rem;
      &:hover { color: #475569; }
    }

    [dir="ltr"] .btn-toggle-eye {
      left: auto;
      right: 7px;
    }

    .btn-clear-inline {
      position: absolute;
      left: 7px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      &:hover { color: #ef4444; }
    }

    [dir="ltr"] .btn-clear-inline {
      left: auto;
      right: 7px;
    }

    /* Logo Uploader & Color Chip Styling */
    .branding-row {
      align-items: center;
    }

    .btn-mode-toggle {
      background: none;
      border: none;
      color: #0284c7;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      &:hover { text-decoration: underline; }
    }

    .compact-upload-container {
      margin-top: 0.1rem;
    }

    .compact-dropzone {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.15s;
      &:hover, &.dragover { background: #f0fdf4; border-color: #059669; }
    }

    .upload-mini-icon {
      font-size: 0.95rem;
      color: #059669;
    }

    .upload-txt {
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
    }

    .upload-ext {
      font-size: 0.68rem;
      color: #94a3b8;
      margin-right: auto;
    }

    [dir="ltr"] .upload-ext {
      margin-right: 0;
      margin-left: auto;
    }

    .compact-logo-preview {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.65rem;
      background: #f8fafc;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
    }

    .preview-thumb {
      width: 26px;
      height: 26px;
      object-fit: contain;
      border-radius: 4px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }

    .preview-filename {
      font-size: 0.75rem;
      font-weight: 600;
      color: #065f46;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-mini-change {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.7rem;
      &:hover { background: #f1f5f9; }
    }

    .btn-mini-remove {
      background: #ffffff;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.7rem;
      &:hover { background: #fee2e2; }
    }

    .compact-color-bar {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      height: 33px;
    }

    .swatches-wrap {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .swatch-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      padding: 0;
      transition: transform 0.15s;
      &.active {
        transform: scale(1.2);
        box-shadow: 0 0 0 2px #ffffff, 0 0 0 3px #0f766e;
      }
    }

    .custom-color-chip {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 2px 6px;
      height: 27px;
    }

    .native-color-input {
      width: 18px;
      height: 18px;
      border: none;
      padding: 0;
      background: none;
      cursor: pointer;
    }

    .color-code {
      font-size: 0.725rem;
      color: #475569;
    }

    /* Bottom Actions Bar */
    .form-bottom-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.65rem;
      padding: 0.75rem 0;
    }
  `]
})
export class CompanyOnboardingComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() companyCreated = new EventEmitter<TenantCompanyDto>();

  langService = inject(LanguageService);
  private companyContext = inject(CompanyContextService);
  private authService = inject(AuthService);
  private translator = inject(AccountingTranslatorService);
  private tenantService = inject(TenantManagementService);
  private router = inject(Router);

  isSubmitting = false;
  showPassword = false;

  logoInputMode: 'file' | 'url' = 'file';
  logoFileName: string = '';
  isDragging: boolean = false;

  presetColors = ['#0f766e', '#2563eb', '#7c3aed', '#0284c7', '#334155'];

  model = {
    code: '',
    nameAr: '',
    nameEn: '',
    vatNumber: '',
    commercialRegistration: '',
    currencyCode: 'SAR',
    logoUrl: '',
    brandThemeColor: '#0f766e',
    adminFullNameAr: '',
    adminFullNameEn: '',
    adminUserName: '',
    adminEmail: '',
    adminPassword: '',
    phoneNumber: ''
  };

  licenseForm = {
    maxUsers: null as number | null,
    maxWarehouses: null as number | null,
    maxBranches: null as number | null,
    expiresAtUtc: null as string | null
  };

  onNameArChange(val: string) {
    this.model.nameAr = val;
    this.model.nameEn = this.translator.translateArabicToEnglish(val);
  }

  onAdminFullNameArChange(val: string) {
    this.model.adminFullNameAr = val;
    this.model.adminFullNameEn = this.translator.translateArabicToEnglish(val);
  }

  retranslateCompanyName() {
    if (this.model.nameAr) {
      this.model.nameEn = this.translator.translateArabicToEnglish(this.model.nameAr);
    }
  }

  retranslateAdminName() {
    if (this.model.adminFullNameAr) {
      this.model.adminFullNameEn = this.translator.translateArabicToEnglish(this.model.adminFullNameAr);
    }
  }

  toggleLogoInputMode() {
    this.logoInputMode = this.logoInputMode === 'file' ? 'url' : 'file';
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
  }

  onFileDropped(e: DragEvent, fileInput: HTMLInputElement) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.handleFile(e.dataTransfer.files[0]);
    }
  }

  onLogoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File) {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('companyOnboarding.alerts.unsupportedFormatTitle'),
        text: this.langService.t('companyOnboarding.alerts.unsupportedFormatText'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('companyOnboarding.alerts.fileTooLargeTitle'),
        text: this.langService.t('companyOnboarding.alerts.fileTooLargeText'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    this.logoFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.model.logoUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeLogo(fileInput?: HTMLInputElement) {
    this.model.logoUrl = '';
    this.logoFileName = '';
    if (fileInput) fileInput.value = '';
  }

  onLogoError() {
    this.model.logoUrl = '';
  }

  close() {
    this.closed.emit();
    this.router.navigate(['/companies']);
  }

  submit() {
    if (!this.model.nameAr || !this.model.code || !this.model.adminUserName || !this.model.adminPassword) {
      return;
    }

    this.isSubmitting = true;

    const payload = {
      code: this.model.code.trim().toUpperCase(),
      nameAr: this.model.nameAr.trim(),
      nameEn: (this.model.nameEn || this.model.nameAr).trim(),
      vatNumber: this.model.vatNumber.trim(),
      commercialRegistration: this.model.commercialRegistration.trim(),
      currencyCode: this.model.currencyCode.trim().toUpperCase() || 'SAR',
      logoUrl: this.model.logoUrl || undefined,
      brandThemeColor: this.model.brandThemeColor || '#0f766e',
      address: {
        streetName: 'طريق الملك فهد',
        buildingNumber: '1234',
        subDivisionName: 'العليا',
        cityName: 'الرياض',
        postalZone: '12211',
        countryCode: 'SA'
      },
      adminUser: {
        userName: this.model.adminUserName.trim(),
        email: this.model.adminEmail.trim(),
        password: this.model.adminPassword,
        fullNameAr: (this.model.adminFullNameAr || this.model.adminUserName).trim(),
        fullNameEn: (this.model.adminFullNameEn || this.model.adminFullNameAr || this.model.adminUserName).trim(),
        phoneNumber: this.model.phoneNumber.trim() || undefined
      }
    };

    this.tenantService.onboardCompany(payload).subscribe({
      next: (created) => {
        // Register in company context
        const comp: Company = {
          id: created.id,
          code: created.code,
          nameAr: created.nameAr,
          nameEn: created.nameEn,
          vatNumber: created.vatNumber,
          commercialRegistration: created.commercialRegistration,
          currencyCode: created.currencyCode,
          logoUrl: created.logoUrl,
          brandThemeColor: created.brandThemeColor,
          branches: (created.branches || []).map(b => ({
            id: b.id,
            code: b.code,
            nameAr: b.nameAr,
            nameEn: b.nameEn,
            isMainBranch: b.isMainBranch
          })),
          fiscalYears: (created.fiscalYears || []).map(y => ({
            id: y.id,
            yearNumber: y.yearNumber,
            nameAr: y.nameAr,
            nameEn: y.nameEn,
            startDate: y.startDate,
            endDate: y.endDate,
            isClosed: y.isClosed,
            periods: []
          }))
        };

        this.companyContext.availableCompanies.update(list => [...list, comp]);
        if (!this.authService.isSuperAdmin()) {
          this.companyContext.setCompany(comp);
        }

        // If license caps or expiry were specified, set them now
        if (this.licenseForm.maxUsers || this.licenseForm.maxWarehouses || this.licenseForm.maxBranches || this.licenseForm.expiresAtUtc) {
          const licPayload = {
            maxUsers: this.licenseForm.maxUsers ? Number(this.licenseForm.maxUsers) : null,
            maxWarehouses: this.licenseForm.maxWarehouses ? Number(this.licenseForm.maxWarehouses) : null,
            maxBranches: this.licenseForm.maxBranches ? Number(this.licenseForm.maxBranches) : null,
            expiresAtUtc: this.licenseForm.expiresAtUtc ? new Date(this.licenseForm.expiresAtUtc).toISOString() : null
          };
          this.tenantService.setLicense(created.id, licPayload).subscribe({
            next: () => {},
            error: () => {}
          });
        }

        Swal.fire({
          icon: 'success',
          title: this.langService.t('companyOnboarding.alerts.onboardSuccessTitle'),
          text: this.langService.t('companyOnboarding.alerts.onboardSuccessText'),
          confirmButtonColor: '#059669',
          timer: 2200,
          showConfirmButton: false
        });

        this.companyCreated.emit(created);
        this.close();
      },
      error: (err) => {
        this.isSubmitting = false;
        const errMsg = err?.error?.description || err?.error?.Description || err?.error?.message || this.langService.t('companyOnboarding.alerts.onboardErrorDefault');
        Swal.fire({
          icon: 'error',
          title: this.langService.t('companyOnboarding.alerts.onboardErrorTitle'),
          text: errMsg,
          confirmButtonColor: '#e11d48'
        });
      }
    });
  }
}
