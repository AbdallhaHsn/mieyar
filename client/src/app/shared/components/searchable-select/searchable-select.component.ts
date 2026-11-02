import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  signal,
  computed,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export interface SelectOption {
  value: any;
  label: string;
  sublabel?: string;
  code?: string;
  badge?: string;
  badgeClass?: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ]
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  @Input() set items(list: SelectOption[]) {
    this._items.set(list || []);
    this.currentPage.set(1);
    this.highlightedIndex.set(0);
  }
  get items(): SelectOption[] {
    return this._items();
  }

  @Input() set value(val: any) {
    this.selectedValue.set(val);
  }
  get value(): any {
    return this.selectedValue();
  }

  public langService = inject(LanguageService);

  @Input() placeholder: string = '';
  @Input() searchPlaceholder: string = '';
  @Input() disabled: boolean = false;
  @Input() clearable: boolean = true;
  @Input() bold: boolean = true;
  @Input() compact: boolean = false;
  @Input() customClass: string = '';
  @Input() emptyMessage: string = '';

  get effectivePlaceholder(): string {
    return this.placeholder || this.langService.t('common.selectOrSearch');
  }

  get effectiveSearchPlaceholder(): string {
    return this.searchPlaceholder || this.langService.t('common.quickSearch');
  }

  get effectiveEmptyMessage(): string {
    return this.emptyMessage || this.langService.t('common.noMatchingResults');
  }

  // Pagination in select
  @Input() enablePagination: boolean = true;
  @Input() pageSize: number = 7;

  @Output() valueChange = new EventEmitter<any>();
  @Output() selectOption = new EventEmitter<SelectOption | null>();

  private _items = signal<SelectOption[]>([]);
  selectedValue = signal<any>(null);
  isOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  highlightedIndex = signal<number>(0);
  currentPage = signal<number>(1);

  // ControlValueAccessor callbacks
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {
    // When dropdown opens, focus search input and reset highlighted index
    effect(() => {
      if (this.isOpen()) {
        this.highlightedIndex.set(0);
        this.currentPage.set(1);
        setTimeout(() => {
          this.searchInputElement?.nativeElement?.focus();
        }, 50);
      } else {
        this.searchQuery.set('');
        this.currentPage.set(1);
      }
    });
  }

  // Filtered items based on search query
  filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this._items();
    if (!q) return list;

    return list.filter(item => {
      const matchLabel = item.label?.toLowerCase().includes(q);
      const matchSublabel = item.sublabel?.toLowerCase().includes(q);
      const matchCode = item.code?.toLowerCase().includes(q);
      const matchBadge = item.badge?.toLowerCase().includes(q);
      return matchLabel || matchSublabel || matchCode || matchBadge;
    });
  });

  // Total pages
  totalPages = computed(() => {
    const total = this.filteredItems().length;
    const size = Math.max(1, this.pageSize);
    return Math.max(1, Math.ceil(total / size));
  });

  // Paginated items displayed in dropdown
  paginatedItems = computed(() => {
    const list = this.filteredItems();
    if (!this.enablePagination || list.length <= this.pageSize) {
      return list;
    }
    const page = Math.min(this.currentPage(), this.totalPages());
    const size = Math.max(1, this.pageSize);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  // Small pages array for dropdown pagination bar
  pagesArray = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 5) {
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

  // Current selected option object
  selectedOption = computed(() => {
    const val = this.selectedValue();
    if (val === null || val === undefined || val === '') return null;
    return this._items().find(i => i.value === val) || null;
  });

  onSearchChange(text: string): void {
    this.searchQuery.set(text);
    this.currentPage.set(1);
    this.highlightedIndex.set(0);
  }

  goToPage(page: number | string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.highlightedIndex.set(0);
    }
  }

  prevPage(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.highlightedIndex.set(0);
    }
  }

  nextPage(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.highlightedIndex.set(0);
    }
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      this.onTouched();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  selectItem(item: SelectOption): void {
    if (item.disabled) return;
    this.selectedValue.set(item.value);
    this.onChange(item.value);
    this.valueChange.emit(item.value);
    this.selectOption.emit(item);
    this.isOpen.set(false);
  }

  clearSelection(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.disabled) return;
    this.selectedValue.set(null);
    this.onChange(null);
    this.valueChange.emit(null);
    this.selectOption.emit(null);
  }

  // Keyboard navigation inside dropdown
  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled) return;

    if (!this.isOpen()) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.isOpen.set(true);
      }
      return;
    }

    const items = this.paginatedItems();
    const len = items.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (len > 0) {
          if (this.highlightedIndex() >= len - 1) {
            // If on last item of page, move to next page if possible
            if (this.currentPage() < this.totalPages()) {
              this.nextPage();
              this.highlightedIndex.set(0);
            } else {
              this.highlightedIndex.set(0);
            }
          } else {
            this.highlightedIndex.set(this.highlightedIndex() + 1);
          }
          this.scrollToHighlighted();
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (len > 0) {
          if (this.highlightedIndex() <= 0) {
            // If on first item of page, move to prev page if possible
            if (this.currentPage() > 1) {
              this.prevPage();
              this.highlightedIndex.set(Math.max(0, this.paginatedItems().length - 1));
            } else {
              this.highlightedIndex.set(len - 1);
            }
          } else {
            this.highlightedIndex.set(this.highlightedIndex() - 1);
          }
          this.scrollToHighlighted();
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (len > 0 && this.highlightedIndex() >= 0 && this.highlightedIndex() < len) {
          this.selectItem(items[this.highlightedIndex()]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
    }
  }

  private scrollToHighlighted(): void {
    setTimeout(() => {
      const el = this.elementRef.nativeElement.querySelector('.option-item.highlighted');
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 10);
  }

  // Close when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  // ControlValueAccessor implementation
  writeValue(val: any): void {
    this.selectedValue.set(val);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
