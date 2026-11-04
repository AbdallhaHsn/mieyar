import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { 
  FinancialSettingsService, 
  FiscalYear, 
  YearEndAuditCheck, 
  YearEndClosingResult 
} from '../../../core/services/financial-settings.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto } from '../../../core/models/account.model';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-year-end-closing',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    DecimalPipe, 
    DatePipe, 
    SearchableSelectComponent,
    TranslatePipe
  ],
  templateUrl: './year-end-closing.component.html',
  styleUrls: ['./year-end-closing.component.css']
})
export class YearEndClosingComponent implements OnInit {
  private settingsService = inject(FinancialSettingsService);
  private coaService = inject(ChartOfAccountsService);
  public companyContext = inject(CompanyContextService);
  public langService = inject(LanguageService);
  public translator = inject(AccountingTranslatorService);
  private router = inject(Router);

  // Loading & State
  isLoading = signal<boolean>(true);
  isExecuting = signal<boolean>(false);
  isReopening = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Stepper State (1: Audit Check, 2: Setup & Options, 3: Preview Entries, 4: Execute & Result)
  currentStep = signal<number>(1);

  // Fiscal Years
  fiscalYears = signal<FiscalYear[]>([]);
  selectedYearId = signal<string>('');
  selectedYear = computed(() => {
    return this.fiscalYears().find(y => y.id === this.selectedYearId()) || null;
  });

  // Audit Diagnostics Data
  auditData = signal<YearEndAuditCheck | null>(null);

  // Closing Configuration Options
  retainedEarningsAccountId = signal<string>('');
  generateOpeningBalanceNextYear = signal<boolean>(true);
  lockAllPastPeriods = signal<boolean>(true);

  // Closing Execution Result
  closingResult = signal<YearEndClosingResult | null>(null);

  // Reopen Modal
  showReopenModal = signal<boolean>(false);
  reopenReasonAr = signal<string>('إعادة فتح السنة المالية بغرض استكمال تدقيق القيود الختامية');
  reopenReasonEn = signal<string>('Reopening fiscal year for external audit adjustments');

  // Accounts for retained earnings selection
  equityAccounts = signal<AccountDto[]>([]);

  accountOptions = computed<SelectOption[]>(() => {
    return this.equityAccounts().map(acc => ({
      value: acc.id,
      label: `${acc.accountCode} - ${acc.nameAr}`,
      sublabel: `كود: ${acc.accountCode} | النوع: ${acc.accountTypeNameAr || 'حقوق ملكية'}`,
      code: acc.accountCode,
      icon: 'pi pi-book'
    }));
  });

  yearOptions = computed<SelectOption[]>(() => {
    return this.fiscalYears().map(y => ({
      value: y.id,
      label: `${y.nameAr} (${y.yearNumber}) - [${y.isClosed ? 'مقـفـلة' : 'نـشـطة'}]`,
      sublabel: `الفترة: ${y.startDate.substring(0, 10)} إلى ${y.endDate.substring(0, 10)}`,
      badge: y.isClosed ? 'مقـفـلة' : 'نشطة',
      badgeClass: y.isClosed ? 'badge-danger' : 'badge-success',
      icon: y.isClosed ? 'pi pi-lock' : 'pi pi-unlock'
    }));
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const compId = this.companyContext.activeCompany().id;
    this.settingsService.getOverview(compId).subscribe({
      next: (overview) => {
        this.fiscalYears.set(overview.allFiscalYears || []);
        
        // Select active fiscal year or first
        if (overview.activeFiscalYear) {
          this.selectedYearId.set(overview.activeFiscalYear.id);
        } else if (overview.allFiscalYears && overview.allFiscalYears.length > 0) {
          this.selectedYearId.set(overview.allFiscalYears[0].id);
        }

        this.loadEquityAccounts();

        if (this.selectedYearId()) {
          this.runAuditCheck(this.selectedYearId());
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.errorMessage.set(this.langService.t('accounting.yearEndClosing.alerts.loadYearsError') + (err.error?.message || err.message));
        this.isLoading.set(false);
      }
    });
  }

  loadEquityAccounts(): void {
    this.coaService.loadAccountsTree().subscribe({
      next: (tree) => {
        const flat: AccountDto[] = [];
        const extract = (list: AccountDto[]) => {
          for (const a of list) {
            // Equity accounts (Type 3) or codes starting with 3
            if (a.isPostable && (a.accountCode.startsWith('3') || a.accountType === 3)) {
              flat.push(a);
            }
            if (a.subAccounts && a.subAccounts.length > 0) {
              extract(a.subAccounts);
            }
          }
        };
        extract(tree);
        this.equityAccounts.set(flat);

        // Pre-select 32102 or retained earnings
        const defaultRe = flat.find(a => a.accountCode === '32102') || 
                          flat.find(a => a.nameAr.includes('أرباح مبقاة') || a.nameAr.includes('مدورة')) ||
                          flat[0];
        if (defaultRe && !this.retainedEarningsAccountId()) {
          this.retainedEarningsAccountId.set(defaultRe.id);
        }
      }
    });
  }

  onYearSelected(yearId: string): void {
    this.selectedYearId.set(yearId);
    this.closingResult.set(null);
    this.currentStep.set(1);
    this.runAuditCheck(yearId);
  }

  runAuditCheck(yearId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.settingsService.getClosingPreview(yearId).subscribe({
      next: (audit) => {
        this.auditData.set(audit);
        if (audit.defaultRetainedEarningsAccountId && !this.retainedEarningsAccountId()) {
          this.retainedEarningsAccountId.set(audit.defaultRetainedEarningsAccountId);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(this.langService.t('accounting.yearEndClosing.alerts.auditError') + (err.error?.message || err.message));
        this.isLoading.set(false);
      }
    });
  }

  goToStep(step: number): void {
    if (step === 2 && !this.auditData()?.canClose && !this.selectedYear()?.isClosed) {
      Swal.fire({
        title: this.langService.t('accounting.yearEndClosing.alerts.auditWarningTitle'),
        text: this.langService.t('accounting.yearEndClosing.alerts.auditWarningText'),
        icon: 'warning',
        confirmButtonText: this.langService.t('common.ok')
      });
      return;
    }
    this.currentStep.set(step);
  }

  nextStep(): void {
    if (this.currentStep() < 4) {
      this.goToStep(this.currentStep() + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  confirmExecuteClosing(): void {
    const year = this.selectedYear();
    const audit = this.auditData();
    if (!year || !audit) return;

    const isAr = this.langService.currentLang() === 'ar';
    const yearName = isAr ? year.nameAr : (year.nameEn || year.nameAr);
    const netIncomeStr = (audit.projectedNetIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const postIncomeStep = this.langService.t('accounting.yearEndClosing.alerts.closingStepPostNetIncome').replace('{amount}', netIncomeStr);
    const createNextYearStep = this.langService.t('accounting.yearEndClosing.alerts.closingStepCreateNextYear').replace('{nextYear}', (year.yearNumber + 1).toString());

    const htmlContent = `
      <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; line-height: 1.6;">
        <p><strong>${this.langService.t('accounting.yearEndClosing.alerts.closingNoticeTitle')}</strong></p>
        <ul style="${isAr ? 'padding-right: 20px;' : 'padding-left: 20px;'}">
          <li>${this.langService.t('accounting.yearEndClosing.alerts.closingStepZeroRevenueExpense')}</li>
          <li>${postIncomeStep}</li>
          <li>${createNextYearStep}</li>
          <li>${this.langService.t('accounting.yearEndClosing.alerts.closingStepLockPeriods')}</li>
        </ul>
        <p class="text-danger fw-bold mt-2">${this.langService.t('accounting.yearEndClosing.alerts.closingConfirmQuestion')}</p>
      </div>`;

    Swal.fire({
      title: this.langService.t('accounting.yearEndClosing.alerts.confirmClosingTitle').replace('{year}', yearName),
      html: htmlContent,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.yearEndClosing.alerts.confirmClosingBtn'),
      cancelButtonText: this.langService.t('accounting.yearEndClosing.alerts.cancelClosingBtn'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((res) => {
      if (res.isConfirmed) {
        this.executeClosing();
      }
    });
  }

  executeClosing(): void {
    const yearId = this.selectedYearId();
    if (!yearId) return;

    this.isExecuting.set(true);
    this.errorMessage.set('');

    this.settingsService.closeFiscalYear(yearId, {
      retainedEarningsAccountId: this.retainedEarningsAccountId() || undefined,
      generateOpeningBalanceNextYear: this.generateOpeningBalanceNextYear()
    }).subscribe({
      next: (res) => {
        this.closingResult.set(res);
        this.isExecuting.set(false);
        this.currentStep.set(4);
        const msg = this.langService.t('accounting.yearEndClosing.alerts.closingSuccess').replace('{year}', res.yearNumber.toString()).replace('{entryNo}', res.closingJournalEntryNumber); this.successMessage.set(msg); Swal.fire({ icon: 'success', title: this.langService.t('common.saved'), text: msg, confirmButtonColor: '#059669' });
        this.loadInitialData();
      },
      error: (err) => {
        const msg = this.langService.t('accounting.yearEndClosing.alerts.closingFailed').replace('{error}', err.error?.message || err.message || ''); this.errorMessage.set(msg); Swal.fire({ icon: 'error', title: this.langService.t('common.error'), text: msg, confirmButtonColor: '#059669' });
        this.isExecuting.set(false);
      }
    });
  }

  openReopenModal(): void {
    this.showReopenModal.set(true);
  }

  closeReopenModal(): void {
    this.showReopenModal.set(false);
  }

  onReopenReasonArChange(val: string): void {
    this.reopenReasonAr.set(val);
    const en = this.translator.autoTranslate(val, 'ar');
    this.reopenReasonEn.set(en);
  }

  executeReopen(): void {
    const yearId = this.selectedYearId();
    if (!yearId || !this.reopenReasonAr().trim()) return;

    this.isReopening.set(true);
    this.settingsService.reopenFiscalYear(yearId, this.reopenReasonAr().trim()).subscribe({
      next: () => {
        this.isReopening.set(false);
        this.closeReopenModal();
        const msg = this.langService.t('accounting.yearEndClosing.alerts.reopenSuccess'); this.successMessage.set(msg); Swal.fire({ icon: 'success', title: this.langService.t('common.saved'), text: msg, confirmButtonColor: '#059669' });
        this.loadInitialData();
      },
      error: (err) => {
        const msg = this.langService.t('accounting.yearEndClosing.alerts.reopenFailed').replace('{error}', err.error?.message || err.message || ''); this.errorMessage.set(msg); Swal.fire({ icon: 'error', title: this.langService.t('common.error'), text: msg, confirmButtonColor: '#059669' });
        this.isReopening.set(false);
      }
    });
  }

  printClosingDocument(): void {
    window.print();
  }

  navigateToJournal(): void {
    this.router.navigate(['/accounting/journal-entries']);
  }
}
