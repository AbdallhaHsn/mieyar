import { Component, Input, Output, EventEmitter, forwardRef, signal, computed, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AccountDto, AccountType } from '../../../core/models/account.model';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-account-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './account-picker.component.html',
  styleUrls: ['./account-picker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AccountPickerComponent),
      multi: true
    }
  ]
})
export class AccountPickerComponent implements ControlValueAccessor {
  private elementRef = inject(ElementRef);
  public langService = inject(LanguageService);

  private _accounts = signal<AccountDto[]>([]);

  @Input() set accounts(val: AccountDto[]) {
    this._accounts.set(val || []);
  }
  get accounts(): AccountDto[] {
    return this._accounts();
  }

  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() allowRootOption: boolean = false;
  @Input() rootOptionTitle: string = '';
  @Input() disabled: boolean = false;
  @Input() compact: boolean = false;

  get effectiveLabel(): string {
    return this.label || this.langService.t('common.selectAccount');
  }

  get effectivePlaceholder(): string {
    return this.placeholder || this.langService.t('common.selectAccount');
  }

  get effectiveRootOptionTitle(): string {
    return this.rootOptionTitle || this.langService.t('common.accountPickerRootTitle');
  }

  @Output() accountSelect = new EventEmitter<AccountDto | null>();

  // Expose Math for template
  Math = Math;

  // ControlValueAccessor internal value
  selectedValue = signal<string>('');

  // Dropdown open state
  isOpen = signal<boolean>(false);

  // Search & Filter state
  searchQuery = signal<string>('');
  selectedType = signal<number | 'all'>('all');
  selectedLevel = signal<number | 'all'>('all');

  // Pagination & selection state
  currentPage = signal<number>(1);
  pageSize = signal<number>(8);
  highlightedIndex = signal<number>(0);

  // Enums for template
  AccountType = AccountType;

  // Types list for category tabs
  categories: { id: number | 'all'; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: AccountType.Asset, label: '1 - الأصول' },
    { id: AccountType.Liability, label: '2 - الالتزامات' },
    { id: AccountType.Equity, label: '3 - حقوق الملكية' },
    { id: AccountType.Revenue, label: '4 - الإيرادات' },
    { id: AccountType.Expense, label: '5 - المصروفات' }
  ];

  // Available categories based on passed accounts
  availableCategories = computed(() => {
    const list = this._accounts();
    if (list.length === 0) return this.categories;
    const types = new Set(list.map(a => a.accountType));
    return this.categories.filter(c => c.id === 'all' || types.has(c.id as AccountType));
  });

  // Currently selected account DTO
  selectedAccount = computed(() => {
    const val = this.selectedValue();
    if (!val) return null;
    return this._accounts().find(a => a.id === val) || null;
  });

  // Filtered accounts list
  filteredAccounts = computed(() => {
    let list = this._accounts();
    const query = this.normalizeArabic(this.searchQuery().trim().toLowerCase());
    const typeFilter = this.selectedType();
    const levelFilter = this.selectedLevel();

    // 1. Filter by category type
    if (typeFilter !== 'all') {
      list = list.filter(a => a.accountType === typeFilter);
    }

    // 2. Filter by level
    if (levelFilter !== 'all') {
      list = list.filter(a => a.level === levelFilter);
    }

    // 3. Search query (code, nameAr normalized, nameEn)
    if (query) {
      list = list.filter(a => {
        const codeMatch = a.accountCode.toLowerCase().includes(query);
        const nameArNorm = this.normalizeArabic(a.nameAr.toLowerCase());
        const arMatch = nameArNorm.includes(query) || a.nameAr.toLowerCase().includes(query);
        const enMatch = a.nameEn ? a.nameEn.toLowerCase().includes(query) : false;
        return codeMatch || arMatch || enMatch;
      });
    }

    return list;
  });

  // Total items matching criteria
  totalItems = computed(() => this.filteredAccounts().length);

  // Total pages
  totalPages = computed(() => {
    const total = this.totalItems();
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  // Paginated slice
  paginatedAccounts = computed(() => {
    const list = this.filteredAccounts();
    const page = Math.min(this.currentPage(), this.totalPages());
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  // Pages array for navigation buttons
  pagesArray = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  // CVA callbacks
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.selectedValue.set(value || '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    const newState = !this.isOpen();
    this.isOpen.set(newState);
    if (newState) {
      this.onTouched();
      // Auto-align category with selected item if any
      const current = this.selectedAccount();
      if (current && this.selectedType() === 'all') {
        this.selectedType.set(current.accountType);
      }
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  selectAccount(acc: AccountDto): void {
    this.selectedValue.set(acc.id);
    this.onChange(acc.id);
    this.accountSelect.emit(acc);
    this.closeDropdown();
  }

  selectRoot(): void {
    this.selectedValue.set('');
    this.onChange('');
    this.accountSelect.emit(null);
    this.closeDropdown();
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    this.selectedValue.set('');
    this.onChange('');
    this.accountSelect.emit(null);
  }

  setCategory(typeId: number | 'all'): void {
    this.selectedType.set(typeId);
    this.currentPage.set(1);
    this.highlightedIndex.set(0);
  }

  setLevel(level: number | 'all'): void {
    this.selectedLevel.set(level);
    this.currentPage.set(1);
    this.highlightedIndex.set(0);
  }

  onSearchChange(text: string): void {
    this.searchQuery.set(text);
    this.currentPage.set(1);
    this.highlightedIndex.set(0);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const list = this.paginatedAccounts();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.highlightedIndex() < list.length - 1) {
        this.highlightedIndex.update(i => i + 1);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.highlightedIndex() > 0) {
        this.highlightedIndex.update(i => i - 1);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.highlightedIndex();
      if (list.length > 0 && idx >= 0 && idx < list.length) {
        this.selectAccount(list[idx]);
      } else if (list.length > 0) {
        this.selectAccount(list[0]);
      }
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.highlightedIndex.set(0);
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.highlightedIndex.set(0);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.highlightedIndex.set(0);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.highlightedIndex.set(0);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDropdown();
  }

  private normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .trim();
  }
}
