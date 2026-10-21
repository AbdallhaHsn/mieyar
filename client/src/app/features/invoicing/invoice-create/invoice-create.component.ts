import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { InvoicesService, InvoiceType, TransactionType, CreateInvoiceRequest } from '../../../core/services/invoices.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import Swal from 'sweetalert2';

export interface InvoiceLineFormItem {
  itemNameAr: string;
  itemNameEn: string;
  itemCode: string;
  unit: string;
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

  // Row 1: Invoice Type & Flags
  invoiceType = signal<InvoiceType>(InvoiceType.SimplifiedTaxInvoice); // فاتورة مبسطة افتراضياً كما في صورة العميل
  transactionType = signal<TransactionType>(TransactionType.Invoice);
  isInternalInvoice = signal<boolean>(false); // فاتورة داخلية
  invoiceStatusFlag = signal<boolean>(true); // الفاتورة الحالة

  // Row 2: Invoice Number & Date
  invoiceNumber = signal<string>('');
  issueDate = signal<string>(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
  issueDateDisplay = computed(() => {
    const d = new Date(this.issueDate());
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  });

  // Row 3: Project Link
  isProjectLinked = signal<boolean>(false);
  projectCode = signal<string>('');
  projectName = signal<string>('');

  // Row 4: Payment Method & Credit Terms
  paymentMeansCode = signal<string>('10'); // 10 = نقدي, 30 = تحويل بنكي, 48 = مدى
  discountDays = signal<number>(0); // الايام المخصومه
  creditBalanceDate = signal<string>(new Date().toISOString().substring(0, 10)); // الرصيد الدائن حتى

  // Row 5: Branch
  branchCode = signal<string>('01');
  branchName = signal<string>('الفرع الرئيسي');
  branchNameEn = signal<string>('Main Branch');

  // Row 6: Salesman
  salesmanCode = signal<string>('101');
  salesmanName = signal<string>('مسؤول المبيعات');
  salesmanNameEn = signal<string>('Sales Representative');

  // Row 7: Customer
  customerCode = signal<string>('');
  buyerName = signal<string>('');
  buyerNameEn = signal<string>('');
  buyerPhone = signal<string>('');

  // Row 8: Secondary ID (Scheme ID & Number)
  buyerOtherIdType = signal<string>('CRN'); // نوع معرف آخر
  buyerOtherIdValue = signal<string>(''); // رقم الهوية

  // Row 9: Address & Tax Number
  buyerAddress = signal<string>(''); // العنوان إلى
  buyerVatNumber = signal<string>(''); // رمز الضريبة/القيمة المضافة

  // Row 10: Reference
  referenceNumber = signal<string>(''); // رقم المرجع
  currency = signal<string>('SAR'); // رمز العمله

  // Saudi National Address structured components for ZATCA backend
  buyerStreet = signal<string>('');
  buyerBuildingNumber = signal<string>('');
  buyerPlotIdentification = signal<string>('');
  buyerCitySubdivisionName = signal<string>('');
  buyerCity = signal<string>('الرياض');
  buyerPostalCode = signal<string>('');
  buyerCountryCode = signal<string>('SA');

  // Invoice Line Items
  lineItems = signal<InvoiceLineFormItem[]>([
    {
      itemNameAr: 'خدمات استشارية مالية وتطوير أنظمة سحابية',
      itemNameEn: 'Financial & Cloud ERP Services',
      itemCode: 'SRV-01',
      unit: 'خدمة',
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      vatRate: 15,
      vatCategory: 'S'
    }
  ]);

  // Available Units
  availableUnits = ['خدمة', 'قطعة', 'ساعة', 'متر', 'طقم', 'كرتون', 'كيلو'];

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

  // Computed: Totals
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

  // ZATCA Checklist
  zatcaChecklist = computed(() => {
    const isStandard = this.invoiceType() === InvoiceType.StandardTaxInvoice;
    const hasName = this.buyerName().trim().length >= 2;
    const hasLines = this.lineItems().length > 0 && this.lineItems().every(l => l.itemNameAr.trim() && l.unitPrice > 0);

    if (!isStandard) {
      // Simplified B2C
      return {
        score: hasLines ? 100 : 50,
        isFullyCompliant: hasLines
      };
    }

    // Standard B2B
    const vatValid = /^\d{15}$/.test(this.buyerVatNumber().trim()) && this.buyerVatNumber().startsWith('3') && this.buyerVatNumber().endsWith('3');
    const hasCr = this.buyerOtherIdValue().trim().length >= 3;
    const hasAddr = this.buyerAddress().trim().length >= 5;

    const isFullyCompliant = hasName && vatValid && hasCr && hasAddr && hasLines;
    const score = isFullyCompliant ? 100 : (hasName && hasLines ? 60 : 30);

    return { score, isFullyCompliant };
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

        // Pre-select first partner or cash
        if (mapped.length > 0) {
          this.onPartnerSelected(mapped[0].id);
        } else {
          this.setCashCustomer();
        }
      },
      error: () => {
        this.isLoadingPartners.set(false);
        this.setCashCustomer();
      }
    });
  }

  onPartnerSelected(partnerId: string): void {
    this.selectedPartnerId.set(partnerId);

    if (!partnerId || partnerId === 'cash') {
      this.setCashCustomer();
      return;
    }

    const partner = this.partners().find(p => p.id === partnerId);
    if (!partner) return;

    this.customerCode.set(partner.code);
    this.buyerName.set(partner.nameAr);
    this.buyerNameEn.set(partner.nameEn || '');
    this.buyerPhone.set(partner.phone || '');
    this.buyerVatNumber.set(partner.taxNumber || '');
    this.buyerOtherIdType.set(partner.otherIdType || 'CRN');
    this.buyerOtherIdValue.set(partner.otherIdValue || partner.commercialRegistration || '');

    // National address components
    this.buyerStreet.set(partner.streetName || '');
    this.buyerBuildingNumber.set(partner.buildingNumber || '');
    this.buyerPlotIdentification.set(partner.plotIdentification || '');
    this.buyerCitySubdivisionName.set(partner.citySubdivisionName || '');
    this.buyerCity.set(partner.cityName || 'الرياض');
    this.buyerPostalCode.set(partner.postalZone || '');
    this.buyerCountryCode.set(partner.countryCode || 'SA');

    // Build unified National Address string for "العنوان إلى"
    const addrParts: string[] = [];
    if (partner.buildingNumber) addrParts.push(`مبنى ${partner.buildingNumber}`);
    if (partner.streetName) addrParts.push(partner.streetName);
    if (partner.citySubdivisionName) addrParts.push(partner.citySubdivisionName);
    if (partner.cityName) addrParts.push(partner.cityName);
    if (partner.postalZone) addrParts.push(partner.postalZone);
    addrParts.push('المملكة العربية السعودية');

    this.buyerAddress.set(addrParts.join('، '));
  }

  setCashCustomer(): void {
    this.selectedPartnerId.set('cash');
    this.customerCode.set('CASH-01');
    this.buyerName.set('عميل نقدي عام');
    this.buyerNameEn.set('Cash Customer');
    this.buyerPhone.set('');
    this.buyerVatNumber.set('');
    this.buyerOtherIdType.set('CRN');
    this.buyerOtherIdValue.set('');
    this.buyerAddress.set('الرياض - مبيعات نقدية مباشرة');
    this.buyerStreet.set('');
    this.buyerBuildingNumber.set('');
    this.buyerPlotIdentification.set('');
    this.buyerCitySubdivisionName.set('');
    this.buyerPostalCode.set('');
  }

  openCustomerModal(): void {
    // Navigate or open new partner creation
    window.open('/accounting/partners/create', '_blank');
  }

  addLineItem(): void {
    this.lineItems.update(items => [
      ...items,
      {
        itemNameAr: '',
        itemNameEn: '',
        itemCode: `ITM-0${items.length + 1}`,
        unit: 'خدمة',
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
        text: 'يرجى إدخال أو اختيار العميل.',
        confirmButtonColor: '#334155'
      });
      return;
    }

    if (this.lineItems().length === 0 || this.lineItems().some(l => !l.itemNameAr.trim() || l.unitPrice <= 0)) {
      Swal.fire({
        icon: 'warning',
        title: 'بيانات الأصناف غير مكتملة',
        text: 'يرجى إدخال اسم الصنف وسعر صحيح لكافة الأسطر.',
        confirmButtonColor: '#334155'
      });
      return;
    }

    this.executeSave(autoIssue);
  }

  private executeSave(autoIssue: boolean): void {
    this.isSubmitting.set(true);

    const payload: CreateInvoiceRequest = {
      invoiceType: Number(this.invoiceType()),
      transactionType: Number(this.transactionType()),
      issueDate: new Date(this.issueDate()).toISOString(),
      supplyDate: new Date(this.issueDate()).toISOString(),
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
      notes: this.buyerAddress() || undefined,
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
        const title = autoIssue ? 'تم حفظ واعتماد الفاتورة لدى ZATCA' : 'تم حفظ الفاتورة بنجاح';
        const msg = `تم حفظ الفاتورة رقم [${created.invoiceNumber}] بنجاح.`;

        Swal.fire({
          icon: 'success',
          title,
          text: msg,
          confirmButtonColor: '#334155',
          confirmButtonText: 'موافق'
        }).then(() => {
          this.router.navigate(['/invoicing/tax-invoices']);
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'error',
          title: 'فشل في حفظ الفاتورة',
          text: err?.error?.description || err?.error?.message || 'حدث خطأ أثناء معالجة الفاتورة.',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  // Tafqeet Helper
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
