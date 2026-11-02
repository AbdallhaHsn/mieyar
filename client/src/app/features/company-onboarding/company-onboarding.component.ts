import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    <div class="modal-overlay" (click)="close()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="modal-header">
          <div class="header-branding">
            <div class="header-icon-badge">
              <i class="pi pi-building-columns"></i>
            </div>
            <div>
              <h2 class="modal-title">
                {{ 'companies.onboarding.title' | translate }}
              </h2>
              <p class="modal-desc">
                {{ 'companies.onboarding.subtitle' | translate }}
              </p>
            </div>
          </div>
          <button type="button" class="btn-close" (click)="close()" [title]="langService.t('action.cancel')">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <!-- Form Body -->
        <form (ngSubmit)="submit()" class="onboarding-form">
          <div class="modal-body-scroll">
            
            <!-- SECTION 1: Company Profile & Commercial Data -->
            <div class="form-section">
              <div class="section-header">
                <div class="section-title-wrap">
                  <span class="section-step-num">1</span>
                  <div>
                    <h3 class="section-title">
                      {{ 'companies.onboarding.sec1Title' | translate }}
                    </h3>
                    <span class="section-subtitle">
                      {{ 'companies.onboarding.sec1Subtitle' | translate }}
                    </span>
                  </div>
                </div>
                <span class="section-badge">{{ 'companies.onboarding.coreProfile' | translate }}</span>
              </div>

              <!-- Row 1: Names (AR & EN with auto-translation) -->
              <div class="form-grid-2">
                <!-- Arabic Name -->
                <div class="form-group">
                  <div class="label-row">
                    <label class="required">{{ 'companies.onboarding.companyNameAr' | translate }}</label>
                    <span class="lang-tag ar">{{ 'accounting.accountCreate.nameArTag' | translate }}</span>
                  </div>
                  <div class="input-with-icon">
                    <i class="pi pi-building input-icon"></i>
                    <input 
                      type="text" 
                      [ngModel]="model.nameAr" 
                      (ngModelChange)="onNameArChange($event)" 
                      name="nameAr" 
                      required 
                      [placeholder]="'ui.companyOnboarding.d051ae' | translate" 
                    />
                  </div>
                </div>

                <!-- English Name -->
                <div class="form-group">
                  <div class="label-row">
                    <label class="required">{{ 'companies.onboarding.companyNameEn' | translate }}</label>
                    <button type="button" class="btn-retranslate" (click)="retranslateCompanyName()" [title]="'projects.hub.workspace.wbs.retranslate' | translate">
                      <i class="pi pi-globe"></i>
                      <span>{{ 'companies.onboarding.autoTranslate' | translate }}</span>
                    </button>
                  </div>
                  <div class="input-with-icon">
                    <i class="pi pi-globe input-icon"></i>
                    <input 
                      type="text" 
                      [(ngModel)]="model.nameEn" 
                      name="nameEn" 
                      required 
                      dir="ltr"
                      placeholder="e.g. Al-Rowad Smart Contracting Co." 
                    />
                  </div>
                </div>
              </div>

              <!-- Row 2: Code & Currency -->
              <div class="form-grid-2">
                <!-- Code -->
                <div class="form-group">
                  <label class="required">{{ 'companies.onboarding.companyCode' | translate }}</label>
                  <div class="input-with-icon">
                    <i class="pi pi-hashtag input-icon"></i>
                    <input 
                      type="text" 
                      [(ngModel)]="model.code" 
                      name="code" 
                      required 
                      class="font-mono text-uppercase" 
                      placeholder="ROWAD01" 
                    />
                  </div>
                </div>

                <!-- Currency -->
                <div class="form-group">
                  <label class="required">{{ 'companies.onboarding.defaultCurrency' | translate }}</label>
                  <div class="input-with-icon">
                    <i class="pi pi-money-bill input-icon"></i>
                    <input 
                      type="text" 
                      [(ngModel)]="model.currencyCode" 
                      name="currencyCode" 
                      required 
                      class="font-mono" 
                      placeholder="SAR" 
                    />
                  </div>
                </div>
              </div>

              <!-- Row 3: VAT & CR -->
              <div class="form-grid-2">
                <!-- VAT Number -->
                <div class="form-group">
                  <div class="label-row">
                    <label class="required">{{ 'companies.onboarding.vatNumber' | translate }}</label>
                    <span class="zatca-tag">
                      <i class="pi pi-shield"></i> ZATCA
                    </span>
                  </div>
                  <div class="input-with-icon">
                    <i class="pi pi-id-card input-icon"></i>
                    <input 
                      type="text" 
                      [(ngModel)]="model.vatNumber" 
                      name="vatNumber" 
                      required 
                      maxlength="15"
                      class="font-mono" 
                      placeholder="310998877600003" 
                    />
                  </div>
                </div>

                <!-- Commercial Registration -->
                <div class="form-group">
                  <label class="required">{{ 'companies.onboarding.crNumber' | translate }}</label>
                  <div class="input-with-icon">
                    <i class="pi pi-file-edit input-icon"></i>
                    <input 
                      type="text" 
                      [(ngModel)]="model.commercialRegistration" 
                      name="commercialRegistration" 
                      required 
                      class="font-mono" 
                      placeholder="1010887766" 
                    />
                  </div>
                </div>
              </div>

              <!-- Row 4: Branding (Logo & Theme Color) -->
              <div class="form-grid-2">
                <!-- Logo Section: Device File Upload + URL Option -->
                <div class="form-group logo-uploader-group">
                  <div class="logo-header-row">
                    <label class="logo-main-label">
                      <i class="pi pi-image text-emerald"></i>
                      <span>{{ 'companies.onboarding.officialLogo' | translate }}</span>
                    </label>
                    <button 
                      type="button" 
                      class="btn-toggle-input-mode" 
                      (click)="toggleLogoInputMode()"
                      [title]="logoInputMode === 'file' ? ('companies.onboarding.switchToUrl' | translate) : ('companies.onboarding.switchToFile' | translate)">
                      <i [class]="logoInputMode === 'file' ? 'pi pi-link' : 'pi pi-upload'"></i>
                      <span>{{ logoInputMode === 'file' ? ('companies.onboarding.useDirectUrl' | translate) : ('companies.onboarding.uploadFromDevice' | translate) }}</span>
                    </button>
                  </div>

                  <!-- Mode 1: File Upload from Device (Default & Recommended) -->
                  <div *ngIf="logoInputMode === 'file'" class="logo-upload-box">
                    <input 
                      type="file" 
                      #logoFileInput 
                      (change)="onLogoFileSelected($event)" 
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
                      style="display: none;" 
                    />

                    <!-- When No Logo is Selected Yet -->
                    <div 
                      *ngIf="!model.logoUrl" 
                      class="upload-dropzone" 
                      (click)="logoFileInput.click()"
                      (dragover)="onDragOver($event)"
                      (dragleave)="onDragLeave($event)"
                      (drop)="onFileDropped($event, logoFileInput)"
                      [class.dragover]="isDragging">
                      <div class="upload-icon-circle">
                        <i class="pi pi-cloud-upload"></i>
                      </div>
                      <div class="upload-texts">
                        <span class="upload-prompt">{{ 'companies.onboarding.clickToSelectLogo' | translate }}</span>
                        <span class="upload-specs font-mono">{{ 'ui.companyOnboarding.092a9f' | translate }}</span>
                      </div>
                    </div>

                    <!-- When Logo is Selected / Present -->
                    <div *ngIf="model.logoUrl" class="logo-preview-card">
                      <div class="preview-img-wrap">
                        <img [src]="model.logoUrl" alt="Logo Preview" class="logo-preview-img" (error)="onLogoError()" />
                        <span class="badge-active-logo"><i class="pi pi-check"></i></span>
                      </div>
                      <div class="preview-details">
                        <span class="preview-title">{{ logoFileName || ('companies.onboarding.selectedLogo' | translate) }}</span>
                        <span class="preview-sub">{{ 'companies.onboarding.logoReady' | translate }}</span>
                      </div>
                      <div class="preview-actions">
                        <button type="button" class="btn-change-logo" (click)="logoFileInput.click()" [title]="'companies.onboarding.changeLogo' | translate">
                          <i class="pi pi-refresh"></i>
                          <span>{{ 'companies.onboarding.change' | translate }}</span>
                        </button>
                        <button type="button" class="btn-remove-logo" (click)="removeLogo(logoFileInput)" [title]="'companies.onboarding.removeLogo' | translate">
                          <i class="pi pi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Mode 2: Direct URL Input -->
                  <div *ngIf="logoInputMode === 'url'" class="logo-url-box">
                    <div class="input-with-icon">
                      <i class="pi pi-link input-icon"></i>
                      <input 
                        type="text" 
                        [(ngModel)]="model.logoUrl" 
                        name="logoUrl" 
                        placeholder="https://.../logo.png" 
                      />
                      <button *ngIf="model.logoUrl" type="button" class="btn-clear-url" (click)="model.logoUrl = ''">
                        <i class="pi pi-times"></i>
                      </button>
                    </div>
                    <!-- Small preview for URL -->
                    <div *ngIf="model.logoUrl" class="url-preview-bar">
                      <img [src]="model.logoUrl" alt="Logo Preview" class="mini-logo-preview" (error)="onLogoError()" />
                      <span class="text-xs text-muted">{{ 'companies.onboarding.liveUrlPreview' | translate }}</span>
                    </div>
                  </div>
                </div>

                <!-- Brand Theme Color -->
                <div class="form-group">
                  <label>{{ 'companies.onboarding.brandColor' | translate }}</label>
                  <div class="color-picker-container">
                    <div class="color-swatches">
                      <button 
                        type="button" 
                        *ngFor="let c of presetColors" 
                        class="swatch-btn" 
                        [style.background-color]="c"
                        [class.active]="model.brandThemeColor === c"
                        (click)="model.brandThemeColor = c">
                      </button>
                    </div>
                    <div class="custom-color-input">
                      <input type="color" [(ngModel)]="model.brandThemeColor" name="brandThemeColor" class="native-color" />
                      <span class="font-mono color-hex">{{ model.brandThemeColor }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SECTION 2: Initial Company Administrator Credentials -->
            <div class="form-section admin-section">
              <div class="section-header">
                <div class="section-title-wrap">
                  <span class="section-step-num admin-step">2</span>
                  <div>
                    <h3 class="section-title">
                      {{ 'companies.onboarding.sec2Title' | translate }}
                    </h3>
                    <span class="section-subtitle">
                      {{ 'companies.onboarding.sec2Subtitle' | translate }}
                    </span>
                  </div>
                </div>
                <span class="section-badge admin">{{ 'companies.onboarding.adminBadge' | translate }}</span>
              </div>

              <!-- Row 1: Admin Full Names (AR & EN) -->
              <div class="form-grid-2">
                <!-- Admin Name AR -->
                <div class="form-group">
                  <div class="label-row">
                    <label class="required">{{ 'companies.onboarding.adminNameAr' | translate }}</label>
                    <span class="lang-tag ar">{{ 'accounting.accountCreate.nameArTag' | translate }}</span>
                  </div>
                  <div class="input-with-icon">
                    <i class="pi pi-user input-icon"></i>
                    <input 
                      type="text" 
                      [ngModel]="model.adminFullNameAr" 
                      (ngModelChange)="onAdminFullNameArChange($event)" 
                      name="adminFullNameAr" 
                      required 
                      [placeholder]="'ui.companyOnboarding.909076' | translate" 
                    />
                  </div>
                </div>

                <!-- Admin Name EN -->
                <div class="form-group">
                  <div class="label-row">
                    <label class="required">{{ 'companies.onboarding.adminNameEn' | translate }}</label>
                    <button type="button" class="btn-retranslate" (click)="retranslateAdminName()" [title]="'projects.hub.workspace.wbs.retranslate' | translate">
                      <i class="pi pi-globe"></i>
                      <span>{{ 'companies.onboarding.autoTranslate' | translate }}</span>
                    </button>
                  </div>
                  <div class="input-with-icon">
                    <i class="pi pi-globe input-icon"></i>
                    <input 
                      type="text" 
                      [(ngModel)]="model.adminFullNameEn" 
                      name="adminFullNameEn" 
                      required 
                      dir="ltr"
                      placeholder="Sulaiman Ibrahim Al-Abdullah" 
                    />
                  </div>
                </div>
              </div>

              <!-- Row 2: Username & Email -->
              <div class="form-grid-2">
                <!-- Username -->
                <div class="form-group">
                  <label class="required">{{ 'companies.onboarding.adminUsername' | translate }}</label>
                  <div class="input-with-icon">
                    <i class="pi pi-at input-icon"></i>
                    <input 
                      type="text" 
                      [(ngModel)]="model.adminUserName" 
                      name="adminUserName" 
                      required 
                      class="font-mono" 
                      placeholder="admin_rowad" 
                    />
                  </div>
                </div>

                <!-- Email -->
                <div class="form-group">
                  <label class="required">{{ 'companies.onboarding.adminEmail' | translate }}</label>
                  <div class="input-with-icon">
                    <i class="pi pi-envelope input-icon"></i>
                    <input 
                      type="email" 
                      [(ngModel)]="model.adminEmail" 
                      name="adminEmail" 
                      required 
                      dir="ltr"
                      class="font-mono" 
                      placeholder="admin@alrowad.com" 
                    />
                  </div>
                </div>
              </div>

              <!-- Row 3: Password & Phone -->
              <div class="form-grid-2">
                <!-- Password with Show/Hide -->
                <div class="form-group">
                  <label class="required">{{ 'companies.onboarding.initialPassword' | translate }}</label>
                  <div class="input-with-icon">
                    <i class="pi pi-lock input-icon"></i>
                    <input 
                      [type]="showPassword ? 'text' : 'password'" 
                      [(ngModel)]="model.adminPassword" 
                      name="adminPassword" 
                      required 
                      placeholder="••••••••" 
                    />
                    <button type="button" class="btn-toggle-pwd" (click)="showPassword = !showPassword" [title]="showPassword ? ('ui.companyOnboarding.080422' | translate) : ('ui.companyOnboarding.f2dde4' | translate)">
                      <i class="pi" [ngClass]="showPassword ? 'pi-eye-slash' : 'pi-eye'"></i>
                    </button>
                  </div>
                </div>

                <!-- Phone Number -->
                <div class="form-group">
                  <label>{{ 'companies.onboarding.contactPhone' | translate }}</label>
                  <div class="input-with-icon">
                    <i class="pi pi-phone input-icon"></i>
                    <input 
                      type="text" 
                      [(ngModel)]="model.phoneNumber" 
                      name="phoneNumber" 
                      dir="ltr"
                      class="font-mono" 
                      placeholder="+966501234567" 
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>

          <!-- Modal Footer Actions -->
          <div class="modal-footer">
            <button type="button" class="btn-footer-cancel" [disabled]="isSubmitting" (click)="close()">
              <i class="pi pi-times"></i>
              <span>{{ langService.t('action.cancel') }}</span>
            </button>
            <button 
              type="submit" 
              class="btn-footer-submit" 
              [disabled]="isSubmitting || !model.nameAr || !model.code || !model.adminUserName || !model.adminPassword">
              <i class="pi" [ngClass]="isSubmitting ? 'pi-spin pi-spinner' : 'pi-check'"></i>
              <span>
                {{ isSubmitting ? ('companies.onboarding.provisioning' | translate) : ('companies.onboarding.onboardAction' | translate) }}
              </span>
            </button>
          </div>
        </form>

      </div>
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

    /* Modal Backdrop */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
      overflow: hidden;
    }

    /* Modal Card */
    .modal-card {
      width: 100%;
      max-width: 820px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
      overflow: hidden;
      animation: modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: scale(0.97) translateY(8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Modal Header */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.15rem 1.5rem;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
      flex-shrink: 0;
    }

    .header-branding {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .header-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
      border: 1px solid #a7f3d0;
      color: #0f766e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.2rem 0;
      letter-spacing: -0.01em;
    }

    .modal-desc {
      font-size: 0.775rem;
      color: #64748b;
      margin: 0;
      line-height: 1.35;
    }

    .btn-close {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #fee2e2;
        border-color: #fecdd3;
        color: #e11d48;
      }
    }

    /* Form Container */
    .onboarding-form {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .modal-body-scroll {
      padding: 1.25rem 1.5rem;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      box-sizing: border-box;
      max-height: calc(92vh - 145px);
    }

    /* Form Section Card */
    .form-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.15rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
      box-sizing: border-box;
      width: 100%;

      &.admin-section {
        background: #fbfdfe;
        border-color: #bbf7d0;
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .section-step-num {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      background: #0f766e;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.admin-step {
        background: #059669;
      }
    }

    .section-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .section-subtitle {
      font-size: 0.72rem;
      color: #64748b;
      display: block;
    }

    .section-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;

      &.admin {
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
    }

    /* Form Grid: 2 Columns - Zero Horizontal Overflow */
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.95rem;
      box-sizing: border-box;
      width: 100%;
    }

    @media (max-width: 640px) {
      .form-grid-2 {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 0;
      box-sizing: border-box;

      label {
        font-size: 0.775rem;
        font-weight: 700;
        color: #334155;

        &.required::after {
          content: ' *';
          color: #e11d48;
        }
      }
    }

    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .lang-tag {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;

      &.ar {
        background: #f8fafc;
        color: #475569;
        border: 1px solid #e2e8f0;
      }
    }

    .zatca-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.65rem;
      font-weight: 700;
      color: #059669;
      background: #ecfdf5;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      border: 1px solid #a7f3d0;
    }

    .btn-retranslate {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #f0fdfa;
      border: 1px solid #a7f3d0;
      color: #0f766e;
      padding: 0.15rem 0.5rem;
      border-radius: 5px;
      font-size: 0.675rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #0f766e;
        color: #ffffff;
        border-color: #0f766e;
      }
    }

    /* Input with Icon Container */
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      box-sizing: border-box;

      .input-icon {
        position: absolute;
        right: 0.85rem;
        color: #94a3b8;
        font-size: 0.85rem;
        pointer-events: none;
      }

      input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.55rem 2.35rem 0.55rem 0.85rem;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.825rem;
        color: #0f172a;
        outline: none;
        transition: all 0.15s ease;

        &::placeholder {
          color: #94a3b8;
          font-size: 0.8rem;
        }

        &:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }
      }

      .btn-toggle-pwd {
        position: absolute;
        left: 0.65rem;
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 0.2rem;
        font-size: 0.85rem;

        &:hover {
          color: #0f172a;
        }
      }
    }

    /* Color Picker Component */
    .color-picker-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.35rem 0.65rem;
      box-sizing: border-box;
      height: 38px;
    }

    .color-swatches {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .swatch-btn {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: transform 0.15s;

      &:hover {
        transform: scale(1.15);
      }

      &.active {
        box-shadow: 0 0 0 2px #0f766e;
        transform: scale(1.1);
      }
    }

    .custom-color-input {
      display: flex;
      align-items: center;
      gap: 0.35rem;

      .native-color {
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: transparent;
      }

      .color-hex {
        font-size: 0.75rem;
        font-weight: 700;
        color: #475569;
      }
    }

    /* Modal Footer */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      flex-shrink: 0;
    }

    .btn-footer-cancel {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1.15rem;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: #f1f5f9;
        color: #0f172a;
      }
    }

    .btn-footer-submit {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1.35rem;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #0f766e, #115e59);
      color: #ffffff;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 3px 12px rgba(15, 118, 110, 0.25);
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #115e59, #134e4a);
        box-shadow: 0 5px 16px rgba(15, 118, 110, 0.35);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
    }

    /* Utilities */
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
    }
    .text-uppercase {
      text-transform: uppercase;
    }
    /* Logo Uploader Styling */
    .logo-uploader-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .logo-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.15rem;
    }

    .logo-main-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .btn-toggle-input-mode {
      background: none;
      border: none;
      color: #0284c7;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }

    .btn-toggle-input-mode:hover {
      background: #f0f9ff;
      color: #0369a1;
    }

    .logo-upload-box {
      width: 100%;
    }

    .upload-dropzone {
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .upload-dropzone:hover, .upload-dropzone.dragover {
      border-color: #059669;
      background: #ecfdf5;
      transform: translateY(-1px);
    }

    .upload-icon-circle {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #e2e8f0;
      color: #0f766e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .upload-dropzone:hover .upload-icon-circle {
      background: #059669;
      color: #ffffff;
    }

    .upload-texts {
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: right;
    }

    .upload-prompt {
      font-size: 0.82rem;
      font-weight: 700;
      color: #1e293b;
    }

    .upload-specs {
      font-size: 0.72rem;
      color: #64748b;
    }

    /* Logo Preview Card */
    .logo-preview-card {
      border: 1px solid #a7f3d0;
      background: #f0fdf4;
      border-radius: 12px;
      padding: 0.65rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .preview-img-wrap {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #d1fae5;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 2px 5px rgba(0,0,0,0.06);
    }

    .logo-preview-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .badge-active-logo {
      position: absolute;
      bottom: 1px;
      right: 1px;
      width: 14px;
      height: 14px;
      background: #059669;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
    }

    .preview-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      text-align: right;
    }

    .preview-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #065f46;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .preview-sub {
      font-size: 0.72rem;
      color: #047857;
    }

    .preview-actions {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-change-logo {
      background: #ffffff;
      border: 1px solid #a7f3d0;
      color: #047857;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }

    .btn-change-logo:hover {
      background: #ecfdf5;
      color: #065f46;
    }

    .btn-remove-logo {
      background: #ffffff;
      border: 1px solid #fecaca;
      color: #dc2626;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-remove-logo:hover {
      background: #fee2e2;
    }

    .btn-clear-url {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0 6px;
    }

    .btn-clear-url:hover {
      color: #ef4444;
    }

    .url-preview-bar {
      margin-top: 0.35rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 4px 8px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .mini-logo-preview {
      width: 24px;
      height: 24px;
      object-fit: contain;
      border-radius: 4px;
      background: #fff;
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

  isSubmitting = false;
  showPassword = false;

  // Logo selection mode & state
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

  onFileDropped(e: DragEvent, input: HTMLInputElement) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.processSelectedLogoFile(e.dataTransfer.files[0]);
    }
  }

  onLogoFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processSelectedLogoFile(input.files[0]);
    }
  }

  private processSelectedLogoFile(file: File) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
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

    // SVG: read directly without canvas resize
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        this.model.logoUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
      return;
    }

    // High quality canvas optimization & compression (max 400x400)
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          this.model.logoUrl = canvas.toDataURL('image/png', 0.9);
        } else {
          this.model.logoUrl = readerEvent.target?.result as string;
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeLogo(input?: HTMLInputElement) {
    this.model.logoUrl = '';
    this.logoFileName = '';
    if (input) input.value = '';
  }

  onLogoError() {
    this.model.logoUrl = '';
  }

  close() {
    this.closed.emit();
  }

  submit() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const payload = {
      code: this.model.code.trim().toUpperCase(),
      nameAr: this.model.nameAr.trim(),
      nameEn: this.model.nameEn.trim(),
      vatNumber: this.model.vatNumber.trim(),
      commercialRegistration: this.model.commercialRegistration.trim(),
      currencyCode: this.model.currencyCode || 'SAR',
      logoUrl: this.model.logoUrl?.trim() || undefined,
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
        fullNameAr: this.model.adminFullNameAr.trim(),
        fullNameEn: this.model.adminFullNameEn.trim(),
        phoneNumber: this.model.phoneNumber?.trim()
      }
    };

    this.tenantService.onboardCompany(payload).subscribe({
      next: (created) => {
        this.isSubmitting = false;

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
          branches: created.branches.map(b => ({
            id: b.id,
            code: b.code,
            nameAr: b.nameAr,
            nameEn: b.nameEn,
            isMainBranch: b.isMainBranch
          })),
          fiscalYears: created.fiscalYears.map(y => ({
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
        this.companyContext.setCompany(comp);

        Swal.fire({
          icon: 'success',
          title: this.langService.t('companyOnboarding.alerts.onboardSuccessTitle'),
          text: this.langService.t('companyOnboarding.alerts.onboardSuccessText'),
          confirmButtonColor: '#0f766e'
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
