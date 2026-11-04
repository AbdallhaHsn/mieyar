import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import {
  PosService,
  PosShiftDto,
  PosShiftStatus,
  CashMovementType
} from '../../../core/services/pos.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-pos-shifts',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterModule, PaginationComponent, TranslatePipe],
  templateUrl: './pos-shifts.component.html',
  styleUrls: ['./pos-shifts.component.scss']
})
export class PosShiftsComponent implements OnInit {
  private posService = inject(PosService);
  public langService = inject(LanguageService);
  public authService = inject(AuthService);
  public readonly Math = Math;

  shifts = signal<PosShiftDto[]>([]);
  isLoading = signal<boolean>(false);
  isSubmittingClose = signal<boolean>(false);

  // Filters
  searchTerm = signal<string>('');
  statusFilter = signal<'all' | 'open' | 'closed' | 'variance'>('all');
  terminalFilter = signal<string>('all');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Full-Page Shift Inspection / Administrative Close Workspace (No Popup Modal)
  selectedShift = signal<PosShiftDto | null>(null);
  adminActualCashCounted = signal<number>(0);
  adminClosingNotes = signal<string>('');

  // Terminal options discovered from shifts
  terminals = computed(() => {
    const set = new Set<string>(['POS-01', 'POS-02']);
    for (const s of this.shifts()) {
      if (s.terminalCode) set.add(s.terminalCode);
    }
    return Array.from(set);
  });

  // KPIs
  totalShiftsCount = computed(() => this.shifts().length);
  openShiftsCount = computed(() => this.shifts().filter(s => s.status === PosShiftStatus.Open).length);
  closedShiftsCount = computed(() => this.shifts().filter(s => s.status === PosShiftStatus.Closed).length);
  varianceShiftsCount = computed(() =>
    this.shifts().filter(s => s.status === PosShiftStatus.Closed && Math.abs(s.varianceAmount || 0) >= 0.01).length
  );

  totalPosSales = computed(() =>
    this.shifts().reduce((acc, s) => acc + (s.totalSalesAmount || 0), 0)
  );

  totalExpectedDrawer = computed(() =>
    this.shifts().reduce((acc, s) => acc + (s.expectedCashDrawer || 0), 0)
  );

  totalActualClosedCash = computed(() =>
    this.shifts()
      .filter(s => s.status === PosShiftStatus.Closed)
      .reduce((acc, s) => acc + (s.actualClosingCash || 0), 0)
  );

  netVarianceAmount = computed(() =>
    this.shifts()
      .filter(s => s.status === PosShiftStatus.Closed)
      .reduce((acc, s) => acc + (s.varianceAmount || 0), 0)
  );

  // Filtered Shifts
  filteredShifts = computed(() => {
    const q = (this.searchTerm() || '').trim().toLowerCase();
    const status = this.statusFilter();
    const term = this.terminalFilter();

    return this.shifts().filter(s => {
      if (status === 'open' && s.status !== PosShiftStatus.Open) return false;
      if (status === 'closed' && s.status !== PosShiftStatus.Closed) return false;
      if (status === 'variance' && (s.status !== PosShiftStatus.Closed || Math.abs(s.varianceAmount || 0) < 0.01)) {
        return false;
      }
      if (term !== 'all' && s.terminalCode !== term) return false;

      if (q) {
        return (
          (s.shiftNumber || '').toLowerCase().includes(q) ||
          (s.cashierName || '').toLowerCase().includes(q) ||
          (s.cashierUserId || '').toLowerCase().includes(q) ||
          (s.terminalCode || '').toLowerCase().includes(q) ||
          (s.branchName || '').toLowerCase().includes(q) ||
          (s.warehouseName || '').toLowerCase().includes(q) ||
          (s.journalEntryNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  });

  paginatedShifts = computed(() => {
    const list = this.filteredShifts();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  adminPreviewVariance = computed(() => {
    const sh = this.selectedShift();
    if (!sh) return 0;
    return (Number(this.adminActualCashCounted()) || 0) - (sh.expectedCashDrawer || 0);
  });

  ngOnInit(): void {
    this.loadShifts();
  }

  loadShifts(): void {
    this.isLoading.set(true);
    this.posService.getShiftsHistory(100).subscribe({
      next: (data) => {
        this.shifts.set(data || []);
        // Refresh selectedShift if open in workspace
        const currentSelected = this.selectedShift();
        if (currentSelected) {
          const updated = (data || []).find(x => x.id === currentSelected.id);
          if (updated) this.selectedShift.set(updated);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openShiftWorkspace(shift: PosShiftDto): void {
    this.selectedShift.set(shift);
    this.adminActualCashCounted.set(
      shift.status === PosShiftStatus.Closed
        ? shift.actualClosingCash
        : shift.expectedCashDrawer
    );
    this.adminClosingNotes.set(shift.closingNotes || '');
  }

  closeShiftWorkspace(): void {
    this.selectedShift.set(null);
  }

  submitAdminCloseShift(): void {
    const shift = this.selectedShift();
    if (!shift || shift.status === PosShiftStatus.Closed) return;

    const isAr = this.langService.currentLang() === 'ar';
    const variance = this.adminPreviewVariance();
    const hasVariance = Math.abs(variance) >= 0.01;

    Swal.fire({
      icon: hasVariance ? 'warning' : 'question',
      title: isAr ? 'تأكيد إقفال الوردية واعتماد الجرد؟' : 'Confirm Shift Closing & Cash Audit?',
      text: hasVariance
        ? (isAr
            ? `يوجد فرق في الصندوق بمقدار (${variance > 0 ? '+' : ''}${variance.toFixed(2)} ر.س). هل تريد اعتماد إقفال الوردية وترحيل قيد التسوية المحاسبي؟`
            : `There is a cash drawer variance of (${variance.toFixed(2)} SAR). Confirm closing and post GL journal entry?`)
        : (isAr
            ? 'الرصيد النقدي الفعلي مطابق تماماً للرصيد الدفتري المتوقع. هل تريد إقفال الوردية واعتماد القيد المحاسبي؟'
            : 'Actual cash matches expected drawer balance. Close shift and post GL journal entry?'),
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، إقفال واعتماد الوردية' : 'Yes, Close & Post',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: hasVariance ? '#d97706' : '#059669',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.isSubmittingClose.set(true);
      const user = this.authService.currentUser();
      this.posService.closeShift({
        posShiftId: shift.id,
        actualClosingCash: Number(this.adminActualCashCounted()) || 0,
        notes: this.adminClosingNotes() || (isAr ? 'إقفال ومراجعة إدارية للصندوق' : 'Administrative shift closing'),
        closedBy: user?.fullNameAr || user?.userName || 'Management'
      }).subscribe({
        next: (closedShift) => {
          this.isSubmittingClose.set(false);
          this.selectedShift.set(closedShift);
          this.loadShifts();
          Swal.fire({
            icon: 'success',
            title: isAr ? 'تم إقفال الوردية واعتماد الصندوق' : 'Shift Closed Successfully',
            text: closedShift.journalEntryNumber
              ? (isAr
                  ? `تم إقفال الوردية رقم ${closedShift.shiftNumber} وتوليد قيد اليومية رقم #${closedShift.journalEntryNumber} بنجاح.`
                  : `Shift ${closedShift.shiftNumber} closed and GL Journal Entry #${closedShift.journalEntryNumber} posted.`)
              : (isAr ? 'تم إقفال الوردية وحفظ محضر الجرد بنجاح.' : 'Shift closed and audit saved.'),
            confirmButtonColor: '#059669'
          });
        },
        error: (err) => {
          this.isSubmittingClose.set(false);
          Swal.fire({
            icon: 'error',
            title: isAr ? 'تعذر إقفال الوردية' : 'Error Closing Shift',
            text: err.error?.description || err.error?.message || (isAr ? 'حدث خطأ أثناء إقفال الوردية.' : 'Failed to close shift.'),
            confirmButtonColor: '#059669'
          });
        }
      });
    });
  }

  printZReport(): void {
    window.print();
  }

  isOpen(shift: PosShiftDto): boolean {
    return shift.status === PosShiftStatus.Open;
  }

  isDepositMovement(movType: CashMovementType): boolean {
    return movType === CashMovementType.CashIn;
  }
}
