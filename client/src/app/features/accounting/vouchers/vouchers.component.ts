import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { AccountDto } from '../../../core/models/account.model';
import { AccountPickerComponent } from '../../../shared/components/account-picker/account-picker.component';
import { DocumentAttachmentsModalComponent } from '../../../shared/components/document-attachments-modal.component';

interface FormLine {
  accountId: string;
  amount: number;
  description: string;
}

@Component({
  selector: 'app-vouchers',
  standalone: true,
  imports: [CommonModule, FormsModule, AccountPickerComponent, DocumentAttachmentsModalComponent],
  templateUrl: './vouchers.component.html',
  styleUrls: ['./vouchers.component.css']
})
export class VouchersComponent implements OnInit {
  // Financial Vouchers Component
  private vouchersService = inject(VouchersService);
  private coaService = inject(ChartOfAccountsService);
  public companyContext = inject(CompanyContextService);
  private tafqeetService = inject(TafqeetService);

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
        this.errorMessage.set('فشل تحميل السندات: ' + (err.error?.description || err.message));
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: 'all' | 'receipt' | 'payment'): void {
    this.activeTab.set(tab);
    this.loadVouchers();
  }

  openCreateModal(type: VoucherType): void {
    this.createType.set(type);
    this.formDate.set(new Date().toISOString().substring(0, 10));
    this.formPaymentMethod.set(PaymentMethod.Cash);
    this.formBeneficiary.set('');
    this.formReference.set('');
    this.formDescription.set(type === VoucherType.Receipt ? 'استلام دفعة نقدية' : 'سداد مصروفات / مستحقات');
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

  saveVoucher(): void {
    const total = this.formTotalAmount();
    if (total <= 0) {
      alert('يجب أن يكون إجمالي مبلغ السند أكبر من صفر');
      return;
    }

    if (!this.formCashAccountId()) {
      alert('يرجى اختيار حساب الخزينة أو البنك');
      return;
    }

    if (!this.formBeneficiary().trim()) {
      alert(this.createType() === VoucherType.Receipt ? 'يرجى إدخال اسم المستلم منه' : 'يرجى إدخال اسم المصروف له');
      return;
    }

    // Validate lines
    const lines: CreateVoucherLineRequest[] = [];
    for (let i = 0; i < this.formLines().length; i++) {
      const line = this.formLines()[i];
      if (!line.accountId) {
        alert(`يرجى اختيار الحساب في البند رقم ${i + 1}`);
        return;
      }
      if (line.amount <= 0) {
        alert(`يرجى إدخال مبلغ صحيح في البند رقم ${i + 1}`);
        return;
      }
      lines.push({
        accountId: line.accountId,
        amount: Number(line.amount),
        description: line.description.trim() || undefined
      });
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
        this.successMessage.set(`تم حفظ السند بنجاح برقم ${created.voucherNumber}`);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.loadVouchers();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert('حدث خطأ أثناء حفظ السند: ' + (err.error?.description || err.message));
      }
    });
  }

  viewVoucher(voucher: VoucherDto): void {
    this.selectedVoucher.set(voucher);
    this.isViewModalOpen.set(true);
  }

  closeViewModal(): void {
    this.isViewModalOpen.set(false);
    this.selectedVoucher.set(null);
  }

  printVoucher(): void {
    window.print();
  }

  postVoucher(voucher: VoucherDto): void {
    if (!confirm(`هل أنت متأكد من ترحيل السند ${voucher.voucherNumber} وإنشاء قيد اليومية في الأستاذ العام؟`)) {
      return;
    }

    this.isLoading.set(true);
    this.vouchersService.postVoucher(voucher.id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(`تم ترحيل السند ${res.voucherNumber} بنجاح وإنشاء قيد اليومية`);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.loadVouchers();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert('فشل ترحيل السند: ' + (err.error?.description || err.message));
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
      alert('يرجى كتابة سبب الإلغاء');
      return;
    }

    this.isLoading.set(true);
    this.vouchersService.cancelVoucher(v.id, this.cancelReason().trim()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.closeCancelModal();
        this.successMessage.set(`تم إلغاء السند ${res.voucherNumber} وعكس القيد بنجاح`);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.loadVouchers();
      },
      error: (err) => {
        this.isLoading.set(false);
        alert('فشل إلغاء السند: ' + (err.error?.description || err.message));
      }
    });
  }

  // Universal Document Attachments
  showAttachmentsModal = false;
  selectedAttachmentEntityId = '';
  selectedAttachmentTitle = '';

  openAttachments(voucher: VoucherDto) {
    this.selectedAttachmentEntityId = voucher.id;
    const typeLabel = voucher.voucherType === VoucherType.Receipt ? 'سند قبض' : 'سند صرف';
    this.selectedAttachmentTitle = `${typeLabel} رقم: ${voucher.voucherNumber} (${voucher.beneficiaryOrPayerName || ''})`;
    this.showAttachmentsModal = true;
  }
}
