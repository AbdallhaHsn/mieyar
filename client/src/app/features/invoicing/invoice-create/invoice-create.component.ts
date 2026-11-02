import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { InvoicesService, InvoiceDto, InvoiceStatus, InvoiceType, TransactionType, CreateInvoiceRequest } from '../../../core/services/invoices.service';
import { PurchasingService, ItemDto } from '../../../core/services/purchasing.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { SalespersonsService, SalespersonDto } from '../../../core/services/salespersons.service';
import { AuthService } from '../../../core/services/auth.service';
import { BranchesWarehousesService, WarehouseDto } from '../../../core/services/branches-warehouses.service';
import { ModulesSettingsService } from '../../../core/services/modules-settings.service';
import { tafqeet } from '../../../core/utils/tafqeet';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

export interface InvoiceLineFormItem {
  itemId?: string;
  warehouseCode?: string;
  itemNameAr: string;
  itemNameEn: string;
  itemCode: string;
  unit: string;
  quantity: number;
  originalQuantity?: number;
  originalDiscount?: number;
  unitPrice: number;
  costPrice?: number;
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

import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-invoice-create',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule, SearchableSelectComponent, TranslatePipe],
  templateUrl: './invoice-create.component.html',
  styleUrls: ['./invoice-create.component.scss']
})
export class InvoiceCreateComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private invoicesService = inject(InvoicesService);
  private purchasingService = inject(PurchasingService);
  public companyContext = inject(CompanyContextService);
  public langService = inject(LanguageService);
  public translator = inject(AccountingTranslatorService);
  public authService = inject(AuthService);
  public salespersonsService = inject(SalespersonsService);
  private bwService = inject(BranchesWarehousesService);
  public modulesSettings = inject(ModulesSettingsService);

  warehouses = signal<WarehouseDto[]>([]);

  // Salespersons & Warehouse Isolation State
  salespersons = signal<SalespersonDto[]>([]);
  selectedSalespersonId = signal<string>('');
  selectedSalespersonName = signal<string>('');
  isWarehouseLocked = signal<boolean>(false);
  assignedWarehouseNotice = signal<string>('');
  currentUserName = computed(() => {
    const u = this.authService.currentUser();
    return u ? (u.fullNameAr || u.fullNameEn || u.userName) : 'المستخدم الحالي';
  });

  // Mode Signals (Invoices, Quotations, Credit Notes / Sales Returns)
  isQuotationMode = signal<boolean>(false);
  isCreditNoteMode = signal<boolean>(false);
  isCreditNoteRoute = computed(() => this.router.url.includes('/credit-notes'));
  isQuotationRoute = computed(() => this.router.url.includes('/quotations'));

  pageTitle = computed(() => {
    if (this.isQuotationMode()) {
      return this.langService.t('invoices.create.quotationTitle');
    }
    if (this.isCreditNoteMode() || this.transactionType() === TransactionType.CreditNote) {
      return this.langService.t('invoices.create.creditNoteTitle');
    }
    return this.langService.t('invoices.create.salesTitle');
  });

  // Available Items from Inventory Master
  availableItems = signal<ItemDto[]>([]);
  unifiedBuyerName = signal<string>('');
  buyerBackgroundTranslation = signal<string>('');
  modalLineBackgroundTranslation = signal<string>('');

  onUnifiedBuyerNameChange(text: string): void {
    this.unifiedBuyerName.set(text);
    if (!text.trim()) {
      this.buyerName.set('');
      this.buyerNameEn.set('');
      this.buyerBackgroundTranslation.set('');
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.buyerName.set(text);
      const instant = this.translator.translateArabicToEnglish(text);
      this.buyerNameEn.set(instant);
      this.buyerBackgroundTranslation.set(`الترجمة الإنجليزية: ${instant}`);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.buyerNameEn.set(refined);
          this.buyerBackgroundTranslation.set(`الترجمة الإنجليزية: ${refined}`);
        }
      );
    } else {
      this.buyerNameEn.set(text);
      const instant = this.translator.translateEnglishToArabic(text);
      this.buyerName.set(instant);
      this.buyerBackgroundTranslation.set(`الترجمة العربية: ${instant}`);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.buyerName.set(refined);
          this.buyerBackgroundTranslation.set(`الترجمة العربية: ${refined}`);
        }
      });
    }
  }

  onBuyerNameChange(val: string) {
    this.onUnifiedBuyerNameChange(val);
  }

  onBuyerNameEnChange(val: string) {
    this.onUnifiedBuyerNameChange(val);
  }

  async forceTranslateBuyerName(): Promise<void> {
    const text = this.unifiedBuyerName() || this.buyerName() || this.buyerNameEn();
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const refined = await this.translator.translateOnline(text, 'ar', 'en');
      this.buyerNameEn.set(refined || this.translator.translateArabicToEnglish(text));
      this.buyerBackgroundTranslation.set(`الترجمة الإنجليزية: ${this.buyerNameEn()}`);
    } else {
      const refined = await this.translator.translateOnline(text, 'en', 'ar');
      this.buyerName.set(refined || this.translator.translateEnglishToArabic(text));
      this.buyerBackgroundTranslation.set(`الترجمة العربية: ${this.buyerName()}`);
    }
  }

  InvoiceType = InvoiceType;
  TransactionType = TransactionType;

  // Loading & Submission State
  isSubmitting = signal<boolean>(false);
  isLoadingPartners = signal<boolean>(false);
  partners = signal<PartnerOption[]>([]);
  selectedPartnerId = signal<string>('cash');

  // Customer Intelligence & Anti-Redundancy
  customBuyerDetailsVisible = signal<boolean>(false);
  selectedPartner = computed<PartnerOption | null>(() => {
    const pid = this.selectedPartnerId();
    if (!pid || pid === 'cash') return null;
    return this.partners().find(p => p.id === pid) || null;
  });

  // Dedicated Returns & Credit Notes Workflow State
  originalInvoiceSearchTerm = signal<string>('');
  originalInvoicesList = signal<InvoiceDto[]>([]);
  allInvoicesList = signal<InvoiceDto[]>([]);
  selectedOriginalInvoice = signal<InvoiceDto | null>(null);
  isLookupExpanded = signal<boolean>(false);
  isLoadingOriginalInvoice = signal<boolean>(false);
  referenceInvoiceId = signal<string>('');
  referenceInvoiceNumber = signal<string>('');
  returnReason = signal<string>('إرجاع بضاعة من العميل');

  customerOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [
      {
        value: 'cash',
        label: 'عميل نقدي عام (Cash Customer)',
        code: 'CASH',
        badge: 'افتراضي',
        badgeClass: 'badge-default',
        icon: 'pi pi-user'
      }
    ];

    const currentLang = this.langService.currentLang();
    for (const p of this.partners()) {
      const name = currentLang === 'ar' ? p.nameAr : (p.nameEn || p.nameAr);
      const sub = p.nameEn && currentLang === 'ar' 
        ? p.nameEn 
        : (p.commercialRegistration ? `س.ت: ${p.commercialRegistration}` : (p.taxNumber ? `ضريبي: ${p.taxNumber}` : (p.phone ? `هاتف: ${p.phone}` : undefined)));

      list.push({
        value: p.id,
        label: `${p.code} - ${name}`,
        sublabel: sub,
        code: p.code,
        icon: 'pi pi-building'
      });
    }

    return list;
  });

  catalogItemOptions = computed<SelectOption[]>(() => {
    const currentLang = this.langService.currentLang();
    const list: SelectOption[] = [
      {
        value: '',
        label: '-- إدخال يدوي مخصص بدون ربط بالدليل --',
        icon: 'pi pi-pencil'
      }
    ];

    for (const itm of this.availableItems()) {
      const name = currentLang === 'ar' ? itm.nameAr : (itm.nameEn || itm.nameAr);
      const stockInfo = itm.itemType === 1 ? ` | المتوفر: ${itm.currentStockQuantity} ${itm.unitOfMeasure || 'حبة'}` : '';
      list.push({
        value: itm.id,
        label: `${itm.itemCode} - ${name}`,
        sublabel: `سعر البيع: ${itm.salePrice} ر.س | التكلفة: ${itm.costPrice || itm.purchasePrice || 0} ر.س${stockInfo}`,
        code: itm.itemCode,
        icon: 'pi pi-box'
      });
    }

    return list;
  });

  // Row 1: Invoice Type & Flags
  invoiceType = signal<InvoiceType>(InvoiceType.StandardTaxInvoice); // Standard Tax B2B by default
  transactionType = signal<TransactionType>(TransactionType.Invoice);
  isInternalInvoice = signal<boolean>(false); // فاتورة داخلية
  invoiceStatusFlag = signal<boolean>(true); // الفاتورة الحالة

  // Row 2: Invoice Number & Date
  invoiceNumber = signal<string>('');
  issueDate = signal<string>(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
  supplyDate = signal<string>(new Date().toISOString().substring(0, 10));
  dueDate = signal<string>(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().substring(0, 10));

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
  paymentMeansCode = signal<string>('42'); // 42 = آجل (Credit), 10 = نقدي, 30 = تحويل بنكي, 48 = مدى
  discountDays = signal<number>(0);
  creditBalanceDate = signal<string>(new Date().toISOString().substring(0, 10));

  // Row 5: Branch & Warehouse
  branchCode = signal<string>('01');
  branchName = signal<string>('الفرع الرئيسي - الرياض');
  branchNameEn = signal<string>('Main Branch - Riyadh');
  selectedWarehouse = 'WH-MAIN';

  // Cost Centers
  costCenters = signal<{ id: string; code: string; nameAr: string; nameEn?: string }[]>([
    { id: '1', code: 'CC-01', nameAr: 'الإدارة العامة والمبيعات', nameEn: 'General Management & Sales' },
    { id: '2', code: 'CC-02', nameAr: 'قطاع التجزئة والمعارض', nameEn: 'Retail & Showrooms' },
    { id: '3', code: 'CC-03', nameAr: 'المشاريع والعقود الكبرى', nameEn: 'Major Projects & Contracts' }
  ]);
  selectedCostCenterId = signal<string>('1');

  // Row 6: Salesman
  salesmanCode = signal<string>('');
  salesmanName = signal<string>('');
  salesmanNameEn = signal<string>('');

  // Row 7: Customer
  customerCode = signal<string>('');
  buyerName = signal<string>('');
  buyerNameEn = signal<string>('');
  buyerPhone = signal<string>('');

  // Row 8: Secondary ID (Scheme ID & Number)
  buyerOtherIdType = signal<string>('CRN');
  buyerOtherIdValue = signal<string>('');

  // Row 9: Address & Tax Number
  buyerAddress = signal<string>('');
  buyerVatNumber = signal<string>('');

  // Row 10: Reference
  referenceNumber = signal<string>('');
  currency = signal<string>('SAR');
  exchangeRateToSar = signal<number>(1.0);
  notes = signal<string>('');

  // Saudi National Address structured components for ZATCA backend
  buyerStreet = signal<string>('');
  buyerBuildingNumber = signal<string>('');
  buyerPlotIdentification = signal<string>('');
  buyerCitySubdivisionName = signal<string>('');
  buyerCity = signal<string>('');
  buyerPostalCode = signal<string>('');
  buyerCountryCode = signal<string>('SA');

  // Invoice Line Items
  lineItems = signal<InvoiceLineFormItem[]>([]);

  // Available Units
  availableUnits = ['خدمة', 'قطعة', 'ساعة', 'متر', 'طقم', 'كرتون', 'كيلو', 'حبة'];

  // Line Modal Popup State
  showLineModal = signal<boolean>(false);
  editingIndex = signal<number | null>(null);

  lineForm: InvoiceLineFormItem = {
    itemId: '',
    warehouseCode: 'WH-MAIN',
    itemNameAr: '',
    itemNameEn: '',
    itemCode: '',
    unit: 'قطعة',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    vatRate: 15,
    vatCategory: 'S'
  };

  openAddLineModal() {
    this.editingIndex.set(null);
    const defaultVat = this.modulesSettings.invoicingSettings().defaultVatRate ?? 15;
    this.lineForm = {
      itemId: '',
      warehouseCode: this.selectedWarehouse || 'WH-MAIN',
      itemNameAr: '',
      itemNameEn: '',
      itemCode: `ITM-0${this.lineItems().length + 1}`,
      unit: 'قطعة',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      vatRate: defaultVat,
      vatCategory: 'S'
    };
    this.showLineModal.set(true);
  }

  openEditLineModal(index: number) {
    this.editingIndex.set(index);
    const l = this.lineItems()[index];
    this.lineForm = { ...l };
    this.showLineModal.set(true);
  }

  closeLineModal() {
    this.showLineModal.set(false);
    this.editingIndex.set(null);
  }

  onModalItemSelect() {
    const itm = this.availableItems().find(i => i.id === this.lineForm.itemId);
    if (itm) {
      this.lineForm.itemNameAr = itm.nameAr;
      this.lineForm.itemNameEn = itm.nameEn || this.translator.translateArabicToEnglish(itm.nameAr);
      this.lineForm.itemCode = itm.itemCode;
      this.lineForm.unit = itm.unitOfMeasure || 'قطعة';
      this.lineForm.unitPrice = itm.salePrice > 0 ? itm.salePrice : 0;
      this.lineForm.costPrice = itm.costPrice > 0 ? itm.costPrice : (itm.purchasePrice > 0 ? itm.purchasePrice : 0);
    }
  }

  getModalItemCost(): number {
    if (!this.lineForm.itemId) return this.lineForm.costPrice || 0;
    const itm = this.availableItems().find(i => i.id === this.lineForm.itemId);
    if (!itm) return this.lineForm.costPrice || 0;
    return itm.costPrice > 0 ? itm.costPrice : (itm.purchasePrice > 0 ? itm.purchasePrice : 0);
  }

  getModalLossPercentage(): number {
    const cost = this.getModalItemCost();
    const price = Number(this.lineForm.unitPrice || 0);
    if (cost <= 0 || price >= cost) return 0;
    return Math.round(((cost - price) / cost) * 100);
  }

  getModalProfitPercentage(): number {
    const cost = this.getModalItemCost();
    const price = Number(this.lineForm.unitPrice || 0);
    if (cost <= 0 || price <= cost) return 0;
    return Math.round(((price - cost) / cost) * 100);
  }

  getModalItemStock(): number {
    if (!this.lineForm.itemId) return 0;
    const itm = this.availableItems().find(i => i.id === this.lineForm.itemId);
    return itm ? (itm.currentStockQuantity || 0) : 0;
  }

  isModalStockable(): boolean {
    if (!this.lineForm.itemId) return false;
    const itm = this.availableItems().find(i => i.id === this.lineForm.itemId);
    return itm ? (itm.itemType === 1) : false;
  }

  onModalLineNameChange(text: string): void {
    if (!text || !text.trim()) {
      this.lineForm.itemNameAr = '';
      this.lineForm.itemNameEn = '';
      this.modalLineBackgroundTranslation.set('');
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.lineForm.itemNameAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.lineForm.itemNameEn = instant;
      this.modalLineBackgroundTranslation.set(`الترجمة: ${instant}`);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.lineForm.itemNameEn = refined;
          this.modalLineBackgroundTranslation.set(`الترجمة: ${refined}`);
        }
      );
    } else {
      this.lineForm.itemNameEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.lineForm.itemNameAr = instant;
      this.modalLineBackgroundTranslation.set(`الترجمة: ${instant}`);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.lineForm.itemNameAr = refined;
          this.modalLineBackgroundTranslation.set(`الترجمة: ${refined}`);
        }
      });
    }
  }

  onModalLineNameArChange(val: string) {
    this.onModalLineNameChange(val);
  }

  async forceRetranslateModalLine(): Promise<void> {
    const text = this.lineForm.itemNameAr || this.lineForm.itemNameEn;
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const refined = await this.translator.translateOnline(text, 'ar', 'en');
      this.lineForm.itemNameEn = refined || this.translator.translateArabicToEnglish(text);
      this.modalLineBackgroundTranslation.set(`الترجمة: ${this.lineForm.itemNameEn}`);
    } else {
      const refined = await this.translator.translateOnline(text, 'en', 'ar');
      this.lineForm.itemNameAr = refined || this.translator.translateEnglishToArabic(text);
      this.modalLineBackgroundTranslation.set(`الترجمة: ${this.lineForm.itemNameAr}`);
    }
  }

  saveModalLine(andContinue: boolean = false) {
    if (!this.lineForm.itemNameAr || !this.lineForm.itemNameAr.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('invoices.create.alerts.itemNameRequired'),
        text: this.langService.t('invoices.create.alerts.selectItemOrType'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    if (Number(this.lineForm.quantity || 0) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('invoices.create.alerts.invalidQuantity'),
        text: this.langService.t('invoices.create.alerts.positiveQuantityRequired'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    if (Number(this.lineForm.unitPrice || 0) < 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('invoices.create.alerts.invalidPrice'),
        text: this.langService.t('invoices.create.alerts.validPriceRequired'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    // --- تحقق الرصيد المخزني: منع البيع بالسالب في حال حظر البيع بالسالب في إعدادات النظام ---
    if (this.isModalStockable() && !this.isCreditNoteMode()) {
      const availableStock = this.getModalItemStock();
      const requestedQty = Number(this.lineForm.quantity || 0);
      const allowNegative = this.modulesSettings.posSettings()?.allowNegativeStock ?? false;

      if (!allowNegative && requestedQty > availableStock) {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('invoices.create.alerts.insufficientStockTitle'),
          text: this.langService.t('invoices.create.alerts.insufficientStockText', {
            requested: requestedQty,
            available: availableStock,
            unit: this.lineForm.unit || ''
          }),
          confirmButtonColor: '#ef4444',
          confirmButtonText: this.langService.t('invoices.create.alerts.adjustQuantityBtn')
        });
        return;
      }
    }

    // --- تحقق الرقابة على الأسعار: البيع بأقل من سعر التكلفة ---
    const cost = this.getModalItemCost();
    const sellingPrice = Number(this.lineForm.unitPrice || 0);

    if (cost > 0 && sellingPrice < cost && !this.isCreditNoteMode()) {
      // 1. إذا كان البائع المختار مندوباً ولا يملك صلاحية البيع بأقل من التكلفة
      if (this.selectedSalespersonId()) {
        const sp = this.salespersons().find(s => s.id === this.selectedSalespersonId());
        if (sp && !sp.canSellBelowCost) {
          const spName = this.langService.currentLang() === 'ar' ? sp.nameAr : (sp.nameEn || sp.nameAr);
          Swal.fire({
            icon: 'error',
            title: this.langService.t('invoices.create.alerts.belowCostBlockedTitle'),
            text: this.langService.t('invoices.create.alerts.belowCostBlockedText', {
              price: sellingPrice,
              cost,
              spName
            }),
            confirmButtonColor: '#ef4444',
            confirmButtonText: this.langService.t('invoices.create.alerts.adjustPriceBtn')
          });
          return;
        }
      }

      // 2. للمدير العام: إظهار تنبيه تحذيري احترافي مع طلب تأكيد اعتماد السعر الاستثنائي
      const diff = cost - sellingPrice;
      const lossPct = Math.round((diff / cost) * 100);

      Swal.fire({
        icon: 'warning',
        title: this.langService.t('invoices.create.alerts.belowCostWarningTitle'),
        text: this.langService.t('invoices.create.alerts.belowCostWarningText', {
          price: sellingPrice,
          cost,
          lossPct,
          diff: diff.toFixed(2)
        }),
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b',
        confirmButtonText: this.langService.t('invoices.create.alerts.acceptBelowCostBtn'),
        cancelButtonText: this.langService.t('invoices.create.alerts.cancelBelowCostBtn')
      }).then((result) => {
        if (result.isConfirmed) {
          this.doCommitModalLine(andContinue);
        }
      });
      return;
    }

    this.doCommitModalLine(andContinue);
  }

  private doCommitModalLine(andContinue: boolean = false) {
    const payload: InvoiceLineFormItem = {
      ...this.lineForm,
      quantity: Number(this.lineForm.quantity || 1),
      unitPrice: Number(this.lineForm.unitPrice || 0),
      costPrice: this.getModalItemCost(),
      discount: Number(this.lineForm.discount || 0),
      vatRate: Number(this.lineForm.vatRate || 15)
    };

    const idx = this.editingIndex();
    if (idx !== null && idx >= 0) {
      this.lineItems.update(arr => {
        const copy = [...arr];
        copy[idx] = payload;
        return copy;
      });
      this.closeLineModal();
    } else {
      this.lineItems.update(arr => [...arr, payload]);
      if (andContinue) {
        this.lineForm = {
          itemId: '',
          warehouseCode: this.selectedWarehouse || 'WH-MAIN',
          itemNameAr: '',
          itemNameEn: '',
          itemCode: `ITM-0${this.lineItems().length + 1}`,
          unit: 'قطعة',
          quantity: 1,
          unitPrice: 0,
          costPrice: 0,
          discount: 0,
          vatRate: 15,
          vatCategory: 'S'
        };
      } else {
        this.closeLineModal();
      }
    }
  }

  removeLine(index: number) {
    this.lineItems.update(arr => arr.filter((_, idx) => idx !== index));
  }

  get modalTaxable(): number {
    const gross = (Number(this.lineForm.quantity || 0) * Number(this.lineForm.unitPrice || 0));
    const taxable = gross - Number(this.lineForm.discount || 0);
    return taxable > 0 ? Math.round(taxable * 100) / 100 : 0;
  }

  get modalVat(): number {
    return Math.round(this.modalTaxable * (Number(this.lineForm.vatRate || 0) / 100) * 100) / 100;
  }

  get modalTotal(): number {
    return Math.round((this.modalTaxable + this.modalVat) * 100) / 100;
  }

  getWarehouseName(code?: string): string {
    if (!code) return 'المستودع الرئيسي';
    const found = this.warehouses().find(w => w.code === code);
    if (found) {
      return this.langService.currentLang() === 'ar' ? found.nameAr : found.nameEn;
    }
    switch (code) {
      case 'WH-MAIN': return 'المستودع الرئيسي (WH-MAIN)';
      case 'WH-01': return 'الرئيسي (WH-01)';
      case 'WH-02': return 'المعرض (WH-02)';
      case 'WH-03': return 'المستودع الفرعي (WH-03)';
      default: return code;
    }
  }

  getItemCode(itemId?: string): string {
    if (!itemId) return '';
    const item = this.availableItems().find(i => i.id === itemId);
    return item ? item.itemCode : '';
  }

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
    return tafqeet(this.grandTotal());
  });

  // ZATCA Checklist
  zatcaChecklist = computed(() => {
    const isStandard = this.invoiceType() === InvoiceType.StandardTaxInvoice;
    const hasName = this.buyerName().trim().length >= 2;
    const activeItems = this.lineItems().filter(l => l.itemNameAr.trim() || (Number(l.unitPrice) || 0) > 0);
    const hasLines = activeItems.length > 0 && activeItems.every(l => l.itemNameAr.trim() && (Number(l.unitPrice) || 0) > 0);

    if (!isStandard) {
      return {
        score: hasLines ? 100 : 50,
        isFullyCompliant: hasLines
      };
    }

    const vatValid = /^\d{15}$/.test(this.buyerVatNumber().trim()) && this.buyerVatNumber().startsWith('3') && this.buyerVatNumber().endsWith('3');
    const hasCr = this.buyerOtherIdValue().trim().length >= 3;
    const hasAddr = this.buyerAddress().trim().length >= 5;

    const isFullyCompliant = hasName && vatValid && hasCr && hasAddr && hasLines;
    const score = isFullyCompliant ? 100 : (hasName && hasLines ? 60 : 30);

    return { score, isFullyCompliant };
  });

  ngOnInit(): void {
    const isCreditRoute = this.router.url.includes('/credit-notes');
    const isQuoteRoute = this.router.url.includes('/quotations');
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] || params['type'];
      const refNum = params['ref'] || params['refInvoiceNumber'] || params['refNum'];
      const refId = params['refId'] || params['refInvoiceId'];

      if (isQuoteRoute || tab === 'quotes' || tab === 'quote') {
        this.isQuotationMode.set(true);
        this.isCreditNoteMode.set(false);
        this.transactionType.set(TransactionType.Quotation);
        this.generateInvoiceNumber('QUO');
      } else if (isCreditRoute || tab === 'credit-notes' || tab === 'credit-note') {
        this.isCreditNoteMode.set(true);
        this.isQuotationMode.set(false);
        this.transactionType.set(TransactionType.CreditNote);
        this.generateInvoiceNumber('CN');
        this.loadIssuedInvoicesForReturn(refNum || refId);
      } else if (tab === 'simplified') {
        this.invoiceType.set(InvoiceType.SimplifiedTaxInvoice);
        this.isQuotationMode.set(false);
        this.isCreditNoteMode.set(false);
        this.generateInvoiceNumber('SIMP');
      } else {
        this.isQuotationMode.set(false);
        this.isCreditNoteMode.set(false);
        this.transactionType.set(TransactionType.Invoice);
        this.generateInvoiceNumber('INV');
      }
    });

    this.setCashCustomer();
    this.loadPartners();
    this.loadItems();
    this.loadSalespersons();
    this.loadWarehouses();
  }

  // --- RETURN & CREDIT NOTE WORKFLOW (إدارة المرتجعات واستدعاء الفاتورة الأصلية) ---

  loadIssuedInvoicesForReturn(preselectNumOrId?: string): void {
    this.isLoadingOriginalInvoice.set(true);
    this.invoicesService.getInvoices().subscribe({
      next: (list) => {
        this.isLoadingOriginalInvoice.set(false);
        this.allInvoicesList.set(list || []);

        // Exclude drafts, cancellations, and other credit notes so only eligible sales invoices appear
        const salesInvoices = (list || []).filter(inv =>
          inv.transactionType !== TransactionType.CreditNote &&
          !inv.invoiceNumber.startsWith('CN-') &&
          inv.status !== InvoiceStatus.Draft &&
          inv.status !== InvoiceStatus.Cancelled
        );
        this.originalInvoicesList.set(salesInvoices);

        if (preselectNumOrId) {
          const match = salesInvoices.find(i =>
            i.id === preselectNumOrId ||
            i.invoiceNumber.trim().toLowerCase() === preselectNumOrId.trim().toLowerCase()
          );
          if (match) {
            this.selectOriginalInvoice(match);
          } else {
            this.searchOriginalInvoiceByNumber(preselectNumOrId);
          }
        }
      },
      error: () => {
        this.isLoadingOriginalInvoice.set(false);
      }
    });
  }

  searchOriginalInvoiceByNumber(invoiceNum?: string): void {
    const num = (invoiceNum || this.originalInvoiceSearchTerm()).trim();
    if (!num) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('invoices.create.alerts.invoiceNumberRequired'),
        text: this.langService.t('invoices.create.alerts.enterOriginalInvoiceNum'),
        confirmButtonColor: '#1e293b'
      });
      return;
    }

    const localMatch = this.originalInvoicesList().find(i =>
      i.invoiceNumber.toLowerCase() === num.toLowerCase()
    );
    if (localMatch) {
      this.selectOriginalInvoice(localMatch);
      return;
    }

    this.isLoadingOriginalInvoice.set(true);
    this.invoicesService.getInvoices(undefined, undefined).subscribe({
      next: (list) => {
        this.isLoadingOriginalInvoice.set(false);
        this.allInvoicesList.set(list || []);
        const match = (list || []).find(i =>
          i.invoiceNumber.toLowerCase() === num.toLowerCase() ||
          i.id === num
        );
        if (match) {
          this.selectOriginalInvoice(match);
        } else {
          Swal.fire({
            icon: 'error',
            title: this.langService.t('invoices.create.alerts.invoiceNotFoundTitle'),
            text: this.langService.t('invoices.create.alerts.invoiceNotFoundText', { num }),
            confirmButtonColor: '#ef4444'
          });
        }
      },
      error: (err) => {
        this.isLoadingOriginalInvoice.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('invoices.create.alerts.fetchInvoiceErrorTitle'),
          text: err?.error?.description || this.langService.t('invoices.create.alerts.fetchInvoiceErrorText'),
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  onOriginalInvoiceSelectChange(selectedId: string): void {
    if (!selectedId) return;
    const inv = this.originalInvoicesList().find(i => i.id === selectedId);
    if (inv) {
      this.selectOriginalInvoice(inv);
    }
  }

  selectOriginalInvoice(inv: InvoiceDto): void {
    if (this.allInvoicesList().length === 0) {
      this.isLoadingOriginalInvoice.set(true);
      this.invoicesService.getInvoices().subscribe({
        next: (list) => {
          this.isLoadingOriginalInvoice.set(false);
          this.allInvoicesList.set(list || []);
          this.processOriginalInvoiceSelection(inv);
        },
        error: () => {
          this.isLoadingOriginalInvoice.set(false);
          this.processOriginalInvoiceSelection(inv);
        }
      });
      return;
    }
    this.processOriginalInvoiceSelection(inv);
  }

  private processOriginalInvoiceSelection(inv: InvoiceDto): void {
    this.selectedOriginalInvoice.set(inv);
    this.isLookupExpanded.set(false);
    this.referenceInvoiceId.set(inv.id);
    this.referenceInvoiceNumber.set(inv.invoiceNumber);
    this.invoiceType.set(inv.invoiceType || InvoiceType.StandardTaxInvoice);

    // Populate customer details
    if (inv.customerId && inv.customerId !== 'cash') {
      this.selectedPartnerId.set(inv.customerId);
      const partner = this.partners().find(p => p.id === inv.customerId);
      if (partner) {
        this.onPartnerSelected(partner.id);
      } else {
        this.buyerName.set(inv.customerName || inv.buyerName || '');
        this.buyerVatNumber.set(inv.customerVatNumber || inv.buyerVatNumber || '');
        this.buyerAddress.set(inv.customerAddress || inv.buyerAddress || '');
        this.buyerOtherIdValue.set(inv.customerCrNumber || inv.buyerCrNumber || '');
      }
    } else {
      this.selectedPartnerId.set('cash');
      this.buyerName.set(inv.customerName || inv.buyerName || 'عميل نقدي عام');
      this.buyerNameEn.set('Cash Customer');
      this.buyerVatNumber.set(inv.customerVatNumber || inv.buyerVatNumber || '');
      this.buyerAddress.set(inv.customerAddress || inv.buyerAddress || 'الرياض - مبيعات نقدية مباشرة');
    }
    this.customBuyerDetailsVisible.set(false);

    // Logistics & Branch
    if (inv.warehouseCode) {
      this.selectedWarehouse = inv.warehouseCode;
    }
    if (inv.salespersonId) {
      this.selectedSalespersonId.set(inv.salespersonId);
      this.selectedSalespersonName.set(inv.salespersonName || '');
    }

    // Inherit Payment Method (Cash vs Credit) from Original Invoice
    if (inv.paymentMeansCode) {
      this.paymentMeansCode.set(inv.paymentMeansCode);
    } else if (inv.customerId === 'cash' || !inv.customerId) {
      this.paymentMeansCode.set('10'); // Cash
    } else {
      this.paymentMeansCode.set('42'); // Credit
    }

    // 1. Find all previous credit notes referencing this original invoice
    const creditNotes = (this.allInvoicesList() || []).filter(cn =>
      cn.id !== inv.id &&
      (cn.transactionType === TransactionType.CreditNote || (cn.invoiceNumber && cn.invoiceNumber.startsWith('CN-'))) &&
      cn.status !== InvoiceStatus.Cancelled &&
      (
        (cn.referenceInvoiceId && cn.referenceInvoiceId === inv.id) ||
        (cn.referenceInvoiceNumber && cn.referenceInvoiceNumber.trim().toLowerCase() === inv.invoiceNumber.trim().toLowerCase())
      )
    );

    // 2. Build cumulative returned quantities per item/line
    const returnedQtyMap = new Map<string, number>();
    creditNotes.forEach(cn => {
      if (cn.lines && cn.lines.length > 0) {
        cn.lines.forEach((l: any) => {
          const key = (l.itemId && l.itemId !== '00000000-0000-0000-0000-000000000000')
            ? String(l.itemId).toLowerCase()
            : (l.itemCode || l.itemNameAr || '').trim().toLowerCase();
          if (key) {
            const current = returnedQtyMap.get(key) || 0;
            returnedQtyMap.set(key, current + (Number(l.quantity) || 0));
          }
        });
      }
    });

    // 3. Filter original lines and calculate remaining returnable items & quantities
    const totalOriginalLines = (inv.lines || []).length;
    const remainingItems: InvoiceLineFormItem[] = [];
    let fullyReturnedItemsCount = 0;

    if (inv.lines && inv.lines.length > 0) {
      for (const l of inv.lines) {
        const key = (l.itemId && l.itemId !== '00000000-0000-0000-0000-000000000000')
          ? String(l.itemId).toLowerCase()
          : (l.itemCode || l.itemNameAr || '').trim().toLowerCase();

        const alreadyReturnedQty = returnedQtyMap.get(key) || 0;
        const invoicedQty = Number(l.quantity) || 0;
        const remainingQty = invoicedQty - alreadyReturnedQty;

        if (remainingQty <= 0) {
          fullyReturnedItemsCount++;
          continue; // Item has already been 100% returned in prior credit note!
        }

        const origDisc = Number(l.discount || l.discountAmount || 0);
        const scaledDiscount = invoicedQty > 0 ? (origDisc / invoicedQty) * remainingQty : 0;

        remainingItems.push({
          itemId: l.itemId,
          warehouseCode: l.warehouseCode || this.selectedWarehouse || 'WH-MAIN',
          itemNameAr: l.itemNameAr || l.itemName || '',
          itemNameEn: l.itemNameEn || '',
          itemCode: l.itemCode || '',
          unit: 'قطعة',
          quantity: remainingQty,
          originalQuantity: remainingQty, // The remaining returnable quota
          originalDiscount: Math.round(scaledDiscount * 100) / 100,
          unitPrice: Number(l.unitPrice) || 0,
          discount: Math.round(scaledDiscount * 100) / 100,
          vatRate: l.vatRate ?? l.vatPercent ?? 15,
          vatCategory: l.vatCategory || 'S'
        });
      }
    }

    this.lineItems.set(remainingItems);
    this.generateInvoiceNumber('CN');

    // If all items were already returned
    if (totalOriginalLines > 0 && remainingItems.length === 0) {
      this.selectedOriginalInvoice.set(null);
      this.referenceInvoiceId.set('');
      this.referenceInvoiceNumber.set('');

      Swal.fire({
        icon: 'warning',
        title: this.langService.t('invoices.create.alerts.invoiceFullyReturnedTitle'),
        text: this.langService.t('invoices.create.alerts.invoiceFullyReturnedText', { num: inv.invoiceNumber }),
        confirmButtonColor: '#1e293b',
        confirmButtonText: this.langService.t('invoices.create.alerts.ok')
      });
      return;
    }

    const hasPriorReturns = creditNotes.length > 0;
    const isAr = this.langService.currentLang() === 'ar';
    let noticeHtml = `
      <div style="text-align: ${isAr ? 'right' : 'left'}; direction: ${isAr ? 'rtl' : 'ltr'}; font-family: inherit; font-size: 0.9rem; line-height: 1.6;">
        <p><strong>${isAr ? 'رقم الفاتورة الأصلية:' : 'Original Invoice #:'}</strong> <span style="color:#1e293b; font-weight:bold;">${inv.invoiceNumber}</span></p>
        <p><strong>${isAr ? 'العميل:' : 'Customer:'}</strong> ${inv.customerName}</p>
        <p><strong>${isAr ? 'الأصناف المتبقية للإرجاع:' : 'Remaining returnable items:'}</strong> ${remainingItems.length}</p>
    `;

    if (hasPriorReturns) {
      noticeHtml += `
        <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px; margin-top:8px; color:#1e293b; font-size:0.83rem;">
          ℹ️ ${isAr
            ? `<strong>تم رصد إرجاع سابق:</strong> يوجد <strong>${creditNotes.length}</strong> إشعار دائن سابق مرتبط بهذه الفاتورة. تم تلقائياً استبعاد الأصناف المرتجعة كلياً وخصم الكميات المرتجعة مسبقاً.`
            : `<strong>Prior returns detected:</strong> Found <strong>${creditNotes.length}</strong> existing credit note(s). Fully returned items and quantities were automatically adjusted.`}
        </div>
      `;
    } else {
      noticeHtml += `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; margin-top:8px; color:#475569; font-size:0.83rem;">
          💡 ${isAr
            ? '<strong>تعليمات المرتجع:</strong> يمكنك الآن إلغاء أي صنف لم يتم إرجاعه بالنقر على «إلغاء الصنف ❌»، أو تخفيض الكمية المرتجعة.'
            : '<strong>Return Instructions:</strong> You can remove any item not being returned by clicking «Cancel Item ❌», or adjust the returned quantity.'}
        </div>
      `;
    }

    noticeHtml += `</div>`;

    Swal.fire({
      icon: 'success',
      title: this.langService.t('invoices.create.alerts.fetchOriginalSuccessTitle'),
      html: noticeHtml,
      confirmButtonColor: '#1e293b',
      confirmButtonText: this.langService.t('invoices.create.alerts.continueReturnBtn')
    });
  }

  cancelReturnOfLine(index: number): void {
    const item = this.lineItems()[index];
    this.removeLine(index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onReturnQuantityChange(line: InvoiceLineFormItem, newQty: any): void {
    let parsed = Number(newQty);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    const max = line.originalQuantity || 999999;

    if (parsed > max) {
      parsed = max;
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('invoices.create.alerts.exceedOriginalQtyTitle'),
        text: this.langService.t('invoices.create.alerts.exceedOriginalQtyText', { max }),
        confirmButtonColor: '#1e293b'
      });
    }

    const origQty = line.originalQuantity || line.quantity || 1;
    const origDisc = line.originalDiscount ?? line.discount ?? 0;
    line.quantity = parsed;
    if (origQty > 0 && origDisc > 0) {
      line.discount = Math.round(((origDisc / origQty) * parsed) * 100) / 100;
    }

    // Trigger Angular Signals reactivity so computed signals and row calculations update immediately in real-time
    this.lineItems.update(items => [...items]);
  }

  toggleInvoiceLookupExpand(): void {
    this.isLookupExpanded.update(v => !v);
  }

  switchToCreditNoteMode(): void {
    if (!this.router.url.includes('/credit-notes')) {
      this.router.navigate(['/invoicing/credit-notes/create']);
      return;
    }
    this.isCreditNoteMode.set(true);
    this.isQuotationMode.set(false);
    this.isLookupExpanded.set(false);
    this.transactionType.set(TransactionType.CreditNote);
    this.generateInvoiceNumber('CN');
    this.loadIssuedInvoicesForReturn();
  }

  switchToSalesInvoiceMode(): void {
    if (this.router.url.includes('/credit-notes')) {
      this.router.navigate(['/invoicing/tax-invoices/create']);
      return;
    }
    this.isCreditNoteMode.set(false);
    this.isQuotationMode.set(false);
    this.isLookupExpanded.set(false);
    this.transactionType.set(TransactionType.Invoice);
    this.selectedOriginalInvoice.set(null);
    this.referenceInvoiceId.set('');
    this.referenceInvoiceNumber.set('');
    this.lineItems.set([]);
    this.setCashCustomer();
    this.generateInvoiceNumber('INV');
  }

  toggleCustomBuyerDetails(): void {
    this.customBuyerDetailsVisible.set(!this.customBuyerDetailsVisible());
  }

  loadWarehouses(): void {
    const compId = this.companyContext.activeCompany().id;
    if (!compId) return;

    this.bwService.getWarehouses(compId).subscribe({
      next: (whList) => {
        this.warehouses.set(whList || []);
        if (whList && whList.length > 0 && (!this.selectedWarehouse || this.selectedWarehouse === 'WH-01')) {
          const def = whList.find(w => w.isDefault) || whList[0];
          this.selectedWarehouse = def.code;
        }
      },
      error: (err) => console.error('Failed to load warehouses in invoice create', err)
    });
  }

  loadSalespersons(): void {
    this.salespersonsService.getSalespersons(true).subscribe({
      next: (list) => {
        this.salespersons.set(list || []);
        this.detectCurrentUserSalesperson(list || []);
      },
      error: () => {}
    });
  }

  private detectCurrentUserSalesperson(list: SalespersonDto[]): void {
    const user = this.authService.currentUser();
    if (!user) return;

    // Check if current user is linked to a salesperson
    const matched = list.find(s => s.userId === user.id || (s.userName && s.userName.toLowerCase() === user.userName.toLowerCase()));
    if (matched) {
      this.applySalesperson(matched, true);
    } else if (this.authService.isSalesperson()) {
      // Fallback query by user ID
      this.salespersonsService.getSalespersonByUserId(user.id).subscribe({
        next: (sp) => {
          if (sp) this.applySalesperson(sp, true);
        },
        error: () => {}
      });
    }
  }

  filteredWarehouses = computed(() => {
    const list = this.warehouses();
    const locked = this.isWarehouseLocked();
    const currentWh = this.selectedWarehouse;

    // If locked to salesperson warehouse, ensure that warehouse is in the list
    if (locked && currentWh) {
      const found = list.find(w => w.code === currentWh);
      if (found) return [found];
      return [{
        id: 'locked-wh',
        companyId: '',
        code: currentWh,
        nameAr: this.salesmanName() ? `مستودع ${this.salesmanName()} (${currentWh})` : currentWh,
        nameEn: currentWh,
        isDefault: false,
        isActive: true
      } as WarehouseDto];
    }

    const bCode = this.branchCode();
    const branches = this.companyContext.activeCompany().branches || [];
    const b = branches.find(item => item.code === bCode);

    if (b && list.some(w => w.branchId === b.id || w.branchId === b.code)) {
      return list.filter(w => !w.branchId || w.branchId === b.id || w.branchId === b.code);
    }

    return list;
  });

  applySalesperson(sp: SalespersonDto, isForcedLock: boolean = false): void {
    this.selectedSalespersonId.set(sp.id);
    const spDisplayName = this.langService.currentLang() === 'ar' ? sp.nameAr : (sp.nameEn || sp.nameAr);
    this.selectedSalespersonName.set(spDisplayName);
    this.salesmanName.set(spDisplayName);
    this.salesmanCode.set(sp.code);

    // 1. Warehouse setup & guarantee option existence in select
    const targetWhCode = sp.warehouseCode || 'WH-MAIN';
    this.selectedWarehouse = targetWhCode;
    this.isWarehouseLocked.set(isForcedLock || !!sp.warehouseCode);
    this.assignedWarehouseNotice.set(
      `مستودع مخصص للبائع: ${sp.warehouseNameAr || targetWhCode} (${targetWhCode}) - وصول محمي`
    );

    // Ensure target warehouse is present in warehouses() signal so <select> displays its label
    if (!this.warehouses().some(w => w.code === targetWhCode)) {
      this.warehouses.update(list => [
        ...list,
        {
          id: sp.id,
          companyId: sp.companyId,
          code: targetWhCode,
          nameAr: sp.warehouseNameAr || targetWhCode,
          nameEn: targetWhCode,
          branchId: sp.branchId,
          isDefault: false,
          isActive: true
        } as WarehouseDto
      ]);
    }

    // 2. Link & Sync Branch to Salesperson / Warehouse
    const branches = this.companyContext.activeCompany().branches || [];
    let matchedBranch = null;

    if (sp.branchId) {
      matchedBranch = branches.find(b => b.id === sp.branchId || b.code === sp.branchId);
    }
    if (!matchedBranch && targetWhCode) {
      const wh = this.warehouses().find(w => w.code === targetWhCode);
      if (wh && wh.branchId) {
        matchedBranch = branches.find(b => b.id === wh.branchId || b.code === wh.branchId);
      }
    }

    if (matchedBranch) {
      this.branchCode.set(matchedBranch.code);
      this.branchName.set(matchedBranch.nameAr);
      this.branchNameEn.set(matchedBranch.nameEn);
    }

    // 3. Lock line items warehouse to salesperson warehouse
    this.lineItems.update(lines => lines.map(l => ({ ...l, warehouseCode: targetWhCode })));
  }

  onBranchChange(bCode: string): void {
    if (this.isWarehouseLocked()) return; // Cannot change if locked to salesperson
    this.branchCode.set(bCode);
    const branches = this.companyContext.activeCompany().branches || [];
    const b = branches.find(item => item.code === bCode);
    if (b) {
      this.branchName.set(b.nameAr);
      this.branchNameEn.set(b.nameEn);
    }

    // Synchronize default warehouse for this branch
    const branchWhs = this.warehouses().filter(w => !w.branchId || w.branchId === b?.id || w.branchId === bCode);
    if (branchWhs.length > 0) {
      const def = branchWhs.find(w => w.isDefault) || branchWhs[0];
      this.selectedWarehouse = def.code;
    }
  }

  onSalespersonChange(salespersonId: string): void {
    if (!salespersonId) {
      this.selectedSalespersonId.set('');
      this.selectedSalespersonName.set('');
      this.salesmanName.set('');
      this.salesmanCode.set('');
      this.isWarehouseLocked.set(false);
      this.assignedWarehouseNotice.set('');
      return;
    }

    const sp = this.salespersons().find(s => s.id === salespersonId);
    if (sp) {
      this.applySalesperson(sp, false);
    }
  }

  loadItems(): void {
    this.purchasingService.getItems().subscribe({
      next: (items) => this.availableItems.set(items || []),
      error: () => {}
    });
  }

  generateInvoiceNumber(prefix?: string): void {
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const pfx = prefix || (this.isQuotationMode() ? 'QUO' : (this.transactionType() === TransactionType.CreditNote ? 'CN' : (this.invoiceType() === InvoiceType.SimplifiedTaxInvoice ? 'SIMP' : 'INV')));
    this.invoiceNumber.set(`${pfx}-${year}-${randomSeq}`);
  }

  loadPartners(): void {
    this.isLoadingPartners.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/api/partners?type=1`).subscribe({
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
      },
      error: () => {
        this.isLoadingPartners.set(false);
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
    this.customerCode.set('CUST-CASH');
    this.buyerName.set('عميل نقدي عام');
    this.buyerNameEn.set('Cash Customer');
    this.buyerPhone.set('');
    this.buyerVatNumber.set('');
    this.buyerOtherIdType.set('CRN');
    this.buyerOtherIdValue.set('');
    this.buyerStreet.set('طريق الملك فهد');
    this.buyerBuildingNumber.set('1234');
    this.buyerPlotIdentification.set('2134');
    this.buyerCitySubdivisionName.set('حي العليا');
    this.buyerCity.set('الرياض');
    this.buyerPostalCode.set('12211');
    this.buyerCountryCode.set('SA');
    this.buyerAddress.set('مبنى 1234، طريق الملك فهد، حي العليا، الرياض 12211، المملكة العربية السعودية');
  }

  saveInvoice(autoIssue: boolean = false): void {
    if (this.isCreditNoteMode()) {
      if (!this.referenceInvoiceNumber().trim()) {
        Swal.fire({
          icon: 'warning',
          title: this.langService.t('invoices.create.alerts.originalInvoiceRequired'),
          text: this.langService.t('invoices.create.alerts.originalInvoiceRequiredText'),
          confirmButtonColor: '#1e293b'
        });
        return;
      }
    }

    const bName = this.buyerName().trim();
    if (!bName) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('invoices.create.alerts.customerRequired'),
        text: this.langService.t('invoices.create.alerts.customerRequiredText'),
        confirmButtonColor: '#334155'
      });
      return;
    }

    const activeItems = this.lineItems().filter(l => l.itemNameAr.trim() || (Number(l.unitPrice) || 0) > 0);

    if (activeItems.length === 0 || activeItems.some(l => !l.itemNameAr.trim() || Number(l.unitPrice) < 0)) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('invoices.create.alerts.itemsDataIncompleteTitle'),
        text: this.isCreditNoteMode() 
          ? this.langService.t('invoices.create.alerts.creditNoteAtLeastOneItem')
          : this.langService.t('invoices.create.alerts.itemsValidNameAndPrice'),
        confirmButtonColor: '#334155'
      });
      return;
    }

    this.executeSave(autoIssue, activeItems);
  }

  private executeSave(autoIssue: boolean, activeItems: InvoiceLineFormItem[]): void {
    this.isSubmitting.set(true);

    const user = this.authService.currentUser();
    const issuer = user ? (user.fullNameAr || user.fullNameEn || user.userName) : 'المستخدم';
    const targetWarehouse = this.selectedWarehouse || 'WH-MAIN';
    const isQuotation = this.isQuotationMode() || this.router.url.includes('/quotations');

    const payload: CreateInvoiceRequest = {
      customerId: this.selectedPartnerId() && this.selectedPartnerId() !== 'cash' ? this.selectedPartnerId() : undefined,
      salespersonId: this.selectedSalespersonId() || undefined,
      salespersonName: this.selectedSalespersonName() || this.salesmanName() || undefined,
      warehouseCode: targetWarehouse,
      createdBy: issuer,
      invoiceType: Number(this.invoiceType()),
      transactionType: isQuotation ? TransactionType.Quotation : Number(this.transactionType()),
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
      customerAddress: this.buyerAddress() || undefined,
      paymentMeansCode: this.paymentMeansCode(),
      notes: this.notes() || this.buyerAddress() || undefined,
      referenceInvoiceId: this.isCreditNoteMode() ? (this.referenceInvoiceId() || undefined) : undefined,
      referenceInvoiceNumber: this.isCreditNoteMode() ? (this.referenceInvoiceNumber() || undefined) : undefined,
      modificationReason: this.isCreditNoteMode() ? (this.returnReason() || 'إرجاع بضاعة من العميل') : undefined,
      autoIssueAndPost: isQuotation ? false : autoIssue,
      lines: activeItems.map(l => ({
        itemId: l.itemId || undefined,
        warehouseCode: targetWarehouse,
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
        const isReturn = this.isCreditNoteMode();
        const title = isReturn
          ? (autoIssue ? this.langService.t('invoices.create.alerts.creditNoteIssuedZatca') : this.langService.t('invoices.create.alerts.creditNoteDraftSaved'))
          : isQuotation
          ? this.langService.t('invoices.create.alerts.quotationSaved')
          : (autoIssue ? this.langService.t('invoices.create.alerts.invoiceIssuedZatca') : this.langService.t('invoices.create.alerts.invoiceSaved'));

        const msg = isReturn
          ? this.langService.t('invoices.create.alerts.creditNoteSavedMsg', { num: created.invoiceNumber, ref: this.referenceInvoiceNumber() })
          : isQuotation
          ? this.langService.t('invoices.create.alerts.quotationSavedMsg', { num: created.invoiceNumber })
          : this.langService.t('invoices.create.alerts.invoiceSavedMsg', { num: created.invoiceNumber });

        Swal.fire({
          icon: 'success',
          title,
          text: msg,
          confirmButtonColor: '#1e293b',
          confirmButtonText: this.langService.t('invoices.create.alerts.ok')
        }).then(() => {
          if (this.isQuotationMode() || this.router.url.includes('/quotations')) {
            this.router.navigate(['/invoicing/quotations']);
          } else if (isReturn || this.router.url.includes('/credit-notes')) {
            this.router.navigate(['/invoicing/credit-notes']);
          } else {
            this.router.navigate(['/invoicing/tax-invoices']);
          }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('invoices.create.alerts.saveFailedTitle'),
          text: err?.error?.description || err?.error?.message || this.langService.t('invoices.create.alerts.saveFailedText'),
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }
}
