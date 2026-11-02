import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  PurchasingService,
  ItemDto,
  InventoryTransactionDto,
  TransferStockRequest,
  TransferStockResultDto
} from '../../../core/services/purchasing.service';
import { BranchesWarehousesService, WarehouseDto } from '../../../core/services/branches-warehouses.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-stock-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterModule, SearchableSelectComponent, PaginationComponent, TranslatePipe],
  templateUrl: './stock-transfers.component.html',
  styleUrls: ['./stock-transfers.component.scss']
})
export class StockTransfersComponent implements OnInit {
  public purchasingService = inject(PurchasingService);
  public bwService = inject(BranchesWarehousesService);
  public companyContext = inject(CompanyContextService);
  public langService = inject(LanguageService);
  private translator = inject(AccountingTranslatorService);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  items = signal<ItemDto[]>([]);
  warehouses = signal<WarehouseDto[]>([]);
  transactions = signal<InventoryTransactionDto[]>([]);
  searchHistory = '';

  // Transfer Form
  transferForm = {
    itemId: '',
    sourceWarehouseCode: 'WH-MAIN',
    destinationWarehouseCode: 'WH-OLAYA',
    quantity: 5,
    reasonAr: '',
    reasonEn: 'Stock transfer to replenish Olaya branch inventory'
  };

  selectedItem = computed(() => {
    return this.items().find(i => i.id === this.transferForm.itemId) || null;
  });

  // Items formatted for SearchableSelect
  itemSelectOptions = computed<SelectOption[]>(() => {
    const isAr = this.langService.currentLang() === 'ar';
    return this.items().map(it => ({
      value: it.id,
      label: isAr ? it.nameAr : (it.nameEn || it.nameAr),
      sublabel: `${it.currentStockQuantity} ${it.unitOfMeasure} • ${this.langService.t('purchasing.transfers.costPrefix')}: ${(it.costPrice || it.purchasePrice || 0).toFixed(2)} ${this.langService.t('purchasing.transfers.currencySar')}`,
      code: it.itemCode,
      badge: `${it.currentStockQuantity} ${it.unitOfMeasure}`,
      badgeClass: it.currentStockQuantity > 0 ? 'badge-success' : 'badge-danger',
      icon: 'pi pi-box'
    }));
  });

  // Warehouses formatted for SearchableSelect
  warehouseSelectOptions = computed<SelectOption[]>(() => {
    const isAr = this.langService.currentLang() === 'ar';
    return this.warehouses().map(w => ({
      value: w.code,
      label: isAr ? w.nameAr : (w.nameEn || w.nameAr),
      sublabel: w.location ? `📍 ${w.location}` : (w.branchName || ''),
      code: w.code,
      badge: w.isDefault ? this.langService.t('purchasing.transfers.primaryBadge') : undefined,
      badgeClass: w.isDefault ? 'badge-primary' : undefined,
      icon: 'pi pi-building'
    }));
  });

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(8);

  // Filter transfers history (MovementType 6: TransferOut, 7: TransferIn)
  transfersHistory = computed(() => {
    const q = this.searchHistory.trim().toLowerCase();
    return this.transactions().filter(t => {
      const matchType = t.movementType === 6 || t.movementType === 7 || (t.referenceNumber && t.referenceNumber.startsWith('TRF'));
      if (!matchType) return false;
      if (!q) return true;
      return (
        t.itemCode?.toLowerCase().includes(q) ||
        t.itemNameAr?.toLowerCase().includes(q) ||
        t.referenceNumber?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      );
    });
  });

  paginatedTransfersHistory = computed(() => {
    const list = this.transfersHistory();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  ngOnInit() {
    this.loadData();
  }

  get currentCompanyId(): string {
    return this.companyContext.activeCompany().id || '11111111-2222-3333-4444-555555555555';
  }

  loadData() {
    this.isLoading.set(true);

    // 1. Load warehouses from DB
    this.bwService.getWarehouses(this.currentCompanyId).subscribe({
      next: (whList) => {
        this.warehouses.set(whList || []);
        // Set smart defaults
        const mainWh = whList.find(w => w.isDefault || w.code === 'WH-MAIN');
        if (mainWh && !this.transferForm.sourceWarehouseCode) {
          this.transferForm.sourceWarehouseCode = mainWh.code;
        }
        const secondaryWh = whList.find(w => !w.isDefault);
        if (secondaryWh && (!this.transferForm.destinationWarehouseCode || this.transferForm.destinationWarehouseCode === this.transferForm.sourceWarehouseCode)) {
          this.transferForm.destinationWarehouseCode = secondaryWh.code;
        }
      },
      error: (err) => console.warn('Failed to load warehouses', err)
    });

    // 2. Load stockable items
    this.purchasingService.getItems().subscribe({
      next: (res) => {
        const stockables = (res || []).filter(i => i.itemType === 1);
        this.items.set(stockables);
        
        // Priority selection: ITM-TEST-1692 if available (user's recently supplied item)
        const targetItem = stockables.find(i => i.itemCode === 'ITM-TEST-1692') || stockables.find(i => i.currentStockQuantity > 0) || stockables[0];
        if (targetItem && !this.transferForm.itemId) {
          this.transferForm.itemId = targetItem.id;
        }
        this.loadHistory();
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadHistory() {
    this.purchasingService.getInventoryTransactions().subscribe({
      next: (res) => {
        this.transactions.set(res || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onReasonArChange(val: string) {
    this.transferForm.reasonAr = val;
    this.transferForm.reasonEn = this.translator.translateArabicToEnglish(val);
  }

  onReasonEnChange(val: string) {
    this.transferForm.reasonEn = val;
    if (!this.transferForm.reasonAr || this.transferForm.reasonAr.trim() === '') {
      this.transferForm.reasonAr = this.translator.translateEnglishToArabic(val);
    }
  }

  retranslateReason() {
    this.transferForm.reasonEn = this.translator.translateArabicToEnglish(this.transferForm.reasonAr);
  }

  submitTransfer() {
    const it = this.selectedItem();
    if (!it) {
      Swal.fire({ icon: 'warning', title: this.langService.t('common.warning'), text: this.langService.t('purchasing.transfers.alerts.selectItemFirst') });
      return;
    }

    if (!this.transferForm.sourceWarehouseCode || !this.transferForm.destinationWarehouseCode) {
      Swal.fire({ icon: 'warning', title: this.langService.t('common.warning'), text: this.langService.t('purchasing.transfers.alerts.selectBothWarehouses') });
      return;
    }

    if (this.transferForm.sourceWarehouseCode === this.transferForm.destinationWarehouseCode) {
      Swal.fire({ icon: 'warning', title: this.langService.t('common.warning'), text: this.langService.t('purchasing.transfers.alerts.sameWarehouseError') });
      return;
    }

    if (this.transferForm.quantity <= 0) {
      Swal.fire({ icon: 'warning', title: this.langService.t('common.warning'), text: this.langService.t('purchasing.transfers.alerts.qtyGreaterThanZero') });
      return;
    }

    if (this.transferForm.quantity > it.currentStockQuantity) {
      Swal.fire({
        icon: 'error',
        title: this.langService.t('purchasing.transfers.alerts.insufficientStockTitle'),
        text: this.langService.t('purchasing.transfers.alerts.insufficientStockText', {
          qty: this.transferForm.quantity,
          stock: it.currentStockQuantity,
          uom: it.unitOfMeasure
        })
      });
      return;
    }

    const isAr = this.langService.currentLang() === 'ar';
    const srcWh = this.warehouses().find(w => w.code === this.transferForm.sourceWarehouseCode);
    const dstWh = this.warehouses().find(w => w.code === this.transferForm.destinationWarehouseCode);
    const srcName = srcWh ? `${srcWh.code} - ${isAr ? srcWh.nameAr : (srcWh.nameEn || srcWh.nameAr)}` : this.transferForm.sourceWarehouseCode;
    const dstName = dstWh ? `${dstWh.code} - ${isAr ? dstWh.nameAr : (dstWh.nameEn || dstWh.nameAr)}` : this.transferForm.destinationWarehouseCode;
    const itemName = isAr ? it.nameAr : (it.nameEn || it.nameAr);
    const reasonText = isAr ? (this.transferForm.reasonAr || this.transferForm.reasonEn) : (this.transferForm.reasonEn || this.transferForm.reasonAr);

    Swal.fire({
      title: this.langService.t('purchasing.transfers.alerts.confirmTitle'),
      html: `
        <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; line-height: 1.6;">
          <p>${this.langService.t('purchasing.transfers.alerts.confirmQuestion')}</p>
          <strong style="color: #0284c7;">${it.itemCode} - ${itemName}</strong>
          <div style="margin-top: 10px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div>${this.langService.t('purchasing.transfers.alerts.transferredQty')} <strong style="color: #2563eb;">${this.transferForm.quantity} ${it.unitOfMeasure}</strong></div>
            <div>${this.langService.t('purchasing.transfers.alerts.fromWarehouse')} <strong>${srcName}</strong></div>
            <div>${this.langService.t('purchasing.transfers.alerts.toWarehouse')} <strong style="color: #059669;">${dstName}</strong></div>
            <div style="margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">${this.langService.t('purchasing.transfers.alerts.reasonLabel')} <em>${reasonText || ''}</em></div>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('purchasing.transfers.alerts.confirmBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#0284c7'
    }).then(res => {
      if (res.isConfirmed) {
        this.isSubmitting.set(true);
        const payload: TransferStockRequest = {
          sourceWarehouseCode: this.transferForm.sourceWarehouseCode,
          destinationWarehouseCode: this.transferForm.destinationWarehouseCode,
          quantity: Number(this.transferForm.quantity),
          reasonAr: this.transferForm.reasonAr.trim(),
          reasonEn: this.transferForm.reasonEn?.trim()
        };

        this.purchasingService.transferStock(it.id, payload).subscribe({
          next: (result: TransferStockResultDto) => {
            this.isSubmitting.set(false);
            const deductedStr = this.langService.t('purchasing.transfers.alerts.deductedFrom', { qty: result.quantity, code: result.sourceWarehouseCode });
            const addedStr = this.langService.t('purchasing.transfers.alerts.addedTo', { qty: result.quantity, code: result.destinationWarehouseCode });

            Swal.fire({
              icon: 'success',
              title: this.langService.t('purchasing.transfers.alerts.successTitle'),
              html: `
                <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; line-height: 1.6;">
                  <p>${this.langService.t('purchasing.transfers.alerts.successRef')}</p>
                  <p style="text-align: center;"><strong style="font-size: 1.1rem; color: #059669; font-family: monospace;">${result.referenceNumber}</strong></p>
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px; border-radius: 6px; margin-top: 6px;">
                    <div>${deductedStr}</div>
                    <div>${addedStr}</div>
                  </div>
                </div>
              `,
              confirmButtonColor: '#059669'
            });
            this.loadData();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            Swal.fire({
              icon: 'error',
              title: this.langService.t('purchasing.transfers.alerts.failedTitle'),
              text: err?.error?.Description || err?.error?.description || this.langService.t('purchasing.transfers.alerts.failedDefault')
            });
          }
        });
      }
    });
  }
}
