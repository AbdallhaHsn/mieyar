import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  ZatcaOnboardingService, 
  ZatcaOnboardingStatus, 
  GenerateCsrResponse, 
  ComplianceCsidResponse, 
  ComplianceChecksResult, 
  ProductionCsidResponse 
} from '../../../core/services/zatca-onboarding.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-zatca-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe, TranslatePipe],
  templateUrl: './zatca-onboarding.component.html',
  styleUrls: ['./zatca-onboarding.component.scss']
})
export class ZatcaOnboardingComponent implements OnInit {
  private onboardingService = inject(ZatcaOnboardingService);
  public companyContext = inject(CompanyContextService);
  public langService = inject(LanguageService);
  public translator = inject(AccountingTranslatorService);

  // Loading States
  isLoading = signal<boolean>(true);
  isGeneratingCsr = signal<boolean>(false);
  isSubmittingOtp = signal<boolean>(false);
  isRunningChecks = signal<boolean>(false);
  isActivatingProduction = signal<boolean>(false);
  isResetting = signal<boolean>(false);

  // Status & Stepper State
  status = signal<ZatcaOnboardingStatus | null>(null);
  currentStep = signal<number>(1);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Step 1: Form Fields (Device & CSR)
  deviceName = signal<string>('وحدة الفوترة الإلكترونية الرئيسية - E-Invoicing Unit 01');
  environment = signal<string>('Simulation'); // Simulation, Production, Sandbox
  orgName = signal<string>('');
  vatNumber = signal<string>('');
  commonName = signal<string>('AL-ROBBAN-EINV-01');
  location = signal<string>('الرياض - المملكة العربية السعودية');
  industry = signal<string>('تجارة التجزئة والخدمات');
  invoiceType = signal<string>('1100'); // 1100: Both Standard & Simplified

  // Step 2: OTP
  otp = signal<string>('');

  // Step 3: Checks Results
  checksResult = signal<ComplianceChecksResult | null>(null);

  // Copy success indicator
  copiedField = signal<string>('');

  // Computed Metrics
  daysRemaining = computed<number | null>(() => {
    const s = this.status();
    if (!s || !s.productionExpiresAtUtc) return null;
    const expiry = new Date(s.productionExpiresAtUtc).getTime();
    const now = Date.now();
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  });

  isExpiringSoon = computed<boolean>(() => {
    const days = this.daysRemaining();
    return days !== null && days <= 30;
  });

  pcsidSizeKb = computed<string>(() => {
    const pcsid = this.status()?.productionCsid;
    if (!pcsid) return '0 KB';
    return (pcsid.length / 1024).toFixed(1) + ' KB';
  });

  csrSizeKb = computed<string>(() => {
    const csr = this.status()?.csrPem;
    if (!csr) return '0 KB';
    return (csr.length / 1024).toFixed(1) + ' KB';
  });

  ngOnInit(): void {
    this.initCompanyDefaults();
    this.loadStatus();
  }

  initCompanyDefaults(): void {
    const comp = this.companyContext.activeCompany();
    this.orgName.set(comp.nameAr || 'شركة الربان للحلول الذكية');
    this.vatNumber.set(comp.vatNumber || '300123456700003');
    this.location.set('الرياض - المملكة العربية السعودية');
  }

  downloadFile(content: string | undefined, filename: string): void {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  loadStatus(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const compId = this.companyContext.activeCompany().id;
    this.onboardingService.getStatus(compId).subscribe({
      next: (res) => {
        this.status.set(res);
        this.currentStep.set(res.currentStep);

        // Pre-fill form from saved config if available
        if (res.deviceName) this.deviceName.set(res.deviceName);
        if (res.environment) this.environment.set(res.environment);
        if (res.organizationName) this.orgName.set(res.organizationName);
        if (res.organizationVatNumber) this.vatNumber.set(res.organizationVatNumber);
        if (res.commonName) this.commonName.set(res.commonName);
        if (res.location) this.location.set(res.location);
        if (res.industry) this.industry.set(res.industry);

        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(this.langService.t('zatca.onboarding.alerts.loadStatusError') + (err.error?.message || err.message));
        this.isLoading.set(false);
      }
    });
  }

  goToStep(step: number): void {
    const s = this.status();
    if (!s) return;
    const isAr = this.langService.currentLang() === 'ar';

    // Guard steps based on prerequisites
    if (step === 2 && !s.hasCsr) {
      Swal.fire(this.langService.t('zatca.alerts.prereqMissingTitle'), this.langService.t('zatca.alerts.csrPrereq'), 'warning');
      return;
    }
    if (step === 3 && !s.complianceCsid) {
      Swal.fire(this.langService.t('zatca.alerts.prereqMissingTitle'), this.langService.t('zatca.alerts.otpPrereq'), 'warning');
      return;
    }
    if (step === 4 && !s.compliancePassed) {
      Swal.fire(this.langService.t('zatca.alerts.prereqMissingTitle'), this.langService.t('zatca.alerts.compliancePrereq'), 'warning');
      return;
    }

    this.currentStep.set(step);
  }

  // Action 1: Generate CSR & Keypair
  generateCsr(): void {
    const isAr = this.langService.currentLang() === 'ar';
    if (!this.orgName().trim() || !this.vatNumber().trim() || !this.commonName().trim()) {
      Swal.fire(this.langService.t('zatca.alerts.incompleteDataTitle'), this.langService.t('zatca.alerts.incompleteDataMsg'), 'error');
      return;
    }

    this.isGeneratingCsr.set(true);
    this.errorMessage.set('');

    const compId = this.companyContext.activeCompany().id;
    this.onboardingService.generateCsr({
      companyId: compId,
      deviceName: this.deviceName().trim(),
      environment: this.environment(),
      organizationName: this.orgName().trim(),
      organizationVatNumber: this.vatNumber().trim(),
      commonName: this.commonName().trim(),
      location: this.location().trim(),
      industry: this.industry().trim(),
      invoiceType: this.invoiceType()
    }).subscribe({
      next: () => {
        this.isGeneratingCsr.set(false);
        this.successMessage.set(this.langService.t('zatca.alerts.csrSuccessMsg'));
        this.loadStatus();
        this.currentStep.set(2);
      },
      error: (err) => {
        this.errorMessage.set(
          this.langService.t('zatca.alerts.csrFailedPrefix') + this.extractError(err)
        );
        this.isGeneratingCsr.set(false);
      }
    });
  }

  // Action 2: Submit OTP for Compliance CSID
  submitOtp(): void {
    const isAr = this.langService.currentLang() === 'ar';
    const code = this.otp().trim();
    if (!code || code.length < 6) {
      Swal.fire(this.langService.t('zatca.alerts.invalidOtpTitle'), this.langService.t('zatca.alerts.invalidOtpMsg'), 'warning');
      return;
    }

    const s = this.status();
    if (!s) return;

    this.isSubmittingOtp.set(true);
    this.errorMessage.set('');

    const compId = this.companyContext.activeCompany().id;
    this.onboardingService.requestComplianceCsid({
      companyId: compId,
      deviceUuid: s.deviceUuid,
      otp: code
    }).subscribe({
      next: (res) => {
        this.isSubmittingOtp.set(false);
        this.successMessage.set(res.message);
        this.loadStatus();
        this.currentStep.set(3);
      },
      error: (err) => {
        this.errorMessage.set(
          (isAr ? 'فشل اعتماد الـ OTP وإصدار شهادة الامتثال: ' : 'Failed to validate OTP & issue Compliance CSID: ') + this.extractError(err)
        );
        this.isSubmittingOtp.set(false);
      }
    });
  }

  // Action 3: Run Compliance Invoice Simulation Checks
  runComplianceChecks(): void {
    const isAr = this.langService.currentLang() === 'ar';
    const s = this.status();
    if (!s) return;

    this.isRunningChecks.set(true);
    this.errorMessage.set('');

    const compId = this.companyContext.activeCompany().id;
    this.onboardingService.runComplianceChecks({
      companyId: compId,
      deviceUuid: s.deviceUuid
    }).subscribe({
      next: (res) => {
        this.checksResult.set(res);
        this.isRunningChecks.set(false);
        this.successMessage.set(
          isAr 
            ? 'تم اجتياز كافة اختبارات الامتثال لـ ZATCA بنسبة مطابقة 100%.' 
            : 'All ZATCA automated compliance checks passed with 100% score.'
        );
        this.loadStatus();
        this.currentStep.set(4);
      },
      error: (err) => {
        this.errorMessage.set(
          (isAr ? 'فشل تشغيل فحص الامتثال: ' : 'Compliance simulation checks failed: ') + this.extractError(err)
        );
        this.isRunningChecks.set(false);
      }
    });
  }

  // Action 4: Request & Activate Production CSID
  activateProduction(): void {
    const isAr = this.langService.currentLang() === 'ar';
    const s = this.status();
    if (!s) return;

    const htmlContent = `
      <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; line-height: 1.6;">
        <p>${this.langService.t('zatca.alerts.activateProdConfirmDesc')}</p>
        <p>${this.langService.t('zatca.alerts.vatNumberLabel')} <strong>${s.organizationVatNumber}</strong></p>
        <p>${this.langService.t('zatca.alerts.solutionUnitLabel')} <strong>${s.deviceName}</strong></p>
        <p class="text-success fw-bold">${this.langService.t('zatca.alerts.activateProdNotice')}</p>
      </div>`;

    Swal.fire({
      title: this.langService.t('zatca.alerts.activateProdConfirmTitle'),
      html: htmlContent,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('zatca.alerts.confirmActivateProdBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669'
    }).then((res) => {
      if (res.isConfirmed) {
        this.isActivatingProduction.set(true);
        this.errorMessage.set('');

        const compId = this.companyContext.activeCompany().id;
        this.onboardingService.requestProductionCsid({
          companyId: compId,
          deviceUuid: s.deviceUuid
        }).subscribe({
          next: (prodRes) => {
            this.isActivatingProduction.set(false);
            this.successMessage.set(prodRes.message);
            this.loadStatus();
            Swal.fire(this.langService.t('zatca.alerts.congratulationsTitle'), prodRes.message, 'success');
          },
          error: (err) => {
            this.errorMessage.set(
              this.langService.t('zatca.alerts.prodFailedPrefix') + this.extractError(err)
            );
            this.isActivatingProduction.set(false);
          }
        });
      }
    });
  }

  private extractError(err: any): string {
    return err?.error?.description || err?.error?.Description || err?.error?.message || err?.message || this.langService.t('zatca.alerts.unexpectedError');
  }

  // Reset Onboarding
  confirmReset(): void {
    const isAr = this.langService.currentLang() === 'ar';
    Swal.fire({
      title: this.langService.t('zatca.alerts.resetConfirmTitle'),
      text: this.langService.t('zatca.alerts.resetConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('zatca.alerts.confirmResetBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626'
    }).then((res) => {
      if (res.isConfirmed) {
        this.isResetting.set(true);
        const compId = this.companyContext.activeCompany().id;
        this.onboardingService.reset(compId).subscribe({
          next: () => {
            this.isResetting.set(false);
            this.successMessage.set(isAr ? 'تمت إعادة ضبط التهيئة بنجاح.' : 'Onboarding configuration reset successfully.');
            this.checksResult.set(null);
            this.loadStatus();
          },
          error: (err) => {
            this.errorMessage.set(
              (isAr ? 'فشل إعادة الضبط: ' : 'Failed to reset onboarding: ') + (err.error?.message || err.message)
            );
            this.isResetting.set(false);
          }
        });
      }
    });
  }

  copyToClipboard(text: string | undefined, fieldKey: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedField.set(fieldKey);
      setTimeout(() => this.copiedField.set(''), 2500);
    });
  }
}
