import { 
  Component, 
  OnInit, 
  OnDestroy, 
  HostListener, 
  inject, 
  signal, 
  computed, 
  ElementRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  JournalEntryService, 
  CreateJournalEntryRequest 
} from '../../../core/services/journal-entry.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { FinancialSettingsService, CostCenter } from '../../../core/services/financial-settings.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { ModulesSettingsService } from '../../../core/services/modules-settings.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { AccountDto } from '../../../core/models/account.model';
import Swal from 'sweetalert2';

export interface JournalLineRow {
  id: string;
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  costCenterId?: string;
  description: string;
  debit: number | null;
  credit: number | null;
  // UI dropdown states
  isPickerOpen?: boolean;
  searchFilter?: string;
}

export interface LocalDraftState {
  savedAt: string;
  savedAtFormatted: string;
  companyId?: string;
  header: {
    entryDate: string;
    entryType: number;
    referenceNumber: string;
    descriptionAr: string;
    descriptionEn: string;
  };
  lines: {
    accountId: string;
    accountCode: string;
    accountNameAr: string;
    accountNameEn: string;
    costCenterId?: string;
    description: string;
    debit: number | null;
    credit: number | null;
  }[];
}

@Component({
  selector: 'app-journal-entry-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './journal-entry-create.component.html',
  styleUrls: ['./journal-entry-create.component.scss']
})
export class JournalEntryCreateComponent implements OnInit, OnDestroy {
  router = inject(Router);
  journalService = inject(JournalEntryService);
  chartService = inject(ChartOfAccountsService);
  settingsService = inject(FinancialSettingsService);
  companyContext = inject(CompanyContextService);
  modulesSettings = inject(ModulesSettingsService);
  langService = inject(LanguageService);
  translator = inject(AccountingTranslatorService);
  private elementRef = inject(ElementRef);

  // Smart Auto-Translation States
  primaryInputText = signal<string>('');
  isAutoTranslateActive = signal<boolean>(true);
  detectedLanguage = signal<'ar' | 'en'>('ar');
  showManualTranslation = signal<boolean>(false);

  // Loading & Submitting states
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);

  // Connectivity & Auto-save states
  isOnline = signal<boolean>(navigator.onLine);
  autoSaveStatus = signal<'saved' | 'saving' | 'offline' | 'idle'>('idle');
  lastSavedTime = signal<string>('');
  hasRecoveredDraft = signal<boolean>(false);
  recoveredDraftInfo = signal<{ time: string; count: number } | null>(null);

  // Excel Paste Modal state
  showExcelModal = signal<boolean>(false);
  excelRawText = '';
  excelPreviewCount = signal<number>(0);

  // Shortcuts Help Modal
  showShortcutsModal = signal<boolean>(false);

  // Reference Data
  postableAccounts: AccountDto[] = [];
  costCenters: CostCenter[] = [];

  // Entry Header Model
  entryModel = {
    entryDate: new Date().toISOString().substring(0, 10),
    entryType: 1, // 1: Daily, 2: Opening, 3: Adjustment, 4: Closing
    referenceNumber: '',
    descriptionAr: '',
    descriptionEn: ''
  };

  // Entry Lines
  lines = signal<JournalLineRow[]>([
    this.createBlankLine(),
    this.createBlankLine()
  ]);

  // Debounce timer for auto-save
  private autoSaveTimer: any = null;

  // Window listeners references
  private onlineListener = () => {
    this.isOnline.set(true);
    this.triggerAutoSave();
  };
  private offlineListener = () => {
    this.isOnline.set(false);
    this.autoSaveStatus.set('offline');
    this.triggerAutoSave(); // Save locally immediately
  };
  private beforeUnloadListener = (e: BeforeUnloadEvent) => {
    this.persistDraftImmediately();
  };

  // Computed Totals & Validation
  totalDebit = computed(() => {
    const sum = this.lines().reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
    return Math.round(sum * 100) / 100;
  });

  totalCredit = computed(() => {
    const sum = this.lines().reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
    return Math.round(sum * 100) / 100;
  });

  difference = computed(() => {
    const diff = Math.abs(this.totalDebit() - this.totalCredit());
    return Math.round(diff * 100) / 100;
  });

  isBalanced = computed(() => {
    const deb = this.totalDebit();
    const cred = this.totalCredit();
    return deb > 0 && Math.abs(deb - cred) < 0.005;
  });

  validLinesCount = computed(() => {
    return this.lines().filter(l => l.accountId && ((l.debit && l.debit > 0) || (l.credit && l.credit > 0))).length;
  });

  ngOnInit(): void {
    // 1. Setup Network Listeners
    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
    window.addEventListener('beforeunload', this.beforeUnloadListener);

    // 2. Load Chart of Accounts & Cost Centers
    this.loadReferenceData();

    // 3. Check for Saved Local Draft
    this.checkForLocalDraft();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineListener);
    window.removeEventListener('offline', this.offlineListener);
    window.removeEventListener('beforeunload', this.beforeUnloadListener);
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
  }

  // Keyboard Shortcuts across the entire page
  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent) {
    // Alt + N or F2: Add new line
    if ((event.altKey && event.key.toLowerCase() === 'n') || event.key === 'F2') {
      event.preventDefault();
      this.addLine();
      return;
    }

    // Alt + B: Auto-balance
    if (event.altKey && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      this.autoBalance();
      return;
    }

    // Alt + S: Save as draft
    if (event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.submitEntry(false);
      return;
    }

    // Alt + P: Post entry
    if (event.altKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      if (this.isBalanced()) {
        this.submitEntry(true);
      }
      return;
    }

    // Alt + E: Excel Import
    if (event.altKey && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      this.openExcelModal();
      return;
    }

    // Escape: Close pickers/modals
    if (event.key === 'Escape') {
      this.closeAllPickers();
      this.showExcelModal.set(false);
      this.showShortcutsModal.set(false);
    }
  }

  // Close open dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.account-search-cell')) {
      this.closeAllPickers();
    }
  }

  trackByLineId(index: number, line: JournalLineRow): string {
    return line.id;
  }

  createBlankLine(description: string = ''): JournalLineRow {
    return {
      id: 'row_' + Math.random().toString(36).substring(2, 9),
      accountId: '',
      accountCode: '',
      accountNameAr: '',
      accountNameEn: '',
      costCenterId: undefined,
      description: description || this.entryModel.descriptionAr || '',
      debit: null,
      credit: null,
      isPickerOpen: false,
      searchFilter: ''
    };
  }

  loadReferenceData() {
    this.isLoading.set(true);
    const companyId = this.companyContext.activeCompany()?.id;

    // Load accounts tree
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
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    // Load cost centers
    this.settingsService.getOverview(companyId).subscribe({
      next: (overview) => {
        this.costCenters = overview.costCenters || [];
      }
    });
  }

  // -------------------------------------------------------------
  // Smart Auto-Save & Offline Recovery Engine
  // -------------------------------------------------------------
  private getDraftStorageKey(): string {
    const companyId = this.companyContext.activeCompany()?.id || 'default_tenant';
    return `alrobban_journal_draft_${companyId}`;
  }

  triggerAutoSave() {
    this.autoSaveStatus.set('saving');
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.persistDraftImmediately();
    }, 450);
  }

  private persistDraftImmediately() {
    try {
      const validRows = this.lines().map(l => ({
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountNameAr: l.accountNameAr,
        accountNameEn: l.accountNameEn,
        costCenterId: l.costCenterId,
        description: l.description,
        debit: l.debit,
        credit: l.credit
      }));

      // Only save if there is content
      const hasContent = this.entryModel.descriptionAr.trim() || 
                         this.entryModel.referenceNumber.trim() || 
                         validRows.some(r => r.accountId || r.debit || r.credit);

      if (!hasContent) {
        this.autoSaveStatus.set('idle');
        return;
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString(this.langService.currentLang() === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const draftState: LocalDraftState = {
        savedAt: now.toISOString(),
        savedAtFormatted: timeStr,
        companyId: this.companyContext.activeCompany()?.id,
        header: { ...this.entryModel },
        lines: validRows
      };

      localStorage.setItem(this.getDraftStorageKey(), JSON.stringify(draftState));
      this.lastSavedTime.set(timeStr);
      this.autoSaveStatus.set(this.isOnline() ? 'saved' : 'offline');
    } catch (err) {
      console.warn('Could not auto-save to localStorage:', err);
    }
  }

  checkForLocalDraft() {
    try {
      const raw = localStorage.getItem(this.getDraftStorageKey());
      if (!raw) return;

      const draft: LocalDraftState = JSON.parse(raw);
      if (!draft || !draft.lines || draft.lines.length === 0) return;

      // Check if draft has actual data
      const hasMeaningfulData = draft.header?.descriptionAr || 
                                draft.lines.some(l => l.accountId || (l.debit && l.debit > 0) || (l.credit && l.credit > 0));

      if (hasMeaningfulData) {
        // Restore immediately and notify with elegant banner
        this.entryModel = {
          entryDate: draft.header.entryDate || new Date().toISOString().substring(0, 10),
          entryType: draft.header.entryType || 1,
          referenceNumber: draft.header.referenceNumber || '',
          descriptionAr: draft.header.descriptionAr || '',
          descriptionEn: draft.header.descriptionEn || ''
        };

        const restoredPrimaryText = draft.header.descriptionAr || draft.header.descriptionEn || '';
        this.primaryInputText.set(restoredPrimaryText);
        if (restoredPrimaryText) {
          this.detectedLanguage.set(/[\u0600-\u06FF]/.test(restoredPrimaryText) ? 'ar' : 'en');
        }

        const restoredLines: JournalLineRow[] = draft.lines.map(l => ({
          id: 'row_' + Math.random().toString(36).substring(2, 9),
          accountId: l.accountId || '',
          accountCode: l.accountCode || '',
          accountNameAr: l.accountNameAr || '',
          accountNameEn: l.accountNameEn || '',
          costCenterId: l.costCenterId,
          description: l.description || '',
          debit: l.debit,
          credit: l.credit,
          isPickerOpen: false,
          searchFilter: ''
        }));

        this.lines.set(restoredLines.length >= 2 ? restoredLines : [...restoredLines, this.createBlankLine()]);
        this.hasRecoveredDraft.set(true);
        this.recoveredDraftInfo.set({
          time: draft.savedAtFormatted || '',
          count: restoredLines.length
        });
        this.lastSavedTime.set(draft.savedAtFormatted || '');
        this.autoSaveStatus.set('saved');
      }
    } catch (e) {
      console.warn('Error reading draft from localStorage:', e);
    }
  }

  discardRecoveredDraft() {
    const isAr = this.langService.currentLang() === 'ar';
    Swal.fire({
      title: this.langService.t('accounting.journalEntryCreate.alerts.discardDraftTitle'),
      text: this.langService.t('accounting.journalEntryCreate.alerts.discardDraftText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.langService.t('accounting.journalEntryCreate.alerts.discardConfirm'),
      cancelButtonText: this.langService.t('common.cancel')
    }).then((res) => {
      if (res.isConfirmed) {
        localStorage.removeItem(this.getDraftStorageKey());
        this.hasRecoveredDraft.set(false);
        this.recoveredDraftInfo.set(null);
        this.resetEntryForm();
      }
    });
  }

  dismissRecoveryBanner() {
    this.hasRecoveredDraft.set(false);
  }

  resetEntryForm() {
    this.entryModel = {
      entryDate: new Date().toISOString().substring(0, 10),
      entryType: 1,
      referenceNumber: '',
      descriptionAr: '',
      descriptionEn: ''
    };
    this.primaryInputText.set('');
    this.showManualTranslation.set(false);
    this.lines.set([this.createBlankLine(), this.createBlankLine()]);
    this.autoSaveStatus.set('idle');
    this.lastSavedTime.set('');
  }

  // -------------------------------------------------------------
  // Smart Bidirectional Auto-Translation Engine
  // -------------------------------------------------------------
  onPrimaryNarrationChange(value: string) {
    this.primaryInputText.set(value);
    const trimmed = (value || '').trim();
    if (!trimmed) {
      this.entryModel.descriptionAr = '';
      this.entryModel.descriptionEn = '';
      this.triggerAutoSave();
      return;
    }

    const hasArabic = /[\u0600-\u06FF]/.test(trimmed);
    this.detectedLanguage.set(hasArabic ? 'ar' : 'en');

    if (hasArabic) {
      this.entryModel.descriptionAr = value;
      if (this.isAutoTranslateActive()) {
        this.entryModel.descriptionEn = this.translator.translateArabicToEnglish(trimmed);
      }
    } else {
      this.entryModel.descriptionEn = value;
      if (this.isAutoTranslateActive()) {
        this.entryModel.descriptionAr = this.translator.translateEnglishToArabic(trimmed);
      }
    }

    this.triggerAutoSave();
  }

  toggleManualTranslation() {
    this.showManualTranslation.update(v => !v);
  }

  onManualTranslationChange(value: string) {
    if (this.detectedLanguage() === 'ar') {
      this.entryModel.descriptionEn = value;
    } else {
      this.entryModel.descriptionAr = value;
    }
    this.triggerAutoSave();
  }

  toggleAutoTranslate() {
    this.isAutoTranslateActive.update(v => !v);
    if (this.isAutoTranslateActive()) {
      this.onPrimaryNarrationChange(this.primaryInputText());
    }
  }

  // -------------------------------------------------------------
  // Fast Line & Grid Operations
  // -------------------------------------------------------------
  addLine() {
    const currentLines = this.lines();
    const lastLine = currentLines[currentLines.length - 1];
    const defaultDesc = lastLine?.description || this.entryModel.descriptionAr || '';
    const newLine = this.createBlankLine(defaultDesc);

    this.lines.update(list => [...list, newLine]);
    this.triggerAutoSave();

    // Automatically open account picker for the newly added line and focus search input
    const newIdx = this.lines().length - 1;
    setTimeout(() => {
      const addedRow = this.lines()[newIdx];
      if (addedRow) {
        this.openAccountPicker(addedRow);
      }
    }, 60);
  }

  duplicateLine(index: number) {
    const lineToCopy = this.lines()[index];
    if (!lineToCopy) return;

    const copy: JournalLineRow = {
      ...lineToCopy,
      id: 'row_' + Math.random().toString(36).substring(2, 9),
      isPickerOpen: false,
      searchFilter: ''
    };

    this.lines.update(list => {
      const copyList = [...list];
      copyList.splice(index + 1, 0, copy);
      return copyList;
    });

    this.triggerAutoSave();
  }

  removeLine(index: number) {
    if (this.lines().length <= 2) {
      const isAr = this.langService.currentLang() === 'ar';
      Swal.fire(this.langService.t('common.warning'), this.langService.t('accounting.journalEntryCreate.alerts.minTwoLines'), 'info');
      return;
    }

    this.lines.update(list => list.filter((_, i) => i !== index));
    this.triggerAutoSave();
  }

  moveLineUp(index: number) {
    if (index === 0) return;
    this.lines.update(list => {
      const arr = [...list];
      const temp = arr[index];
      arr[index] = arr[index - 1];
      arr[index - 1] = temp;
      return arr;
    });
    this.triggerAutoSave();
  }

  moveLineDown(index: number) {
    if (index === this.lines().length - 1) return;
    this.lines.update(list => {
      const arr = [...list];
      const temp = arr[index];
      arr[index] = arr[index + 1];
      arr[index + 1] = temp;
      return arr;
    });
    this.triggerAutoSave();
  }

  // Mutual exclusion: Entering Debit clears Credit
  onDebitChange(line: JournalLineRow) {
    if (line.debit !== null && line.debit > 0) {
      line.credit = null;
    }
    this.lines.update(list => [...list]);
    this.triggerAutoSave();
  }

  // Mutual exclusion: Entering Credit clears Debit
  onCreditChange(line: JournalLineRow) {
    if (line.credit !== null && line.credit > 0) {
      line.debit = null;
    }
    this.lines.update(list => [...list]);
    this.triggerAutoSave();
  }

  // Fast Enter key navigation from Debit field
  onDebitKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const isLastRow = index === this.lines().length - 1;
      if (isLastRow) {
        this.addLine();
      } else {
        const nextLine = this.lines()[index + 1];
        if (nextLine && !nextLine.accountId) {
          this.openAccountPicker(nextLine);
        } else {
          const nextDebit = document.getElementById(`debit-input-${index + 1}`) as HTMLInputElement;
          nextDebit?.focus();
        }
      }
    }
  }

  // Rapid Enter/Tab key navigation from Credit field
  onCreditKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
      const isLastRow = index === this.lines().length - 1;
      if (isLastRow) {
        event.preventDefault();
        this.addLine();
      } else {
        event.preventDefault();
        const nextLine = this.lines()[index + 1];
        if (nextLine && !nextLine.accountId) {
          this.openAccountPicker(nextLine);
        } else {
          const nextDebit = document.getElementById(`debit-input-${index + 1}`) as HTMLInputElement;
          nextDebit?.focus();
        }
      }
    }
  }

  // Smart Auto-Balance Engine
  autoBalance() {
    const isAr = this.langService.currentLang() === 'ar';
    const deb = this.totalDebit();
    const cred = this.totalCredit();

    if (deb === 0 && cred === 0) {
      Swal.fire(
        this.langService.t('accounting.journalEntryCreate.alerts.note'),
        this.langService.t('accounting.journalEntryCreate.alerts.enterValuesBeforeBalance'),
        'info'
      );
      return;
    }

    const diff = Math.round(Math.abs(deb - cred) * 100) / 100;
    if (diff < 0.005) {
      Swal.fire({
        icon: 'success',
        title: this.langService.t('accounting.journalEntryCreate.alerts.alreadyBalancedTitle'),
        text: this.langService.t('accounting.journalEntryCreate.alerts.alreadyBalancedText'),
        timer: 1600,
        showConfirmButton: false
      });
      return;
    }

    const currentLines = [...this.lines()];
    const lastRow = currentLines[currentLines.length - 1];

    if (deb > cred) {
      // Need Credit = diff
      // Check if last row is empty or has debit/credit 0
      if (!lastRow.debit && !lastRow.credit) {
        lastRow.credit = diff;
        lastRow.debit = null;
      } else {
        // Add new balancing line
        const newLine = this.createBlankLine(lastRow.description || this.entryModel.descriptionAr);
        newLine.credit = diff;
        newLine.debit = null;
        currentLines.push(newLine);
      }
    } else {
      // Need Debit = diff
      if (!lastRow.debit && !lastRow.credit) {
        lastRow.debit = diff;
        lastRow.credit = null;
      } else {
        const newLine = this.createBlankLine(lastRow.description || this.entryModel.descriptionAr);
        newLine.debit = diff;
        newLine.credit = null;
        currentLines.push(newLine);
      }
    }

    this.lines.set(currentLines);
    this.triggerAutoSave();

    Swal.fire({
      icon: 'success',
      title: this.langService.t('accounting.journalEntryCreate.alerts.autoBalancedSuccessTitle'),
      text: this.langService.t('accounting.journalEntryCreate.alerts.autoBalancedSuccessText', { diff }),
      timer: 1600,
      showConfirmButton: false
    });
  }

  // Auto-propagate General Narration to blank lines
  propagateGeneralDescription() {
    const desc = this.primaryInputText().trim() || this.entryModel.descriptionAr.trim() || this.entryModel.descriptionEn.trim();
    if (!desc) return;
    this.lines.update(list => {
      return list.map(l => {
        if (!l.description.trim()) {
          return { ...l, description: desc };
        }
        return l;
      });
    });
    this.triggerAutoSave();
  }

  // -------------------------------------------------------------
  // Fast Searchable Account Selector (Inline)
  // -------------------------------------------------------------
  selectedAccountCategory = signal<number | 'all'>('all');
  highlightedAccountIndex = signal<number>(0);
  autoSelectExactMatch = signal<boolean>(true);
  private exactMatchTimer: any = null;

  toggleAutoSelectExactMatch() {
    this.autoSelectExactMatch.update(v => !v);
  }

  isExactMatch(filter: string = ''): boolean {
    if (!filter || !filter.trim()) return false;
    const q = filter.trim();
    return this.postableAccounts.some(a => a.accountCode === q);
  }

  accountCategories: { id: number | 'all'; labelAr: string; labelEn: string; icon: string }[] = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All', icon: 'pi-th-large' },
    { id: 1, labelAr: '1 - الأصول', labelEn: 'Assets', icon: 'pi-wallet' },
    { id: 2, labelAr: '2 - الالتزامات', labelEn: 'Liabilities', icon: 'pi-credit-card' },
    { id: 3, labelAr: '3 - حقوق الملكية', labelEn: 'Equity', icon: 'pi-building' },
    { id: 4, labelAr: '4 - الإيرادات', labelEn: 'Revenue', icon: 'pi-arrow-down-left' },
    { id: 5, labelAr: '5 - المصروفات', labelEn: 'Expenses', icon: 'pi-arrow-up-right' }
  ];

  setCategoryFilter(catId: number | 'all') {
    this.selectedAccountCategory.set(catId);
    this.highlightedAccountIndex.set(0);
  }

  isNearBottom(index: number): boolean {
    return this.lines().length >= 6 && index >= this.lines().length - 2;
  }

  clearSelectedAccount(line: JournalLineRow, event: MouseEvent) {
    event.stopPropagation();
    line.accountId = '';
    line.accountCode = '';
    line.accountNameAr = '';
    line.accountNameEn = '';
    line.searchFilter = '';
    this.triggerAutoSave();
  }

  openAccountPicker(line: JournalLineRow) {
    this.closeAllPickers(line);
    line.isPickerOpen = true;
    line.searchFilter = '';
    this.selectedAccountCategory.set('all');
    this.highlightedAccountIndex.set(0);

    setTimeout(() => {
      const inputs = this.elementRef.nativeElement.querySelectorAll('.account-search-input');
      inputs.forEach((input: HTMLInputElement) => {
        if (input.offsetParent !== null) {
          input.focus();
        }
      });
    }, 50);
  }

  closeAllPickers(except?: JournalLineRow) {
    this.lines().forEach(l => {
      if (l !== except) {
        l.isPickerOpen = false;
      }
    });
  }

  onAccountFilterChange(line: JournalLineRow, rowIndex: number) {
    this.highlightedAccountIndex.set(0);

    if (this.exactMatchTimer) {
      clearTimeout(this.exactMatchTimer);
      this.exactMatchTimer = null;
    }

    if (!this.autoSelectExactMatch()) return;

    const query = (line.searchFilter || '').trim();
    if (!query) return;

    // Instant check: If exact account code match, auto-select after 250ms
    const exactMatch = this.postableAccounts.find(a => a.accountCode === query);
    if (exactMatch) {
      this.exactMatchTimer = setTimeout(() => {
        this.selectAccount(line, exactMatch, rowIndex);
      }, 250);
      return;
    }

    // If query is at least 4 characters and filters to exactly 1 postable account, auto-select
    const filtered = this.getFilteredAccounts(query);
    if (filtered.length === 1 && query.length >= 4) {
      this.exactMatchTimer = setTimeout(() => {
        this.selectAccount(line, filtered[0], rowIndex);
      }, 350);
    }
  }

  selectAccount(line: JournalLineRow, account: AccountDto, rowIndex?: number) {
    if (this.exactMatchTimer) {
      clearTimeout(this.exactMatchTimer);
      this.exactMatchTimer = null;
    }

    line.accountId = account.id;
    line.accountCode = account.accountCode;
    line.accountNameAr = account.nameAr;
    line.accountNameEn = account.nameEn;
    line.isPickerOpen = false;
    line.searchFilter = '';
    this.lines.update(list => [...list]);
    this.triggerAutoSave();

    // After selecting account, move focus directly to Cost Center as requested
    if (rowIndex !== undefined && rowIndex !== null) {
      setTimeout(() => {
        const costCenterEl = document.getElementById(`cost-center-${rowIndex}`) as HTMLElement;
        if (costCenterEl) {
          costCenterEl.focus();
        } else {
          const descInput = document.getElementById(`desc-input-${rowIndex}`) as HTMLInputElement;
          descInput?.focus();
        }
      }, 50);
    }
  }

  // Fast Enter key navigation from Cost Center to Description
  onCostCenterKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const descInput = document.getElementById(`desc-input-${index}`) as HTMLInputElement;
      if (descInput) {
        descInput.focus();
        descInput.select?.();
      }
    }
  }

  // Fast Enter key navigation from Line Description to Debit/Credit
  onDescKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const currentLine = this.lines()[index];
      const account = this.postableAccounts.find(a => a.id === currentLine?.accountId);
      const isCreditNature = account?.accountNature === 2;
      const targetId = isCreditNature ? `credit-input-${index}` : `debit-input-${index}`;
      const targetInput = document.getElementById(targetId) as HTMLInputElement;
      if (targetInput) {
        targetInput.focus();
        targetInput.select?.();
      }
    }
  }

  onAccountSearchKeydown(event: KeyboardEvent, line: JournalLineRow, rowIndex: number) {
    if (this.exactMatchTimer) {
      clearTimeout(this.exactMatchTimer);
      this.exactMatchTimer = null;
    }

    const currentFilter = (line.searchFilter || '').trim();
    const list = this.getFilteredAccounts(currentFilter);

    // Fast keyboard selection: Enter or Tab
    if (event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault();
      if (list.length > 0) {
        const exactMatch = list.find(a => a.accountCode === currentFilter);
        const chosen = exactMatch || list[this.highlightedAccountIndex()] || list[0];
        this.selectAccount(line, chosen, rowIndex);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (list.length > 0) {
        const nextIdx = (this.highlightedAccountIndex() + 1) % list.length;
        this.highlightedAccountIndex.set(nextIdx);
        this.scrollHighlightedIntoView();
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.length > 0) {
        const prevIdx = (this.highlightedAccountIndex() - 1 + list.length) % list.length;
        this.highlightedAccountIndex.set(prevIdx);
        this.scrollHighlightedIntoView();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      line.isPickerOpen = false;
      return;
    }
  }

  private scrollHighlightedIntoView() {
    setTimeout(() => {
      const activeEl = this.elementRef.nativeElement.querySelector('.dropdown-item.keyboard-highlight');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 20);
  }

  getFilteredAccounts(filter: string = ''): AccountDto[] {
    let list = this.postableAccounts;
    const cat = this.selectedAccountCategory();
    if (cat !== 'all') {
      list = list.filter(a => a.accountType === cat);
    }
    if (!filter || !filter.trim()) {
      return list.slice(0, 50);
    }
    const q = this.normalizeArabic(filter.trim().toLowerCase());
    return list.filter(a => {
      const codeMatch = a.accountCode.toLowerCase().includes(q);
      const nameAr = this.normalizeArabic(a.nameAr.toLowerCase());
      const nameEn = (a.nameEn || '').toLowerCase();
      return codeMatch || nameAr.includes(q) || nameEn.includes(q);
    }).slice(0, 50);
  }

  private normalizeArabic(text: string): string {
    return text
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '');
  }

  // -------------------------------------------------------------
  // Excel / CSV Rapid Paste Importer
  // -------------------------------------------------------------
  openExcelModal() {
    this.excelRawText = '';
    this.excelPreviewCount.set(0);
    this.showExcelModal.set(true);
  }

  closeExcelModal() {
    this.showExcelModal.set(false);
  }

  onExcelTextChange() {
    if (!this.excelRawText.trim()) {
      this.excelPreviewCount.set(0);
      return;
    }
    const lines = this.excelRawText.split(/\r?\n/).filter(l => l.trim().length > 0);
    this.excelPreviewCount.set(lines.length);
  }

  importExcelData() {
    const isAr = this.langService.currentLang() === 'ar';
    if (!this.excelRawText.trim()) {
      Swal.fire(this.langService.t('common.warning'), this.langService.t('accounting.journalEntryCreate.alerts.pasteExcelFirst'), 'warning');
      return;
    }

    const rawLines = this.excelRawText.split(/\r?\n/).filter(l => l.trim().length > 0);
    const parsedRows: JournalLineRow[] = [];
    let matchedCount = 0;

    for (const rawLine of rawLines) {
      // Split by tab (Excel format) or comma / semicolon
      let cells = rawLine.includes('\t') 
        ? rawLine.split('\t') 
        : (rawLine.includes(';') ? rawLine.split(';') : rawLine.split(','));
      cells = cells.map(c => c.trim().replace(/^["']|["']$/g, ''));

      if (cells.length === 0) continue;

      // Detect Account Code, Debit, Credit, Description
      let accountCode = '';
      let debit: number | null = null;
      let credit: number | null = null;
      let desc = '';

      // Pattern 1: [AccountCode, Description, Debit, Credit]
      // Pattern 2: [AccountCode, Debit, Credit, Description]
      for (let i = 0; i < cells.length; i++) {
        const val = cells[i];
        const numVal = parseFloat(val.replace(/,/g, ''));

        if (i === 0 && val) {
          accountCode = val;
        } else if (!isNaN(numVal) && numVal > 0 && debit === null && credit === null) {
          debit = numVal;
        } else if (!isNaN(numVal) && numVal > 0 && debit !== null && credit === null) {
          credit = numVal;
        } else if (isNaN(numVal) && val.length > 1) {
          desc += (desc ? ' - ' : '') + val;
        }
      }

      // Find matching account in Chart of Accounts
      const matchedAcc = this.postableAccounts.find(a => 
        a.accountCode.trim().toLowerCase() === accountCode.toLowerCase() ||
        a.nameAr.trim().toLowerCase() === accountCode.toLowerCase()
      );

      if (matchedAcc) {
        matchedCount++;
      }

      parsedRows.push({
        id: 'row_' + Math.random().toString(36).substring(2, 9),
        accountId: matchedAcc ? matchedAcc.id : '',
        accountCode: matchedAcc ? matchedAcc.accountCode : accountCode,
        accountNameAr: matchedAcc ? matchedAcc.nameAr : (accountCode || 'غير محدد'),
        accountNameEn: matchedAcc ? matchedAcc.nameEn : '',
        costCenterId: undefined,
        description: desc || this.entryModel.descriptionAr,
        debit,
        credit,
        isPickerOpen: false,
        searchFilter: ''
      });
    }

    if (parsedRows.length > 0) {
      this.lines.set(parsedRows);
      this.closeExcelModal();
      this.triggerAutoSave();

      Swal.fire({
        icon: 'success',
        title: this.langService.t('accounting.journalEntryCreate.alerts.excelImportSuccessTitle'),
        text: this.langService.t('accounting.journalEntryCreate.alerts.excelImportSuccessText', {
          count: parsedRows.length,
          matched: matchedCount
        })
      });
    }
  }

  // Export Draft to JSON file for physical backup
  exportDraftToJson() {
    const draftData = {
      header: this.entryModel,
      lines: this.lines(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(draftData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AlRobban_Draft_Entry_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------
  // Submission (Draft or Post)
  // -------------------------------------------------------------
  submitEntry(postImmediately: boolean) {
    const isAr = this.langService.currentLang() === 'ar';

    const desc = this.primaryInputText().trim() || this.entryModel.descriptionAr.trim() || this.entryModel.descriptionEn.trim();
    if (!desc) {
      Swal.fire(
        this.langService.t('common.warning'),
        this.langService.t('accounting.journalEntryCreate.alerts.provideDescription'),
        'warning'
      );
      return;
    }

    if (!this.entryModel.descriptionAr.trim()) {
      this.entryModel.descriptionAr = this.translator.translateEnglishToArabic(desc) || desc;
    }
    if (!this.entryModel.descriptionEn.trim()) {
      this.entryModel.descriptionEn = this.translator.translateArabicToEnglish(desc) || desc;
    }

    // Filter out completely untouched/empty lines (e.g. if a user added a row by mistake or didn't need it)
    const currentLines = this.lines();
    const activeLines = currentLines.filter(l => l.accountId || (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0 || (l.description && l.description.trim().length > 0));

    if (activeLines.length < 2) {
      Swal.fire(
        this.langService.t('accounting.journalEntryCreate.alerts.accountingWarning'),
        this.langService.t('accounting.journalEntryCreate.alerts.minTwoLinesComplete'),
        'warning'
      );
      return;
    }

    for (let i = 0; i < activeLines.length; i++) {
      const line = activeLines[i];
      if (!line.accountId) {
        Swal.fire(
          this.langService.t('accounting.journalEntryCreate.alerts.accountingWarning'), 
          this.langService.t('accounting.journalEntryCreate.alerts.selectAccountRow', { row: i + 1 }), 
          'warning'
        );
        return;
      }
      const deb = Number(line.debit) || 0;
      const cred = Number(line.credit) || 0;
      if (deb === 0 && cred === 0) {
        Swal.fire(
          this.langService.t('accounting.journalEntryCreate.alerts.accountingWarning'), 
          this.langService.t('accounting.journalEntryCreate.alerts.enterDebitOrCreditRow', { row: i + 1 }), 
          'warning'
        );
        return;
      }

      // Cost Center Policy Verification according to Modules Settings
      const costCenterPolicy = this.modulesSettings.accountingSettings().costCenterPolicy;
      if (costCenterPolicy === 'MandatoryAll' && !line.costCenterId && this.costCenters.length > 0) {
        Swal.fire(
          this.langService.t('accounting.journalEntryCreate.alerts.costCenterPolicy'),
          this.langService.t('accounting.journalEntryCreate.alerts.costCenterMandatoryAll', { row: i + 1 }),
          'warning'
        );
        return;
      } else if (costCenterPolicy === 'MandatoryForIncomeAndExpense' && !line.costCenterId && this.costCenters.length > 0) {
        const accCode = line.accountCode || '';
        if ((accCode.startsWith('4') || accCode.startsWith('5')) && !line.costCenterId) {
          Swal.fire(
            this.langService.t('accounting.journalEntryCreate.alerts.costCenterPolicy'),
            this.langService.t('accounting.journalEntryCreate.alerts.costCenterMandatoryRevExp', { row: i + 1, account: line.accountNameAr }),
            'warning'
          );
          return;
        }
      }
    }

    // Backdated Entries Enforcement
    const allowBackdated = this.modulesSettings.accountingSettings().allowBackdatedEntries;
    const maxDays = this.modulesSettings.accountingSettings().maxBackdatedDays || 0;
    const entryD = new Date(this.entryModel.entryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - entryD.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (!allowBackdated && diffDays > 0) {
      Swal.fire(
        this.langService.t('accounting.journalEntryCreate.alerts.backdatedProhibitedTitle'),
        this.langService.t('accounting.journalEntryCreate.alerts.backdatedProhibitedText'),
        'warning'
      );
      return;
    } else if (allowBackdated && diffDays > maxDays) {
      Swal.fire(
        this.langService.t('accounting.journalEntryCreate.alerts.maxBackdatedLimitTitle'),
        this.langService.t('accounting.journalEntryCreate.alerts.maxBackdatedLimitText', { days: maxDays }),
        'warning'
      );
      return;
    }

    if (postImmediately && !this.isBalanced()) {
      Swal.fire(
        this.langService.t('accounting.journalEntryCreate.alerts.unbalancedEntryTitle'), 
        this.langService.t('accounting.journalEntryCreate.alerts.unbalancedEntryText', { diff: this.difference() }), 
        'error'
      );
      return;
    }

    this.isSubmitting.set(true);
    const companyId = this.companyContext.activeCompany()?.id;

    const payload: CreateJournalEntryRequest = {
      companyId,
      entryDate: this.entryModel.entryDate,
      entryType: +this.entryModel.entryType,
      descriptionAr: this.entryModel.descriptionAr,
      descriptionEn: this.entryModel.descriptionEn || this.entryModel.descriptionAr,
      referenceNumber: this.entryModel.referenceNumber || undefined,
      postImmediately,
      lines: activeLines.map(l => ({
        accountId: l.accountId,
        costCenterId: l.costCenterId || undefined,
        description: l.description || this.entryModel.descriptionAr,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0
      }))
    };

    this.journalService.create(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        // Clear local storage draft upon successful commit
        localStorage.removeItem(this.getDraftStorageKey());

        Swal.fire({
          icon: 'success',
          title: postImmediately 
            ? this.langService.t('accounting.journalEntryCreate.alerts.entryPostedSuccessTitle')
            : this.langService.t('accounting.journalEntryCreate.alerts.draftSavedSuccessTitle'),
          html: this.langService.t('accounting.journalEntryCreate.alerts.entrySavedHtml', {
            number: res.entryNumber,
            lines: currentLines.length
          }),
          confirmButtonText: this.langService.t('accounting.journalEntryCreate.alerts.backToJournal')
        }).then(() => {
          this.router.navigate(['/accounting/journal-entries']);
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('accounting.journalEntryCreate.alerts.saveFailedTitle'),
          text: err?.error?.description || this.langService.t('accounting.journalEntryCreate.alerts.saveFailedText')
        });
      }
    });
  }

  cancel() {
    this.router.navigate(['/accounting/journal-entries']);
  }
}
