import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { InvoicesService, InvoiceDto, InvoiceType, TransactionType, InvoiceStatus } from '../../../core/services/invoices.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { tafqeet } from '../../../core/utils/tafqeet';
import * as QRCode from 'qrcode';
import Swal from 'sweetalert2';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-invoice-view',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterModule, TranslatePipe],
  templateUrl: './invoice-view.component.html',
  styleUrls: ['./invoice-view.component.scss']
})
export class InvoiceViewComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private invoicesService = inject(InvoicesService);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);

  currentLang = computed(() => this.langService.currentLang());
  invoice = signal<InvoiceDto | null>(null);
  isLoading = signal<boolean>(false);
  printFormat = signal<'a4' | 'thermal'>('a4');
  qrCodeDataUrl = signal<string | null>(null);
  relatedCreditNoteNumbers = signal<string[]>([]);
  calculatedReturnedAmount = signal<number>(0);
  returnedQtyByItem = signal<Map<string, number>>(new Map());

  InvoiceType = InvoiceType;
  TransactionType = TransactionType;
  InvoiceStatus = InvoiceStatus;

  getEffectiveReturnedAmount(inv?: InvoiceDto | null): number {
    if (!inv) return 0;
    return Math.max(inv.returnedAmount || 0, this.calculatedReturnedAmount());
  }

  isFullyReturned(inv?: InvoiceDto | null): boolean {
    if (!inv) return false;
    if (inv.transactionType === TransactionType.CreditNote || (inv.invoiceNumber && inv.invoiceNumber.startsWith('CN-'))) return false;
    const total = inv.grandTotal ?? inv.totalAmount ?? 0;
    const ret = this.getEffectiveReturnedAmount(inv);
    return ret > 0 && (total - ret) <= 0.001;
  }

  isPartiallyReturned(inv?: InvoiceDto | null): boolean {
    if (!inv) return false;
    if (inv.transactionType === TransactionType.CreditNote || (inv.invoiceNumber && inv.invoiceNumber.startsWith('CN-'))) return false;
    const total = inv.grandTotal ?? inv.totalAmount ?? 0;
    const ret = this.getEffectiveReturnedAmount(inv);
    return ret > 0 && (total - ret) > 0.001;
  }

  getNetRemainingAmount(inv?: InvoiceDto | null): number {
    if (!inv) return 0;
    const total = inv.grandTotal ?? inv.totalAmount ?? 0;
    const ret = this.getEffectiveReturnedAmount(inv);
    return Math.max(0, total - ret);
  }

  getItemReturnedQty(item: any): number {
    const map = this.returnedQtyByItem();
    if (!map || map.size === 0) {
      // Fallback: If invoice has only 1 line and returned amount exists
      const inv = this.invoice();
      if (inv && inv.lines && inv.lines.length === 1 && this.isPartiallyReturned(inv)) {
        const lineTotal = (item.totalAmount || item.totalWithVat || (item.quantity * item.unitPrice * 1.15));
        const lineQty = Number(item.quantity) || 1;
        const unitPriceWithVat = lineTotal / lineQty;
        if (unitPriceWithVat > 0) {
          const retQty = Math.round(this.getEffectiveReturnedAmount(inv) / unitPriceWithVat);
          if (retQty > 0) return retQty;
        }
      }
      return 0;
    }

    if (item.itemId && item.itemId !== '00000000-0000-0000-0000-000000000000') {
      const v = map.get(String(item.itemId).toLowerCase());
      if (v !== undefined) return v;
    }
    if (item.itemCode) {
      const v = map.get(String(item.itemCode).trim().toLowerCase());
      if (v !== undefined) return v;
    }
    const nameAr = (item.itemNameAr || item.itemName || '').trim().toLowerCase();
    if (nameAr && map.has(nameAr)) {
      return map.get(nameAr)!;
    }
    const nameEn = (item.itemNameEn || '').trim().toLowerCase();
    if (nameEn && map.has(nameEn)) {
      return map.get(nameEn)!;
    }

    // Fallback: If invoice has only 1 line, attribute any returned qty to this line
    const inv = this.invoice();
    if (inv && inv.lines && inv.lines.length === 1 && this.isPartiallyReturned(inv)) {
      let sum = 0;
      map.forEach(v => sum += v);
      if (sum > 0) return sum;
      const lineTotal = (item.totalAmount || item.totalWithVat || (item.quantity * item.unitPrice * 1.15));
      const lineQty = Number(item.quantity) || 1;
      const unitPriceWithVat = lineTotal / lineQty;
      if (unitPriceWithVat > 0) {
        const retQty = Math.round(this.getEffectiveReturnedAmount(inv) / unitPriceWithVat);
        if (retQty > 0) return retQty;
      }
    }

    return 0;
  }

  tafqeetTotal = computed(() => {
    const inv = this.invoice();
    if (!inv) return '';
    if (this.isPartiallyReturned(inv)) {
      return tafqeet(this.getNetRemainingAmount(inv));
    }
    return tafqeet(inv.grandTotal || inv.totalAmount || 0);
  });

  loadRelatedCreditNotes(inv: InvoiceDto): void {
    if (inv.transactionType === TransactionType.CreditNote || (inv.invoiceNumber && inv.invoiceNumber.startsWith('CN-'))) {
      this.relatedCreditNoteNumbers.set([]);
      this.calculatedReturnedAmount.set(0);
      return;
    }

    this.invoicesService.getInvoices().subscribe({
      next: (list) => {
        const cns = (list || []).filter(c =>
          (c.transactionType === TransactionType.CreditNote || (c.invoiceNumber && c.invoiceNumber.startsWith('CN-'))) &&
          (
            (c.referenceInvoiceId && c.referenceInvoiceId === inv.id) ||
            (c.referenceInvoiceNumber && c.referenceInvoiceNumber.trim().toLowerCase() === inv.invoiceNumber.trim().toLowerCase())
          ) &&
          c.status !== InvoiceStatus.Cancelled &&
          c.invoiceStatus !== InvoiceStatus.Cancelled
        );
        this.relatedCreditNoteNumbers.set(cns.map(c => c.invoiceNumber));

        // Build item returned quantities and cumulative sum
        const qtyMap = new Map<string, number>();
        let totalRet = 0;
        cns.forEach(cn => {
          totalRet += (cn.grandTotal || cn.totalAmount || 0);
          if (cn.lines && cn.lines.length > 0) {
            cn.lines.forEach((l: any) => {
              const qty = Number(l.quantity) || 0;
              if (qty > 0) {
                if (l.itemId && l.itemId !== '00000000-0000-0000-0000-000000000000') {
                  const idKey = String(l.itemId).toLowerCase();
                  qtyMap.set(idKey, (qtyMap.get(idKey) || 0) + qty);
                }
                if (l.itemCode) {
                  const codeKey = String(l.itemCode).trim().toLowerCase();
                  qtyMap.set(codeKey, (qtyMap.get(codeKey) || 0) + qty);
                }
                const nameAr = (l.itemNameAr || l.itemName || '').trim().toLowerCase();
                if (nameAr) {
                  qtyMap.set(nameAr, (qtyMap.get(nameAr) || 0) + qty);
                }
                const nameEn = (l.itemNameEn || '').trim().toLowerCase();
                if (nameEn) {
                  qtyMap.set(nameEn, (qtyMap.get(nameEn) || 0) + qty);
                }
              }
            });
          }
        });
        this.returnedQtyByItem.set(qtyMap);
        if (totalRet > 0) {
          this.calculatedReturnedAmount.set(totalRet);
        }
      },
      error: () => {}
    });
  }

  ngOnInit(): void {
    // 1. Instant hydration from navigation state if available
    const navState = history.state;
    if (navState && navState.invoice) {
      this.invoice.set(navState.invoice);
      this.generateQrCode(navState.invoice);
      this.loadRelatedCreditNotes(navState.invoice);
    }

    // 2. Fetch full invoice from backend by route ID
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'create') {
      this.router.navigate(['/invoicing/tax-invoices/create']);
      return;
    }
    if (id) {
      this.loadInvoice(id);
    } else if (!this.invoice()) {
      this.goBack();
    }
  }

  loadInvoice(id: string): void {
    if (!this.invoice()) {
      this.isLoading.set(true);
    }
    this.invoicesService.getInvoiceById(id).subscribe({
      next: (inv) => {
        this.isLoading.set(false);
        this.invoice.set(inv);
        this.generateQrCode(inv);
        this.loadRelatedCreditNotes(inv);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to load invoice:', err);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('invoices.view.alerts.fetchFailedTitle'),
          text: this.langService.t('invoices.view.alerts.fetchFailedText'),
          confirmButtonColor: '#ef4444'
        }).then(() => this.goBack());
      }
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

  printInvoice(): void {
    if (this.printFormat() === 'thermal') {
      document.body.classList.add('thermal-print-mode');
    } else {
      document.body.classList.remove('thermal-print-mode');
    }

    const cleanup = () => {
      document.body.classList.remove('thermal-print-mode');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
  }

  goBack(): void {
    const inv = this.invoice();
    if (inv) {
      if (this.isCreditNote(inv)) {
        this.router.navigate(['/invoicing/credit-notes']);
        return;
      }
      if (this.isQuotation(inv)) {
        this.router.navigate(['/invoicing/quotations']);
        return;
      }
    }
    this.router.navigate(['/invoicing/tax-invoices']);
  }

  navigateToJournalEntry(entryNumber?: string): void {
    if (!entryNumber) return;
    this.router.navigate(['/accounting/journal-entries'], { queryParams: { search: entryNumber } });
  }

  downloadXml(): void {
    const inv = this.invoice();
    if (!inv) return;

    this.invoicesService.downloadUblXml(inv.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.invoiceNumber}_UBL21.xml`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('invoices.view.alerts.downloadErrorTitle'),
          text: this.langService.t('invoices.view.alerts.xmlNotFoundError'),
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  issueToZatca(): void {
    const inv = this.invoice();
    if (!inv) return;

    const isAr = this.currentLang() === 'ar';
    Swal.fire({
      title: this.langService.t('invoices.view.alerts.zatcaClearanceTitle'),
      html: `
        <div style="text-align: ${isAr ? 'right' : 'left'}; direction: ${isAr ? 'rtl' : 'ltr'}; font-size: 0.95rem; line-height: 1.7;">
          <p>${this.langService.t('invoices.view.alerts.zatcaRequirementsIntro')}</p>
          <ul style="padding-${isAr ? 'right' : 'left'}: 1.2rem; color: #475569;">
            <li>${this.langService.t('invoices.view.alerts.reqHash')}</li>
            <li>${this.langService.t('invoices.view.alerts.reqSign')}</li>
            <li>${this.langService.t('invoices.view.alerts.reqQr')}</li>
            <li>${this.langService.t('invoices.view.alerts.reqXml')}</li>
            <li>${this.langService.t('invoices.view.alerts.reqGl')}</li>
          </ul>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: this.langService.t('invoices.view.alerts.zatcaConfirmBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading.set(true);
        this.invoicesService.issueToZatca(inv.id).subscribe({
          next: (res) => {
            this.isLoading.set(false);
            Swal.fire({
              icon: 'success',
              title: this.langService.t('invoices.view.alerts.zatcaSuccessTitle', { status: res.zatcaClearanceStatus || '' }),
              timer: 2500,
              showConfirmButton: false
            });
            this.loadInvoice(inv.id);
          },
          error: (err) => {
            this.isLoading.set(false);
            Swal.fire({
              icon: 'error',
              title: this.langService.t('invoices.view.alerts.zatcaFailedTitle'),
              text: err.error?.description || err.error?.message || this.langService.t('invoices.view.alerts.zatcaFailedDefault'),
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
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
      return this.langService.t('invoices.view.types.officialQuotation');
    }
    if (inv?.transactionType === TransactionType.CreditNote || inv?.invoiceNumber?.startsWith('CN-')) {
      return this.langService.t('invoices.view.types.approvedCreditNote');
    }
    switch (type) {
      case InvoiceType.StandardTaxInvoice: return this.langService.t('invoices.view.types.standardTaxInvoiceB2B');
      case InvoiceType.SimplifiedTaxInvoice: return this.langService.t('invoices.view.types.simplifiedTaxInvoiceB2C');
      default: return this.langService.t('invoices.view.types.taxInvoice');
    }
  }

  getStatusBadgeClass(status?: InvoiceStatus): string {
    if (status === undefined || status === null) return 'badge-default';
    switch (status) {
      case InvoiceStatus.Cleared:
      case InvoiceStatus.Reported:
        return 'badge-success';
      case InvoiceStatus.Issued:
        return 'badge-info';
      case InvoiceStatus.Draft:
        return 'badge-draft';
      case InvoiceStatus.Rejected:
        return 'badge-danger';
      case InvoiceStatus.Cancelled:
        return 'badge-cancelled';
      default:
        return 'badge-default';
    }
  }

  getStatusLabel(status?: InvoiceStatus): string {
    switch (status) {
      case InvoiceStatus.Cleared:
        return this.langService.t('invoices.view.statuses.cleared');
      case InvoiceStatus.Reported:
        return this.langService.t('invoices.view.statuses.reported');
      case InvoiceStatus.Issued:
        return this.langService.t('invoices.view.statuses.issued');
      case InvoiceStatus.Draft:
        return this.langService.t('invoices.view.statuses.draft');
      case InvoiceStatus.Rejected:
        return this.langService.t('invoices.view.statuses.rejected');
      case InvoiceStatus.Cancelled:
        return this.langService.t('invoices.view.statuses.cancelled');
      default:
        return this.langService.t('invoices.view.statuses.unknown');
    }
  }

  isCashCustomer(inv?: InvoiceDto | null): boolean {
    if (!inv) return true;
    if (inv.isCashCustomer) return true;
    const name = (inv.customerName || inv.buyerName || '').trim().toLowerCase();
    if (!name || name === 'عميل نقدي عام' || name === 'عميل نقدي' || name.includes('نقدي') || name === 'cash customer') {
      return true;
    }
    return false;
  }

  getBuyerName(inv?: InvoiceDto | null): string {
    const fallback = this.langService.t('invoices.table.noCustomer');
    if (!inv) return fallback;
    const name = inv.customerName || inv.buyerName;
    if (!name || name.trim() === '') return fallback;
    return name;
  }

  getBuyerVatNumber(inv?: InvoiceDto | null): string | null {
    if (!inv) return null;
    return inv.customerVatNumber || inv.buyerVatNumber || null;
  }

  getBuyerIdTypeLabel(inv?: InvoiceDto | null): string {
    const type = (inv?.buyerOtherIdType || 'CRN').toUpperCase();
    switch (type) {
      case 'CRN': return this.langService.t('invoices.view.idTypes.crn');
      case '700': return this.langService.t('invoices.view.idTypes.700');
      case 'MOM': return this.langService.t('invoices.view.idTypes.mom');
      case 'MLS': return this.langService.t('invoices.view.idTypes.mls');
      case 'SAG': return this.langService.t('invoices.view.idTypes.sag');
      case 'NAT': return this.langService.t('invoices.view.idTypes.nat');
      case 'IQA': return this.langService.t('invoices.view.idTypes.iqa');
      case 'OTH': return this.langService.t('invoices.view.idTypes.oth');
      default: return this.langService.t('invoices.view.idTypes.default', { type });
    }
  }

  getBuyerIdValue(inv?: InvoiceDto | null): string | null {
    if (!inv) return null;
    return inv.customerCrNumber || inv.buyerCrNumber || inv.buyerOtherIdValue || null;
  }

  getBuildingNumber(inv?: InvoiceDto | null): string {
    if (inv?.buyerBuildingNumber && inv.buyerBuildingNumber.trim()) return inv.buyerBuildingNumber.trim();
    const addr = inv?.customerAddress || inv?.buyerAddress || '';
    const m = addr.match(/مبنى\s*([0-9A-Za-z]+)/);
    if (m && m[1]) return m[1];
    return '1234';
  }

  getStreetName(inv?: InvoiceDto | null): string {
    if (inv?.buyerStreet && inv.buyerStreet.trim()) return inv.buyerStreet.trim();
    const addr = inv?.customerAddress || inv?.buyerAddress || '';
    if (addr.includes('طريق') || addr.includes('شارع')) {
      const parts = addr.split('،');
      for (const p of parts) {
        if (p.includes('طريق') || p.includes('شارع')) return p.trim();
      }
    }
    return 'طريق الملك فهد';
  }

  getDistrict(inv?: InvoiceDto | null): string {
    if (inv?.buyerCitySubdivisionName && inv.buyerCitySubdivisionName.trim()) return inv.buyerCitySubdivisionName.trim();
    if (inv?.buyerDistrict && inv.buyerDistrict.trim()) return inv.buyerDistrict.trim();
    const addr = inv?.customerAddress || inv?.buyerAddress || '';
    if (addr.includes('حي ')) {
      const parts = addr.split('،');
      for (const p of parts) {
        if (p.includes('حي ')) return p.trim();
      }
    }
    return 'حي العليا';
  }

  getCity(inv?: InvoiceDto | null): string {
    if (inv?.buyerCity && inv.buyerCity.trim()) return inv.buyerCity.trim();
    const addr = inv?.customerAddress || inv?.buyerAddress || '';
    const cities = ['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 'الخبر', 'الجبيل', 'الأحساء', 'بريدة', 'خميس مشيط', 'أبها', 'تبوك', 'جازان', 'حائل', 'نجران', 'ينبع', 'الطائف'];
    for (const c of cities) {
      if (addr.includes(c)) return c;
    }
    return 'الرياض';
  }

  getPostalZone(inv?: InvoiceDto | null): string {
    if (inv?.buyerPostalCode && inv.buyerPostalCode.trim()) return inv.buyerPostalCode.trim();
    const addr = inv?.customerAddress || inv?.buyerAddress || '';
    const m = addr.match(/\b([0-9]{5})\b/);
    if (m && m[1]) return m[1];
    return '12211';
  }

  getAdditionalNumber(inv?: InvoiceDto | null): string {
    if (inv?.buyerPlotIdentification && inv.buyerPlotIdentification.trim()) return inv.buyerPlotIdentification.trim();
    return '2134';
  }

  getCountry(inv?: InvoiceDto | null): string {
    const code = inv?.buyerCountryCode || 'SA';
    return (code === 'SA' || code.includes('السعودية')) ? this.langService.t('invoices.view.countrySaudiArabia') : code;
  }

  getPhone(inv?: InvoiceDto | null): string | null {
    return inv?.buyerPhone || null;
  }

  getEmail(inv?: InvoiceDto | null): string | null {
    return inv?.buyerEmail || null;
  }

  getBranchDisplayName(): string {
    return (this.langService.isArabic() ? this.companyContext.activeBranch()?.nameAr : (this.companyContext.activeBranch()?.nameEn || this.companyContext.activeBranch()?.nameAr)) || this.langService.t('invoices.view.defaultMainBranch');
  }

  formatBranchName(): string {
    const raw = (this.langService.isArabic() ? this.companyContext.activeBranch()?.nameAr : (this.companyContext.activeBranch()?.nameEn || this.companyContext.activeBranch()?.nameAr)) || this.langService.t('invoices.view.defaultMainBranch');
    if (raw.startsWith('الفرع ')) {
      return raw.replace('الفرع ', '').trim();
    }
    if (raw.startsWith('فرع ')) {
      return raw.replace('فرع ', '').trim();
    }
    return raw;
  }
}
