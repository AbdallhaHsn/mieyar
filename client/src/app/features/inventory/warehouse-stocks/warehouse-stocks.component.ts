import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  PurchasingService,
  ItemDto,
  ItemWarehouseStockDto
} from '../../../core/services/purchasing.service';
import { BranchesWarehousesService, WarehouseDto } from '../../../core/services/branches-warehouses.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-warehouse-stocks',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule, PaginationComponent, TranslatePipe],
  templateUrl: './warehouse-stocks.component.html',
  styleUrls: ['./warehouse-stocks.component.scss']
})
export class WarehouseStocksComponent implements OnInit {
  public purchasingService = inject(PurchasingService);
  public bwService = inject(BranchesWarehousesService);
  public companyContext = inject(CompanyContextService);
  public langService = inject(LanguageService);
  public translator = inject(AccountingTranslatorService);

  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedWarehouseFilter = signal<string>('ALL');
  lowStockOnly = signal<boolean>(false);

  stocks = signal<ItemWarehouseStockDto[]>([]);
  warehouses = signal<WarehouseDto[]>([]);
  items = signal<ItemDto[]>([]);

  // Filtered stocks computed
  filteredStocks = computed(() => {
    let list = this.stocks();
    const whFilter = this.selectedWarehouseFilter();
    const query = this.searchQuery().toLowerCase().trim();
    const lowOnly = this.lowStockOnly();

    if (whFilter !== 'ALL') {
      list = list.filter(s => s.warehouseCode === whFilter || s.warehouseId === whFilter);
    }

    if (lowOnly) {
      list = list.filter(s => s.quantity <= s.minStockLevel || s.quantity <= 0);
    }

    if (query) {
      list = list.filter(s =>
        s.itemCode.toLowerCase().includes(query) ||
        s.itemNameAr.toLowerCase().includes(query) ||
        (s.itemNameEn && s.itemNameEn.toLowerCase().includes(query)) ||
        s.warehouseCode.toLowerCase().includes(query) ||
        s.warehouseNameAr.toLowerCase().includes(query) ||
        (s.binLocation && s.binLocation.toLowerCase().includes(query))
      );
    }

    return list;
  });

  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedStocks = computed(() => {
    const list = this.filteredStocks();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  // KPIs
  totalValuation = computed(() => {
    return this.filteredStocks().reduce((sum, s) => sum + (s.totalValue || 0), 0);
  });

  totalQuantity = computed(() => {
    return this.filteredStocks().reduce((sum, s) => sum + (s.quantity || 0), 0);
  });

  lowStockCount = computed(() => {
    return this.stocks().filter(s => s.quantity <= s.minStockLevel && s.minStockLevel > 0).length;
  });

  outOfStockCount = computed(() => {
    return this.stocks().filter(s => s.quantity <= 0).length;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    // 1. Load warehouses
    const compId = this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
    if (compId) {
      this.bwService.getWarehouses(compId).subscribe({
        next: (whs) => this.warehouses.set(whs || []),
        error: (err) => console.warn('Could not load warehouses', err)
      });
    }

    // 2. Load stockable items
    this.purchasingService.getItems().subscribe({
      next: (itms) => this.items.set(itms || []),
      error: (err) => console.warn('Could not load items', err)
    });

    // 3. Load warehouse stocks
    this.purchasingService.getWarehouseStocks().subscribe({
      next: (stks) => {
        if (!stks || stks.length === 0) {
          // If no stocks table rows exist yet, populate view from items
          this.buildFallbackStocks();
        } else {
          this.stocks.set(stks);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.buildFallbackStocks();
        this.isLoading.set(false);
      }
    });
  }

  private buildFallbackStocks(): void {
    const itms = this.items().filter(i => i.itemType === 1);
    const wh = this.warehouses()[0];
    const whCode = wh ? wh.code : 'WH-MAIN';
    const whNameAr = wh ? wh.nameAr : 'المستودع الرئيسي';
    const whNameEn = wh ? wh.nameEn : 'Main Central Warehouse';
    const whId = wh ? wh.id : '11111111-wh01-0000-0000-000000000001';

    const fallback: ItemWarehouseStockDto[] = itms.map(i => {
      const unitCost = i.costPrice || i.purchasePrice || 0;
      const totalVal = Math.round(i.currentStockQuantity * unitCost * 100) / 100;
      return {
        id: i.id,
        itemId: i.id,
        itemCode: i.itemCode,
        itemNameAr: i.nameAr,
        itemNameEn: i.nameEn || '',
        warehouseId: whId,
        warehouseCode: whCode,
        warehouseNameAr: whNameAr,
        warehouseNameEn: whNameEn,
        quantity: i.currentStockQuantity,
        costPrice: unitCost,
        totalValue: totalVal,
        minStockLevel: i.minStockLevel || 0,
        maxStockLevel: 0,
        binLocation: 'A-01-MAIN',
        lastMovementAtUtc: (i as any).lastModifiedAtUtc || i.createdAtUtc || new Date().toISOString()
      };
    });

    this.stocks.set(fallback);
  }

  getStockBadgeClass(stock: ItemWarehouseStockDto): string {
    if (stock.quantity <= 0) return 'badge-danger';
    if (stock.minStockLevel > 0 && stock.quantity <= stock.minStockLevel) return 'badge-warning';
    return 'badge-success';
  }

  getStockStatusLabel(stock: ItemWarehouseStockDto): string {
    const isAr = this.langService.currentLang() === 'ar';
    if (stock.quantity <= 0) return isAr ? 'نفد المخزون' : 'Out of Stock';
    if (stock.minStockLevel > 0 && stock.quantity <= stock.minStockLevel) return isAr ? 'تنبيه حد الطلب' : 'Low Stock Alert';
    return isAr ? 'متوفر وجاهز' : 'In Stock';
  }
}
