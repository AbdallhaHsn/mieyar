import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HrService, PayrollPeriodDto, PayrollLineDto, PayrollStatus, DisbursementBankAccountDto } from '../../../core/services/hr.service';
import { JournalEntryService, JournalEntry } from '../../../core/services/journal-entry.service';
import { LanguageService } from '../../../core/services/language.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { ModulesSettingsService } from '../../../core/services/modules-settings.service';
import { TafqeetService } from '../../../core/services/tafqeet.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-payroll-worksheet',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './payroll-worksheet.component.html',
  styleUrls: ['./payroll-worksheet.component.scss']
})
export class PayrollWorksheetComponent implements OnInit {
  public langService = inject(LanguageService);
  public companyContext = inject(CompanyContextService);
  public modulesSettings = inject(ModulesSettingsService);
  private hrService = inject(HrService);
  private journalService = inject(JournalEntryService);
  private router = inject(Router);
  private tafqeet = inject(TafqeetService);

  // Periods & Current Period
  periods: PayrollPeriodDto[] = [];
  currentPeriod: PayrollPeriodDto | null = null;
  loading = false;
  actionLoading = false;

  // Journal Entry Audit Viewer Modal
  showJournalModal = false;
  selectedJournalEntry: JournalEntry | null = null;
  journalLoading = false;
  disbursementBanks: DisbursementBankAccountDto[] = [];

  // Selection
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1; // 1-12
  notes = '';

  // Search & Filter
  searchTerm = '';
  selectedBank = '';

  months = [
    { value: 1, nameAr: 'يناير - 01', nameEn: 'January - 01' },
    { value: 2, nameAr: 'فبراير - 02', nameEn: 'February - 02' },
    { value: 3, nameAr: 'مارس - 03', nameEn: 'March - 03' },
    { value: 4, nameAr: 'أبريل - 04', nameEn: 'April - 04' },
    { value: 5, nameAr: 'مايو - 05', nameEn: 'May - 05' },
    { value: 6, nameAr: 'يونيو - 06', nameEn: 'June - 06' },
    { value: 7, nameAr: 'يوليو - 07', nameEn: 'July - 07' },
    { value: 8, nameAr: 'أغسطس - 08', nameEn: 'August - 08' },
    { value: 9, nameAr: 'سبتمبر - 09', nameEn: 'September - 09' },
    { value: 10, nameAr: 'أكتوبر - 10', nameEn: 'October - 10' },
    { value: 11, nameAr: 'نوفمبر - 11', nameEn: 'November - 11' },
    { value: 12, nameAr: 'ديسمبر - 12', nameEn: 'December - 12' }
  ];

  years = [2024, 2025, 2026, 2027];

  // WPS Dialog
  showWpsModal = false;
  wpsPreviewContent = '';
  wpsEstablishmentId = '7001234567';
  wpsEstablishmentName = 'شركة مِعْيَـــار للحلول المحاسبية المعتمدة';
  wpsEmployerIban = 'SA0380000000608010167519';
  wpsEmployerBankCode = 'RJHI';

  // Manual Adjustment Modal
  showAdjustmentModal = false;
  selectedLineForAdjustment: PayrollLineDto | null = null;
  adjOvertimeAmount = 0;
  adjAbsenceDeduction = 0;
  adjLoanDeduction = 0;
  adjOtherDeductions = 0;
  adjNotes = '';

  // Official Statement Print Modal (Full Month Sheet)
  showPrintModal = false;
  currentPrintDate = new Date();

  // Individual Employee Payslip Modal
  showPayslipModal = false;
  selectedLineForPayslip: PayrollLineDto | null = null;

  ngOnInit(): void {
    const hr = this.modulesSettings.hrSettings();
    const gen = this.modulesSettings.generalSettings();
    this.wpsEstablishmentName = gen.companyNameAr || this.companyContext.activeCompany()?.nameAr || 'شركة مِعْيَـــار للحلول المحاسبية';
    this.wpsEstablishmentId = hr.mudadEstablishmentId || this.companyContext.activeCompany()?.commercialRegistration || '7001234567';
    this.wpsEmployerIban = hr.employerIban || 'SA0380000000608010167519';
    this.wpsEmployerBankCode = hr.employerBankCode || 'RJHI';
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.loading = true;
    this.hrService.getPayrollPeriods(this.selectedYear).subscribe({
      next: (data) => {
        this.periods = data;
        const match = this.periods.find(p => p.periodYear === this.selectedYear && p.periodMonth === this.selectedMonth);
        if (match) {
          this.loadPeriodDetails(match.id);
        } else if (this.periods.length > 0) {
          this.loadPeriodDetails(this.periods[0].id);
        } else {
          this.currentPeriod = null;
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: this.langService.t('hr.payroll.alerts.loadPeriodsFailed'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  selectPeriod(period: PayrollPeriodDto): void {
    this.selectedYear = period.periodYear;
    this.selectedMonth = period.periodMonth;
    this.loadPeriodDetails(period.id);
  }

  loadPeriodDetails(id: string): void {
    this.loading = true;
    this.hrService.getPayrollPeriodById(id).subscribe({
      next: (data) => {
        this.currentPeriod = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: this.langService.t('hr.payroll.alerts.loadDetailsFailed'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  // --- Filtering & Searching ---
  get filteredLines(): PayrollLineDto[] {
    if (!this.currentPeriod || !this.currentPeriod.lines) return [];
    let list = this.currentPeriod.lines;

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(l =>
        (l.employeeNumber && l.employeeNumber.toLowerCase().includes(term)) ||
        (l.employeeNameAr && l.employeeNameAr.toLowerCase().includes(term)) ||
        (l.employeeNameEn && l.employeeNameEn.toLowerCase().includes(term)) ||
        (l.nationalIdOrIqama && l.nationalIdOrIqama.toLowerCase().includes(term)) ||
        (l.bankCode && l.bankCode.toLowerCase().includes(term)) ||
        (l.iban && l.iban.toLowerCase().includes(term))
      );
    }

    if (this.selectedBank) {
      list = list.filter(l => l.bankCode === this.selectedBank);
    }

    return list;
  }

  get availableBanks(): string[] {
    if (!this.currentPeriod || !this.currentPeriod.lines) return [];
    const banks = new Set<string>();
    this.currentPeriod.lines.forEach(l => {
      if (l.bankCode) banks.add(l.bankCode);
    });
    return Array.from(banks);
  }

  // --- Automatic Calculation ---
  calculateCurrentMonth(): void {
    if (this.currentPeriod && this.currentPeriod.status === PayrollStatus.PostedToGl) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('hr.payroll.alerts.alreadyPostedTitle'),
        text: this.langService.t('hr.payroll.alerts.alreadyPostedText'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    const confirmTitle = this.currentPeriod
      ? this.langService.t('hr.payroll.alerts.recalcTitle')
      : this.langService.t('hr.payroll.alerts.calcTitle');

    const confirmText = this.langService.t('hr.payroll.alerts.calcConfirmText', {
      month: this.selectedMonth,
      year: this.selectedYear
    });

    Swal.fire({
      icon: 'question',
      title: confirmTitle,
      text: confirmText,
      showCancelButton: true,
      confirmButtonText: this.langService.t('hr.payroll.alerts.calculateNow'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.actionLoading = true;
        this.hrService.calculatePayroll({
          year: this.selectedYear,
          month: this.selectedMonth,
          notes: this.notes
        }).subscribe({
          next: (result) => {
            this.currentPeriod = result;
            this.actionLoading = false;
            this.loadPeriods();
            Swal.fire({
              icon: 'success',
              title: this.langService.t('hr.payroll.alerts.calcSuccessTitle'),
              text: this.langService.t('hr.payroll.alerts.calcSuccessText', {
                month: this.selectedMonth,
                year: this.selectedYear,
                count: result.employeeCount,
                net: result.totalNetSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })
              }),
              confirmButtonColor: '#059669'
            });
          },
          error: (err) => {
            this.actionLoading = false;
            Swal.fire({
              icon: 'error',
              title: this.langService.t('hr.payroll.alerts.calcErrorTitle'),
              text: err.error?.message || this.langService.t('hr.payroll.alerts.calcErrorText'),
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // --- Posting to GL ---
  postToGl(): void {
    if (!this.currentPeriod) return;
    const isAr = this.langService.currentLang() === 'ar';

    const debitAmount = (this.currentPeriod.totalGrossSalary + this.currentPeriod.totalCompanyGosiContribution).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const netAmount = this.currentPeriod.totalNetSalary.toLocaleString('en-US', { minimumFractionDigits: 2 });
    const gosiAmount = (this.currentPeriod.totalEmployeeGosiDeduction + this.currentPeriod.totalCompanyGosiContribution).toLocaleString('en-US', { minimumFractionDigits: 2 });

    const htmlContent = isAr ? `
      <div style="text-align: right; font-family: 'Cairo', sans-serif; font-size: 0.9rem; line-height: 1.6;">
        <p style="margin-bottom: 0.75rem; color: #1e293b;">
          هل أنت متأكد من ترحيل مسيّر شهر <strong>${this.currentPeriod.periodMonth}/${this.currentPeriod.periodYear}</strong> وإثبات قيد الاستحقاق المحاسبي التلقائي؟
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; color: #0284c7; font-weight: bold; margin-bottom: 0.25rem;">
            <span>🔵 مدين: حـ/ 53101 رواتب ومصروفات + تأمينات المنشأة:</span>
            <span>${debitAmount} SAR</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #059669; font-weight: bold;">
            <span>🟢 دائن: حـ/ 21301 رواتب مستحقة + تأمينات دائنة:</span>
            <span>${debitAmount} SAR</span>
          </div>
          <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.4rem; padding-right: 0.5rem;">
            • صافي الرواتب المستحقة للصرف: ${netAmount} SAR<br>
            • إجمالي مستحقات التأمينات (GOSI): ${gosiAmount} SAR
          </div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 0.5rem; font-size: 0.78rem; color: #b45309;">
          ⚠️ بمجرد الترحيل سيتم تثبيت الأرقام وإصدار قيد استحقاق فوري معتمد بدفتر اليومية العامة.
        </div>
      </div>
    ` : `
      <div style="text-align: left; font-family: inherit; font-size: 0.9rem; line-height: 1.6;">
        <p style="margin-bottom: 0.75rem; color: #1e293b;">
          Are you sure you want to post payroll for month <strong>${this.currentPeriod.periodMonth}/${this.currentPeriod.periodYear}</strong> and generate GL accrual entries?
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; color: #0284c7; font-weight: bold; margin-bottom: 0.25rem;">
            <span>🔵 Debit: Acc/ 53101 Salaries & Expense + Company GOSI:</span>
            <span>${debitAmount} SAR</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #059669; font-weight: bold;">
            <span>🟢 Credit: Acc/ 21301 Accrued Salaries + GOSI Payable:</span>
            <span>${debitAmount} SAR</span>
          </div>
          <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.4rem; padding-left: 0.5rem;">
            • Net salaries payable: ${netAmount} SAR<br>
            • Total GOSI dues: ${gosiAmount} SAR
          </div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 0.5rem; font-size: 0.78rem; color: #b45309;">
          ⚠️ Once posted, payroll values will be locked and an official journal entry created in General Ledger.
        </div>
      </div>
    `;

    Swal.fire({
      icon: 'question',
      title: this.langService.t('hr.payroll.alerts.postToGlTitle'),
      html: htmlContent,
      showCancelButton: true,
      confirmButtonText: this.langService.t('hr.payroll.alerts.postToGlConfirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      width: '580px'
    }).then(res => {
      if (res.isConfirmed) {
        this.actionLoading = true;
        this.hrService.postPayrollToGl(this.currentPeriod!.id, this.notes).subscribe({
          next: (updated) => {
            this.currentPeriod = updated;
            this.actionLoading = false;
            this.loadPeriods();
            Swal.fire({
              icon: 'success',
              title: this.langService.t('hr.payroll.alerts.postSuccessTitle'),
              html: this.langService.t('hr.payroll.alerts.postSuccessHtml', { number: updated.journalEntryNumber || '' }),
              showCancelButton: true,
              confirmButtonText: this.langService.t('hr.payroll.alerts.inspectEntry'),
              cancelButtonText: this.langService.t('common.close'),
              confirmButtonColor: '#059669',
              cancelButtonColor: '#64748b'
            }).then(viewRes => {
              if (viewRes.isConfirmed && updated.journalEntryId) {
                this.viewJournalEntry(updated.journalEntryId, updated.journalEntryNumber);
              }
            });
          },
          error: (err) => {
            this.actionLoading = false;
            Swal.fire({
              icon: 'error',
              title: this.langService.t('hr.payroll.alerts.postFailedTitle'),
              text: err.error?.message || this.langService.t('hr.payroll.alerts.postFailedText'),
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // --- Mark as Paid (إثبات الصرف والتحويل البنكي وتوليد قيد السداد) ---
  markAsPaid(): void {
    if (!this.currentPeriod) return;
    const isAr = this.langService.currentLang() === 'ar';
    const netAmount = this.currentPeriod.totalNetSalary.toLocaleString('en-US', { minimumFractionDigits: 2 });

    this.actionLoading = true;
    this.hrService.getDisbursementBankAccounts().subscribe({
      next: (banks) => {
        this.actionLoading = false;
        this.disbursementBanks = banks || [];

        let bankOptionsHtml = '';
        if (this.disbursementBanks.length > 0) {
          bankOptionsHtml = this.disbursementBanks.map((b, idx) => `
            <option value="${b.id}" ${idx === 0 ? 'selected' : ''}>
              ${b.accountCode} - ${b.nameAr || b.nameEn} (الرصيد: ${b.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR)
            </option>
          `).join('');
        } else {
          bankOptionsHtml = `
            <option value="">11102 - مصرف الراجحي - حساب جاري</option>
            <option value="">11103 - البنك الأهلي السعودي - حساب جاري</option>
            <option value="">11101 - الصندوق الرئيسي - الخزينة</option>
          `;
        }

        const dialogHtml = isAr ? `
          <div style="text-align: right; font-family: 'Cairo', sans-serif; font-size: 0.9rem; line-height: 1.6;">
            <p style="margin-bottom: 0.75rem; color: #1e293b;">
              سيتم إثبات تحويل وصرف صافي الرواتب لشهر <strong>${this.currentPeriod!.periodMonth}/${this.currentPeriod!.periodYear}</strong> بمبلغ <strong>${netAmount} SAR</strong> عبر البنك وتوليد <strong>قيد صرف بنكي تلقائي</strong>.
            </p>
            
            <div style="margin-bottom: 0.85rem;">
              <label style="display: block; font-weight: bold; color: #334155; margin-bottom: 0.35rem;">
                اختر الحساب البنكي / الصندوق المسحوب منه:
              </label>
              <select id="swal-bank-select" style="width: 100%; padding: 0.55rem 0.75rem; border: 1.5px solid #0284c7; border-radius: 8px; font-size: 0.88rem; outline: none; background: #f8fafc; font-family: inherit;">
                ${bankOptionsHtml}
              </select>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.75rem;">
              <div style="color: #15803d; font-weight: bold; font-size: 0.82rem; margin-bottom: 0.25rem;">
                الأثر المحاسبي لقيد الصرف البنكي:
              </div>
              <div style="font-size: 0.78rem; color: #166534;">
                • مدين: حـ/ 21301 الرواتب والأجور المستحقة (${netAmount} SAR) [إقفال الالتزام]<br>
                • دائن: حـ/ البنك المختار (${netAmount} SAR) [تخفيض رصيد البنك]
              </div>
            </div>
          </div>
        ` : `
          <div style="text-align: left; font-family: inherit; font-size: 0.9rem; line-height: 1.6;">
            <p style="margin-bottom: 0.75rem; color: #1e293b;">
              Net salaries for month <strong>${this.currentPeriod!.periodMonth}/${this.currentPeriod!.periodYear}</strong> amounting to <strong>${netAmount} SAR</strong> will be disbursed via bank with an automatic payment entry.
            </p>
            
            <div style="margin-bottom: 0.85rem;">
              <label style="display: block; font-weight: bold; color: #334155; margin-bottom: 0.35rem;">
                Select Bank / Cash Account:
              </label>
              <select id="swal-bank-select" style="width: 100%; padding: 0.55rem 0.75rem; border: 1.5px solid #0284c7; border-radius: 8px; font-size: 0.88rem; outline: none; background: #f8fafc; font-family: inherit;">
                ${bankOptionsHtml}
              </select>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.75rem;">
              <div style="color: #15803d; font-weight: bold; font-size: 0.82rem; margin-bottom: 0.25rem;">
                Accounting Impact:
              </div>
              <div style="font-size: 0.78rem; color: #166534;">
                • Debit: Acc/ 21301 Accrued Salaries (${netAmount} SAR) [Close Liability]<br>
                • Credit: Acc/ Selected Bank (${netAmount} SAR) [Reduce Bank Balance]
              </div>
            </div>
          </div>
        `;

        Swal.fire({
          icon: 'question',
          title: this.langService.t('hr.payroll.alerts.disburseTitle'),
          html: dialogHtml,
          showCancelButton: true,
          confirmButtonText: this.langService.t('hr.payroll.alerts.disburseConfirm'),
          cancelButtonText: this.langService.t('common.cancel'),
          confirmButtonColor: '#7e22ce',
          cancelButtonColor: '#64748b',
          width: '580px',
          preConfirm: () => {
            const selectEl = document.getElementById('swal-bank-select') as HTMLSelectElement;
            return selectEl ? selectEl.value : null;
          }
        }).then(res => {
          if (res.isConfirmed) {
            const selectedBankId = res.value || undefined;
            this.actionLoading = true;
            this.hrService.markPayrollAsPaid(this.currentPeriod!.id, this.langService.t('hr.payroll.alerts.disburseActualNote'), selectedBankId).subscribe({
              next: (updated) => {
                this.currentPeriod = updated;
                this.actionLoading = false;
                this.loadPeriods();
                Swal.fire({
                  icon: 'success',
                  title: this.langService.t('hr.payroll.alerts.disburseSuccessTitle'),
                  html: this.langService.t('hr.payroll.alerts.disburseSuccessHtml', { number: updated.paymentJournalEntryNumber || this.langService.t('common.approved') }),
                  showCancelButton: true,
                  confirmButtonText: this.langService.t('hr.payroll.alerts.inspectPaymentEntry'),
                  cancelButtonText: this.langService.t('common.close'),
                  confirmButtonColor: '#7e22ce',
                  cancelButtonColor: '#64748b'
                }).then(viewRes => {
                  if (viewRes.isConfirmed && updated.paymentJournalEntryId) {
                    this.viewJournalEntry(updated.paymentJournalEntryId, updated.paymentJournalEntryNumber);
                  }
                });
              },
              error: (err) => {
                this.actionLoading = false;
                Swal.fire({
                  icon: 'error',
                  title: this.langService.t('common.error'),
                  text: err.error?.message || this.langService.t('hr.payroll.alerts.disburseFailed'),
                  confirmButtonColor: '#dc2626'
                });
              }
            });
          }
        });
      },
      error: () => {
        this.actionLoading = false;
        // Fallback without bank list
        this.hrService.markPayrollAsPaid(this.currentPeriod!.id, 'تم الصرف البنكي').subscribe({
          next: (updated) => {
            this.currentPeriod = updated;
            this.loadPeriods();
          }
        });
      }
    });
  }

  // --- Journal Entry Inspection Modal ---
  viewJournalEntry(entryId?: string, entryNumber?: string): void {
    if (!entryId) {
      if (entryNumber) {
        this.router.navigate(['/accounting/journal-entries'], { queryParams: { search: entryNumber } });
      }
      return;
    }

    this.showJournalModal = true;
    this.journalLoading = true;
    this.selectedJournalEntry = null;

    this.journalService.getById(entryId).subscribe({
      next: (entry) => {
        this.selectedJournalEntry = entry;
        this.journalLoading = false;
      },
      error: () => {
        this.journalLoading = false;
        if (entryNumber) {
          this.router.navigate(['/accounting/journal-entries'], { queryParams: { search: entryNumber } });
        }
      }
    });
  }

  closeJournalModal(): void {
    this.showJournalModal = false;
    this.selectedJournalEntry = null;
  }

  openInJournalModule(entryId?: string): void {
    this.closeJournalModal();
    if (entryId) {
      this.router.navigate(['/accounting/journal-entries'], { queryParams: { previewId: entryId } });
    } else {
      this.router.navigate(['/accounting/journal-entries']);
    }
  }

  // --- Manual Line Adjustments Modal ---
  openAdjustmentModal(line: PayrollLineDto): void {
    if (this.currentPeriod?.status === PayrollStatus.PostedToGl || this.currentPeriod?.status === PayrollStatus.Paid) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('hr.payroll.alerts.cannotEditPosted'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    this.selectedLineForAdjustment = line;
    this.adjOvertimeAmount = line.overtimeAmount || 0;
    this.adjAbsenceDeduction = line.absenceDeduction || 0;
    this.adjLoanDeduction = line.loanDeduction || 0;
    this.adjOtherDeductions = line.otherDeductions || 0;
    this.adjNotes = line.notes || '';
    this.showAdjustmentModal = true;
  }

  closeAdjustmentModal(): void {
    this.showAdjustmentModal = false;
    this.selectedLineForAdjustment = null;
  }

  getAdjNewGross(): number {
    if (!this.selectedLineForAdjustment) return 0;
    return (
      this.selectedLineForAdjustment.basicSalary +
      this.selectedLineForAdjustment.housingAllowance +
      this.selectedLineForAdjustment.transportationAllowance +
      this.selectedLineForAdjustment.otherAllowances +
      Number(this.adjOvertimeAmount || 0)
    );
  }

  getAdjNewDeductions(): number {
    if (!this.selectedLineForAdjustment) return 0;
    return (
      this.selectedLineForAdjustment.employeeGosiDeduction +
      Number(this.adjAbsenceDeduction || 0) +
      Number(this.adjLoanDeduction || 0) +
      Number(this.adjOtherDeductions || 0)
    );
  }

  getAdjNewNet(): number {
    return Math.max(0, this.getAdjNewGross() - this.getAdjNewDeductions());
  }

  saveAdjustment(): void {
    if (!this.currentPeriod || !this.selectedLineForAdjustment) return;

    this.actionLoading = true;
    this.hrService.updatePayrollLine(this.currentPeriod.id, this.selectedLineForAdjustment.id, {
      overtimeAmount: Number(this.adjOvertimeAmount || 0),
      absenceDeduction: Number(this.adjAbsenceDeduction || 0),
      loanDeduction: Number(this.adjLoanDeduction || 0),
      otherDeductions: Number(this.adjOtherDeductions || 0),
      notes: this.adjNotes
    }).subscribe({
      next: (updated) => {
        this.currentPeriod = updated;
        this.actionLoading = false;
        this.closeAdjustmentModal();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: this.langService.t('hr.payroll.alerts.adjustmentsSaved'),
          showConfirmButton: false,
          timer: 3000
        });
      },
      error: (err) => {
        this.actionLoading = false;
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.message || this.langService.t('hr.payroll.alerts.saveAdjustmentsFailed'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  // --- Official Payroll Statement Print Modal (Full Month Sheet) ---
  openPrintModal(): void {
    this.currentPrintDate = new Date();
    this.showPrintModal = true;
  }

  closePrintModal(): void {
    this.showPrintModal = false;
    document.body.classList.remove('statement-printing-mode');
  }

  triggerPrintSheet(): void {
    document.body.classList.add('statement-printing-mode');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('statement-printing-mode');
      }, 1000);
    }, 100);
  }

  // --- Individual Payslip Modal ---
  openPayslipModal(line: PayrollLineDto): void {
    this.selectedLineForPayslip = line;
    this.currentPrintDate = new Date();
    this.showPayslipModal = true;
  }

  closePayslipModal(): void {
    this.showPayslipModal = false;
    this.selectedLineForPayslip = null;
    document.body.classList.remove('statement-printing-mode');
  }

  triggerPrintPayslip(): void {
    document.body.classList.add('statement-printing-mode');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('statement-printing-mode');
      }, 1000);
    }, 100);
  }

  // --- Tafqeet Helpers ---
  getTafqeetTotalNet(): string {
    const amount = this.currentPeriod?.totalNetSalary || 0;
    return this.tafqeet.toArabicCurrency(amount, 'ريال سعودي', 'هللة');
  }

  getTafqeetAmount(amount: number): string {
    return this.tafqeet.toArabicCurrency(amount || 0, 'ريال سعودي', 'هللة');
  }

  // --- Export to CSV / Excel ---
  exportToCsv(): void {
    if (!this.currentPeriod || !this.currentPeriod.lines || this.currentPeriod.lines.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('hr.payroll.alerts.noLinesToExport'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    let csv = 'م,الرقم الوظيفي,اسم الموظف بالعربية,اسم الموظف بالإنجليزية,رقم الهوية أو الإقامة,الراتب الأساسي,بدل السكن,بدل النقل,بدلات أخرى,العمل الإضافي,إجمالي الراتب,تأمينات الموظف GOSI,حصة المنشأة للتأمينات,خصم الغياب,خصم السلف,استقطاعات أخرى,إجمالي الاستقطاعات,صافي الراتب المستحق,رمز البنك,رقم الآيبان,ملاحظات\n';

    this.currentPeriod.lines.forEach((l, idx) => {
      csv += `${idx + 1},"${l.employeeNumber}","${l.employeeNameAr}","${l.employeeNameEn}","${l.nationalIdOrIqama}",${l.basicSalary},${l.housingAllowance},${l.transportationAllowance},${l.otherAllowances},${l.overtimeAmount},${l.grossSalary},${l.employeeGosiDeduction},${l.companyGosiContribution},${l.absenceDeduction},${l.loanDeduction},${l.otherDeductions},${l.totalDeductions},${l.netSalary},"${l.bankCode}","${l.iban}","${l.notes || ''}"\n`;
    });

    // Grand Totals row
    csv += `الإجمالي العام,,,,,${this.currentPeriod.totalBasicSalary},${this.currentPeriod.totalHousingAllowance},${this.currentPeriod.totalTransportationAllowance},${this.currentPeriod.totalOtherAllowances},${this.currentPeriod.totalOvertime},${this.currentPeriod.totalGrossSalary},${this.currentPeriod.totalEmployeeGosiDeduction},${this.currentPeriod.totalCompanyGosiContribution},${this.currentPeriod.totalAbsenceDeductions},${this.currentPeriod.totalLoanDeductions},${this.currentPeriod.totalOtherDeductions},${this.currentPeriod.totalDeductions},${this.currentPeriod.totalNetSalary},,,\n`;

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Payroll_${this.currentPeriod.payrollNumber}_${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- WPS Dialog ---
  openWpsDialog(): void {
    if (!this.currentPeriod) return;
    this.actionLoading = true;
    this.hrService.generateWps(this.currentPeriod.id, {
      establishmentMudadId: this.wpsEstablishmentId,
      establishmentName: this.wpsEstablishmentName,
      employerIban: this.wpsEmployerIban,
      employerBankCode: this.wpsEmployerBankCode
    }).subscribe({
      next: (res) => {
        this.wpsPreviewContent = res.fileContent;
        this.showWpsModal = true;
        this.actionLoading = false;
      },
      error: (err) => {
        this.actionLoading = false;
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.message || this.langService.t('hr.payroll.alerts.wpsGenerateFailed'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  closeWpsModal(): void {
    this.showWpsModal = false;
  }

  downloadWpsFile(): void {
    if (!this.currentPeriod) return;
    const blob = new Blob([this.wpsPreviewContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WPS_${this.currentPeriod.payrollNumber}_MUDAD.sif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    this.closeWpsModal();
    Swal.fire({
      icon: 'success',
      title: this.langService.t('hr.payroll.alerts.wpsDownloadedTitle'),
      text: this.langService.t('hr.payroll.alerts.wpsDownloadedText'),
      confirmButtonColor: '#059669',
      timer: 3000
    });
  }

  saveWpsSettingsAsDefault(): void {
    this.modulesSettings.updateSection('hr', {
      mudadEstablishmentId: this.wpsEstablishmentId,
      employerIban: this.wpsEmployerIban,
      employerBankCode: this.wpsEmployerBankCode
    });
    this.modulesSettings.updateSection('general', {
      companyNameAr: this.wpsEstablishmentName
    });
    Swal.fire({
      icon: 'success',
      title: this.langService.t('hr.payroll.alerts.settingsSavedTitle'),
      text: this.langService.t('hr.payroll.alerts.settingsSavedText'),
      confirmButtonColor: '#059669',
      timer: 2500
    });
  }

  // --- Helpers ---
  formatIban(iban: string): string {
    if (!iban) return '—';
    const clean = iban.replace(/\s+/g, '');
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }

  isNonZero(amount: number | null | undefined): boolean {
    return !!amount && Math.abs(amount) > 0.001;
  }

  getBankFriendlyName(code: string): string {
    const c = (code || '').toUpperCase();
    switch (c) {
      case 'RJHI': return 'مصرف الراجحي';
      case 'NCBK':
      case 'NCB': return 'البنك الأهلي السعودي (SNB)';
      case 'ALBI': return 'بنك البلاد';
      case 'INMA': return 'مصرف الإنماء';
      case 'RIBL': return 'بنك الرياض';
      case 'BSFR': return 'البنك السعودي الفرنسي';
      case 'ANBI': return 'البنك العربي الوطني';
      case 'SABB': return 'البنك السعودي الأول (SAB)';
      case 'BJAZ': return 'بنك الجزيرة';
      case 'GIBK': return 'بنك الخليج الدولي';
      default: return code || 'البنك المعتمد';
    }
  }

  getStatusBadgeClass(status: PayrollStatus): string {
    switch (status) {
      case PayrollStatus.Draft: return 'badge-draft';
      case PayrollStatus.Calculated: return 'badge-calculated';
      case PayrollStatus.Approved: return 'badge-approved';
      case PayrollStatus.PostedToGl: return 'badge-posted';
      case PayrollStatus.Paid: return 'badge-paid';
      default: return 'badge-draft';
    }
  }

  getStatusText(status: PayrollStatus): string {
    switch (status) {
      case PayrollStatus.Draft: return this.langService.t('hr.payroll.status.draft');
      case PayrollStatus.Calculated: return this.langService.t('hr.payroll.status.calculated');
      case PayrollStatus.Approved: return this.langService.t('hr.payroll.status.approved');
      case PayrollStatus.PostedToGl: return this.langService.t('hr.payroll.status.postedToGl');
      case PayrollStatus.Paid: return this.langService.t('hr.payroll.status.paid');
      case PayrollStatus.Cancelled: return this.langService.t('hr.payroll.status.cancelled');
      default: return this.langService.t('hr.payroll.status.draft');
    }
  }
}
