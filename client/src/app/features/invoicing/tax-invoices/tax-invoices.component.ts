import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { InvoicesService, InvoiceDto, InvoiceType, TransactionType, InvoiceStatus, InvoicePaymentStatus, CreateInvoiceRequest } from '../../../core/services/invoices.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { tafqeet } from '../../../core/utils/tafqeet';
import { environment } from '../../../../environments/environment';
import * as QRCode from 'qrcode';
import Swal from 'sweetalert2';

export interface PartnerStatementLine {
  id: string;
  date: string;
  documentType: string;
  documentNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PartnerStatement {
  partnerId: string;
  partnerCode: string;
  partnerNameAr: string;
  partnerNameEn: string;
  partnerType: number;
  taxNumber?: string;
  commercialRegistration?: string;
  phone?: string;
  address?: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  closingBalance: number;
  totalTransactions: number;
  lines: PartnerStatementLine[];
}

interface InvoiceLineFormItem {
  itemName: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  vatPercent: number;
}

import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-tax-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterModule, PaginationComponent, TranslatePipe],
  templateUrl: './tax-invoices.component.html',
  styleUrls: ['./tax-invoices.component.scss']
})
export class TaxInvoicesComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private invoicesService = inject(InvoicesService);
  private http = inject(HttpClient);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);
  authService = inject(AuthService);

  // Current Language
  currentLang = computed(() => this.langService.currentLang());

  // Data signals
  invoices = signal<InvoiceDto[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Filters
  searchQuery = signal<string>('');
  selectedType = signal<number | null>(null);
  selectedStatus = signal<number | null>(null);

  // Modals & Print Options
  showPreviewModal = signal<boolean>(false);
  selectedInvoice = signal<InvoiceDto | null>(null);
  printFormat = signal<'a4' | 'thermal'>('a4');
  qrCodeDataUrl = signal<string | null>(null);

  // Tafqeet for amounts
  tafqeetTotal = computed(() => {
    const inv = this.selectedInvoice();
    return inv ? tafqeet(inv.grandTotal || inv.totalAmount || 0) : '';
  });

  // Active Segment Tab
  activeTab = signal<string>('all');

  // Enums for template
  InvoiceType = InvoiceType;
  TransactionType = TransactionType;
  InvoiceStatus = InvoiceStatus;

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Check page mode: Sales Invoices, Credit Notes, or Quotations
  viewMode = computed<'invoices' | 'credit-notes' | 'quotations'>(() => {
    const url = this.router.url;
    if (url.includes('/credit-notes')) return 'credit-notes';
    if (url.includes('/quotations')) return 'quotations';
    return 'invoices';
  });

  isCreditNotesView = computed(() => this.viewMode() === 'credit-notes');
  isQuotationsView = computed(() => this.viewMode() === 'quotations');
  isSalesInvoicesView = computed(() => this.viewMode() === 'invoices');

  pageTitle = computed(() => {
    if (this.isQuotationsView()) {
      return this.langService.t('invoices.quotationsTitle');
    }
    if (this.isCreditNotesView()) {
      return this.langService.t('invoices.creditNotesTitle');
    }
    return this.langService.t('invoices.title');
  });

  pageSubtitle = computed(() => {
    if (this.isQuotationsView()) {
      return this.langService.t('invoices.quotationsSubtitle');
    }
    if (this.isCreditNotesView()) {
      return this.langService.t('invoices.creditNotesSubtitle');
    }
    return this.langService.t('invoices.subtitle');
  });

  setTab(tab: string) {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    if (tab === 'cleared') {
      this.selectedType.set(null);
      this.selectedStatus.set(InvoiceStatus.Cleared);
    } else if (tab === 'draft') {
      this.selectedType.set(null);
      this.selectedStatus.set(InvoiceStatus.Draft);
    } else {
      this.selectedType.set(null);
      this.selectedStatus.set(null);
    }
  }

  // Base list separated strictly between Sales Invoices, Credit Notes, and Quotations
  baseInvoices = computed(() => {
    const list = this.invoices();
    if (this.isQuotationsView()) {
      return list.filter(inv => 
        inv.transactionType === TransactionType.Quotation || 
        inv.invoiceNumber.startsWith('QUO-') || 
        inv.invoiceNumber.startsWith('QUT-')
      );
    }
    if (this.isCreditNotesView()) {
      return list.filter(inv => inv.transactionType === TransactionType.CreditNote || inv.invoiceNumber.startsWith('CN-') || !!inv.referenceInvoiceNumber);
    }
    // Pure Sales Invoices: Exclude credit notes and quotations
    return list.filter(inv => 
      inv.transactionType !== TransactionType.CreditNote && 
      inv.transactionType !== TransactionType.Quotation && 
      !inv.invoiceNumber.startsWith('CN-') &&
      !inv.invoiceNumber.startsWith('QUO-') &&
      !inv.invoiceNumber.startsWith('QUT-')
    );
  });

  // Filtered List
  filteredInvoices = computed(() => {
    let list = this.baseInvoices();
    const q = this.searchQuery().trim().toLowerCase();
    const type = this.selectedType();
    const status = this.selectedStatus();
    const tab = this.activeTab();

    if (tab === 'cleared') {
      list = list.filter(inv => inv.invoiceStatus === InvoiceStatus.Cleared || inv.invoiceStatus === InvoiceStatus.Reported);
    } else if (tab === 'draft') {
      list = list.filter(inv => (inv.invoiceStatus ?? inv.status) === InvoiceStatus.Draft);
    } else if (tab === 'unpaid') {
      list = list.filter(inv => inv.paymentStatus !== InvoicePaymentStatus.Paid);
    }

    if (q) {
      list = list.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.associatedJournalEntryNumber && inv.associatedJournalEntryNumber.toLowerCase().includes(q)) ||
        (inv.referenceInvoiceNumber && inv.referenceInvoiceNumber.toLowerCase().includes(q)) ||
        (inv.buyerName || inv.customerName || '').toLowerCase().includes(q) ||
        (inv.buyerVatNumber && inv.buyerVatNumber.includes(q)) ||
        (inv.salespersonName && inv.salespersonName.toLowerCase().includes(q)) ||
        (inv.createdBy && inv.createdBy.toLowerCase().includes(q))
      );
    }

    if (type !== null && tab === 'all') {
      list = list.filter(inv => inv.invoiceType === type);
    }

    if (status !== null) {
      list = list.filter(inv => (inv.invoiceStatus ?? inv.status) === status);
    }

    return list;
  });

  paginatedInvoices = computed(() => {
    const list = this.filteredInvoices();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  // KPI Metrics based strictly on the current page's base list
  kpiTotalInvoices = computed(() => this.baseInvoices().length);
  kpiClearedInvoices = computed(() => this.baseInvoices().filter(i => i.invoiceStatus === InvoiceStatus.Cleared || i.invoiceStatus === InvoiceStatus.Reported).length);
  kpiTotalVat = computed(() => this.baseInvoices().reduce((s, i) => s + (i.totalVatAmount || 0), 0));
  kpiGrandTotal = computed(() => this.baseInvoices().reduce((s, i) => s + (i.grandTotal || 0), 0));

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'cleared') {
        this.setTab('cleared');
      } else if (params['tab'] === 'draft') {
        this.setTab('draft');
      } else {
        this.setTab('all');
      }
    });
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.invoicesService.getInvoices().subscribe({
      next: (data) => {
        this.invoices.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.langService.t('invoices.taxInvoices.alerts.fetchFailed'));
      }
    });
  }

  createButtonLabel = computed(() => {
    if (this.isQuotationsView()) {
      return this.langService.t('invoices.createQuotation');
    }
    if (this.isCreditNotesView()) {
      return this.langService.t('invoices.createCreditNote');
    }
    return this.langService.t('invoices.createInvoice');
  });

  openCreate(): void {
    if (this.isQuotationsView()) {
      this.router.navigate(['/invoicing/quotations/create']);
    } else if (this.isCreditNotesView()) {
      this.router.navigate(['/invoicing/credit-notes/create']);
    } else {
      this.router.navigate(['/invoicing/tax-invoices/create']);
    }
  }

  createCreditNoteFor(invoice: InvoiceDto, event?: Event): void {
    if (event) event.stopPropagation();
    this.router.navigate(['/invoicing/credit-notes/create'], {
      queryParams: {
        refNum: invoice.invoiceNumber,
        refId: invoice.id
      }
    });
  }

  canCreateReturn(inv: InvoiceDto): boolean {
    if (!this.isSalesInvoicesView()) return false;
    if (inv.transactionType === TransactionType.CreditNote || (inv.invoiceNumber && inv.invoiceNumber.startsWith('CN-'))) return false;
    const isDraft = inv.invoiceStatus === InvoiceStatus.Draft || inv.status === InvoiceStatus.Draft;
    if (isDraft) return false;

    const total = inv.grandTotal ?? inv.totalAmount ?? 0;
    const returned = this.getReturnedAmount(inv);
    return (total - returned) > 0.001;
  }



  issueToZatca(invoice: InvoiceDto, event?: Event): void {
    if (event) event.stopPropagation();

    const isAr = this.currentLang() === 'ar';
    Swal.fire({
      title: this.langService.t('invoices.taxInvoices.alerts.zatcaClearanceTitle'),
      html: `
        <div style="text-align: ${isAr ? 'right' : 'left'}; direction: ${isAr ? 'rtl' : 'ltr'}; font-size: 0.95rem; line-height: 1.7;">
          <p>${this.langService.t('invoices.taxInvoices.alerts.zatcaRequirementsIntro')}</p>
          <ul style="padding-${isAr ? 'right' : 'left'}: 1.2rem; color: #475569;">
            <li>${this.langService.t('invoices.taxInvoices.alerts.reqHash')}</li>
            <li>${this.langService.t('invoices.taxInvoices.alerts.reqSign')}</li>
            <li>${this.langService.t('invoices.taxInvoices.alerts.reqQr')}</li>
            <li>${this.langService.t('invoices.taxInvoices.alerts.reqXml')}</li>
            <li>${this.langService.t('invoices.taxInvoices.alerts.reqGl')}</li>
          </ul>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: this.langService.t('invoices.taxInvoices.alerts.zatcaConfirmBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading.set(true);
        this.invoicesService.issueToZatca(invoice.id).subscribe({
          next: (res) => {
            this.isLoading.set(false);
            const statusLabel = res.zatcaClearanceStatus === 'CLEARED'
              ? this.langService.t('invoices.taxInvoices.statuses.cleared')
              : this.langService.t('invoices.taxInvoices.statuses.reported');
            const warningsHtml = (res.validationWarnings || []).map((w: string) => `<li style="margin-bottom: 4px;">${w}</li>`).join('');

            Swal.fire({
              icon: 'success',
              title: this.langService.t('invoices.taxInvoices.alerts.zatcaSuccessTitle', { status: res.zatcaClearanceStatus || '' }),
              html: `
                <div style="text-align: ${isAr ? 'right' : 'left'}; direction: ${isAr ? 'rtl' : 'ltr'}; font-size: 0.88rem; line-height: 1.6;">
                  <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
                    <p style="color: #065f46; font-weight: 700; margin: 0 0 4px 0;">${this.langService.t('invoices.taxInvoices.alerts.digitalStampText')}</p>
                    <span style="font-size: 0.8rem; color: #047857;">${this.langService.t('invoices.taxInvoices.alerts.integrationStatus')} <strong>${statusLabel}</strong></span>
                  </div>
                  <p style="margin: 4px 0;"><strong>${this.langService.t('invoices.taxInvoices.alerts.invoiceNumber')}</strong> <span style="font-family: monospace;">${res.invoiceNumber}</span></p>
                  <p style="margin: 4px 0;"><strong>${this.langService.t('invoices.taxInvoices.alerts.invoiceHash')}</strong> <code style="font-size: 0.72rem; background: #f1f5f9; padding: 2px 5px; border-radius: 4px;">${res.invoiceHash?.substring(0, 28)}...</code></p>
                  ${res.journalEntryNumber ? `<p style="margin: 4px 0;"><strong>${this.langService.t('invoices.taxInvoices.alerts.linkedGlEntry')}</strong> <span style="color: #0284c7; font-weight: 600;">#${res.journalEntryNumber}</span></p>` : ''}
                  
                  <div style="margin-top: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px;">
                    <strong style="color: #475569; font-size: 0.8rem; display: block; margin-bottom: 4px;">${this.langService.t('invoices.taxInvoices.alerts.checksPassed')}</strong>
                    <ul style="margin: 0; padding-${isAr ? 'right' : 'left'}: 18px; font-size: 0.75rem; color: #166534;">
                      ${warningsHtml}
                    </ul>
                  </div>
                </div>
              `,
              confirmButtonColor: '#059669',
              confirmButtonText: this.langService.t('invoices.taxInvoices.alerts.closeAndContinue')
            });
            this.loadInvoices();
          },
          error: (err) => {
            this.isLoading.set(false);
            Swal.fire({
              icon: 'error',
              title: this.langService.t('invoices.taxInvoices.alerts.zatcaFailedTitle'),
              text: err.error?.description || err.error?.message || this.langService.t('invoices.taxInvoices.alerts.zatcaFailedDefault'),
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  previewInvoice(invoice: InvoiceDto): void {
    this.router.navigate(['/invoicing/view', invoice.id], {
      state: { invoice }
    });
  }

  private generateQrCode(invoice: InvoiceDto): void {
    const payload = invoice.qrCodeBase64 || invoice.qrCodePayload;
    if (payload) {
      QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 220
      }).then(url => {
        this.qrCodeDataUrl.set(url);
      }).catch(err => {
        console.error('Failed to generate ZATCA QR code:', err);
        this.qrCodeDataUrl.set(null);
      });
    } else {
      const draftText = `Al-Roban ERP | Invoice: ${invoice.invoiceNumber} | Total: ${invoice.grandTotal || invoice.totalAmount} SAR | Draft`;
      QRCode.toDataURL(draftText, {
        errorCorrectionLevel: 'L',
        margin: 1,
        width: 220
      }).then(url => {
        this.qrCodeDataUrl.set(url);
      }).catch(() => this.qrCodeDataUrl.set(null));
    }
  }

  setPrintFormat(format: 'a4' | 'thermal'): void {
    this.printFormat.set(format);
  }

  navigateToJournalEntry(entryNumber?: string): void {
    if (!entryNumber) return;
    this.closePreviewModal();
    this.router.navigate(['/accounting/journal-entries'], { queryParams: { search: entryNumber } });
  }

  closePreviewModal(): void {
    this.showPreviewModal.set(false);
    this.selectedInvoice.set(null);
    this.qrCodeDataUrl.set(null);
    this.printFormat.set('a4');
  }

  downloadXml(invoice: InvoiceDto, event?: Event): void {
    if (event) event.stopPropagation();

    this.invoicesService.downloadUblXml(invoice.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoiceNumber}_UBL21.xml`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('invoices.taxInvoices.alerts.downloadErrorTitle'),
          text: this.langService.t('invoices.taxInvoices.alerts.xmlNotFoundError'),
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  printInvoice(): void {
    window.print();
  }

  isCreditNote(inv?: InvoiceDto | null): boolean {
    if (!inv) return false;
    return inv.transactionType === TransactionType.CreditNote || 
           inv.invoiceNumber?.startsWith('CN-') === true || 
           !!inv.referenceInvoiceNumber;
  }

  isQuotation(inv?: InvoiceDto | null): boolean {
    if (!inv) return false;
    return inv.invoiceNumber?.startsWith('QUO-') === true || 
           inv.invoiceNumber?.startsWith('QUT-') === true;
  }

  getFormattedIssueDateTime(invoice?: InvoiceDto | null): string {
    if (!invoice) return '';
    let datePart = '';
    if (invoice.issueDate) {
      const d = new Date(invoice.issueDate);
      if (!isNaN(d.getTime())) {
        datePart = d.toISOString().split('T')[0];
      } else {
        datePart = String(invoice.issueDate).split('T')[0];
      }
    }
    let timePart = invoice.issueTime || '';
    if (timePart.includes('.')) {
      timePart = timePart.split('.')[0];
    }
    if (timePart) {
      const parts = timePart.split(':');
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? this.langService.t('common.pm') : this.langService.t('common.am');
        hours = hours % 12 || 12;
        timePart = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
      }
    }
    return datePart && timePart ? `${datePart} | ${timePart}` : (datePart || timePart);
  }

  getTypeLabel(type: InvoiceType, inv?: InvoiceDto): string {
    if (inv?.invoiceNumber?.startsWith('QUO-') || inv?.invoiceNumber?.startsWith('QUT-')) {
      return this.langService.t('invoices.taxInvoices.types.quotation');
    }
    if (inv?.transactionType === TransactionType.CreditNote || inv?.invoiceNumber?.startsWith('CN-')) {
      return this.langService.t('invoices.taxInvoices.types.creditNote');
    }
    switch (type) {
      case InvoiceType.StandardTaxInvoice: return this.langService.t('invoices.taxInvoices.types.standardTaxInvoice');
      case InvoiceType.SimplifiedTaxInvoice: return this.langService.t('invoices.taxInvoices.types.simplifiedTaxInvoice');
      default: return this.langService.t('invoices.taxInvoices.types.taxInvoice');
    }
  }

  getStatusBadgeClass(status?: InvoiceStatus): string {
    if (status === undefined || status === null) return 'badge-default';
    switch (status) {
      case InvoiceStatus.Cleared:
      case InvoiceStatus.Reported:
        return 'badge-cleared';
      case InvoiceStatus.Issued:
        return 'badge-issued';
      case InvoiceStatus.Draft:
        return 'badge-draft';
      case InvoiceStatus.Rejected:
        return 'badge-rejected';
      default:
        return 'badge-default';
    }
  }

  getStatusLabel(status?: InvoiceStatus): string {
    if (status === undefined || status === null) return this.langService.t('invoices.taxInvoices.statuses.draft');
    switch (status) {
      case InvoiceStatus.Cleared: return this.langService.t('invoices.taxInvoices.statuses.cleared');
      case InvoiceStatus.Reported: return this.langService.t('invoices.taxInvoices.statuses.reported');
      case InvoiceStatus.Issued: return this.langService.t('invoices.taxInvoices.statuses.issued');
      case InvoiceStatus.Draft: return this.langService.t('invoices.taxInvoices.statuses.draft');
      case InvoiceStatus.Rejected: return this.langService.t('invoices.taxInvoices.statuses.rejected');
      case InvoiceStatus.Cancelled: return this.langService.t('invoices.taxInvoices.statuses.cancelled');
      default: return this.langService.t('invoices.taxInvoices.statuses.unknown');
    }
  }

  // --- Invoice Payment Allocation (Collection / Payment of Tax Invoices) ---
  InvoicePaymentStatus = InvoicePaymentStatus;

  showPaymentModal = signal<boolean>(false);
  paymentInvoice = signal<InvoiceDto | null>(null);
  paymentAmount = signal<number>(0);
  paymentMethod = signal<'Bank' | 'Cash'>('Cash');
  paymentDate = signal<string>(new Date().toISOString().substring(0, 10));
  paymentReference = signal<string>('');
  paymentNotes = signal<string>('');
  isProcessingPayment = signal<boolean>(false);

  openPaymentModal(inv: InvoiceDto, event?: Event): void {
    if (event) event.stopPropagation();
    const remaining = this.getRemainingAmount(inv);
    this.paymentInvoice.set(inv);
    this.paymentAmount.set(remaining);
    this.paymentMethod.set('Cash');
    this.paymentDate.set(new Date().toISOString().substring(0, 10));
    this.paymentReference.set('');
    this.paymentNotes.set('');
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.paymentInvoice.set(null);
  }

  submitPayment(): void {
    const inv = this.paymentInvoice();
    if (!inv) return;
    const amt = this.paymentAmount();
    if (amt <= 0) {
      Swal.fire({ icon: 'warning', title: this.langService.t('common.warning'), text: this.langService.t('invoices.taxInvoices.alerts.invalidPaymentAmount'), confirmButtonColor: '#059669' });
      return;
    }

    this.isProcessingPayment.set(true);
    this.invoicesService.payInvoice(inv.id, {
      amount: amt,
      paymentDate: new Date(this.paymentDate()).toISOString(),
      paymentMethod: this.paymentMethod(),
      referenceNumber: this.paymentReference().trim() || undefined,
      notes: this.paymentNotes().trim() || undefined
    }).subscribe({
      next: (res) => {
        this.isProcessingPayment.set(false);
        this.closePaymentModal();
        Swal.fire({
          icon: 'success',
          title: this.langService.t('invoices.taxInvoices.alerts.paymentSuccessTitle'),
          text: this.langService.t('invoices.taxInvoices.alerts.paymentSuccessText', { amt }),
          confirmButtonColor: '#059669'
        });
        this.loadInvoices();
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('invoices.taxInvoices.alerts.paymentFailedTitle'),
          text: err.error?.description || this.langService.t('invoices.taxInvoices.alerts.paymentFailedDefault'),
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  getPaymentStatusInfo(inv: InvoiceDto): { label: string; badgeClass: string } {
    const isCreditNote = inv.transactionType === TransactionType.CreditNote || (inv.invoiceNumber && inv.invoiceNumber.startsWith('CN-'));
    if (isCreditNote) {
      return {
        label: this.langService.t('invoices.taxInvoices.paymentStatuses.creditedSettled'),
        badgeClass: 'pay-badge-paid'
      };
    }

    const rem = this.getRemainingAmount(inv);
    const returned = this.getReturnedAmount(inv);
    const paid = inv.paidAmount ?? 0;
    const total = inv.grandTotal ?? inv.totalAmount ?? 0;

    if (rem <= 0.001) {
      if (returned >= total && total > 0) {
        return {
          label: this.langService.t('invoices.taxInvoices.paymentStatuses.fullyRefunded'),
          badgeClass: 'pay-badge-refunded'
        };
      }
      return {
        label: this.langService.t('invoices.taxInvoices.paymentStatuses.paidInFull'),
        badgeClass: 'pay-badge-paid'
      };
    }

    if (returned > 0) {
      return {
        label: this.langService.t('invoices.taxInvoices.paymentStatuses.partiallyReturned'),
        badgeClass: 'pay-badge-returned-partial'
      };
    }

    if (paid > 0) {
      return {
        label: this.langService.t('invoices.taxInvoices.paymentStatuses.partiallyPaid'),
        badgeClass: 'pay-badge-partial'
      };
    }

    return {
      label: this.langService.t('invoices.taxInvoices.paymentStatuses.unpaid'),
      badgeClass: 'pay-badge-unpaid'
    };
  }

  getPaymentBadgeClass(inv: InvoiceDto): string {
    const isCreditNote = inv.transactionType === TransactionType.CreditNote || (inv.invoiceNumber && inv.invoiceNumber.startsWith('CN-'));
    if (isCreditNote) return 'payment-badge-paid';

    const rem = this.getRemainingAmount(inv);
    if (rem <= 0.001) return 'payment-badge-paid';
    const paidOrReturned = (inv.paidAmount ?? 0) + this.getReturnedAmount(inv);
    if (paidOrReturned > 0) return 'payment-badge-partial';
    return 'payment-badge-unpaid';
  }

  getReturnedAmount(inv: InvoiceDto): number {
    const isCreditNote = inv.transactionType === TransactionType.CreditNote || (inv.invoiceNumber && inv.invoiceNumber.startsWith('CN-'));
    if (isCreditNote) return 0;

    if (inv.returnedAmount !== undefined && inv.returnedAmount > 0) {
      return inv.returnedAmount;
    }
    // Calculate from loaded credit notes in memory
    const cns = this.invoices().filter(i => 
      (i.transactionType === TransactionType.CreditNote || i.invoiceNumber.startsWith('CN-')) &&
      (i.referenceInvoiceNumber === inv.invoiceNumber || (inv.id && i.referenceInvoiceId === inv.id)) &&
      i.invoiceStatus !== InvoiceStatus.Cancelled &&
      i.status !== InvoiceStatus.Cancelled
    );
    return cns.reduce((sum, cn) => sum + (cn.grandTotal || cn.totalAmount || 0), 0);
  }

  getRemainingAmount(inv: InvoiceDto): number {
    const isCreditNote = inv.transactionType === TransactionType.CreditNote || (inv.invoiceNumber && inv.invoiceNumber.startsWith('CN-'));
    if (isCreditNote) return 0;

    const total = inv.grandTotal ?? inv.totalAmount ?? 0;
    const paid = inv.paidAmount ?? 0;
    const returned = this.getReturnedAmount(inv);
    const net = Math.max(0, total - paid - returned);
    if (inv.remainingAmount !== undefined && inv.remainingAmount !== null) {
      return Math.min(inv.remainingAmount, net);
    }
    return net;
  }

  canReceivePayment(inv: InvoiceDto): boolean {
    const isCreditNote = inv.transactionType === TransactionType.CreditNote || (inv.invoiceNumber && inv.invoiceNumber.startsWith('CN-'));
    if (isCreditNote) return false;

    const isDraft = inv.invoiceStatus === InvoiceStatus.Draft || inv.status === InvoiceStatus.Draft;
    if (isDraft) return false;
    return this.getRemainingAmount(inv) > 0.001;
  }
}

