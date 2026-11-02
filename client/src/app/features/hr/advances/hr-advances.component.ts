import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  HrService,
  EmployeeDto,
  EmployeeAdvanceDto,
  AdvanceStatus,
  DisbursementBankAccountDto
} from '../../../core/services/hr.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../core/services/language.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-hr-advances',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TranslatePipe],
  templateUrl: './hr-advances.component.html',
  styleUrls: ['./hr-advances.component.scss']
})
export class HrAdvancesComponent implements OnInit {
  public langService = inject(LanguageService);
  private hrService = inject(HrService);
  private translator = inject(AccountingTranslatorService);

  get isArabic(): boolean {
    return this.langService.isArabic();
  }

  advances: EmployeeAdvanceDto[] = [];
  filteredAdvances: EmployeeAdvanceDto[] = [];
  employees: EmployeeDto[] = [];
  bankAccounts: DisbursementBankAccountDto[] = [];

  loading = false;
  statusFilter = 'ALL';
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // New Request Modal
  showModal = false;
  form = {
    employeeId: '',
    amount: 1000,
    installmentsCount: 3,
    startDeductionYear: new Date().getFullYear(),
    startDeductionMonth: new Date().getMonth() + 1,
    reasonAr: '',
    reasonEn: '',
    notes: ''
  };

  // Approval Modal
  showApprovalModal = false;
  selectedAdvance: EmployeeAdvanceDto | null = null;
  approvalForm = {
    approvedAmount: 0,
    notes: ''
  };

  // Disburse Modal
  showDisburseModal = false;
  disburseForm = {
    disbursementMethod: 'BankTransfer',
    bankAccountId: '',
    notes: ''
  };

  ngOnInit(): void {
    this.loadData();
    this.loadEmployees();
    this.loadBankAccounts();
  }

  loadData(): void {
    this.loading = true;
    this.hrService.getAdvances().subscribe({
      next: (data) => {
        this.advances = data;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: this.langService.t('hr.advances.alerts.loadFailed')
        });
      }
    });
  }

  loadEmployees(): void {
    this.hrService.getEmployees(true).subscribe({
      next: (data) => this.employees = data,
      error: (e) => console.error(e)
    });
  }

  loadBankAccounts(): void {
    this.hrService.getDisbursementBankAccounts().subscribe({
      next: (data) => {
        this.bankAccounts = data;
        if (data.length > 0) {
          this.disburseForm.bankAccountId = data[0].id;
        }
      },
      error: (e) => console.error(e)
    });
  }

  applyFilter(): void {
    let result = [...this.advances];

    if (this.statusFilter !== 'ALL') {
      const statusNum = parseInt(this.statusFilter, 10);
      result = result.filter(a => a.status === statusNum);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(a =>
        a.advanceNumber?.toLowerCase().includes(term) ||
        a.employeeNameAr?.toLowerCase().includes(term) ||
        a.employeeNameEn?.toLowerCase().includes(term) ||
        a.employeeNumber?.toLowerCase().includes(term) ||
        a.reasonAr?.toLowerCase().includes(term) ||
        a.reasonEn?.toLowerCase().includes(term)
      );
    }

    this.filteredAdvances = result;
    this.currentPage = 1;
  }

  get paginatedAdvances(): EmployeeAdvanceDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAdvances.slice(start, start + this.pageSize);
  }

  // --- Metrics ---
  get totalAdvancesCount(): number {
    return this.advances.length;
  }

  get pendingApprovalsCount(): number {
    return this.advances.filter(a => a.status === AdvanceStatus.Pending).length;
  }

  get totalDisbursedAmount(): number {
    return this.advances
      .filter(a => a.status === AdvanceStatus.Disbursed || a.status === AdvanceStatus.Settled)
      .reduce((sum, a) => sum + (a.approvedAmount || a.amount), 0);
  }

  get totalRemainingBalance(): number {
    return this.advances
      .filter(a => a.status === AdvanceStatus.Disbursed)
      .reduce((sum, a) => sum + a.remainingAmount, 0);
  }

  // Single-Entry Auto-Translation
  onReasonArChange(): void {
    if (!this.form.reasonAr) {
      this.form.reasonEn = '';
      return;
    }
    this.form.reasonEn = this.translator.translateArabicToEnglish(this.form.reasonAr);
  }

  triggerReTranslate(): void {
    if (this.form.reasonAr) {
      this.form.reasonEn = this.translator.translateArabicToEnglish(this.form.reasonAr);
    }
  }

  get monthlyInstallmentEstimate(): number {
    if (this.form.amount <= 0 || this.form.installmentsCount <= 0) return 0;
    return Math.round((this.form.amount / this.form.installmentsCount) * 100) / 100;
  }

  openNewModal(): void {
    this.form = {
      employeeId: this.employees.length > 0 ? this.employees[0].id : '',
      amount: 2000,
      installmentsCount: 4,
      startDeductionYear: new Date().getFullYear(),
      startDeductionMonth: new Date().getMonth() + 1,
      reasonAr: '',
      reasonEn: 'Emergency advance for family needs',
      notes: ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveAdvance(): void {
    if (!this.form.employeeId) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('hr.advances.alerts.selectEmployeeFirst')
      });
      return;
    }

    if (this.form.amount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('hr.advances.alerts.validAmountRequired')
      });
      return;
    }

    const payload = {
      employeeId: this.form.employeeId,
      amount: this.form.amount,
      installmentsCount: this.form.installmentsCount,
      startDeductionYear: this.form.startDeductionYear,
      startDeductionMonth: this.form.startDeductionMonth,
      reasonAr: this.form.reasonAr,
      reasonEn: this.form.reasonEn,
      notes: this.form.notes
    };

    this.loading = true;
    this.hrService.createAdvance(payload).subscribe({
      next: (created) => {
        this.loading = false;
        this.closeModal();
        Swal.fire({
          icon: 'success',
          title: this.langService.t('common.success'),
          text: this.langService.t('hr.advances.alerts.requestCreatedSuccess', { number: created.advanceNumber })
        });
        this.loadData();
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.message || this.langService.t('hr.advances.alerts.requestSaveFailed')
        });
      }
    });
  }

  // --- Approvals Workflow ---
  openApproval(advance: EmployeeAdvanceDto): void {
    this.selectedAdvance = advance;
    this.approvalForm = {
      approvedAmount: advance.amount,
      notes: ''
    };
    this.showApprovalModal = true;
  }

  submitApproval(): void {
    if (!this.selectedAdvance) return;
    if (this.approvalForm.approvedAmount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('hr.advances.alerts.approvedAmountPositive')
      });
      return;
    }

    this.loading = true;
    this.hrService.approveAdvance(this.selectedAdvance.id, this.approvalForm).subscribe({
      next: () => {
        this.loading = false;
        this.showApprovalModal = false;
        Swal.fire({
          icon: 'success',
          title: this.langService.t('common.approved'),
          text: this.langService.t('hr.advances.alerts.approvedSuccess')
        });
        this.loadData();
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.message || this.langService.t('hr.advances.alerts.approveFailed')
        });
      }
    });
  }

  promptReject(advance: EmployeeAdvanceDto): void {
    Swal.fire({
      title: this.langService.t('hr.advances.alerts.rejectTitle'),
      input: 'textarea',
      inputLabel: this.langService.t('hr.advances.alerts.rejectionReason'),
      inputPlaceholder: this.langService.t('hr.advances.alerts.rejectionPlaceholder'),
      showCancelButton: true,
      confirmButtonText: this.langService.t('hr.advances.alerts.confirmReject'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return this.langService.t('hr.advances.alerts.rejectionRequired');
        }
        return null;
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        this.loading = true;
        this.hrService.rejectAdvance(advance.id, { rejectionReason: res.value }).subscribe({
          next: () => {
            this.loading = false;
            Swal.fire({
              icon: 'success',
              title: this.langService.t('common.rejected'),
              text: this.langService.t('hr.advances.alerts.rejectedSuccess')
            });
            this.loadData();
          },
          error: (err) => {
            this.loading = false;
            console.error(err);
            Swal.fire({
              icon: 'error',
              title: this.langService.t('common.error'),
              text: err.error?.message || this.langService.t('hr.advances.alerts.rejectFailed')
            });
          }
        });
      }
    });
  }

  // --- Disbursement ---
  openDisburse(advance: EmployeeAdvanceDto): void {
    this.selectedAdvance = advance;
    this.disburseForm = {
      disbursementMethod: 'BankTransfer',
      bankAccountId: this.bankAccounts.length > 0 ? this.bankAccounts[0].id : '',
      notes: ''
    };
    this.showDisburseModal = true;
  }

  submitDisburse(): void {
    if (!this.selectedAdvance) return;
    this.loading = true;
    this.hrService.disburseAdvance(this.selectedAdvance.id, this.disburseForm).subscribe({
      next: () => {
        this.loading = false;
        this.showDisburseModal = false;
        Swal.fire({
          icon: 'success',
          title: this.langService.t('common.disbursed'),
          text: this.langService.t('hr.advances.alerts.disbursedSuccess')
        });
        this.loadData();
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.message || this.langService.t('hr.advances.alerts.disburseFailed')
        });
      }
    });
  }

  getStatusBadgeClass(status: AdvanceStatus): string {
    switch (status) {
      case AdvanceStatus.Pending: return 'badge-pending';
      case AdvanceStatus.Approved: return 'badge-approved';
      case AdvanceStatus.Disbursed: return 'badge-disbursed';
      case AdvanceStatus.Settled: return 'badge-settled';
      case AdvanceStatus.Rejected: return 'badge-rejected';
      case AdvanceStatus.Cancelled: return 'badge-cancelled';
      default: return 'badge-secondary';
    }
  }

  getStatusLabel(status: AdvanceStatus): string {
    switch (status) {
      case AdvanceStatus.Pending: return this.langService.t('hr.advances.status.pending');
      case AdvanceStatus.Approved: return this.langService.t('hr.advances.status.approved');
      case AdvanceStatus.Disbursed: return this.langService.t('hr.advances.status.disbursed');
      case AdvanceStatus.Settled: return this.langService.t('hr.advances.status.settled');
      case AdvanceStatus.Rejected: return this.langService.t('hr.advances.status.rejected');
      case AdvanceStatus.Cancelled: return this.langService.t('hr.advances.status.cancelled');
      default: return '-';
    }
  }
}
