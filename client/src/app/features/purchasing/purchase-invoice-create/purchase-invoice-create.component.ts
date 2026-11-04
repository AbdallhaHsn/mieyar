import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PurchasingService, ItemDto, CreatePurchaseInvoiceRequest } from '../../../core/services/purchasing.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { BranchesWarehousesService, BranchDto, WarehouseDto } from '../../../core/services/branches-warehouses.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { ModulesSettingsService } from '../../../core/services/modules-settings.service';
import { tafqeet } from '../../../core/utils/tafqeet';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto } from '../../../core/models/account.model';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

interface VendorOption {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  taxNumber?: string;
  commercialRegistration?: string;
  glAccountId?: string;
}

interface CostCenterOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
}

interface InvoiceLineRow {
  itemId: string;
  itemNameAr: string;
  itemNameEn?: string;
  warehouseCode: string;
  unitOfMeasure: string;
  accountId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  vatRate: number;
  costCenterId?: string;
}

@Component({
  selector: 'app-purchase-invoice-create',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule, SearchableSelectComponent, TranslatePipe],
  templateUrl: './purchase-invoice-create.component.html',
  styleUrls: ['./purchase-invoice-create.component.scss']
})
export class PurchaseInvoiceCreateComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private purchasingService = inject(PurchasingService);
  public companyContext = inject(CompanyContextService);
  private bwService = inject(BranchesWarehousesService);
  langService = inject(LanguageService);
  private translator = inject(AccountingTranslatorService);
  public modulesSettings = inject(ModulesSettingsService);
  private coaService = inject(ChartOfAccountsService);

  defaultInventoryAccountId = signal<string>('');
  branches = signal<BranchDto[]>([]);
  warehouses = signal<WarehouseDto[]>([]);

  purchaseOrderId: string | null = null;
  goodsReceiptNoteId: string | null = null;
  goodsReceiptNoteNumber: string = '';

  lineItemBgTranslation: string = '';

  onLineItemNameArChange(val: string) {
    if (!val) {
      this.lineForm.itemNameAr = '';
      this.lineForm.itemNameEn = '';
      this.lineItemBgTranslation = '';
      return;
    }
    const isAr = this.translator.containsArabic(val);
    if (isAr) {
      this.lineForm.itemNameAr = val;
      const instant = this.translator.translateArabicToEnglish(val);
      this.lineForm.itemNameEn = instant;
      this.lineItemBgTranslation = `English: ${instant}`;
      this.translator.translateWithOnlineRefinement(
        val,
        () => {},
        (refined) => {
          if (refined) {
            this.lineForm.itemNameEn = refined;
            this.lineItemBgTranslation = `English: ${refined}`;
          }
        }
      );
    } else {
      this.lineForm.itemNameEn = val;
      const instant = this.translator.translateEnglishToArabic(val);
      this.lineForm.itemNameAr = instant;
      this.lineItemBgTranslation = `${this.langService.t('purchasing.invoiceCreate.arabicPrefix')}${instant}`;
      this.translator.translateOnline(val, 'en', 'ar').then(refined => {
        if (refined) {
          this.lineForm.itemNameAr = refined;
          this.lineItemBgTranslation = `${this.langService.t('purchasing.invoiceCreate.arabicPrefix')}${refined}`;
        }
      });
    }
  }

  forceRetranslateLineItem() {
    const val = this.lineForm.itemNameAr || this.lineForm.itemNameEn;
    if (val) {
      this.onLineItemNameArChange(val);
    }
  }

  // Reference Data Signals
  vendors = signal<VendorOption[]>([]);
  itemsMaster = signal<ItemDto[]>([]);
  costCenters = signal<CostCenterOption[]>([]);
  isSubmitting = signal<boolean>(false);

  vendorOptions = computed<SelectOption[]>(() => {
    const currentLang = this.langService.currentLang();
    return this.vendors().map(v => {
      const name = currentLang === 'ar' ? v.nameAr : (v.nameEn || v.nameAr);
      const sub = v.nameEn && currentLang === 'ar'
        ? v.nameEn
        : (v.commercialRegistration ? `${this.langService.t('purchasing.invoiceCreate.crPrefix')}${v.commercialRegistration}` : (v.taxNumber ? `${this.langService.t('purchasing.invoiceCreate.vatPrefix')}${v.taxNumber}` : undefined));
      return {
        value: v.id,
        label: `${v.code} - ${name}`,
        sublabel: sub,
        code: v.code,
        icon: 'pi pi-truck'
      };
    });
  });

  catalogItemOptions = computed<SelectOption[]>(() => {
    const currentLang = this.langService.currentLang();
    const list: SelectOption[] = [
      {
        value: '',
        label: this.langService.t('purchasing.invoiceCreate.manualEntryOption'),
        icon: 'pi pi-pencil'
      }
    ];

    for (const itm of this.itemsMaster()) {
      const name = currentLang === 'ar' ? itm.nameAr : (itm.nameEn || itm.nameAr);
      list.push({
        value: itm.id,
        label: `${itm.itemCode} - ${name}`,
        sublabel: `${this.langService.t('purchasing.invoiceCreate.costPricePrefix')}${itm.costPrice || 0} ${this.langService.t('purchasing.invoiceCreate.sar')} | ${this.langService.t('purchasing.invoiceCreate.unitPrefix')}${itm.unitOfMeasure || this.langService.t('purchasing.invoiceCreate.defaultPieceUnit')}`,
        code: itm.itemCode,
        icon: 'pi pi-box'
      });
    }

    return list;
  });

  // Available Units
  availableUnits = ['Piece', 'Carton', 'Set', 'Ton', 'Meter', 'KG', 'Liter', 'Service', 'Hour'];

  // Form Controls
  purchaseType = 'LocalGoods';
  invoiceNumber = signal<string>('PINV-' + new Date().getFullYear() + '-00001');
  issueDate = new Date().toISOString().substring(0, 10);
  supplyDate = new Date().toISOString().substring(0, 10);
  dueDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().substring(0, 10);

  selectedVendorId = '';
  vendorInvoiceNumber = '';
  paymentMethod = 'Credit';
  selectedBranch = 'Main';
  selectedWarehouse = 'WH-01';
  poNumber = '';
  selectedCostCenterId = '';
  currency = 'SAR';
  exchangeRateToSar = 1.0;
  notes = '';

  // Lines Signal
  lines = signal<InvoiceLineRow[]>([]);

  // Line Modal Popup State
  showLineModal = signal<boolean>(false);
  editingIndex = signal<number | null>(null);

  lineForm: InvoiceLineRow = {
    itemId: '',
    itemNameAr: '',
    itemNameEn: '',
    warehouseCode: 'WH-01',
    unitOfMeasure: 'Piece',
    accountId: '',
    quantity: 1,
    unitPrice: 0,
    discountAmount: 0,
    vatRate: 15
  };

  selectedVendor = computed(() => {
    return this.vendors().find(v => v.id === this.selectedVendorId) || null;
  });

  // Calculations
  subTotal = computed(() => {
    return this.lines().reduce((acc, l) => acc + (Number(l.quantity || 0) * Number(l.unitPrice || 0)), 0);
  });

  totalDiscount = computed(() => {
    return this.lines().reduce((acc, l) => acc + Number(l.discountAmount || 0), 0);
  });

  taxableTotal = computed(() => {
    return this.lines().reduce((acc, l) => acc + this.getLineTaxable(l), 0);
  });

  vatTotal = computed(() => {
    return this.lines().reduce((acc, l) => acc + this.getLineVat(l), 0);
  });

  grandTotal = computed(() => {
    return this.taxableTotal() + this.vatTotal();
  });

  tafqeetStr = computed(() => {
    return tafqeet(this.grandTotal());
  });

  ngOnInit() {
    this.generateInvoiceNumber();
    this.loadVendors();
    this.loadItemsMaster();
    this.loadCostCenters();
    this.loadBranchesAndWarehouses();
    this.loadDefaultInventoryAccount();

    this.route.queryParams.subscribe(params => {
      if (params['vendorId']) {
        this.selectedVendorId = params['vendorId'];
      }
      if (params['poId']) {
        this.purchaseOrderId = params['poId'];
        this.poNumber = params['poNumber'] || '';
        this.loadOrderLines(params['poId']);
      }
      if (params['grnId']) {
        this.goodsReceiptNoteId = params['grnId'];
        this.goodsReceiptNoteNumber = params['grnNumber'] || '';
        if (!this.vendorInvoiceNumber) {
          this.vendorInvoiceNumber = params['grnNumber'] ? `INV-${params['grnNumber']}` : '';
        }
        this.loadGrnLines(params['grnId']);
      }
    });
  }

  loadOrderLines(poId: string) {
    this.purchasingService.getOrderById(poId).subscribe({
      next: (order) => {
        if (order && order.lines) {
          if (order.vendorId) {
            this.selectedVendorId = order.vendorId;
          }
          this.lines.set(order.lines.map(l => ({
            itemId: l.itemId || '',
            itemNameAr: l.itemNameAr,
            itemNameEn: l.itemNameEn,
            warehouseCode: l.warehouseCode || this.selectedWarehouse,
            unitOfMeasure: l.unitOfMeasure || 'Piece',
            accountId: l.accountId || this.defaultInventoryAccountId(),
            quantity: (l.quantityOrdered - l.quantityBilled > 0) ? (l.quantityOrdered - l.quantityBilled) : l.quantityOrdered,
            unitPrice: l.unitPrice,
            discountAmount: l.discountAmount || 0,
            vatRate: l.vatRate || 15
          })));
        }
      }
    });
  }

  loadGrnLines(grnId: string) {
    this.purchasingService.getGoodsReceiptById(grnId).subscribe({
      next: (grn) => {
        if (grn && grn.lines) {
          if (grn.vendorId) {
            this.selectedVendorId = grn.vendorId;
          }
          this.lines.set(grn.lines.map(l => ({
            itemId: l.itemId || '',
            itemNameAr: l.itemNameAr,
            itemNameEn: l.itemNameEn,
            warehouseCode: l.warehouseCode || this.selectedWarehouse,
            unitOfMeasure: l.unitOfMeasure || 'Piece',
            accountId: this.defaultInventoryAccountId(),
            quantity: l.quantityAccepted,
            unitPrice: l.unitCost,
            discountAmount: 0,
            vatRate: 15
          })));
        }
      }
    });
  }

  loadDefaultInventoryAccount() {
    this.coaService.loadAccountsTree().subscribe(tree => {
      const flattened: AccountDto[] = [];
      const flatten = (nodes: AccountDto[]) => {
        for (const n of nodes) {
          flattened.push(n);
          if (n.subAccounts?.length) flatten(n.subAccounts);
        }
      };
      flatten(tree || []);
      const invAcc = flattened.find(a => a.accountCode === '11301' || a.accountCode.startsWith('11301'))
                  || flattened.find(a => a.accountCode.startsWith('113') && a.isPostable);
      if (invAcc) {
        this.defaultInventoryAccountId.set(invAcc.id);
        if (!this.lineForm.accountId) {
          this.lineForm.accountId = invAcc.id;
        }
      }
    });
  }

  generateInvoiceNumber() {
    this.purchasingService.getPurchaseInvoices().subscribe({
      next: (existing) => {
        const year = new Date().getFullYear();
        const prefix = `PINV-${year}-`;
        let maxSeq = 0;
        for (const inv of existing) {
          if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
            const parts = inv.invoiceNumber.split('-');
            if (parts.length >= 3) {
              const seq = parseInt(parts[2], 10);
              if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
              }
            }
          }
        }
        const next = String(maxSeq + 1).padStart(5, '0');
        this.invoiceNumber.set(`${prefix}${next}`);
      },
      error: () => {
        const rand = Math.floor(1000 + Math.random() * 9000);
        this.invoiceNumber.set(`PINV-${new Date().getFullYear()}-${rand}`);
      }
    });
  }

  loadVendors() {
    this.http.get<any[]>(`${environment.apiUrl}/api/partners?partnerType=2`).subscribe({
      next: (res) => {
        const list = (res || []).map(p => ({
          id: p.id,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          code: p.code,
          taxNumber: p.taxNumber,
          commercialRegistration: p.commercialRegistration,
          glAccountId: p.glAccountId
        }));
        this.vendors.set(list);
        if (list.length > 0) {
          this.selectedVendorId = list[0].id;
        }
      }
    });
  }

  loadItemsMaster() {
    this.purchasingService.getItems(undefined, undefined, true).subscribe({
      next: (res) => {
        this.itemsMaster.set(res || []);
      }
    });
  }

  loadCostCenters() {
    this.http.get<any[]>(`${environment.apiUrl}/api/financial-settings/cost-centers`).subscribe({
      next: (res) => {
        const list = (res || []).map(c => ({
          id: c.id,
          code: c.code,
          nameAr: c.nameAr,
          nameEn: c.nameEn
        }));
        this.costCenters.set(list);
      },
      error: () => {}
    });
  }

  loadBranchesAndWarehouses(): void {
    const compId = this.companyContext.activeCompany().id;
    if (!compId) return;

    this.bwService.getBranches(compId).subscribe({
      next: (bList) => {
        this.branches.set(bList || []);
        if (bList && bList.length > 0 && (!this.selectedBranch || this.selectedBranch === 'Main')) {
          const main = bList.find(b => b.isMainBranch) || bList[0];
          this.selectedBranch = main.code;
        }
      }
    });

    this.bwService.getWarehouses(compId).subscribe({
      next: (whList) => {
        this.warehouses.set(whList || []);
        if (whList && whList.length > 0) {
          const def = whList.find(w => w.isDefault) || whList[0];
          if (!this.selectedWarehouse || this.selectedWarehouse === 'WH-01') {
            this.selectedWarehouse = def.code;
            this.lineForm.warehouseCode = def.code;
          }
        }
      }
    });
  }

  onVendorChange() {
    // Computes selectedVendor
  }

  onPaymentMethodChange() {
    if (this.paymentMethod === 'Cash') {
      this.dueDate = this.issueDate;
    } else {
      this.dueDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().substring(0, 10);
    }
  }

  // Line Item Modal Workflows
  openAddLineModal() {
    this.editingIndex.set(null);
    const defaultTax = this.modulesSettings.purchasingSettings().defaultPurchaseTaxRate ?? 15;
    this.lineForm = {
      itemId: '',
      itemNameAr: '',
      itemNameEn: '',
      warehouseCode: this.selectedWarehouse || 'WH-01',
      unitOfMeasure: 'Piece',
      accountId: this.defaultInventoryAccountId(),
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      vatRate: defaultTax
    };
    this.showLineModal.set(true);
  }

  openEditLineModal(index: number) {
    this.editingIndex.set(index);
    const item = this.lines()[index];
    this.lineForm = { ...item };
    this.showLineModal.set(true);
  }

  closeLineModal() {
    this.showLineModal.set(false);
    this.editingIndex.set(null);
  }

  onModalItemSelect() {
    const itm = this.itemsMaster().find(i => i.id === this.lineForm.itemId);
    if (itm) {
      this.lineForm.itemNameAr = itm.nameAr;
      this.lineForm.itemNameEn = itm.nameEn || '';
      this.lineForm.unitPrice = itm.purchasePrice || itm.costPrice || 0;
      this.lineForm.unitOfMeasure = itm.unitOfMeasure || 'Piece';
      this.lineForm.accountId = itm.inventoryAccountId || this.defaultInventoryAccountId();
    }
  }

  saveModalLine(andContinue: boolean = false) {
    if (!this.lineForm.itemNameAr || !this.lineForm.itemNameAr.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.invoiceCreate.alerts.itemNameRequiredTitle'),
        text: this.langService.t('purchasing.invoiceCreate.alerts.itemNameRequiredText')
      });
      return;
    }

    if (Number(this.lineForm.quantity || 0) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.invoiceCreate.alerts.invalidQtyTitle'),
        text: this.langService.t('purchasing.invoiceCreate.alerts.invalidQtyText')
      });
      return;
    }

    const payload: InvoiceLineRow = {
      ...this.lineForm,
      quantity: Number(this.lineForm.quantity || 1),
      unitPrice: Number(this.lineForm.unitPrice || 0),
      discountAmount: Number(this.lineForm.discountAmount || 0),
      vatRate: Number(this.lineForm.vatRate || 15)
    };

    const idx = this.editingIndex();
    if (idx !== null && idx >= 0) {
      this.lines.update(arr => {
        const copy = [...arr];
        copy[idx] = payload;
        return copy;
      });
      this.closeLineModal();
    } else {
      this.lines.update(arr => [...arr, payload]);
      if (andContinue) {
        // Reset form for next item and keep modal open
        this.lineForm = {
          itemId: '',
          itemNameAr: '',
          itemNameEn: '',
          warehouseCode: this.selectedWarehouse || 'WH-01',
          unitOfMeasure: 'Piece',
          accountId: this.defaultInventoryAccountId(),
          quantity: 1,
          unitPrice: 0,
          discountAmount: 0,
          vatRate: 15
        };
      } else {
        this.closeLineModal();
      }
    }
  }

  removeLine(index: number) {
    this.lines.update(arr => arr.filter((_, idx) => idx !== index));
  }

  get modalTaxable(): number {
    const gross = (Number(this.lineForm.quantity || 0) * Number(this.lineForm.unitPrice || 0));
    const taxable = gross - Number(this.lineForm.discountAmount || 0);
    return taxable > 0 ? Math.round(taxable * 100) / 100 : 0;
  }

  get modalVat(): number {
    return Math.round(this.modalTaxable * (Number(this.lineForm.vatRate || 0) / 100) * 100) / 100;
  }

  get modalTotal(): number {
    return Math.round((this.modalTaxable + this.modalVat) * 100) / 100;
  }

  getWarehouseName(code: string): string {
    switch (code) {
      case 'WH-01': return this.langService.t('purchasing.invoiceCreate.warehouses.wh01');
      case 'WH-02': return this.langService.t('purchasing.invoiceCreate.warehouses.wh02');
      case 'WH-03': return this.langService.t('purchasing.invoiceCreate.warehouses.wh03');
      case 'WH-04': return this.langService.t('purchasing.invoiceCreate.warehouses.wh04');
      default: return code || this.langService.t('purchasing.invoiceCreate.warehouses.mainDefault');
    }
  }

  getItemCode(itemId: string): string {
    const itm = this.itemsMaster().find(i => i.id === itemId);
    return itm ? itm.itemCode : '';
  }

  getLineTaxable(line: InvoiceLineRow): number {
    const gross = (Number(line.quantity || 0) * Number(line.unitPrice || 0));
    const taxable = gross - Number(line.discountAmount || 0);
    return taxable > 0 ? Math.round(taxable * 100) / 100 : 0;
  }

  getLineVat(line: InvoiceLineRow): number {
    const taxable = this.getLineTaxable(line);
    return Math.round(taxable * (Number(line.vatRate || 0) / 100) * 100) / 100;
  }

  getLineTotal(line: InvoiceLineRow): number {
    return Math.round((this.getLineTaxable(line) + this.getLineVat(line)) * 100) / 100;
  }

  submitInvoice(autoPost: boolean = false) {
    if (!this.selectedVendorId) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('purchasing.invoiceCreate.alerts.selectSupplierFirst')
      });
      return;
    }

    if (!this.vendorInvoiceNumber || !this.vendorInvoiceNumber.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.invoiceCreate.alerts.supplierInvoiceNumberRequiredTitle'),
        text: this.langService.t('purchasing.invoiceCreate.alerts.supplierInvoiceNumberRequiredText')
      });
      return;
    }

    const validLines = this.lines().filter(l => l.itemNameAr && l.itemNameAr.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.invoiceCreate.alerts.noValidLinesTitle'),
        text: this.langService.t('purchasing.invoiceCreate.alerts.noValidLinesText')
      });
      return;
    }

    this.isSubmitting.set(true);

    const fullNotes = [
      this.notes ? this.notes.trim() : '',
      this.poNumber ? `${this.langService.t('purchasing.invoiceCreate.poPrefix')}${this.poNumber.trim()}` : '',
      `${this.langService.t('purchasing.invoiceCreate.whPrefix')}${this.selectedWarehouse}`,
      `${this.langService.t('purchasing.invoiceCreate.branchPrefix')}${this.selectedBranch}`
    ].filter(x => !!x).join(' | ');

    const payload: CreatePurchaseInvoiceRequest = {
      vendorId: this.selectedVendorId,
      vendorInvoiceNumber: this.vendorInvoiceNumber.trim(),
      issueDate: this.issueDate,
      dueDate: this.dueDate || undefined,
      currency: this.currency,
      exchangeRateToSar: this.exchangeRateToSar,
      notes: fullNotes,
      autoPost: autoPost,
      purchaseOrderId: this.purchaseOrderId || undefined,
      purchaseOrderNumber: this.poNumber ? this.poNumber.trim() : undefined,
      goodsReceiptNoteId: this.goodsReceiptNoteId || undefined,
      goodsReceiptNoteNumber: this.goodsReceiptNoteNumber ? this.goodsReceiptNoteNumber.trim() : undefined,
      lines: validLines.map(l => ({
        itemId: l.itemId || undefined,
        itemNameAr: l.itemNameAr.trim(),
        itemNameEn: l.itemNameEn ? l.itemNameEn.trim() : undefined,
        accountId: l.accountId || this.defaultInventoryAccountId(),
        costCenterId: this.selectedCostCenterId || undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        discountAmount: Number(l.discountAmount || 0),
        vatRate: Number(l.vatRate || 15)
      }))
    };

    this.purchasingService.createPurchaseInvoice(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        const msg = autoPost
          ? this.langService.t('purchasing.invoiceCreate.alerts.postedSuccessText', {
              invoiceNumber: created.invoiceNumber || '',
              journalEntryNumber: created.associatedJournalEntryNumber || ''
            })
          : this.langService.t('purchasing.invoiceCreate.alerts.draftSuccessText', {
              invoiceNumber: created.invoiceNumber || ''
            });

        Swal.fire({
          icon: 'success',
          title: autoPost
            ? this.langService.t('purchasing.invoiceCreate.alerts.postedSuccessTitle')
            : this.langService.t('purchasing.invoiceCreate.alerts.draftSuccessTitle'),
          text: msg,
          confirmButtonColor: '#059669'
        }).then(() => {
          this.router.navigate(['/purchasing/invoices']);
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('purchasing.invoiceCreate.alerts.saveFailedTitle'),
          text: err?.error?.Description || this.langService.t('purchasing.invoiceCreate.alerts.saveFailedDefault')
        });
      }
    });
  }
}
