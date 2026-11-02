import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import Swal from 'sweetalert2';

export enum PdcType {
  Receivable = 1, // ورقة قبض
  Payable = 2    // ورقة دفع
}

export enum PdcStatus {
  Received = 1,  // مستلم / محرر
  Deposited = 2, // مودع بالحافظة
  Cleared = 3,   // تم التحصيل الفعلي
  Bounced = 4,   // مرتد
  Cancelled = 5  // ملغي
}

export interface PostDatedCheckDto {
  id: string;
  checkNumber: string;
  bankName: string;
  drawerOrPayee: string;
  amount: number;
  dueDate: string;
  receivedDate: string;
  status: PdcStatus;
  statusNameAr: string;
  type: PdcType;
  typeNameAr: string;
  depositDate?: string;
  clearDate?: string;
  bounceReason?: string;
  bounceFee?: number;
  notes?: string;
}

@Component({
  selector: 'app-checks',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, PaginationComponent, TranslatePipe],
  template: `
    <div class="checks-container" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-title-box">
          <div class="icon-frame">
            <i class="pi pi-credit-card"></i>
          </div>
          <div>
            <h1 class="page-title">
              {{ 'accounting.checks.title' | translate }}
            </h1>
            <p class="page-subtitle">
              {{ 'accounting.checks.subtitle' | translate }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn-refresh" (click)="loadChecks()" [title]="'accounting.checks.refresh' | translate">
            <i class="pi pi-refresh" [class.pi-spin]="isLoading()"></i>
            <span>{{ 'accounting.checks.refresh' | translate }}</span>
          </button>
          <button class="btn-primary" (click)="openCreateModal()">
            <i class="pi pi-plus"></i>
            <span>{{ 'accounting.checks.newCheck' | translate }}</span>
          </button>
        </div>
      </header>

      <!-- KPI Metrics Strip -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-box cyan">
            <i class="pi pi-inbox"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">{{ 'accounting.checks.kpi.totalInPortfolio' | translate }}</span>
            <strong class="kpi-value">{{ totalReceivedAmount() | number:'1.2-2' }} <small>SAR</small></strong>
            <span class="kpi-count">{{ receivedCount() }} {{ 'accounting.checks.kpi.checksInPortfolio' | translate }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box amber">
            <i class="pi pi-clock"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">{{ 'accounting.checks.kpi.depositedAmount' | translate }}</span>
            <strong class="kpi-value">{{ totalDepositedAmount() | number:'1.2-2' }} <small>SAR</small></strong>
            <span class="kpi-count">{{ depositedCount() }} {{ 'accounting.checks.kpi.checksInBank' | translate }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box emerald">
            <i class="pi pi-check-circle"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">{{ 'accounting.checks.kpi.clearedAmount' | translate }}</span>
            <strong class="kpi-value text-emerald">{{ totalClearedAmount() | number:'1.2-2' }} <small>SAR</small></strong>
            <span class="kpi-count">{{ clearedCount() }} {{ 'accounting.checks.kpi.clearedCount' | translate }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box rose">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">{{ 'accounting.checks.kpi.bouncedAmount' | translate }}</span>
            <strong class="kpi-value text-rose">{{ totalBouncedAmount() | number:'1.2-2' }} <small>SAR</small></strong>
            <span class="kpi-count">{{ bouncedCount() }} {{ 'accounting.checks.kpi.bouncedCount' | translate }}</span>
          </div>
        </div>
      </section>

      <!-- Filter Controls Strip -->
      <section class="filters-bar">
        <div class="type-pills">
          <button [class.active]="selectedType() === null" (click)="selectedType.set(null); currentPage.set(1)">
            {{ 'accounting.checks.filter.all' | translate }}
          </button>
          <button [class.active]="selectedType() === PdcType.Receivable" (click)="selectedType.set(PdcType.Receivable); currentPage.set(1)">
            <i class="pi pi-arrow-down-left"></i>
            {{ 'accounting.checks.filter.receivable' | translate }}
          </button>
          <button [class.active]="selectedType() === PdcType.Payable" (click)="selectedType.set(PdcType.Payable); currentPage.set(1)">
            <i class="pi pi-arrow-up-right"></i>
            {{ 'accounting.checks.filter.payable' | translate }}
          </button>
        </div>

        <div class="status-select-wrap">
          <select [ngModel]="selectedStatus()" (ngModelChange)="selectedStatus.set($event); currentPage.set(1)" class="status-select">
            <option [ngValue]="null">{{ 'accounting.checks.filter.allStatuses' | translate }}</option>
            <option [ngValue]="PdcStatus.Received">{{ 'accounting.checks.filter.inPortfolio' | translate }}</option>
            <option [ngValue]="PdcStatus.Deposited">{{ 'accounting.checks.filter.deposited' | translate }}</option>
            <option [ngValue]="PdcStatus.Cleared">{{ 'accounting.checks.filter.cleared' | translate }}</option>
            <option [ngValue]="PdcStatus.Bounced">{{ 'accounting.checks.filter.bounced' | translate }}</option>
          </select>

          <input 
            type="text" 
            [placeholder]="'accounting.checks.filter.searchPlaceholder' | translate" 
            class="search-input"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event); currentPage.set(1)" />
        </div>
      </section>

      <!-- Checks Table -->
      <div class="table-card">
        <table class="checks-table">
          <thead>
            <tr>
              <th>{{ 'accounting.checks.table.type' | translate }}</th>
              <th>{{ 'accounting.checks.table.checkNo' | translate }}</th>
              <th>{{ 'accounting.checks.table.bank' | translate }}</th>
              <th>{{ 'accounting.checks.table.party' | translate }}</th>
              <th>{{ 'accounting.checks.table.dueDate' | translate }}</th>
              <th>{{ 'accounting.checks.table.amount' | translate }}</th>
              <th>{{ 'accounting.checks.table.status' | translate }}</th>
              <th class="text-center">{{ 'accounting.checks.table.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="filteredChecks().length === 0">
              <td colspan="8" class="empty-state">
                <i class="pi pi-inbox"></i>
                <p>{{ 'accounting.checks.table.noChecksFound' | translate }}</p>
              </td>
            </tr>
            <tr *ngFor="let check of paginatedChecks()">
              <td>
                <span class="type-badge" [class.rec]="check.type === PdcType.Receivable" [class.pay]="check.type === PdcType.Payable">
                  <i class="pi" [ngClass]="check.type === PdcType.Receivable ? 'pi-arrow-down-left' : 'pi-arrow-up-right'"></i>
                  {{ check.typeNameAr }}
                </span>
              </td>
              <td><strong>{{ check.checkNumber }}</strong></td>
              <td>{{ check.bankName }}</td>
              <td>{{ check.drawerOrPayee }}</td>
              <td>
                <span [class.overdue]="isOverdue(check.dueDate) && check.status < PdcStatus.Cleared">
                  {{ check.dueDate | date:'yyyy-MM-dd' }}
                </span>
              </td>
              <td class="amount-cell">{{ check.amount | number:'1.2-2' }}</td>
              <td>
                <span class="status-pill" [ngClass]="getStatusClass(check.status)">
                  {{ check.statusNameAr }}
                </span>
              </td>
              <td class="actions-cell">
                <!-- If Received: can Deposit -->
                <button 
                  *ngIf="check.status === PdcStatus.Received" 
                  class="btn-action deposit" 
                  (click)="depositCheck(check)"
                  [title]="'accounting.checks.table.depositTitle' | translate">
                  <i class="pi pi-send"></i>
                  <span>{{ 'accounting.checks.table.deposit' | translate }}</span>
                </button>

                <!-- If Deposited: can Clear or Bounce -->
                <button 
                  *ngIf="check.status === PdcStatus.Deposited" 
                  class="btn-action clear" 
                  (click)="clearCheck(check)"
                  [title]="'accounting.checks.table.clearTitle' | translate">
                  <i class="pi pi-check"></i>
                  <span>{{ 'accounting.checks.table.clear' | translate }}</span>
                </button>

                <button 
                  *ngIf="check.status === PdcStatus.Deposited" 
                  class="btn-action bounce" 
                  (click)="bounceCheck(check)"
                  [title]="'accounting.checks.table.bounceTitle' | translate">
                  <i class="pi pi-times-circle"></i>
                  <span>{{ 'accounting.checks.table.bounce' | translate }}</span>
                </button>

                <!-- Cleared or Bounced tag -->
                <span *ngIf="check.status === PdcStatus.Cleared" class="action-done success">
                  <i class="pi pi-check-circle"></i> {{ 'accounting.checks.table.cleared' | translate }}
                </span>
                <span *ngIf="check.status === PdcStatus.Bounced" class="action-done danger" [title]="check.bounceReason || ''">
                  <i class="pi pi-ban"></i> {{ 'accounting.checks.table.bounced' | translate }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <app-pagination
          [totalItems]="filteredChecks().length"
          [(currentPage)]="currentPage"
          [(pageSize)]="pageSize"
          [pageSizeOptions]="[5, 10, 20, 50]"
          [itemLabelAr]="'ui.checks.80ed05' | translate"
          itemLabelEn="Checks"
        ></app-pagination>
      </div>

      <!-- Create Check Modal -->
      <div class="modal-backdrop" *ngIf="showCreateModal()" (click)="showCreateModal.set(false)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <i class="pi pi-plus-circle"></i>
              {{ 'accounting.checks.modal.title' | translate }}
            </h3>
            <button class="close-btn" (click)="showCreateModal.set(false)">&times;</button>
          </div>

          <form (ngSubmit)="submitCreateCheck()" class="modal-form">
            <div class="form-row">
              <div class="form-group">
                <label>{{ 'accounting.checks.modal.noteType' | translate }}</label>
                <select [(ngModel)]="newCheckForm.type" name="type" class="form-control" required>
                  <option [ngValue]="PdcType.Receivable">{{ 'accounting.checks.modal.receivableOption' | translate }}</option>
                  <option [ngValue]="PdcType.Payable">{{ 'accounting.checks.modal.payableOption' | translate }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>{{ 'accounting.checks.modal.checkNo' | translate }}</label>
                <input type="text" [(ngModel)]="newCheckForm.checkNumber" name="checkNumber" class="form-control" [placeholder]="'accounting.checks.modal.checkNoPlaceholder' | translate" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ 'accounting.checks.modal.bankName' | translate }}</label>
                <input type="text" [(ngModel)]="newCheckForm.bankName" name="bankName" class="form-control" [placeholder]="'accounting.checks.modal.bankNamePlaceholder' | translate" required />
              </div>

              <div class="form-group">
                <label>{{ 'accounting.checks.modal.amount' | translate }}</label>
                <input type="number" step="0.01" [(ngModel)]="newCheckForm.amount" name="amount" class="form-control" placeholder="0.00" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ 'accounting.checks.modal.party' | translate }}</label>
                <input type="text" [(ngModel)]="newCheckForm.drawerOrPayee" name="drawerOrPayee" class="form-control" [placeholder]="'accounting.checks.modal.partyPlaceholder' | translate" required />
              </div>

              <div class="form-group">
                <label>{{ 'accounting.checks.modal.dueDate' | translate }}</label>
                <input type="date" [(ngModel)]="newCheckForm.dueDate" name="dueDate" class="form-control" required />
              </div>
            </div>

            <div class="form-group">
              <label>{{ 'accounting.checks.modal.notes' | translate }}</label>
              <textarea [(ngModel)]="newCheckForm.notes" name="notes" class="form-control" rows="2" [placeholder]="'accounting.checks.modal.notesPlaceholder' | translate"></textarea>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="showCreateModal.set(false)">
                {{ 'common.cancel' | translate }}
              </button>
              <button type="submit" class="btn-submit" [disabled]="isSubmitting()">
                <i class="pi pi-check"></i>
                <span>{{ 'accounting.checks.modal.saveCheck' | translate }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .checks-container {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: var(--font-arabic) !important;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      padding: 1.25rem 1.5rem;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    }

    .header-title-box {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .icon-frame {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .page-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
    }

    .page-subtitle {
      font-size: 0.8rem;
      color: #64748B;
      margin: 0.2rem 0 0 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 9px;
      padding: 0.55rem 1.25rem;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
      }
    }

    .btn-refresh {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      border-radius: 9px;
      padding: 0.55rem 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;

      &:hover {
        background: #F1F5F9;
        color: #0F172A;
      }
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 1.15rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
    }

    .kpi-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;

      &.cyan { background: #E0F2FE; color: #0284C7; }
      &.amber { background: #FEF3C7; color: #D97706; }
      &.emerald { background: #ECFDF5; color: #059669; }
      &.rose { background: #FFE4E6; color: #E11D48; }
    }

    .kpi-details {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .kpi-label {
      font-size: 0.74rem;
      color: #64748B;
      font-weight: 600;
    }

    .kpi-value {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0F172A;
    }

    .kpi-count {
      font-size: 0.7rem;
      color: #94A3B8;
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      background: #FFFFFF;
      padding: 0.85rem 1.25rem;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
    }

    .type-pills {
      display: flex;
      gap: 0.5rem;

      button {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        padding: 0.4rem 0.85rem;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: all 0.2s ease;

        &.active {
          background: #ECFDF5;
          border-color: #10B981;
          color: #059669;
          font-weight: 750;
        }
      }
    }

    .status-select-wrap {
      display: flex;
      gap: 0.65rem;
      align-items: center;
    }

    .status-select, .search-input {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.82rem;
      color: #1E293B;
      outline: none;

      &:focus {
        border-color: #10B981;
        background: #FFFFFF;
      }
    }

    .search-input {
      min-width: 260px;
    }

    /* Table */
    .table-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
    }

    .checks-table {
      width: 100%;
      border-collapse: collapse;
      text-align: start;

      th {
        background: #F8FAFC;
        padding: 0.85rem 1rem;
        font-size: 0.78rem;
        font-weight: 750;
        color: #475569;
        border-bottom: 1px solid #E2E8F0;
      }

      td {
        padding: 0.85rem 1rem;
        font-size: 0.82rem;
        color: #334155;
        border-bottom: 1px solid #F1F5F9;
      }

      tr:hover td {
        background: #F8FAFC;
      }
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;

      &.rec { background: #E0F2FE; color: #0284C7; }
      &.pay { background: #FEF3C7; color: #D97706; }
    }

    .status-pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 750;

      &.received { background: #F1F5F9; color: #475569; }
      &.deposited { background: #FEF3C7; color: #D97706; }
      &.cleared { background: #ECFDF5; color: #059669; }
      &.bounced { background: #FFE4E6; color: #E11D48; }
    }

    .amount-cell {
      font-weight: 750;
      color: #0F172A;
    }

    .overdue {
      color: #E11D48;
      font-weight: 750;
    }

    .actions-cell {
      display: flex;
      gap: 0.4rem;
      align-items: center;
      justify-content: center;
    }

    .btn-action {
      border: 1px solid transparent;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      transition: all 0.15s ease;

      &.deposit { background: #FEF3C7; color: #B45309; border-color: #FDE68A; }
      &.clear { background: #ECFDF5; color: #047857; border-color: #A7F3D0; }
      &.bounce { background: #FFE4E6; color: #BE123C; border-color: #FECDD3; }

      &:hover {
        transform: translateY(-1px);
        filter: brightness(0.95);
      }
    }

    .action-done {
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;

      &.success { color: #059669; }
      &.danger { color: #E11D48; }
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #94A3B8;

      i { font-size: 2.5rem; margin-bottom: 0.5rem; }
      p { font-size: 0.88rem; margin: 0; }
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
      z-index: 1000;
      padding: 1rem;
    }

    .modal-box {
      background: #FFFFFF;
      border-radius: 14px;
      width: 100%;
      max-width: 580px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
      overflow: hidden;
    }

    .modal-header {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 1.5rem;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;

      h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        color: #0F172A;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #059669;
      }

      .close-btn {
        background: transparent;
        border: none;
        font-size: 1.5rem;
        color: #64748B;
        cursor: pointer;
      }
    }

    .modal-form {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
      flex: 1 1 auto;
      min-height: 0;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      label {
        font-size: 0.78rem;
        font-weight: 700;
        color: #334155;
      }
    }

    .form-control {
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      outline: none;

      &:focus {
        border-color: #10B981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
      }
    }

    .modal-footer {
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
      position: sticky;
      bottom: 0;
      background: #FFFFFF;
      padding-top: 0.5rem;
    }

    .btn-submit {
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.55rem 1.25rem;
      font-weight: 750;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .btn-cancel {
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      color: #475569;
      border-radius: 8px;
      padding: 0.55rem 1rem;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class ChecksComponent implements OnInit {
  private http = inject(HttpClient);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);

  checks = signal<PostDatedCheckDto[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);

  // Filters
  selectedType = signal<PdcType | null>(null);
  selectedStatus = signal<PdcStatus | null>(null);
  searchTerm = signal<string>('');

  // Enums for template
  PdcType = PdcType;
  PdcStatus = PdcStatus;

  newCheckForm = {
    type: PdcType.Receivable,
    checkNumber: '',
    bankName: '',
    drawerOrPayee: '',
    amount: 0,
    dueDate: new Date().toISOString().substring(0, 10),
    notes: ''
  };

  // KPIs
  totalReceivedAmount = computed(() => this.checks().filter(c => c.status === PdcStatus.Received).reduce((s, c) => s + c.amount, 0));
  receivedCount = computed(() => this.checks().filter(c => c.status === PdcStatus.Received).length);

  totalDepositedAmount = computed(() => this.checks().filter(c => c.status === PdcStatus.Deposited).reduce((s, c) => s + c.amount, 0));
  depositedCount = computed(() => this.checks().filter(c => c.status === PdcStatus.Deposited).length);

  totalClearedAmount = computed(() => this.checks().filter(c => c.status === PdcStatus.Cleared).reduce((s, c) => s + c.amount, 0));
  clearedCount = computed(() => this.checks().filter(c => c.status === PdcStatus.Cleared).length);

  totalBouncedAmount = computed(() => this.checks().filter(c => c.status === PdcStatus.Bounced).reduce((s, c) => s + c.amount, 0));
  bouncedCount = computed(() => this.checks().filter(c => c.status === PdcStatus.Bounced).length);

  filteredChecks = computed(() => {
    return this.checks().filter(c => {
      if (this.selectedType() !== null && c.type !== this.selectedType()) return false;
      if (this.selectedStatus() !== null && c.status !== this.selectedStatus()) return false;
      if (this.searchTerm()) {
        const q = this.searchTerm().toLowerCase();
        return (c.checkNumber || '').toLowerCase().includes(q) ||
               (c.bankName || '').toLowerCase().includes(q) ||
               (c.drawerOrPayee || '').toLowerCase().includes(q);
      }
      return true;
    });
  });

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedChecks = computed(() => {
    const list = this.filteredChecks();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.loadChecks();
  }

  loadChecks() {
    this.isLoading.set(true);
    this.http.get<PostDatedCheckDto[]>('/api/checks').subscribe({
      next: (res) => {
        this.checks.set(res || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal() {
    this.newCheckForm = {
      type: PdcType.Receivable,
      checkNumber: '',
      bankName: '',
      drawerOrPayee: '',
      amount: 0,
      dueDate: new Date().toISOString().substring(0, 10),
      notes: ''
    };
    this.showCreateModal.set(true);
  }

  submitCreateCheck() {
    if (!this.newCheckForm.checkNumber || !this.newCheckForm.bankName || this.newCheckForm.amount <= 0) {
      Swal.fire({ icon: 'warning', title: this.langService.t('accounting.checks.alerts.incompleteData'), text: this.langService.t('accounting.checks.alerts.enterRequiredCheckFields') });
      return;
    }

    this.isSubmitting.set(true);
    this.http.post('/api/checks', this.newCheckForm).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showCreateModal.set(false);
        Swal.fire({ icon: 'success', title: this.langService.t('common.saved'), text: this.langService.t('accounting.checks.alerts.savedSuccess') });
        this.loadChecks();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        Swal.fire({ icon: 'error', title: this.langService.t('common.error'), text: err?.error?.description || this.langService.t('accounting.checks.alerts.saveFailed') });
      }
    });
  }

  depositCheck(check: PostDatedCheckDto) {
    Swal.fire({
      title: this.langService.t('accounting.checks.alerts.depositTitle'),
      text: this.langService.t('accounting.checks.alerts.depositConfirmText', { number: check.checkNumber, amount: check.amount }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.checks.alerts.confirmDeposit'),
      cancelButtonText: this.langService.t('common.cancel')
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post(`/api/checks/${check.id}/deposit`, {}).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: this.langService.t('accounting.checks.alerts.depositedSuccessTitle'), text: this.langService.t('accounting.checks.alerts.depositedSuccessText') });
            this.loadChecks();
          },
          error: (err) => Swal.fire({ icon: 'error', title: this.langService.t('common.error'), text: err?.error?.description || this.langService.t('accounting.checks.alerts.depositFailed') })
        });
      }
    });
  }

  clearCheck(check: PostDatedCheckDto) {
    Swal.fire({
      title: this.langService.t('accounting.checks.alerts.clearTitle'),
      text: this.langService.t('accounting.checks.alerts.clearConfirmText', { amount: check.amount }),
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.checks.alerts.confirmClear'),
      cancelButtonText: this.langService.t('common.cancel')
    }).then(result => {
      if (result.isConfirmed) {
        this.http.post(`/api/checks/${check.id}/clear`, {}).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: this.langService.t('accounting.checks.alerts.clearedSuccessTitle'), text: this.langService.t('accounting.checks.alerts.clearedSuccessText') });
            this.loadChecks();
          },
          error: (err) => Swal.fire({ icon: 'error', title: this.langService.t('common.error'), text: err?.error?.description || this.langService.t('accounting.checks.alerts.clearFailed') })
        });
      }
    });
  }

  bounceCheck(check: PostDatedCheckDto) {
    Swal.fire({
      title: this.langService.t('accounting.checks.alerts.bounceTitle'),
      html: `
        <input id="swal-bounce-reason" class="swal2-input" placeholder="${this.langService.t('accounting.checks.alerts.bounceReasonPlaceholder')}">
        <input id="swal-bounce-fee" type="number" class="swal2-input" placeholder="${this.langService.t('accounting.checks.alerts.bounceFeePlaceholder')}">
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.checks.alerts.confirmBounce'),
      cancelButtonText: this.langService.t('common.cancel'),
      preConfirm: () => {
        const reason = (document.getElementById('swal-bounce-reason') as HTMLInputElement).value;
        const fee = (document.getElementById('swal-bounce-fee') as HTMLInputElement).value;
        if (!reason) {
          Swal.showValidationMessage(this.langService.t('accounting.checks.alerts.bounceReasonRequired'));
        }
        return { reason, fee: Number(fee) || 0 };
      }
    }).then(result => {
      if (result.isConfirmed) {
        const body = { reason: result.value.reason, bounceFee: result.value.fee };
        this.http.post(`/api/checks/${check.id}/bounce`, body).subscribe({
          next: () => {
            Swal.fire({ icon: 'warning', title: this.langService.t('accounting.checks.alerts.bouncedSuccessTitle'), text: this.langService.t('accounting.checks.alerts.bouncedSuccessText') });
            this.loadChecks();
          },
          error: (err) => Swal.fire({ icon: 'error', title: this.langService.t('common.error'), text: err?.error?.description || this.langService.t('accounting.checks.alerts.bounceFailed') })
        });
      }
    });
  }

  isOverdue(dueDateStr: string): boolean {
    if (!dueDateStr) return false;
    const due = new Date(dueDateStr).getTime();
    const now = new Date().setHours(0,0,0,0);
    return due < now;
  }

  getStatusClass(status: PdcStatus): string {
    switch (status) {
      case PdcStatus.Received: return 'received';
      case PdcStatus.Deposited: return 'deposited';
      case PdcStatus.Cleared: return 'cleared';
      case PdcStatus.Bounced: return 'bounced';
      default: return 'received';
    }
  }
}
