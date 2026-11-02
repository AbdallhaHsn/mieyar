import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PurchasingService, PurchaseInvoiceDto, PurchaseInvoiceStatus, PurchasePaymentStatus, PurchaseKpisDto } from '../../../core/services/purchasing.service';
import { LanguageService } from '../../../core/services/language.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { tafqeet } from '../../../core/utils/tafqeet';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-purchase-invoices-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterModule, PaginationComponent, TranslatePipe],
  template: `
    <div class="invoices-page" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-titles">
          <div class="breadcrumbs">
            <span>{{ 'purchasing.invoices.breadcrumbs' | translate }}</span>
            <i class="pi pi-angle-left"></i>
            <strong>{{ 'purchasing.invoices.breadcrumbCurrent' | translate }}</strong>
          </div>
          <h1>{{ 'purchasing.invoices.title' | translate }}</h1>
          <p class="subtitle">{{ 'purchasing.invoices.subtitle' | translate }}</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="loadData()">
            <i class="pi pi-refresh" [class.pi-spin]="isLoading()"></i>
            {{ 'purchasing.invoices.refresh' | translate }}
          </button>
          <a routerLink="/purchasing/invoices/create" class="btn btn-primary">
            <i class="pi pi-plus"></i>
            {{ 'purchasing.invoices.newInvoice' | translate }}
          </a>
        </div>
      </header>

      <!-- KPI Metric Cards -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-box bg-emerald">
            <i class="pi pi-shopping-bag"></i>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">{{ 'purchasing.invoices.kpiTotal' | translate }}</span>
            <strong class="kpi-value">{{ (kpis()?.totalPurchasesAmount || 0) | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></strong>
            <span class="kpi-subtext">{{ 'purchasing.invoices.kpiTotalSub' | translate }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box bg-blue">
            <i class="pi pi-percentage"></i>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">{{ 'purchasing.invoices.kpiVat' | translate }}</span>
            <strong class="kpi-value text-blue">{{ (kpis()?.totalInputVatAmount || 0) | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></strong>
            <span class="kpi-subtext">{{ 'purchasing.invoices.kpiVatSub' | translate }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box bg-purple">
            <i class="pi pi-file"></i>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">{{ 'ui.purchaseInvoicesList.c12f69' | translate }}</span>
            <strong class="kpi-value">{{ kpis()?.totalInvoicesCount || 0 }}</strong>
            <span class="kpi-subtext">{{ 'ui.purchaseInvoicesList.402a4c' | translate }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box bg-rose">
            <i class="pi pi-clock"></i>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">{{ 'ui.purchaseInvoicesList.fcaf25' | translate }}</span>
            <strong class="kpi-value text-rose">{{ (kpis()?.totalUnpaidAmount || 0) | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></strong>
            <span class="kpi-subtext">{{ 'ui.purchaseInvoicesList.126045' | translate }}</span>
          </div>
        </div>
      </section>

      <!-- Filter Panel -->
      <div class="filter-panel">
        <div class="search-box">
          <i class="pi pi-search"></i>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onFilterChange()"
            [placeholder]="'ui.purchaseInvoicesList.7ed98c' | translate"
          />
          <button *ngIf="searchQuery" (click)="searchQuery = ''; onFilterChange()" class="clear-btn">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="filter-tabs">
          <button [class.active]="selectedStatus() === null" (click)="setStatusFilter(null)">
            {{ 'ui.warehouses.9f324a' | translate }}{{ invoices().length }})
          </button>
          <button [class.active]="selectedStatus() === PurchaseInvoiceStatus.Draft" (click)="setStatusFilter(PurchaseInvoiceStatus.Draft)">
            {{ 'ui.purchaseInvoicesList.25df09' | translate }}
          </button>
          <button [class.active]="selectedStatus() === PurchaseInvoiceStatus.Posted" (click)="setStatusFilter(PurchaseInvoiceStatus.Posted)">
            {{ 'ui.purchaseInvoicesList.d774a0' | translate }}
          </button>
          <button [class.active]="selectedStatus() === PurchaseInvoiceStatus.Cancelled" (click)="setStatusFilter(PurchaseInvoiceStatus.Cancelled)">
            {{ 'ui.purchaseInvoicesList.146662' | translate }}
          </button>
        </div>
      </div>

      <!-- Table Section -->
      <div class="table-container">
        <div *ngIf="isLoading()" class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
          <span>{{ 'ui.purchaseInvoicesList.487b0d' | translate }}</span>
        </div>

        <table *ngIf="!isLoading() && filteredInvoices().length > 0" class="data-table">
          <thead>
            <tr>
              <th>{{ 'invoices.view.invoiceNumber' | translate }}</th>
              <th>{{ 'purchasing.invoices.table.vendorInvoiceNo' | translate }}</th>
              <th>{{ 'ui.purchaseInvoicesList.f34d7a' | translate }}</th>
              <th>{{ 'invoices.create.issueDate' | translate }}</th>
              <th>{{ 'invoices.view.taxableBase' | translate }}</th>
              <th>{{ 'invoices.table.vatAmount' | translate }}</th>
              <th>{{ 'ui.purchaseInvoicesList.db9e2c' | translate }}</th>
              <th>{{ 'invoices.table.paymentStatus' | translate }}</th>
              <th>{{ 'purchasing.invoices.table.status' | translate }}</th>
              <th>{{ 'ui.purchaseInvoicesList.13cada' | translate }}</th>
              <th class="text-center">{{ 'branches.table.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let inv of paginatedInvoices()">
              <td class="font-mono">
                <span class="code-pill">{{ inv.invoiceNumber }}</span>
              </td>
              <td class="text-muted">{{ inv.vendorInvoiceNumber || '-' }}</td>
              <td>
                <strong class="vendor-name">{{ inv.vendorName }}</strong>
                <small class="vat-no" *ngIf="inv.vendorVatNumber">{{ 'ui.purchaseInvoicesList.a1641d' | translate }} {{ inv.vendorVatNumber }}</small>
              </td>
              <td>{{ inv.issueDate | date:'yyyy-MM-dd' }}</td>
              <td class="num-cell">{{ inv.totalTaxableAmount | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></td>
              <td class="num-cell text-emerald">{{ inv.totalVat | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></td>
              <td class="num-cell font-bold">{{ inv.totalAmount | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></td>
              <td>
                <div class="payment-cell">
                  <span class="payment-badge" [ngClass]="getPurchasePaymentBadgeClass(inv)">
                    {{ inv.paymentStatusNameAr || (inv.paymentStatus === PurchasePaymentStatus.Paid ? ('hr.advances.filters.completed' | translate) : inv.paymentStatus === PurchasePaymentStatus.PartiallyPaid ? ('ui.purchaseInvoicesList.7a35b4' | translate) : ('ui.purchaseInvoicesList.c0ca5b' | translate)) }}
                  </span>
                  <small *ngIf="getRemaining(inv) > 0" class="remaining-amt">
                    {{ 'invoices.view.remainingBadge' | translate }} {{ getRemaining(inv) | number:'1.2-2' }} {{ 'common.sar' | translate }}
                  </small>
                </div>
              </td>
              <td>
                <span class="status-badge" [ngClass]="getStatusBadgeClass(inv.status)">
                  {{ getStatusLabel(inv.status) }}
                </span>
              </td>
              <td>
                <a *ngIf="inv.associatedJournalEntryNumber" routerLink="/accounting/journal-entries" class="jv-pill">
                  <i class="pi pi-external-link"></i>
                  {{ inv.associatedJournalEntryNumber }}
                </a>
                <span *ngIf="!inv.associatedJournalEntryNumber" class="text-muted">-</span>
              </td>
              <td class="actions-cell">
                <!-- Preview / Details -->
                <button class="action-btn view-btn" (click)="openPreview(inv)" [title]="'ui.purchaseInvoicesList.68d0dd' | translate">
                  <i class="pi pi-eye"></i>
                </button>

                <!-- Pay (if Posted and has remaining balance) -->
                <button
                  *ngIf="inv.status === PurchaseInvoiceStatus.Posted && getRemaining(inv) > 0"
                  class="action-btn pay-btn"
                  (click)="openPayModal(inv)"
                  [title]="'ui.purchaseInvoicesList.cb9715' | translate"
                >
                  <i class="pi pi-credit-card"></i>
                </button>

                <!-- Return / Debit Note (if Posted) -->
                <button
                  *ngIf="inv.status === PurchaseInvoiceStatus.Posted"
                  class="action-btn return-btn"
                  (click)="returnInvoice(inv)"
                  [title]="'ui.purchaseInvoicesList.b26ef4' | translate"
                >
                  <i class="pi pi-replay"></i>
                </button>

                <!-- Post (if Draft) -->
                <button
                  *ngIf="inv.status === PurchaseInvoiceStatus.Draft"
                  class="action-btn post-btn"
                  (click)="postInvoice(inv)"
                  [title]="'ui.purchaseInvoicesList.db28c6' | translate"
                >
                  <i class="pi pi-check"></i>
                </button>

                <!-- Cancel (if Draft) -->
                <button
                  *ngIf="inv.status === PurchaseInvoiceStatus.Draft"
                  class="action-btn cancel-btn"
                  (click)="cancelInvoice(inv)"
                  [title]="'ui.purchaseInvoicesList.4aab94' | translate"
                >
                  <i class="pi pi-ban"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Table Pagination Bar -->
        <app-pagination
          *ngIf="!isLoading() && filteredInvoices().length > 0"
          [totalItems]="filteredInvoices().length"
          [pageSize]="pageSize()"
          [currentPage]="currentPage()"
          [pageSizeOptions]="[5, 10, 20, 50, 100]"
          [itemLabelAr]="('ui.taxInvoices.eb847c' | translate)"
          [itemLabelEn]="'invoices'"
          (pageChange)="currentPage.set($event)"
          (pageSizeChange)="pageSize.set($event)">
        </app-pagination>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && filteredInvoices().length === 0" class="empty-state">
          <i class="pi pi-inbox empty-icon"></i>
          <h3>{{ 'ui.purchaseInvoicesList.9a55c1' | translate }}</h3>
          <p>{{ 'ui.purchaseInvoicesList.60d2aa' | translate }}</p>
          <a routerLink="/purchasing/invoices/create" class="btn btn-primary">
            <i class="pi pi-plus"></i> {{ 'ui.purchaseInvoicesList.b6ce80' | translate }}
          </a>
        </div>
      </div>

      <!-- Preview Modal -->
      <div class="modal-backdrop" *ngIf="showPreviewModal()" (click)="closePreview()">
        <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>{{ 'ui.purchaseInvoicesList.47c7cd' | translate }} {{ selectedInvoice()?.invoiceNumber }}</h3>
              <p class="subtitle">{{ 'ui.procurementHub.57d22c' | translate }} {{ selectedInvoice()?.vendorName }}</p>
            </div>
            <div class="modal-header-actions">
              <button class="btn btn-secondary btn-sm" (click)="printInvoice()">
                <i class="pi pi-print"></i> {{ 'invoices.table.print' | translate }}
              </button>
              <button class="close-btn" (click)="closePreview()"><i class="pi pi-times"></i></button>
            </div>
          </div>
          <div class="modal-body invoice-printable" id="printable-invoice">
            <!-- Invoice Meta Header -->
            <div class="invoice-meta-grid">
              <div>
                <span class="meta-lbl">{{ 'ui.procurementHub.57d22c' | translate }}</span>
                <strong>{{ selectedInvoice()?.vendorName }}</strong>
                <div class="text-sm text-muted" *ngIf="selectedInvoice()?.vendorVatNumber">{{ 'pos.receipt.vatLabel' | translate }} {{ selectedInvoice()?.vendorVatNumber }}</div>
              </div>
              <div>
                <span class="meta-lbl">{{ 'ui.purchaseInvoicesList.ea08d0' | translate }}</span>
                <strong>{{ selectedInvoice()?.issueDate | date:'yyyy-MM-dd' }}</strong>
              </div>
              <div>
                <span class="meta-lbl">{{ 'ui.purchaseInvoicesList.dc8970' | translate }}</span>
                <strong>{{ selectedInvoice()?.vendorInvoiceNumber || ('ui.purchaseInvoicesList.b2c702' | translate) }}</strong>
              </div>
              <div>
                <span class="meta-lbl">{{ 'ui.purchaseInvoicesList.beb008' | translate }}</span>
                <span class="status-badge" [ngClass]="getStatusBadgeClass(selectedInvoice()?.status || 1)">
                  {{ getStatusLabel(selectedInvoice()?.status || 1) }}
                </span>
              </div>
            </div>

            <!-- Lines Table -->
            <table class="data-table preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ 'invoices.view.tableDesc' | translate }}</th>
                  <th>{{ 'invoices.create.qty' | translate }}</th>
                  <th>{{ 'invoices.create.unitPrice' | translate }}</th>
                  <th>{{ 'invoices.create.discount' | translate }}</th>
                  <th>{{ 'invoices.create.taxable' | translate }}</th>
                  <th>{{ 'invoices.create.vatRate' | translate }}</th>
                  <th>{{ 'ui.purchaseInvoiceCreate.d180ce' | translate }}</th>
                  <th>{{ 'invoices.create.lineTotal' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let line of selectedInvoice()?.lines">
                  <td>{{ line.lineNumber }}</td>
                  <td><strong class="item-name-text">{{ langService.currentLang() === 'ar' ? line.itemNameAr : (line.itemNameEn || line.itemNameAr) }}</strong></td>
                  <td class="num-cell">{{ line.quantity | number:'1.0-2' }}</td>
                  <td class="num-cell">{{ line.unitPrice | number:'1.2-2' }}</td>
                  <td class="num-cell">{{ line.discountAmount | number:'1.2-2' }}</td>
                  <td class="num-cell">{{ line.taxableAmount | number:'1.2-2' }}</td>
                  <td>{{ line.vatRate }}%</td>
                  <td class="num-cell text-emerald">{{ line.vatAmount | number:'1.2-2' }}</td>
                  <td class="num-cell font-bold">{{ line.totalAmount | number:'1.2-2' }} {{ 'common.sar' | translate }}</td>
                </tr>
              </tbody>
            </table>

            <!-- Summary Box -->
            <div class="invoice-summary-box">
              <div class="tafqeet-strip">
                <span class="tafqeet-lbl">{{ 'invoices.create.amountInWords' | translate }}</span>
                <strong class="tafqeet-text">{{ tafqeetAmount(selectedInvoice()?.totalAmount || 0) }}</strong>
              </div>
              <div class="totals-breakdown">
                <div class="total-row">
                  <span>{{ 'pos.taxableSubtotal' | translate }}</span>
                  <strong>{{ selectedInvoice()?.totalTaxableAmount | number:'1.2-2' }} {{ 'common.sar' | translate }}</strong>
                </div>
                <div class="total-row">
                  <span>{{ 'pos.vatZatca' | translate }}</span>
                  <strong class="text-emerald">{{ selectedInvoice()?.totalVat | number:'1.2-2' }} {{ 'common.sar' | translate }}</strong>
                </div>
                <div class="total-row grand-total">
                  <span>{{ 'ui.purchaseInvoicesList.7c4c4c' | translate }}</span>
                  <strong class="text-primary">{{ selectedInvoice()?.totalAmount | number:'1.2-2' }} {{ 'common.sar' | translate }}</strong>
                </div>
              </div>
            </div>

            <!-- Linked Journal Entry Note -->
            <div *ngIf="selectedInvoice()?.associatedJournalEntryNumber" class="jv-alert">
              <i class="pi pi-check-circle"></i>
              <span>{{ 'ui.purchaseInvoicesList.44ca64' | translate }} <strong>{{ selectedInvoice()?.associatedJournalEntryNumber }}</strong> {{ 'ui.purchaseInvoicesList.ddba79' | translate }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closePreview()">{{ 'common.close' | translate }}</button>
          </div>
        </div>
      </div>

      <!-- Pay Purchase Invoice Modal (سند صرف وسداد المورد) -->
      <div class="modal-backdrop" *ngIf="showPayModal() && selectedPayInvoice()" (click)="closePayModal()">
        <div class="modal-card modal-md pay-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>{{ 'ui.purchaseInvoicesList.9883de' | translate }} {{ selectedPayInvoice()?.invoiceNumber }}</h3>
              <p class="subtitle">{{ 'ui.procurementHub.57d22c' | translate }} {{ selectedPayInvoice()?.vendorName }}</p>
            </div>
            <button class="close-btn" (click)="closePayModal()"><i class="pi pi-times"></i></button>
          </div>
          <div class="modal-body">
            <div class="payment-summary-strip">
              <div class="summary-col">
                <span>{{ 'ui.procurementHub.d0880b' | translate }}</span>
                <strong>{{ selectedPayInvoice()?.totalAmount | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></strong>
              </div>
              <div class="summary-col">
                <span>{{ 'ui.purchaseInvoicesList.22cad2' | translate }}</span>
                <strong class="text-emerald">{{ (selectedPayInvoice()?.paidAmount || 0) | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></strong>
              </div>
              <div class="summary-col highlight">
                <span class="text-rose">{{ 'ui.purchaseInvoicesList.2b5713' | translate }}</span>
                <strong class="text-rose">{{ getRemaining(selectedPayInvoice()) | number:'1.2-2' }} <small>{{ 'common.sar' | translate }}</small></strong>
              </div>
            </div>

            <form (ngSubmit)="submitPurchasePayment()" class="pay-form">
              <div class="form-group">
                <label>{{ 'ui.purchaseInvoicesList.e77286' | translate }}</label>
                <div class="input-with-currency">
                  <input type="number" step="0.01" min="0.01" [max]="getRemaining(selectedPayInvoice())" class="form-control font-bold" [(ngModel)]="payAmount" name="payAmount" required />
                  <span class="currency-tag">{{ 'common.sar' | translate }}</span>
                </div>
                <div class="quick-btns">
                  <button type="button" class="btn-quick" (click)="payAmount = getRemaining(selectedPayInvoice())">{{ 'invoices.paymentModal.fullRemaining' | translate }}</button>
                  <button type="button" class="btn-quick" (click)="payAmount = +(getRemaining(selectedPayInvoice()) / 2).toFixed(2)">50%</button>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col-half">
                  <label>{{ 'accounting.vouchers.table.method' | translate }}</label>
                  <select class="form-control" [(ngModel)]="payMethod" name="payMethod">
                    <option value="Bank">{{ 'ui.purchaseInvoicesList.59f568' | translate }}</option>
                    <option value="Cash">{{ 'invoices.paymentModal.cashOption' | translate }}</option>
                  </select>
                </div>
                <div class="form-group col-half">
                  <label>{{ 'ui.procurementHub.a33312' | translate }}</label>
                  <input type="date" class="form-control" [(ngModel)]="payDate" name="payDate" required />
                </div>
              </div>

              <div class="form-group">
                <label>{{ 'ui.purchaseInvoicesList.e8d897' | translate }}</label>
                <input type="text" class="form-control font-mono" [placeholder]="'ui.purchaseInvoicesList.bcc69a' | translate" [(ngModel)]="payRef" name="payRef" />
              </div>

              <div class="form-group">
                <label>{{ 'ui.purchaseInvoicesList.f22d33' | translate }}</label>
                <input type="text" class="form-control" [placeholder]="'ui.purchaseInvoicesList.880eff' | translate" [(ngModel)]="payNotes" name="payNotes" />
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closePayModal()">{{ 'common.cancel' | translate }}</button>
                <button type="submit" class="btn btn-primary" [disabled]="isPaying() || payAmount <= 0">
                  <i class="pi pi-check" *ngIf="!isPaying()"></i>
                  <i class="pi pi-spin pi-spinner" *ngIf="isPaying()"></i>
                  {{ 'ui.procurementHub.cea9ea' | translate }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invoices-page {
      padding: 1.5rem;
      background: #F8FAFC;
      min-height: 100vh;
      font-family: var(--font-arabic, system-ui, sans-serif);
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;

      .breadcrumbs {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: #64748B;
        margin-bottom: 0.35rem;

        i { font-size: 0.75rem; }
        strong { color: #0F172A; }
      }

      h1 {
        font-size: 1.5rem;
        font-weight: 800;
        color: #0F172A;
        margin: 0 0 0.25rem 0;
      }

      .subtitle {
        font-size: 0.88rem;
        color: #64748B;
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: 0.75rem;
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      text-decoration: none;
      border: 1px solid transparent;
      transition: all 0.2s ease;

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

      &.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
    }

    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .kpi-card {
      background: #FFFFFF;
      border-radius: 12px;
      padding: 1.1rem;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);

      .kpi-icon-box {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        flex-shrink: 0;

        &.bg-emerald { background: #ECFDF5; color: #059669; }
        &.bg-blue { background: #EFF6FF; color: #2563EB; }
        &.bg-purple { background: #FAF5FF; color: #7C3AED; }
        &.bg-rose { background: #FFF1F2; color: #E11D48; }
      }

      .kpi-content {
        display: flex;
        flex-direction: column;

        .kpi-label { font-size: 0.8rem; color: #64748B; font-weight: 600; }
        .kpi-value { font-size: 1.35rem; font-weight: 800; color: #0F172A; }
        .kpi-subtext { font-size: 0.72rem; color: #94A3B8; }
        .text-blue { color: #2563EB; }
        .text-rose { color: #E11D48; }
      }
    }

    /* Filter Panel */
    .filter-panel {
      background: #FFFFFF;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      border: 1px solid #E2E8F0;
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;

      .search-box {
        position: relative;
        flex: 1;
        min-width: 280px;

        i {
          position: absolute;
          inset-inline-start: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
        }

        input {
          width: 100%;
          padding: 0.55rem 0.85rem 0.55rem 2.4rem;
          border-radius: 7px;
          border: 1px solid #CBD5E1;
          font-size: 0.88rem;
          outline: none;

          &:focus { border-color: #059669; }
        }

        .clear-btn {
          position: absolute;
          inset-inline-end: 0.6rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94A3B8;
        }
      }

      .filter-tabs {
        display: flex;
        gap: 0.35rem;
        background: #F1F5F9;
        padding: 0.25rem;
        border-radius: 8px;

        button {
          background: transparent;
          border: none;
          padding: 0.4rem 0.8rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: #64748B;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;

          &.active {
            background: #FFFFFF;
            color: #059669;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
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

      .vendor-name { display: block; color: #0F172A; }
      .vat-no { display: block; font-size: 0.72rem; color: #94A3B8; }

      .text-emerald { color: #059669; }
      .font-bold { font-weight: 700; }

      .status-badge {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;

        &.badge-draft { background: #F1F5F9; color: #475569; }
        &.badge-posted { background: #ECFDF5; color: #047857; }
        &.badge-cancelled { background: #FEF2F2; color: #DC2626; }
      }

      .jv-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.15rem 0.45rem;
        background: #EFF6FF;
        color: #1D4ED8;
        border-radius: 4px;
        font-size: 0.78rem;
        font-weight: 700;
        text-decoration: none;

        &:hover { text-decoration: underline; }
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

          &.view-btn:hover { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
          &.pay-btn:hover { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
          &.return-btn:hover { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
          &.post-btn:hover { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
          &.cancel-btn:hover { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
        }
      }
    }

    .loading-state, .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      color: #64748B;

      i { font-size: 2.2rem; margin-bottom: 0.75rem; color: #94A3B8; }
      h3 { margin: 0 0 0.5rem 0; color: #0F172A; }
      p { margin: 0 0 1rem 0; font-size: 0.9rem; }
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 14px;
      width: 100%;
      max-width: 900px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow: hidden;

      .modal-header {
        padding: 1.1rem 1.4rem;
        border-bottom: 1px solid #E2E8F0;
        display: flex;
        justify-content: space-between;
        align-items: center;

        h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0F172A; }
        .subtitle { margin: 0.2rem 0 0 0; font-size: 0.85rem; color: #64748B; }

        .modal-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.1rem;
          color: #94A3B8;
          &:hover { color: #0F172A; }
        }
      }

      .modal-body {
        padding: 1.4rem;
        overflow-y: auto;
      }

      .modal-footer {
        padding: 1rem 1.4rem;
        border-top: 1px solid #E2E8F0;
        background: #F8FAFC;
        display: flex;
        justify-content: flex-end;
      }
    }

    .invoice-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      background: #F8FAFC;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;

      .meta-lbl { display: block; font-size: 0.78rem; color: #64748B; margin-bottom: 0.2rem; }
    }

    .preview-table {
      margin-bottom: 1.5rem;
    }

    .invoice-summary-box {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1rem;

      .tafqeet-strip {
        flex: 1;
        .tafqeet-lbl { display: block; font-size: 0.8rem; color: #64748B; margin-bottom: 0.35rem; }
        .tafqeet-text { font-size: 0.95rem; color: #065F46; line-height: 1.5; }
      }

      .totals-breakdown {
        width: 320px;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;

        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.88rem;

          &.grand-total {
            margin-top: 0.4rem;
            padding-top: 0.4rem;
            border-top: 2px dashed #CBD5E1;
            font-size: 1.05rem;
            font-weight: 800;
          }
        }
      }
    }

    .jv-alert {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: #ECFDF5;
      color: #065F46;
      font-size: 0.88rem;
    }

    .pay-btn {
      color: #0284C7;
      background: #F0F9FF;
      border: 1px solid #BAE6FD;
      &:hover { background: #0284C7; color: #FFFFFF; }
    }

    .payment-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      align-items: flex-start;

      .remaining-amt {
        font-size: 0.72rem;
        font-weight: 700;
        color: #E11D48;
        font-family: monospace;
      }
    }

    .payment-badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;

      &.badge-paid {
        background: #ECFDF5;
        color: #065F46;
        border: 1px solid #A7F3D0;
      }

      &.badge-partially-paid {
        background: #FFFBEB;
        color: #92400E;
        border: 1px solid #FDE68A;
      }

      &.badge-unpaid {
        background: #FEF2F2;
        color: #991B1B;
        border: 1px solid #FECACA;
      }
    }

    .pay-modal-card {
      max-width: 520px;
      width: 95%;

      .payment-summary-strip {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 0.75rem;
        margin-bottom: 1rem;
        text-align: center;

        .summary-col {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #64748B;

          strong {
            font-size: 0.95rem;
            color: #0F172A;
            font-family: monospace;
          }

          &.highlight {
            background: #FFF1F2;
            border-radius: 6px;
            padding: 0.25rem;
          }
        }
      }

      .pay-form {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;

          label {
            font-size: 0.8rem;
            font-weight: 700;
            color: #334155;
          }

          .input-with-currency {
            position: relative;
            .currency-tag {
              position: absolute;
              left: 10px;
              top: 50%;
              transform: translateY(-50%);
              font-size: 0.8rem;
              font-weight: 700;
              color: #64748B;
            }
          }

          .quick-btns {
            display: flex;
            gap: 0.4rem;
            margin-top: 0.25rem;

            .btn-quick {
              background: #F1F5F9;
              border: 1px solid #CBD5E1;
              border-radius: 4px;
              font-size: 0.72rem;
              font-weight: 600;
              color: #475569;
              padding: 0.2rem 0.5rem;
              cursor: pointer;
              &:hover { background: #E2E8F0; color: #0F172A; }
            }
          }
        }

        .form-row {
          display: flex;
          gap: 0.75rem;
          .col-half { flex: 1; }
        }

        .form-control {
          height: 36px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 0 0.65rem;
          font-size: 0.85rem;
          &:focus { border-color: #0284C7; outline: none; }
        }
      }
    }
  `]
})
export class PurchaseInvoicesListComponent implements OnInit {
  purchasingService = inject(PurchasingService);
  langService = inject(LanguageService);

  PurchaseInvoiceStatus = PurchaseInvoiceStatus;
  PurchasePaymentStatus = PurchasePaymentStatus;

  invoices = signal<PurchaseInvoiceDto[]>([]);
  kpis = signal<PurchaseKpisDto | null>(null);
  isLoading = signal<boolean>(false);

  searchQuery = '';
  selectedStatus = signal<PurchaseInvoiceStatus | null>(null);

  // Preview Modal
  showPreviewModal = signal<boolean>(false);
  selectedInvoice = signal<PurchaseInvoiceDto | null>(null);

  // Pay Modal
  showPayModal = signal<boolean>(false);
  selectedPayInvoice = signal<PurchaseInvoiceDto | null>(null);
  payAmount: number = 0;
  payMethod: string = 'Bank';
  payDate: string = new Date().toISOString().substring(0, 10);
  payRef: string = '';
  payNotes: string = '';
  isPaying = signal<boolean>(false);

  openPayModal(inv: PurchaseInvoiceDto) {
    this.selectedPayInvoice.set(inv);
    const rem = this.getRemaining(inv);
    this.payAmount = rem;
    this.payMethod = 'Bank';
    this.payDate = new Date().toISOString().substring(0, 10);
    this.payRef = '';
    this.payNotes = '';
    this.showPayModal.set(true);
  }

  closePayModal() {
    this.showPayModal.set(false);
    this.selectedPayInvoice.set(null);
  }

  getRemaining(inv: PurchaseInvoiceDto | null): number {
    if (!inv) return 0;
    return inv.remainingAmount !== undefined ? inv.remainingAmount : Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
  }

  submitPurchasePayment() {
    const inv = this.selectedPayInvoice();
    if (!inv || this.payAmount <= 0) return;
    this.isPaying.set(true);
    this.purchasingService.payPurchaseInvoice(inv.id, {
      amount: this.payAmount,
      paymentDate: new Date(this.payDate).toISOString(),
      paymentMethod: this.payMethod,
      referenceNumber: this.payRef.trim() || undefined,
      notes: this.payNotes.trim() || undefined
    }).subscribe({
      next: () => {
        this.isPaying.set(false);
        this.closePayModal();
        Swal.fire({
          icon: 'success',
          title: this.langService.t('purchasing.purchaseInvoices.alerts.paymentSuccessTitle'),
          text: this.langService.t('purchasing.purchaseInvoices.alerts.paymentSuccessText', { amount: this.payAmount }),
          confirmButtonColor: '#059669'
        });
        this.loadData();
      },
      error: (err) => {
        this.isPaying.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('purchasing.purchaseInvoices.alerts.paymentFailed'),
          text: err?.error?.Description || this.langService.t('purchasing.purchaseInvoices.alerts.paymentFailedDefault'),
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  getPurchasePaymentBadgeClass(inv: PurchaseInvoiceDto): string {
    if (inv.paymentStatus === PurchasePaymentStatus.Paid) return 'badge-paid';
    if (inv.paymentStatus === PurchasePaymentStatus.PartiallyPaid) return 'badge-partially-paid';
    return 'badge-unpaid';
  }

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedInvoices = computed(() => {
    const list = this.filteredInvoices();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  filteredInvoices = computed(() => {
    let list = this.invoices();
    if (this.selectedStatus() !== null) {
      list = list.filter(i => i.status === this.selectedStatus());
    }
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.vendorName.toLowerCase().includes(q) ||
        (i.vendorInvoiceNumber && i.vendorInvoiceNumber.toLowerCase().includes(q))
      );
    }
    return list;
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.purchasingService.getPurchaseInvoices().subscribe({
      next: (res) => {
        this.invoices.set(res || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    this.purchasingService.getPurchaseKpis().subscribe({
      next: (res) => {
        this.kpis.set(res);
      }
    });
  }

  setStatusFilter(status: PurchaseInvoiceStatus | null) {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  onFilterChange() {
    this.currentPage.set(1);
  }

  getStatusLabel(status: PurchaseInvoiceStatus): string {
    switch (status) {
      case PurchaseInvoiceStatus.Draft: return this.langService.t('purchasing.purchaseInvoices.status.draft');
      case PurchaseInvoiceStatus.UnderApproval: return this.langService.t('purchasing.purchaseInvoices.status.underApproval');
      case PurchaseInvoiceStatus.Posted: return this.langService.t('purchasing.purchaseInvoices.status.posted');
      case PurchaseInvoiceStatus.Cancelled: return this.langService.t('purchasing.purchaseInvoices.status.cancelled');
      default: return this.langService.t('purchasing.purchaseInvoices.status.draft');
    }
  }

  getStatusBadgeClass(status: PurchaseInvoiceStatus): string {
    switch (status) {
      case PurchaseInvoiceStatus.Draft: return 'badge-draft';
      case PurchaseInvoiceStatus.Posted: return 'badge-posted';
      case PurchaseInvoiceStatus.Cancelled: return 'badge-cancelled';
      default: return 'badge-draft';
    }
  }

  postInvoice(inv: PurchaseInvoiceDto) {
    Swal.fire({
      title: this.langService.t('purchasing.purchaseInvoices.alerts.confirmPostTitle'),
      text: this.langService.t('purchasing.purchaseInvoices.alerts.confirmPostText', { number: inv.invoiceNumber }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('purchasing.purchaseInvoices.alerts.yesPost'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669'
    }).then((res) => {
      if (res.isConfirmed) {
        this.purchasingService.postPurchaseInvoice(inv.id).subscribe({
          next: (updated) => {
            this.loadData();
            Swal.fire({
              icon: 'success',
              title: this.langService.t('purchasing.purchaseInvoices.alerts.postSuccessTitle'),
              text: this.langService.t('purchasing.purchaseInvoices.alerts.postSuccessText', { number: updated.associatedJournalEntryNumber || '' })
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.langService.t('purchasing.purchaseInvoices.alerts.postFailed'),
              text: err?.error?.Description || this.langService.t('purchasing.purchaseInvoices.alerts.postFailedDefault')
            });
          }
        });
      }
    });
  }

  cancelInvoice(inv: PurchaseInvoiceDto) {
    Swal.fire({
      title: this.langService.t('purchasing.purchaseInvoices.alerts.cancelTitle'),
      text: this.langService.t('purchasing.purchaseInvoices.alerts.cancelConfirmText', { number: inv.invoiceNumber }),
      input: 'text',
      inputPlaceholder: this.langService.t('purchasing.purchaseInvoices.alerts.cancelReasonPlaceholder'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('purchasing.purchaseInvoices.alerts.yesCancel'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#EF4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.purchasingService.cancelPurchaseInvoice(inv.id, res.value).subscribe({
          next: () => {
            this.loadData();
            Swal.fire({ icon: 'success', title: this.langService.t('common.cancelledSuccessfully'), text: this.langService.t('purchasing.purchaseInvoices.alerts.cancelledSuccess') });
          },
          error: (err) => {
            Swal.fire({ icon: 'error', title: this.langService.t('common.error'), text: err?.error?.Description || this.langService.t('purchasing.purchaseInvoices.alerts.cancelFailed') });
          }
        });
      }
    });
  }

  returnInvoice(inv: PurchaseInvoiceDto) {
    Swal.fire({
      title: this.langService.t('purchasing.purchaseInvoices.alerts.returnsTitle'),
      text: this.langService.t('purchasing.purchaseInvoices.alerts.returnsConfirmText', { number: inv.invoiceNumber }),
      input: 'text',
      inputPlaceholder: this.langService.t('purchasing.purchaseInvoices.alerts.returnsReasonPlaceholder'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('purchasing.purchaseInvoices.alerts.yesReturn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#DC2626'
    }).then((res) => {
      if (res.isConfirmed) {
        this.purchasingService.returnPurchaseInvoice(inv.id, res.value).subscribe({
          next: () => {
            this.loadData();
            Swal.fire({
              icon: 'success',
              title: this.langService.t('purchasing.purchaseInvoices.alerts.returnsSuccessTitle'),
              text: this.langService.t('purchasing.purchaseInvoices.alerts.returnsSuccessText')
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.langService.t('common.error'),
              text: err?.error?.Description || this.langService.t('purchasing.purchaseInvoices.alerts.returnsFailed')
            });
          }
        });
      }
    });
  }

  openPreview(inv: PurchaseInvoiceDto) {
    this.selectedInvoice.set(inv);
    this.showPreviewModal.set(true);
  }

  closePreview() {
    this.showPreviewModal.set(false);
    this.selectedInvoice.set(null);
  }

  tafqeetAmount(amount: number): string {
    return tafqeet(amount);
  }

  printInvoice() {
    window.print();
  }
}
