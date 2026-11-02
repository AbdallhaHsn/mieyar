import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  VouchersService,
  VoucherDto,
  VoucherKpisDto,
  VoucherType,
  VoucherStatus,
  PaymentMethod,
  CreateVoucherRequest,
  CreateVoucherLineRequest
} from '../../../core/services/vouchers.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { TafqeetService } from '../../../core/services/tafqeet.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountDto } from '../../../core/models/account.model';
import { AccountPickerComponent } from '../../../shared/components/account-picker/account-picker.component';
import { DocumentAttachmentsModalComponent } from '../../../shared/components/document-attachments-modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

interface FormLine {
  accountId: string;
  amount: number;
  description: string;
}

@Component({
  selector: 'app-vouchers',
  standalone: true,
  imports: [CommonModule, FormsModule, AccountPickerComponent, DocumentAttachmentsModalComponent, PaginationComponent, TranslatePipe],
  templateUrl: './vouchers.component.html',
  styleUrls: ['./vouchers.component.css']
})
export class VouchersComponent implements OnInit {
  // Financial Vouchers Component
  private vouchersService = inject(VouchersService);
  private coaService = inject(ChartOfAccountsService);
  public companyContext = inject(CompanyContextService);
  private tafqeetService = inject(TafqeetService);
  public langService = inject(LanguageService);

  // State
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Vouchers List & KPIs
  vouchers = signal<VoucherDto[]>([]);
  kpis = signal<VoucherKpisDto>({
    totalVouchers: 0,
    receiptCount: 0,
    paymentCount: 0,
    postedCount: 0,
    draftCount: 0,
    totalReceiptsAmount: 0,
    totalPaymentsAmount: 0,
    netCashFlow: 0
  });

  // Filter state
  activeTab = signal<'all' | 'receipt' | 'payment'>('all');
  selectedStatus = signal<string>('all');
  searchTerm = signal<string>('');
  fromDate = signal<string>('');
  toDate = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedVouchers = computed(() => {
    const list = this.vouchers();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  // Accounts list for select dropdowns
  flattenedAccounts = signal<AccountDto[]>([]);
  cashAndBankAccounts = computed(() => {
    return this.flattenedAccounts().filter(a =>
      a.isPostable && (
        a.accountCode.startsWith('111') ||
        a.accountCode.startsWith('112') ||
        a.accountCode.startsWith('11')
      )
    );
  });
  distributionAccounts = computed(() => {
    return this.flattenedAccounts().filter(a => a.isPostable);
  });

  // Modal State - Create Voucher
  isCreateModalOpen = signal<boolean>(false);
  createType = signal<VoucherType>(VoucherType.Receipt);
  formDate = signal<string>(new Date().toISOString().substring(0, 10));
  formPaymentMethod = signal<PaymentMethod>(PaymentMethod.Cash);
  formCashAccountId = signal<string>('');
  formBeneficiary = signal<string>('');
  formReference = signal<string>('');
  formDescription = signal<string>('');
  formAutoPost = signal<boolean>(true);
  formLines = signal<FormLine[]>([
    { accountId: '', amount: 0, description: '' }
  ]);

  // Modal State - Print / Details
  isViewModalOpen = signal<boolean>(false);
  selectedVoucher = signal<VoucherDto | null>(null);

  // Modal State - Cancel Reason
  isCancelModalOpen = signal<boolean>(false);
  voucherToCancel = signal<VoucherDto | null>(null);
  cancelReason = signal<string>('');

  // Computed Form Total & Tafqeet
  formTotalAmount = computed(() => {
    return this.formLines().reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  });

  formTafqeet = computed(() => {
    const total = this.formTotalAmount();
    return this.tafqeetService.toArabicCurrency(total);
  });

  // Enums for template
  VoucherTypeEnum = VoucherType;
  VoucherStatusEnum = VoucherStatus;
  PaymentMethodEnum = PaymentMethod;

  ngOnInit(): void {
    this.loadAccounts();
    this.loadVouchers();
  }

  loadAccounts(): void {
    this.coaService.loadAccountsTree().subscribe({
      next: (tree) => {
        const flat: AccountDto[] = [];
        const traverse = (nodes: AccountDto[]) => {
          for (const node of nodes) {
            flat.push(node);
            if (node.subAccounts && node.subAccounts.length > 0) {
              traverse(node.subAccounts);
            }
          }
        };
        traverse(tree);
        this.flattenedAccounts.set(flat);

        // Pre-select first cash/bank account if available
        const cashAccounts = flat.filter(a => a.isPostable && (a.accountCode.startsWith('111') || a.accountCode.startsWith('112')));
        if (cashAccounts.length > 0 && !this.formCashAccountId()) {
          this.formCashAccountId.set(cashAccounts[0].id);
        }
      }
    });
  }

  loadVouchers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    let typeParam: number | undefined;
    if (this.activeTab() === 'receipt') typeParam = VoucherType.Receipt;
    if (this.activeTab() === 'payment') typeParam = VoucherType.Payment;

    let statusParam: number | undefined;
    if (this.selectedStatus() === 'draft') statusParam = VoucherStatus.Draft;
    if (this.selectedStatus() === 'posted') statusParam = VoucherStatus.Posted;
    if (this.selectedStatus() === 'cancelled') statusParam = VoucherStatus.Cancelled;

    this.vouchersService.getVouchers({
      companyId: this.companyContext.activeCompany().id,
      type: typeParam,
      status: statusParam,
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      searchTerm: this.searchTerm() || undefined
    }).subscribe({
      next: (res) => {
        this.vouchers.set(res.items);
        this.kpis.set(res.kpis);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(this.langService.t('accounting.vouchers.alerts.loadFailed') + (err.error?.description || err.message));
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: 'all' | 'receipt' | 'payment'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadVouchers();
  }

  openCreateModal(type: VoucherType): void {
    this.createType.set(type);
    this.formDate.set(new Date().toISOString().substring(0, 10));
    this.formPaymentMethod.set(PaymentMethod.Cash);
    this.formBeneficiary.set('');
    this.formReference.set('');
    this.formDescription.set(type === VoucherType.Receipt ? this.langService.t('accounting.vouchers.form.defaultReceiptDesc') : this.langService.t('accounting.vouchers.form.defaultPaymentDesc'));
    this.formAutoPost.set(true);

    const cashAccs = this.cashAndBankAccounts();
    if (cashAccs.length > 0) {
      this.formCashAccountId.set(cashAccs[0].id);
    }

    this.formLines.set([
      { accountId: '', amount: 0, description: '' }
    ]);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  addLine(): void {
    this.formLines.update(lines => [
      ...lines,
      { accountId: '', amount: 0, description: '' }
    ]);
  }

  removeLine(index: number): void {
    if (this.formLines().length <= 1) return;
    this.formLines.update(lines => lines.filter((_, i) => i !== index));
  }

  onLineAmountChange(index: number, val: any): void {
    const num = parseFloat(val) || 0;
    this.formLines.update(lines => {
      const copy = [...lines];
      if (copy[index]) {
        copy[index] = { ...copy[index], amount: num };
      }
      return copy;
    });
  }

  onLineAccountChange(index: number, accountId: string): void {
    this.formLines.update(lines => {
      const copy = [...lines];
      if (copy[index]) {
        copy[index] = { ...copy[index], accountId };
      }
      return copy;
    });
  }

  onLineDescriptionChange(index: number, description: string): void {
    this.formLines.update(lines => {
      const copy = [...lines];
      if (copy[index]) {
        copy[index] = { ...copy[index], description: description || '' };
      }
      return copy;
    });
  }

  saveVoucher(): void {
    const total = this.formTotalAmount();
    if (total <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('accounting.vouchers.alerts.totalAmountPositive'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    if (!this.formCashAccountId()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('accounting.vouchers.alerts.selectTreasuryOrBank'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    if (!this.formBeneficiary().trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.createType() === VoucherType.Receipt ? this.langService.t('accounting.vouchers.alerts.enterReceivedFrom') : this.langService.t('accounting.vouchers.alerts.enterPaidTo'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    // Filter out completely untouched/empty lines (e.g. if a user added a row by mistake or didn't need it)
    const allLines = this.formLines();
    const activeLines = allLines.filter(l => l.accountId || (Number(l.amount) > 0) || (l.description && l.description.trim().length > 0));

    if (activeLines.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('accounting.vouchers.alerts.specifyLineAccountAmount'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    // Validate only active/relevant lines
    const lines: CreateVoucherLineRequest[] = [];
    for (let i = 0; i < activeLines.length; i++) {
      const line = activeLines[i];
      if (!line.accountId) {
        Swal.fire({
          icon: 'warning',
          title: this.langService.t('common.warning'),
          text: this.langService.t('accounting.vouchers.alerts.selectLineAccount', { line: i + 1 }),
          confirmButtonText: this.langService.t('common.ok'),
          confirmButtonColor: '#0284c7'
        });
        return;
      }
      if (!line.amount || Number(line.amount) <= 0) {
        Swal.fire({
          icon: 'warning',
          title: this.langService.t('common.warning'),
          text: this.langService.t('accounting.vouchers.alerts.enterValidLineAmount', { line: i + 1 }),
          confirmButtonText: this.langService.t('common.ok'),
          confirmButtonColor: '#0284c7'
        });
        return;
      }
      lines.push({
        accountId: line.accountId,
        amount: Number(line.amount),
        description: line.description?.trim() || undefined
      });
    }

    const calculatedTotal = lines.reduce((sum, l) => sum + l.amount, 0);
    if (calculatedTotal <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('accounting.vouchers.alerts.totalAmountPositive'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const payload: CreateVoucherRequest = {
      companyId: this.companyContext.activeCompany().id,
      voucherType: this.createType(),
      voucherDate: this.formDate(),
      paymentMethod: Number(this.formPaymentMethod()),
      cashOrBankAccountId: this.formCashAccountId(),
      beneficiaryOrPayerName: this.formBeneficiary().trim(),
      description: this.formDescription().trim(),
      referenceNumber: this.formReference().trim() || undefined,
      lines: lines
    };

    this.isLoading.set(true);
    this.vouchersService.createVoucher(payload, this.formAutoPost()).subscribe({
      next: (created) => {
        this.isLoading.set(false);
        this.closeCreateModal();
        Swal.fire({
          icon: 'success',
          title: this.langService.t('common.savedSuccessfully'),
          text: this.langService.t('accounting.vouchers.alerts.voucherSavedSuccess', { number: created.voucherNumber }),
          timer: 3000,
          showConfirmButton: false
        });
        this.loadVouchers();
      },
      error: (err) => {
        this.isLoading.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: this.langService.t('accounting.vouchers.alerts.voucherSaveError') + (err.error?.description || err.message),
          confirmButtonText: this.langService.t('common.ok'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  viewVoucher(voucher: VoucherDto): void {
    this.selectedVoucher.set(voucher);
    this.isViewModalOpen.set(true);
  }

  closeViewModal(): void {
    document.body.classList.remove('voucher-printing-mode');
    this.isViewModalOpen.set(false);
    this.selectedVoucher.set(null);
  }

  printVoucher(): void {
    document.body.classList.add('voucher-printing-mode');
    const cleanup = () => {
      document.body.classList.remove('voucher-printing-mode');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  }

  postVoucher(voucher: VoucherDto): void {
    Swal.fire({
      title: this.langService.t('accounting.vouchers.alerts.postVoucherTitle'),
      text: this.langService.t('accounting.vouchers.alerts.postVoucherConfirm', { number: voucher.voucherNumber }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.vouchers.alerts.yesPost'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading.set(true);
        this.vouchersService.postVoucher(voucher.id).subscribe({
          next: (res) => {
            this.isLoading.set(false);
            Swal.fire({
              icon: 'success',
              title: this.langService.t('common.postedSuccessfully'),
              text: this.langService.t('accounting.vouchers.alerts.postVoucherSuccess', { number: res.voucherNumber }),
              timer: 3000,
              showConfirmButton: false
            });
            this.loadVouchers();
          },
          error: (err) => {
            this.isLoading.set(false);
            Swal.fire({
              icon: 'error',
              title: this.langService.t('accounting.vouchers.alerts.postVoucherFailed'),
              text: err.error?.description || err.message,
              confirmButtonText: this.langService.t('common.ok'),
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  openCancelModal(voucher: VoucherDto): void {
    this.voucherToCancel.set(voucher);
    this.cancelReason.set('');
    this.isCancelModalOpen.set(true);
  }

  closeCancelModal(): void {
    this.isCancelModalOpen.set(false);
    this.voucherToCancel.set(null);
  }

  confirmCancelVoucher(): void {
    const v = this.voucherToCancel();
    if (!v) return;

    if (!this.cancelReason().trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('accounting.vouchers.alerts.enterCancelReason'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    this.isLoading.set(true);
    this.vouchersService.cancelVoucher(v.id, this.cancelReason().trim()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.closeCancelModal();
        Swal.fire({
          icon: 'success',
          title: this.langService.t('common.cancelledSuccessfully'),
          text: this.langService.t('accounting.vouchers.alerts.voucherCancelledSuccess', { number: res.voucherNumber }),
          timer: 3000,
          showConfirmButton: false
        });
        this.loadVouchers();
      },
      error: (err) => {
        this.isLoading.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('accounting.vouchers.alerts.cancelFailed'),
          text: err.error?.description || err.message,
          confirmButtonText: this.langService.t('common.ok'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  // Universal Document Attachments
  showAttachmentsModal = false;
  selectedAttachmentEntityId = '';
  selectedAttachmentTitle = '';

  openAttachments(voucher: VoucherDto) {
    this.selectedAttachmentEntityId = voucher.id;
    const typeLabel = voucher.voucherType === VoucherType.Receipt ? this.langService.t('accounting.vouchers.form.receiptVoucher') : this.langService.t('accounting.vouchers.form.paymentVoucher');
    this.selectedAttachmentTitle = `${typeLabel} #${voucher.voucherNumber} (${voucher.beneficiaryOrPayerName || ''})`;
    this.showAttachmentsModal = true;
  }
}
