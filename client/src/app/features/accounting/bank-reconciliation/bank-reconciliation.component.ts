import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  BankReconciliationService,
  BankAccountSummary,
  BankReconciliationTransaction,
  BankReconciliationWorkspace,
  BankReconciliationResult
} from '../../../core/services/bank-reconciliation.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountDto } from '../../../core/models/account.model';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export interface ParsedStatementRow {
  date: string;
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
}

@Component({
  selector: 'app-bank-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, SearchableSelectComponent, PaginationComponent, TranslatePipe],
  templateUrl: './bank-reconciliation.component.html',
  styleUrls: ['./bank-reconciliation.component.css']
})
export class BankReconciliationComponent implements OnInit {
  // Services
  private bankRecService = inject(BankReconciliationService);
  public companyContext = inject(CompanyContextService);
  private coaService = inject(ChartOfAccountsService);
  private translator = inject(AccountingTranslatorService);
  public langService = inject(LanguageService);

  // State Signals
  bankAccounts = signal<BankAccountSummary[]>([]);
  allPostableAccounts = signal<AccountDto[]>([]);
  selectedAccountId = signal<string>('');
  statementDate = signal<string>(new Date().toISOString().substring(0, 10));
  statementEndingBalance = signal<number>(0);
  statementBalanceTouched = signal<boolean>(false);
  priorReconciledBalance = signal<number>(0);
  notes = signal<string>('');

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Transactions list
  transactions = signal<BankReconciliationTransaction[]>([]);
  activeFilter = signal<'all' | 'matched' | 'unmatched' | 'transit' | 'outstanding'>('all');
  searchQuery = signal<string>('');

  // History Drawer state
  showHistory = signal<boolean>(false);
  historyList = signal<BankReconciliationResult[]>([]);
  isLoadingHistory = signal<boolean>(false);

  // Import Statement & Auto-Match State
  showImportModal = signal<boolean>(false);
  rawStatementText = signal<string>('');
  isAutoMatching = signal<boolean>(false);

  // Quick Adjustment Entry Modal State
  showAdjustmentModal = signal<boolean>(false);
  adjType = signal<'charge' | 'interest' | 'income' | 'other'>('charge');
  adjAmount = signal<number>(0);
  adjDate = signal<string>(new Date().toISOString().substring(0, 10));
  adjCounterAccountId = signal<string>('');
  adjDescriptionAr = signal<string>('عمولات ومصروفات بنكية - كشف الحساب');
  adjDescriptionEn = signal<string>('Bank Charges and Fees');
  adjReference = signal<string>('');
  isSavingAdjustment = signal<boolean>(false);

  // Official Reconciliation Statement Modal
  showStatementModal = signal<boolean>(false);

  // Computed Financial Metrics
  selectedAccount = computed(() => {
    return this.bankAccounts().find(a => a.accountId === this.selectedAccountId()) || null;
  });

  accountOptions = computed<SelectOption[]>(() => {
    return this.bankAccounts().map(acc => {
      const bal = acc.currentLedgerBalance || 0;
      const formattedBal = bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return {
        value: acc.accountId,
        label: acc.accountNameAr || acc.accountNameEn,
        sublabel: `الرصيد الدفتري: ${formattedBal} ر.س`,
        code: acc.accountCode,
        badge: `${formattedBal} ر.س`,
        badgeClass: bal >= 0 ? 'badge-primary' : 'badge-danger',
        icon: 'pi pi-building'
      };
    });
  });

  counterAccountOptions = computed<SelectOption[]>(() => {
    return this.allPostableAccounts().map(acc => ({
      value: acc.id,
      label: acc.nameAr || acc.nameEn,
      code: acc.accountCode,
      icon: 'pi pi-tag'
    }));
  });

  filteredTransactions = computed(() => {
    const list = this.transactions();
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter(t => {
      // Filter tab
      if (filter === 'matched' && !t.isMatched) return false;
      if (filter === 'unmatched' && t.isMatched) return false;
      if (filter === 'transit' && (t.isMatched || t.debit <= 0)) return false;
      if (filter === 'outstanding' && (t.isMatched || t.credit <= 0)) return false;

      // Search query
      if (query) {
        const desc = (t.description || '').toLowerCase();
        const entry = (t.entryNumber || '').toLowerCase();
        const ref = (t.referenceNumber || '').toLowerCase();
        return desc.includes(query) || entry.includes(query) || ref.includes(query);
      }
      return true;
    });
  });

  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedTransactions = computed(() => {
    const list = this.filteredTransactions();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  setFilter(filter: 'all' | 'matched' | 'unmatched' | 'transit' | 'outstanding'): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onStatementBalanceChange(val: any): void {
    this.statementEndingBalance.set(Number(val) || 0);
    this.statementBalanceTouched.set(true);
  }

  totalDebits = computed(() => {
    return this.transactions().reduce((sum, t) => sum + (t.debit || 0), 0);
  });

  totalCredits = computed(() => {
    return this.transactions().reduce((sum, t) => sum + (t.credit || 0), 0);
  });

  clearedDeposits = computed(() => {
    return this.transactions()
      .filter(t => t.isMatched)
      .reduce((sum, t) => sum + (t.debit || 0), 0);
  });

  clearedWithdrawals = computed(() => {
    return this.transactions()
      .filter(t => t.isMatched)
      .reduce((sum, t) => sum + (t.credit || 0), 0);
  });

  unclearedDeposits = computed(() => {
    return this.transactions()
      .filter(t => !t.isMatched)
      .reduce((sum, t) => sum + (t.debit || 0), 0);
  });

  unclearedWithdrawals = computed(() => {
    return this.transactions()
      .filter(t => !t.isMatched)
      .reduce((sum, t) => sum + (t.credit || 0), 0);
  });

  clearedNetBalance = computed(() => {
    return Math.round((this.priorReconciledBalance() + this.clearedDeposits() - this.clearedWithdrawals()) * 100) / 100;
  });

  unclearedNetBalance = computed(() => {
    return Math.round((this.unclearedDeposits() - this.unclearedWithdrawals()) * 100) / 100;
  });

  depositsInTransitCount = computed(() => {
    return this.transactions().filter(t => !t.isMatched && t.debit > 0).length;
  });

  depositsInTransitAmount = computed(() => {
    return this.unclearedDeposits();
  });

  outstandingChecksCount = computed(() => {
    return this.transactions().filter(t => !t.isMatched && t.credit > 0).length;
  });

  outstandingChecksAmount = computed(() => {
    return this.unclearedWithdrawals();
  });

  bookBalance = computed(() => {
    return Math.round((this.priorReconciledBalance() + this.totalDebits() - this.totalCredits()) * 100) / 100;
  });

  adjustedBankBalance = computed(() => {
    return Math.round((Number(this.statementEndingBalance()) + this.unclearedDeposits() - this.unclearedWithdrawals()) * 100) / 100;
  });

  matchedCount = computed(() => this.transactions().filter(t => t.isMatched).length);
  unmatchedCount = computed(() => this.transactions().filter(t => !t.isMatched).length);

  difference = computed(() => {
    // When no transactions are matched yet and the statement balance is still 0 (untouched),
    // compare statement balance against bookBalance so the accountant sees the unreconciled ledger gap
    if (this.matchedCount() === 0 && !this.statementBalanceTouched() && Number(this.statementEndingBalance()) === 0 && this.unmatchedCount() > 0) {
      return Math.round((Number(this.statementEndingBalance()) - this.bookBalance()) * 100) / 100;
    }
    return Math.round((Number(this.statementEndingBalance()) - this.clearedNetBalance()) * 100) / 100;
  });

  isBalanced = computed(() => {
    if (this.transactions().length > 0 && this.matchedCount() === 0 && !this.statementBalanceTouched() && Math.abs(this.bookBalance()) >= 0.005) {
      return false;
    }
    return Math.abs(this.difference()) < 0.005;
  });

  allVisibleMatched = computed(() => {
    const visible = this.filteredTransactions();
    return visible.length > 0 && visible.every(t => t.isMatched);
  });

  toggleSelectAllVisible(checked: boolean): void {
    const visibleIds = new Set(this.filteredTransactions().map(t => t.journalEntryLineId));
    const updated = this.transactions().map(t => visibleIds.has(t.journalEntryLineId) ? { ...t, isMatched: checked } : t);
    this.transactions.set(updated);
  }

  // Live parsed statement preview in import modal
  statementPreviewRows = computed<ParsedStatementRow[]>(() => {
    const raw = this.rawStatementText().trim();
    if (!raw) return [];

    const lines = raw.split(/\r?\n/);
    const rows: ParsedStatementRow[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let cols: string[];
      if (trimmed.includes('\t')) cols = trimmed.split('\t');
      else if (trimmed.includes(';')) cols = trimmed.split(';');
      else cols = trimmed.split(',');

      if (cols.length < 3) continue;

      const dateStr = cols[0].replace(/["']/g, '').trim();
      // Simple date check
      if (!/\d/.test(dateStr)) continue;

      const ref = cols.length > 1 ? cols[1].replace(/["']/g, '').trim() : '';
      const desc = cols.length > 2 ? cols[2].replace(/["']/g, '').trim() : '';
      let debit = 0;
      let credit = 0;

      if (cols.length >= 5) {
        debit = parseFloat(cols[3].replace(/["', ]/g, '')) || 0;
        credit = parseFloat(cols[4].replace(/["', ]/g, '')) || 0;
      } else if (cols.length === 4) {
        const amt = parseFloat(cols[3].replace(/["', ]/g, '')) || 0;
        if (amt >= 0) debit = amt;
        else credit = Math.abs(amt);
      }

      rows.push({
        date: dateStr,
        referenceNumber: ref,
        description: desc,
        debit,
        credit
      });
    }

    return rows;
  });

  previewTotalDebits = computed(() => this.statementPreviewRows().reduce((s, r) => s + r.debit, 0));
  previewTotalCredits = computed(() => this.statementPreviewRows().reduce((s, r) => s + r.credit, 0));

  ngOnInit(): void {
    this.loadBankAccounts();
    this.loadPostableAccounts();
  }

  loadBankAccounts(): void {
    const companyId = this.companyContext.activeCompany()?.id;
    this.isLoading.set(true);
    this.bankRecService.getAccounts(companyId).subscribe({
      next: (accounts) => {
        this.bankAccounts.set(accounts);
        if (accounts.length > 0) {
          const preferredBank = accounts.find(a =>
            a.accountNameAr?.includes('بنك') ||
            a.accountNameAr?.includes('مصرف') ||
            a.accountNameEn?.toLowerCase().includes('bank')
          ) || accounts[0];
          this.selectedAccountId.set(preferredBank.accountId);
          this.loadWorkspace();
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.errorMessage.set(this.langService.t('accounting.bankRec.alerts.loadAccountsFailed') + (err.error?.message || err.message));
        this.isLoading.set(false);
      }
    });
  }

  loadPostableAccounts(): void {
    this.coaService.loadAccountsTree().subscribe({
      next: (tree) => {
        const flat: AccountDto[] = [];
        const extract = (list: AccountDto[]) => {
          for (const a of list) {
            if (a.isPostable) flat.push(a);
            if (a.subAccounts && a.subAccounts.length > 0) extract(a.subAccounts);
          }
        };
        extract(tree);
        this.allPostableAccounts.set(flat);

        // Pre-select bank charge account
        const chargeAcc = flat.find(a => a.accountCode.startsWith('54') || a.accountCode.startsWith('531') || a.nameAr.includes('بنك'));
        if (chargeAcc) {
          this.adjCounterAccountId.set(chargeAcc.id);
        }
      }
    });
  }

  onAccountChanged(accountId: string): void {
    this.selectedAccountId.set(accountId);
    this.statementBalanceTouched.set(false);
    this.statementEndingBalance.set(0);
    this.loadWorkspace();
  }

  loadWorkspace(): void {
    const accId = this.selectedAccountId();
    if (!accId) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const companyId = this.companyContext.activeCompany()?.id;
    const date = this.statementDate();
    const endingBal = Number(this.statementEndingBalance());

    this.bankRecService.getWorkspace(accId, date, endingBal, companyId).subscribe({
      next: (ws: BankReconciliationWorkspace) => {
        const txs = ws.transactions || [];
        this.transactions.set(txs);
        const unreconciledNet = txs.reduce((s, t) => s + ((t.debit || 0) - (t.credit || 0)), 0);
        const bookBal = typeof ws.bookBalance === 'number' ? ws.bookBalance : unreconciledNet;
        this.priorReconciledBalance.set(Math.round((bookBal - unreconciledNet) * 100) / 100);

        if (ws.statementEndingBalance && this.statementEndingBalance() === 0) {
          this.statementEndingBalance.set(ws.statementEndingBalance);
          this.statementBalanceTouched.set(true);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(this.langService.t('accounting.bankRec.alerts.loadWorkspaceFailed') + (err.error?.description || err.message));
        this.isLoading.set(false);
      }
    });
  }

  setBalanceToCleared(): void {
    const cleared = this.clearedNetBalance();
    this.statementEndingBalance.set(Math.round(cleared * 100) / 100);
    this.statementBalanceTouched.set(true);
  }

  matchTransactionByRef(ref: string): void {
    const updated = this.transactions().map(t => {
      if ((t.referenceNumber && t.referenceNumber.includes(ref)) || (t.entryNumber && t.entryNumber.includes(ref))) {
        return { ...t, isMatched: true };
      }
      return t;
    });
    this.transactions.set(updated);
  }

  toggleItemMatch(tx: BankReconciliationTransaction): void {
    tx.isMatched = !tx.isMatched;
    this.transactions.set([...this.transactions()]);
  }

  matchAll(): void {
    const updated = this.transactions().map(t => ({ ...t, isMatched: true }));
    this.transactions.set(updated);
  }

  unmatchAll(): void {
    const updated = this.transactions().map(t => ({ ...t, isMatched: false }));
    this.transactions.set(updated);
  }

  saveReconciliation(finalize: boolean): void {
    const accId = this.selectedAccountId();
    if (!accId) return;

    if (finalize && !this.isBalanced()) {
      Swal.fire({
        icon: 'warning',
        title: 'التسوية غير متطابقة',
        text: this.langService.t('accounting.bankRec.alerts.unbalancedFinalize'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const companyId = this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
    const matchedIds = this.transactions()
      .filter(t => t.isMatched)
      .map(t => t.journalEntryLineId);

    const req = {
      companyId,
      bankAccountId: accId,
      statementDate: this.statementDate(),
      statementEndingBalance: Number(this.statementEndingBalance()),
      matchedJournalLineIds: matchedIds,
      notes: this.notes() || (finalize ? 'تسوية بنكية معتمدة' : 'مسودة تسوية بنكية'),
      finalize
    };

    this.bankRecService.save(req).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        const actionText = finalize 
          ? this.langService.t('accounting.bankRec.alerts.finalizeSuccess') 
          : this.langService.t('accounting.bankRec.alerts.draftSuccess');
        Swal.fire({
          icon: 'success',
          title: finalize ? 'تم اعتماد التسوية البنكية' : 'تم حفظ المسودة',
          text: `${actionText} [${res.reconciliationNumber}]`,
          confirmButtonColor: '#059669'
        });
        this.loadWorkspace();
      },
      error: (err) => {
        this.isSaving.set(false);
        Swal.fire({
          icon: 'error',
          title: 'تعذر حفظ التسوية',
          text: err.error?.description || err.message,
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  toggleHistory(): void {
    this.showHistory.set(!this.showHistory());
    if (this.showHistory()) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    const companyId = this.companyContext.activeCompany()?.id;
    this.isLoadingHistory.set(true);
    this.bankRecService.getHistory(companyId).subscribe({
      next: (list) => {
        this.historyList.set(list);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.isLoadingHistory.set(false);
      }
    });
  }

  // Import Statement & Auto-Match State
  openImportModal(): void {
    if (!this.selectedAccountId()) {
      this.errorMessage.set(this.langService.t('accounting.bankRec.alerts.selectAccountFirst'));
      return;
    }
    this.showImportModal.set(true);
    if (!this.rawStatementText()) {
      this.loadBankSample('rajhi');
    }
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
  }

  onStatementFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      this.rawStatementText.set(text);
      // Auto-calculate ending balance from preview if possible
      const net = this.previewTotalDebits() - this.previewTotalCredits();
      if (net !== 0) {
        this.statementEndingBalance.set(Math.round(net * 100) / 100);
      }
    };
    reader.readAsText(file);
  }

  loadBankSample(bank: 'rajhi' | 'snb' | 'riyad'): void {
    if (bank === 'rajhi') {
      const sample = `2026-01-01\tOP-2026-01\tرصيد مصرف الراجحي الجاري الافتتاحي\t250000.00\t0.00
2026-01-18\tRV-2026-0001\tإيداع بنكي بحساب مصرف الراجحي من شركة أفق المستقبل\t20000.00\t0.00
2026-01-20\tPV-2026-0001\tصرف من حساب مصرف الراجحي عبر نظام سداد\t0.00\t3450.00
2026-10-23\tPAY-SUPP-001\tصرف سداد فاتورة مشتريات تحويل بنكي\t0.00\t10000.00
2026-10-23\tRV-2026-00004\tسند قبض تحصيل فاتورة مبيعات\t3000.00\t0.00
2026-10-23\tTRX-TEST-001\tسداد تحصيل فاتورة مبيعات مدى\t5000.00\t0.00
2026-10-24\tPV-2026-00010\tسند صرف سداد فاتورة مشتريات\t0.00\t575.00`;
      this.rawStatementText.set(sample);
      this.statementEndingBalance.set(263975.00);
    } else if (bank === 'snb') {
      const sample = `2026-01-01\tSNB-OP-01\tرصيد افتتاحي البنك الأهلي السعودي\t200000.00\t0.00
2026-06-15\tSNB-DEP-45\tإيداع حوالة نقدية تجارية\t15000.00\t0.00
2026-06-20\tSNB-CHG-12\tرسوم اشتراك منصة مصرفية وبطاقة صراف\t0.00\t115.00`;
      this.rawStatementText.set(sample);
      this.statementEndingBalance.set(214885.00);
    } else {
      const sample = `2026-10-10\tRIY-TRX-01\tإيداع شبكة مدى نقاط البيع\t12450.00\t0.00
2026-10-12\tRIY-CHK-88\tصرف شيك مقاولات أعمال صيانة\t0.00\t4500.00
2026-10-15\tRIY-FEE-09\tعمولة تحويل سويفت خارجي\t0.00\t57.50`;
      this.rawStatementText.set(sample);
      this.statementEndingBalance.set(7892.50);
    }
  }

  applyEndingBalanceFromPreview(): void {
    const net = this.previewTotalDebits() - this.previewTotalCredits();
    this.statementEndingBalance.set(Math.round(net * 100) / 100);
  }

  executeAutoMatch(): void {
    const raw = this.rawStatementText().trim();
    if (!raw) {
      this.errorMessage.set(this.langService.t('accounting.bankRec.alerts.pasteDataFirst'));
      return;
    }

    const companyId = this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
    this.isAutoMatching.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const req = {
      companyId,
      bankAccountId: this.selectedAccountId(),
      rawCsvOrText: raw,
      statementDate: this.statementDate(),
      statementEndingBalance: Number(this.statementEndingBalance())
    };

    this.bankRecService.autoMatch(req).subscribe({
      next: (res) => {
        this.isAutoMatching.set(false);
        this.closeImportModal();
        this.transactions.set(res.updatedTransactions);
        this.successMessage.set(res.message);
      },
      error: (err) => {
        this.isAutoMatching.set(false);
        this.errorMessage.set(this.langService.t('accounting.bankRec.alerts.autoMatchFailed') + (err.error?.description || err.message));
      }
    });
  }

  // Quick Adjustment Entry Actions
  openAdjustmentModal(suggestedAmount?: number): void {
    if (!this.selectedAccountId()) {
      this.errorMessage.set(this.langService.t('accounting.bankRec.alerts.selectAccountFirst'));
      return;
    }

    const diff = Math.abs(suggestedAmount !== undefined ? suggestedAmount : this.difference());
    this.adjAmount.set(diff > 0 ? diff : 50);
    this.adjDate.set(this.statementDate());
    this.adjReference.set(`BANK-FEE-${new Date().getTime().toString().substring(7)}`);
    this.adjDescriptionAr.set('عمولات ومصروفات بنكية - كشف الحساب');
    this.adjDescriptionEn.set(this.translator.translateArabicToEnglish('عمولات ومصروفات بنكية - كشف الحساب'));

    // Default counter account: 54 or 531
    const chargeAcc = this.allPostableAccounts().find(a => 
      a.accountCode.startsWith('54') || a.accountCode.startsWith('531') || a.nameAr.includes('بنك') || a.nameAr.includes('عمول')
    );
    if (chargeAcc) {
      this.adjCounterAccountId.set(chargeAcc.id);
    } else if (this.allPostableAccounts().length > 0) {
      this.adjCounterAccountId.set(this.allPostableAccounts()[0].id);
    }

    this.showAdjustmentModal.set(true);
  }

  closeAdjustmentModal(): void {
    this.showAdjustmentModal.set(false);
  }

  onAdjDescriptionArChange(val: string): void {
    this.adjDescriptionAr.set(val);
    this.adjDescriptionEn.set(this.translator.translateArabicToEnglish(val));
  }

  executeAdjustment(): void {
    const accId = this.selectedAccountId();
    const counterId = this.adjCounterAccountId();
    const amt = Number(this.adjAmount());

    if (!accId || !counterId || amt <= 0) {
      this.errorMessage.set(this.langService.t('accounting.bankRec.alerts.adjFieldsRequired'));
      return;
    }

    this.isSavingAdjustment.set(true);
    this.errorMessage.set('');

    const companyId = this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
    const req = {
      companyId,
      bankAccountId: accId,
      counterAccountId: counterId,
      amount: amt,
      isExpenseOrWithdrawal: this.adjType() === 'charge',
      entryDate: this.adjDate(),
      description: this.adjDescriptionAr(),
      referenceNumber: this.adjReference()
    };

    this.bankRecService.createAdjustment(req).subscribe({
      next: (res) => {
        this.isSavingAdjustment.set(false);
        this.closeAdjustmentModal();
        this.successMessage.set(this.langService.t('accounting.bankRec.alerts.adjPostedSuccess', { entryNumber: res.entryNumber || 'new' }));
        this.loadWorkspace();
      },
      error: (err) => {
        this.isSavingAdjustment.set(false);
        this.errorMessage.set(this.langService.t('accounting.bankRec.alerts.adjPostFailed') + (err.error?.description || err.message));
      }
    });
  }

  // Official Reconciliation Statement Modal
  openStatementModal(): void {
    this.showStatementModal.set(true);
  }

  closeStatementModal(): void {
    this.showStatementModal.set(false);
  }

  printStatement(): void {
    window.print();
  }

  exportStatementCsv(): void {
    const account = this.selectedAccount();
    let csv = '\uFEFF'; // BOM
    csv += 'مذكرة التسوية البنكية المعتمدة (Bank Reconciliation Statement - IAS 7)\r\n';
    csv += `الشركة: ${this.companyContext.activeCompany()?.nameAr || 'نظام الربان'}\r\n`;
    csv += `الحساب البنكي: ${account ? account.accountCode + ' - ' + account.accountNameAr : ''}\r\n`;
    csv += `تاريخ الكشف: ${this.statementDate()}\r\n\r\n`;

    csv += 'البند,المبلغ (ر.س)\r\n';
    csv += `رصيد كشف الحساب البنكي الفعلي,${this.statementEndingBalance()}\r\n`;
    csv += `يُضاف: إيداعات بالطريق لم تقيد في البنك (${this.depositsInTransitCount()} حركة),+${this.unclearedDeposits()}\r\n`;
    csv += `يُخصم: شيكات مسحوبة معلقة لم تصرف (${this.outstandingChecksCount()} حركة),-${this.unclearedWithdrawals()}\r\n`;
    csv += `رصيد البنك الفعلي المعدل,${this.adjustedBankBalance()}\r\n\r\n`;

    csv += `الرصيد الدفتري للنظام,${this.bookBalance()}\r\n`;
    csv += `الرصيد الدفتري المعدل,${this.bookBalance()}\r\n\r\n`;
    csv += `الفارق النهائي غير المسوى,${this.difference()}\r\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BankReconciliation_${account?.accountCode || 'Bank'}_${this.statementDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
