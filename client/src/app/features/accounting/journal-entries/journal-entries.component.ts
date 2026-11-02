import { Component, OnInit, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DocumentAttachmentsModalComponent } from '../../../shared/components/document-attachments-modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { 
  JournalEntryService, 
  JournalEntrySummary, 
  JournalEntry, 
  JournalEntryKpi,
  CreateJournalEntryRequest 
} from '../../../core/services/journal-entry.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { FinancialSettingsService, CostCenter } from '../../../core/services/financial-settings.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountDto } from '../../../core/models/account.model';
import { TafqeetService } from '../../../core/services/tafqeet.service';
import Swal from 'sweetalert2';

interface EditLine {
  accountId: string;
  costCenterId?: string;
  description: string;
  debit: number;
  credit: number;
}

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DocumentAttachmentsModalComponent, PaginationComponent, TranslatePipe],
  template: `
    <div class="journal-page" [class.is-printing-active]="!!printingEntry()" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Top Header Strip -->
      <header class="page-header">
        <div class="header-titles">
          <div class="badge-icon">
            <i class="pi pi-book"></i>
          </div>
          <div>
            <h1 class="page-title">
              {{ 'accounting.journal.ui.generalJournalEntries' | translate }}
            </h1>
            <p class="page-subtitle">
              {{ 'accounting.journal.ui.journalSubtitle' | translate }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button *ngIf="activeViewTab === 'regular'" class="btn-primary" (click)="openCreateModal()">
            <i class="pi pi-plus"></i>
            <span>{{ 'accounting.journal.ui.newJournalEntry' | translate }}</span>
          </button>
          <button *ngIf="activeViewTab === 'recurring'" class="btn-primary" (click)="openCreateRecurringModal()">
            <i class="pi pi-plus"></i>
            <span>{{ 'accounting.journal.ui.addRecurringSchedule' | translate }}</span>
          </button>
        </div>
      </header>

      <!-- Sub-Tabs Bar: Regular Journal vs Recurring Entries -->
      <div class="tabs-subnav">
        <button 
          class="subnav-pill" 
          [class.active]="activeViewTab === 'regular'" 
          (click)="switchViewTab('regular')">
          <i class="pi pi-book"></i>
          <span>{{ 'accounting.journal.ui.generalJournal' | translate }}</span>
        </button>
        <button 
          class="subnav-pill" 
          [class.active]="activeViewTab === 'recurring'" 
          (click)="switchViewTab('recurring')">
          <i class="pi pi-sync"></i>
          <span>{{ 'accounting.journal.ui.recurringEntries' | translate }}</span>
          <span class="badge-count" *ngIf="recurringEntries().length">{{ recurringEntries().length }}</span>
        </button>
      </div>

      <!-- Regular Journal View -->
      <ng-container *ngIf="activeViewTab === 'regular'">

      <!-- KPI Strip -->
      <section class="kpi-strip" *ngIf="kpi()">
        <div class="kpi-card">
          <div class="kpi-icon total"><i class="pi pi-file"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">{{ 'accounting.journal.ui.totalEntries' | translate }}</span>
            <strong class="kpi-val">{{ kpi()?.totalEntries }}</strong>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon posted"><i class="pi pi-check-circle"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">{{ 'accounting.journal.ui.postedEntries' | translate }}</span>
            <strong class="kpi-val text-emerald">{{ kpi()?.postedEntries }}</strong>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon draft"><i class="pi pi-file-edit"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">{{ 'accounting.journal.ui.draftEntries' | translate }}</span>
            <strong class="kpi-val text-amber">{{ kpi()?.draftEntries }}</strong>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon volume"><i class="pi pi-chart-line"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">{{ 'accounting.journal.ui.totalVolumeSar' | translate }}</span>
            <strong class="kpi-val text-cyan">{{ kpi()?.totalDebitVolume | number:'1.2-2' }} <small>SAR</small></strong>
          </div>
        </div>
      </section>

      <!-- Filter Bar -->
      <section class="filter-bar">
        <div class="search-box">
          <i class="pi pi-search"></i>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (ngModelChange)="onFilterChange()"
            [placeholder]="'accounting.journal.ui.searchByEntryNoDesc' | translate" 
          />
        </div>

        <!-- Status Filter Tabs -->
        <div class="status-filters">
          <button 
            class="filter-pill" 
            [class.active]="selectedStatus() === null" 
            (click)="setStatusFilter(null)">
            {{ 'accounting.journal.ui.all' | translate }}
          </button>
          <button 
            class="filter-pill" 
            [class.active]="selectedStatus() === 2" 
            (click)="setStatusFilter(2)">
            <span class="dot posted"></span>
            {{ 'accounting.journal.ui.posted' | translate }}
          </button>
          <button 
            class="filter-pill" 
            [class.active]="selectedStatus() === 1" 
            (click)="setStatusFilter(1)">
            <span class="dot draft"></span>
            {{ 'accounting.journal.ui.draft' | translate }}
          </button>
          <button 
            class="filter-pill" 
            [class.active]="selectedStatus() === 3" 
            (click)="setStatusFilter(3)">
            <span class="dot reversed"></span>
            {{ 'accounting.journal.ui.reversed' | translate }}
          </button>
        </div>

        <button class="btn-refresh" (click)="loadEntries()" [title]="'accounting.journal.ui.refresh' | translate">
          <i class="pi pi-refresh" [class.pi-spin]="loading()"></i>
        </button>
      </section>

      <!-- Entries Table -->
      <main class="table-container">
        <div *ngIf="loading()" class="loading-state">
          <i class="pi pi-spin pi-spinner text-emerald text-3xl"></i>
          <span>{{ 'accounting.journal.ui.loadingJournalEntries' | translate }}</span>
        </div>

        <div *ngIf="!loading() && !entries().length" class="empty-state">
          <div class="empty-icon">
            <i class="pi pi-folder-open"></i>
          </div>
          <h3>{{ 'accounting.journal.ui.noJournalEntriesFound' | translate }}</h3>
          <p>{{ 'accounting.journal.ui.startByCreatingYourFirst' | translate }}</p>
          <button class="btn-primary mt-3" (click)="openCreateModal()">
            <i class="pi pi-plus"></i>
            <span>{{ 'accounting.journal.ui.createEntry' | translate }}</span>
          </button>
        </div>

        <table *ngIf="!loading() && entries().length" class="entries-table">
          <thead>
            <tr>
              <th>{{ 'accounting.journal.ui.entryNo' | translate }}</th>
              <th>{{ 'accounting.journal.ui.date' | translate }}</th>
              <th>{{ 'accounting.journal.ui.period' | translate }}</th>
              <th class="col-desc-head">{{ 'accounting.journal.ui.description' | translate }}</th>
              <th>{{ 'accounting.journal.ui.reference' | translate }}</th>
              <th>{{ 'accounting.journal.ui.debit' | translate }}</th>
              <th>{{ 'accounting.journal.ui.credit' | translate }}</th>
              <th>{{ 'accounting.journal.ui.lines' | translate }}</th>
              <th>{{ 'accounting.journal.ui.status' | translate }}</th>
              <th>{{ 'accounting.journal.ui.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of entries()" [class.reversed-row]="item.status === 3">
              <td class="col-number">
                <span class="jv-pill" (click)="viewEntry(item)">{{ item.entryNumber }}</span>
              </td>
              <td>{{ item.entryDate | date:'yyyy-MM-dd' }}</td>
              <td>
                <span class="period-badge">{{ item.fiscalPeriodNameAr }}</span>
              </td>
              <td class="col-desc" [title]="item.descriptionAr">
                <strong>{{ langService.currentLang() === 'ar' ? item.descriptionAr : item.descriptionEn }}</strong>
              </td>
              <td>{{ item.referenceNumber || '—' }}</td>
              <td class="col-amount debit">{{ item.totalDebit | number:'1.2-2' }}</td>
              <td class="col-amount credit">{{ item.totalCredit | number:'1.2-2' }}</td>
              <td class="col-lines">
                <span class="line-pill">{{ item.linesCount }}</span>
              </td>
              <td>
                <span class="status-badge" [ngClass]="getStatusBadgeClass(item.status)">
                  <i class="pi" [ngClass]="getStatusIcon(item.status)"></i>
                  {{ getStatusText(item.status) }}
                </span>
              </td>
              <td class="col-actions">
                <div class="action-buttons">
                  <!-- View Details -->
                  <button class="btn-icon view" (click)="viewEntry(item)" [title]="'accounting.journal.ui.viewDetails' | translate">
                    <i class="pi pi-eye"></i>
                  </button>

                  <!-- Attachments -->
                  <button class="btn-icon" style="color: #0284c7;" (click)="openAttachments(item.id, item.entryNumber)" [title]="'accounting.journal.ui.attachments' | translate">
                    <i class="pi pi-paperclip"></i>
                  </button>

                  <!-- Print Voucher PDF -->
                  <button class="btn-icon print" (click)="openPrintVoucher(item)" [title]="'accounting.journal.ui.printVoucherPdf' | translate">
                    <i class="pi pi-print"></i>
                  </button>

                  <!-- Post Draft Entry -->
                  <button 
                    *ngIf="item.status === 1" 
                    class="btn-icon post" 
                    (click)="postEntry(item)" 
                    [title]="'accounting.journal.ui.postEntry' | translate">
                    <i class="pi pi-check"></i>
                  </button>

                  <!-- Reverse Posted Entry -->
                  <button 
                    *ngIf="item.status === 2" 
                    class="btn-icon reverse" 
                    (click)="reverseEntry(item)" 
                    [title]="'accounting.journal.ui.reverseEntry' | translate">
                    <i class="pi pi-undo"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Table Pagination Bar -->
        <app-pagination
          *ngIf="!loading() && entries().length > 0"
          [totalItems]="totalEntriesCount()"
          [pageSize]="pageSize()"
          [currentPage]="currentPage()"
          [pageSizeOptions]="[5, 10, 20, 50, 100]"
          [itemLabelAr]="('ui.journalEntries.d4d0ec' | translate)"
          [itemLabelEn]="'journal entries'"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </main>
      </ng-container>

      <!-- Recurring Entries View -->
      <ng-container *ngIf="activeViewTab === 'recurring'">
        <section class="recurring-header-strip">
          <div class="rec-intro">
            <h3>{{ 'accounting.journal.ui.recurringJournalEntrySchedules' | translate }}</h3>
            <p>{{ 'accounting.journal.ui.manageRecurringEntriesAndGenerate' | translate }}</p>
          </div>
          <button class="btn-primary" (click)="openCreateRecurringModal()">
            <i class="pi pi-plus"></i>
            <span>{{ 'accounting.journal.ui.newRecurringSchedule' | translate }}</span>
          </button>
        </section>

        <main class="table-container">
          <div *ngIf="loadingRecurring()" class="loading-state">
            <i class="pi pi-spin pi-spinner text-emerald text-3xl"></i>
            <span>{{ 'accounting.journal.ui.loadingRecurringSchedules' | translate }}</span>
          </div>

          <div *ngIf="!loadingRecurring() && !recurringEntries().length" class="empty-state">
            <div class="empty-icon"><i class="pi pi-sync"></i></div>
            <h3>{{ 'accounting.journal.ui.noRecurringTemplatesYet' | translate }}</h3>
            <p>{{ 'accounting.journal.ui.createRecurringTemplatesToGenerate' | translate }}</p>
            <button class="btn-primary mt-3" (click)="openCreateRecurringModal()">
              <i class="pi pi-plus"></i>
              <span>{{ 'accounting.journal.ui.createSchedule' | translate }}</span>
            </button>
          </div>

          <table *ngIf="!loadingRecurring() && recurringEntries().length" class="entries-table">
            <thead>
              <tr>
                <th>{{ 'accounting.journal.ui.templateTitle' | translate }}</th>
                <th>{{ 'accounting.journal.ui.frequency' | translate }}</th>
                <th>{{ 'accounting.journal.ui.startDate' | translate }}</th>
                <th>{{ 'accounting.journal.ui.nextRun' | translate }}</th>
                <th>{{ 'accounting.journal.ui.executions' | translate }}</th>
                <th>{{ 'accounting.journal.ui.totalSar' | translate }}</th>
                <th>{{ 'accounting.journal.ui.lines' | translate }}</th>
                <th>{{ 'accounting.journal.ui.status' | translate }}</th>
                <th>{{ 'accounting.journal.ui.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rec of paginatedRecurringEntries()">
                <td class="col-desc">
                  <strong>{{ rec.title }}</strong>
                  <div class="text-xs text-muted">{{ rec.descriptionAr }}</div>
                </td>
                <td>
                  <span class="period-badge">{{ rec.frequencyNameAr }}</span>
                </td>
                <td>{{ rec.startDate | date:'yyyy-MM-dd' }}</td>
                <td><strong class="text-emerald">{{ rec.nextRunDate | date:'yyyy-MM-dd' }}</strong></td>
                <td><span class="line-pill">{{ rec.executionCount }}</span></td>
                <td class="col-amount debit">{{ rec.totalDebit | number:'1.2-2' }}</td>
                <td><span class="line-pill">{{ rec.lines?.length || 0 }}</span></td>
                <td>
                  <span class="status-badge" [class.posted]="rec.isActive" [class.draft]="!rec.isActive">
                    {{ rec.isActive ? ('accounting.journal.ui.active' | translate) : ('accounting.journal.ui.inactive' | translate) }}
                  </span>
                </td>
                <td class="col-actions">
                  <div class="action-buttons">
                    <button class="btn-icon post" style="background: rgba(16, 185, 129, 0.15); color: #059669; width: auto; padding: 0.35rem 0.75rem; border-radius: 6px; font-weight: bold; gap: 4px; display: inline-flex; align-items: center;" (click)="executeRecurringEntry(rec)" [title]="'accounting.journal.ui.executeNow' | translate">
                      <i class="pi pi-bolt"></i>
                      <span>{{ 'accounting.journal.ui.executeNow1' | translate }}</span>
                    </button>
                    <button class="btn-icon" style="color: #0284c7;" (click)="openAttachments(rec.id, rec.title)" [title]="'accounting.journal.ui.attachments1' | translate">
                      <i class="pi pi-paperclip"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Recurring Table Pagination Bar -->
          <app-pagination
            *ngIf="!loadingRecurring() && recurringEntries().length > 0"
            [totalItems]="recurringEntries().length"
            [pageSize]="recurringPageSize()"
            [currentPage]="currentRecurringPage()"
            [pageSizeOptions]="[5, 10, 20, 50]"
            [itemLabelAr]="('ui.journalEntries.ed6006' | translate)"
            [itemLabelEn]="'schedules'"
            (pageChange)="currentRecurringPage.set($event)"
            (pageSizeChange)="recurringPageSize.set($event)">
          </app-pagination>
        </main>
      </ng-container>

      <!-- Create Recurring Entry Modal (Upgraded to Project ERP Identity) -->
      <div class="modal-backdrop" *ngIf="showCreateRecurringModal()" (click)="closeCreateRecurringModal()">
        <div class="modal-card recurring-modal" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="modal-title-box">
              <div class="modal-icon-badge">
                <i class="pi pi-sync"></i>
              </div>
              <div>
                <h3>{{ 'accounting.journal.ui.newRecurringEntrySchedule' | translate }}</h3>
                <p class="modal-subtitle">{{ 'accounting.journal.ui.scheduleAutomatedRecurringJournalEntries' | translate }}</p>
              </div>
            </div>
            <button class="btn-close" (click)="closeCreateRecurringModal()"><i class="pi pi-times"></i></button>
          </header>

          <section class="modal-body">
            <!-- Header Inputs Grid matching Project ERP standards -->
            <div class="form-header-grid">
              <div class="form-field col-span-2">
                <label class="required">{{ 'accounting.journal.ui.templateTitlePurpose' | translate }}</label>
                <input 
                  type="text" 
                  class="form-input font-bold" 
                  [(ngModel)]="newRecurringModel.title" 
                  [placeholder]="'accounting.journal.ui.egMonthlyHeadquartersRentAccrual' | translate" 
                  required />
              </div>

              <div class="form-field">
                <label class="required">{{ 'accounting.journal.ui.frequency' | translate }}</label>
                <select class="form-select font-bold" [(ngModel)]="newRecurringModel.frequency">
                  <option [value]="1">{{ 'accounting.journal.ui.monthly' | translate }}</option>
                  <option [value]="2">{{ 'accounting.journal.ui.quarterly' | translate }}</option>
                  <option [value]="3">{{ 'accounting.journal.ui.semiannually' | translate }}</option>
                  <option [value]="4">{{ 'accounting.journal.ui.annually' | translate }}</option>
                  <option [value]="5">{{ 'accounting.journal.ui.weekly' | translate }}</option>
                </select>
              </div>

              <div class="form-field">
                <label class="required">{{ 'accounting.journal.ui.startDate1' | translate }}</label>
                <input type="date" class="form-input font-mono" [(ngModel)]="newRecurringModel.startDate" required />
              </div>

              <div class="form-field">
                <label>{{ 'accounting.journal.ui.endDateOptional' | translate }}</label>
                <input type="date" class="form-input font-mono" [(ngModel)]="newRecurringModel.endDate" [placeholder]="'ui.journalEntries.6d06fe' | translate" />
              </div>

              <div class="form-field">
                <label>{{ 'accounting.journal.ui.englishDescription' | translate }}</label>
                <input 
                  type="text" 
                  class="form-input font-latin" 
                  [(ngModel)]="newRecurringModel.descriptionEn" 
                  placeholder="e.g. Monthly rent expense accrual" />
              </div>

              <div class="form-field col-span-3">
                <label class="required">{{ 'accounting.journal.ui.arabicAccountingDescription' | translate }}</label>
                <input 
                  type="text" 
                  class="form-input" 
                  [(ngModel)]="newRecurringModel.descriptionAr" 
                  [placeholder]="'accounting.journal.ui.arabicAccountingDescription1' | translate" 
                  required />
              </div>
            </div>

            <!-- Lines Section -->
            <div class="lines-section">
              <div class="lines-header">
                <div class="lines-title-cluster">
                  <i class="pi pi-list text-emerald"></i>
                  <h4>{{ 'accounting.journal.ui.recurringAccountingLines' | translate }}</h4>
                  <span class="lines-counter-badge">{{ recurringEditLines.length }} {{ 'ui.journalEntries.78fa68' | translate }}</span>
                </div>
                <button type="button" class="btn-add-line" (click)="addRecurringLine()">
                  <i class="pi pi-plus"></i>
                  <span>{{ 'accounting.journal.ui.addLine' | translate }}</span>
                </button>
              </div>

              <div class="lines-table-wrapper">
                <table class="lines-table">
                  <thead>
                    <tr>
                      <th style="width: 42px;" class="text-center">#</th>
                      <th style="width: 30%;">{{ 'accounting.journal.ui.account' | translate }}</th>
                      <th style="width: 22%;">{{ 'accounting.journal.ui.costCenter' | translate }}</th>
                      <th>{{ 'accounting.journal.ui.lineDescription' | translate }}</th>
                      <th style="width: 140px;" class="text-end">{{ 'accounting.journal.ui.debit1' | translate }}</th>
                      <th style="width: 140px;" class="text-end">{{ 'accounting.journal.ui.credit1' | translate }}</th>
                      <th style="width: 44px;" class="text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let line of recurringEditLines; let idx = index">
                      <td class="line-index text-center">{{ idx + 1 }}</td>
                      <td>
                        <select class="line-select" [(ngModel)]="line.accountId" (ngModelChange)="triggerLinesUpdate()">
                          <option value="" disabled>{{ 'accounting.journal.ui.selectAccount' | translate }}</option>
                          <option *ngFor="let acc of postableAccounts" [value]="acc.id">
                            {{ acc.accountCode }} - {{ langService.currentLang() === 'ar' ? acc.nameAr : acc.nameEn }}
                          </option>
                        </select>
                      </td>
                      <td>
                        <select class="line-select" [(ngModel)]="line.costCenterId">
                          <option [ngValue]="undefined">{{ 'accounting.journal.ui.none' | translate }}</option>
                          <option *ngFor="let cc of costCenters" [value]="cc.id">
                            {{ cc.code }} - {{ langService.currentLang() === 'ar' ? cc.nameAr : cc.nameEn }}
                          </option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          class="line-input" 
                          [(ngModel)]="line.description" 
                          [placeholder]="newRecurringModel.descriptionAr || ('accounting.journal.ui.lineDescription1' | translate)" />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          class="line-input text-end font-mono" 
                          [(ngModel)]="line.debit" 
                          (ngModelChange)="onRecurringDebitChange(line)" 
                          (input)="onRecurringDebitChange(line)" 
                          placeholder="0.00" />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          class="line-input text-end font-mono" 
                          [(ngModel)]="line.credit" 
                          (ngModelChange)="onRecurringCreditChange(line)" 
                          (input)="onRecurringCreditChange(line)" 
                          placeholder="0.00" />
                      </td>
                      <td class="text-center">
                        <button 
                          type="button" 
                          class="btn-remove-line" 
                          (click)="removeRecurringLine(idx)" 
                          [disabled]="recurringEditLines.length <= 2" 
                          [title]="'accounting.journal.ui.removeLine' | translate">
                          <i class="pi pi-times"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Luxury Live Balance Bar (Aligned with Al-Roban Brand Standards) -->
              <div class="balance-summary-bar mt-3" [class.balanced]="isRecurringBalanced()" [class.unbalanced]="!isRecurringBalanced()">
                <div class="balance-stats">
                  <div class="stat-item">
                    <span>{{ 'accounting.journal.ui.totalDebit' | translate }}</span>
                    <strong class="font-mono text-emerald">{{ totalRecurringDebit() | number:'1.2-2' }} SAR</strong>
                  </div>
                  <div class="stat-divider"></div>
                  <div class="stat-item">
                    <span>{{ 'accounting.journal.ui.totalCredit' | translate }}</span>
                    <strong class="font-mono text-indigo">{{ totalRecurringCredit() | number:'1.2-2' }} SAR</strong>
                  </div>
                  <div class="stat-divider"></div>
                  <div class="stat-item">
                    <span>{{ 'accounting.journal.ui.difference' | translate }}</span>
                    <strong class="font-mono" [class.text-danger]="!isRecurringBalanced()">{{ recurringDifference() | number:'1.2-2' }} SAR</strong>
                  </div>
                </div>

                <div class="balance-badge">
                  <i class="pi" [ngClass]="isRecurringBalanced() ? 'pi-check-circle' : 'pi-exclamation-triangle'"></i>
                  <span>{{ isRecurringBalanced() 
                    ? ('accounting.journal.ui.balancedReadyToSchedule' | translate) 
                    : ('accounting.journal.ui.unbalancedEntry' | translate) }}</span>
                </div>
              </div>
            </div>
          </section>

          <footer class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeCreateRecurringModal()">
              {{ 'accounting.journal.ui.cancel' | translate }}
            </button>
            <div class="footer-actions">
              <button 
                type="button" 
                class="btn-post-now" 
                [disabled]="!isRecurringBalanced() || savingRecurring()" 
                (click)="saveRecurringEntry()">
                <i class="pi pi-check" *ngIf="!savingRecurring()"></i>
                <i class="pi pi-spin pi-spinner" *ngIf="savingRecurring()"></i>
                <span>{{ 'accounting.journal.ui.saveSchedule' | translate }}</span>
              </button>
            </div>
          </footer>
        </div>
      </div>

      <!-- Create / Edit Journal Entry Modal -->
      <div class="modal-backdrop" *ngIf="showCreateModal()" (click)="closeCreateModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="modal-title-box">
              <i class="pi pi-book text-emerald"></i>
              <h3>{{ 'accounting.journal.ui.createJournalEntry' | translate }}</h3>
            </div>
            <button class="btn-close" (click)="closeCreateModal()"><i class="pi pi-times"></i></button>
          </header>

          <div class="modal-body">
            <!-- Header Inputs Grid -->
            <div class="form-header-grid">
              <div class="form-field">
                <label>{{ 'accounting.journal.ui.entryDate' | translate }}</label>
                <input type="date" class="form-input" [(ngModel)]="newEntryModel.entryDate" />
              </div>

              <div class="form-field">
                <label>{{ 'accounting.journal.ui.entryType' | translate }}</label>
                <select class="form-select" [(ngModel)]="newEntryModel.entryType">
                  <option [value]="1">{{ 'accounting.journal.ui.daily' | translate }}</option>
                  <option [value]="2">{{ 'accounting.journal.ui.opening' | translate }}</option>
                  <option [value]="3">{{ 'accounting.journal.ui.adjustment' | translate }}</option>
                  <option [value]="4">{{ 'accounting.journal.ui.closing' | translate }}</option>
                </select>
              </div>

              <div class="form-field">
                <label>{{ 'accounting.journal.ui.referenceNo' | translate }}</label>
                <input type="text" class="form-input" [(ngModel)]="newEntryModel.referenceNumber" placeholder="REF-001" />
              </div>

              <div class="form-field col-span-2">
                <label>{{ 'accounting.journal.ui.generalDescriptionAr' | translate }}</label>
                <input type="text" class="form-input" [(ngModel)]="newEntryModel.descriptionAr" [placeholder]="'ui.journalEntries.078897' | translate" />
              </div>

              <div class="form-field">
                <label>{{ 'accounting.journal.ui.descriptionEn' | translate }}</label>
                <input type="text" class="form-input" [(ngModel)]="newEntryModel.descriptionEn" placeholder="e.g. October Rent Payment" />
              </div>
            </div>

            <!-- Lines Section -->
            <div class="lines-section">
              <div class="lines-header">
                <h4>{{ 'accounting.journal.ui.journalEntryLines' | translate }}</h4>
                <button type="button" class="btn-add-line" (click)="addLine()">
                  <i class="pi pi-plus"></i>
                  <span>{{ 'accounting.journal.ui.addLine' | translate }}</span>
                </button>
              </div>

              <div class="lines-table-wrapper">
                <table class="lines-table">
                  <thead>
                    <tr>
                      <th style="width: 40px;">#</th>
                      <th style="width: 32%;">{{ 'accounting.journal.ui.account1' | translate }}</th>
                      <th style="width: 22%;">{{ 'accounting.journal.ui.costCenter' | translate }}</th>
                      <th>{{ 'accounting.journal.ui.lineDescription' | translate }}</th>
                      <th style="width: 14%;">{{ 'accounting.journal.ui.debit1' | translate }}</th>
                      <th style="width: 14%;">{{ 'accounting.journal.ui.credit1' | translate }}</th>
                      <th style="width: 38px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let line of editLines; let i = index">
                      <td class="line-index">{{ i + 1 }}</td>
                      <td>
                        <select class="line-select" [(ngModel)]="line.accountId">
                          <option value="">{{ 'accounting.journal.ui.selectAccount1' | translate }}</option>
                          <option *ngFor="let acc of postableAccounts" [value]="acc.id">
                            {{ acc.accountCode }} - {{ langService.currentLang() === 'ar' ? acc.nameAr : acc.nameEn }}
                          </option>
                        </select>
                      </td>
                      <td>
                        <select class="line-select" [(ngModel)]="line.costCenterId">
                          <option [ngValue]="undefined">{{ 'accounting.journal.ui.none' | translate }}</option>
                          <option *ngFor="let cc of costCenters" [value]="cc.id">
                            {{ cc.code }} - {{ langService.currentLang() === 'ar' ? cc.nameAr : cc.nameEn }}
                          </option>
                        </select>
                      </td>
                      <td>
                        <input type="text" class="line-input" [(ngModel)]="line.description" [placeholder]="'accounting.journal.ui.description1' | translate" />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          class="line-input text-end font-mono" 
                          [(ngModel)]="line.debit" 
                          (ngModelChange)="onDebitChange(line)"
                          (input)="onDebitChange(line)"
                          min="0" 
                          step="0.01" 
                          placeholder="0.00" 
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          class="line-input text-end font-mono" 
                          [(ngModel)]="line.credit" 
                          (ngModelChange)="onCreditChange(line)"
                          (input)="onCreditChange(line)"
                          min="0" 
                          step="0.01" 
                          placeholder="0.00" 
                        />
                      </td>
                      <td>
                        <button type="button" class="btn-remove-line" (click)="removeLine(i)" [disabled]="editLines.length <= 2">
                          <i class="pi pi-times"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Live Balance Bar -->
              <div class="balance-summary-bar" [class.balanced]="isBalanced()" [class.unbalanced]="!isBalanced()">
                <div class="balance-stats">
                  <div class="stat-item">
                    <span>{{ 'accounting.journal.ui.totalDebit' | translate }}</span>
                    <strong class="font-mono">{{ totalDebit() | number:'1.2-2' }} SAR</strong>
                  </div>
                  <div class="stat-divider"></div>
                  <div class="stat-item">
                    <span>{{ 'accounting.journal.ui.totalCredit' | translate }}</span>
                    <strong class="font-mono">{{ totalCredit() | number:'1.2-2' }} SAR</strong>
                  </div>
                  <div class="stat-divider"></div>
                  <div class="stat-item">
                    <span>{{ 'accounting.journal.ui.difference' | translate }}</span>
                    <strong class="font-mono" [class.text-danger]="!isBalanced()">{{ balanceDifference() | number:'1.2-2' }} SAR</strong>
                  </div>
                </div>

                <div class="balance-badge">
                  <i class="pi" [ngClass]="isBalanced() ? 'pi-check-circle' : 'pi-exclamation-triangle'"></i>
                  <span>{{ isBalanced() 
                    ? ('accounting.journal.ui.balancedReady' | translate) 
                    : ('accounting.journal.ui.unbalanced' | translate) }}</span>
                </div>
              </div>
            </div>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeCreateModal()">
              {{ 'accounting.journal.ui.cancel' | translate }}
            </button>

            <div class="footer-actions">
              <button 
                type="button" 
                class="btn-save-draft" 
                (click)="saveEntry(false)" 
                [disabled]="submitting()">
                <i class="pi pi-save"></i>
                <span>{{ 'accounting.journal.ui.saveDraft' | translate }}</span>
              </button>

              <button 
                type="button" 
                class="btn-post-now" 
                (click)="saveEntry(true)" 
                [disabled]="!isBalanced() || submitting()">
                <i class="pi pi-check" *ngIf="!submitting()"></i>
                <i class="pi pi-spin pi-spinner" *ngIf="submitting()"></i>
                <span>{{ 'accounting.journal.ui.postEntry1' | translate }}</span>
              </button>
            </div>
          </footer>
        </div>
      </div>

      <!-- View Entry Details Modal -->
      <div class="modal-backdrop" *ngIf="viewingEntry()" (click)="viewingEntry.set(null)">
        <div class="modal-card view-modal" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="modal-title-box">
              <span class="jv-pill-large">{{ viewingEntry()?.entryNumber }}</span>
              <span class="status-badge" [ngClass]="getStatusBadgeClass(viewingEntry()!.status)">
                {{ getStatusText(viewingEntry()!.status) }}
              </span>
            </div>
            <button class="btn-close" (click)="viewingEntry.set(null)"><i class="pi pi-times"></i></button>
          </header>

          <div class="modal-body" *ngIf="viewingEntry()">
            <div class="view-meta-grid">
              <div>
                <span class="meta-label">{{ 'accounting.journal.ui.date1' | translate }}</span>
                <strong>{{ viewingEntry()?.entryDate | date:'yyyy-MM-dd' }}</strong>
              </div>
              <div>
                <span class="meta-label">{{ 'accounting.journal.ui.period1' | translate }}</span>
                <strong>{{ viewingEntry()?.fiscalPeriodNameAr }}</strong>
              </div>
              <div>
                <span class="meta-label">{{ 'accounting.journal.ui.reference1' | translate }}</span>
                <strong>{{ viewingEntry()?.referenceNumber || '—' }}</strong>
              </div>
              <div>
                <span class="meta-label">{{ 'accounting.journal.ui.createdBy' | translate }}</span>
                <strong>{{ viewingEntry()?.createdBy || ('ui.journalEntries.1a543a' | translate) }}</strong>
              </div>
              <div class="col-span-full general-desc-box">
                <span class="meta-label">{{ 'accounting.journal.ui.generalDescription' | translate }}</span>
                <strong class="desc-text">{{ langService.currentLang() === 'ar' ? viewingEntry()?.descriptionAr : viewingEntry()?.descriptionEn }}</strong>
              </div>
            </div>

            <!-- View Lines Table -->
            <table class="view-lines-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ 'accounting.journal.ui.code' | translate }}</th>
                  <th>{{ 'accounting.journal.ui.account2' | translate }}</th>
                  <th>{{ 'accounting.journal.ui.costCenter' | translate }}</th>
                  <th>{{ 'accounting.journal.ui.description1' | translate }}</th>
                  <th class="text-end">{{ 'accounting.journal.ui.debit2' | translate }}</th>
                  <th class="text-end">{{ 'accounting.journal.ui.credit2' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of viewingEntry()?.lines">
                  <td>{{ l.lineNumber }}</td>
                  <td class="font-mono text-emerald"><strong>{{ l.accountCode }}</strong></td>
                  <td><strong>{{ langService.currentLang() === 'ar' ? l.accountNameAr : l.accountNameEn }}</strong></td>
                  <td>{{ l.costCenterName || '—' }}</td>
                  <td>{{ l.description }}</td>
                  <td class="text-end font-mono" [class.text-emerald]="l.debit > 0">{{ l.debit ? (l.debit | number:'1.2-2') : '—' }}</td>
                  <td class="text-end font-mono" [class.text-cyan]="l.credit > 0">{{ l.credit ? (l.credit | number:'1.2-2') : '—' }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="totals-row">
                  <td colspan="5" class="text-end font-bold">{{ 'accounting.journal.ui.balancedTotal' | translate }}</td>
                  <td class="text-end font-mono font-bold">{{ viewingEntry()?.totalDebit | number:'1.2-2' }}</td>
                  <td class="text-end font-mono font-bold">{{ viewingEntry()?.totalCredit | number:'1.2-2' }}</td>
                </tr>
              </tfoot>
            </table>

            <!-- Reversal reason note if reversed -->
            <div *ngIf="viewingEntry()?.status === 3" class="reversal-alert">
              <i class="pi pi-info-circle"></i>
              <div>
                <strong>{{ 'accounting.journal.ui.thisEntryWasReversed' | translate }}</strong>
                <span>{{ viewingEntry()?.reversalReason }}</span>
              </div>
            </div>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn-secondary" (click)="viewingEntry.set(null)">
              {{ 'accounting.journal.ui.close' | translate }}
            </button>

            <!-- Print Voucher PDF Button -->
            <button type="button" class="btn-print-action" (click)="openPrintVoucher(viewingEntry()!)">
              <i class="pi pi-print"></i>
              <span>{{ 'accounting.journal.ui.printVoucherPdf' | translate }}</span>
            </button>

            <button 
              *ngIf="viewingEntry()?.status === 2" 
              type="button" 
              class="btn-danger" 
              (click)="reverseEntry(viewingEntry()!)">
              <i class="pi pi-undo"></i>
              <span>{{ 'accounting.journal.ui.reverseEntry1' | translate }}</span>
            </button>
          </footer>
        </div>
      </div>

      <!-- Official A4 Journal Voucher Print & PDF Preview Modal -->
      <div class="modal-backdrop print-modal-backdrop" *ngIf="printingEntry()" (click)="closePrintVoucher()">
        <div class="print-preview-dialog" (click)="$event.stopPropagation()">
          
          <!-- Sticky Top Control Toolbar (Hidden in Print) -->
          <div class="print-toolbar no-print">
            <div class="toolbar-left">
              <div class="toolbar-badge">
                <i class="pi pi-print"></i>
              </div>
              <div class="toolbar-titles">
                <strong>{{ 'accounting.journal.ui.officialJournalVoucherPreviewPrint' | translate }}</strong>
                <div class="toolbar-sub-line">
                  <span class="jv-tag">{{ printingEntry()?.entryNumber }}</span>
                  <span class="pages-badge">
                    <i class="pi pi-file"></i>
                    <span>{{ langService.currentLang() === 'ar' ? (('ui.journalEntries.d65a34' | translate) + getEstimatedPages() + ('accounting.journal.ui.page' | translate)) : ('Estimated Pages: ' + getEstimatedPages()) }}</span>
                  </span>
                </div>
              </div>
            </div>

            <div class="toolbar-actions">
              <button type="button" class="btn-print-main" (click)="printCurrentVoucher()">
                <i class="pi pi-print"></i>
                <span>{{ 'accounting.journal.ui.printSaveAsPdf' | translate }}</span>
              </button>

              <button type="button" class="btn-toolbar-close" (click)="closePrintVoucher()">
                <i class="pi pi-times"></i>
                <span>{{ 'accounting.journal.ui.close' | translate }}</span>
              </button>
            </div>
          </div>

          <!-- Printable A4 Paper Container -->
          <div class="print-paper-container">
            <article class="official-voucher-sheet" id="printable-journal-voucher">
              
              <!-- 1. Official Corporate Header Strip -->
              <header class="voucher-header">
                <!-- Right: Company Info & Logo -->
                <div class="header-org-info">
                  <div class="org-brand-row">
                    <ng-container *ngIf="companyContext.activeCompany().logoUrl; else defaultVoucherLogo">
                      <img [src]="companyContext.activeCompany().logoUrl" alt="Logo" class="voucher-company-logo" />
                    </ng-container>
                    <ng-template #defaultVoucherLogo>
                      <div class="voucher-ship-emblem">
                        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                        </svg>
                      </div>
                    </ng-template>
                    <div class="org-names">
                      <h2 class="org-ar">{{ companyContext.activeCompany().nameAr || ('ui.vouchers.eae355' | translate) }}</h2>
                      <span class="org-en">{{ companyContext.activeCompany().nameEn || 'Al-Roban Smart Solutions Co.' }}</span>
                    </div>
                  </div>
                  <div class="org-meta-line">
                    <span>{{ 'accounting.journal.ui.vatNo' | translate }} <strong class="font-mono">{{ companyContext.activeCompany().vatNumber || '310123456700003' }}</strong></span>
                    <span class="dot">&bull;</span>
                    <span>{{ 'accounting.journal.ui.cr' | translate }} <strong class="font-mono">{{ companyContext.activeCompany().commercialRegistration || '1010789456' }}</strong></span>
                  </div>
                </div>

                <!-- Center: Voucher Title & Brand Emblem -->
                <div class="header-center-title">
                  <div class="brand-emblem-box">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="40" height="40" rx="10" fill="#047857"/>
                      <path d="M20 7L29 14V26L20 33L11 26V14L20 7Z" stroke="#34D399" stroke-width="2.5" stroke-linejoin="round"/>
                      <path d="M20 12L25 16V24L20 28L15 24V16L20 12Z" fill="#10B981"/>
                      <circle cx="20" cy="20" r="3" fill="#FFFFFF"/>
                    </svg>
                  </div>
                  <h1 class="voucher-title-main">
                    {{ 'accounting.journal.ui.generalJournalVoucher' | translate }}
                  </h1>
                  <span class="voucher-title-sub">{{ 'ui.journalEntries.ac5cc3' | translate }}</span>
                </div>

                <!-- Left: Verification QR & System Seal -->
                <div class="header-left-seal">
                  <div class="qr-box">
                    <svg class="qr-svg" width="65" height="65" viewBox="0 0 100 100">
                      <rect width="100" height="100" fill="#ffffff" />
                      <rect x="5" y="5" width="28" height="28" fill="#047857" rx="3" />
                      <rect x="10" y="10" width="18" height="18" fill="#ffffff" rx="2" />
                      <rect x="14" y="14" width="10" height="10" fill="#047857" rx="1.5" />
                      <rect x="67" y="5" width="28" height="28" fill="#047857" rx="3" />
                      <rect x="72" y="10" width="18" height="18" fill="#ffffff" rx="2" />
                      <rect x="76" y="14" width="10" height="10" fill="#047857" rx="1.5" />
                      <rect x="5" y="67" width="28" height="28" fill="#047857" rx="3" />
                      <rect x="10" y="72" width="18" height="18" fill="#ffffff" rx="2" />
                      <rect x="14" y="76" width="10" height="10" fill="#047857" rx="1.5" />
                      <rect x="38" y="10" width="6" height="6" fill="#0f172a" />
                      <rect x="48" y="10" width="6" height="6" fill="#0f172a" />
                      <rect x="58" y="14" width="6" height="6" fill="#0f172a" />
                      <rect x="38" y="22" width="6" height="6" fill="#0f172a" />
                      <rect x="50" y="22" width="6" height="6" fill="#0f172a" />
                      <rect x="10" y="38" width="6" height="6" fill="#0f172a" />
                      <rect x="22" y="38" width="6" height="6" fill="#0f172a" />
                      <rect x="38" y="38" width="8" height="8" fill="#047857" />
                      <rect x="50" y="38" width="6" height="6" fill="#0f172a" />
                      <rect x="62" y="38" width="6" height="6" fill="#0f172a" />
                      <rect x="74" y="38" width="6" height="6" fill="#0f172a" />
                      <rect x="86" y="38" width="6" height="6" fill="#0f172a" />
                      <rect x="38" y="50" width="6" height="6" fill="#0f172a" />
                      <rect x="50" y="50" width="8" height="8" fill="#047857" />
                      <rect x="66" y="50" width="6" height="6" fill="#0f172a" />
                      <rect x="78" y="50" width="6" height="6" fill="#0f172a" />
                      <rect x="10" y="54" width="6" height="6" fill="#0f172a" />
                      <rect x="26" y="54" width="6" height="6" fill="#0f172a" />
                      <rect x="38" y="66" width="6" height="6" fill="#0f172a" />
                      <rect x="54" y="66" width="6" height="6" fill="#0f172a" />
                      <rect x="66" y="66" width="6" height="6" fill="#0f172a" />
                      <rect x="78" y="66" width="6" height="6" fill="#0f172a" />
                      <rect x="38" y="78" width="6" height="6" fill="#0f172a" />
                      <rect x="48" y="78" width="6" height="6" fill="#0f172a" />
                      <rect x="60" y="78" width="6" height="6" fill="#0f172a" />
                      <rect x="72" y="78" width="6" height="6" fill="#0f172a" />
                      <rect x="84" y="78" width="6" height="6" fill="#0f172a" />
                      <rect x="42" y="88" width="6" height="6" fill="#0f172a" />
                      <rect x="66" y="88" width="6" height="6" fill="#0f172a" />
                      <rect x="80" y="88" width="6" height="6" fill="#0f172a" />
                    </svg>
                    <span class="qr-text">{{ 'ui.journalEntries.a25961' | translate }}</span>
                  </div>
                </div>
              </header>

              <!-- 2. Meta Information Grid (Ultra Compact) -->
              <section class="voucher-meta-section">
                <div class="meta-item jv-number-box">
                  <span class="lbl">{{ 'accounting.journal.ui.voucherNo' | translate }}</span>
                  <strong class="val font-mono text-emerald">{{ printingEntry()?.entryNumber }}</strong>
                </div>

                <div class="meta-item">
                  <span class="lbl">{{ 'accounting.journal.ui.date1' | translate }}</span>
                  <strong class="val font-mono">{{ printingEntry()?.entryDate | date:'yyyy-MM-dd' }}</strong>
                </div>

                <div class="meta-item">
                  <span class="lbl">{{ 'accounting.journal.ui.period1' | translate }}</span>
                  <strong class="val">{{ printingEntry()?.fiscalPeriodNameAr }}</strong>
                </div>

                <div class="meta-item">
                  <span class="lbl">{{ 'accounting.journal.ui.refNo' | translate }}</span>
                  <strong class="val font-mono">{{ printingEntry()?.referenceNumber || '—' }}</strong>
                </div>

                <div class="meta-item">
                  <span class="lbl">{{ 'accounting.journal.ui.category' | translate }}</span>
                  <strong class="val">{{ getEntryTypeText(printingEntry()?.entryType) }}</strong>
                </div>

                <div class="meta-item status-meta">
                  <span class="lbl">{{ 'accounting.journal.ui.status1' | translate }}</span>
                  <span class="status-stamp-inline" [class.posted]="printingEntry()?.status === 2" [class.draft]="printingEntry()?.status === 1" [class.reversed]="printingEntry()?.status === 3">
                    <i class="pi" [ngClass]="printingEntry()?.status === 2 ? 'pi-verified' : (printingEntry()?.status === 3 ? 'pi-ban' : 'pi-file-edit')"></i>
                    {{ getStatusText(printingEntry()!.status) }}
                  </span>
                </div>
              </section>

              <!-- 3. General Narration Banner (Ultra Compact) -->
              <section class="voucher-narration-section">
                <div class="narration-inline">
                  <span class="narration-lbl">
                    <i class="pi pi-align-right text-emerald"></i>
                    {{ 'accounting.journal.ui.generalNarration' | translate }}
                  </span>
                  <strong class="narration-val">{{ printingEntry()?.descriptionAr }}</strong>
                  <span class="narration-en-sub font-mono" *ngIf="printingEntry()?.descriptionEn && printingEntry()?.descriptionEn !== printingEntry()?.descriptionAr">
                    ({{ printingEntry()?.descriptionEn }})
                  </span>
                </div>
              </section>

              <!-- 4. Double-Entry Accounting Table -->
              <section class="voucher-table-section">
                <table class="voucher-print-table">
                  <thead>
                    <tr>
                      <th class="th-num">#</th>
                      <th class="th-code">{{ 'accounting.journal.ui.accountCode' | translate }}</th>
                      <th class="th-name">{{ 'accounting.journal.ui.accountTitle' | translate }}</th>
                      <th class="th-cost-center">{{ 'accounting.journal.ui.costCenter' | translate }}</th>
                      <th class="th-desc">{{ 'accounting.journal.ui.lineNarration' | translate }}</th>
                      <th class="th-amount debit-head">{{ 'accounting.journal.ui.debitSar' | translate }}</th>
                      <th class="th-amount credit-head">{{ 'accounting.journal.ui.creditSar' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let l of printingEntry()?.lines; let lIdx = index" [class.row-alt]="lIdx % 2 === 1">
                      <td class="td-num">{{ l.lineNumber || (lIdx + 1) }}</td>
                      <td class="td-code font-mono text-emerald"><strong>{{ l.accountCode }}</strong></td>
                      <td class="td-name">
                        <strong class="item-name-text" [title]="langService.currentLang() === 'ar' ? l.accountNameAr : (l.accountNameEn || l.accountNameAr)">
                          {{ langService.currentLang() === 'ar' ? l.accountNameAr : (l.accountNameEn || l.accountNameAr) }}
                        </strong>
                      </td>
                      <td class="td-cost-center">{{ l.costCenterName || '—' }}</td>
                      <td class="td-desc">{{ l.description }}</td>
                      <td class="td-amount font-mono text-emerald" [class.font-bold]="l.debit > 0">
                        {{ l.debit > 0 ? (l.debit | number:'1.2-2') : '—' }}
                      </td>
                      <td class="td-amount font-mono text-cyan" [class.font-bold]="l.credit > 0">
                        {{ l.credit > 0 ? (l.credit | number:'1.2-2') : '—' }}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="totals-row">
                      <td colspan="5" class="total-title">
                        <i class="pi pi-check-circle text-emerald"></i>
                        <span>{{ 'accounting.journal.ui.balancedMovementTotal' | translate }}</span>
                      </td>
                      <td class="total-debit font-mono">
                        {{ printingEntry()?.totalDebit | number:'1.2-2' }}
                      </td>
                      <td class="total-credit font-mono">
                        {{ printingEntry()?.totalCredit | number:'1.2-2' }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </section>

              <!-- 5. Tafqeet (Amount in Words) -->
              <section class="voucher-tafqeet-section">
                <div class="tafqeet-card">
                  <div class="tafqeet-label">
                    <i class="pi pi-pencil text-emerald"></i>
                    <span>{{ 'accounting.journal.ui.amountInWords' | translate }}</span>
                  </div>
                  <div class="tafqeet-words">
                    <strong class="ar-words">{{ tafqeet.toArabicCurrency(printingEntry()?.totalDebit || 0) }}</strong>
                    <span class="en-words">({{ tafqeet.toEnglishCurrency(printingEntry()?.totalDebit || 0) }})</span>
                  </div>
                </div>
              </section>

              <!-- Reversal Alert if reversed -->
              <section *ngIf="printingEntry()?.status === 3" class="voucher-reversal-alert">
                <i class="pi pi-exclamation-triangle"></i>
                <div>
                  <strong>{{ 'ui.journalEntries.28bccb' | translate }}</strong> {{ 'ui.journalEntries.d97ff9' | translate }}
                  <span *ngIf="printingEntry()?.reversalReason">{{ 'ui.journalEntries.1055cd' | translate }} {{ printingEntry()?.reversalReason }}</span>
                </div>
              </section>

              <!-- 6. Official Approval & Signatures Matrix -->
              <section class="voucher-signatures-section">
                <div class="signature-box">
                  <span class="sig-header">{{ 'accounting.journal.ui.preparedBy' | translate }}</span>
                  <div class="sig-content">
                    <span class="person-name">{{ printingEntry()?.createdBy || ('ui.vouchers.19cb0c' | translate) }}</span>
                    <div class="sig-line">{{ 'ui.journalEntries.9067ee' | translate }}</div>
                    <span class="sig-date">{{ 'hr.payroll.date' | translate }} {{ (printingEntry()?.createdAtUtc || printingEntry()?.entryDate) | date:'yyyy-MM-dd' }}</span>
                  </div>
                </div>

                <div class="signature-box">
                  <span class="sig-header">{{ 'accounting.journal.ui.auditedBy' | translate }}</span>
                  <div class="sig-content">
                    <span class="person-name">{{ 'accounting.journal.ui.internalAuditDept' | translate }}</span>
                    <div class="sig-line">{{ 'ui.journalEntries.9067ee' | translate }}</div>
                    <span class="sig-date">{{ 'ui.journalEntries.108619' | translate }}</span>
                  </div>
                </div>

                <div class="signature-box approved">
                  <span class="sig-header">{{ 'accounting.journal.ui.approvedByCfo' | translate }}</span>
                  <div class="sig-content">
                    <span class="person-name">{{ 'accounting.journal.ui.chiefFinancialOfficer' | translate }}</span>
                    <div class="sig-line">{{ 'ui.journalEntries.0e591e' | translate }}</div>
                    <span class="sig-date">{{ 'hr.payroll.date' | translate }} {{ (printingEntry()?.postedAtUtc || printingEntry()?.entryDate) | date:'yyyy-MM-dd' }}</span>
                  </div>
                </div>
              </section>

              <!-- 7. Document Footer with Page Tracking -->
              <footer class="voucher-compliance-footer">
                <div class="compliance-left"></div>
                <div class="compliance-center">
                  <span class="page-number-box">
                    <i class="pi pi-file"></i>
                    <span>{{ 'accounting.journal.ui.page' | translate }}</span>
                    <span class="page-current font-mono">1</span>
                    <span class="page-sep">/</span>
                    <span class="page-total font-mono">{{ getEstimatedPages() }}</span>
                  </span>
                </div>
                <div class="compliance-right font-mono">
                  <span>{{ 'accounting.journal.ui.printDate' | translate }} {{ currentPrintDate | date:'yyyy-MM-dd HH:mm:ss' }}</span>
                </div>
              </footer>

            </article>
          </div>

        </div>
      </div>

      <!-- Document Attachments Modal -->
      <app-document-attachments-modal
        [isOpen]="showAttachmentsModal"
        entityType="JournalEntry"
        [entityId]="selectedAttachmentEntityId"
        [entityTitle]="selectedAttachmentTitle"
        (closed)="showAttachmentsModal = false">
      </app-document-attachments-modal>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
      padding: 0.75rem 1rem;
      background: #F8FAFC;
      min-height: calc(100vh - 60px);
    }

    button, input, select, span, strong, h1, h2, h3, h4 {
      font-family: var(--font-arabic) !important;
    }

    .font-mono {
      font-family: var(--font-latin) !important;
    }

    /* Compact Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.45rem;
      background: #FFFFFF;
      padding: 0.4rem 0.75rem;
      border-radius: 7px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .tabs-subnav {
      display: flex;
      gap: 0.35rem;
      margin-bottom: 0.45rem;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 0.35rem;
    }
    .subnav-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
      background: #FFFFFF;
      color: #64748B;
      font-size: 0.76rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .subnav-pill:hover {
      background: #F1F5F9;
      color: #0F172A;
    }
    .subnav-pill.active {
      background: #059669;
      border-color: #059669;
      color: #FFFFFF;
    }
    .subnav-pill .badge-count {
      background: rgba(0, 0, 0, 0.15);
      padding: 1px 5px;
      border-radius: 10px;
      font-size: 0.68rem;
    }
    .recurring-header-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      padding: 0.65rem 1rem;
      border-radius: 7px;
      border: 1px solid #E2E8F0;
      margin-bottom: 0.55rem;
    }
    .recurring-header-strip h3 {
      margin: 0 0 0.15rem 0;
      font-size: 0.95rem;
      color: #0F172A;
      font-weight: 700;
    }
    .recurring-header-strip p {
      margin: 0;
      font-size: 0.74rem;
      color: #64748B;
    }

    .header-titles {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badge-icon {
      width: 30px;
      height: 30px;
      border-radius: 7px;
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .page-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
    }

    .page-subtitle {
      font-size: 0.7rem;
      color: #64748B;
      margin: 0;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      height: 30px;
      padding: 0 0.75rem;
      border-radius: 6px;
      border: none;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(16, 185, 129, 0.22);
      transition: all 0.2s ease;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
    }

    /* Compact KPI Strip */
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.5rem;
      margin-bottom: 0.45rem;
    }

    .kpi-card {
      background: #FFFFFF;
      border-radius: 7px;
      border: 1px solid #E2E8F0;
      padding: 0.4rem 0.65rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .kpi-icon {
      width: 28px;
      height: 28px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .kpi-icon.total { background: #F1F5F9; color: #475569; }
    .kpi-icon.posted { background: #ECFDF5; color: #059669; }
    .kpi-icon.draft { background: #FFFBEB; color: #D97706; }
    .kpi-icon.volume { background: #F0F9FF; color: #0284C7; }

    .kpi-info {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.68rem;
      color: #64748B;
      font-weight: 600;
      margin-bottom: 0.03rem;
    }

    .kpi-val {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0F172A;
      font-family: var(--font-latin) !important;
    }

    .text-emerald { color: #059669; }
    .text-amber { color: #D97706; }
    .text-cyan { color: #0284C7; }
    .text-danger { color: #EF4444; }

    /* Compact Filter Bar */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 7px;
      padding: 0.35rem 0.65rem;
      margin-bottom: 0.45rem;
      gap: 0.5rem;
    }

    .search-box {
      position: relative;
      flex: 1;
      max-width: 300px;
      display: flex;
      align-items: center;
    }

    .search-box i {
      position: absolute;
      inset-inline-start: 0.65rem;
      color: #94A3B8;
      font-size: 0.75rem;
    }

    .search-box input {
      width: 100%;
      height: 28px;
      padding-inline-start: 1.85rem;
      padding-inline-end: 0.55rem;
      border: 1px solid #CBD5E1;
      border-radius: 5px;
      font-size: 0.76rem;
      color: #0F172A;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .search-box input:focus {
      border-color: #10B981;
    }

    .status-filters {
      display: flex;
      background: #F1F5F9;
      padding: 2px;
      border-radius: 5px;
      gap: 2px;
    }

    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.18rem 0.55rem;
      border: none;
      background: transparent;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-pill.active {
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }

    .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
    }

    .dot.posted { background: #10B981; }
    .dot.draft { background: #D97706; }
    .dot.reversed { background: #EF4444; }

    .btn-refresh {
      width: 28px;
      height: 28px;
      border-radius: 5px;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-refresh:hover {
      background: #F1F5F9;
    }

    /* Compact Table Container */
    .table-container {
      background: #FFFFFF;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      overflow-x: auto;
    }

    .entries-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .entries-table th {
      background: #F8FAFC;
      padding: 0.4rem 0.65rem;
      font-size: 0.76rem;
      font-weight: 750;
      color: #475569;
      text-align: start;
      border-bottom: 1.5px solid #CBD5E1;
      white-space: nowrap;
    }

    .entries-table td {
      padding: 0.32rem 0.65rem;
      font-size: 0.8rem;
      color: #334155;
      border-bottom: 1px solid #F1F5F9;
      vertical-align: middle;
    }

    .entries-table tr:hover td {
      background: #FAFBFC;
    }

    .reversed-row td {
      opacity: 0.65;
      background: #FFFBFB;
    }

    .jv-pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      color: #0284C7;
      font-family: var(--font-latin) !important;
      cursor: pointer;
    }

    .jv-pill:hover {
      background: #E0F2FE;
      border-color: #0284C7;
    }

    .period-badge {
      font-size: 0.75rem;
      color: #64748B;
      background: #F8FAFC;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #E2E8F0;
    }

    .entries-table th.col-desc-head,
    .entries-table td.col-desc {
      min-width: 320px;
      max-width: 580px;
      white-space: normal !important;
      word-break: break-word;
      line-height: 1.5;
    }

    .col-amount {
      font-family: var(--font-latin) !important;
      font-weight: 700;
      white-space: nowrap;
    }

    .col-amount.debit { color: #059669; }
    .col-amount.credit { color: #0284C7; }

    .line-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #F1F5F9;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: var(--font-latin) !important;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .status-posted { background: #ECFDF5; color: #059669; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-draft { background: #FFFBEB; color: #D97706; border: 1px solid rgba(217, 119, 6, 0.3); }
    .status-reversed { background: #FEF2F2; color: #DC2626; border: 1px solid rgba(239, 68, 68, 0.3); }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: all 0.15s ease;
    }

    .btn-icon.view { color: #0284C7; }
    .btn-icon.view:hover { background: #F0F9FF; border-color: rgba(2, 132, 199, 0.2); }

    .btn-icon.print { color: #047857; }
    .btn-icon.print:hover { background: #ECFDF5; border-color: rgba(4, 120, 87, 0.25); }

    .btn-icon.post { color: #059669; }
    .btn-icon.post:hover { background: #ECFDF5; border-color: rgba(16, 185, 129, 0.2); }

    .btn-icon.reverse { color: #DC2626; }
    .btn-icon.reverse:hover { background: #FEF2F2; border-color: rgba(239, 68, 68, 0.2); }

    /* Empty & Loading */
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      gap: 0.75rem;
      color: #64748B;
    }

    .empty-icon {
      font-size: 2.5rem;
      color: #CBD5E1;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 16px;
      width: 100%;
      max-width: 960px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      position: relative;
    }

    .view-modal {
      max-width: 820px;
    }

    .recurring-modal {
      max-width: 1080px;
      width: 96%;
    }

    .modal-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: #64748B;
      margin: 0.2rem 0 0 0;
    }

    .lines-title-cluster {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .lines-counter-badge {
      padding: 0.2rem 0.65rem;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
    }

    .required::after {
      content: ' *';
      color: #EF4444;
    }

    .col-span-3 {
      grid-column: span 3;
    }

    .text-indigo { color: #4F46E5 !important; }

    .modal-header {
      flex-shrink: 0;
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .modal-title-box h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0F172A;
    }

    .jv-pill-large {
      padding: 0.35rem 0.85rem;
      background: #F1F5F9;
      border-radius: 8px;
      font-family: var(--font-latin) !important;
      font-weight: 800;
      color: #0284C7;
      font-size: 1.05rem;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0.25rem;
    }

    .modal-body {
      padding: 1.5rem 1.75rem;
      overflow-y: auto;
      flex: 1 1 auto;
      min-height: 0;
    }

    .form-header-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
      background: #F8FAFC;
      padding: 1.25rem;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
    }

    .col-span-2 {
      grid-column: span 2;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-field label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
    }

    .form-input, .form-select {
      height: 38px;
      padding: 0 0.75rem;
      border: 1.5px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #0F172A;
      background: #FFFFFF;
      outline: none;
    }

    .form-input:focus, .form-select:focus {
      border-color: #10B981;
    }

    /* Lines Section */
    .lines-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .lines-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .lines-header h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0F172A;
    }

    .btn-add-line {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.85rem;
      background: #ECFDF5;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 6px;
      color: #059669;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-add-line:hover {
      background: #D1FAE5;
    }

    .lines-table-wrapper {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow-x: auto;
    }

    .lines-table {
      width: 100%;
      border-collapse: collapse;
    }

    .lines-table th {
      background: #F1F5F9;
      padding: 0.6rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
      text-align: start;
      border-bottom: 1.5px solid #E2E8F0;
    }

    .lines-table td {
      padding: 0.45rem 0.5rem;
      border-bottom: 1px solid #F1F5F9;
    }

    .line-select, .line-input {
      width: 100%;
      height: 34px;
      padding: 0 0.5rem;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      font-size: 0.82rem;
      color: #0F172A;
      outline: none;
    }

    .line-select:focus, .line-input:focus {
      border-color: #10B981;
    }

    .text-end { text-align: end; }

    .btn-remove-line {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: #94A3B8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-remove-line:hover:not(:disabled) {
      color: #EF4444;
      background: #FEF2F2;
    }

    /* Live Balance Bar */
    .balance-summary-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      border: 1.5px solid #CBD5E1;
      background: #F8FAFC;
    }

    .balance-summary-bar.balanced {
      border-color: #10B981;
      background: #ECFDF5;
    }

    .balance-summary-bar.unbalanced {
      border-color: #F87171;
      background: #FEF2F2;
    }

    .balance-stats {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
    }

    .stat-item span {
      font-size: 0.75rem;
      color: #64748B;
    }

    .stat-item strong {
      font-size: 1.1rem;
      color: #0F172A;
    }

    .stat-divider {
      width: 1px;
      height: 32px;
      background: #CBD5E1;
    }

    .balance-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .balance-summary-bar.balanced .balance-badge { color: #059669; }
    .balance-summary-bar.unbalanced .balance-badge { color: #DC2626; }

    /* Modal Footer */
    .modal-footer {
      flex-shrink: 0;
      padding: 1rem 1.75rem;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      position: sticky;
      bottom: 0;
      z-index: 10;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-secondary {
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #475569;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-save-draft {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      border: 1px solid #CBD5E1;
      background: #F1F5F9;
      color: #334155;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-save-draft:hover { background: #E2E8F0; }

    .btn-post-now {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.5rem;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 3px 8px rgba(16, 185, 129, 0.3);
    }

    .btn-post-now:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }

    .btn-post-now:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      border: none;
      background: #DC2626;
      color: #FFFFFF;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
    }

    /* View Modal Details */
    .view-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .view-meta-grid .col-span-full {
      grid-column: 1 / -1;
    }

    .general-desc-box {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-right: 4px solid #10B981;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-top: 0.25rem;
    }

    .general-desc-box .desc-text {
      display: block;
      color: #0F172A;
      font-size: 0.95rem;
      line-height: 1.6;
      word-break: break-word;
    }

    .view-lines-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }

    .view-lines-table td:nth-child(5) {
      min-width: 250px;
      word-break: break-word;
      line-height: 1.45;
    }

    .view-lines-table th {
      background: #F1F5F9;
      padding: 0.65rem 0.75rem;
      font-size: 0.78rem;
      color: #475569;
      text-align: start;
      border-bottom: 1.5px solid #CBD5E1;
    }

    .view-lines-table td {
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid #F1F5F9;
      font-size: 0.85rem;
    }

    .totals-row td {
      background: #F8FAFC;
      border-top: 1.5px solid #CBD5E1;
      padding: 0.75rem;
    }

    .reversal-alert {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: #FEF2F2;
      border: 1px solid #F87171;
      color: #DC2626;
      font-size: 0.85rem;
    }

    .btn-print-action {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      background: #047857;
      color: #FFFFFF;
      border: 1px solid #047857;
      box-shadow: 0 1px 2px rgba(4, 120, 87, 0.2);
      transition: all 0.15s ease;
    }

    .btn-print-action:hover {
      background: #065F46;
      border-color: #065F46;
      transform: translateY(-1px);
    }

    /* Print Preview Modal & Backdrop */
    .print-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow-y: auto;
      padding: 1.5rem 1rem;
    }

    .print-preview-dialog {
      width: 100%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 0 auto;
    }

    /* Floating Toolbar */
    .print-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0F172A;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 0.75rem 1.25rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toolbar-badge {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34D399;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }

    .toolbar-titles {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .toolbar-titles strong {
      color: #F8FAFC;
      font-size: 0.95rem;
    }

    .toolbar-sub-line {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .toolbar-titles .jv-tag {
      font-family: var(--font-latin) !important;
      font-size: 0.75rem;
      color: #34D399;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .toolbar-titles .pages-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      padding: 0.1rem 0.5rem;
      font-size: 0.72rem;
      color: #CBD5E1;
      font-weight: 600;
    }

    .toolbar-titles .pages-badge i {
      color: #34D399;
      font-size: 0.7rem;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-print-main {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #10B981 0%, #047857 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1.25rem;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      transition: all 0.2s ease;
    }

    .btn-print-main:hover {
      background: linear-gradient(135deg, #059669 0%, #065F46 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
    }

    .btn-toolbar-close {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(255, 255, 255, 0.1);
      color: #E2E8F0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-toolbar-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
    }

    /* Printable A4 Paper Container */
    .print-paper-container {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    .official-voucher-sheet {
      width: 210mm;
      min-height: 297mm;
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.25);
      border-radius: 4px;
      padding: 12mm 15mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* 1. Official Corporate Header Strip */
    .voucher-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.85rem;
      border-bottom: 2px solid #047857;
      margin-bottom: 0.85rem;
    }

    .header-org-info {
      flex: 1;
      text-align: start;
    }

    .org-brand-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-bottom: 0.25rem;
    }

    .voucher-company-logo {
      width: 44px;
      height: 44px;
      object-fit: contain;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
      flex-shrink: 0;
    }

    .voucher-ship-emblem {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      color: #047857;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(4, 120, 87, 0.25);
      flex-shrink: 0;
    }

    .org-names .org-ar {
      font-size: 1.15rem;
      font-weight: 800;
      color: #065F46;
      margin: 0 0 0.15rem 0;
    }

    .org-names .org-en {
      font-size: 0.75rem;
      font-family: var(--font-latin) !important;
      color: #64748B;
      font-weight: 600;
      display: block;
    }

    .org-meta-line {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
      color: #475569;
      margin-top: 0.25rem;
    }

    .header-center-title {
      flex: 1.2;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .brand-emblem-box {
      margin-bottom: 0.25rem;
    }

    .voucher-title-main {
      font-size: 1.3rem;
      font-weight: 900;
      color: #0F172A;
      margin: 0;
      letter-spacing: 0.5px;
    }

    .voucher-title-sub {
      font-size: 0.66rem;
      color: #047857;
      font-weight: 600;
      margin-top: 0.15rem;
    }

    .header-left-seal {
      flex: 1;
      display: flex;
      justify-content: flex-end;
    }

    .qr-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.35rem;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      background: #FAFAFA;
    }

    .qr-svg {
      border-radius: 4px;
    }

    .qr-text {
      font-size: 0.62rem;
      color: #047857;
      font-weight: 700;
      margin-top: 0.2rem;
    }

    /* 2. Metadata Grid (Ultra Compact) */
    .voucher-meta-section {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.35rem;
      margin-bottom: 0.35rem;
    }

    .voucher-meta-section .meta-item {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 0.2rem 0.45rem;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .meta-item .lbl {
      font-size: 0.6rem;
      color: #64748B;
      font-weight: 600;
      line-height: 1;
    }

    .meta-item .val {
      font-size: 0.74rem;
      color: #0F172A;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta-item.jv-number-box {
      background: #F0FDF4;
      border-color: #A7F3D0;
    }

    .meta-item.jv-number-box .val {
      color: #047857;
      font-size: 0.78rem;
    }

    .status-stamp-inline {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.66rem;
      font-weight: 700;
      padding: 0.08rem 0.35rem;
      border-radius: 3px;
      width: fit-content;
      line-height: 1.1;
    }

    .status-stamp-inline.posted {
      background: #DCFCE7;
      color: #065F46;
      border: 1px solid #86EFAC;
    }

    .status-stamp-inline.draft {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .status-stamp-inline.reversed {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FCA5A5;
    }

    /* 3. General Narration Banner (Ultra Compact) */
    .voucher-narration-section {
      background: #F8FAFC;
      border-right: 4px solid #047857;
      border-top: 1px solid #E2E8F0;
      border-bottom: 1px solid #E2E8F0;
      border-left: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 0.25rem 0.65rem;
      margin-bottom: 0.45rem;
      display: flex;
      align-items: center;
    }

    .narration-inline {
      display: flex;
      align-items: baseline;
      gap: 0.45rem;
      flex-wrap: wrap;
      width: 100%;
    }

    .narration-lbl {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.72rem;
      color: #047857;
      font-weight: 800;
      white-space: nowrap;
    }

    .narration-val {
      font-size: 0.82rem;
      font-weight: 700;
      color: #0F172A;
    }

    .narration-en-sub {
      font-size: 0.72rem;
      color: #64748B;
    }

    /* 4. Voucher Table */
    .voucher-table-section {
      margin-bottom: 0.5rem;
    }

    .voucher-print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }

    .voucher-print-table th {
      background: #065F46;
      color: #FFFFFF;
      padding: 0.45rem 0.55rem;
      font-weight: 700;
      text-align: start;
      border: 1px solid #065F46;
    }

    .voucher-print-table th.th-num { width: 28px; text-align: center; }
    .voucher-print-table th.th-code { width: 70px; }
    .voucher-print-table th.th-name { width: 18%; }
    .voucher-print-table th.th-cost-center { width: 27%; }
    .voucher-print-table th.th-desc { width: 23%; }
    .voucher-print-table th.th-amount { width: 11%; text-align: end; }

    .voucher-print-table td {
      padding: 0.4rem 0.55rem;
      border: 1px solid #CBD5E1;
      color: #1E293B;
      vertical-align: middle;
    }

    .voucher-print-table td.td-cost-center {
      word-break: break-word;
      line-height: 1.35;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
    }

    .voucher-print-table td.td-desc {
      word-break: break-word;
      line-height: 1.35;
      font-size: 0.75rem;
    }

    .voucher-print-table tr.row-alt td {
      background: #F8FAFC;
    }

    .voucher-print-table td.td-num {
      text-align: center;
      font-weight: 600;
      color: #64748B;
      font-family: var(--font-latin) !important;
    }

    .voucher-print-table td.td-name .name-ar {
      display: block;
      color: #0F172A;
    }

    .voucher-print-table td.td-name .name-en {
      display: block;
      color: #64748B;
      font-size: 0.68rem;
      font-family: var(--font-latin) !important;
    }

    .voucher-print-table td.td-amount {
      text-align: end;
      font-family: var(--font-latin) !important;
      font-size: 0.82rem;
    }

    .voucher-print-table .totals-row td {
      background: #ECFDF5;
      border-top: 2px solid #047857;
      border-bottom: 2px solid #047857;
      padding: 0.55rem 0.6rem;
      font-weight: 800;
    }

    .totals-row .total-title {
      font-size: 0.8rem;
      color: #065F46;
    }

    .totals-row .total-title i {
      margin-left: 0.35rem;
    }

    .totals-row .total-debit {
      text-align: end;
      color: #047857;
      font-size: 0.88rem;
    }

    .totals-row .total-credit {
      text-align: end;
      color: #0284C7;
      font-size: 0.88rem;
    }

    /* 5. Tafqeet */
    .voucher-tafqeet-section {
      margin-bottom: 0.85rem;
    }

    .tafqeet-card {
      background: #F8FAFC;
      border: 1px dashed #047857;
      border-radius: 6px;
      padding: 0.5rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .tafqeet-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748B;
      white-space: nowrap;
    }

    .tafqeet-words {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .tafqeet-words .ar-words {
      color: #065F46;
      font-size: 0.82rem;
      font-weight: 800;
    }

    .tafqeet-words .en-words {
      color: #64748B;
      font-size: 0.72rem;
      font-family: var(--font-latin) !important;
    }

    /* Reversal Alert */
    .voucher-reversal-alert {
      background: #FEF2F2;
      border: 1.5px solid #EF4444;
      border-radius: 6px;
      padding: 0.6rem 0.85rem;
      color: #991B1B;
      font-size: 0.78rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.85rem;
    }

    /* 6. Signatures Matrix */
    .voucher-signatures-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-top: 0.5rem;
      margin-bottom: 1rem;
    }

    .signature-box {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.6rem;
      background: #FAFAFA;
      display: flex;
      flex-direction: column;
    }

    .signature-box.approved {
      border-color: #A7F3D0;
      background: #F0FDF4;
    }

    .sig-header {
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 0.35rem;
      margin-bottom: 0.45rem;
      display: block;
      text-align: center;
    }

    .signature-box.approved .sig-header {
      color: #065F46;
      border-color: #BBF7D0;
    }

    .sig-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
    }

    .person-name {
      font-size: 0.78rem;
      font-weight: 700;
      color: #0F172A;
    }

    .sig-line {
      font-size: 0.7rem;
      color: #94A3B8;
      letter-spacing: 1px;
    }

    .sig-date {
      font-size: 0.68rem;
      color: #64748B;
      font-family: var(--font-latin) !important;
    }

    /* 7. Footer */
    .voucher-compliance-footer {
      margin-top: auto;
      padding-top: 0.6rem;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.66rem;
      color: #64748B;
      gap: 0.5rem;
    }

    .compliance-left {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex: 1;
    }

    .compliance-center {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .page-number-box {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 999px;
      padding: 0.15rem 0.65rem;
      font-size: 0.68rem;
      font-weight: 700;
      color: #0F172A;
    }

    .page-number-box i {
      color: #047857;
      font-size: 0.72rem;
    }

    .page-number-box .page-current {
      color: #047857;
      font-weight: 800;
    }

    .page-number-box .page-sep {
      color: #94A3B8;
      font-weight: 600;
    }

    .page-number-box .page-total {
      color: #475569;
    }

    .compliance-right {
      font-family: var(--font-latin) !important;
      text-align: end;
      flex: 1;
    }

    /* Print Media Queries */
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }

    @media print {
      .no-print,
      .page-header,
      .tabs-subnav,
      .kpi-strip,
      .filter-bar,
      .table-container,
      .recurring-header-strip,
      .recurring-table-container,
      app-pagination {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      :host {
        padding: 0 !important;
        margin: 0 !important;
        background: #FFFFFF !important;
        min-height: auto !important;
      }

      .journal-page {
        padding: 0 !important;
        margin: 0 !important;
        background: #FFFFFF !important;
      }

      .print-modal-backdrop {
        position: static !important;
        display: block !important;
        visibility: visible !important;
        width: 100% !important;
        min-height: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        background: #FFFFFF !important;
        overflow: visible !important;
        box-shadow: none !important;
        border: none !important;
      }

      .print-preview-dialog {
        position: static !important;
        display: block !important;
        visibility: visible !important;
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        background: #FFFFFF !important;
        box-shadow: none !important;
        border: none !important;
      }

      .print-paper-container {
        position: static !important;
        display: block !important;
        visibility: visible !important;
        padding: 0 !important;
        margin: 0 !important;
        background: #FFFFFF !important;
        box-shadow: none !important;
      }

      .official-voucher-sheet {
        position: static !important;
        display: flex !important;
        flex-direction: column !important;
        visibility: visible !important;
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 5mm 8mm !important;
        margin: 0 !important;
        background: #FFFFFF !important;
      }

      .voucher-header {
        display: flex !important;
        visibility: visible !important;
        justify-content: space-between !important;
        align-items: center !important;
        width: 100% !important;
        padding-bottom: 0.85rem !important;
        border-bottom: 2px solid #047857 !important;
        margin-bottom: 0.85rem !important;
      }

      .header-org-info,
      .header-center-title,
      .header-left-seal,
      .org-brand-row,
      .voucher-ship-emblem,
      .voucher-company-logo,
      .brand-emblem-box,
      .qr-box {
        display: flex !important;
        visibility: visible !important;
      }

      /* Multi-page table handling & headers repetition */
      .voucher-print-table {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      .voucher-print-table thead {
        display: table-header-group !important;
      }

      .voucher-print-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .voucher-tafqeet-section,
      .voucher-signatures-section,
      .voucher-compliance-footer {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `]
})
export class JournalEntriesComponent implements OnInit {
  private journalService = inject(JournalEntryService);
  private chartService = inject(ChartOfAccountsService);
  private settingsService = inject(FinancialSettingsService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private activeRoute = inject(ActivatedRoute);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  entries = signal<JournalEntrySummary[]>([]);
  kpi = signal<JournalEntryKpi | null>(null);

  // Pagination for General Journal
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalEntriesCount = signal<number>(0);

  // Pagination for Recurring Journal Entries
  currentRecurringPage = signal<number>(1);
  recurringPageSize = signal<number>(10);

  searchTerm = '';
  selectedStatus = signal<number | null>(null);

  // Sub-tab Navigation
  activeViewTab: 'regular' | 'recurring' = 'regular';
  recurringEntries = signal<any[]>([]);

  paginatedRecurringEntries = computed(() => {
    const list = this.recurringEntries();
    const page = this.currentRecurringPage();
    const size = this.recurringPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  loadingRecurring = signal<boolean>(false);
  showCreateRecurringModal = signal<boolean>(false);

  newRecurringModel = {
    title: '',
    descriptionAr: '',
    descriptionEn: '',
    frequency: 1, // 1: Monthly
    startDate: new Date().toISOString().substring(0, 10),
    endDate: ''
  };

  linesChangeTrigger = signal<number>(0);

  triggerLinesUpdate() {
    this.linesChangeTrigger.update(v => v + 1);
  }

  recurringEditLines: EditLine[] = [
    { accountId: '', description: '', debit: 0, credit: 0 },
    { accountId: '', description: '', debit: 0, credit: 0 }
  ];

  totalRecurringDebit = computed(() => {
    this.linesChangeTrigger();
    return Math.round(this.recurringEditLines.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0) * 100) / 100;
  });

  totalRecurringCredit = computed(() => {
    this.linesChangeTrigger();
    return Math.round(this.recurringEditLines.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0) * 100) / 100;
  });

  isRecurringBalanced = computed(() => {
    this.linesChangeTrigger();
    const validLines = this.recurringEditLines.filter(l => l.accountId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0));
    return validLines.length >= 2 &&
           this.totalRecurringDebit() === this.totalRecurringCredit() &&
           this.totalRecurringDebit() > 0;
  });

  recurringDifference = computed(() => {
    this.linesChangeTrigger();
    return Math.abs(Math.round((this.totalRecurringDebit() - this.totalRecurringCredit()) * 100) / 100);
  });

  savingRecurring = signal<boolean>(false);

  onRecurringDebitChange(line: EditLine) {
    if (line.debit && line.debit > 0) {
      line.credit = 0;
    }
    this.triggerLinesUpdate();
  }

  onRecurringCreditChange(line: EditLine) {
    if (line.credit && line.credit > 0) {
      line.debit = 0;
    }
    this.triggerLinesUpdate();
  }

  // Universal Document Attachments Modal
  showAttachmentsModal = false;
  selectedAttachmentEntityId = '';
  selectedAttachmentTitle = '';

  openAttachments(id: string, entryNumber: string) {
    this.selectedAttachmentEntityId = id;
    this.selectedAttachmentTitle = `قيد يومية رقم: ${entryNumber}`;
    this.showAttachmentsModal = true;
  }

  // Modals state
  showCreateModal = signal<boolean>(false);
  viewingEntry = signal<JournalEntry | null>(null);
  printingEntry = signal<JournalEntry | null>(null);
  currentPrintDate = new Date();
  tafqeet = inject(TafqeetService);

  // Reference data
  postableAccounts: AccountDto[] = [];
  costCenters: CostCenter[] = [];

  // Create Model
  newEntryModel = {
    entryDate: new Date().toISOString().substring(0, 10),
    entryType: 1,
    descriptionAr: '',
    descriptionEn: '',
    referenceNumber: ''
  };

  editLines: EditLine[] = [];

  totalDebit = computed(() => {
    this.linesChangeTrigger();
    return Math.round(this.editLines.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0) * 100) / 100;
  });

  totalCredit = computed(() => {
    this.linesChangeTrigger();
    return Math.round(this.editLines.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0) * 100) / 100;
  });

  balanceDifference = computed(() => {
    this.linesChangeTrigger();
    return Math.round(Math.abs(this.totalDebit() - this.totalCredit()) * 100) / 100;
  });

  isBalanced = computed(() => {
    this.linesChangeTrigger();
    const validLines = this.editLines.filter(l => l.accountId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0));
    return validLines.length >= 2 && 
           this.balanceDifference() === 0 && 
           this.totalDebit() > 0;
  });

  constructor() {
    effect(() => {
      const comp = this.companyContext.activeCompany();
      if (comp) {
        if (this.activeViewTab === 'recurring') {
          this.loadRecurringEntries();
        } else {
          this.loadEntries();
        }
        this.loadReferenceData();
      }
    });
  }

  ngOnInit() {
    this.activeRoute.queryParamMap.subscribe(params => {
      const search = params.get('search');
      if (search) {
        this.searchTerm = search.replace(/^#/, '').trim();
      }
      const tab = params.get('tab');
      if (tab === 'recurring') {
        this.activeViewTab = 'recurring';
        this.loadRecurringEntries();
      } else {
        this.activeViewTab = 'regular';
        this.loadEntries();
      }
    });
    this.loadReferenceData();
  }

  switchViewTab(tab: 'regular' | 'recurring') {
    this.activeViewTab = tab;
    if (tab === 'recurring') {
      this.loadRecurringEntries();
    } else {
      this.loadEntries();
    }
  }

  loadRecurringEntries() {
    this.loadingRecurring.set(true);
    const companyId = this.companyContext.activeCompany()?.id;
    this.journalService.getRecurringEntries(companyId).subscribe({
      next: (res) => {
        this.recurringEntries.set(res || []);
        this.loadingRecurring.set(false);
      },
      error: () => this.loadingRecurring.set(false)
    });
  }

  executeRecurringEntry(item: any) {
    Swal.fire({
      title: this.langService.t('accounting.journalEntries.alerts.executeRecurringTitle'),
      text: this.langService.t('accounting.journalEntries.alerts.executeRecurringText', { title: item.title }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.journalEntries.alerts.executeRecurringConfirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669'
    }).then(res => {
      if (res.isConfirmed) {
        this.journalService.executeRecurringEntry(item.id).subscribe({
          next: (r) => {
            Swal.fire({
              title: this.langService.t('accounting.journalEntries.alerts.executeRecurringSuccessTitle'),
              html: this.langService.t('accounting.journalEntries.alerts.executeRecurringSuccessHtml', {
                number: r.journalEntryNumber,
                date: new Date(r.nextRunDate).toLocaleDateString(this.langService.currentLang() === 'ar' ? 'ar-SA' : 'en-US')
              }),
              icon: 'success',
              confirmButtonColor: '#10B981'
            });
            this.loadRecurringEntries();
            this.loadEntries();
          },
          error: (err) => {
            Swal.fire(
              this.langService.t('accounting.journalEntries.alerts.executeRecurringFailed'),
              err.error?.description || err.message,
              'error'
            );
          }
        });
      }
    });
  }

  openCreateRecurringModal() {
    this.newRecurringModel = {
      title: '',
      descriptionAr: '',
      descriptionEn: '',
      frequency: 1,
      startDate: new Date().toISOString().substring(0, 10),
      endDate: ''
    };
    this.recurringEditLines = [
      { accountId: '', description: '', debit: 0, credit: 0 },
      { accountId: '', description: '', debit: 0, credit: 0 }
    ];
    this.triggerLinesUpdate();
    this.showCreateRecurringModal.set(true);
  }

  closeCreateRecurringModal() {
    this.showCreateRecurringModal.set(false);
  }

  addRecurringLine() {
    this.recurringEditLines.push({ accountId: '', description: '', debit: 0, credit: 0 });
    this.triggerLinesUpdate();
  }

  removeRecurringLine(index: number) {
    if (this.recurringEditLines.length > 2) {
      this.recurringEditLines.splice(index, 1);
      this.triggerLinesUpdate();
    }
  }

  saveRecurringEntry() {
    if (!this.newRecurringModel.title || !this.newRecurringModel.descriptionAr) {
      Swal.fire(
        this.langService.t('accounting.journalEntries.alerts.missingDataTitle'),
        this.langService.t('accounting.journalEntries.alerts.enterTitleAndDesc'),
        'warning'
      );
      return;
    }

    // Filter out completely untouched/empty lines
    const activeLines = this.recurringEditLines.filter(l => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0 || (l.description && l.description.trim().length > 0));

    if (activeLines.length < 2) {
      Swal.fire(
        this.langService.t('accounting.journalEntries.alerts.missingDataTitle'),
        this.langService.t('accounting.journalEntries.alerts.minTwoLinesRecurring'),
        'warning'
      );
      return;
    }

    for (let i = 0; i < activeLines.length; i++) {
      const line = activeLines[i];
      if (!line.accountId) {
        Swal.fire(
          this.langService.t('accounting.journalEntries.alerts.missingDataTitle'),
          this.langService.t('accounting.journalEntries.alerts.selectAccountRow', { row: i + 1 }),
          'warning'
        );
        return;
      }
      if ((Number(line.debit) || 0) === 0 && (Number(line.credit) || 0) === 0) {
        Swal.fire(
          this.langService.t('accounting.journalEntries.alerts.missingDataTitle'),
          this.langService.t('accounting.journalEntries.alerts.enterDebitOrCreditRow', { row: i + 1 }),
          'warning'
        );
        return;
      }
    }

    if (!this.isRecurringBalanced()) {
      Swal.fire(
        this.langService.t('accounting.journalEntries.alerts.unbalancedRecurringTitle'),
        this.langService.t('accounting.journalEntries.alerts.unbalancedRecurringText'),
        'warning'
      );
      return;
    }

    const companyId = this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
    const payload = {
      companyId,
      title: this.newRecurringModel.title.trim(),
      descriptionAr: this.newRecurringModel.descriptionAr.trim(),
      descriptionEn: (this.newRecurringModel.descriptionEn || this.newRecurringModel.descriptionAr).trim(),
      frequency: Number(this.newRecurringModel.frequency) || 1,
      startDate: this.newRecurringModel.startDate ? new Date(this.newRecurringModel.startDate).toISOString() : new Date().toISOString(),
      endDate: (this.newRecurringModel.endDate && this.newRecurringModel.endDate.trim().length > 0) ? new Date(this.newRecurringModel.endDate).toISOString() : null,
      lines: activeLines.map(l => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: (l.description && l.description.trim().length > 0) ? l.description.trim() : this.newRecurringModel.descriptionAr.trim(),
        costCenterId: (l.costCenterId && l.costCenterId !== 'undefined' && l.costCenterId !== 'null') ? l.costCenterId : null
      }))
    };

    this.savingRecurring.set(true);
    this.journalService.createRecurringEntry(payload).subscribe({
      next: () => {
        this.savingRecurring.set(false);
        Swal.fire({
          icon: 'success',
          title: this.langService.t('accounting.journalEntries.alerts.recurringSavedTitle'),
          text: this.langService.t('accounting.journalEntries.alerts.recurringSavedText', { title: payload.title }),
          confirmButtonColor: '#10B981'
        });
        this.closeCreateRecurringModal();
        this.loadRecurringEntries();
      },
      error: (err) => {
        this.savingRecurring.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('accounting.journalEntries.alerts.recurringSaveErrorTitle'),
          text: err.error?.description || err.error?.title || err.message || this.langService.t('accounting.journalEntries.alerts.recurringSaveErrorDefault'),
          confirmButtonColor: '#0F172A'
        });
      }
    });
  }

  loadEntries() {
    this.loading.set(true);
    const companyId = this.companyContext.activeCompany()?.id;
    const page = this.currentPage();
    const size = this.pageSize();

    this.journalService.getList({
      companyId,
      status: this.selectedStatus() ?? undefined,
      searchTerm: this.searchTerm || undefined,
      skip: (page - 1) * size,
      take: size
    }).subscribe({
      next: (res) => {
        this.entries.set(res.items);
        this.totalEntriesCount.set(res.totalCount || res.items.length);
        this.kpi.set(res.kpi);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadEntries();
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadEntries();
  }

  loadReferenceData() {
    const companyId = this.companyContext.activeCompany()?.id;

    // Load accounts tree and flatten postable accounts
    this.chartService.loadAccountsTree(companyId).subscribe({
      next: (tree) => {
        const flattened: AccountDto[] = [];
        const extractPostable = (nodes: AccountDto[]) => {
          for (const node of nodes) {
            if (node.isPostable) {
              flattened.push(node);
            }
            if (node.subAccounts && node.subAccounts.length > 0) {
              extractPostable(node.subAccounts);
            }
          }
        };
        extractPostable(tree);
        this.postableAccounts = flattened.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      }
    });

    // Load cost centers
    this.settingsService.getOverview(companyId).subscribe({
      next: (overview) => {
        this.costCenters = overview.costCenters || [];
      }
    });
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadEntries();
  }

  setStatusFilter(status: number | null) {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadEntries();
  }

  getStatusBadgeClass(status: number): string {
    switch (status) {
      case 1: return 'status-draft';
      case 2: return 'status-posted';
      case 3: return 'status-reversed';
      default: return '';
    }
  }

  getStatusIcon(status: number): string {
    switch (status) {
      case 1: return 'pi-file-edit';
      case 2: return 'pi-check-circle';
      case 3: return 'pi-undo';
      default: return '';
    }
  }

  getStatusText(status: number): string {
    const isAr = this.langService.currentLang() === 'ar';
    switch (status) {
      case 1: return isAr ? 'مسودة' : 'Draft';
      case 2: return isAr ? 'مرحّل' : 'Posted';
      case 3: return isAr ? 'معكوس' : 'Reversed';
      default: return '';
    }
  }

  openCreateModal() {
    this.router.navigate(['/accounting/journal-entries/create']);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  addLine() {
    this.editLines.push({
      accountId: '',
      description: this.newEntryModel.descriptionAr || '',
      debit: 0,
      credit: 0
    });
    this.triggerLinesUpdate();
  }

  removeLine(index: number) {
    if (this.editLines.length > 2) {
      this.editLines.splice(index, 1);
      this.triggerLinesUpdate();
    }
  }

  onDebitChange(line: EditLine) {
    if (line.debit > 0) {
      line.credit = 0;
    }
    this.triggerLinesUpdate();
  }

  onCreditChange(line: EditLine) {
    if (line.credit > 0) {
      line.debit = 0;
    }
    this.triggerLinesUpdate();
  }

  saveEntry(postImmediately: boolean) {
    if (!this.newEntryModel.descriptionAr) {
      Swal.fire(
        this.langService.t('common.warning'),
        this.langService.t('accounting.journalEntries.alerts.provideDescription'),
        'warning'
      );
      return;
    }

    // Filter out completely untouched/empty lines (e.g. if a user added a row by mistake or didn't need it)
    const activeLines = this.editLines.filter(l => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0 || (l.description && l.description.trim().length > 0));

    if (activeLines.length < 2) {
      Swal.fire(
        this.langService.t('accounting.journalEntries.alerts.accountingWarning'),
        this.langService.t('accounting.journalEntries.alerts.minTwoLinesComplete'),
        'warning'
      );
      return;
    }

    for (let i = 0; i < activeLines.length; i++) {
      const line = activeLines[i];
      if (!line.accountId) {
        Swal.fire(
          this.langService.t('common.warning'),
          this.langService.t('accounting.journalEntries.alerts.selectAccountLine', { row: i + 1 }),
          'warning'
        );
        return;
      }
      if ((Number(line.debit) || 0) === 0 && (Number(line.credit) || 0) === 0) {
        Swal.fire(
          this.langService.t('common.warning'),
          this.langService.t('accounting.journalEntries.alerts.enterDebitCreditLine', { row: i + 1 }),
          'warning'
        );
        return;
      }
    }

    if (postImmediately && !this.isBalanced()) {
      Swal.fire(
        this.langService.t('accounting.journalEntries.alerts.accountingError'),
        this.langService.t('accounting.journalEntries.alerts.cannotPostUnbalanced'),
        'error'
      );
      return;
    }

    this.submitting.set(true);
    const companyId = this.companyContext.activeCompany()?.id;

    const payload: CreateJournalEntryRequest = {
      companyId,
      entryDate: this.newEntryModel.entryDate,
      entryType: +this.newEntryModel.entryType,
      descriptionAr: this.newEntryModel.descriptionAr,
      descriptionEn: this.newEntryModel.descriptionEn || this.newEntryModel.descriptionAr,
      referenceNumber: this.newEntryModel.referenceNumber || undefined,
      postImmediately,
      lines: activeLines.map(l => ({
        accountId: l.accountId,
        costCenterId: l.costCenterId || undefined,
        description: l.description || this.newEntryModel.descriptionAr,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0
      }))
    };

    this.journalService.create(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.closeCreateModal();
        Swal.fire({
          icon: 'success',
          title: postImmediately 
            ? this.langService.t('accounting.journalEntries.alerts.entryPostedSuccess')
            : this.langService.t('accounting.journalEntries.alerts.draftSavedSuccess'),
          text: this.langService.t('accounting.journalEntries.alerts.entryNumber', { number: res.entryNumber })
        });
        this.loadEntries();
      },
      error: (err) => {
        this.submitting.set(false);
        Swal.fire(
          this.langService.t('accounting.journalEntries.alerts.entryError'), 
          err?.error?.description || this.langService.t('accounting.journalEntries.alerts.saveEntryFailed'), 
          'error'
        );
      }
    });
  }

  viewEntry(item: JournalEntrySummary) {
    this.journalService.getById(item.id).subscribe({
      next: (entry) => {
        this.viewingEntry.set(entry);
      }
    });
  }

  postEntry(item: JournalEntrySummary) {
    Swal.fire({
      title: this.langService.t('accounting.journalEntries.alerts.confirmPostTitle'),
      text: this.langService.t('accounting.journalEntries.alerts.confirmPostText', { number: item.entryNumber }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.journalEntries.alerts.yesPost'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#10B981'
    }).then((res) => {
      if (res.isConfirmed) {
        this.journalService.post(item.id).subscribe({
          next: () => {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: this.langService.t('accounting.journalEntries.alerts.toastPostedSuccess'),
              showConfirmButton: false,
              timer: 2500
            });
            this.loadEntries();
          },
          error: (err) => {
            Swal.fire(
              this.langService.t('accounting.journalEntries.alerts.postFailed'),
              err?.error?.description || this.langService.t('common.errorOccurred'),
              'error'
            );
          }
        });
      }
    });
  }

  reverseEntry(entry: JournalEntrySummary | JournalEntry) {
    Swal.fire({
      title: this.langService.t('accounting.journalEntries.alerts.reverseEntryTitle'),
      text: this.langService.t('accounting.journalEntries.alerts.reverseEntryText', { number: entry.entryNumber }),
      input: 'text',
      inputPlaceholder: this.langService.t('accounting.journalEntries.alerts.reversePlaceholder'),
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.journalEntries.alerts.reverseConfirmBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#DC2626',
      inputValidator: (val) => {
        if (!val) {
          return this.langService.t('accounting.journalEntries.alerts.reverseReasonRequired');
        }
        return null;
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        this.journalService.reverse(entry.id, res.value).subscribe({
          next: (rev) => {
            this.viewingEntry.set(null);
            Swal.fire({
              icon: 'success',
              title: this.langService.t('accounting.journalEntries.alerts.reverseSuccessTitle'),
              text: this.langService.t('accounting.journalEntries.alerts.reverseSuccessText', { number: rev.entryNumber })
            });
            this.loadEntries();
          },
          error: (err) => {
            Swal.fire(
              this.langService.t('common.error'),
              err?.error?.description || this.langService.t('accounting.journalEntries.alerts.reverseFailed'),
              'error'
            );
          }
        });
      }
    });
  }

  openPrintVoucher(itemOrEntry: JournalEntrySummary | JournalEntry) {
    if ('lines' in itemOrEntry && (itemOrEntry as JournalEntry).lines && (itemOrEntry as JournalEntry).lines.length > 0) {
      this.currentPrintDate = new Date();
      this.printingEntry.set(itemOrEntry as JournalEntry);
    } else {
      this.journalService.getById(itemOrEntry.id).subscribe({
        next: (entry) => {
          this.currentPrintDate = new Date();
          this.printingEntry.set(entry);
        }
      });
    }
  }

  closePrintVoucher() {
    this.printingEntry.set(null);
  }

  printCurrentVoucher() {
    window.print();
  }

  getEstimatedPages(): number {
    const linesCount = this.printingEntry()?.lines?.length || 0;
    if (linesCount <= 10) {
      return 1;
    }
    return 1 + Math.ceil((linesCount - 10) / 20);
  }

  getEntryTypeText(type?: number): string {
    switch (type) {
      case 1: return this.langService.t('accounting.journalEntries.types.general');
      case 2: return this.langService.t('accounting.journalEntries.types.opening');
      case 3: return this.langService.t('accounting.journalEntries.types.adjustment');
      case 4: return this.langService.t('accounting.journalEntries.types.closing');
      default: return this.langService.t('accounting.journalEntries.types.default');
    }
  }
}
