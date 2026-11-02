import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  HrService,
  EmployeeDto,
  EmployeeCustodyDto,
  CustodyType,
  CustodyStatus
} from '../../../core/services/hr.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../core/services/language.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-hr-custody',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TranslatePipe],
  templateUrl: './hr-custody.component.html',
  styleUrls: ['./hr-custody.component.scss']
})
export class HrCustodyComponent implements OnInit {
  public langService = inject(LanguageService);
  private hrService = inject(HrService);
  private translator = inject(AccountingTranslatorService);

  get isArabic(): boolean {
    return this.langService.isArabic();
  }

  custodies: EmployeeCustodyDto[] = [];
  filteredCustodies: EmployeeCustodyDto[] = [];
  employees: EmployeeDto[] = [];

  loading = false;
  statusFilter = 'ALL';
  typeFilter = 'ALL';
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // New Custody Modal
  showModal = false;
  form = {
    employeeId: '',
    type: CustodyType.TangibleAsset,
    itemNameAr: '',
    itemNameEn: '',
    serialOrAssetNumber: '',
    valueOrAmount: 0,
    assignedDate: new Date().toISOString().substring(0, 10),
    expectedReturnDate: '',
    conditionOnAssignment: '',
    notes: ''
  };

  // Return/Clearance Modal
  showReturnModal = false;
  selectedCustody: EmployeeCustodyDto | null = null;
  returnForm = {
    status: CustodyStatus.Returned,
    returnNotes: ''
  };

  ngOnInit(): void {
    this.loadData();
    this.loadEmployees();
  }

  loadData(): void {
    this.loading = true;
    this.hrService.getCustodies().subscribe({
      next: (data) => {
        this.custodies = data;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: this.langService.t('hr.custody.alerts.loadFailed')
        });
      }
    });
  }

  loadEmployees(): void {
    this.hrService.getEmployees(true).subscribe({
      next: (data) => this.employees = data,
      error: (e) => console.error(e)
    });
  }

  applyFilter(): void {
    let result = [...this.custodies];

    if (this.statusFilter !== 'ALL') {
      const statusNum = parseInt(this.statusFilter, 10);
      result = result.filter(c => c.status === statusNum);
    }

    if (this.typeFilter !== 'ALL') {
      const typeNum = parseInt(this.typeFilter, 10);
      result = result.filter(c => c.type === typeNum);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(c =>
        c.custodyNumber?.toLowerCase().includes(term) ||
        c.itemNameAr?.toLowerCase().includes(term) ||
        c.itemNameEn?.toLowerCase().includes(term) ||
        c.serialOrAssetNumber?.toLowerCase().includes(term) ||
        c.employeeNameAr?.toLowerCase().includes(term) ||
        c.employeeNameEn?.toLowerCase().includes(term) ||
        c.employeeNumber?.toLowerCase().includes(term)
      );
    }

    this.filteredCustodies = result;
    this.currentPage = 1;
  }

  get paginatedCustodies(): EmployeeCustodyDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCustodies.slice(start, start + this.pageSize);
  }

  // --- Metrics ---
  get totalCustodiesCount(): number {
    return this.custodies.length;
  }

  get activeCustodiesCount(): number {
    return this.custodies.filter(c => c.status === CustodyStatus.Active).length;
  }

  get returnedCustodiesCount(): number {
    return this.custodies.filter(c => c.status === CustodyStatus.Returned).length;
  }

  get lostOrDamagedCount(): number {
    return this.custodies.filter(c => c.status === CustodyStatus.LostOrDamaged || c.status === CustodyStatus.WrittenOff).length;
  }

  // --- Single-Entry Auto-Translation ---
  onItemNameArChange(): void {
    if (!this.form.itemNameAr) {
      this.form.itemNameEn = '';
      return;
    }
    this.form.itemNameEn = this.translator.translateArabicToEnglish(this.form.itemNameAr);
  }

  triggerReTranslate(): void {
    if (this.form.itemNameAr) {
      this.form.itemNameEn = this.translator.translateArabicToEnglish(this.form.itemNameAr);
    }
  }

  openNewModal(): void {
    this.form = {
      employeeId: this.employees.length > 0 ? this.employees[0].id : '',
      type: CustodyType.TangibleAsset,
      itemNameAr: '',
      itemNameEn: '',
      serialOrAssetNumber: '',
      valueOrAmount: 0,
      assignedDate: new Date().toISOString().substring(0, 10),
      expectedReturnDate: '',
      conditionOnAssignment: this.langService.t('hr.custody.defaultCondition'),
      notes: ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveCustody(): void {
    if (!this.form.employeeId) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('hr.custody.alerts.selectEmployeeFirst')
      });
      return;
    }

    if (!this.form.itemNameAr.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('hr.custody.alerts.enterItemName')
      });
      return;
    }

    this.loading = true;
    this.hrService.createCustody(this.form).subscribe({
      next: (created) => {
        this.loading = false;
        this.closeModal();
        Swal.fire({
          icon: 'success',
          title: this.langService.t('hr.custody.alerts.assignedSuccessTitle'),
          text: this.langService.t('hr.custody.alerts.assignedSuccess', { custodyNumber: created.custodyNumber || '' })
        });
        this.loadData();
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.message || this.langService.t('hr.custody.alerts.assignFailed')
        });
      }
    });
  }

  // --- Return / Clearance ---
  openReturnModal(custody: EmployeeCustodyDto): void {
    this.selectedCustody = custody;
    this.returnForm = {
      status: CustodyStatus.Returned,
      returnNotes: this.langService.t('hr.custody.defaultReturnNotes')
    };
    this.showReturnModal = true;
  }

  submitReturn(): void {
    if (!this.selectedCustody) return;

    const itemName = this.isArabic
      ? (this.selectedCustody.itemNameAr || this.selectedCustody.itemNameEn)
      : (this.selectedCustody.itemNameEn || this.selectedCustody.itemNameAr);

    Swal.fire({
      title: this.langService.t('hr.custody.alerts.confirmClearanceTitle'),
      text: this.langService.t('hr.custody.alerts.confirmClearanceText', { item: itemName || '' }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('hr.custody.alerts.yesConfirmClearance'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((res) => {
      if (res.isConfirmed) {
        this.loading = true;
        this.hrService.returnCustody(this.selectedCustody!.id, this.returnForm).subscribe({
          next: () => {
            this.loading = false;
            this.showReturnModal = false;
            Swal.fire({
              icon: 'success',
              title: this.langService.t('hr.custody.alerts.returnedSuccessTitle'),
              text: this.langService.t('hr.custody.alerts.returnedSuccess')
            });
            this.loadData();
          },
          error: (err) => {
            this.loading = false;
            console.error(err);
            Swal.fire({
              icon: 'error',
              title: this.langService.t('common.error'),
              text: err.error?.message || this.langService.t('hr.custody.alerts.returnFailed')
            });
          }
        });
      }
    });
  }

  // --- Badges & Helpers ---
  getTypeBadgeClass(type: CustodyType): string {
    switch (type) {
      case CustodyType.TangibleAsset: return 'badge-asset';
      case CustodyType.CashFloat: return 'badge-cash';
      case CustodyType.AccessCardOrKey: return 'badge-access';
      case CustodyType.SoftwareLicense: return 'badge-license';
      case CustodyType.FuelOrTravelCard: return 'badge-fuel';
      default: return 'badge-other';
    }
  }

  getTypeLabel(type: CustodyType): string {
    switch (type) {
      case CustodyType.TangibleAsset: return this.langService.t('hr.custody.typeTangible');
      case CustodyType.CashFloat: return this.langService.t('hr.custody.typeCash');
      case CustodyType.AccessCardOrKey: return this.langService.t('hr.custody.typeCard');
      case CustodyType.SoftwareLicense: return this.langService.t('hr.custody.typeLicense');
      case CustodyType.FuelOrTravelCard: return this.langService.t('hr.custody.typeFuel');
      default: return this.langService.t('hr.custody.typeOther');
    }
  }

  getStatusBadgeClass(status: CustodyStatus): string {
    switch (status) {
      case CustodyStatus.Active: return 'status-active';
      case CustodyStatus.Returned: return 'status-returned';
      case CustodyStatus.LostOrDamaged: return 'status-damaged';
      case CustodyStatus.WrittenOff: return 'status-writtenoff';
      default: return '';
    }
  }

  getStatusLabel(status: CustodyStatus): string {
    switch (status) {
      case CustodyStatus.Active: return this.langService.t('hr.custody.statusActiveLabel');
      case CustodyStatus.Returned: return this.langService.t('hr.custody.statusReturnedLabel');
      case CustodyStatus.LostOrDamaged: return this.langService.t('hr.custody.statusLostOrDamagedLabel');
      case CustodyStatus.WrittenOff: return this.langService.t('hr.custody.statusWrittenOffLabel');
      default: return '-';
    }
  }
}
