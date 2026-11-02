import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import {
  PurchasingService,
  ItemDto,
  InventoryTransactionDto,
  AdjustStockRequest,
  AdjustStockResultDto,
  PostInventoryAuditRequest,
  PostInventoryAuditResultDto
} from '../../../core/services/purchasing.service';
import { BranchesWarehousesService, WarehouseDto } from '../../../core/services/branches-warehouses.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import Swal from 'sweetalert2';

interface WorksheetRow {
  item: ItemDto;
  actualQuantity: number;
  difference: number;
  diffValue: number;
  reasonAr: string;
  reasonEn: string;
  warehouseCode: string;
  isModified: boolean;
}

@Component({
  selector: 'app-stock-adjustments',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterModule, SearchableSelectComponent, PaginationComponent, TranslatePipe],
  templateUrl: './stock-adjustments.component.html',
  styleUrls: ['./stock-adjustments.component.scss']
})
export class StockAdjustmentsComponent implements OnInit {
  public purchasingService = inject(PurchasingService);
  public bwService = inject(BranchesWarehousesService);
  public companyContext = inject(CompanyContextService);
  public langService = inject(LanguageService);
  private translator = inject(AccountingTranslatorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Active Tab: 'single' | 'worksheet' | 'history'
  activeTab = signal<string>('single');

  // Loading indicator
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Master Items Data
  items = signal<ItemDto[]>([]);
  warehouses = signal<WarehouseDto[]>([]);
  transactions = signal<InventoryTransactionDto[]>([]);

  // Filter for history
  historySearch = '';

  // --- TAB 1: SINGLE ITEM ADJUSTMENT MODEL ---
  selectedItemId = '';
  selectedItem = signal<ItemDto | null>(null);
  singleAdjustForm = {
    actualQuantity: 0,
    warehouseCode: 'WH-MAIN',
    reasonAr: this.langService.t('purchasing.stockAdjustments.alerts.defaultSingleReason'),
    reasonEn: 'Regular physical inventory adjustment'
  };

  // --- TAB 2: BULK WORKSHEET MODEL ---
  worksheetRows = signal<WorksheetRow[]>([]);
  worksheetFilter: 'all' | 'variance' | 'matched' = 'all';
  worksheetSearch = '';

  // Bulk Audit Session Controls
  auditWarehouseCode = signal<string>('WH-MAIN');
  auditDate = signal<string>(new Date().toISOString().substring(0, 10));
  auditReference = signal<string>('');
  auditNotes = signal<string>(this.langService.t('purchasing.stockAdjustments.alerts.defaultAuditNotes'));

  // Worksheet Computed KPIs
  worksheetModifiedRows = computed(() => {
    return this.worksheetRows().filter(r => r.isModified);
  });

  worksheetSurplusRows = computed(() => {
    return this.worksheetRows().filter(r => r.isModified && r.difference > 0);
  });

  worksheetDeficitRows = computed(() => {
    return this.worksheetRows().filter(r => r.isModified && r.difference < 0);
  });

  worksheetTotalSurplusValue = computed(() => {
    return this.worksheetSurplusRows().reduce((sum, r) => sum + r.diffValue, 0);
  });

  worksheetTotalDeficitValue = computed(() => {
    return this.worksheetDeficitRows().reduce((sum, r) => sum + r.diffValue, 0);
  });

  worksheetNetAdjustmentValue = computed(() => {
    return this.worksheetTotalSurplusValue() - this.worksheetTotalDeficitValue();
  });

  // Computed Select Options
  itemSelectOptions = computed<SelectOption[]>(() => {
    const isAr = this.langService.currentLang() === 'ar';
    return this.items().map(it => ({
      value: it.id,
      label: isAr ? it.nameAr : (it.nameEn || it.nameAr),
      sublabel: isAr
        ? `الرصيد الدفتري: ${it.currentStockQuantity} ${it.unitOfMeasure} • التكلفة: ${(it.costPrice || it.purchasePrice || 0).toFixed(2)} ر.س`
        : `Book Balance: ${it.currentStockQuantity} ${it.unitOfMeasure} • Cost: ${(it.costPrice || it.purchasePrice || 0).toFixed(2)} SAR`,
      code: it.itemCode,
      badge: `${it.currentStockQuantity} ${it.unitOfMeasure}`,
      badgeClass: it.currentStockQuantity > 0 ? 'badge-success' : 'badge-danger',
      icon: 'pi pi-box'
    }));
  });

  warehouseSelectOptions = computed<SelectOption[]>(() => {
    const isAr = this.langService.currentLang() === 'ar';
    return this.warehouses().map(w => ({
      value: w.code,
      label: isAr ? w.nameAr : (w.nameEn || w.nameAr),
      sublabel: w.location ? `📍 ${w.location}` : (w.branchName || ''),
      code: w.code,
      badge: w.isDefault ? (isAr ? 'الرئيسي' : 'Main') : undefined,
      badgeClass: w.isDefault ? 'badge-primary' : undefined,
      icon: 'pi pi-building'
    }));
  });

  // Computed KPIs
  totalStockValuation = computed(() => {
    return this.items().reduce((sum, it) => sum + ((it.currentStockQuantity || 0) * (it.costPrice || it.purchasePrice || 0)), 0);
  });

  stockableItemsCount = computed(() => {
    return this.items().filter(it => it.itemType === 1).length;
  });

  // Single Item Calculations
  singleDifference = computed(() => {
    const it = this.selectedItem();
    if (!it) return 0;
    return Number(this.singleAdjustForm.actualQuantity) - (it.currentStockQuantity || 0);
  });

  singleTotalDiffValue = computed(() => {
    const it = this.selectedItem();
    if (!it) return 0;
    const unitCost = it.costPrice > 0 ? it.costPrice : (it.purchasePrice || 0);
    return Math.abs(this.singleDifference()) * unitCost;
  });

  // History stats
  adjustmentsHistory = computed(() => {
    const q = this.historySearch.trim().toLowerCase();
    // MovementType 4 = InventoryAdjustment
    return this.transactions().filter(t => {
      const matchType = t.movementType === 4 || (t.referenceNumber && t.referenceNumber.startsWith('ADJ'));
      if (!matchType) return false;
      if (!q) return true;
      return (t.itemCode?.toLowerCase().includes(q) ||
              t.itemNameAr?.toLowerCase().includes(q) ||
              t.referenceNumber?.toLowerCase().includes(q) ||
              t.notes?.toLowerCase().includes(q));
    });
  });

  // History Pagination
  historyPage = signal<number>(1);
  historyPageSize = signal<number>(10);
  paginatedHistory = computed(() => {
    const list = this.adjustmentsHistory();
    const start = (this.historyPage() - 1) * this.historyPageSize();
    return list.slice(start, start + this.historyPageSize());
  });

  // Worksheet Pagination
  worksheetPage = signal<number>(1);
  worksheetPageSize = signal<number>(10);
  paginatedWorksheetRows = computed(() => {
    const list = this.filteredWorksheetRows();
    const start = (this.worksheetPage() - 1) * this.worksheetPageSize();
    return list.slice(start, start + this.worksheetPageSize());
  });

  get currentCompanyId(): string {
    return this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['single', 'worksheet', 'history'].includes(params['tab'])) {
        this.activeTab.set(params['tab']);
      }
    });
    this.loadData();
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  loadData() {
    this.isLoading.set(true);

    // 1. Load warehouses from DB
    this.bwService.getWarehouses(this.currentCompanyId).subscribe({
      next: (whs) => this.warehouses.set(whs || []),
      error: (err) => console.warn('Failed to load warehouses', err)
    });

    // 2. Load stockable items
    this.purchasingService.getItems().subscribe({
      next: (res) => {
        const stockables = (res || []).filter(i => i.itemType === 1);
        this.items.set(stockables);
        this.initWorksheet(stockables);

        // Pre-select ITM-TEST-1692 if available or first item
        if (stockables.length > 0 && !this.selectedItemId) {
          const target = stockables.find(i => i.itemCode === 'ITM-TEST-1692') || stockables[0];
          this.onItemSelect(target.id);
        }
        this.loadHistory();
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadHistory() {
    this.purchasingService.getInventoryTransactions(4).subscribe({
      next: (res) => {
        this.transactions.set(res || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onItemSelect(itemId: string) {
    this.selectedItemId = itemId;
    const it = this.items().find(i => i.id === itemId) || null;
    this.selectedItem.set(it);
    if (it) {
      this.singleAdjustForm.actualQuantity = it.currentStockQuantity;
    }
  }

  onReasonArChange(val: string) {
    this.singleAdjustForm.reasonAr = val;
    this.singleAdjustForm.reasonEn = this.translator.translateArabicToEnglish(val);
  }

  onReasonEnChange(val: string) {
    this.singleAdjustForm.reasonEn = val;
    if (!this.singleAdjustForm.reasonAr || this.singleAdjustForm.reasonAr.trim() === '') {
      this.singleAdjustForm.reasonAr = this.translator.translateEnglishToArabic(val);
    }
  }

  retranslateSingleReason() {
    this.singleAdjustForm.reasonEn = this.translator.translateArabicToEnglish(this.singleAdjustForm.reasonAr);
  }

  submitSingleAdjustment() {
    const it = this.selectedItem();
    if (!it) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('purchasing.stockAdjustments.alerts.selectItem'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const diff = this.singleDifference();
    if (Math.abs(diff) < 0.0001) {
      Swal.fire({
        icon: 'info',
        title: this.langService.t('purchasing.stockAdjustments.alerts.noVariance'),
        text: this.langService.t('purchasing.stockAdjustments.alerts.qtyMatches'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const isSurplus = diff > 0;
    const diffText = isSurplus
      ? this.langService.t('purchasing.stockAdjustments.alerts.surplusOf', { diff: Math.abs(diff).toFixed(2), unit: it.unitOfMeasure || '' })
      : this.langService.t('purchasing.stockAdjustments.alerts.deficitOf', { diff: diff.toFixed(2), unit: it.unitOfMeasure || '' });
    const valueText = this.singleTotalDiffValue().toFixed(2);
    const itemName = this.langService.currentLang() === 'ar' ? it.nameAr : (it.nameEn || it.nameAr);
    const isAr = this.langService.currentLang() === 'ar';

    Swal.fire({
      title: this.langService.t('purchasing.stockAdjustments.alerts.confirmSingleTitle'),
      html: `
        <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; line-height: 1.6;">
          <p>${this.langService.t('purchasing.stockAdjustments.alerts.confirmSinglePrompt')}</p>
          <strong style="color: #0284c7;">${it.itemCode} - ${itemName}</strong>
          <div style="margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div>${this.langService.t('purchasing.stockAdjustments.alerts.calculatedDiff')} <strong style="color: ${isSurplus ? '#059669' : '#dc2626'}">${diffText}</strong></div>
            <div>${this.langService.t('purchasing.stockAdjustments.alerts.financialValue')} <strong>${valueText} ${this.langService.t('common.currency')}</strong></div>
            <div>${this.langService.t('purchasing.stockAdjustments.alerts.warehouse')} <strong>${this.singleAdjustForm.warehouseCode}</strong></div>
            <div>${this.langService.t('purchasing.stockAdjustments.alerts.justification')} <em>${isAr ? this.singleAdjustForm.reasonAr : (this.singleAdjustForm.reasonEn || this.singleAdjustForm.reasonAr)}</em></div>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('purchasing.stockAdjustments.alerts.confirmSingleBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.isSubmitting.set(true);
        const payload: AdjustStockRequest = {
          actualQuantity: Number(this.singleAdjustForm.actualQuantity),
          warehouseCode: this.singleAdjustForm.warehouseCode,
          reasonAr: this.singleAdjustForm.reasonAr.trim(),
          reasonEn: this.singleAdjustForm.reasonEn?.trim()
        };

        this.purchasingService.adjustStock(it.id, payload).subscribe({
          next: (result: AdjustStockResultDto) => {
            this.isSubmitting.set(false);
            Swal.fire({
              icon: 'success',
              title: this.langService.t('purchasing.stockAdjustments.alerts.singleSuccessTitle'),
              html: `
                <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; line-height: 1.5;">
                  <div>${this.langService.t('purchasing.stockAdjustments.alerts.refVoucherNumber')} <strong style="font-family: monospace;">${result.referenceNumber}</strong></div>
                  ${result.journalEntryNumber ? `<div>${this.langService.t('purchasing.stockAdjustments.alerts.journalEntryNumber')} <strong style="color: #059669;">${result.journalEntryNumber}</strong></div>` : ''}
                  <div>${this.langService.t('purchasing.stockAdjustments.alerts.updatedBookBalance')} <strong>${result.actualQuantity} ${it.unitOfMeasure || ''}</strong></div>
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
              title: this.langService.t('purchasing.stockAdjustments.alerts.singleErrorTitle'),
              text: err?.error?.Description || this.langService.t('common.errorOccurred'),
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // --- WORKSHEET METHODS ---
  initWorksheet(items: ItemDto[]) {
    const rows: WorksheetRow[] = items.map(it => ({
      item: it,
      actualQuantity: it.currentStockQuantity,
      difference: 0,
      diffValue: 0,
      reasonAr: this.langService.t('purchasing.stockAdjustments.alerts.defaultAuditNotes'),
      reasonEn: 'Physical inventory audit',
      warehouseCode: 'WH-MAIN',
      isModified: false
    }));
    this.worksheetRows.set(rows);
  }

  onWorksheetActualChange(row: WorksheetRow) {
    const diff = Number(row.actualQuantity) - (row.item.currentStockQuantity || 0);
    row.difference = diff;
    const unitCost = row.item.costPrice > 0 ? row.item.costPrice : (row.item.purchasePrice || 0);
    row.diffValue = Math.abs(diff) * unitCost;
    row.isModified = Math.abs(diff) >= 0.0001;
  }

  filteredWorksheetRows = computed(() => {
    let rows = this.worksheetRows();
    const q = this.worksheetSearch.trim().toLowerCase();

    if (q) {
      rows = rows.filter(r =>
        r.item.itemCode.toLowerCase().includes(q) ||
        r.item.nameAr.toLowerCase().includes(q) ||
        (r.item.nameEn && r.item.nameEn.toLowerCase().includes(q))
      );
    }

    if (this.worksheetFilter === 'variance') {
      rows = rows.filter(r => r.isModified);
    } else if (this.worksheetFilter === 'matched') {
      rows = rows.filter(r => !r.isModified);
    }

    return rows;
  });

  saveWorksheetRow(row: WorksheetRow) {
    if (!row.isModified) return;

    const payload: AdjustStockRequest = {
      actualQuantity: Number(row.actualQuantity),
      warehouseCode: row.warehouseCode,
      reasonAr: row.reasonAr,
      reasonEn: row.reasonEn
    };

    this.purchasingService.adjustStock(row.item.id, payload).subscribe({
      next: (res) => {
        row.isModified = false;
        row.item.currentStockQuantity = res.actualQuantity;
        row.difference = 0;
        row.diffValue = 0;
        Swal.fire({
          icon: 'success',
          title: this.langService.t('purchasing.stockAdjustments.alerts.rowSuccessTitle'),
          text: this.langService.t('purchasing.stockAdjustments.alerts.rowSuccessText', { itemCode: row.item.itemCode, ref: res.referenceNumber }),
          timer: 2000,
          showConfirmButton: false
        });
        this.loadHistory();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err?.error?.Description || this.langService.t('purchasing.stockAdjustments.alerts.rowErrorTitle'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  submitBulkInventoryAudit() {
    const modified = this.worksheetModifiedRows();
    if (modified.length === 0) {
      Swal.fire({
        icon: 'info',
        title: this.langService.t('purchasing.stockAdjustments.alerts.noVariance'),
        text: this.langService.t('purchasing.stockAdjustments.alerts.noBulkVariance'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const surplusCount = this.worksheetSurplusRows().length;
    const deficitCount = this.worksheetDeficitRows().length;
    const surplusVal = this.worksheetTotalSurplusValue();
    const deficitVal = this.worksheetTotalDeficitValue();
    const netVal = this.worksheetNetAdjustmentValue();
    const isNetPositive = netVal >= 0;
    const curr = this.langService.t('common.currency');
    const isAr = this.langService.currentLang() === 'ar';

    Swal.fire({
      title: this.langService.t('purchasing.stockAdjustments.alerts.confirmBulkTitle'),
      html: `
        <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.88rem; line-height: 1.6; color: #334155;">
          <p>${this.langService.t('purchasing.stockAdjustments.alerts.confirmBulkPrompt')}</p>
          <div style="margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('purchasing.stockAdjustments.alerts.warehouse')}</span> <strong style="color: #0284c7;">${this.auditWarehouseCode()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('purchasing.stockAdjustments.alerts.adjustedItemsCount')}</span> <strong>${this.langService.t('purchasing.stockAdjustments.alerts.itemsUnit', { count: modified.length })}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('purchasing.stockAdjustments.alerts.surplusItems')}</span> <strong style="color: #059669;">${this.langService.t('purchasing.stockAdjustments.alerts.itemsUnit', { count: surplusCount })} (+${surplusVal.toFixed(2)} ${curr})</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('purchasing.stockAdjustments.alerts.deficitItems')}</span> <strong style="color: #dc2626;">${this.langService.t('purchasing.stockAdjustments.alerts.itemsUnit', { count: deficitCount })} (-${deficitVal.toFixed(2)} ${curr})</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
              <span>${this.langService.t('purchasing.stockAdjustments.alerts.netFinancialImpact')}</span> 
              <strong style="color: ${isNetPositive ? '#059669' : '#dc2626'}; font-size: 1rem;">
                ${isNetPositive ? '+' : ''}${netVal.toFixed(2)} ${curr}
              </strong>
            </div>
          </div>
          <div style="padding: 8px 12px; background: #ecfdf5; border-radius: 6px; border-inline-start: 4px solid #059669; font-size: 0.8rem; color: #065f46;">
            <i class="pi pi-info-circle"></i> ${this.langService.t('purchasing.stockAdjustments.alerts.bulkInfoNotice')}
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('purchasing.stockAdjustments.alerts.confirmBulkBtn'),
      cancelButtonText: this.langService.t('purchasing.stockAdjustments.alerts.cancelAndEdit'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.isSubmitting.set(true);

        const payload: PostInventoryAuditRequest = {
          companyId: this.currentCompanyId,
          warehouseCode: this.auditWarehouseCode(),
          auditDate: this.auditDate(),
          auditReference: this.auditReference()?.trim() || undefined,
          notes: this.auditNotes()?.trim() || undefined,
          items: modified.map(r => ({
            itemId: r.item.id,
            actualQuantity: Number(r.actualQuantity),
            reasonAr: r.reasonAr?.trim() || this.langService.t('purchasing.stockAdjustments.alerts.defaultAuditNotes'),
            reasonEn: r.reasonEn?.trim() || 'Physical inventory audit'
          }))
        };

        this.purchasingService.postInventoryAudit(payload).subscribe({
          next: (result: PostInventoryAuditResultDto) => {
            this.isSubmitting.set(false);
            Swal.fire({
              icon: 'success',
              title: this.langService.t('purchasing.stockAdjustments.alerts.bulkSuccessTitle'),
              html: `
                <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; line-height: 1.6;">
                  <div>${this.langService.t('purchasing.stockAdjustments.alerts.auditRefNumber')} <strong style="font-family: monospace; color: #0284c7;">${result.auditReferenceNumber}</strong></div>
                  ${result.journalEntryNumber ? `<div>${this.langService.t('purchasing.stockAdjustments.alerts.generatedJournalEntry')} <strong style="color: #059669; font-family: monospace;">${result.journalEntryNumber}</strong></div>` : ''}
                  <div>${this.langService.t('purchasing.stockAdjustments.alerts.modifiedItemsCount')} <strong>${this.langService.t('purchasing.stockAdjustments.alerts.itemsUnit', { count: result.adjustedItemsCount })}</strong></div>
                  <div>${this.langService.t('purchasing.stockAdjustments.alerts.totalSurplus')} <strong style="color: #059669;">+${result.totalSurplusAmount.toFixed(2)} ${curr}</strong></div>
                  <div>${this.langService.t('purchasing.stockAdjustments.alerts.totalDeficit')} <strong style="color: #dc2626;">-${result.totalDeficitAmount.toFixed(2)} ${curr}</strong></div>
                  <div>${this.langService.t('purchasing.stockAdjustments.alerts.netAdjustment')} <strong>${result.netAdjustmentAmount.toFixed(2)} ${curr}</strong></div>
                </div>
              `,
              showCancelButton: !!result.journalEntryNumber,
              confirmButtonText: this.langService.t('purchasing.stockAdjustments.alerts.okDone'),
              cancelButtonText: this.langService.t('purchasing.stockAdjustments.alerts.viewInJournal'),
              confirmButtonColor: '#059669',
              cancelButtonColor: '#0284c7'
            }).then((dlgRes) => {
              if (dlgRes.dismiss === Swal.DismissReason.cancel && result.journalEntryNumber) {
                this.router.navigate(['/accounting/journal-entries'], {
                  queryParams: { search: result.journalEntryNumber }
                });
              }
            });

            this.loadData();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            Swal.fire({
              icon: 'error',
              title: this.langService.t('purchasing.stockAdjustments.alerts.bulkErrorTitle'),
              text: err?.error?.Description || err?.error?.description || this.langService.t('common.errorOccurred'),
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }
}
