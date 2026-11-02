import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  PurchasingService,
  ItemDto,
  PurchaseRequisitionDto,
  PurchaseOrderDto,
  GoodsReceiptNoteDto,
  PurchaseInvoiceDto,
  RequisitionStatus,
  RequisitionPriority,
  PurchaseOrderStatus,
  GoodsReceiptStatus,
  ThreeWayMatchingStatus,
  CreatePurchaseRequisitionRequest,
  CreatePurchaseOrderRequest,
  CreateGoodsReceiptNoteRequest,
  PayPurchaseInvoiceRequest
} from '../../../core/services/purchasing.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { tafqeet } from '../../../core/utils/tafqeet';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

interface PartnerOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  taxNumber?: string;
  commercialRegistration?: string;
}

@Component({
  selector: 'app-procurement-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterModule, TranslatePipe],
  templateUrl: './procurement-hub.component.html',
  styleUrls: ['./procurement-hub.component.scss']
})
export class ProcurementHubComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  public purchasingService = inject(PurchasingService);
  public langService = inject(LanguageService);
  private translator = inject(AccountingTranslatorService);

  // Active Tab: 'overview' | 'requisitions' | 'orders' | 'receipts' | 'invoices'
  activeTab = signal<string>('overview');

  // Loading States
  isLoading = signal<boolean>(false);

  // Datasets
  requisitions = signal<PurchaseRequisitionDto[]>([]);
  orders = signal<PurchaseOrderDto[]>([]);
  receipts = signal<GoodsReceiptNoteDto[]>([]);
  invoices = signal<PurchaseInvoiceDto[]>([]);
  itemsMaster = signal<ItemDto[]>([]);
  vendors = signal<PartnerOption[]>([]);

  // Search & Filters
  searchRequisitions = '';
  filterRequisitionStatus: number | null = null;

  searchOrders = '';
  filterOrderStatus: number | null = null;

  searchReceipts = '';
  searchInvoices = '';

  // Quick Stats
  pendingRequisitionsCount = computed(() => this.requisitions().filter(r => r.status === RequisitionStatus.Draft || r.status === RequisitionStatus.Submitted).length);
  openOrdersCount = computed(() => this.orders().filter(o => o.status === PurchaseOrderStatus.Confirmed || o.status === PurchaseOrderStatus.PartiallyReceived).length);
  unbilledReceiptsCount = computed(() => this.receipts().filter(r => r.status === GoodsReceiptStatus.Accepted).length);
  totalOrdersValue = computed(() => this.orders().filter(o => o.status !== PurchaseOrderStatus.Cancelled).reduce((sum, o) => sum + o.totalAmount, 0));
  threeWayMatchedCount = computed(() => this.invoices().filter(i => i.matchingStatus === ThreeWayMatchingStatus.Matched).length);

  // --- MODAL STATES ---
  showCreatePrModal = signal<boolean>(false);
  showCreatePoModal = signal<boolean>(false);
  showCreateGrnModal = signal<boolean>(false);
  showDetailsModal = signal<boolean>(false);
  showPaymentModal = signal<boolean>(false);

  // Active Details Item
  selectedDetailsType: 'pr' | 'po' | 'grn' | 'invoice' = 'pr';
  selectedPr: PurchaseRequisitionDto | null = null;
  selectedPo: PurchaseOrderDto | null = null;
  selectedGrn: GoodsReceiptNoteDto | null = null;
  selectedInvoice: PurchaseInvoiceDto | null = null;

  // --- NEW PR FORM ---
  prForm = {
    title: '',
    departmentName: 'قسم المشتريات والعمليات',
    requesterName: 'مسؤول المشتريات',
    requestDate: new Date().toISOString().substring(0, 10),
    requiredByDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().substring(0, 10),
    priority: RequisitionPriority.Normal,
    reason: '',
    lines: [
      {
        itemId: '',
        itemCode: '',
        itemNameAr: '',
        itemNameEn: '',
        unitOfMeasure: 'حبة',
        quantityRequested: 1,
        estimatedUnitPrice: 0,
        warehouseCode: 'WH-01',
        notes: ''
      }
    ]
  };

  // --- NEW PO FORM ---
  poForm = {
    vendorId: '',
    requisitionId: '',
    requisitionNumber: '',
    orderDate: new Date().toISOString().substring(0, 10),
    expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().substring(0, 10),
    paymentTerms: 'آجل 30 يوم',
    currency: 'SAR',
    exchangeRateToSar: 1.0,
    branchCode: 'Main',
    warehouseCode: 'WH-01',
    notes: '',
    lines: [
      {
        itemId: '',
        itemCode: '',
        itemNameAr: '',
        itemNameEn: '',
        quantityOrdered: 1,
        unitPrice: 0,
        discountAmount: 0,
        vatRate: 15,
        unitOfMeasure: 'حبة',
        warehouseCode: 'WH-01'
      }
    ]
  };

  // --- NEW GRN FORM ---
  grnForm = {
    purchaseOrderId: '',
    purchaseOrderNumber: '',
    vendorId: '',
    vendorName: '',
    deliveryNoteNumber: '',
    receiptDate: new Date().toISOString().substring(0, 10),
    warehouseCode: 'WH-01',
    receiverName: 'أمين المستودع',
    inspectorName: 'فاحص الجودة',
    notes: '',
    lines: [
      {
        purchaseOrderLineId: '',
        itemId: '',
        itemCode: '',
        itemNameAr: '',
        itemNameEn: '',
        unitOfMeasure: 'حبة',
        quantityOrdered: 0,
        quantityReceived: 1,
        quantityAccepted: 1,
        quantityRejected: 0,
        rejectionReason: '',
        unitCost: 0,
        warehouseCode: 'WH-01'
      }
    ]
  };

  // --- QUICK PAYMENT FORM ---
  paymentForm: PayPurchaseInvoiceRequest = {
    amount: 0,
    paymentDate: new Date().toISOString().substring(0, 10),
    paymentMethod: 'BankTransfer',
    paymentAccountId: 'A56F61A9-272E-4DFF-9DF0-84E3F4C1B81E',
    referenceNumber: '',
    notes: ''
  };

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab.set(params['tab']);
      }
    });

    this.loadAllData();
    this.loadMasterData();
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  loadAllData() {
    this.isLoading.set(true);

    this.purchasingService.getRequisitions().subscribe({
      next: (res) => this.requisitions.set(res || []),
      error: () => {}
    });

    this.purchasingService.getOrders().subscribe({
      next: (res) => this.orders.set(res || []),
      error: () => {}
    });

    this.purchasingService.getGoodsReceipts().subscribe({
      next: (res) => this.receipts.set(res || []),
      error: () => {}
    });

    this.purchasingService.getPurchaseInvoices().subscribe({
      next: (res) => {
        this.invoices.set(res || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadMasterData() {
    this.purchasingService.getItems().subscribe({
      next: (res) => this.itemsMaster.set(res || [])
    });

    this.http.get<PartnerOption[]>(`${environment.apiUrl}/api/partners?type=2`).subscribe({
      next: (res) => {
        this.vendors.set(res || []);
        if (res && res.length > 0 && !this.poForm.vendorId) {
          this.poForm.vendorId = res[0].id;
        }
      }
    });
  }

  get selectedVendorObj(): PartnerOption | undefined {
    return this.vendors().find(v => v.id === this.poForm.vendorId);
  }

  // --- SINGLE ENTRY TRANSLATION HANDLERS (RULE 1 MANDATE - DYNAMIC SMART AUTO-DETECTION) ---
  onPrLineNameChange(line: any, name: string) {
    if (!name || !name.trim()) {
      line.itemNameAr = '';
      line.itemNameEn = '';
      return;
    }
    const isAr = this.translator.containsArabic(name);
    if (isAr) {
      line.itemNameAr = name;
      line.itemNameEn = this.translator.translateArabicToEnglish(name);
      this.translator.translateWithOnlineRefinement(name, () => {}, (refined) => {
        line.itemNameEn = refined;
      });
    } else {
      line.itemNameEn = name;
      line.itemNameAr = this.translator.translateEnglishToArabic(name);
      this.translator.translateOnline(name, 'en', 'ar').then(refined => {
        if (refined) line.itemNameAr = refined;
      });
    }
  }

  onPoLineNameChange(line: any, name: string) {
    if (!name || !name.trim()) {
      line.itemNameAr = '';
      line.itemNameEn = '';
      return;
    }
    const isAr = this.translator.containsArabic(name);
    if (isAr) {
      line.itemNameAr = name;
      line.itemNameEn = this.translator.translateArabicToEnglish(name);
      this.translator.translateWithOnlineRefinement(name, () => {}, (refined) => {
        line.itemNameEn = refined;
      });
    } else {
      line.itemNameEn = name;
      line.itemNameAr = this.translator.translateEnglishToArabic(name);
      this.translator.translateOnline(name, 'en', 'ar').then(refined => {
        if (refined) line.itemNameAr = refined;
      });
    }
  }

  onPrLineNameArChange(line: any, nameAr: string) {
    this.onPrLineNameChange(line, nameAr);
  }

  retranslatePrLine(line: any) {
    const text = line.itemNameAr || line.itemNameEn;
    if (text) this.onPrLineNameChange(line, text);
  }

  onPoLineNameArChange(line: any, nameAr: string) {
    this.onPoLineNameChange(line, nameAr);
  }

  retranslatePoLine(line: any) {
    const text = line.itemNameAr || line.itemNameEn;
    if (text) this.onPoLineNameChange(line, text);
  }

  // Auto-fill from Catalog on Select
  onPrItemSelect(line: any) {
    const item = this.itemsMaster().find(i => i.id === line.itemId);
    if (item) {
      line.itemCode = item.itemCode;
      line.itemNameAr = item.nameAr;
      line.itemNameEn = item.nameEn;
      line.unitOfMeasure = item.unitOfMeasure;
      line.estimatedUnitPrice = item.purchasePrice || item.costPrice;
    }
  }

  onPoItemSelect(line: any) {
    const item = this.itemsMaster().find(i => i.id === line.itemId);
    if (item) {
      line.itemCode = item.itemCode;
      line.itemNameAr = item.nameAr;
      line.itemNameEn = item.nameEn;
      line.unitOfMeasure = item.unitOfMeasure;
      line.unitPrice = item.purchasePrice || item.costPrice;
    }
  }

  // --- REQUISITION ACTIONS ---
  openCreatePr() {
    this.prForm = {
      title: '',
      departmentName: 'قسم المشتريات والعمليات',
      requesterName: 'مسؤول المشتريات',
      requestDate: new Date().toISOString().substring(0, 10),
      requiredByDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().substring(0, 10),
      priority: RequisitionPriority.Normal,
      reason: '',
      lines: [
        {
          itemId: '',
          itemCode: '',
          itemNameAr: '',
          itemNameEn: '',
          unitOfMeasure: 'حبة',
          quantityRequested: 1,
          estimatedUnitPrice: 0,
          warehouseCode: 'WH-01',
          notes: ''
        }
      ]
    };
    this.showCreatePrModal.set(true);
  }

  addPrLine() {
    this.prForm.lines.push({
      itemId: '',
      itemCode: '',
      itemNameAr: '',
      itemNameEn: '',
      unitOfMeasure: 'حبة',
      quantityRequested: 1,
      estimatedUnitPrice: 0,
      warehouseCode: 'WH-01',
      notes: ''
    });
  }

  removePrLine(index: number) {
    if (this.prForm.lines.length > 1) {
      this.prForm.lines.splice(index, 1);
    }
  }

  submitCreatePr() {
    if (!this.prForm.title.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.procurement.alerts.incompleteStatementTitle'),
        text: this.langService.t('purchasing.procurement.alerts.prTitleRequired')
      });
      return;
    }
    const validLines = this.prForm.lines.filter(l => l.itemNameAr.trim() && l.quantityRequested > 0);
    if (validLines.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.procurement.alerts.noLinesTitle'),
        text: this.langService.t('purchasing.procurement.alerts.prLinesRequired')
      });
      return;
    }

    const payload: CreatePurchaseRequisitionRequest = {
      title: this.prForm.title.trim(),
      departmentName: this.prForm.departmentName,
      requesterName: this.prForm.requesterName,
      requestDate: this.prForm.requestDate,
      requiredByDate: this.prForm.requiredByDate,
      priority: this.prForm.priority,
      reason: this.prForm.reason,
      lines: validLines.map(l => ({
        itemId: l.itemId || undefined,
        itemCode: l.itemCode || undefined,
        itemNameAr: l.itemNameAr.trim(),
        itemNameEn: l.itemNameEn ? l.itemNameEn.trim() : undefined,
        unitOfMeasure: l.unitOfMeasure,
        quantityRequested: Number(l.quantityRequested),
        estimatedUnitPrice: Number(l.estimatedUnitPrice),
        warehouseCode: l.warehouseCode,
        notes: l.notes
      }))
    };

    this.purchasingService.createRequisition(payload).subscribe({
      next: (created) => {
        this.showCreatePrModal.set(false);
        Swal.fire({
          icon: 'success',
          title: this.langService.t('purchasing.procurement.alerts.prCreatedSuccessTitle'),
          text: this.langService.t('purchasing.procurement.alerts.prCreatedSuccessText', { number: created.requisitionNumber }),
          confirmButtonColor: '#059669'
        });
        this.loadAllData();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err?.error?.Description || this.langService.t('purchasing.procurement.alerts.savePrFailed')
        });
      }
    });
  }

  approvePr(req: PurchaseRequisitionDto) {
    Swal.fire({
      title: this.langService.t('purchasing.procurement.alerts.approvePrTitle'),
      text: this.langService.t('purchasing.procurement.alerts.approvePrText', {
        number: req.requisitionNumber,
        amount: req.totalEstimatedAmount
      }),
      input: 'text',
      inputPlaceholder: this.langService.t('purchasing.procurement.alerts.approvePrPlaceholder'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('purchasing.procurement.alerts.approvePrConfirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669'
    }).then((res) => {
      if (res.isConfirmed) {
        this.purchasingService.approveRequisition(req.id, res.value).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.langService.t('purchasing.procurement.alerts.approvePrSuccessTitle'),
              text: this.langService.t('purchasing.procurement.alerts.approvePrSuccessText')
            });
            this.loadAllData();
          },
          error: (err) => Swal.fire({
            icon: 'error',
            title: this.langService.t('purchasing.procurement.alerts.approvePrFailed'),
            text: err?.error?.Description || this.langService.t('common.errorOccurred')
          })
        });
      }
    });
  }

  rejectPr(req: PurchaseRequisitionDto) {
    Swal.fire({
      title: this.langService.t('purchasing.procurement.alerts.rejectPrTitle'),
      text: this.langService.t('purchasing.procurement.alerts.rejectPrText', { number: req.requisitionNumber }),
      input: 'textarea',
      inputPlaceholder: this.langService.t('purchasing.procurement.alerts.rejectPrPlaceholder'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('purchasing.procurement.alerts.rejectPrConfirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626'
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        this.purchasingService.rejectRequisition(req.id, res.value).subscribe({
          next: () => {
            Swal.fire({
              icon: 'info',
              title: this.langService.t('purchasing.procurement.alerts.rejectPrSuccessTitle'),
              text: this.langService.t('purchasing.procurement.alerts.rejectPrSuccessText')
            });
            this.loadAllData();
          },
          error: (err) => Swal.fire({
            icon: 'error',
            title: this.langService.t('purchasing.procurement.alerts.actionFailed'),
            text: err?.error?.Description || this.langService.t('common.errorOccurred')
          })
        });
      }
    });
  }

  // --- CONVERT PR TO PO (SMART WORKFLOW) ---
  convertPrToPo(req: PurchaseRequisitionDto) {
    this.poForm.requisitionId = req.id;
    this.poForm.requisitionNumber = req.requisitionNumber;
    this.poForm.notes = `صادر بناءً على طلب الشراء المعتمد ${req.requisitionNumber} - ${req.title}`;
    if (this.vendors().length > 0) {
      this.poForm.vendorId = this.vendors()[0].id;
    }

    this.poForm.lines = req.lines.map(l => ({
      itemId: l.itemId || '',
      itemCode: l.itemCode || '',
      itemNameAr: l.itemNameAr,
      itemNameEn: l.itemNameEn || '',
      quantityOrdered: l.quantityRequested,
      unitPrice: l.estimatedUnitPrice,
      discountAmount: 0,
      vatRate: 15,
      unitOfMeasure: l.unitOfMeasure,
      warehouseCode: l.warehouseCode || 'WH-01'
    }));

    this.setTab('orders');
    this.showCreatePoModal.set(true);
  }

  // --- PO ACTIONS ---
  openCreatePo() {
    this.poForm = {
      vendorId: this.vendors().length > 0 ? this.vendors()[0].id : '',
      requisitionId: '',
      requisitionNumber: '',
      orderDate: new Date().toISOString().substring(0, 10),
      expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().substring(0, 10),
      paymentTerms: 'آجل 30 يوم',
      currency: 'SAR',
      exchangeRateToSar: 1.0,
      branchCode: 'Main',
      warehouseCode: 'WH-01',
      notes: '',
      lines: [
        {
          itemId: '',
          itemCode: '',
          itemNameAr: '',
          itemNameEn: '',
          quantityOrdered: 1,
          unitPrice: 0,
          discountAmount: 0,
          vatRate: 15,
          unitOfMeasure: 'حبة',
          warehouseCode: 'WH-01'
        }
      ]
    };
    this.showCreatePoModal.set(true);
  }

  addPoLine() {
    this.poForm.lines.push({
      itemId: '',
      itemCode: '',
      itemNameAr: '',
      itemNameEn: '',
      quantityOrdered: 1,
      unitPrice: 0,
      discountAmount: 0,
      vatRate: 15,
      unitOfMeasure: 'حبة',
      warehouseCode: 'WH-01'
    });
  }

  removePoLine(index: number) {
    if (this.poForm.lines.length > 1) {
      this.poForm.lines.splice(index, 1);
    }
  }

  submitCreatePo() {
    if (!this.poForm.vendorId) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.procurement.alerts.vendorRequiredTitle'),
        text: this.langService.t('purchasing.procurement.alerts.vendorRequiredText')
      });
      return;
    }
    const vendor = this.vendors().find(v => v.id === this.poForm.vendorId);
    if (!vendor) return;

    const validLines = this.poForm.lines.filter(l => l.itemNameAr.trim() && l.quantityOrdered > 0);
    if (validLines.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.procurement.alerts.noLinesTitle'),
        text: this.langService.t('purchasing.procurement.alerts.poLinesRequired')
      });
      return;
    }

    const payload: CreatePurchaseOrderRequest = {
      vendorId: vendor.id,
      vendorName: vendor.nameAr,
      vendorVatNumber: vendor.taxNumber,
      vendorCrNumber: vendor.commercialRegistration,
      orderDate: this.poForm.orderDate,
      expectedDeliveryDate: this.poForm.expectedDeliveryDate,
      requisitionId: this.poForm.requisitionId || undefined,
      requisitionNumber: this.poForm.requisitionNumber || undefined,
      paymentTerms: this.poForm.paymentTerms,
      currency: this.poForm.currency,
      exchangeRateToSar: this.poForm.exchangeRateToSar,
      branchCode: this.poForm.branchCode,
      warehouseCode: this.poForm.warehouseCode,
      notes: this.poForm.notes,
      lines: validLines.map(l => ({
        itemId: l.itemId || undefined,
        itemCode: l.itemCode || undefined,
        itemNameAr: l.itemNameAr.trim(),
        itemNameEn: l.itemNameEn ? l.itemNameEn.trim() : undefined,
        quantityOrdered: Number(l.quantityOrdered),
        unitPrice: Number(l.unitPrice),
        discountAmount: Number(l.discountAmount || 0),
        vatRate: Number(l.vatRate || 15),
        unitOfMeasure: l.unitOfMeasure,
        warehouseCode: l.warehouseCode
      }))
    };

    this.purchasingService.createOrder(payload).subscribe({
      next: (created) => {
        this.showCreatePoModal.set(false);
        Swal.fire({
          icon: 'success',
          title: this.langService.t('purchasing.procurement.alerts.poCreatedSuccessTitle'),
          text: this.langService.t('purchasing.procurement.alerts.poCreatedSuccessText', {
            number: created.orderNumber,
            amount: created.totalAmount
          }),
          confirmButtonColor: '#059669'
        });
        this.loadAllData();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('purchasing.procurement.alerts.poCreatedFailed'),
          text: err?.error?.Description || this.langService.t('common.errorOccurred')
        });
      }
    });
  }

  confirmPo(order: PurchaseOrderDto) {
    Swal.fire({
      title: this.langService.t('purchasing.procurement.alerts.confirmPoTitle'),
      text: this.langService.t('purchasing.procurement.alerts.confirmPoText', {
        number: order.orderNumber,
        vendor: order.vendorName
      }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('purchasing.procurement.alerts.confirmPoBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669'
    }).then((res) => {
      if (res.isConfirmed) {
        this.purchasingService.confirmOrder(order.id, 'مدير المشتريات').subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.langService.t('purchasing.procurement.alerts.confirmPoSuccessTitle'),
              text: this.langService.t('purchasing.procurement.alerts.confirmPoSuccessText')
            });
            this.loadAllData();
          },
          error: (err) => Swal.fire({
            icon: 'error',
            title: this.langService.t('purchasing.procurement.alerts.actionFailed'),
            text: err?.error?.Description || this.langService.t('common.errorOccurred')
          })
        });
      }
    });
  }

  // --- RECEIVE GOODS FROM PO (SMART WORKFLOW) ---
  receiveGoodsFromPo(order: PurchaseOrderDto) {
    this.grnForm.purchaseOrderId = order.id;
    this.grnForm.purchaseOrderNumber = order.orderNumber;
    this.grnForm.vendorId = order.vendorId;
    this.grnForm.vendorName = order.vendorName;
    this.grnForm.warehouseCode = order.warehouseCode || 'WH-01';
    this.grnForm.deliveryNoteNumber = 'DN-' + Math.floor(10000 + Math.random() * 90000);
    this.grnForm.notes = `استلام بضائع لأمر الشراء ${order.orderNumber}`;

    this.grnForm.lines = order.lines
      .filter(l => l.quantityOrdered - l.quantityReceived > 0)
      .map(l => {
        const remaining = l.quantityOrdered - l.quantityReceived;
        return {
          purchaseOrderLineId: l.id,
          itemId: l.itemId || '',
          itemCode: l.itemCode || '',
          itemNameAr: l.itemNameAr,
          itemNameEn: l.itemNameEn || '',
          unitOfMeasure: l.unitOfMeasure,
          quantityOrdered: l.quantityOrdered,
          quantityReceived: remaining,
          quantityAccepted: remaining,
          quantityRejected: 0,
          rejectionReason: '',
          unitCost: l.unitPrice,
          warehouseCode: l.warehouseCode || order.warehouseCode || 'WH-01'
        };
      });

    this.setTab('receipts');
    this.showCreateGrnModal.set(true);
  }

  // --- GRN ACTIONS ---
  openCreateGrn() {
    this.grnForm = {
      purchaseOrderId: '',
      purchaseOrderNumber: '',
      vendorId: this.vendors().length > 0 ? this.vendors()[0].id : '',
      vendorName: this.vendors().length > 0 ? this.vendors()[0].nameAr : '',
      deliveryNoteNumber: 'DN-' + Math.floor(10000 + Math.random() * 90000),
      receiptDate: new Date().toISOString().substring(0, 10),
      warehouseCode: 'WH-01',
      receiverName: 'أمين المستودع',
      inspectorName: 'فاحص الجودة',
      notes: '',
      lines: [
        {
          purchaseOrderLineId: '',
          itemId: '',
          itemCode: '',
          itemNameAr: '',
          itemNameEn: '',
          unitOfMeasure: 'حبة',
          quantityOrdered: 0,
          quantityReceived: 1,
          quantityAccepted: 1,
          quantityRejected: 0,
          rejectionReason: '',
          unitCost: 0,
          warehouseCode: 'WH-01'
        }
      ]
    };
    this.showCreateGrnModal.set(true);
  }

  submitCreateGrn() {
    const validLines = this.grnForm.lines.filter(l => l.itemNameAr.trim() && l.quantityReceived > 0);
    if (validLines.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('purchasing.procurement.alerts.grnIncompleteData')
      });
      return;
    }

    const payload: CreateGoodsReceiptNoteRequest = {
      purchaseOrderId: this.grnForm.purchaseOrderId || undefined,
      purchaseOrderNumber: this.grnForm.purchaseOrderNumber || undefined,
      vendorId: this.grnForm.vendorId || (this.vendors().length > 0 ? this.vendors()[0].id : '55872f7a-3dba-4f99-9dc7-3e30946eb58d'),
      vendorName: this.grnForm.vendorName || 'المورد المعتمد',
      deliveryNoteNumber: this.grnForm.deliveryNoteNumber,
      receiptDate: this.grnForm.receiptDate,
      warehouseCode: this.grnForm.warehouseCode,
      receiverName: this.grnForm.receiverName,
      inspectorName: this.grnForm.inspectorName,
      notes: this.grnForm.notes,
      autoPost: true,
      lines: validLines.map(l => ({
        purchaseOrderLineId: l.purchaseOrderLineId || undefined,
        itemId: l.itemId || undefined,
        itemCode: l.itemCode || undefined,
        itemNameAr: l.itemNameAr.trim(),
        itemNameEn: l.itemNameEn ? l.itemNameEn.trim() : undefined,
        unitOfMeasure: l.unitOfMeasure,
        quantityOrdered: Number(l.quantityOrdered || l.quantityReceived),
        quantityReceived: Number(l.quantityReceived),
        quantityAccepted: Number(l.quantityAccepted),
        quantityRejected: Number(l.quantityRejected || 0),
        rejectionReason: l.rejectionReason,
        unitCost: Number(l.unitCost || 0),
        warehouseCode: l.warehouseCode
      }))
    };

    this.purchasingService.createGoodsReceipt(payload).subscribe({
      next: (created) => {
        this.showCreateGrnModal.set(false);
        Swal.fire({
          icon: 'success',
          title: this.langService.t('purchasing.procurement.alerts.grnCreatedSuccessTitle'),
          text: this.langService.t('purchasing.procurement.alerts.grnCreatedSuccessText', { number: created.receiptNumber }),
          confirmButtonColor: '#059669'
        });
        this.loadAllData();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('purchasing.procurement.alerts.grnFailedTitle'),
          text: err?.error?.Description || this.langService.t('common.errorOccurred')
        });
      }
    });
  }

  // --- BILL CREATION WORKFLOW (OPTION 1 vs OPTION 2) ---
  createBillFromPo(order: PurchaseOrderDto) {
    this.router.navigate(['/purchasing/invoices/create'], {
      queryParams: {
        poId: order.id,
        poNumber: order.orderNumber,
        vendorId: order.vendorId
      }
    });
  }

  createBillFromGrn(grn: GoodsReceiptNoteDto) {
    this.router.navigate(['/purchasing/invoices/create'], {
      queryParams: {
        grnId: grn.id,
        grnNumber: grn.receiptNumber,
        poId: grn.purchaseOrderId,
        poNumber: grn.purchaseOrderNumber,
        vendorId: grn.vendorId
      }
    });
  }

  navigateToDirectInvoice() {
    this.router.navigate(['/purchasing/invoices/create']);
  }

  // --- QUICK PAYMENT MODAL ---
  openPaymentModal(inv: PurchaseInvoiceDto) {
    this.selectedInvoice = inv;
    this.paymentForm = {
      amount: inv.remainingAmount || (inv.totalAmount - inv.paidAmount),
      paymentDate: new Date().toISOString().substring(0, 10),
      paymentMethod: 'BankTransfer',
      paymentAccountId: 'A56F61A9-272E-4DFF-9DF0-84E3F4C1B81E',
      referenceNumber: 'PAY-' + Math.floor(10000 + Math.random() * 90000),
      notes: `سداد فاتورة المشتريات ${inv.invoiceNumber}`
    };
    this.showPaymentModal.set(true);
  }

  submitPayment() {
    if (!this.selectedInvoice) return;
    if (this.paymentForm.amount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.procurement.alerts.invalidPaymentAmountTitle'),
        text: this.langService.t('purchasing.procurement.alerts.invalidPaymentAmountText')
      });
      return;
    }

    this.purchasingService.payPurchaseInvoice(this.selectedInvoice.id, this.paymentForm).subscribe({
      next: (updated) => {
        this.showPaymentModal.set(false);
        Swal.fire({
          icon: 'success',
          title: this.langService.t('purchasing.procurement.alerts.paymentSuccessTitle'),
          text: this.langService.t('purchasing.procurement.alerts.paymentSuccessText', { number: updated.invoiceNumber }),
          confirmButtonColor: '#059669'
        });
        this.loadAllData();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('purchasing.procurement.alerts.paymentFailedTitle'),
          text: err?.error?.Description || this.langService.t('purchasing.procurement.alerts.paymentFailedText')
        });
      }
    });
  }

  // --- DETAILS MODAL ---
  viewPrDetails(pr: PurchaseRequisitionDto) {
    this.selectedDetailsType = 'pr';
    this.selectedPr = pr;
    this.showDetailsModal.set(true);
  }

  viewPoDetails(po: PurchaseOrderDto) {
    this.selectedDetailsType = 'po';
    this.selectedPo = po;
    this.showDetailsModal.set(true);
  }

  viewGrnDetails(grn: GoodsReceiptNoteDto) {
    this.selectedDetailsType = 'grn';
    this.selectedGrn = grn;
    this.showDetailsModal.set(true);
  }

  viewInvoiceDetails(inv: PurchaseInvoiceDto) {
    this.selectedDetailsType = 'invoice';
    this.selectedInvoice = inv;
    this.showDetailsModal.set(true);
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
  }

  // --- LIVE SUMMARY & CALCULATION HELPERS (FOR COMPACT UX) ---
  calculatePoLineTotal(line: any): number {
    const qty = Number(line.quantityOrdered) || 0;
    const price = Number(line.unitPrice) || 0;
    const discount = Number(line.discountAmount) || 0;
    const taxable = Math.max(0, (qty * price) - discount);
    const vat = taxable * ((Number(line.vatRate) || 15) / 100);
    return taxable + vat;
  }

  get poSubtotal(): number {
    return this.poForm.lines.reduce((acc, l) => {
      const qty = Number(l.quantityOrdered) || 0;
      const price = Number(l.unitPrice) || 0;
      const discount = Number(l.discountAmount) || 0;
      return acc + Math.max(0, (qty * price) - discount);
    }, 0);
  }

  get poVatTotal(): number {
    return this.poForm.lines.reduce((acc, l) => {
      const qty = Number(l.quantityOrdered) || 0;
      const price = Number(l.unitPrice) || 0;
      const discount = Number(l.discountAmount) || 0;
      const taxable = Math.max(0, (qty * price) - discount);
      return acc + (taxable * ((Number(l.vatRate) || 15) / 100));
    }, 0);
  }

  get poGrandTotal(): number {
    return this.poSubtotal + this.poVatTotal;
  }

  calculatePrLineTotal(line: any): number {
    const qty = Number(line.quantityRequested) || 0;
    const price = Number(line.estimatedUnitPrice) || 0;
    return qty * price;
  }

  get prGrandTotal(): number {
    return this.prForm.lines.reduce((acc, l) => {
      const qty = Number(l.quantityRequested) || 0;
      const price = Number(l.estimatedUnitPrice) || 0;
      return acc + (qty * price);
    }, 0);
  }

  onGrnQtyChange(line: any) {
    const received = Number(line.quantityReceived) || 0;
    let accepted = Number(line.quantityAccepted);
    if (isNaN(accepted) || accepted < 0) accepted = 0;
    if (accepted > received) {
      accepted = received;
      line.quantityAccepted = accepted;
    }
    line.quantityRejected = Math.max(0, received - accepted);
  }

  get grnTotalReceived(): number {
    return this.grnForm.lines.reduce((acc, l) => acc + (Number(l.quantityReceived) || 0), 0);
  }

  get grnTotalAccepted(): number {
    return this.grnForm.lines.reduce((acc, l) => acc + (Number(l.quantityAccepted) || 0), 0);
  }

  get grnTotalRejected(): number {
    return this.grnForm.lines.reduce((acc, l) => acc + (Number(l.quantityRejected) || 0), 0);
  }
}
