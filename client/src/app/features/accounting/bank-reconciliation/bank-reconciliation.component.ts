import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BankReconciliationService,
  BankAccountSummary,
  BankReconciliationTransaction,
  BankReconciliationWorkspace,
  BankReconciliationResult
} from '../../../core/services/bank-reconciliation.service';
import { CompanyContextService } from '../../../core/services/company-context.service';

@Component({
  selector: 'app-bank-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './bank-reconciliation.component.html',
  styleUrls: ['./bank-reconciliation.component.css']
})
export class BankReconciliationComponent implements OnInit {
  // State Signals
  bankAccounts = signal<BankAccountSummary[]>([]);
  selectedAccountId = signal<string>('');
  statementDate = signal<string>(new Date().toISOString().substring(0, 10));
  statementEndingBalance = signal<number>(0);
  notes = signal<string>('');

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Transactions list
  transactions = signal<BankReconciliationTransaction[]>([]);
  activeFilter = signal<'all' | 'matched' | 'unmatched'>('all');
  searchQuery = signal<string>('');

  // History Drawer state
  showHistory = signal<boolean>(false);
  historyList = signal<BankReconciliationResult[]>([]);
  isLoadingHistory = signal<boolean>(false);

  // Computed Financial Metrics
  selectedAccount = computed(() => {
    return this.bankAccounts().find(a => a.accountId === this.selectedAccountId()) || null;
  });

  filteredTransactions = computed(() => {
    const list = this.transactions();
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter(t => {
      // Filter tab
      if (filter === 'matched' && !t.isMatched) return false;
      if (filter === 'unmatched' && t.isMatched) return false;

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

  bookBalance = computed(() => {
    return this.transactions().reduce((sum, t) => sum + ((t.debit || 0) - (t.credit || 0)), 0);
  });

  adjustedBankBalance = computed(() => {
    return Number(this.statementEndingBalance()) + this.unclearedDeposits() - this.unclearedWithdrawals();
  });

  difference = computed(() => {
    return Math.round((this.adjustedBankBalance() - this.bookBalance()) * 100) / 100;
  });

  isBalanced = computed(() => {
    return Math.abs(this.difference()) < 0.005;
  });

  matchedCount = computed(() => this.transactions().filter(t => t.isMatched).length);
  unmatchedCount = computed(() => this.transactions().filter(t => !t.isMatched).length);

  constructor(
    private bankRecService: BankReconciliationService,
    private companyContext: CompanyContextService
  ) {}

  ngOnInit(): void {
    this.loadBankAccounts();
  }

  loadBankAccounts(): void {
    const companyId = this.companyContext.activeCompany()?.id;
    this.isLoading.set(true);
    this.bankRecService.getAccounts(companyId).subscribe({
      next: (accounts) => {
        this.bankAccounts.set(accounts);
        if (accounts.length > 0) {
          this.selectedAccountId.set(accounts[0].accountId);
          this.loadWorkspace();
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.errorMessage.set('فشل تحميل حسابات البنوك: ' + (err.error?.message || err.message));
        this.isLoading.set(false);
      }
    });
  }

  onAccountChanged(accountId: string): void {
    this.selectedAccountId.set(accountId);
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
        this.transactions.set(ws.transactions || []);
        if (ws.statementEndingBalance && this.statementEndingBalance() === 0) {
          this.statementEndingBalance.set(ws.statementEndingBalance);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('فشل تحميل بيانات التسوية: ' + (err.error?.description || err.message));
        this.isLoading.set(false);
      }
    });
  }

  toggleItemMatch(tx: BankReconciliationTransaction): void {
    tx.isMatched = !tx.isMatched;
    // Trigger reactivity by resetting transactions array
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
      this.errorMessage.set('لا يمكن اعتماد التسوية البنكية إلا عندما يكون الفرق متطابقاً تماماً (0.00 ريال).');
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
      notes: this.notes(),
      finalize
    };

    this.bankRecService.save(req).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        const actionText = finalize ? 'تم اعتماد التسوية البنكية بنجاح' : 'تم حفظ مسودة التسوية البنكية بنجاح';
        this.successMessage.set(`${actionText} برقم [${res.reconciliationNumber}].`);
        this.loadWorkspace();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set('فشل حفظ التسوية: ' + (err.error?.description || err.message));
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
      error: (err) => {
        this.isLoadingHistory.set(false);
      }
    });
  }

  // Import Statement & Auto-Match State
  showImportModal = signal<boolean>(false);
  rawStatementText = signal<string>('');
  isAutoMatching = signal<boolean>(false);

  openImportModal(): void {
    if (!this.selectedAccountId()) {
      this.errorMessage.set('يرجى اختيار حساب بنكي أولاً لبدء استيراد الكشف');
      return;
    }
    this.showImportModal.set(true);
    this.rawStatementText.set('');
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
  }

  executeAutoMatch(): void {
    const raw = this.rawStatementText().trim();
    if (!raw) {
      this.errorMessage.set('يرجى لصق بيانات كشف الحساب البنكي');
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
        this.errorMessage.set('فشل المطابقة الآلية: ' + (err.error?.description || err.message));
      }
    });
  }
}
