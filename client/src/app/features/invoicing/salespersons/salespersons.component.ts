import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SalespersonsService, SalespersonDto, AvailableUserDto, CreateSalespersonRequest, UpdateSalespersonRequest } from '../../../core/services/salespersons.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-salespersons',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule, PaginationComponent, TranslatePipe],
  templateUrl: './salespersons.component.html',
  styleUrls: ['./salespersons.component.scss']
})
export class SalespersonsComponent implements OnInit {
  private salespersonsService = inject(SalespersonsService);
  public langService = inject(LanguageService);
  public translator = inject(AccountingTranslatorService);
  public companyContext = inject(CompanyContextService);

  salespersons = signal<SalespersonDto[]>([]);
  availableUsers = signal<AvailableUserDto[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Search & Filter
  searchTerm = signal<string>('');
  filterStatus = signal<'all' | 'active' | 'inactive'>('all');

  // Modal State
  showModal = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  currentId = signal<string | null>(null);

  // Form Fields
  formCode = signal<string>('');
  formNameAr = signal<string>('');
  formNameEn = signal<string>('');
  unifiedSalespersonName = signal<string>('');
  backgroundTranslation = signal<string>('');
  formPhone = signal<string>('');
  formEmail = signal<string>('');
  formWarehouseCode = signal<string>('WH-VAN-01');
  formWarehouseNameAr = signal<string>('مستودع سيارة التوزيع 01');
  formCommissionRate = signal<number>(0);
  formIsActive = signal<boolean>(true);

  // User Mapping Mode: 'link' | 'create' | 'none'
  userMappingMode = signal<'link' | 'create' | 'none'>('link');
  selectedUserId = signal<string>('');
  newUserName = signal<string>('');
  newUserPassword = signal<string>('Sales@123456');
  targetUserRole = signal<string>('Salesperson');

  // Available User Roles for Salesperson Account
  availableRoles = [
    { value: 'Salesperson', labelAr: 'بائع مبيعات (قياسي)', labelEn: 'Salesperson (Standard)' },
    { value: 'Accountant', labelAr: 'محاسب مبيعات', labelEn: 'Sales Accountant' },
    { value: 'CompanyAdmin', labelAr: 'مشرف مبيعات (شامل)', labelEn: 'Sales Supervisor' }
  ];

  // Granular Operational Permissions & Overrides
  formCanGiveDiscount = signal<boolean>(true);
  formMaxDiscountPercent = signal<number>(5);
  formCanSellCredit = signal<boolean>(false);
  formCanEditPrice = signal<boolean>(false);
  formCanProcessReturns = signal<boolean>(false);
  formCanSellBelowCost = signal<boolean>(false);
  formCanViewCostPrice = signal<boolean>(false);
  formCanSellFromAnyWarehouse = signal<boolean>(false);

  // Default Preset Warehouses
  presetWarehouses = [
    { code: 'WH-01', nameAr: 'المستودع الرئيسي (الإدارة)', nameEn: 'Main Warehouse' },
    { code: 'WH-02', nameAr: 'مستودع جدة المركزي', nameEn: 'Jeddah Warehouse' },
    { code: 'WH-VAN-01', nameAr: 'مستودع سيارة التوزيع 1 (الرياض)', nameEn: 'Van Store 01' },
    { code: 'WH-VAN-02', nameAr: 'مستودع سيارة التوزيع 2 (الشرقية)', nameEn: 'Van Store 02' },
    { code: 'WH-POS-01', nameAr: 'كاونتر مبيعات المعرض 1', nameEn: 'Showroom Counter 01' },
    { code: 'WH-POS-02', nameAr: 'كاونتر مبيعات المعرض 2', nameEn: 'Showroom Counter 02' },
    { code: 'CUSTOM', nameAr: 'مستودع مخصص آخر...', nameEn: 'Custom Warehouse...' }
  ];

  selectedPresetWarehouse = signal<string>('WH-VAN-01');

  // KPIs
  totalCount = computed(() => this.salespersons().length);
  activeCount = computed(() => this.salespersons().filter(s => s.isActive).length);
  linkedUsersCount = computed(() => this.salespersons().filter(s => !!s.userId).length);
  uniqueWarehousesCount = computed(() => new Set(this.salespersons().map(s => s.warehouseCode)).size);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Filtered List
  filteredSalespersons = computed(() => {
    return this.salespersons().filter(s => {
      if (this.filterStatus() === 'active' && !s.isActive) return false;
      if (this.filterStatus() === 'inactive' && s.isActive) return false;
      if (this.searchTerm()) {
        const q = this.searchTerm().toLowerCase();
        return (s.code || '').toLowerCase().includes(q) ||
               (s.nameAr || '').toLowerCase().includes(q) ||
               (s.nameEn || '').toLowerCase().includes(q) ||
               (s.warehouseCode || '').toLowerCase().includes(q) ||
               (s.warehouseNameAr || '').toLowerCase().includes(q) ||
               (s.userName || '').toLowerCase().includes(q) ||
               (s.phoneNumber || '').includes(q);
      }
      return true;
    });
  });

  paginatedSalespersons = computed(() => {
    const list = this.filteredSalespersons();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  ngOnInit() {
    this.loadData();
    this.loadUsers();
  }

  loadData() {
    this.isLoading.set(true);
    this.salespersonsService.getSalespersons().subscribe({
      next: (res) => {
        this.salespersons.set(res || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  loadUsers() {
    this.salespersonsService.getAvailableUsers().subscribe({
      next: (users) => {
        this.availableUsers.set(users || []);
      }
    });
  }

  // Single-Entry Auto-Translation Handlers (Rule 1 & Google Public Proxy)
  onUnifiedNameChange(val: string) {
    const text = (val || '').trim();
    this.unifiedSalespersonName.set(val);
    if (!text) {
      this.formNameAr.set('');
      this.formNameEn.set('');
      this.unifiedSalespersonName.set('');
      this.backgroundTranslation.set('');
      this.backgroundTranslation.set('');
      return;
    }

    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.formNameAr.set(text);
      const instant = this.translator.translateArabicToEnglish(text);
      this.formNameEn.set(instant);
      this.backgroundTranslation.set(this.langService.t('salespersons.alerts.englishTranslation').replace('{text}', instant));
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.formNameEn.set(refined);
          this.backgroundTranslation.set(this.langService.t('salespersons.alerts.englishTranslation').replace('{text}', refined));
        }
      );
    } else {
      this.formNameEn.set(text);
      const instant = this.translator.translateEnglishToArabic(text);
      this.formNameAr.set(instant);
      this.backgroundTranslation.set(this.langService.t('salespersons.alerts.arabicTranslation').replace('{text}', instant));
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.formNameAr.set(refined);
          this.backgroundTranslation.set(this.langService.t('salespersons.alerts.arabicTranslation').replace('{text}', refined));
        }
      });
    }
  }

  forceRetranslate() {
    const text = (this.unifiedSalespersonName() || this.formNameAr() || this.formNameEn()).trim();
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.translator.translateOnline(text, 'ar', 'en').then(en => {
        const res = en || this.translator.translateArabicToEnglish(text);
        this.formNameEn.set(res);
        this.backgroundTranslation.set(this.langService.t('salespersons.alerts.englishTranslation').replace('{text}', res));
      });
    } else {
      this.translator.translateOnline(text, 'en', 'ar').then(ar => {
        const res = ar || this.translator.translateEnglishToArabic(text);
        this.formNameAr.set(res);
        this.backgroundTranslation.set(this.langService.t('salespersons.alerts.arabicTranslation').replace('{text}', res));
      });
    }
  }

  private isDefaultEnName(val: string): boolean {
    return !val || val === 'Salesperson' || val === 'Sales Representative';
  }

  onPresetWarehouseChange(code: string) {
    this.selectedPresetWarehouse.set(code);
    if (code !== 'CUSTOM') {
      const p = this.presetWarehouses.find(w => w.code === code);
      if (p) {
        this.formWarehouseCode.set(p.code);
        this.formWarehouseNameAr.set(p.nameAr);
      }
    }
  }

  selectedUser = computed(() => {
    const id = this.selectedUserId();
    return this.availableUsers().find(u => u.id === id) || null;
  });

  unlinkedUsers = computed(() => {
    return this.availableUsers().filter(u => !u.isAlreadyLinked);
  });

  onUserSelected(userId: string): void {
    this.selectedUserId.set(userId);
    if (!userId) {
      this.formNameAr.set('');
      this.formNameEn.set('');
      this.unifiedSalespersonName.set('');
      this.backgroundTranslation.set('');
      this.formEmail.set('');
      this.formPhone.set('');
      return;
    }
    const user = this.availableUsers().find(u => u.id === userId);
    if (user) {
      this.formNameAr.set(user.fullNameAr || '');
      this.unifiedSalespersonName.set(user.fullNameAr || user.fullNameEn || '');
      if (user.fullNameEn) {
        this.formNameEn.set(user.fullNameEn);
      } else if (user.fullNameAr) {
        this.formNameEn.set(this.translator.translateArabicToEnglish(user.fullNameAr));
      } else {
        this.formNameEn.set('');
      }
      this.formEmail.set(user.email || '');
      this.formPhone.set(user.phoneNumber || '');
      if (user.role) this.targetUserRole.set(user.role);
    }
  }

  setMappingMode(mode: 'link' | 'create' | 'none'): void {
    const prevMode = this.userMappingMode();
    this.userMappingMode.set(mode);

    if (mode === 'create') {
      this.selectedUserId.set('');
      const nextNum = this.salespersons().length + 1;
      this.newUserName.set(`sales${nextNum}`);
      this.newUserPassword.set('Sales@123456');
      this.targetUserRole.set('Salesperson');

      // Clear the previously linked user's data so the form below starts fresh!
      this.formNameAr.set('');
      this.formNameEn.set('');
      this.unifiedSalespersonName.set('');
      this.backgroundTranslation.set('');
      this.formEmail.set('');
      this.formPhone.set('');
    } else if (mode === 'none') {
      this.selectedUserId.set('');
      this.newUserName.set('');
      this.newUserPassword.set('');

      // Clear the previously linked user's data so the form below starts fresh!
      this.formNameAr.set('');
      this.formNameEn.set('');
      this.unifiedSalespersonName.set('');
      this.backgroundTranslation.set('');
      this.formEmail.set('');
      this.formPhone.set('');
    } else if (mode === 'link') {
      const current = this.selectedUserId();
      if (current) {
        this.onUserSelected(current);
      } else {
        this.onUserSelected('');
      }
    }
  }

  openCreateModal() {
    this.isEditMode.set(false);
    this.currentId.set(null);
    const nextNum = this.salespersons().length + 1;
    this.formCode.set(`SAL-${nextNum.toString().padStart(3, '0')}`);
    this.formNameAr.set('');
    this.formNameEn.set('');
    this.unifiedSalespersonName.set('');
    this.backgroundTranslation.set('');
    this.formPhone.set('');
    this.formEmail.set('');
    this.selectedPresetWarehouse.set('WH-VAN-01');
    this.formWarehouseCode.set('WH-VAN-01');
    this.formWarehouseNameAr.set('مستودع سيارة التوزيع 01');
    this.formCommissionRate.set(0);
    this.formIsActive.set(true);

    // Default Operational Permissions
    this.formCanGiveDiscount.set(true);
    this.formMaxDiscountPercent.set(5);
    this.formCanSellCredit.set(false);
    this.formCanEditPrice.set(false);
    this.formCanProcessReturns.set(false);
    this.formCanSellBelowCost.set(false);
    this.formCanViewCostPrice.set(false);
    this.formCanSellFromAnyWarehouse.set(false);
    this.targetUserRole.set('Salesperson');

    // Default Mode: Clean slate with no forced user selection
    const unlinked = this.unlinkedUsers();
    if (unlinked.length > 0) {
      this.userMappingMode.set('link');
      this.selectedUserId.set('');
    } else {
      this.userMappingMode.set('create');
      this.selectedUserId.set('');
    }

    this.newUserName.set(`sales${nextNum}`);
    this.newUserPassword.set('Sales@123456');
    this.showModal.set(true);
  }

  openEditModal(s: SalespersonDto) {
    this.isEditMode.set(true);
    this.currentId.set(s.id);
    this.formCode.set(s.code);
    this.formNameAr.set(s.nameAr);
    this.formNameEn.set(s.nameEn);
    this.unifiedSalespersonName.set(s.nameAr || s.nameEn || '');
    this.backgroundTranslation.set(s.nameEn ? this.langService.t('salespersons.alerts.englishTranslation').replace('{text}', s.nameEn) : '');
    this.formPhone.set(s.phoneNumber || '');
    this.formEmail.set(s.email || '');
    this.formWarehouseCode.set(s.warehouseCode);
    this.formWarehouseNameAr.set(s.warehouseNameAr);
    
    const preset = this.presetWarehouses.find(w => w.code === s.warehouseCode);
    this.selectedPresetWarehouse.set(preset ? preset.code : 'CUSTOM');

    this.formCommissionRate.set(s.commissionRate);
    this.formIsActive.set(s.isActive);

    // Populate Operational Permissions
    this.formCanGiveDiscount.set(s.canGiveDiscount ?? true);
    this.formMaxDiscountPercent.set(s.maxDiscountPercent ?? 5);
    this.formCanSellCredit.set(s.canSellCredit ?? false);
    this.formCanEditPrice.set(s.canEditPrice ?? false);
    this.formCanProcessReturns.set(s.canProcessReturns ?? false);
    this.formCanSellBelowCost.set(s.canSellBelowCost ?? false);
    this.formCanViewCostPrice.set(s.canViewCostPrice ?? false);
    this.formCanSellFromAnyWarehouse.set(s.canSellFromAnyWarehouse ?? false);
    this.targetUserRole.set(s.userRole || 'Salesperson');

    if (s.userId) {
      this.userMappingMode.set('link');
      this.selectedUserId.set(s.userId);
    } else {
      this.userMappingMode.set('none');
      this.selectedUserId.set('');
    }

    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveSalesperson() {
    if (!this.formNameAr().trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('salespersons.alerts.warning'),
        text: this.langService.t('salespersons.alerts.nameRequired')
      });
      return;
    }

    this.isSubmitting.set(true);

    if (this.isEditMode() && this.currentId()) {
      // Update
      const req: UpdateSalespersonRequest = {
        nameAr: this.formNameAr().trim(),
        nameEn: this.formNameEn().trim() || this.formNameAr().trim(),
        phoneNumber: this.formPhone().trim() || undefined,
        email: this.formEmail().trim() || undefined,
        userId: this.userMappingMode() === 'link' && this.selectedUserId() ? this.selectedUserId() : undefined,
        userName: this.userMappingMode() === 'link' 
          ? (this.availableUsers().find(u => u.id === this.selectedUserId())?.userName)
          : undefined,
        targetRole: this.targetUserRole(),
        warehouseCode: this.formWarehouseCode().trim(),
        warehouseNameAr: this.formWarehouseNameAr().trim(),
        commissionRate: this.formCommissionRate(),
        isActive: this.formIsActive(),
        canGiveDiscount: this.formCanGiveDiscount(),
        maxDiscountPercent: this.formMaxDiscountPercent(),
        canSellCredit: this.formCanSellCredit(),
        canEditPrice: this.formCanEditPrice(),
        canProcessReturns: this.formCanProcessReturns(),
        canSellBelowCost: this.formCanSellBelowCost(),
        canViewCostPrice: this.formCanViewCostPrice(),
        canSellFromAnyWarehouse: this.formCanSellFromAnyWarehouse()
      };

      this.salespersonsService.updateSalesperson(this.currentId()!, req).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadData();
          Swal.fire({
            icon: 'success',
            title: this.langService.t('salespersons.alerts.savedTitle'),
            text: this.langService.t('salespersons.alerts.savedText'),
            timer: 1500,
            showConfirmButton: false
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          Swal.fire({
            icon: 'error',
            title: this.langService.t('salespersons.alerts.errorTitle'),
            text: err.error?.message || this.langService.t('salespersons.alerts.updateFailed')
          });
        }
      });
    } else {
      // Create
      const req: CreateSalespersonRequest = {
        code: this.formCode().trim(),
        nameAr: this.formNameAr().trim(),
        nameEn: this.formNameEn().trim() || this.formNameAr().trim(),
        phoneNumber: this.formPhone().trim() || undefined,
        email: this.formEmail().trim() || undefined,
        warehouseCode: this.formWarehouseCode().trim(),
        warehouseNameAr: this.formWarehouseNameAr().trim(),
        commissionRate: this.formCommissionRate(),
        createUserAccount: this.userMappingMode() === 'create',
        userName: this.userMappingMode() === 'create' 
          ? this.newUserName().trim() 
          : (this.userMappingMode() === 'link' ? this.availableUsers().find(u => u.id === this.selectedUserId())?.userName : undefined),
        userPassword: this.userMappingMode() === 'create' ? this.newUserPassword() : undefined,
        targetRole: this.targetUserRole(),
        userId: this.userMappingMode() === 'link' && this.selectedUserId() ? this.selectedUserId() : undefined,
        canGiveDiscount: this.formCanGiveDiscount(),
        maxDiscountPercent: this.formMaxDiscountPercent(),
        canSellCredit: this.formCanSellCredit(),
        canEditPrice: this.formCanEditPrice(),
        canProcessReturns: this.formCanProcessReturns(),
        canSellBelowCost: this.formCanSellBelowCost(),
        canViewCostPrice: this.formCanViewCostPrice(),
        canSellFromAnyWarehouse: this.formCanSellFromAnyWarehouse()
      };

      this.salespersonsService.createSalesperson(req).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadData();
          this.loadUsers();
          Swal.fire({
            icon: 'success',
            title: this.langService.t('salespersons.alerts.createdTitle'),
            text: this.langService.t('salespersons.alerts.createdText'),
            timer: 1600,
            showConfirmButton: false
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          Swal.fire({
            icon: 'error',
            title: this.langService.t('salespersons.alerts.errorTitle'),
            text: err.error?.message || this.langService.t('salespersons.alerts.createFailed')
          });
        }
      });
    }
  }

  toggleActive(s: SalespersonDto) {
    this.salespersonsService.toggleActive(s.id).subscribe({
      next: (res) => {
        this.salespersons.update(list => list.map(item => item.id === s.id ? { ...item, isActive: res.isActive } : item));
      }
    });
  }
}
