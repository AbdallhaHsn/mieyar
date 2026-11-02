import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, Input, Output, EventEmitter, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  langService = inject(LanguageService);

  @Input() set totalItems(val: number) {
    this._totalItems.set(Math.max(0, val || 0));
  }
  get totalItems(): number {
    return this._totalItems();
  }

  @Input() set pageSize(val: number) {
    this._pageSize.set(Math.max(1, val || 10));
  }
  get pageSize(): number {
    return this._pageSize();
  }

  @Input() set currentPage(val: number) {
    this._currentPage.set(Math.max(1, val || 1));
  }
  get currentPage(): number {
    return this._currentPage();
  }

  @Input() pageSizeOptions: number[] = [5, 10, 20, 50, 100];
  @Input() showPageSize: boolean = true;
  @Input() showSummary: boolean = true;
  @Input() compact: boolean = false;
  @Input() itemLabelAr: string = 'سجل';
  @Input() itemLabelEn: string = 'records';

  @Output() pageChange = new EventEmitter<number>();
  @Output() currentPageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  private _totalItems = signal<number>(0);
  private _pageSize = signal<number>(10);
  private _currentPage = signal<number>(1);

  totalPages = computed(() => {
    const total = this._totalItems();
    const size = this._pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  startItem = computed(() => {
    const total = this._totalItems();
    if (total === 0) return 0;
    return (this._currentPage() - 1) * this._pageSize() + 1;
  });

  endItem = computed(() => {
    const total = this._totalItems();
    const calculated = this._currentPage() * this._pageSize();
    return Math.min(total, calculated);
  });

  pagesArray = computed(() => {
    const total = this.totalPages();
    const current = Math.min(this._currentPage(), total);
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }
      pages.push(total);
    }

    return pages;
  });

  goToPage(page: number | string): void {
    if (typeof page !== 'number') return;
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    if (clamped !== this._currentPage()) {
      this._currentPage.set(clamped);
      this.pageChange.emit(clamped);
      this.currentPageChange.emit(clamped);
    }
  }

  prevPage(): void {
    if (this._currentPage() > 1) {
      this.goToPage(this._currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this._currentPage() < this.totalPages()) {
      this.goToPage(this._currentPage() + 1);
    }
  }

  firstPage(): void {
    if (this._currentPage() > 1) {
      this.goToPage(1);
    }
  }

  lastPage(): void {
    if (this._currentPage() < this.totalPages()) {
      this.goToPage(this.totalPages());
    }
  }

  onPageSizeSelected(newSizeStr: string | number): void {
    const newSize = Number(newSizeStr);
    if (newSize > 0 && newSize !== this._pageSize()) {
      this._pageSize.set(newSize);
      // Reset to page 1
      this._currentPage.set(1);
      this.pageSizeChange.emit(newSize);
      this.pageChange.emit(1);
      this.currentPageChange.emit(1);
    }
  }
}
