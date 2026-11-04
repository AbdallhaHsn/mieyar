import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  PurchasingService,
  ItemDto,
  ItemWarehouseStockDto
} from '../../../../core/services/purchasing.service';
import {
  BranchesWarehousesService,
  WarehouseDto
} from '../../../../core/services/branches-warehouses.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { InvoicesService } from '../../../../core/services/invoices.service';
import { LanguageService } from '../../../../core/services/language.service';
import Swal from 'sweetalert2';

export interface WarehouseItemAnalyticsDto {
  itemId: string;
  itemCode: string;
  nameAr: string;
  nameEn?: string;
  categoryName?: string;
  unit: string;
  currentQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  stockHealth: 'healthy' | 'warning' | 'danger' | 'empty';
  healthLabel: string;
  averageCostPrice: number;
  highestSalePrice: number;
  lowestSalePrice: number;
  expectedProfitMargin: number;
  totalValuation: number;
  binLocation?: string;
  isNearDepletion: boolean;
  isOutOfStock: boolean;
}

@Component({
  selector: 'app-warehouse-analytics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe, TranslatePipe],
  templateUrl: './warehouse-analytics-page.component.html',
  styleUrls: ['./warehouse-analytics-page.component.scss']
})
export class WarehouseAnalyticsPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public purchasingService = inject(PurchasingService);
  public bwService = inject(BranchesWarehousesService);
  public companyContext = inject(CompanyContextService);
  public invoicesService = inject(InvoicesService);
  public langService = inject(LanguageService);

  warehouseId = signal<string>('');
  warehouse = signal<WarehouseDto | null>(null);
  isLoading = signal<boolean>(true);
  isExporting = signal<boolean>(false);

  // Items Analytics
  analyticsItems = signal<WarehouseItemAnalyticsDto[]>([]);
  analyticsFilter = signal<'ALL' | 'LOW' | 'OUT' | 'HEALTHY'>('ALL');
  analyticsSearch = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  Math = Math;

  // Computed Filters
  filteredAnalyticsItems = computed(() => {
    let list = this.analyticsItems();
    const f = this.analyticsFilter();
    const q = this.analyticsSearch().toLowerCase().trim();

    if (f === 'LOW') {
      list = list.filter(i => i.isNearDepletion);
    } else if (f === 'OUT') {
      list = list.filter(i => i.isOutOfStock);
    } else if (f === 'HEALTHY') {
      list = list.filter(i => !i.isNearDepletion && !i.isOutOfStock);
    }

    if (!q) return list;

    return list.filter(i =>
      i.itemCode.toLowerCase().includes(q) ||
      i.nameAr.toLowerCase().includes(q) ||
      (i.nameEn && i.nameEn.toLowerCase().includes(q)) ||
      (i.categoryName && i.categoryName.toLowerCase().includes(q)) ||
      (i.binLocation && i.binLocation.toLowerCase().includes(q))
    );
  });

  paginatedItems = computed(() => {
    const list = this.filteredAnalyticsItems();
    const p = this.currentPage();
    const s = this.pageSize();
    const start = (p - 1) * s;
    return list.slice(start, start + s);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredAnalyticsItems().length / this.pageSize()) || 1;
  });

  // KPIs
  totalItems = computed(() => this.analyticsItems().length);
  totalValuation = computed(() =>
    this.analyticsItems().reduce((acc, curr) => acc + curr.totalValuation, 0)
  );
  totalUnits = computed(() =>
    this.analyticsItems().reduce((acc, curr) => acc + curr.currentQuantity, 0)
  );
  lowStockCount = computed(() =>
    this.analyticsItems().filter(i => i.isNearDepletion).length
  );
  outOfStockCount = computed(() =>
    this.analyticsItems().filter(i => i.isOutOfStock).length
  );
  avgMargin = computed(() => {
    const valid = this.analyticsItems().filter(i => i.expectedProfitMargin > 0);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, curr) => acc + curr.expectedProfitMargin, 0);
    return Math.round(sum / valid.length);
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.warehouseId.set(id);
        this.loadWarehouseAndAnalytics(id);
      } else {
        this.router.navigate(['/purchasing/warehouses']);
      }
    });
  }

  loadWarehouseAndAnalytics(warehouseId: string): void {
    this.isLoading.set(true);
    const compId = this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';

    forkJoin({
      warehouses: this.bwService.getWarehouses(compId).pipe(catchError(() => of([]))),
      stocks: this.purchasingService.getWarehouseStocks(warehouseId).pipe(catchError(() => of([]))),
      items: this.purchasingService.getItems().pipe(catchError(() => of([]))),
      invoices: this.invoicesService.getInvoices().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ warehouses, stocks, items, invoices }) => {
        // Find warehouse
        let wh = (warehouses || []).find(w => w.id === warehouseId);
        if (!wh && stocks && stocks.length > 0) {
          const first = stocks[0];
          wh = {
            id: warehouseId,
            companyId: compId,
            code: first.warehouseCode || 'WH-01',
            nameAr: first.warehouseNameAr || 'المستودع المحدد',
            nameEn: 'Warehouse',
            isDefault: false,
            isActive: true
          };
        }
        this.warehouse.set(wh || null);

        // Map items
        const itemMap = new Map<string, ItemDto>();
        (items || []).forEach(it => {
          itemMap.set(it.id, it);
          if (it.itemCode) itemMap.set(it.itemCode, it);
        });

        // Map historical prices from invoices
        const priceMap = new Map<string, number[]>();
        (invoices || []).forEach(inv => {
          (inv.lines || []).forEach(l => {
            const price = Number(l.unitPrice) || 0;
            if (price > 0) {
              if (l.itemId) {
                const arr = priceMap.get(l.itemId) || [];
                arr.push(price);
                priceMap.set(l.itemId, arr);
              }
              if (l.itemCode) {
                const arr = priceMap.get(l.itemCode) || [];
                arr.push(price);
                priceMap.set(l.itemCode, arr);
              }
            }
          });
        });

        const analyticsList: WarehouseItemAnalyticsDto[] = [];

        if (stocks && stocks.length > 0) {
          stocks.forEach(st => {
            const matchedItem = itemMap.get(st.itemId) || itemMap.get(st.itemCode);
            const historyPrices = priceMap.get(st.itemId) || priceMap.get(st.itemCode) || [];

            const currentQty = st.quantity || 0;
            const minStock = st.minStockLevel || matchedItem?.minStockLevel || 10;
            const maxStock = st.maxStockLevel || (minStock * 4);
            const avgCost = st.costPrice > 0 ? st.costPrice : (matchedItem?.costPrice || matchedItem?.purchasePrice || 0);
            const baseSale = matchedItem?.salePrice || (avgCost > 0 ? avgCost * 1.25 : 0);

            let highPrice = baseSale;
            let lowPrice = baseSale;
            if (historyPrices.length > 0) {
              highPrice = Math.max(...historyPrices, baseSale);
              lowPrice = Math.min(...historyPrices.filter(p => p > 0), baseSale || highPrice);
            } else if (baseSale > 0) {
              highPrice = Math.round(baseSale * 1.15 * 100) / 100;
              lowPrice = Math.round(baseSale * 0.95 * 100) / 100;
            }

            const profitMargin = (highPrice > 0 && avgCost > 0)
              ? Math.max(0, Math.round(((highPrice - avgCost) / highPrice) * 100))
              : 0;

            const isOutOfStock = currentQty <= 0;
            const isNearDepletion = !isOutOfStock && currentQty <= minStock;

            let healthStatus: 'danger' | 'warning' | 'healthy' | 'empty' = 'healthy';
            let healthLabel = this.langService.t('inventory.warehouses.analytics.health.sufficient');
            if (isOutOfStock) {
              healthStatus = 'empty';
              healthLabel = this.langService.t('inventory.warehouses.analytics.health.outOfStock');
            } else if (isNearDepletion) {
              healthStatus = 'danger';
              healthLabel = this.langService.t('inventory.warehouses.analytics.health.lowStock');
            } else if (currentQty < minStock * 1.5) {
              healthStatus = 'warning';
              healthLabel = this.langService.t('inventory.warehouses.analytics.health.critical');
            }

            analyticsList.push({
              itemId: st.itemId,
              itemCode: st.itemCode,
              nameAr: st.itemNameAr || matchedItem?.nameAr || this.langService.t('inventory.warehouses.analytics.unnamedItem'),
              nameEn: st.itemNameEn || matchedItem?.nameEn || '',
              categoryName: matchedItem?.categoryNameAr || this.langService.t('inventory.warehouses.analytics.generalCategory'),
              unit: matchedItem?.unitOfMeasure || this.langService.t('inventory.warehouses.analytics.pieceUnit'),
              currentQuantity: currentQty,
              minStockLevel: minStock,
              maxStockLevel: maxStock,
              stockHealth: healthStatus,
              healthLabel: healthLabel,
              averageCostPrice: avgCost,
              highestSalePrice: highPrice,
              lowestSalePrice: lowPrice,
              expectedProfitMargin: profitMargin,
              totalValuation: Math.round(currentQty * avgCost * 100) / 100,
              binLocation: st.binLocation || '-',
              isNearDepletion,
              isOutOfStock
            });
          });
        }

        this.analyticsItems.set(analyticsList);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('inventory.warehouses.analytics.alerts.fetchErrorTitle'),
          text: this.langService.t('inventory.warehouses.analytics.alerts.fetchErrorText'),
          confirmButtonColor: '#059669'
        });
      }
    });
  }

  setFilter(f: 'ALL' | 'LOW' | 'OUT' | 'HEALTHY'): void {
    this.analyticsFilter.set(f);
    this.currentPage.set(1);
  }

  goBack(): void {
    this.router.navigate(['/purchasing/warehouses']);
  }

  printReport(): void {
    window.print();
  }

  /**
   * Professional Arabic RTL Excel Export
   * Conforms strictly to project identity, company data, VAT/CR, and Arabic styling.
   */
  exportToExcel(): void {
    const wh = this.warehouse();
    const items = this.filteredAnalyticsItems();

    if (!items || items.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('inventory.warehouses.analytics.alerts.noDataToExportTitle'),
        text: this.langService.t('inventory.warehouses.analytics.alerts.noDataToExportText'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    this.isExporting.set(true);

    const company = this.companyContext.activeCompany();
    const companyNameAr = company.nameAr || 'شركة مِعْيَــــار للحلول الذكية والمحاسبية';
    const companyNameEn = company.nameEn || 'Al-Roban ERP Smart Solutions';
    const vatNo = company.vatNumber || '310123456700003';
    const crNo = company.commercialRegistration || '1010789456';
    const currency = company.currencyCode || 'SAR';
    const nowStr = new Date().toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + ' - ' + new Date().toLocaleTimeString('ar-SA');

    const whName = wh ? (this.langService.currentLang() === 'en' ? `${wh.nameEn || wh.nameAr} (${wh.code})` : `${wh.nameAr} (${wh.code})`) : this.langService.t('inventory.warehouses.analytics.mainWarehouseDefault');
    const branchName = wh?.branchName || this.langService.t('inventory.warehouses.analytics.mainBranchDefault');

    let rowsHtml = '';
    items.forEach((item, index) => {
      let statusBg = '#ECFDF5';
      let statusColor = '#065F46';
      if (item.isOutOfStock) {
        statusBg = '#FEE2E2';
        statusColor = '#991B1B';
      } else if (item.isNearDepletion) {
        statusBg = '#FEF3C7';
        statusColor = '#92400E';
      }

      rowsHtml += `
        <tr style="height: 28px; background-color: ${index % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="text-align: center; border: 1px solid #CBD5E1; font-weight: bold; font-family: 'Consolas', monospace; mso-number-format: '\\@';">${item.itemCode}</td>
          <td style="text-align: right; border: 1px solid #CBD5E1; font-weight: bold; color: #0F172A; padding: 4px 8px;">${item.nameAr}</td>
          <td style="text-align: left; direction: ltr; border: 1px solid #CBD5E1; color: #64748B; padding: 4px 8px;">${item.nameEn || '-'}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; color: #334155;">${item.categoryName || 'عام'}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1;">${item.unit}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; font-weight: bold; font-size: 11pt; color: #0F172A; mso-number-format: '\\#\\,\\#\\#0';">${item.currentQuantity}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; color: #64748B; mso-number-format: '\\#\\,\\#\\#0';">${item.minStockLevel}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; background-color: ${statusBg}; color: ${statusColor}; font-weight: bold;">
            ${item.healthLabel}
          </td>
          <td style="text-align: left; direction: ltr; border: 1px solid #CBD5E1; font-family: 'Consolas', monospace; mso-number-format: '\\#\\,\\#\\#0\\.00';">${item.averageCostPrice.toFixed(2)}</td>
          <td style="text-align: left; direction: ltr; border: 1px solid #CBD5E1; font-family: 'Consolas', monospace; font-weight: bold; color: #059669; mso-number-format: '\\#\\,\\#\\#0\\.00';">${item.highestSalePrice.toFixed(2)}</td>
          <td style="text-align: left; direction: ltr; border: 1px solid #CBD5E1; font-family: 'Consolas', monospace; color: #0284C7; mso-number-format: '\\#\\,\\#\\#0\\.00';">${item.lowestSalePrice.toFixed(2)}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; font-weight: bold; color: #4F46E5;">${item.expectedProfitMargin}%</td>
          <td style="text-align: left; direction: ltr; border: 1px solid #CBD5E1; font-family: 'Consolas', monospace; font-weight: bold; color: #0F172A; background-color: #F1F5F9; mso-number-format: '\\#\\,\\#\\#0\\.00';">${item.totalValuation.toFixed(2)}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; color: #475569;">${item.binLocation || '-'}</td>
        </tr>
      `;
    });

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>تقرير المخزون والتحليل المالي</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }
          .header-main { background-color: #0B1528; color: #FFFFFF; font-size: 15pt; font-weight: bold; text-align: center; height: 42px; vertical-align: middle; }
          .header-sub { background-color: #0F172A; color: #94A3B8; font-size: 10pt; text-align: center; height: 26px; vertical-align: middle; }
          .tax-bar { background-color: #F8FAFC; color: #334155; font-size: 9.5pt; text-align: center; border-bottom: 2px solid #059669; height: 26px; vertical-align: middle; }
          .report-title-bar { background-color: #047857; color: #FFFFFF; font-size: 13pt; font-weight: bold; text-align: center; height: 36px; vertical-align: middle; }
          .report-meta-bar { background-color: #F1F5F9; color: #1E293B; font-size: 9pt; text-align: center; height: 26px; vertical-align: middle; }
          
          .kpi-title { background-color: #E2E8F0; color: #475569; font-size: 8.5pt; text-align: center; font-weight: bold; border: 1px solid #CBD5E1; }
          .kpi-val { background-color: #FFFFFF; font-size: 12pt; text-align: center; font-weight: bold; border: 1px solid #CBD5E1; height: 30px; vertical-align: middle; }
          
          .th-col { background-color: #0F172A; color: #FFFFFF; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #334155; height: 32px; vertical-align: middle; }
          .th-price { background-color: #1E293B; color: #34D399; font-size: 9.5pt; font-weight: bold; text-align: center; border: 1px solid #334155; height: 32px; vertical-align: middle; }
          
          .row-total { background-color: #0B1528; color: #FFFFFF; font-size: 11pt; font-weight: bold; border: 1px solid #000000; height: 34px; vertical-align: middle; }
          .sig-box { text-align: center; vertical-align: top; padding-top: 15px; font-size: 9.5pt; font-weight: bold; border: none; }
          .sig-line { padding-top: 35px; color: #64748B; font-weight: normal; }
        </style>
      </head>
      <body>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <!-- Company & Branding Identity -->
          <tr>
            <th colspan="14" class="header-main">
              ${companyNameAr} | ${companyNameEn} - ${this.langService.t('inventory.warehouses.analytics.excel.erpSubtitle')}
            </th>
          </tr>
          <tr>
            <td colspan="14" class="header-sub">
              ${this.langService.t('inventory.warehouses.analytics.excel.complianceHeader')}
            </td>
          </tr>
          <tr>
            <td colspan="14" class="tax-bar">
              <strong>${this.langService.t('inventory.warehouses.analytics.excel.vatLabel')}</strong> ${vatNo} | 
              <strong>${this.langService.t('inventory.warehouses.analytics.excel.crLabel')}</strong> ${crNo} | 
              <strong>${this.langService.t('inventory.warehouses.analytics.excel.branchLabel')}</strong> ${branchName} | 
              <strong>${this.langService.t('inventory.warehouses.analytics.excel.currencyLabel')}</strong> ${currency} ${this.langService.t('inventory.warehouses.analytics.excel.sarParenthesis')}
            </td>
          </tr>
          <tr>
            <th colspan="14" class="report-title-bar">
              ${this.langService.t('inventory.warehouses.analytics.excel.reportTitlePrefix')}${whName}
            </th>
          </tr>
          <tr>
            <td colspan="14" class="report-meta-bar">
              <strong>${this.langService.t('inventory.warehouses.analytics.excel.extractedAt')}</strong> ${nowStr} | 
              <strong>${this.langService.t('inventory.warehouses.analytics.excel.statusLabel')}</strong> ${wh?.isActive ? this.langService.t('inventory.warehouses.analytics.activeStatus') : this.langService.t('inventory.warehouses.analytics.inactiveStatus')} | 
              <strong>${this.langService.t('inventory.warehouses.analytics.excel.managerLabel')}</strong> ${wh?.managerName || this.langService.t('inventory.warehouses.analytics.unspecified')} | 
              <strong>${this.langService.t('inventory.warehouses.analytics.excel.phoneLabel')}</strong> ${wh?.managerPhone || this.langService.t('inventory.warehouses.analytics.unspecified')}
            </td>
          </tr>
          
          <!-- Spacing -->
          <tr style="height: 10px; border: none;"><td colspan="14" style="border: none;"></td></tr>

          <!-- KPI Summary Strip in Excel -->
          <tr>
            <td colspan="2" class="kpi-title">${this.langService.t('inventory.warehouses.analytics.excel.kpiTotalItems')}</td>
            <td colspan="3" class="kpi-title">${this.langService.t('inventory.warehouses.analytics.excel.kpiTotalValuation')}</td>
            <td colspan="3" class="kpi-title">${this.langService.t('inventory.warehouses.analytics.excel.kpiLowStock')}</td>
            <td colspan="3" class="kpi-title">${this.langService.t('inventory.warehouses.analytics.excel.kpiOutOfStock')}</td>
            <td colspan="3" class="kpi-title">${this.langService.t('inventory.warehouses.analytics.excel.kpiAvgMargin')}</td>
          </tr>
          <tr>
            <td colspan="2" class="kpi-val" style="color: #0284C7;">${this.totalItems()} ${this.langService.t('inventory.warehouses.analytics.excel.itemsUnit')} (${this.totalUnits()} وحدة)</td>
            <td colspan="3" class="kpi-val" style="color: #059669; font-family: 'Consolas', monospace;">${this.totalValuation().toFixed(2)} ر.س</td>
            <td colspan="3" class="kpi-val" style="color: #D97706;">${this.lowStockCount()} صنف (تحت حد الطلب)</td>
            <td colspan="3" class="kpi-val" style="color: #DC2626;">${this.outOfStockCount()} ${this.langService.t('inventory.warehouses.analytics.excel.itemsUnit')}</td>
            <td colspan="3" class="kpi-val" style="color: #4F46E5;">${this.avgMargin()}%</td>
          </tr>

          <!-- Spacing -->
          <tr style="height: 12px; border: none;"><td colspan="14" style="border: none;"></td></tr>

          <!-- Data Table Header -->
          <tr>
            <th class="th-col" style="width: 110px;">${this.langService.t('inventory.warehouses.analytics.excel.thCode')}</th>
            <th class="th-col" style="width: 240px;">${this.langService.t('inventory.warehouses.analytics.excel.thNameAr')}</th>
            <th class="th-col" style="width: 180px;">${this.langService.t('inventory.warehouses.analytics.excel.thNameEn')}</th>
            <th class="th-col" style="width: 110px;">${this.langService.t('inventory.warehouses.analytics.excel.thCategory')}</th>
            <th class="th-col" style="width: 70px;">${this.langService.t('inventory.warehouses.analytics.excel.thUnit')}</th>
            <th class="th-col" style="width: 90px;">${this.langService.t('inventory.warehouses.analytics.excel.thBalance')}</th>
            <th class="th-col" style="width: 85px;">${this.langService.t('inventory.warehouses.analytics.excel.thReorder')}</th>
            <th class="th-col" style="width: 125px;">${this.langService.t('inventory.warehouses.analytics.excel.thStatus')}</th>
            <th class="th-price" style="width: 110px;">${this.langService.t('inventory.warehouses.analytics.excel.thCost')}</th>
            <th class="th-price" style="width: 110px;">${this.langService.t('inventory.warehouses.analytics.excel.thMaxPrice')}</th>
            <th class="th-price" style="width: 110px;">${this.langService.t('inventory.warehouses.analytics.excel.thMinPrice')}</th>
            <th class="th-price" style="width: 95px;">${this.langService.t('inventory.warehouses.analytics.excel.thMargin')}</th>
            <th class="th-col" style="width: 130px;">${this.langService.t('inventory.warehouses.analytics.excel.thValuation')}</th>
            <th class="th-col" style="width: 90px;">${this.langService.t('inventory.warehouses.analytics.excel.thLocation')}</th>
          </tr>

          <!-- Dynamic Data Rows -->
          ${rowsHtml}

          <!-- Total Footer Row -->
          <tr class="row-total">
            <td colspan="5" style="text-align: right; padding-right: 15px; font-weight: bold; border: 1px solid #000;">
              ${this.langService.t('inventory.warehouses.analytics.excel.grandTotalPrefix').replace('{count}', items.length.toString())}
            </td>
            <td style="text-align: center; border: 1px solid #000; font-family: 'Consolas', monospace; mso-number-format: '\\#\\,\\#\\#0';">
              ${this.totalUnits()}
            </td>
            <td colspan="6" style="text-align: left; border: 1px solid #000;"></td>
            <td style="text-align: left; direction: ltr; border: 1px solid #000; font-family: 'Consolas', monospace; color: #34D399; font-size: 12pt; mso-number-format: '\\#\\,\\#\\#0\\.00';">
              ${this.totalValuation().toFixed(2)}
            </td>
            <td style="border: 1px solid #000;"></td>
          </tr>

          <!-- Signature Matrix -->
          <tr style="height: 30px; border: none;"><td colspan="14" style="border: none;"></td></tr>
          <tr>
            <td colspan="4" class="sig-box">
              ${this.langService.t('inventory.warehouses.analytics.excel.sigWarehouseKeeper')}<br>
              Warehouse Keeper
              <div class="sig-line">${this.langService.t('inventory.warehouses.analytics.excel.sigNameAndSign')}</div>
            </td>
            <td colspan="5" class="sig-box">
              ${this.langService.t('inventory.warehouses.analytics.excel.sigChiefAccountant')}<br>
              Inventory Controller & Chief Accountant
              <div class="sig-line">${this.langService.t('inventory.warehouses.analytics.excel.sigNameAndSign')}</div>
            </td>
            <td colspan="5" class="sig-box">
              ${this.langService.t('inventory.warehouses.analytics.excel.sigCfo')}<br>
              Chief Financial Officer
              <div class="sig-line">${this.langService.t('inventory.warehouses.analytics.excel.sigApprovalAndStamp')}</div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      const blob = new Blob(['\uFEFF' + excelTemplate], {
        type: 'application/vnd.ms-excel;charset=utf-8;'
      });
      const link = document.createElement('a');
      const filename = `${this.langService.t('inventory.warehouses.analytics.excel.filenamePrefix')}${wh ? wh.code : this.langService.t('inventory.warehouses.analytics.defaultWarehouse')}_${new Date().toISOString().slice(0, 10)}.xls`;
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      Swal.fire({
        icon: 'success',
        title: this.langService.t('inventory.warehouses.analytics.alerts.exportSuccessTitle'),
        text: this.langService.t('inventory.warehouses.analytics.alerts.exportSuccessText'),
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: this.langService.t('inventory.warehouses.analytics.alerts.exportFailedTitle'),
        text: this.langService.t('inventory.warehouses.analytics.alerts.exportFailedText'),
        confirmButtonColor: '#059669'
      });
    } finally {
      this.isExporting.set(false);
    }
  }
}
