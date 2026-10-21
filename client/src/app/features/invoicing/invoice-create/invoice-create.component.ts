import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { InvoicesService, InvoiceType, TransactionType, InvoiceStatus, CreateInvoiceRequest } from '../../../core/services/invoices.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import Swal from 'sweetalert2';

export interface InvoiceLineFormItem {
  itemNameAr: string;
  itemNameEn: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  vatCategory: string;
}

export interface PartnerOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  taxNumber?: string;
  commercialRegistration?: string;
  otherIdType?: string;
  otherIdValue?: string;
  streetName?: string;
  buildingNumber?: string;
  plotIdentification?: string;
  citySubdivisionName?: string;
  cityName?: string;
  postalZone?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
}

@Component({
  selector: 'app-invoice-create',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule],
  templateUrl: './invoice-create.component.html',
  styleUrls: ['./invoice-create.component.scss']
})
export class InvoiceCreateComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private invoicesService = inject(InvoicesService);
  public companyContext = inject(CompanyContextService);
  public langService = inject(LanguageService);

  InvoiceType = InvoiceType;
  TransactionType = TransactionType;

  // Loading & Submission State
  isSubmitting = signal<boolean>(false);
  isLoadingPartners = signal<boolean>(false);
  partners = signal<PartnerOption[]>([]);
  selectedPartnerId = signal<string>('');
  isCashCustomer = signal<boolean>(false);
  showEditCustomerOverride = signal<boolean>(false);
  showPreviewModal = signal<boolean>(false);

  // Invoice Header Signals
  invoiceType = signal<InvoiceType>(InvoiceType.StandardTaxInvoice);
  transactionType = signal<TransactionType>(TransactionType.Invoice);
  invoiceNumber = signal<string>('');
  issueDate = signal<string>(new Date().toISOString().substring(0, 10));
  supplyDate = signal<string>(new Date().toISOString().substring(0, 10));
  paymentMeansCode = signal<string>('10'); // 10 = نقدي, 30 = تحويل بنكي, 48 = مدى
  currency = signal<string>('SAR');
  notes = signal<string>('خاضعة لضريبة القيمة المضافة بنسبة 15% - معتمدة لدى هيئة الزكاة والضريبة والجمارك (ZATCA)');

  // Buyer / Customer Signals (Loaded from selected partner or cash customer)
  buyerName = signal<string>('');
  buyerNameEn = signal<string>('');
  buyerVatNumber = signal<string>('');
  buyerOtherIdType = signal<string>('CRN');
  buyerOtherIdValue = signal<string>('');
  buyerPhone = signal<string>('');
  buyerEmail = signal<string>('');

  // Saudi National Address Signals
  buyerStreet = signal<string>('');
  buyerBuildingNumber = signal<string>('');
  buyerPlotIdentification = signal<string>('');
  buyerCitySubdivisionName = signal<string>('');
  buyerCity = signal<string>('الرياض');
  buyerPostalCode = signal<string>('');
  buyerCountryCode = signal<string>('SA');

  saudiCities = [
    'الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة',
    'الخبر', 'الأحساء', 'الظهران', 'القصيم (بريدة)', 'عنيزة',
    'تبوك', 'حائل', 'خميس مشيط', 'أبها', 'نجران', 'جازان',
    'ينبع', 'الجبيل', 'الطائف', 'حفر الباطن'
  ];

  // Invoice Line Items
  lineItems = signal<InvoiceLineFormItem[]>([
    {
      itemNameAr: 'خدمات استشارية مالية وتطوير أنظمة سحابية',
      itemNameEn: 'Financial Consulting & Cloud ERP Services',
      itemCode: 'SRV-101',
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      vatRate: 15,
      vatCategory: 'S'
    }
  ]);

  // Selected Partner Object
  selectedPartner = computed(() => {
    const id = this.selectedPartnerId();
    if (!id) return null;
    return this.partners().find(p => p.id === id) || null;
  });

  // Partner ZATCA readiness check
  isPartnerZatcaReady = computed(() => {
    const p = this.selectedPartner();
    if (!p) return false;
    const vat = (p.taxNumber || '').trim();
    const is15Vat = /^\d{15}$/.test(vat) && vat.startsWith('3') && vat.endsWith('3');
    const hasCr = !!(p.commercialRegistration || p.otherIdValue);
    const hasStreet = !!(p.streetName && p.streetName.trim().length >= 3);
    const hasCity = !!p.cityName;
    return is15Vat && hasCr && hasStreet && hasCity;
  });

  // Computed: Line Item Computations
  lineComputations = computed(() => {
    return this.lineItems().map(line => {
      const subtotal = Math.round((line.quantity * line.unitPrice) * 100) / 100;
      const taxable = Math.max(0, subtotal - (line.discount || 0));
      const vat = Math.round((taxable * (line.vatRate / 100)) * 100) / 100;
      const total = taxable + vat;
      return { subtotal, taxable, vat, total };
    });
  });

  // Computed: Financial Totals
  subtotal = computed(() => {
    return this.lineComputations().reduce((acc, curr) => acc + curr.subtotal, 0);
  });

  totalDiscount = computed(() => {
    return this.lineItems().reduce((acc, curr) => acc + (curr.discount || 0), 0);
  });

  totalTaxableAmount = computed(() => {
    return this.lineComputations().reduce((acc, curr) => acc + curr.taxable, 0);
  });

  totalVatAmount = computed(() => {
    return this.lineComputations().reduce((acc, curr) => acc + curr.vat, 0);
  });

  grandTotal = computed(() => {
    return this.lineComputations().reduce((acc, curr) => acc + curr.total, 0);
  });

  amountInWordsAr = computed(() => {
    return this.tafqeet(this.grandTotal());
  });

  vatValidation = computed(() => {
    const raw = this.buyerVatNumber().trim();
    if (!raw) {
      const isStandard = this.invoiceType() === InvoiceType.StandardTaxInvoice;
      return {
        isValid: !isStandard,
        isEmpty: true,
        message: isStandard ? 'الرقم الضريبي مطلوب للفواتير الضريبية (B2B)' : 'غير مطلوب للفاتورة المبسطة (B2C)'
      };
    }
    const is15Digits = /^\d{15}$/.test(raw);
    const startsWith3 = raw.startsWith('3');
    const endsWith3 = raw.endsWith('3');
    const isValid = is15Digits && startsWith3 && endsWith3;

    return {
      isValid,
      isEmpty: false,
      message: isValid ? 'الرقم الضريبي متوافق مع هيئة الزكاة (ZATCA)' : 'يجب أن يكون 15 رقماً ويبدأ وينتهي بـ 3'
    };
  });

  zatcaChecklist = computed(() => {
    const isStandard = this.invoiceType() === InvoiceType.StandardTaxInvoice;
    const isCash = this.isCashCustomer();
    const hasLines = this.lineItems().length > 0 && this.lineItems().every(l => l.itemNameAr.trim() && l.unitPrice > 0);

    if (!isStandard || isCash) {
      // Simplified Invoice (B2C)
      const items = [
        { label: 'نوع الفاتورة: ضريبية مبسطة (B2C)', ok: true, mandatory: true },
        { label: 'العميل: مبيعات نقدية / عامة', ok: true, mandatory: true },
        { label: 'بنود الفاتورة والأسعار والضريبة', ok: hasLines, mandatory: true },
        { label: 'حساب ضريبة القيمة المضافة 15%', ok: this.totalVatAmount() >= 0, mandatory: true },
        { label: 'رمز الاستجابة السريعة (QR TLV)', ok: true, mandatory: true }
      ];
      const passedCount = items.filter(i => i.ok).length;
      return {
        items,
        score: Math.round((passedCount / items.length) * 100),
        isFullyCompliant: hasLines
      };
    }

    // Standard Invoice (B2B)
    const hasPartner = !!this.selectedPartnerId() || this.buyerName().trim().length >= 3;
    const vatOk = this.vatValidation().isValid;
    const hasCr = this.buyerOtherIdValue().trim().length >= 3;
    const hasStreet = this.buyerStreet().trim().length >= 3;
    const bldOk = /^\d{4}$/.test(this.buyerBuildingNumber().trim());
    const hasDistrict = this.buyerCitySubdivisionName().trim().length >= 2;
    const hasCity = this.buyerCity().trim().length >= 2;
    const postOk = /^\d{5}$/.test(this.buyerPostalCode().trim());

    const items = [
      { label: 'الاسم القانوني للعميل (المشتري)', ok: hasPartner, mandatory: true },
      { label: 'الرقم الضريبي للمشتري (15 رقماً)', ok: vatOk, mandatory: true },
      { label: 'السجل التجاري أو الرقم الموحد 700', ok: hasCr, mandatory: true },
      { label: 'اسم الشارع بالعنوان الوطني', ok: hasStreet, mandatory: true },
      { label: 'رقم المبنى بالعنوان الوطني (4 أرقام)', ok: bldOk, mandatory: true },
      { label: 'اسم الحي والمدينة التابعة للمنشأة', ok: hasDistrict && hasCity, mandatory: true },
      { label: 'الرمز البريدي (5 أرقام)', ok: postOk, mandatory: true },
      { label: 'بنود الفاتورة واحتساب الضريبة 15%', ok: hasLines, mandatory: true }
    ];

    const passedCount = items.filter(i => i.ok).length;
    const isFullyCompliant = hasPartner && vatOk && hasCr && hasStreet && bldOk && hasDistrict && hasCity && postOk && hasLines;

    return {
      items,
      score: Math.round((passedCount / items.length) * 100),
      isFullyCompliant
    };
  });

  ngOnInit(): void {
    this.generateInvoiceNumber();
    this.loadPartners();
  }

  generateInvoiceNumber(): void {
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    this.invoiceNumber.set(`INV-${year}-${randomSeq}`);
  }

  loadPartners(): void {
    this.isLoadingPartners.set(true);
    this.http.get<any[]>('/api/partners').subscribe({
      next: (list) => {
        this.isLoadingPartners.set(false);
        const mapped: PartnerOption[] = (list || []).map(p => ({
          id: p.id,
          code: p.code,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          taxNumber: p.taxNumber,
          commercialRegistration: p.commercialRegistration,
          otherIdType: p.otherIdType || 'CRN',
          otherIdValue: p.otherIdValue || p.commercialRegistration,
          streetName: p.streetName,
          buildingNumber: p.buildingNumber,
          plotIdentification: p.plotIdentification,
          citySubdivisionName: p.citySubdivisionName,
          cityName: p.cityName || 'الرياض',
          postalZone: p.postalZone,
          countryCode: p.countryCode || 'SA',
          phone: p.phone,
          email: p.email
        }));
        this.partners.set(mapped);

        // Auto-select first partner with complete data if none selected
        if (!this.selectedPartnerId() && mapped.length > 0) {
          const defaultPartner = mapped.find(p => p.taxNumber && p.streetName) || mapped[0];
          this.onPartnerSelected(defaultPartner.id);
        }
      },
      error: () => {
        this.isLoadingPartners.set(false);
      }
    });
  }

  onPartnerSelected(partnerId: string): void {
    this.selectedPartnerId.set(partnerId);
    this.isCashCustomer.set(false);
    this.showEditCustomerOverride.set(false);

    if (!partnerId) {
      this.clearBuyerFields();
      return;
    }

    const partner = this.partners().find(p => p.id === partnerId);
    if (!partner) return;

    this.buyerName.set(partner.nameAr);
    this.buyerNameEn.set(partner.nameEn || '');
    this.buyerVatNumber.set(partner.taxNumber || '');
    this.buyerOtherIdType.set(partner.otherIdType || 'CRN');
    this.buyerOtherIdValue.set(partner.otherIdValue || partner.commercialRegistration || '');
    this.buyerPhone.set(partner.phone || '');
    this.buyerEmail.set(partner.email || '');

    // National Address
    this.buyerStreet.set(partner.streetName || '');
    this.buyerBuildingNumber.set(partner.buildingNumber || '');
    this.buyerPlotIdentification.set(partner.plotIdentification || '');
    this.buyerCitySubdivisionName.set(partner.citySubdivisionName || '');
    this.buyerCity.set(partner.cityName || 'الرياض');
    this.buyerPostalCode.set(partner.postalZone || '');
    this.buyerCountryCode.set(partner.countryCode || 'SA');
  }

  selectCashCustomer(): void {
    this.isCashCustomer.set(true);
    this.selectedPartnerId.set('');
    this.showEditCustomerOverride.set(false);
    this.invoiceType.set(InvoiceType.SimplifiedTaxInvoice);
    this.buyerName.set('عميل نقدي عام (Cash / Walk-in Customer)');
    this.buyerNameEn.set('Cash Customer');
    this.buyerVatNumber.set('');
    this.buyerOtherIdType.set('');
    this.buyerOtherIdValue.set('');
    this.buyerStreet.set('');
    this.buyerBuildingNumber.set('');
    this.buyerPlotIdentification.set('');
    this.buyerCitySubdivisionName.set('');
    this.buyerCity.set('الرياض');
    this.buyerPostalCode.set('');
    this.buyerCountryCode.set('SA');
    this.buyerPhone.set('');
    this.buyerEmail.set('');
  }

  clearPartner(): void {
    this.selectedPartnerId.set('');
    this.isCashCustomer.set(false);
    this.showEditCustomerOverride.set(false);
    this.clearBuyerFields();
  }

  private clearBuyerFields(): void {
    this.buyerName.set('');
    this.buyerNameEn.set('');
    this.buyerVatNumber.set('');
    this.buyerOtherIdValue.set('');
    this.buyerStreet.set('');
    this.buyerBuildingNumber.set('');
    this.buyerPlotIdentification.set('');
    this.buyerCitySubdivisionName.set('');
    this.buyerPostalCode.set('');
    this.buyerPhone.set('');
    this.buyerEmail.set('');
  }

  setInvoiceType(type: InvoiceType): void {
    this.invoiceType.set(type);
    if (type === InvoiceType.StandardTaxInvoice && this.isCashCustomer()) {
      // Prompt user to select a registered company partner
      this.isCashCustomer.set(false);
      if (this.partners().length > 0) {
        this.onPartnerSelected(this.partners()[0].id);
      }
    }
  }

  setPaymentMeans(code: string): void {
    this.paymentMeansCode.set(code);
  }

  addLineItem(): void {
    this.lineItems.update(items => [
      ...items,
      {
        itemNameAr: '',
        itemNameEn: '',
        itemCode: `ITM-0${items.length + 1}`,
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        vatRate: 15,
        vatCategory: 'S'
      }
    ]);
  }

  removeLineItem(index: number): void {
    if (this.lineItems().length <= 1) return;
    this.lineItems.update(items => items.filter((_, i) => i !== index));
  }

  updateLine(index: number, field: keyof InvoiceLineFormItem, value: any): void {
    this.lineItems.update(items => {
      const copy = [...items];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  saveInvoice(autoIssue: boolean = false): void {
    const bName = this.buyerName().trim();
    if (!bName) {
      Swal.fire({
        icon: 'warning',
        title: 'العميل مطلوب',
        text: 'يرجى اختيار العميل من القائمة أو اختيار مبيعات نقدية.',
        confirmButtonColor: '#059669'
      });
      return;
    }

    if (this.lineItems().length === 0 || this.lineItems().some(l => !l.itemNameAr.trim() || l.unitPrice <= 0)) {
      Swal.fire({
        icon: 'warning',
        title: 'بيانات البنود غير مكتملة',
        text: 'يرجى إدخال وصف وسعر صحيح لجميع بنود الفاتورة.',
        confirmButtonColor: '#059669'
      });
      return;
    }

    const zatca = this.zatcaChecklist();
    if (autoIssue && !zatca.isFullyCompliant) {
      Swal.fire({
        title: 'تنبيه ZATCA: متطلبات الفاتورة غير مكتملة',
        html: `
          <div style="text-align: right; direction: rtl; font-size: 0.85rem; line-height: 1.6; color: #475569;">
            <p style="font-weight: 700; color: #b45309; margin-bottom: 0.5rem;">
              ⚠️ لن تقبل هيئة الزكاة والضريبة هذه الفاتورة الضريبية القياسية (B2B) بسبب نقص الحقول التالية في ملف العميل:
            </p>
            <ul style="padding-right: 1.2rem; margin: 0;">
              ${!this.buyerStreet() ? '<li>اسم الشارع بالعنوان الوطني</li>' : ''}
              ${!/^\d{4}$/.test(this.buyerBuildingNumber()) ? '<li>رقم المبنى (4 أرقام)</li>' : ''}
              ${!this.buyerCitySubdivisionName() ? '<li>اسم الحي</li>' : ''}
              ${!/^\d{5}$/.test(this.buyerPostalCode()) ? '<li>الرمز البريدي (5 أرقام)</li>' : ''}
              ${!this.vatValidation().isValid ? '<li>الرقم الضريبي للمنشأة (15 رقماً)</li>' : ''}
              ${!this.buyerOtherIdValue() ? '<li>رقم السجل التجاري</li>' : ''}
            </ul>
            <p style="margin-top: 0.75rem; color: #64748b;">
              يمكنك استكمال بيانات العميل عبر زر "تعديل استثنائي لهذه الفاتورة" أو حفظ الفاتورة كمسودة مؤقتة.
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'حفظ كمسودة (Draft)',
        cancelButtonText: 'استكمال البيانات',
        confirmButtonColor: '#0284c7',
        cancelButtonColor: '#64748b'
      }).then(res => {
        if (res.isConfirmed) {
          this.executeSave(false);
        }
      });
      return;
    }

    this.executeSave(autoIssue);
  }

  private executeSave(autoIssue: boolean): void {
    this.isSubmitting.set(true);

    const payload: CreateInvoiceRequest = {
      invoiceType: this.invoiceType(),
      transactionType: this.transactionType(),
      issueDate: new Date(this.issueDate()).toISOString(),
      supplyDate: new Date(this.supplyDate()).toISOString(),
      customerName: this.buyerName().trim(),
      customerVatNumber: this.buyerVatNumber().trim() || undefined,
      customerCrNumber: this.buyerOtherIdValue().trim() || undefined,
      buyerStreet: this.buyerStreet().trim() || undefined,
      buyerBuildingNumber: this.buyerBuildingNumber().trim() || undefined,
      buyerPlotIdentification: this.buyerPlotIdentification().trim() || undefined,
      buyerCitySubdivisionName: this.buyerCitySubdivisionName().trim() || undefined,
      buyerCity: this.buyerCity().trim() || undefined,
      buyerPostalCode: this.buyerPostalCode().trim() || undefined,
      buyerCountryCode: this.buyerCountryCode().trim() || 'SA',
      buyerOtherIdType: this.buyerOtherIdType(),
      buyerOtherIdValue: this.buyerOtherIdValue().trim() || undefined,
      paymentMeansCode: this.paymentMeansCode(),
      notes: this.notes(),
      autoIssueAndPost: autoIssue,
      lines: this.lineItems().map(l => ({
        itemNameAr: l.itemNameAr.trim(),
        itemNameEn: l.itemNameEn.trim() || undefined,
        itemCode: l.itemCode.trim() || undefined,
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        discount: Number(l.discount) || 0,
        vatRate: Number(l.vatRate) || 15,
        vatCategory: l.vatCategory || 'S'
      }))
    };

    this.invoicesService.createInvoice(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        const title = autoIssue ? 'تم اعتماد الفاتورة لدى ZATCA بنجاح' : 'تم حفظ الفاتورة كمسودة بنجاح';
        const msg = autoIssue 
          ? `الفاتورة رقم [${created.invoiceNumber}] معتمدة (CLEARED)، وتم توليد الختم الرقمي وكود الاستجابة السريعة (QR) وقيد اليومية الآلي.`
          : `تم إنشاء الفاتورة رقم [${created.invoiceNumber}] كمسودة جاهزة للاعتماد والمراجعة.`;

        Swal.fire({
          icon: 'success',
          title,
          text: msg,
          confirmButtonColor: '#059669',
          confirmButtonText: 'الانتقال لقائمة الفواتير'
        }).then(() => {
          this.router.navigate(['/invoicing/tax-invoices']);
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'error',
          title: 'فشل في حفظ الفاتورة',
          text: err?.error?.description || err?.error?.message || 'حدث خطأ أثناء معالجة الفاتورة لدى الخادم.',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  // Tafqeet Helper Function
  private tafqeet(amount: number): string {
    if (!amount || amount === 0) return 'صفر ريال سعودي فقط لا غير';

    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    const convertChunk = (num: number): string => {
      let str = '';
      const h = Math.floor(num / 100);
      const rem = num % 100;
      if (h > 0) str += hundreds[h];
      if (rem > 0) {
        if (str) str += ' و';
        if (rem < 20) {
          str += ones[rem];
        } else {
          const o = rem % 10;
          const t = Math.floor(rem / 10);
          if (o > 0) str += ones[o] + ' و';
          str += tens[t];
        }
      }
      return str;
    };

    const integerPart = Math.floor(amount);
    const fractionPart = Math.round((amount - integerPart) * 100);

    let result = '';
    const millions = Math.floor(integerPart / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const units = integerPart % 1000;

    if (millions > 0) {
      result += (millions === 1 ? 'مليون' : (millions === 2 ? 'مليونان' : convertChunk(millions) + ' ملايين'));
    }
    if (thousands > 0) {
      if (result) result += ' و';
      result += (thousands === 1 ? 'ألف' : (thousands === 2 ? 'ألفان' : convertChunk(thousands) + ' آلاف'));
    }
    if (units > 0) {
      if (result) result += ' و';
      result += convertChunk(units);
    }

    result = result ? (result + ' ريال سعودي') : 'صفر ريال';
    if (fractionPart > 0) {
      result += ' و' + convertChunk(fractionPart) + ' هللة';
    }
    return result + ' فقط لا غير';
  }
}
