import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InvoicesService, InvoiceDto, InvoiceType, InvoiceStatus, CreateInvoiceRequest } from '../../../core/services/invoices.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import Swal from 'sweetalert2';

interface InvoiceLineFormItem {
  itemName: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  vatPercent: number;
}

@Component({
  selector: 'app-tax-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterModule],
  templateUrl: './tax-invoices.component.html',
  styleUrls: ['./tax-invoices.component.scss']
})
export class TaxInvoicesComponent implements OnInit {
  private router = inject(Router);
  private invoicesService = inject(InvoicesService);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);

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

  // Modals
  showPreviewModal = signal<boolean>(false);
  selectedInvoice = signal<InvoiceDto | null>(null);

  // Enums for template
  InvoiceType = InvoiceType;
  InvoiceStatus = InvoiceStatus;

  // Filtered List
  filteredInvoices = computed(() => {
    let list = this.invoices();
    const q = this.searchQuery().trim().toLowerCase();
    const type = this.selectedType();
    const status = this.selectedStatus();

    if (q) {
      list = list.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.buyerName || inv.customerName || '').toLowerCase().includes(q) ||
        (inv.buyerVatNumber && inv.buyerVatNumber.includes(q))
      );
    }

    if (type !== null) {
      list = list.filter(inv => inv.invoiceType === type);
    }

    if (status !== null) {
      list = list.filter(inv => (inv.invoiceStatus ?? inv.status) === status);
    }

    return list;
  });

  // KPI Metrics
  kpiTotalInvoices = computed(() => this.invoices().length);
  kpiClearedInvoices = computed(() => this.invoices().filter(i => i.invoiceStatus === InvoiceStatus.Cleared || i.invoiceStatus === InvoiceStatus.Reported).length);
  kpiTotalVat = computed(() => this.invoices().reduce((s, i) => s + (i.totalVatAmount || 0), 0));
  kpiGrandTotal = computed(() => this.invoices().reduce((s, i) => s + (i.grandTotal || 0), 0));

  ngOnInit(): void {
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
        this.errorMessage.set('فشل في جلب قائمة الفواتير من الخادم.');
      }
    });
  }

  openCreate(): void {
    this.router.navigate(['/invoicing/tax-invoices/create']);
  }



  issueToZatca(invoice: InvoiceDto, event?: Event): void {
    if (event) event.stopPropagation();

    Swal.fire({
      title: 'اعتماد الفاتورة لدى هيئة الزكاة والضريبة والجمارك (ZATCA)',
      html: `
        <div style="text-align: right; direction: rtl; font-family: Cairo, sans-serif; font-size: 0.95rem; line-height: 1.7;">
          <p>سيتم تنفيذ متطلبات المرحلة الثانية (ZATCA Phase 2):</p>
          <ul style="padding-right: 1.2rem; color: #475569;">
            <li>توليد بصمة التشفير الرقمية (SHA-256 Invoice Hash)</li>
            <li>التوقيع الرقمي بمفتاح ECDSA والتشفير المعياري</li>
            <li>توليد رمز الاستجابة السريعة المشفر بمعيار TLV Base64</li>
            <li>إنشاء ملف XML القياسي المعتمد (UBL 2.1)</li>
            <li>توليد قيد اليومية الآلي في دفتر الأستاذ العام (GL)</li>
          </ul>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '🚀 اعتماد وإرسال لـ ZATCA',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading.set(true);
        this.invoicesService.issueToZatca(invoice.id).subscribe({
          next: (updated) => {
            this.isLoading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'تم اعتماد الفاتورة بنجاح (CLEARED)',
              html: `
                <div style="text-align: right; direction: rtl; font-family: Cairo, sans-serif; font-size: 0.95rem;">
                  <p style="color: #059669; font-weight: 700;">✅ تم إرسال الفاتورة لمنصة فاتورة واعتمادها بنجاح</p>
                  <p style="font-size: 0.85rem; color: #64748b;">حالة الاعتماد: <strong>${updated.zatcaClearanceStatus}</strong></p>
                  <p style="font-size: 0.85rem; color: #64748b;">تم إنشاء القيد المحاسبي آلياً برقم حساب ضريبة المخرجات والعملاء.</p>
                </div>
              `,
              confirmButtonColor: '#059669'
            });
            this.loadInvoices();
          },
          error: (err) => {
            this.isLoading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'فشل الاعتماد',
              text: err.error?.description || 'حدث خطأ أثناء اعتماد الفاتورة لدى الزكاة.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  previewInvoice(invoice: InvoiceDto): void {
    this.selectedInvoice.set(invoice);
    this.showPreviewModal.set(true);
  }

  closePreviewModal(): void {
    this.showPreviewModal.set(false);
    this.selectedInvoice.set(null);
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
          title: 'خطأ في التحميل',
          text: 'لم يتم العثور على ملف XML أو الفاتورة لم تُعتمد بعد.',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  printInvoice(): void {
    window.print();
  }

  getTypeLabel(type: InvoiceType): string {
    switch (type) {
      case InvoiceType.StandardTaxInvoice: return 'فاتورة ضريبية (B2B)';
      case InvoiceType.SimplifiedTaxInvoice: return 'فاتورة ضريبية مبسطة (B2C)';
      default: return 'فاتورة ضريبية';
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
    if (status === undefined || status === null) return 'مسودة';
    switch (status) {
      case InvoiceStatus.Cleared: return 'معتمدة ومطابقة (CLEARED)';
      case InvoiceStatus.Reported: return 'مبلغة لمنصة فاتورة (REPORTED)';
      case InvoiceStatus.Issued: return 'صادرة (ISSUED)';
      case InvoiceStatus.Draft: return 'مسودة (DRAFT)';
      case InvoiceStatus.Rejected: return 'مرفوضة من الزكاة (REJECTED)';
      case InvoiceStatus.Cancelled: return 'ملغاة (CANCELLED)';
      default: return 'غير معروف';
    }
  }
}
