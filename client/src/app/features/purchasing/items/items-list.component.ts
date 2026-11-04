import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PurchasingService, ItemDto, ItemType, InventoryTransactionDto, CreateItemRequest, UpdateItemRequest } from '../../../core/services/purchasing.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { ItemCategoryService, ItemCategoryDto } from '../../../core/services/item-category.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-items-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterModule, PaginationComponent, TranslatePipe],
  template: `
    <div class="items-page" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      <!-- Compact Executive Header -->
      <header class="page-header compact-header">
        <div class="header-titles">
          <div class="title-with-badge">
            <div class="header-icon-cube">
              <i class="pi pi-box"></i>
            </div>
            <div>
              <div class="title-meta">
                <span class="category-path">{{ 'purchasing.items.categoryPath' | translate }}</span>
                <span class="sep">/</span>
                <span class="standard-badge"><i class="pi pi-shield"></i> IAS 2 Inventory Standard</span>
              </div>
              <h1 class="main-title">{{ 'purchasing.items.title' | translate }}</h1>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary-compact" (click)="loadItems()" [title]="'zatca.actions.refreshTitle' | translate">
            <i class="pi pi-refresh" [class.pi-spin]="isLoading()"></i>
            <span>{{ 'purchasing.items.refresh' | translate }}</span>
          </button>
          <button class="btn btn-primary-compact" (click)="openCreateModal()">
            <i class="pi pi-plus"></i>
            <span>{{ 'purchasing.items.newItem' | translate }}</span>
          </button>
        </div>
      </header>

      <!-- Executive Compact Metrics Ribbon (شريط إحصائي تنفيذي مدمج وتفاعلي) -->
      <section class="executive-metrics-bar">
        <!-- Metric 1: Total Items -->
        <div class="metric-segment" (click)="setTypeFilter(null); onlyLowStockFilter.set(false)" [class.active-segment]="selectedType() === null && !onlyLowStockFilter()" [title]="'ui.itemsList.9625b1' | translate">
          <div class="metric-icon-mini bg-emerald-subtle">
            <i class="pi pi-box"></i>
          </div>
          <div class="metric-text-group">
            <span class="metric-title">{{ 'purchasing.items.kpis.totalItems' | translate }}</span>
            <div class="metric-number-row">
              <strong class="metric-num">{{ totalItemsCount() }}</strong>
              <span class="metric-unit">{{ 'purchasing.items.kpis.totalItemsUnit' | translate }}</span>
            </div>
          </div>
        </div>

        <div class="metric-divider"></div>

        <!-- Metric 2: Stock Valuation -->
        <div class="metric-segment" [title]="'ui.itemsList.29046f' | translate">
          <div class="metric-icon-mini bg-blue-subtle">
            <i class="pi pi-database"></i>
          </div>
          <div class="metric-text-group">
            <span class="metric-title">{{ 'ui.itemsList.56768a' | translate }}</span>
            <div class="metric-number-row">
              <strong class="metric-num text-blue">{{ totalStockValuation() | number:'1.2-2' }}</strong>
              <span class="metric-unit">{{ 'ui.itemsList.ea1d59' | translate }}</span>
            </div>
          </div>
        </div>

        <div class="metric-divider"></div>

        <!-- Metric 3: Low Stock Alerts (Interactive Filter) -->
        <div class="metric-segment warning-segment" [class.active-segment]="onlyLowStockFilter()" (click)="toggleLowStockFilter()" [title]="'ui.itemsList.cbfbe6' | translate">
          <div class="metric-icon-mini" [ngClass]="lowStockCount() > 0 ? 'bg-amber-pulse' : 'bg-slate-subtle'">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <div class="metric-text-group">
            <span class="metric-title">{{ 'ui.itemsList.256180' | translate }}</span>
            <div class="metric-number-row">
              <strong class="metric-num" [class.text-amber]="lowStockCount() > 0">{{ lowStockCount() }}</strong>
              <span class="metric-unit" [class.badge-warning-pill]="lowStockCount() > 0">{{ lowStockCount() > 0 ? ('ui.itemsList.6cb9f4' | translate) : ('ui.itemsList.3ec47c' | translate) }}</span>
            </div>
          </div>
        </div>

        <div class="metric-divider"></div>

        <!-- Metric 4: Services & Non-Stock -->
        <div class="metric-segment" (click)="setTypeFilter(ItemType.Service)" [class.active-segment]="selectedType() === ItemType.Service" [title]="'ui.itemsList.2d0bb3' | translate">
          <div class="metric-icon-mini bg-purple-subtle">
            <i class="pi pi-briefcase"></i>
          </div>
          <div class="metric-text-group">
            <span class="metric-title">{{ 'ui.itemsList.d966a2' | translate }}</span>
            <div class="metric-number-row">
              <strong class="metric-num text-purple">{{ serviceItemsCount() }}</strong>
              <span class="metric-unit">{{ 'ui.itemsList.b5f0a2' | translate }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Modern Command & Filter Bar -->
      <div class="command-filter-bar">
        <!-- Search Command Input -->
        <div class="search-command-box">
          <i class="pi pi-search search-ico"></i>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onFilterChange()"
            [placeholder]="'ui.itemsList.d4898d' | translate"
          />
          <button *ngIf="searchQuery" (click)="searchQuery = ''; onFilterChange()" class="clear-search-btn">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <!-- Type Filter Tabs -->
        <div class="type-filter-pills">
          <button [class.active]="selectedType() === null && !onlyLowStockFilter()" (click)="setTypeFilter(null); onlyLowStockFilter.set(false)">
            {{ 'ui.warehouses.9f324a' | translate }}{{ items().length }})
          </button>
          <button [class.active]="selectedType() === ItemType.Stockable" (click)="setTypeFilter(ItemType.Stockable)">
            {{ 'ui.itemsList.0a5cec' | translate }}
          </button>
          <button [class.active]="selectedType() === ItemType.Service" (click)="setTypeFilter(ItemType.Service)">
            {{ 'purchasing.items.filters.services' | translate }}
          </button>
          <button [class.active]="selectedType() === ItemType.RawMaterial" (click)="setTypeFilter(ItemType.RawMaterial)">
            {{ 'purchasing.items.filters.rawMaterials' | translate }}
          </button>
          <button [class.active]="selectedType() === ItemType.Asset" (click)="setTypeFilter(ItemType.Asset)">
            {{ 'ui.itemsList.bba958' | translate }}
          </button>
        </div>

        <!-- Category Dropdown Filter -->
        <div class="category-select-pill">
          <i class="pi pi-tags" style="color: #0284c7; font-size: 0.85rem;"></i>
          <select [ngModel]="selectedCategory()" (ngModelChange)="selectedCategory.set($event); onFilterChange()">
            <option value="all">{{ 'ui.itemsList.2829fb' | translate }}</option>
            <option *ngFor="let cat of categories()" [value]="cat.code">
              {{ langService.currentLang() === 'ar' ? cat.nameAr : (cat.nameEn || cat.nameAr) }}
            </option>
          </select>
        </div>

        <!-- View Mode Switcher (طريقة عارض مبتكرة خارج الصندوق) -->
        <div class="view-mode-toggle">
          <button 
            type="button" 
            [class.active]="viewMode() === 'cards'" 
            (click)="viewMode.set('cards')"
            [title]="'ui.itemsList.f0b340' | translate">
            <i class="pi pi-th-large"></i>
            <span>{{ 'ui.itemsList.ae3c67' | translate }}</span>
          </button>
          <button 
            type="button" 
            [class.active]="viewMode() === 'table'" 
            (click)="viewMode.set('table')"
            [title]="'ui.itemsList.bf6b7d' | translate">
            <i class="pi pi-list"></i>
            <span>{{ 'ui.itemsList.390eaf' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- Main Catalog Display Area -->
      <div class="catalog-display-container">
        <!-- Loading State -->
        <div *ngIf="isLoading()" class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
          <span>{{ 'ui.itemsList.97a681' | translate }}</span>
        </div>

        <!-- View Mode 1: Innovative Smart Cards Grid (طريقة عارض مبتكرة) -->
        <div *ngIf="!isLoading() && filteredItems().length > 0 && viewMode() === 'cards'" class="items-cards-grid">
          <div *ngFor="let item of paginatedItems()" class="item-smart-card" [class.card-low-stock]="isLowStock(item)">
            <!-- Top Card Header -->
            <div class="card-head">
              <div class="card-badges">
                <span class="item-code-badge" [title]="'purchasing.items.table.code' | translate">
                  <i class="pi pi-hashtag"></i> {{ item.itemCode }}
                </span>
                <span *ngIf="getItemCategoryDisplay(item)" class="item-category-tag" [title]="'purchasing.items.table.category' | translate">
                  <i class="pi pi-tag"></i> {{ getItemCategoryDisplay(item) }}
                </span>
              </div>
              <span class="type-pill" [ngClass]="getTypeBadgeClass(item.itemType)">
                {{ getTypeLabel(item.itemType) }}
              </span>
            </div>

            <!-- Card Body: Item Name & Barcode -->
            <div class="card-body">
              <h3 class="card-title" [title]="langService.currentLang() === 'ar' ? item.nameAr : (item.nameEn || item.nameAr)">
                {{ langService.currentLang() === 'ar' ? item.nameAr : (item.nameEn || item.nameAr) }}
              </h3>
              <p class="card-subtitle" *ngIf="item.nameEn && langService.currentLang() === 'ar'">{{ item.nameEn }}</p>
              <div *ngIf="item.barcode" class="card-barcode" [title]="'ui.itemsList.4376dc' | translate">
                <i class="pi pi-barcode"></i>
                <span class="font-mono">{{ item.barcode }}</span>
              </div>
            </div>

            <!-- Stock Health & Gauge Bar (For Stockable Items) -->
            <div class="card-stock-gauge" *ngIf="item.itemType === ItemType.Stockable">
              <div class="gauge-header">
                <span class="gauge-label" [ngClass]="getStockHealthStatus(item).class">
                  <i [class]="getStockHealthStatus(item).icon"></i>
                  {{ getStockHealthStatus(item).label }}
                </span>
                <span class="gauge-qty font-mono">
                  <strong>{{ item.currentStockQuantity | number:'1.0-2' }}</strong>
                  <small>{{ item.unitOfMeasure }}</small>
                </span>
              </div>
              <div class="gauge-progress-track">
                <div class="gauge-progress-fill" 
                     [style.width.%]="getStockHealthPercent(item)"
                     [ngClass]="{
                       'fill-danger': item.currentStockQuantity <= item.minStockLevel,
                       'fill-warning': item.currentStockQuantity > item.minStockLevel && item.currentStockQuantity <= item.minStockLevel * 1.5,
                       'fill-safe': item.currentStockQuantity > item.minStockLevel * 1.5
                     }">
                </div>
              </div>
              <div class="gauge-sub">
                <span>{{ 'ui.itemsList.459805' | translate }} <strong>{{ item.minStockLevel }} {{ item.unitOfMeasure }}</strong></span>
                <span *ngIf="item.costPrice">{{ 'ui.itemsList.9fea7b' | translate }} <strong>{{ item.costPrice | number:'1.2-2' }} {{ 'common.sar' | translate }}</strong></span>
              </div>
            </div>

            <!-- Pricing & Profit Margin Strip -->
            <div class="card-pricing-strip">
              <div class="price-item">
                <span class="price-label">{{ 'purchasing.items.table.sellingPrice' | translate }}</span>
                <strong class="price-val text-primary-color">{{ item.salePrice | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></strong>
              </div>
              <div class="price-sep"></div>
              <div class="price-item">
                <span class="price-label">{{ 'purchasing.invoiceCreate.colUnitPrice' | translate }}</span>
                <strong class="price-val">{{ item.purchasePrice | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></strong>
              </div>
              <div class="margin-badge" [class.margin-positive]="getItemMargin(item).isPositive">
                <i class="pi pi-chart-line"></i>
                <span>{{ getItemMargin(item).percent }}</span>
              </div>
            </div>

            <!-- Card Actions Dock (شريط إجراءات متناسق ومضبوط بدقة) -->
            <div class="card-actions-bar">
              <!-- أزرار العمليات المخزنية السريعة -->
              <div class="actions-group-tools">
                <button class="action-dock-btn" (click)="openHistoryModal(item)" [title]="'ui.itemsList.6ecc04' | translate">
                  <i class="pi pi-history"></i>
                  <span>{{ 'accounting.gl.movementsCount' | translate }}</span>
                </button>
                <button *ngIf="item.itemType === ItemType.Stockable" class="action-dock-btn" (click)="openAdjustModal(item)" [title]="'ui.itemsList.ff698c' | translate">
                  <i class="pi pi-sliders-h"></i>
                  <span>{{ 'ui.itemsList.c8f9af' | translate }}</span>
                </button>
                <button *ngIf="item.itemType === ItemType.Stockable" class="action-dock-btn" (click)="openTransferModal(item)" [title]="'ui.itemsList.8cc6ab' | translate">
                  <i class="pi pi-arrows-h"></i>
                  <span>{{ 'ui.itemsList.0326e4' | translate }}</span>
                </button>
              </div>

              <!-- أزرار إدارة الصنف (تعديل وحذف) -->
              <div class="actions-group-manage">
                <button class="action-dock-btn btn-edit" (click)="openEditModal(item)" [title]="'purchasing.items.modal.editTitle' | translate">
                  <i class="pi pi-pencil"></i>
                  <span>{{ 'common.edit' | translate }}</span>
                </button>
                <button class="action-dock-btn btn-delete" (click)="deleteItem(item)" [title]="'ui.itemsList.68dc04' | translate">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- View Mode 2: Compact High-Density Table View (عرض الجدول المتراص) -->
        <div *ngIf="!isLoading() && filteredItems().length > 0 && viewMode() === 'table'" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ 'purchasing.items.table.code' | translate }}</th>
                <th>{{ 'purchasing.items.itemDescription' | translate }}</th>
                <th>{{ 'purchasing.items.table.category' | translate }}</th>
                <th>{{ 'invoices.table.type' | translate }}</th>
                <th>{{ 'invoices.create.unit' | translate }}</th>
                <th>{{ 'purchasing.invoiceCreate.colUnitPrice' | translate }}</th>
                <th>{{ 'purchasing.items.table.sellingPrice' | translate }}</th>
                <th>{{ 'ui.warehouseAnalyticsPage.7165b3' | translate }}</th>
                <th>{{ 'accounting.partners.table.balance' | translate }}</th>
                <th>{{ 'purchasing.items.table.minStock' | translate }}</th>
                <th class="text-center">{{ 'branches.table.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of paginatedItems()" [class.low-stock-row]="isLowStock(item)">
                <td class="font-mono">
                  <span class="code-pill">{{ item.itemCode }}</span>
                  <span *ngIf="item.barcode" class="barcode-text"><i class="pi pi-barcode"></i> {{ item.barcode }}</span>
                </td>
                <td>
                  <span class="item-name-text" [title]="langService.currentLang() === 'ar' ? item.nameAr : (item.nameEn || item.nameAr)">
                    {{ langService.currentLang() === 'ar' ? item.nameAr : (item.nameEn || item.nameAr) }}
                  </span>
                </td>
                <td>
                  <span *ngIf="getItemCategoryDisplay(item)" style="background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="pi pi-tag" style="font-size: 0.68rem; color: #0284c7;"></i>
                    {{ getItemCategoryDisplay(item) }}
                  </span>
                  <span *ngIf="!getItemCategoryDisplay(item)" class="text-muted" style="font-size: 0.78rem;">-</span>
                </td>
                <td>
                  <span class="type-badge" [ngClass]="getTypeBadgeClass(item.itemType)">
                    {{ getTypeLabel(item.itemType) }}
                  </span>
                </td>
                <td>{{ item.unitOfMeasure }}</td>
                <td class="num-cell">{{ item.purchasePrice | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></td>
                <td class="num-cell">{{ item.salePrice | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></td>
                <td class="num-cell">
                  <span class="cost-tag">{{ item.costPrice | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></span>
                </td>
                <td class="num-cell">
                  <div class="stock-pill" [class.danger]="isLowStock(item)">
                    <i class="pi" [ngClass]="isLowStock(item) ? 'pi-exclamation-circle' : 'pi-check-circle'"></i>
                    <strong>{{ item.currentStockQuantity | number:'1.0-2' }}</strong>
                  </div>
                </td>
                <td class="num-cell text-muted">{{ item.minStockLevel | number:'1.0-2' }}</td>
                <td class="actions-cell">
                  <button class="action-btn card-btn" (click)="openHistoryModal(item)" [title]="'ui.itemsList.839916' | translate">
                    <i class="pi pi-history"></i>
                  </button>
                  <button *ngIf="item.itemType === ItemType.Stockable" class="action-btn adjust-btn" (click)="openAdjustModal(item)" [title]="'ui.itemsList.ff698c' | translate">
                    <i class="pi pi-sliders-h"></i>
                  </button>
                  <button *ngIf="item.itemType === ItemType.Stockable" class="action-btn transfer-btn" (click)="openTransferModal(item)" [title]="'ui.itemsList.8cc6ab' | translate">
                    <i class="pi pi-arrows-h"></i>
                  </button>
                  <button class="action-btn edit-btn" (click)="openEditModal(item)" [title]="'ui.itemsList.f2e2bb' | translate">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button class="action-btn del-btn" (click)="deleteItem(item)" [title]="'ui.itemsList.68dc04' | translate">
                    <i class="pi pi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Pagination Bar -->
        <app-pagination
          *ngIf="!isLoading() && filteredItems().length > 0"
          [totalItems]="filteredItems().length"
          [pageSize]="pageSize()"
          [currentPage]="currentPage()"
          [pageSizeOptions]="[6, 12, 24, 48, 96]"
          [itemLabelAr]="('ui.warehouseAnalyticsPage.70448f' | translate)"
          [itemLabelEn]="'items'"
          (pageChange)="currentPage.set($event)"
          (pageSizeChange)="pageSize.set($event)">
        </app-pagination>

        <!-- Modern Empty State -->
        <div *ngIf="!isLoading() && filteredItems().length === 0" class="empty-state">
          <div class="empty-icon-wrapper">
            <i class="pi pi-inbox"></i>
          </div>
          <h3>{{ 'ui.itemsList.83189b' | translate }}</h3>
          <p>{{ 'ui.itemsList.66b84f' | translate }}</p>
          <div class="empty-actions">
            <button *ngIf="searchQuery || selectedType() !== null || (selectedCategory() && selectedCategory() !== 'all') || onlyLowStockFilter()" 
                    type="button" 
                    class="btn-reset-filters" 
                    (click)="searchQuery = ''; selectedType.set(null); selectedCategory.set('all'); onlyLowStockFilter.set(false); onFilterChange()">
              <i class="pi pi-filter-slash"></i>
              <span>{{ 'ui.itemsList.565c2e' | translate }}</span>
            </button>
            <button type="button" class="btn-create-empty" (click)="openCreateModal()">
              <i class="pi pi-plus"></i>
              <span>{{ 'purchasing.items.newItem' | translate }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Create / Edit Modal -->
      <div class="modal-backdrop" *ngIf="showItemModal()" (click)="closeItemModal()">
        <div class="modal-card modal-item-dialog" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-content-wrapper">
              <div class="modal-icon-badge" [class.edit-badge]="isEditing()">
                <i class="pi" [ngClass]="isEditing() ? 'pi-file-edit' : 'pi-box'"></i>
              </div>
              <div class="header-text-group">
                <div class="title-row">
                  <h3>{{ isEditing() ? ('purchasing.items.modal.editTitle' | translate) : ('ui.itemsList.1841cb' | translate) }}</h3>
                  <span class="code-pill" *ngIf="isEditing()">{{ itemForm.itemCode }}</span>
                </div>
                <p class="subtitle">{{ 'ui.itemsList.2e4867' | translate }}</p>
              </div>
            </div>
            <button class="close-btn" (click)="closeItemModal()" [title]="'common.close' | translate"><i class="pi pi-times"></i></button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body">
            
            <!-- Section 1: الهوية والمواصفات -->
            <div class="form-section">
              <div class="section-badge-header">
                <i class="pi pi-id-card"></i>
                <span>{{ 'ui.itemsList.c4d4f1' | translate }}</span>
              </div>

              <div class="form-grid">
                <!-- كود الصنف -->
                <div class="form-group">
                  <label>
                    <span>{{ 'purchasing.items.table.code' | translate }}</span>
                    <span class="req" *ngIf="!isEditing()">*</span>
                  </label>
                  <div class="erp-input-group" [class.readonly-group]="isEditing()">
                    <span class="input-addon"><i class="pi" [ngClass]="isEditing() ? 'pi-lock' : 'pi-hashtag'"></i></span>
                    <input 
                      type="text" 
                      [(ngModel)]="itemForm.itemCode" 
                      [readonly]="isEditing()" 
                      [placeholder]="isEditing() ? '' : ('ui.itemsList.9b5ee4' | translate)" 
                      class="erp-input ltr-text"
                    />
                    <span class="addon-tag" *ngIf="isEditing()">{{ 'ui.itemsList.80c6cf' | translate }}</span>
                  </div>
                </div>

                <!-- الباركود الدولي -->
                <div class="form-group">
                  <label>
                    <span>{{ 'ui.itemsList.2b0e0b' | translate }}</span>
                  </label>
                  <div class="erp-input-group">
                    <span class="input-addon"><i class="pi pi-barcode"></i></span>
                    <input 
                      type="text" 
                      [(ngModel)]="itemForm.barcode" 
                      placeholder="6281000123456" 
                      class="erp-input ltr-text"
                    />
                  </div>
                </div>

                <!-- اسم الصنف بالعربية -->
                <div class="form-group">
                  <div class="label-header">
                    <label>
                      <span>{{ 'ui.itemsList.f4a184' | translate }}</span>
                      <span class="req">*</span>
                    </label>
                  </div>
                  <div class="erp-input-group">
                    <span class="input-addon"><i class="pi pi-box"></i></span>
                    <input 
                      type="text" 
                      [(ngModel)]="itemForm.nameAr" 
                      (ngModelChange)="onNameArInput($event)"
                      [placeholder]="'ui.itemsList.e903cb' | translate" 
                      class="erp-input"
                      required
                    />
                  </div>
                </div>

                <!-- اسم الصنف بالإنجليزية -->
                <div class="form-group">
                  <div class="label-header">
                    <label>
                      <span>{{ 'ui.itemsList.2bbfa4' | translate }}</span>
                      <span class="req">*</span>
                    </label>
                    <button 
                      type="button" 
                      class="btn-translate-badge" 
                      (click)="forceTranslateNameToEn()" 
                      [disabled]="!itemForm.nameAr.trim()"
                      [title]="'ui.itemsList.a96adf' | translate">
                      <i class="pi pi-sync"></i>
                      <span>{{ 'roles.instantTranslate' | translate }}</span>
                    </button>
                  </div>
                  <div class="erp-input-group">
                    <span class="input-addon"><i class="pi pi-globe"></i></span>
                    <input 
                      type="text" 
                      [(ngModel)]="itemForm.nameEn" 
                      (ngModelChange)="onNameEnInput($event)"
                      placeholder="e.g. Ahlia Gypsum, Dell Laptop..." 
                      class="erp-input ltr-text"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <!-- نوع الصنف -->
                <div class="form-group">
                  <label>
                    <span>{{ 'purchasing.items.modal.type' | translate }}</span>
                    <span class="req">*</span>
                  </label>
                  <div class="erp-input-group">
                    <span class="input-addon"><i class="pi pi-box"></i></span>
                    <select [(ngModel)]="itemForm.itemType" class="erp-select">
                      <option [ngValue]="ItemType.Stockable">{{ 'ui.itemsList.47145f' | translate }}</option>
                      <option [ngValue]="ItemType.Service">{{ 'ui.itemsList.544bd2' | translate }}</option>
                      <option [ngValue]="ItemType.RawMaterial">{{ 'ui.itemsList.f14772' | translate }}</option>
                      <option [ngValue]="ItemType.Asset">{{ 'ui.itemsList.b7cb82' | translate }}</option>
                    </select>
                  </div>
                </div>

                <!-- وحدة القياس -->
                <div class="form-group">
                  <label>
                    <span>{{ 'purchasing.items.table.unit' | translate }}</span>
                    <span class="req">*</span>
                  </label>
                  <div class="erp-input-group">
                    <span class="input-addon"><i class="pi pi-compass"></i></span>
                    <select *ngIf="!customUomMode" [(ngModel)]="itemForm.unitOfMeasure" (change)="onUomChange($event)" class="erp-select">
                      <option *ngFor="let u of standardUnits" [value]="u">{{ u }}</option>
                      <option *ngIf="isCustomUnit()" [value]="itemForm.unitOfMeasure">{{ itemForm.unitOfMeasure }} {{ 'ui.itemsList.cdc7e2' | translate }}</option>
                      <option value="__custom__">{{ 'ui.itemsList.387c91' | translate }}</option>
                    </select>
                    <input 
                      *ngIf="customUomMode" 
                      type="text" 
                      [(ngModel)]="itemForm.unitOfMeasure" 
                      [placeholder]="'ui.itemsList.cbbde4' | translate" 
                      class="erp-input" 
                    />
                    <button 
                      *ngIf="customUomMode" 
                      type="button" 
                      class="addon-btn" 
                      (click)="switchToSelectUom()" 
                      [title]="'ui.itemsList.51388c' | translate"
                    >
                      <i class="pi pi-list"></i>
                    </button>
                  </div>
                </div>

                <!-- تصنيف الصنف والمخزون الديناميكي (كامل العرض متناسق) -->
                <div class="form-group span-2">
                  <div class="label-header">
                    <label>
                      <span>{{ 'ui.itemsList.394a68' | translate }}</span>
                      <span class="opt-label" style="font-size: 0.72rem; color: #64748b; margin-right: 4px;">{{ 'ui.itemsList.1ecfdc' | translate }}</span>
                    </label>
                    <div style="display: flex; gap: 6px; align-items: center;">
                      <button 
                        type="button" 
                        class="btn-translate-badge" 
                        style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 0.18rem 0.55rem; font-size: 0.75rem;"
                        (click)="openManageCategoriesPrompt()" 
                        [title]="'ui.manufacturingHub.7e918d' | translate">
                        <i class="pi pi-cog"></i>
                        <span>{{ 'ui.manufacturingHub.12de2c' | translate }}</span>
                      </button>
                      <button 
                        type="button" 
                        class="btn-translate-badge" 
                        style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 0.18rem 0.55rem; font-size: 0.75rem;"
                        (click)="openAddCategoryPrompt()" 
                        [title]="'ui.itemsList.eb16b3' | translate">
                        <i class="pi pi-plus"></i>
                        <span>{{ 'ui.manufacturingHub.cf8168' | translate }}</span>
                      </button>
                    </div>
                  </div>
                  <div class="erp-input-group">
                    <span class="input-addon"><i class="pi pi-tags" style="color: #0284c7;"></i></span>
                    <select [(ngModel)]="itemForm.categoryCode" (change)="onCategoryChange($event)" class="erp-select">
                      <option value="">{{ 'ui.manufacturingHub.1aa470' | translate }}</option>
                      <option *ngFor="let cat of categories()" [value]="cat.code">
                        {{ langService.currentLang() === 'ar' ? cat.nameAr : (cat.nameEn || cat.nameAr) }} ({{ cat.code }})
                      </option>
                    </select>
                    <span class="addon-tag" *ngIf="itemForm.categoryCode" style="background: #e0f2fe; color: #0369a1; font-weight: bold; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem;">
                      {{ itemForm.categoryCode }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section 2: التسعير والرقابة المخزنية -->
            <div class="form-section">
              <div class="section-badge-header">
                <i class="pi pi-dollar"></i>
                <span>{{ 'ui.itemsList.5fe8d8' | translate }}</span>
              </div>

              <div class="form-grid">
                <!-- سعر الشراء الافتراضي -->
                <div class="form-group">
                  <label>
                    <span>{{ 'ui.itemsList.e3c67a' | translate }}</span>
                  </label>
                  <div class="erp-input-group">
                    <span class="input-addon"><i class="pi pi-shopping-bag"></i></span>
                    <input 
                      type="number" 
                      step="0.01" 
                      [(ngModel)]="itemForm.purchasePrice" 
                      class="erp-input ltr-text"
                    />
                    <span class="addon-suffix">{{ 'common.sar' | translate }}</span>
                  </div>
                </div>

                <!-- سعر البيع الافتراضي -->
                <div class="form-group">
                  <label>
                    <span>{{ 'purchasing.items.modal.sellingPrice' | translate }}</span>
                  </label>
                  <div class="erp-input-group">
                    <span class="input-addon"><i class="pi pi-tag"></i></span>
                    <input 
                      type="number" 
                      step="0.01" 
                      [(ngModel)]="itemForm.salePrice" 
                      class="erp-input ltr-text"
                    />
                    <span class="addon-suffix">{{ 'common.sar' | translate }}</span>
                  </div>
                </div>

                <!-- مؤشر هامش الربح الحي -->
                <div class="span-2 margin-chip" *ngIf="itemForm.salePrice > 0 || itemForm.purchasePrice > 0" [class.profit]="itemForm.salePrice >= itemForm.purchasePrice" [class.loss]="itemForm.salePrice < itemForm.purchasePrice">
                  <i class="pi" [ngClass]="itemForm.salePrice >= itemForm.purchasePrice ? 'pi-chart-line' : 'pi-exclamation-triangle'"></i>
                  <span class="margin-label">{{ itemForm.salePrice >= itemForm.purchasePrice ? ('ui.itemsList.fe8f3f' | translate) : ('ui.itemsList.60f43d' | translate) }}</span>
                  <strong class="margin-pct">{{ getMarginPercentage() }}%</strong>
                  <span class="margin-diff">({{ (itemForm.salePrice - itemForm.purchasePrice) | number:'1.2-2' }} {{ 'ui.itemsList.a82dfd' | translate }}</span>
                </div>

                <!-- حد الطلب الأدنى -->
                <div class="form-group" *ngIf="itemForm.itemType === ItemType.Stockable || itemForm.itemType === ItemType.RawMaterial">
                  <label>
                    <span>{{ 'ui.itemsList.bfea5e' | translate }}</span>
                  </label>
                  <div class="erp-input-group">
                    <span class="input-addon"><i class="pi pi-bell"></i></span>
                    <input 
                      type="number" 
                      step="1" 
                      [(ngModel)]="itemForm.minStockLevel" 
                      class="erp-input ltr-text"
                    />
                    <span class="addon-suffix unit-tag">{{ itemForm.unitOfMeasure || ('ui.procurementHub.95eeae' | translate) }}</span>
                  </div>
                </div>

                <!-- حالة الصنف Toggle Button -->
                <div class="form-group" [class.span-2]="itemForm.itemType !== ItemType.Stockable && itemForm.itemType !== ItemType.RawMaterial">
                  <label>
                    <span>{{ 'ui.itemsList.65aaa9' | translate }}</span>
                  </label>
                  <div class="erp-status-toggle" [class.active]="itemForm.isActive" (click)="itemForm.isActive = !itemForm.isActive">
                    <div class="toggle-lead">
                      <i class="pi" [ngClass]="itemForm.isActive ? 'pi-check-circle' : 'pi-times-circle'"></i>
                      <span class="status-name">{{ itemForm.isActive ? ('ui.itemsList.ee8f90' | translate) : ('ui.itemsList.9baf73' | translate) }}</span>
                    </div>
                    <div class="switch-ui" [class.is-on]="itemForm.isActive">
                      <span class="switch-dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary cancel-modal-btn" (click)="closeItemModal()">
              <i class="pi pi-times"></i>
              <span>{{ 'common.cancel' | translate }}</span>
            </button>
            <button type="button" class="btn btn-primary submit-modal-btn" [disabled]="isSubmitting()" (click)="saveItem()">
              <i class="pi pi-check" *ngIf="!isSubmitting()"></i>
              <i class="pi pi-spin pi-spinner" *ngIf="isSubmitting()"></i>
              <span>{{ isEditing() ? ('branches.updateBranch' | translate) : ('ui.itemsList.4606bb' | translate) }}</span>
            </button>
          </div>

        </div>
      </div>

      <!-- Item History Modal (Stock Card) -->
      <div class="modal-backdrop" *ngIf="showHistoryModal()" (click)="closeHistoryModal()">
        <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>{{ 'ui.itemsList.319c8f' | translate }}</h3>
              <p class="subtitle" *ngIf="selectedItemForHistory()">
                {{ selectedItemForHistory()?.itemCode }} - {{ selectedItemForHistory()?.nameAr }}
                {{ 'ui.itemsList.0a2c36' | translate }} <strong>{{ selectedItemForHistory()?.currentStockQuantity }}</strong> {{ selectedItemForHistory()?.unitOfMeasure }}
              </p>
            </div>
            <button class="close-btn" (click)="closeHistoryModal()"><i class="pi pi-times"></i></button>
          </div>
          <div class="modal-body">
            <div *ngIf="isLoadingHistory()" class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              <span>{{ 'ui.itemsList.7fdb77' | translate }}</span>
            </div>

            <div *ngIf="!isLoadingHistory() && historyList().length === 0" class="empty-state">
              <i class="pi pi-info-circle"></i>
              <p>{{ 'ui.itemsList.f194d9' | translate }}</p>
            </div>

            <table *ngIf="!isLoadingHistory() && historyList().length > 0" class="data-table">
              <thead>
                <tr>
                  <th>{{ 'accounting.generalLedger.date' | translate }}</th>
                  <th>{{ 'ui.stockAdjustments.2579ea' | translate }}</th>
                  <th>{{ 'ui.itemsList.267fef' | translate }}</th>
                  <th>{{ 'ui.itemsList.bb5e6e' | translate }}</th>
                  <th>{{ 'purchasing.adjustments.table.unitCost' | translate }}</th>
                  <th>{{ 'projects.hub.workspace.projectTimesheets.thTotalCost' | translate }}</th>
                  <th>{{ 'ui.itemsList.130548' | translate }}</th>
                  <th>{{ 'projects.hub.workspace.costs.thReference' | translate }}</th>
                  <th>{{ 'accounting.journal.form.notes' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of historyList()">
                  <td>{{ tx.transactionDate | date:'yyyy-MM-dd' }}</td>
                  <td>
                    <span class="type-badge" [ngClass]="tx.quantityIn > 0 ? 'badge-success' : 'badge-danger'">
                      {{ tx.quantityIn > 0 ? ('ui.itemsList.19dac8' | translate) : ('ui.itemsList.163977' | translate) }}
                    </span>
                  </td>
                  <td class="text-success font-bold">{{ tx.quantityIn > 0 ? (tx.quantityIn | number:'1.0-2') : '-' }}</td>
                  <td class="text-danger font-bold">{{ tx.quantityOut > 0 ? (tx.quantityOut | number:'1.0-2') : '-' }}</td>
                  <td class="num-cell">{{ tx.unitCost | number:'1.2-2' }} {{ 'common.sar' | translate }}</td>
                  <td class="num-cell">{{ tx.totalCost | number:'1.2-2' }} {{ 'common.sar' | translate }}</td>
                  <td class="num-cell font-bold">{{ tx.balanceAfterQuantity | number:'1.0-2' }}</td>
                  <td>
                    <span class="code-pill">{{ tx.referenceNumber || tx.referenceType }}</span>
                  </td>
                  <td class="text-muted text-sm">{{ tx.notes || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeHistoryModal()">{{ 'common.close' | translate }}</button>
          </div>
        </div>
      </div>

      <!-- Inventory Physical Adjustment Modal -->
      <div class="modal-backdrop" *ngIf="showAdjustModal()" (click)="closeAdjustModal()">
        <div class="modal-card modal-item-dialog" (click)="$event.stopPropagation()" style="max-width: 580px;">
          
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-content-wrapper">
              <div class="modal-icon-badge" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white;">
                <i class="pi pi-sliders-h"></i>
              </div>
              <div class="header-text-group">
                <div class="title-row">
                  <h3>{{ 'ui.itemsList.4e072d' | translate }}</h3>
                  <span class="code-pill">{{ selectedItemForAdjust()?.itemCode }}</span>
                </div>
                <p class="subtitle">{{ langService.currentLang() === 'ar' ? selectedItemForAdjust()?.nameAr : (selectedItemForAdjust()?.nameEn || selectedItemForAdjust()?.nameAr) }}</p>
              </div>
            </div>
            <button class="close-btn" (click)="closeAdjustModal()" [title]="'common.close' | translate"><i class="pi pi-times"></i></button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body">
            
            <!-- Item Stock Snapshot Strip -->
            <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.85rem;">
              <div>
                <span style="color: #64748b; font-size: 0.75rem; display: block;">{{ 'ui.stockAdjustments.3f7f70' | translate }}</span>
                <strong class="font-mono" style="color: #0f172a; font-size: 1rem;">{{ selectedItemForAdjust()?.currentStockQuantity }}</strong> {{ selectedItemForAdjust()?.unitOfMeasure }}
              </div>
              <div>
                <span style="color: #64748b; font-size: 0.75rem; display: block;">{{ 'ui.stockAdjustments.6b151a' | translate }}</span>
                <strong class="font-mono" style="color: #059669; font-size: 1rem;">{{ selectedItemForAdjust()?.costPrice | number:'1.2-2' }}</strong> {{ 'common.sar' | translate }}
              </div>
              <div>
                <span style="color: #64748b; font-size: 0.75rem; display: block;">{{ 'ui.itemsList.178b20' | translate }}</span>
                <span style="font-weight: 600; color: #334155;">{{ 'ui.itemsList.36d458' | translate }}</span>
              </div>
            </div>

            <!-- Inputs Grid -->
            <div class="form-grid" style="display: grid; grid-template-columns: 1fr; gap: 14px;">
              <!-- الكمية الفعلية بالجرد -->
              <div class="form-group">
                <label>
                  <span>{{ 'ui.itemsList.c5eba6' | translate }}</span>
                  <span class="req">*</span>
                </label>
                <div class="erp-input-group">
                  <span class="input-addon"><i class="pi pi-hashtag"></i></span>
                  <input 
                    type="number" 
                    step="0.01" 
                    [(ngModel)]="adjustForm.actualQuantity" 
                    class="erp-input ltr-text font-mono"
                    style="font-size: 1.1rem; font-weight: bold;"
                  />
                  <span class="addon-suffix unit-tag">{{ selectedItemForAdjust()?.unitOfMeasure || ('ui.procurementHub.95eeae' | translate) }}</span>
                </div>
              </div>

              <!-- بطاقة الفارق اللحظية -->
              <div *ngIf="getAdjustDiff() !== 0" style="border-radius: 8px; padding: 10px 14px; font-size: 0.85rem;"
                   [style.background]="getAdjustDiff() > 0 ? '#ecfdf5' : '#fff1f2'"
                   [style.border]="getAdjustDiff() > 0 ? '1px solid #a7f3d0' : '1px solid #fecdd3'">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-weight: bold;" [style.color]="getAdjustDiff() > 0 ? '#047857' : '#be123c'">
                    <i class="pi" [ngClass]="getAdjustDiff() > 0 ? 'pi-plus-circle' : 'pi-minus-circle'"></i>
                    {{ getAdjustDiff() > 0 ? ('ui.stockAdjustments.f9e803' | translate) : ('ui.itemsList.6e4747' | translate) }}:
                    {{ getAdjustDiff() > 0 ? '+' : '' }}{{ getAdjustDiff() }} {{ selectedItemForAdjust()?.unitOfMeasure }}
                  </span>
                  <span class="font-mono font-bold" [style.color]="getAdjustDiff() > 0 ? '#047857' : '#be123c'">
                    {{ 'ui.itemsList.2acbb1' | translate }} {{ getAdjustDiffValue() | number:'1.2-2' }} {{ 'common.sar' | translate }}
                  </span>
                </div>
                <div style="font-size: 0.76rem; color: #475569;">
                  {{ getAdjustDiff() > 0 
                     ? ('ui.itemsList.78c217' | translate) 
                     : ('ui.itemsList.d2300b' | translate) }}
                </div>
              </div>

              <div *ngIf="getAdjustDiff() === 0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 0.8rem; color: #64748b; text-align: center;">
                <i class="pi pi-check"></i> {{ 'ui.itemsList.5a9db4' | translate }}
              </div>

              <!-- سبب التسوية بالعربية -->
              <div class="form-group">
                <label>
                  <span>{{ 'ui.itemsList.888594' | translate }}</span>
                  <span class="req">*</span>
                </label>
                <div class="erp-input-group">
                  <span class="input-addon"><i class="pi pi-pencil"></i></span>
                  <input 
                    type="text" 
                    [(ngModel)]="adjustForm.reasonAr" 
                    (ngModelChange)="onAdjustReasonArChange($event)"
                    [placeholder]="'ui.itemsList.304aed' | translate" 
                    class="erp-input"
                  />
                </div>
              </div>

              <!-- سبب التسوية بالإنجليزية (ترجمة تلقائية) -->
              <div class="form-group">
                <div class="label-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label style="margin: 0;">
                    <span>{{ 'ui.itemsList.662cf1' | translate }}</span>
                    <span class="opt-label" style="font-size: 0.72rem; color: #64748b; margin-right: 4px;">{{ 'ui.itemsList.b3779c' | translate }}</span>
                  </label>
                  <button 
                    type="button" 
                    class="btn-translate-badge" 
                    (click)="forceTranslateAdjustReason()" 
                    [disabled]="!adjustForm.reasonAr.trim()"
                    [title]="'ui.itemsList.4c1471' | translate">
                    <i class="pi pi-sync"></i>
                    <span>{{ 'roles.instantTranslate' | translate }}</span>
                  </button>
                </div>
                <div class="erp-input-group">
                  <span class="input-addon"><i class="pi pi-globe"></i></span>
                  <input 
                    type="text" 
                    [(ngModel)]="adjustForm.reasonEn" 
                    placeholder="Annual physical inventory adjustment..." 
                    class="erp-input ltr-text"
                  />
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary cancel-modal-btn" (click)="closeAdjustModal()">
              <i class="pi pi-times"></i>
              <span>{{ 'common.cancel' | translate }}</span>
            </button>
            <button type="button" class="btn btn-primary submit-modal-btn" 
                    style="background: #0284c7; border-color: #0284c7;"
                    [disabled]="isSubmittingAdjust() || getAdjustDiff() === 0 || !adjustForm.reasonAr.trim()" 
                    (click)="submitAdjustStock()">
              <i class="pi pi-check" *ngIf="!isSubmittingAdjust()"></i>
              <i class="pi pi-spin pi-spinner" *ngIf="isSubmittingAdjust()"></i>
              <span>{{ 'ui.itemsList.2027a1' | translate }}</span>
            </button>
          </div>

        </div>
      </div>

      <!-- Inter-Warehouse Stock Transfer Modal -->
      <div class="modal-backdrop" *ngIf="showTransferModal()" (click)="closeTransferModal()">
        <div class="modal-card modal-transfer-dialog" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="modal-header" style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);">
            <div class="header-content-wrapper">
              <div class="modal-icon-badge" style="background: rgba(255,255,255,0.2); color: #fff;">
                <i class="pi pi-arrows-h"></i>
              </div>
              <div class="header-text-group">
                <div class="title-row">
                  <h3 style="color: #fff;">{{ 'ui.itemsList.ec340b' | translate }}</h3>
                  <span class="code-pill" style="background: rgba(255,255,255,0.25); color: #fff;">{{ selectedItemForTransfer()?.itemCode }}</span>
                </div>
                <p class="subtitle" style="color: #bfdbfe;">{{ 'ui.itemsList.94c157' | translate }}</p>
              </div>
            </div>
            <button class="close-btn" style="color: #fff;" (click)="closeTransferModal()" [title]="'common.close' | translate"><i class="pi pi-times"></i></button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body">
            
            <!-- Item Info Strip -->
            <div class="adjust-item-strip" style="background: #eff6ff; border-color: #bfdbfe;">
              <div class="strip-col">
                <span class="strip-label">{{ 'ui.itemsList.92c0af' | translate }}</span>
                <strong class="strip-val text-dark">{{ langService.currentLang() === 'ar' ? selectedItemForTransfer()?.nameAr : (selectedItemForTransfer()?.nameEn || selectedItemForTransfer()?.nameAr) }}</strong>
              </div>
              <div class="strip-col">
                <span class="strip-label">{{ 'ui.itemsList.d52f17' | translate }}</span>
                <strong class="strip-val" style="color: #1d4ed8;">{{ selectedItemForTransfer()?.currentStockQuantity | number:'1.0-2' }} {{ selectedItemForTransfer()?.unitOfMeasure }}</strong>
              </div>
              <div class="strip-col">
                <span class="strip-label">{{ 'ui.itemsList.fa09af' | translate }}</span>
                <strong class="strip-val">{{ (selectedItemForTransfer()?.costPrice || selectedItemForTransfer()?.purchasePrice || 0) | number:'1.2-2' }} {{ 'common.sar' | translate }}</strong>
              </div>
            </div>

            <div class="form-grid">
              <!-- مستودع المصدر -->
              <div class="form-group">
                <label>
                  <span>{{ 'ui.itemsList.4f1cb1' | translate }}</span>
                  <span class="req">*</span>
                </label>
                <div class="erp-input-group">
                  <span class="input-addon"><i class="pi pi-building"></i></span>
                  <select [(ngModel)]="transferForm.sourceWarehouseCode" class="erp-select">
                    <option *ngFor="let wh of warehousesList" [value]="wh.code">{{ langService.currentLang() === 'ar' ? wh.nameAr : (wh.nameEn || wh.nameAr) }}</option>
                  </select>
                </div>
              </div>

              <!-- مستودع الوجهة -->
              <div class="form-group">
                <label>
                  <span>{{ 'ui.itemsList.4537ec' | translate }}</span>
                  <span class="req">*</span>
                </label>
                <div class="erp-input-group">
                  <span class="input-addon"><i class="pi pi-directions"></i></span>
                  <select [(ngModel)]="transferForm.destinationWarehouseCode" class="erp-select">
                    <option *ngFor="let wh of warehousesList" [value]="wh.code">{{ langService.currentLang() === 'ar' ? wh.nameAr : (wh.nameEn || wh.nameAr) }}</option>
                  </select>
                </div>
              </div>

              <!-- كمية التحويل -->
              <div class="form-group span-2">
                <label>
                  <span>{{ 'ui.itemsList.301164' | translate }}</span>
                  <span class="req">*</span>
                  <small style="margin-right: 8px; color: #64748b;">{{ 'ui.itemsList.7c630a' | translate }} {{ selectedItemForTransfer()?.currentStockQuantity }} {{ selectedItemForTransfer()?.unitOfMeasure }})</small>
                </label>
                <div class="erp-input-group">
                  <span class="input-addon"><i class="pi pi-sort-numeric-up-alt"></i></span>
                  <input 
                    type="number" 
                    [(ngModel)]="transferForm.quantity" 
                    min="1" 
                    [max]="selectedItemForTransfer()?.currentStockQuantity || 1"
                    step="1"
                    class="erp-input ltr-text"
                    style="font-size: 1.15rem; font-weight: 700; color: #1e3a8a;"
                  />
                  <span class="addon-tag">{{ selectedItemForTransfer()?.unitOfMeasure }}</span>
                </div>
              </div>

              <!-- تنبيه إذا اختار نفس المستودع -->
              <div class="form-group span-2" *ngIf="transferForm.sourceWarehouseCode === transferForm.destinationWarehouseCode">
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; color: #b91c1c; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                  <i class="pi pi-exclamation-triangle"></i>
                  <span>{{ 'ui.itemsList.b96aa5' | translate }}</span>
                </div>
              </div>

              <!-- تنبيه إذا كانت الكمية أكبر من المتوفر -->
              <div class="form-group span-2" *ngIf="(transferForm.quantity || 0) > (selectedItemForTransfer()?.currentStockQuantity || 0)">
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; color: #b91c1c; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                  <i class="pi pi-times-circle"></i>
                  <span>{{ 'ui.itemsList.6247c3' | translate }}</span>
                </div>
              </div>

              <!-- بطاقة ملخص قيمة البضاعة المنقولة -->
              <div class="form-group span-2">
                <div class="diff-summary-card" style="background: #f8fafc; border: 1px dashed #cbd5e1;">
                  <div class="diff-metric">
                    <span class="diff-title">{{ 'ui.itemsList.7a9e70' | translate }}</span>
                    <strong style="color: #2563eb; font-size: 1.15rem;">{{ getTransferValue() | number:'1.2-2' }} {{ 'common.sar' | translate }}</strong>
                  </div>
                  <div class="diff-metric">
                    <span class="diff-title">{{ 'ui.itemsList.e395f5' | translate }}</span>
                    <span style="font-family: monospace; color: #475569; font-weight: 600;">TRF-{{ todayDateStr }}</span>
                  </div>
                </div>
              </div>

              <!-- سبب ومبرر التحويل بالعربية -->
              <div class="form-group span-2">
                <div class="label-header">
                  <label>
                    <span>{{ 'ui.itemsList.28f697' | translate }}</span>
                    <span class="req">*</span>
                  </label>
                </div>
                <div class="erp-input-group">
                  <span class="input-addon"><i class="pi pi-comment"></i></span>
                  <input 
                    type="text" 
                    [ngModel]="transferForm.reasonAr" 
                    (ngModelChange)="onTransferReasonArChange($event)"
                    [placeholder]="'ui.itemsList.c7cbec' | translate" 
                    class="erp-input"
                  />
                </div>
              </div>

              <!-- سبب ومبرر التحويل بالإنجليزية -->
              <div class="form-group span-2">
                <div class="label-header">
                  <label>
                    <span>{{ 'ui.itemsList.858afc' | translate }}</span>
                    <span class="opt-label" style="font-size: 0.72rem; color: #64748b; margin-right: 4px;">{{ 'ui.itemsList.b3779c' | translate }}</span>
                  </label>
                  <button 
                    type="button" 
                    class="btn-translate-badge" 
                    (click)="forceTranslateTransferReason()" 
                    [disabled]="!transferForm.reasonAr.trim()"
                    [title]="'ui.itemsList.4c1471' | translate">
                    <i class="pi pi-sync"></i>
                    <span>{{ 'roles.instantTranslate' | translate }}</span>
                  </button>
                </div>
                <div class="erp-input-group">
                  <span class="input-addon"><i class="pi pi-globe"></i></span>
                  <input 
                    type="text" 
                    [(ngModel)]="transferForm.reasonEn" 
                    placeholder="Stock transfer between branches..." 
                    class="erp-input ltr-text"
                  />
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary cancel-modal-btn" (click)="closeTransferModal()">
              <i class="pi pi-times"></i>
              <span>{{ 'common.cancel' | translate }}</span>
            </button>
            <button type="button" class="btn btn-primary submit-modal-btn" 
                    style="background: #2563eb; border-color: #2563eb;"
                    [disabled]="isSubmittingTransfer() || (transferForm.quantity || 0) <= 0 || (transferForm.quantity || 0) > (selectedItemForTransfer()?.currentStockQuantity || 0) || transferForm.sourceWarehouseCode === transferForm.destinationWarehouseCode || !transferForm.reasonAr.trim()" 
                    (click)="submitTransferStock()">
              <i class="pi pi-check" *ngIf="!isSubmittingTransfer()"></i>
              <i class="pi pi-spin pi-spinner" *ngIf="isSubmittingTransfer()"></i>
              <span>{{ 'ui.itemsList.70f7cd' | translate }}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .items-page {
      padding: 1.5rem;
      background: #F8FAFC;
      min-height: 100vh;
      font-family: var(--font-arabic, system-ui, sans-serif);
    }

    /* Compact Executive Header */
    .compact-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 1rem;
      flex-wrap: wrap;

      .title-with-badge {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .header-icon-cube {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25);
          flex-shrink: 0;
        }

        .title-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: #64748B;
          margin-bottom: 0.15rem;

          .sep { color: #CBD5E1; }
          .standard-badge {
            background: #F1F5F9;
            color: #475569;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 0.68rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 3px;
          }
        }

        .main-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.01em;
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .btn-primary-compact {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #059669;
          color: #FFFFFF;
          border: none;
          padding: 0.45rem 0.95rem;
          border-radius: 7px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 3px rgba(5, 150, 105, 0.2);

          &:hover {
            background: #047857;
            transform: translateY(-1px);
          }
        }

        .btn-secondary-compact {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #FFFFFF;
          color: #334155;
          border: 1px solid #CBD5E1;
          padding: 0.45rem 0.85rem;
          border-radius: 7px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #F8FAFC;
            border-color: #94A3B8;
          }
        }
      }
    }

    /* Executive Compact Metrics Ribbon (شريط المؤشرات التنفيذي المدمج) */
    .executive-metrics-bar {
      display: flex;
      align-items: stretch;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 0.45rem 0.75rem;
      margin-bottom: 0.9rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      overflow-x: auto;
      gap: 0.4rem;

      .metric-segment {
        flex: 1;
        min-width: 170px;
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.35rem 0.65rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: #F8FAFC;
        }

        &.active-segment {
          background: #F0FDF4;
          box-shadow: inset 0 0 0 1px #86EFAC;
        }

        &.warning-segment.active-segment {
          background: #FEF3C7;
          box-shadow: inset 0 0 0 1px #FCD34D;
        }

        .metric-icon-mini {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
          flex-shrink: 0;

          &.bg-emerald-subtle { background: #ECFDF5; color: #059669; }
          &.bg-blue-subtle { background: #EFF6FF; color: #0284c7; }
          &.bg-slate-subtle { background: #F1F5F9; color: #64748B; }
          &.bg-purple-subtle { background: #FAF5FF; color: #7C3AED; }
          &.bg-amber-pulse {
            background: #FEF3C7;
            color: #D97706;
            animation: pulse-border 1.8s infinite;
          }
        }

        .metric-text-group {
          display: flex;
          flex-direction: column;
          line-height: 1.15;

          .metric-title {
            font-size: 0.72rem;
            color: #64748B;
            font-weight: 600;
          }

          .metric-number-row {
            display: flex;
            align-items: baseline;
            gap: 0.35rem;

            .metric-num {
              font-size: 1.05rem;
              font-weight: 800;
              color: #0F172A;
              font-family: monospace;

              &.text-blue { color: #0284c7; }
              &.text-amber { color: #D97706; }
              &.text-purple { color: #7C3AED; }
            }

            .metric-unit {
              font-size: 0.68rem;
              color: #94A3B8;
              font-weight: 500;

              &.badge-warning-pill {
                color: #B45309;
                font-weight: 700;
              }
            }
          }
        }
      }

      .metric-divider {
        width: 1px;
        background: #E2E8F0;
        align-self: stretch;
        margin: 0.2rem 0.2rem;
      }
    }

    @keyframes pulse-border {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }

    /* Modern Command & Filter Bar */
    .command-filter-bar {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 9px;
      padding: 0.5rem 0.75rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      flex-wrap: wrap;

      .search-command-box {
        position: relative;
        flex: 1;
        min-width: 240px;

        .search-ico {
          position: absolute;
          inset-inline-start: 0.65rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
          font-size: 0.8rem;
        }

        input {
          width: 100%;
          padding: 0.38rem 0.65rem 0.38rem 2rem;
          border-radius: 6px;
          border: 1px solid #CBD5E1;
          font-size: 0.82rem;
          outline: none;
          background: #F8FAFC;
          transition: all 0.15s ease;

          &:focus {
            background: #FFFFFF;
            border-color: #059669;
            box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.12);
          }
        }

        .clear-search-btn {
          position: absolute;
          inset-inline-end: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94A3B8;
          font-size: 0.75rem;
        }
      }

      .type-filter-pills {
        display: flex;
        gap: 0.25rem;
        background: #F1F5F9;
        padding: 0.2rem;
        border-radius: 7px;

        button {
          background: transparent;
          border: none;
          padding: 0.3rem 0.65rem;
          font-size: 0.78rem;
          font-weight: 600;
          color: #64748B;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.12s ease;

          &.active {
            background: #FFFFFF;
            color: #059669;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            font-weight: 700;
          }
        }
      }

      .category-select-pill {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        border-radius: 7px;
        padding: 0.25rem 0.55rem;

        select {
          border: none;
          background: transparent;
          font-size: 0.78rem;
          font-weight: 600;
          color: #334155;
          outline: none;
          cursor: pointer;
        }
      }

      .view-mode-toggle {
        display: flex;
        background: #F1F5F9;
        border-radius: 7px;
        padding: 0.2rem;
        gap: 0.2rem;
        margin-inline-start: auto;

        button {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.28rem 0.65rem;
          border-radius: 5px;
          border: none;
          background: transparent;
          font-size: 0.76rem;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          transition: all 0.15s ease;

          &.active {
            background: #0284c7;
            color: #FFFFFF;
            box-shadow: 0 1px 3px rgba(2, 132, 199, 0.25);
          }

          &:hover:not(.active) {
            color: #0F172A;
          }
        }
      }
    }

    /* Innovative Smart Cards Grid View (طريقة عارض مبتكرة) */
    .catalog-display-container {
      margin-bottom: 1.5rem;
    }

    .items-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 0.95rem;
      margin-bottom: 1rem;
    }

    .item-smart-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 11px;
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.06);
        border-color: #CBD5E1;
      }

      &.card-low-stock {
        border-color: #FECACA;
        background: linear-gradient(180deg, #FFFDFD 0%, #FFFFFF 100%);
        &::before {
          content: '';
          position: absolute;
          inset-inline-start: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: #EF4444;
        }
      }

      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;

        .card-badges {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;

          .item-code-badge {
            font-family: monospace;
            background: #F1F5F9;
            color: #0F172A;
            font-size: 0.74rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 5px;
            display: inline-flex;
            align-items: center;
            gap: 3px;
          }

          .item-category-tag {
            background: #E0F2FE;
            color: #0369A1;
            font-size: 0.72rem;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 5px;
            display: inline-flex;
            align-items: center;
            gap: 3px;
          }
        }

        .type-pill {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          white-space: nowrap;
        }
      }

      .card-body {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;

        .card-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-subtitle {
          font-size: 0.74rem;
          color: #64748B;
          margin: 0;
          font-family: system-ui, sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-barcode {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.7rem;
          color: #94A3B8;
          margin-top: 0.2rem;
        }
      }

      /* Stock health gauge */
      .card-stock-gauge {
        background: #F8FAFC;
        border: 1px solid #F1F5F9;
        border-radius: 8px;
        padding: 0.45rem 0.65rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;

        .gauge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.74rem;

          .gauge-label {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            font-weight: 600;

            &.status-safe { color: #059669; }
            &.status-low { color: #D97706; font-weight: 700; }
            &.status-out { color: #DC2626; font-weight: 700; }
            &.status-service { color: #7C3AED; }
          }

          .gauge-qty {
            strong { font-size: 0.88rem; color: #0F172A; }
            small { color: #64748B; margin-inline-start: 2px; }
          }
        }

        .gauge-progress-track {
          height: 5px;
          background: #E2E8F0;
          border-radius: 999px;
          overflow: hidden;

          .gauge-progress-fill {
            height: 100%;
            border-radius: 999px;
            transition: width 0.3s ease;

            &.fill-safe { background: #10B981; }
            &.fill-warning { background: #F59E0B; }
            &.fill-danger { background: #EF4444; }
          }
        }

        .gauge-sub {
          display: flex;
          justify-content: space-between;
          font-size: 0.68rem;
          color: #64748B;
          strong { color: #334155; }
        }
      }

      /* Pricing & margin strip */
      .card-pricing-strip {
        display: flex;
        align-items: center;
        background: #FAFAFA;
        border: 1px solid #F1F5F9;
        border-radius: 8px;
        padding: 0.4rem 0.65rem;
        gap: 0.5rem;

        .price-item {
          display: flex;
          flex-direction: column;
          line-height: 1.15;

          .price-label { font-size: 0.65rem; color: #64748B; }
          .price-val {
            font-size: 0.85rem;
            font-weight: 800;
            color: #0F172A;
            font-family: monospace;

            &.text-primary-color { color: #059669; }
          }
        }

        .price-sep {
          width: 1px;
          height: 20px;
          background: #E2E8F0;
        }

        .margin-badge {
          margin-inline-start: auto;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #F1F5F9;
          color: #64748B;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          font-family: monospace;

          &.margin-positive {
            background: #ECFDF5;
            color: #059669;
          }
        }
      }

      /* Actions Bar Dock */
      .card-actions-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.4rem;
        border-top: 1px solid #F1F5F9;
        padding-top: 0.5rem;
        margin-top: auto;

        .actions-group-tools {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          flex-wrap: nowrap;
        }

        .actions-group-manage {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          margin-inline-start: auto;
          flex-wrap: nowrap;
        }

        .action-dock-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          height: 29px;
          padding: 0 0.5rem;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          box-sizing: border-box;

          i {
            font-size: 0.72rem;
            color: #64748B;
          }

          &:hover {
            background: #FFFFFF;
            color: #0F172A;
            border-color: #CBD5E1;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

            i { color: #0284c7; }
          }

          &.btn-edit {
            background: #EFF6FF;
            color: #1D4ED8;
            border-color: #BFDBFE;
            font-weight: 700;

            i { color: #1D4ED8; }

            &:hover {
              background: #DBEAFE;
              border-color: #93C5FD;
              color: #1E40AF;
            }
          }

          &.btn-delete {
            width: 29px;
            padding: 0;
            color: #94A3B8;

            i { color: inherit; }

            &:hover {
              background: #FEF2F2;
              border-color: #FECACA;
              color: #DC2626;
            }
          }
        }
      }
    }

    /* Table */
    .table-container {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        background: #F8FAFC;
        padding: 0.85rem 1rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: #475569;
        border-bottom: 1px solid #E2E8F0;
        white-space: nowrap;
      }

      td {
        padding: 0.85rem 1rem;
        font-size: 0.88rem;
        border-bottom: 1px solid #F1F5F9;
        color: #1E293B;
      }

      tbody tr:hover { background: #F8FAFC; }
      tbody tr.low-stock-row { background: #FEF2F2; }

      .num-cell { font-family: monospace; }
      .code-pill {
        display: inline-block;
        background: #F1F5F9;
        color: #0F172A;
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 700;
      }

      .barcode-text {
        display: block;
        font-size: 0.72rem;
        color: #94A3B8;
        margin-top: 0.15rem;
      }

      .item-name-cell {
        display: flex;
        flex-direction: column;
        .name-ar { font-weight: 700; color: #0F172A; }
        .name-en { font-size: 0.75rem; color: #64748B; }
      }

      .type-badge {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;

        &.badge-stock { background: #ECFDF5; color: #047857; }
        &.badge-service { background: #EFF6FF; color: #1D4ED8; }
        &.badge-raw { background: #FFF7ED; color: #C2410C; }
        &.badge-asset { background: #FAF5FF; color: #6B21A8; }
        &.badge-success { background: #ECFDF5; color: #047857; }
        &.badge-danger { background: #FEF2F2; color: #B91C1C; }
      }

      .cost-tag {
        background: #F8FAFC;
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
        border: 1px solid #E2E8F0;
        font-weight: 700;
      }

      .stock-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.2rem 0.6rem;
        border-radius: 6px;
        background: #ECFDF5;
        color: #059669;

        &.danger {
          background: #FEE2E2;
          color: #DC2626;
        }
      }

      .actions-cell {
        text-align: center;
        white-space: nowrap;

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: #F8FAFC;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 0 0.15rem;
          transition: all 0.15s ease;

          &.card-btn:hover { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
          &.adjust-btn:hover { background: #F0F9FF; color: #0284C7; border-color: #BAE6FD; }
          &.transfer-btn:hover { background: #EEF2FF; color: #4F46E5; border-color: #C7D2FE; }
          &.edit-btn:hover { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
          &.del-btn:hover { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
        }
      }
    }

    .loading-state {
      padding: 3rem 1.5rem;
      text-align: center;
      color: #64748B;

      i { font-size: 2.2rem; margin-bottom: 0.75rem; color: #94A3B8; }
      span { display: block; font-size: 0.95rem; font-weight: 600; color: #475569; }
    }

    .empty-state {
      padding: 3.5rem 1.5rem;
      text-align: center;
      background: #FFFFFF;
      border: 1px dashed #CBD5E1;
      border-radius: 12px;
      margin: 1rem 0;

      .empty-icon-wrapper {
        width: 64px;
        height: 64px;
        margin: 0 auto 1rem auto;
        border-radius: 50%;
        background: #F1F5F9;
        display: flex;
        align-items: center;
        justify-content: center;

        i {
          font-size: 1.8rem;
          color: #94A3B8;
          margin: 0;
        }
      }

      h3 {
        margin: 0 0 0.4rem 0;
        color: #0F172A;
        font-size: 1.15rem;
        font-weight: 800;
      }

      p {
        margin: 0 0 1.25rem 0;
        font-size: 0.88rem;
        color: #64748B;
      }

      .empty-actions {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        justify-content: center;
        flex-wrap: wrap;

        .btn-create-empty {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #059669;
          color: #FFFFFF;
          border: none;
          padding: 0.55rem 1.15rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);

          i {
            font-size: 0.82rem;
            color: #FFFFFF;
            margin: 0;
          }

          &:hover {
            background: #047857;
            transform: translateY(-1px);
          }
        }

        .btn-reset-filters {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #F1F5F9;
          color: #475569;
          border: 1px solid #CBD5E1;
          padding: 0.55rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;

          i {
            font-size: 0.82rem;
            color: #64748B;
            margin: 0;
          }

          &:hover {
            background: #E2E8F0;
            color: #0F172A;
          }
        }
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 1rem;
      border-radius: 7px;
      font-weight: 600;
      font-size: 0.84rem;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;

      &.btn-primary {
        background: #059669;
        color: #FFFFFF;
        &:hover { background: #047857; }
      }

      &.btn-secondary {
        background: #FFFFFF;
        border-color: #CBD5E1;
        color: #334155;
        &:hover { background: #F1F5F9; }
      }
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 0.5rem;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 12px;
      width: 100%;
      max-width: 490px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      max-height: 96vh;
      overflow: hidden;
      box-sizing: border-box;

      &.modal-lg { max-width: 950px; }

      .modal-header {
        padding: 0.75rem 1.15rem;
        border-bottom: 1px solid #E2E8F0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #FFFFFF;

        .header-content-wrapper {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .modal-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, #059669 0%, #10B981 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
          flex-shrink: 0;

          &.edit-badge {
            background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
          }
        }

        .header-text-group {
          .title-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0F172A; line-height: 1.2; }
          }
          .code-pill {
            padding: 0.1rem 0.45rem;
            background: #F1F5F9;
            color: #334155;
            font-size: 0.72rem;
            font-weight: 700;
            border-radius: 4px;
            border: 1px solid #CBD5E1;
            font-family: monospace;
          }
          .subtitle { margin: 0.15rem 0 0 0; font-size: 0.75rem; color: #64748B; }
        }

        .close-btn {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: #F8FAFC;
          cursor: pointer;
          font-size: 0.85rem;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          &:hover { background: #F1F5F9; color: #0F172A; border-color: #CBD5E1; }
        }
      }

      .modal-body {
        padding: 0.75rem 1rem;
        overflow-y: auto;
        overflow-x: hidden !important;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        width: 100%;
        box-sizing: border-box;
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;

        .section-badge-header {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 800;
          color: #0F172A;
          padding: 0.25rem 0.5rem;
          background: #F8FAFC;
          border-radius: 5px;
          border-right: 3px solid #10B981;
          margin-bottom: 0.15rem;

          i { color: #059669; font-size: 0.85rem; }
        }
      }

      .modal-footer {
        padding: 0.6rem 1.15rem;
        border-top: 1px solid #E2E8F0;
        background: #F8FAFC;
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;

        .cancel-modal-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 1.1rem;
          border-radius: 6px;
          border: 1.5px solid #CBD5E1;
          background: #FFFFFF;
          color: #475569;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.15s;
          &:hover { background: #F1F5F9; color: #0F172A; }
        }

        .submit-modal-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 1.25rem;
          border-radius: 6px;
          border: none;
          background: linear-gradient(135deg, #059669 0%, #10B981 100%);
          color: #FFFFFF;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
          transition: all 0.15s;
          &:hover:not(:disabled) { background: linear-gradient(135deg, #047857 0%, #059669 100%); }
          &:disabled { opacity: 0.65; cursor: not-allowed; }
        }
      }
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem 0.65rem;
      width: 100%;
      box-sizing: border-box;

      .span-2 { grid-column: span 2; }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;
        width: 100%;
        box-sizing: border-box;

        .label-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;

          .btn-translate-badge {
            background: #EFF6FF;
            color: #2563EB;
            border: 1px solid #BFDBFE;
            border-radius: 4px;
            font-size: 0.68rem;
            font-weight: 700;
            padding: 0.1rem 0.38rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.22rem;
            transition: all 0.15s ease;

            &:hover:not(:disabled) {
              background: #DBEAFE;
              border-color: #93C5FD;
              color: #1D4ED8;
            }

            &:disabled {
              opacity: 0.4;
              cursor: not-allowed;
            }
          }
        }

        label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.76rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 0.05rem;

          .req { color: #EF4444; font-weight: 800; }
          .opt-label { color: #64748B; font-size: 0.7rem; font-weight: 500; }
        }

        .erp-input-group {
          display: flex;
          align-items: center;
          height: 34px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          background: #FFFFFF;
          overflow: hidden;
          transition: all 0.15s ease;

          &:focus-within {
            border-color: #10B981;
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.12);
          }

          &.readonly-group {
            background: #F8FAFC;
            border-color: #E2E8F0;
            .erp-input { color: #475569; font-weight: 700; font-family: monospace; cursor: not-allowed; }
          }

          .input-addon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 100%;
            background: #F8FAFC;
            color: #64748B;
            border-inline-end: 1px solid #E2E8F0;
            font-size: 0.85rem;
            flex-shrink: 0;

            &.clickable {
              cursor: pointer;
              transition: all 0.15s ease;
              &:hover {
                background: #EFF6FF;
                color: #2563EB;
              }
            }
          }

          .erp-input {
            flex: 1;
            height: 100%;
            border: none;
            outline: none;
            padding: 0 0.55rem;
            font-size: 0.82rem;
            background: transparent;
            color: #0F172A;
            min-width: 0;
            box-sizing: border-box;

            &::placeholder {
              color: #94A3B8;
              font-size: 0.78rem;
            }
          }

          .erp-select {
            flex: 1;
            height: 32px !important;
            min-height: 32px !important;
            line-height: 32px !important;
            border: none;
            outline: none;
            padding: 0 0.45rem;
            font-size: 0.82rem;
            background: transparent;
            color: #0F172A;
            min-width: 0;
            cursor: pointer;
            box-sizing: border-box;
          }

          .addon-tag {
            font-size: 0.68rem;
            font-weight: 700;
            background: #E2E8F0;
            color: #475569;
            padding: 0.15rem 0.4rem;
            border-radius: 4px;
            margin-inline-end: 0.35rem;
            white-space: nowrap;
          }

          .addon-suffix {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 0.5rem;
            height: 100%;
            background: #F8FAFC;
            color: #64748B;
            font-size: 0.74rem;
            font-weight: 700;
            border-inline-start: 1px solid #E2E8F0;
            flex-shrink: 0;
            white-space: nowrap;

            &.unit-tag {
              background: #ECFDF5;
              color: #059669;
              border-color: #A7F3D0;
            }
          }

          .addon-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 0.5rem;
            height: 100%;
            background: #F1F5F9;
            color: #475569;
            border: none;
            border-inline-start: 1px solid #E2E8F0;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              background: #E2E8F0;
              color: #0F172A;
            }
          }

          .ltr-text {
            direction: ltr;
            text-align: right;
          }
        }
      }

      .margin-chip {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.35rem 0.65rem;
        border-radius: 6px;
        font-size: 0.76rem;
        border: 1px dashed;
        margin-top: -0.1rem;

        i { font-size: 0.85rem; }
        .margin-label { font-weight: 600; }
        .margin-pct { font-size: 0.82rem; }
        .margin-diff { font-size: 0.72rem; opacity: 0.85; }

        &.profit {
          background: #ECFDF5;
          border-color: #6EE7B7;
          color: #065F46;
          strong { color: #059669; }
        }

        &.loss {
          background: #FEF2F2;
          border-color: #FCA5A5;
          color: #991B1B;
          strong { color: #DC2626; }
        }
      }

      .erp-status-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.4rem;
        height: 33px;
        padding: 0 0.55rem;
        border-radius: 6px;
        border: 1px solid #CBD5E1;
        background: #F8FAFC;
        cursor: pointer;
        transition: all 0.15s ease;
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        user-select: none;
        -webkit-user-select: none;

        .toggle-lead {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          min-width: 0;
          overflow: hidden;

          i {
            font-size: 0.9rem;
            color: #94A3B8;
            flex-shrink: 0;
          }

          .status-name {
            font-size: 0.78rem;
            font-weight: 700;
            color: #475569;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .switch-ui {
          width: 30px;
          height: 17px;
          border-radius: 999px;
          background: #CBD5E1;
          position: relative;
          transition: background 0.2s ease;
          flex-shrink: 0;

          .switch-dot {
            width: 13px;
            height: 13px;
            border-radius: 50%;
            background: #FFFFFF;
            position: absolute;
            top: 2px;
            right: 2px;
            transition: transform 0.2s ease;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
          }

          &.is-on {
            background: #10B981;

            .switch-dot {
              transform: translateX(-13px);
            }
          }
        }

        &.active {
          background: #F0FDF4;
          border-color: #86EFAC;

          .toggle-lead {
            i { color: #10B981; }
            .status-name { color: #065F46; }
          }
        }

        &:hover {
          border-color: #94A3B8;
        }

        &.active:hover {
          border-color: #10B981;
        }
      }
    }
  `]
})
export class ItemsListComponent implements OnInit {
  purchasingService = inject(PurchasingService);
  itemCategoryService = inject(ItemCategoryService);
  langService = inject(LanguageService);
  translator = inject(AccountingTranslatorService);

  ItemType = ItemType;

  // Categories
  categories = signal<ItemCategoryDto[]>([]);
  selectedCategory = signal<string>('all');

  // Real-time Translation states
  nameEnManuallyEdited = false;
  isTranslating = false;

  unifiedItemName = '';
  backgroundItemTranslation = '';

  onNameArInput(val: string) {
    this.itemForm.nameAr = val;
    const text = (val || '').trim();
    if (!text) {
      if (!this.nameEnManuallyEdited) {
        this.itemForm.nameEn = '';
      }
      return;
    }

    if (!this.nameEnManuallyEdited) {
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const instant = this.translator.translateArabicToEnglish(text);
        this.itemForm.nameEn = instant;
        this.translator.translateWithOnlineRefinement(
          text,
          () => {},
          (refined) => {
            if (!this.nameEnManuallyEdited && refined) {
              this.itemForm.nameEn = refined;
            }
          }
        );
      }
    }
  }

  onNameEnInput(val: string) {
    this.itemForm.nameEn = val;
    this.nameEnManuallyEdited = true;
    const currentAr = (this.itemForm.nameAr || '').trim();
    const text = (val || '').trim();

    // If Arabic name is empty, auto-suggest Arabic name from English
    if (!currentAr && text) {
      this.itemForm.nameAr = this.translator.translateEnglishToArabic(text);
    }
  }

  async forceTranslateNameToEn() {
    const text = (this.itemForm.nameAr || '').trim();
    if (text) {
      this.isTranslating = true;
      this.nameEnManuallyEdited = false;
      try {
        const instant = this.translator.translateArabicToEnglish(text);
        this.itemForm.nameEn = instant;
        const onlineEn = await this.translator.translateOnline(text, 'ar', 'en');
        if (onlineEn) {
          this.itemForm.nameEn = onlineEn;
        }
      } finally {
        this.isTranslating = false;
      }
    }
  }

  items = signal<ItemDto[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  searchQuery = '';
  selectedType = signal<ItemType | null>(null);
  viewMode = signal<'cards' | 'table'>('cards');
  onlyLowStockFilter = signal<boolean>(false);

  toggleLowStockFilter() {
    this.onlyLowStockFilter.update(v => !v);
    this.currentPage.set(1);
  }

  getStockHealthPercent(item: ItemDto): number {
    if (!item.minStockLevel || item.minStockLevel <= 0) return 100;
    const ratio = (item.currentStockQuantity / (item.minStockLevel * 2)) * 100;
    return Math.min(100, Math.max(8, Math.round(ratio)));
  }

  getStockHealthStatus(item: ItemDto): { label: string; class: string; icon: string } {
    if (item.itemType !== ItemType.Stockable) {
      return { label: 'غير مخزني (خدمة)', class: 'status-service', icon: 'pi pi-briefcase' };
    }
    if (item.currentStockQuantity <= 0) {
      return { label: 'نفد من المستودع', class: 'status-out', icon: 'pi pi-times-circle' };
    }
    if (item.currentStockQuantity <= item.minStockLevel) {
      return { label: 'حرج (دون حد الطلب)', class: 'status-low', icon: 'pi pi-exclamation-triangle' };
    }
    return { label: 'رصيد آمن ومستقر', class: 'status-safe', icon: 'pi pi-check-circle' };
  }

  getItemMargin(item: ItemDto): { percent: string; isPositive: boolean } {
    const p = item.purchasePrice || 0;
    const s = item.salePrice || 0;
    if (p <= 0) return { percent: s > 0 ? '+100%' : '0%', isPositive: true };
    const pct = ((s - p) / p) * 100;
    return {
      percent: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
      isPositive: pct >= 0
    };
  }

  // Modals
  showItemModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingItemId: string | null = null;

  showHistoryModal = signal<boolean>(false);
  selectedItemForHistory = signal<ItemDto | null>(null);
  historyList = signal<InventoryTransactionDto[]>([]);
  isLoadingHistory = signal<boolean>(false);

  showAdjustModal = signal<boolean>(false);
  selectedItemForAdjust = signal<ItemDto | null>(null);
  isSubmittingAdjust = signal<boolean>(false);
  adjustReasonManuallyEdited = false;
  adjustForm = {
    actualQuantity: 0,
    warehouseCode: 'WH-MAIN',
    reasonAr: '',
    reasonEn: ''
  };

  showTransferModal = signal<boolean>(false);
  selectedItemForTransfer = signal<ItemDto | null>(null);
  isSubmittingTransfer = signal<boolean>(false);
  transferReasonManuallyEdited = false;
  transferForm = {
    sourceWarehouseCode: 'WH-MAIN',
    destinationWarehouseCode: 'WH-RUH',
    quantity: 1,
    reasonAr: 'تحويل بضاعة لتغذية مستودع الفرع',
    reasonEn: 'Stock transfer to replenish branch warehouse'
  };

  warehousesList = [
    { code: 'WH-MAIN', nameAr: 'المستودع المركزي الرئيسي (الرياض)', nameEn: 'Central Main Warehouse (Riyadh)' },
    { code: 'WH-RUH', nameAr: 'مستودع فرع العليا - الرياض', nameEn: 'Olaya Branch Warehouse (Riyadh)' },
    { code: 'WH-JED', nameAr: 'مستودع فرع المنطقة الغربية (جدة)', nameEn: 'Western Region Warehouse (Jeddah)' },
    { code: 'WH-DMM', nameAr: 'مستودع فرع المنطقة الشرقية (الدمام)', nameEn: 'Eastern Region Warehouse (Dammam)' }
  ];

  todayDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  customUomMode = false;
  standardUnits: string[] = ['حبة', 'جهاز', 'كرتون', 'طقم', 'متر', 'متر مربع', 'كيلوجرام', 'طن', 'لتر', 'ساعة', 'طرد', 'خدمة'];

  isCustomUnit(): boolean {
    return !!this.itemForm.unitOfMeasure && !this.standardUnits.includes(this.itemForm.unitOfMeasure);
  }

  onUomChange(event: any) {
    const val = event.target.value;
    if (val === '__custom__') {
      this.customUomMode = true;
      this.itemForm.unitOfMeasure = '';
    }
  }

  switchToSelectUom() {
    this.customUomMode = false;
    if (!this.itemForm.unitOfMeasure || !this.standardUnits.includes(this.itemForm.unitOfMeasure)) {
      this.itemForm.unitOfMeasure = 'حبة';
    }
  }

  itemForm: any = {
    itemCode: '',
    barcode: '',
    nameAr: '',
    nameEn: '',
    itemType: ItemType.Stockable,
    categoryCode: '',
    categoryNameAr: '',
    categoryNameEn: '',
    unitOfMeasure: 'حبة',
    purchasePrice: 0,
    salePrice: 0,
    minStockLevel: 0,
    isActive: true
  };

  // KPI Computeds
  totalItemsCount = computed(() => this.items().length);
  totalStockValuation = computed(() =>
    this.items()
      .filter(i => i.itemType === ItemType.Stockable)
      .reduce((acc, i) => acc + (i.currentStockQuantity * i.costPrice), 0)
  );
  lowStockCount = computed(() =>
    this.items().filter(i => i.itemType === ItemType.Stockable && i.currentStockQuantity <= i.minStockLevel && i.minStockLevel > 0).length
  );
  serviceItemsCount = computed(() =>
    this.items().filter(i => i.itemType === ItemType.Service).length
  );

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedItems = computed(() => {
    const list = this.filteredItems();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  filteredItems = computed(() => {
    let list = this.items();
    if (this.selectedType() !== null) {
      list = list.filter(i => i.itemType === this.selectedType());
    }
    if (this.onlyLowStockFilter()) {
      list = list.filter(i => this.isLowStock(i));
    }
    if (this.selectedCategory() && this.selectedCategory() !== 'all') {
      list = list.filter(i => i.categoryCode === this.selectedCategory() || i.categoryNameAr === this.selectedCategory());
    }
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(i =>
        i.itemCode.toLowerCase().includes(q) ||
        i.nameAr.toLowerCase().includes(q) ||
        (i.nameEn && i.nameEn.toLowerCase().includes(q)) ||
        (i.barcode && i.barcode.toLowerCase().includes(q)) ||
        (i.categoryNameAr && i.categoryNameAr.toLowerCase().includes(q)) ||
        (i.categoryCode && i.categoryCode.toLowerCase().includes(q))
      );
    }
    return list;
  });

  ngOnInit() {
    this.loadCategories();
    this.loadItems();
  }

  loadCategories() {
    this.itemCategoryService.getCategories().subscribe(cats => {
      this.categories.set(cats || []);
    });
  }

  async openAddCategoryPrompt() {
    const newCat = await this.itemCategoryService.promptCreateCategory();
    if (newCat) {
      this.loadCategories();
      this.itemForm.categoryCode = newCat.code;
      this.itemForm.categoryNameAr = newCat.nameAr;
      this.itemForm.categoryNameEn = newCat.nameEn;
    }
  }

  async openManageCategoriesPrompt() {
    await this.itemCategoryService.promptManageCategories();
    this.loadCategories();
  }

  onCategoryChange(event: any) {
    const code = event?.target?.value ?? event ?? '';
    const cat = this.categories().find(c => c.code === code);
    if (cat) {
      this.itemForm.categoryCode = cat.code;
      this.itemForm.categoryNameAr = cat.nameAr;
      this.itemForm.categoryNameEn = cat.nameEn;
    } else {
      this.itemForm.categoryCode = '';
      this.itemForm.categoryNameAr = '';
      this.itemForm.categoryNameEn = '';
    }
  }

  loadItems() {
    this.isLoading.set(true);
    this.purchasingService.getItems(undefined, undefined, false).subscribe({
      next: (res) => {
        this.items.set(res || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: this.langService.t('purchasing.items.alerts.loadItemsFailed')
        });
      }
    });
  }

  setTypeFilter(type: ItemType | null) {
    this.selectedType.set(type);
    this.currentPage.set(1);
  }

  onFilterChange() {
    this.currentPage.set(1);
  }

  isLowStock(item: ItemDto): boolean {
    return item.itemType === ItemType.Stockable && item.minStockLevel > 0 && item.currentStockQuantity <= item.minStockLevel;
  }

  getTypeLabel(type: ItemType): string {
    switch (type) {
      case ItemType.Stockable: return this.langService.t('purchasing.items.types.stockable');
      case ItemType.Service: return this.langService.t('purchasing.items.types.service');
      case ItemType.RawMaterial: return this.langService.t('purchasing.items.types.rawMaterial');
      case ItemType.Asset: return this.langService.t('purchasing.items.types.asset');
      default: return this.langService.t('purchasing.items.types.default');
    }
  }

  getTypeBadgeClass(type: ItemType): string {
    switch (type) {
      case ItemType.Stockable: return 'badge-stock';
      case ItemType.Service: return 'badge-service';
      case ItemType.RawMaterial: return 'badge-raw';
      case ItemType.Asset: return 'badge-asset';
      default: return '';
    }
  }

  getItemCategoryDisplay(item: ItemDto): string {
    if (this.langService.currentLang() === 'ar') {
      if (item.categoryNameAr) return item.categoryNameAr;
    } else {
      if (item.categoryNameEn) return item.categoryNameEn;
      if (item.categoryNameAr) return item.categoryNameAr;
    }
    if (item.categoryCode) {
      const found = this.categories().find(c => c.code === item.categoryCode);
      if (found) {
        return this.langService.currentLang() === 'ar' ? found.nameAr : (found.nameEn || found.nameAr);
      }
      return item.categoryCode;
    }
    return '';
  }

  openCreateModal() {
    this.isEditing.set(false);
    this.editingItemId = null;
    this.customUomMode = false;
    this.nameEnManuallyEdited = false;
    this.unifiedItemName = '';
    this.backgroundItemTranslation = '';
    this.itemForm = {
      itemCode: `ITM-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: '',
      nameAr: '',
      nameEn: '',
      itemType: ItemType.Stockable,
      categoryCode: this.categories()[0]?.code || '',
      categoryNameAr: this.categories()[0]?.nameAr || '',
      categoryNameEn: this.categories()[0]?.nameEn || '',
      unitOfMeasure: 'حبة',
      purchasePrice: 0,
      salePrice: 0,
      minStockLevel: 5,
      isActive: true
    };
    this.showItemModal.set(true);
  }

  openEditModal(item: ItemDto) {
    this.isEditing.set(true);
    this.editingItemId = item.id;
    this.customUomMode = false;
    this.nameEnManuallyEdited = !!(item.nameEn && item.nameEn.trim());
    this.unifiedItemName = item.nameAr || item.nameEn || '';
    this.backgroundItemTranslation = item.nameEn ? `الترجمة: ${item.nameEn}` : (item.nameAr ? `الترجمة: ${item.nameAr}` : '');
    
    // Look up category from persistent mapping if not directly on item
    const catMap = this.purchasingService.getItemCategoryMap();
    const mapped = catMap[item.id] || (item.itemCode ? catMap[item.itemCode] : undefined);
    const catCode = item.categoryCode || mapped?.code || '';
    const catNameAr = item.categoryNameAr || mapped?.nameAr || '';
    const catNameEn = item.categoryNameEn || mapped?.nameEn || '';

    this.itemForm = {
      itemCode: item.itemCode,
      barcode: item.barcode || '',
      nameAr: item.nameAr,
      nameEn: item.nameEn || '',
      itemType: item.itemType,
      categoryCode: catCode,
      categoryNameAr: catNameAr,
      categoryNameEn: catNameEn,
      unitOfMeasure: item.unitOfMeasure,
      purchasePrice: item.purchasePrice,
      salePrice: item.salePrice,
      minStockLevel: item.minStockLevel,
      isActive: item.isActive
    };
    this.showItemModal.set(true);
  }

  closeItemModal() {
    this.showItemModal.set(false);
  }

  getMarginPercentage(): string {
    const p = Number(this.itemForm.purchasePrice) || 0;
    const s = Number(this.itemForm.salePrice) || 0;
    if (p <= 0) {
      return s > 0 ? '100' : '0.0';
    }
    const diff = s - p;
    return ((diff / p) * 100).toFixed(1);
  }

  saveItem() {
    if (!this.itemForm.nameAr || !this.itemForm.nameAr.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('purchasing.items.alerts.nameArRequired')
      });
      return;
    }

    if (!this.itemForm.nameEn || !this.itemForm.nameEn.trim()) {
      this.itemForm.nameEn = this.translator.translateArabicToEnglish(this.itemForm.nameAr.trim());
    }

    this.isSubmitting.set(true);
    const catCode = this.itemForm.categoryCode || '';
    const cat = this.categories().find(c => c.code === catCode);
    const catNameAr = cat?.nameAr || this.itemForm.categoryNameAr || '';
    const catNameEn = cat?.nameEn || this.itemForm.categoryNameEn || '';

    if (this.isEditing() && this.editingItemId) {
      // Save mapping permanently
      this.purchasingService.saveItemCategoryMapping(
        this.editingItemId,
        this.itemForm.itemCode,
        catCode,
        catNameAr,
        catNameEn
      );

      const payload: UpdateItemRequest = {
        nameAr: this.itemForm.nameAr,
        nameEn: this.itemForm.nameEn,
        itemType: this.itemForm.itemType,
        categoryCode: catCode || undefined,
        categoryNameAr: catNameAr || undefined,
        categoryNameEn: catNameEn || undefined,
        unitOfMeasure: this.itemForm.unitOfMeasure,
        purchasePrice: Number(this.itemForm.purchasePrice) || 0,
        salePrice: Number(this.itemForm.salePrice) || 0,
        barcode: this.itemForm.barcode || undefined,
        minStockLevel: Number(this.itemForm.minStockLevel) || 0,
        isActive: this.itemForm.isActive
      };

      // Optimistically update local items signal immediately
      this.items.update(list => list.map(item => {
        if (item.id === this.editingItemId) {
          return {
            ...item,
            ...payload,
            categoryCode: catCode,
            categoryNameAr: catNameAr,
            categoryNameEn: catNameEn
          };
        }
        return item;
      }));

      this.purchasingService.updateItem(this.editingItemId, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeItemModal();
          this.loadItems();
          Swal.fire({
            icon: 'success',
            title: this.langService.t('common.saved'),
            text: this.langService.t('purchasing.items.alerts.itemUpdatedSuccess'),
            timer: 1500,
            showConfirmButton: false
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          Swal.fire({
            icon: 'error',
            title: this.langService.t('common.error'),
            text: err?.error?.Description || this.langService.t('purchasing.items.alerts.itemUpdateFailed')
          });
        }
      });
    } else {
      const payload: CreateItemRequest = {
        itemCode: this.itemForm.itemCode,
        barcode: this.itemForm.barcode || undefined,
        nameAr: this.itemForm.nameAr,
        nameEn: this.itemForm.nameEn,
        itemType: this.itemForm.itemType,
        categoryCode: catCode || undefined,
        categoryNameAr: catNameAr || undefined,
        categoryNameEn: catNameEn || undefined,
        unitOfMeasure: this.itemForm.unitOfMeasure,
        purchasePrice: Number(this.itemForm.purchasePrice) || 0,
        salePrice: Number(this.itemForm.salePrice) || 0,
        minStockLevel: Number(this.itemForm.minStockLevel) || 0
      };
      this.purchasingService.createItem(payload).subscribe({
        next: (created) => {
          if (created?.id) {
            this.purchasingService.saveItemCategoryMapping(
              created.id,
              created.itemCode,
              catCode,
              catNameAr,
              catNameEn
            );
          }
          this.isSubmitting.set(false);
          this.closeItemModal();
          this.loadItems();
          Swal.fire({
            icon: 'success',
            title: this.langService.t('common.success'),
            text: this.langService.t('purchasing.items.alerts.itemCreatedSuccess'),
            timer: 1500,
            showConfirmButton: false
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          Swal.fire({
            icon: 'error',
            title: this.langService.t('common.error'),
            text: err?.error?.Description || this.langService.t('purchasing.items.alerts.itemCreateFailed')
          });
        }
      });
    }
  }

  deleteItem(item: ItemDto) {
    if (item.currentStockQuantity > 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('purchasing.items.alerts.cannotDeleteHasStockTitle'),
        text: this.langService.t('purchasing.items.alerts.cannotDeleteHasStockText', {
          qty: item.currentStockQuantity,
          uom: item.unitOfMeasure
        })
      });
      return;
    }

    Swal.fire({
      title: this.langService.t('purchasing.items.alerts.confirmDeleteTitle'),
      text: this.langService.t('purchasing.items.alerts.confirmDeleteText', {
        name: this.langService.currentLang() === 'ar' ? item.nameAr : (item.nameEn || item.nameAr)
      }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('common.confirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#EF4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.purchasingService.deleteItem(item.id).subscribe({
          next: () => {
            this.loadItems();
            Swal.fire({
              icon: 'success',
              title: this.langService.t('common.success'),
              text: this.langService.t('purchasing.items.alerts.itemDeletedSuccess'),
              timer: 1500,
              showConfirmButton: false
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.langService.t('common.error'),
              text: err?.error?.Description || this.langService.t('purchasing.items.alerts.itemDeleteFailed')
            });
          }
        });
      }
    });
  }

  openHistoryModal(item: ItemDto) {
    this.selectedItemForHistory.set(item);
    this.showHistoryModal.set(true);
    this.isLoadingHistory.set(true);
    this.purchasingService.getItemHistory(item.id).subscribe({
      next: (res) => {
        this.historyList.set(res || []);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.isLoadingHistory.set(false);
      }
    });
  }

  closeHistoryModal() {
    this.showHistoryModal.set(false);
    this.selectedItemForHistory.set(null);
    this.historyList.set([]);
  }

  openAdjustModal(item: ItemDto) {
    this.selectedItemForAdjust.set(item);
    this.adjustReasonManuallyEdited = false;
    this.adjustForm = {
      actualQuantity: item.currentStockQuantity,
      warehouseCode: 'WH-MAIN',
      reasonAr: 'جرد فعلي دوري للمستودع',
      reasonEn: 'Periodic physical inventory count'
    };
    this.showAdjustModal.set(true);
  }

  closeAdjustModal() {
    this.showAdjustModal.set(false);
    this.selectedItemForAdjust.set(null);
  }

  getAdjustDiff(): number {
    const item = this.selectedItemForAdjust();
    if (!item) return 0;
    const actual = Number(this.adjustForm.actualQuantity) || 0;
    return Math.round((actual - item.currentStockQuantity) * 100) / 100;
  }

  getAdjustDiffValue(): number {
    const item = this.selectedItemForAdjust();
    if (!item) return 0;
    const cost = item.costPrice > 0 ? item.costPrice : item.purchasePrice;
    return Math.round(Math.abs(this.getAdjustDiff()) * cost * 100) / 100;
  }

  onAdjustReasonArChange(val: string) {
    this.adjustForm.reasonAr = val;
    if (!this.adjustReasonManuallyEdited && val && val.trim()) {
      this.adjustForm.reasonEn = this.translator.translateArabicToEnglish(val);
    }
  }

  forceTranslateAdjustReason() {
    if (this.adjustForm.reasonAr?.trim()) {
      this.adjustForm.reasonEn = this.translator.translateArabicToEnglish(this.adjustForm.reasonAr);
      this.adjustReasonManuallyEdited = false;
    }
  }

  submitAdjustStock() {
    const item = this.selectedItemForAdjust();
    if (!item) return;

    if (!this.adjustForm.reasonAr.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('purchasing.items.alerts.adjustReasonRequired')
      });
      return;
    }

    this.isSubmittingAdjust.set(true);
    this.purchasingService.adjustStock(item.id, {
      actualQuantity: Number(this.adjustForm.actualQuantity) || 0,
      warehouseCode: this.adjustForm.warehouseCode,
      reasonAr: this.adjustForm.reasonAr,
      reasonEn: this.adjustForm.reasonEn
    }).subscribe({
      next: (res) => {
        this.isSubmittingAdjust.set(false);
        this.closeAdjustModal();
        this.loadItems();
        const isAr = this.langService.currentLang() === 'ar';
        const html = isAr
          ? `<div style="text-align: right; direction: rtl; line-height: 1.8; font-size: 0.95rem;">
               <p>تم تحديث رصيد الصنف وتوليد حركة المخزون بنجاح:</p>
               <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin: 8px 0;">
                 <div><strong>المستند المرجعي:</strong> <span style="font-family: monospace;">${res.referenceNumber}</span></div>
                 <div><strong>رقم القيد المحاسبي:</strong> <span style="font-family: monospace; color: #047857; font-weight: bold;">${res.journalEntryNumber || 'لا يتطلب قيداً'}</span></div>
                 <div><strong>نوع الحركة:</strong> <span style="font-weight: bold;">${res.movementType}</span></div>
                 <div><strong>الرصيد بعد التسوية:</strong> ${res.actualQuantity} ${item.unitOfMeasure}</div>
                 <div><strong>القيمة الإجمالية:</strong> ${res.totalAdjustmentValue.toLocaleString()} ر.س</div>
               </div>
             </div>`
          : `<div style="text-align: left; direction: ltr; line-height: 1.8; font-size: 0.95rem;">
               <p>Item stock updated and inventory movement recorded successfully:</p>
               <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin: 8px 0;">
                 <div><strong>Reference Document:</strong> <span style="font-family: monospace;">${res.referenceNumber}</span></div>
                 <div><strong>Journal Entry No:</strong> <span style="font-family: monospace; color: #047857; font-weight: bold;">${res.journalEntryNumber || 'No entry required'}</span></div>
                 <div><strong>Movement Type:</strong> <span style="font-weight: bold;">${res.movementType}</span></div>
                 <div><strong>Stock after adjustment:</strong> ${res.actualQuantity} ${item.unitOfMeasure}</div>
                 <div><strong>Total Value:</strong> ${res.totalAdjustmentValue.toLocaleString()} SAR</div>
               </div>
             </div>`;

        Swal.fire({
          icon: 'success',
          title: this.langService.t('purchasing.items.alerts.adjustSuccessTitle'),
          html,
          confirmButtonText: this.langService.t('common.confirm'),
          confirmButtonColor: '#059669'
        });
      },
      error: (err) => {
        this.isSubmittingAdjust.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err?.error?.Description || err?.error?.description || this.langService.t('purchasing.items.alerts.adjustFailed')
        });
      }
    });
  }

  openTransferModal(item: ItemDto) {
    this.selectedItemForTransfer.set(item);
    this.transferReasonManuallyEdited = false;
    this.transferForm = {
      sourceWarehouseCode: 'WH-MAIN',
      destinationWarehouseCode: 'WH-RUH',
      quantity: Math.min(1, item.currentStockQuantity),
      reasonAr: 'تحويل بضاعة لتغذية مستودع الفرع',
      reasonEn: 'Stock transfer to replenish branch warehouse'
    };
    this.showTransferModal.set(true);
  }

  closeTransferModal() {
    this.showTransferModal.set(false);
    this.selectedItemForTransfer.set(null);
  }

  onTransferReasonArChange(val: string) {
    this.transferForm.reasonAr = val;
    if (!this.transferReasonManuallyEdited && val && val.trim()) {
      this.transferForm.reasonEn = this.translator.translateArabicToEnglish(val);
    }
  }

  forceTranslateTransferReason() {
    if (this.transferForm.reasonAr?.trim()) {
      this.transferForm.reasonEn = this.translator.translateArabicToEnglish(this.transferForm.reasonAr);
      this.transferReasonManuallyEdited = false;
    }
  }

  getTransferValue(): number {
    const item = this.selectedItemForTransfer();
    if (!item) return 0;
    const cost = item.costPrice > 0 ? item.costPrice : item.purchasePrice;
    return Math.round((Number(this.transferForm.quantity) || 0) * cost * 100) / 100;
  }

  submitTransferStock() {
    const item = this.selectedItemForTransfer();
    if (!item) return;

    const qty = Number(this.transferForm.quantity) || 0;
    if (qty <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('purchasing.items.alerts.transferQtyPositive')
      });
      return;
    }

    if (qty > item.currentStockQuantity) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('purchasing.items.alerts.transferQtyExceedsStock', {
          qty,
          stock: item.currentStockQuantity
        })
      });
      return;
    }

    if (this.transferForm.sourceWarehouseCode === this.transferForm.destinationWarehouseCode) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('purchasing.items.alerts.transferSameWarehouse')
      });
      return;
    }

    if (!this.transferForm.reasonAr.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('purchasing.items.alerts.transferReasonRequired')
      });
      return;
    }

    this.isSubmittingTransfer.set(true);
    this.purchasingService.transferStock(item.id, {
      sourceWarehouseCode: this.transferForm.sourceWarehouseCode,
      destinationWarehouseCode: this.transferForm.destinationWarehouseCode,
      quantity: qty,
      reasonAr: this.transferForm.reasonAr,
      reasonEn: this.transferForm.reasonEn
    }).subscribe({
      next: (res) => {
        this.isSubmittingTransfer.set(false);
        this.closeTransferModal();
        this.loadItems();
        const isAr = this.langService.currentLang() === 'ar';
        const html = isAr
          ? `<div style="text-align: right; direction: rtl; line-height: 1.8; font-size: 0.95rem;">
                   <p>تم توثيق حركتي الصرف والاستلام المخزني وتحديث السجلات:</p>
                   <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin: 8px 0;">
                     <div><strong>رقم سند التحويل:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: bold;">${res.referenceNumber}</span></div>
                     <div><strong>المستودع المصدر:</strong> <span>${res.sourceWarehouseCode}</span></div>
                     <div><strong>المستودع المستلم:</strong> <span>${res.destinationWarehouseCode}</span></div>
                     <div><strong>الكمية المحولة:</strong> <span>${res.quantity} ${item.unitOfMeasure}</span></div>
                     <div><strong>قيمة البضاعة المنقولة:</strong> <span>${res.totalValue.toLocaleString()} ر.س</span></div>
                     <div><strong>الحالة:</strong> <span style="color: #059669; font-weight: bold;">${res.status}</span></div>
                   </div>
                 </div>`
          : `<div style="text-align: left; direction: ltr; line-height: 1.8; font-size: 0.95rem;">
                   <p>Stock issue and receipt documented and records updated:</p>
                   <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin: 8px 0;">
                     <div><strong>Transfer Voucher No:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: bold;">${res.referenceNumber}</span></div>
                     <div><strong>Source Warehouse:</strong> <span>${res.sourceWarehouseCode}</span></div>
                     <div><strong>Destination Warehouse:</strong> <span>${res.destinationWarehouseCode}</span></div>
                     <div><strong>Quantity Transferred:</strong> <span>${res.quantity} ${item.unitOfMeasure}</span></div>
                     <div><strong>Transferred Value:</strong> <span>${res.totalValue.toLocaleString()} SAR</span></div>
                     <div><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">${res.status}</span></div>
                   </div>
                 </div>`;

        Swal.fire({
          icon: 'success',
          title: this.langService.t('purchasing.items.alerts.transferSuccessTitle'),
          html,
          confirmButtonText: this.langService.t('common.confirm'),
          confirmButtonColor: '#059669'
        });
      },
      error: (err) => {
        this.isSubmittingTransfer.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('purchasing.items.alerts.transferFailedTitle'),
          text: err?.error?.Description || err?.error?.description || this.langService.t('purchasing.items.alerts.transferFailedText')
        });
      }
    });
  }
}
