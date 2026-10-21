import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './tax-invoices.component.html',
  styleUrls: ['./tax-invoices.component.scss']
})
export class TaxInvoicesComponent implements OnInit {
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
  showCreateModal = signal<boolean>(false);
  showPreviewModal = signal<boolean>(false);
  selectedInvoice = signal<InvoiceDto | null>(null);

  // Enums for template
  InvoiceType = InvoiceType;
  InvoiceStatus = InvoiceStatus;

  // New Invoice Form
  newInvoice = signal({
    invoiceNumber: '',
    invoiceType: InvoiceType.StandardTaxInvoice,
    issueDate: new Date().toISOString().substring(0, 10),
    supplyDate: new Date().toISOString().substring(0, 10),
    buyerName: '',
    buyerVatNumber: '',
    buyerNationalId: '',
    buyerStreet: '',
    buyerBuildingNumber: '',
    buyerCity: 'الرياض',
    buyerPostalCode: '',
    buyerDistrict: '',
    buyerCountryCode: 'SA',
    paymentMeansCode: '10', // 10 = نقدي Cash
    notes: 'شكراً لتعاملكم معنا'
  });

  lineItems = signal<InvoiceLineFormItem[]>([
    {
      itemName: 'خدمات استشارية مالية ومحاسبية',
      itemCode: 'SRV-01',
      quantity: 1,
      unitPrice: 5000,
      discountAmount: 0,
      vatPercent: 15
    }
  ]);

  // Form Computations
  formSubtotal = computed(() => {
    return this.lineItems().reduce((sum, item) => sum + (item.quantity * item.unitPrice - (item.discountAmount || 0)), 0);
  });

  formVatTotal = computed(() => {
    return this.lineItems().reduce((sum, item) => {
      const net = (item.quantity * item.unitPrice - (item.discountAmount || 0));
      return sum + (net * (item.vatPercent / 100));
    }, 0);
  });

  formGrandTotal = computed(() => {
    return this.formSubtotal() + this.formVatTotal();
  });

  // Filtered List
  filteredInvoices = computed(() => {
    let list = this.invoices();
    const q = this.searchQuery().trim().toLowerCase();
    const type = this.selectedType();
    const status = this.selectedStatus();

    if (q) {
      list = list.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.buyerName.toLowerCase().includes(q) ||
        (inv.buyerVatNumber && inv.buyerVatNumber.includes(q))
      );
    }

    if (type !== null) {
      list = list.filter(inv => inv.invoiceType === type);
    }

    if (status !== null) {
      list = list.filter(inv => inv.invoiceStatus === status);
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
    // Generate next invoice number
    const nextSeq = this.invoices().length + 1;
    const invNum = `INV-${new Date().getFullYear()}-${nextSeq.toString().padStart(4, '0')}`;

    this.newInvoice.set({
      invoiceNumber: invNum,
      invoiceType: InvoiceType.StandardTaxInvoice,
      issueDate: new Date().toISOString().substring(0, 10),
      supplyDate: new Date().toISOString().substring(0, 10),
      buyerName: '',
      buyerVatNumber: '',
      buyerNationalId: '',
      buyerStreet: '',
      buyerBuildingNumber: '',
      buyerCity: 'الرياض',
      buyerPostalCode: '',
      buyerDistrict: '',
      buyerCountryCode: 'SA',
      paymentMeansCode: '10',
      notes: 'خاضعة لضريبة القيمة المضافة بنسبة 15% - معتمدة لدى هيئة الزكاة والضريبة والجمارك'
    });

    this.lineItems.set([
      {
        itemName: 'استشارات وتطوير أنظمة سحابية',
        itemCode: 'IT-001',
        quantity: 1,
        unitPrice: 10000,
        discountAmount: 0,
        vatPercent: 15
      }
    ]);

    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  addLineItem(): void {
    this.lineItems.update(items => [
      ...items,
      {
        itemName: '',
        itemCode: '',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        vatPercent: 15
      }
    ]);
  }

  removeLineItem(index: number): void {
    if (this.lineItems().length <= 1) return;
    this.lineItems.update(items => items.filter((_, i) => i !== index));
  }

  saveInvoice(): void {
    const inv = this.newInvoice();
    if (!inv.buyerName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'بيانات غير مكتملة',
        text: 'يرجى إدخال اسم العميل / المشتري.',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    if (this.lineItems().length === 0 || this.lineItems().some(l => !l.itemName.trim() || l.unitPrice <= 0)) {
      Swal.fire({
        icon: 'warning',
        title: 'بنود الفاتورة',
        text: 'يرجى إدخال بند واحد على الأقل مع اسم وسعر صحيح.',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    this.isSubmitting.set(true);

    const payload: CreateInvoiceRequest = {
      invoiceNumber: inv.invoiceNumber,
      invoiceType: inv.invoiceType,
      issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString() : undefined,
      supplyDate: inv.supplyDate ? new Date(inv.supplyDate).toISOString() : undefined,
      buyerName: inv.buyerName,
      buyerVatNumber: inv.buyerVatNumber || undefined,
      buyerNationalId: inv.buyerNationalId || undefined,
      buyerStreet: inv.buyerStreet || undefined,
      buyerBuildingNumber: inv.buyerBuildingNumber || undefined,
      buyerCity: inv.buyerCity || undefined,
      buyerPostalCode: inv.buyerPostalCode || undefined,
      buyerDistrict: inv.buyerDistrict || undefined,
      buyerCountryCode: inv.buyerCountryCode || 'SA',
      paymentMeansCode: inv.paymentMeansCode,
      notes: inv.notes,
      lines: this.lineItems().map(l => ({
        itemName: l.itemName,
        itemCode: l.itemCode || undefined,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount || 0,
        vatPercent: l.vatPercent || 15,
        vatCategory: 'S'
      }))
    };

    this.invoicesService.createInvoice(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.showCreateModal.set(false);
        Swal.fire({
          icon: 'success',
          title: 'تم حفظ الفاتورة بنجاح',
          text: `تم إنشاء الفاتورة رقم ${created.invoiceNumber} كمسودة جاهزة للاعتماد والربط مع زاتكا.`,
          confirmButtonColor: '#10b981'
        });
        this.loadInvoices();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'error',
          title: 'فشل الحفظ',
          text: err.error?.description || 'حدث خطأ أثناء حفظ الفاتورة.',
          confirmButtonColor: '#ef4444'
        });
      }
    });
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
      case InvoiceType.DebitNote: return 'إشعار مدين (Debit Note)';
      case InvoiceType.CreditNote: return 'إشعار دائن (Credit Note)';
      default: return 'فاتورة';
    }
  }

  getStatusBadgeClass(status: InvoiceStatus): string {
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

  getStatusLabel(status: InvoiceStatus): string {
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
