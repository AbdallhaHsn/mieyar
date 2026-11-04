import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  SalespersonsService,
  SalespersonDto,
  AvailableUserDto,
  CreateSalespersonRequest,
  UpdateSalespersonRequest,
  SalesDepartmentOption
} from '../../../core/services/salespersons.service';
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
  filterDepartment = signal<string>('all');

  // Full-Page Workspace State (replaces popup modal)
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

  // Smart Creatable, Editable & Deletable Department Field Signals
  defaultDepartments: SalesDepartmentOption[] = [
    { nameAr: 'مبيعات التجزئة والمعارض', nameEn: 'Retail & Showrooms Sales' },
    { nameAr: 'مبيعات الجملة والتوزيع', nameEn: 'Wholesale & Distribution' },
    { nameAr: 'مبيعات الشركات والمشاريع (B2B)', nameEn: 'Corporate & B2B Sales' },
    { nameAr: 'المبيعات الميدانية والمناديب', nameEn: 'Field & Van Sales' },
    { nameAr: 'المبيعات الرقمية والتجارة الإلكترونية', nameEn: 'Digital & E-Commerce Sales' },
    { nameAr: 'مبيعات الفروع والامتياز التجاري', nameEn: 'Branches & Franchise Sales' }
  ];

  departments = signal<SalesDepartmentOption[]>([...this.defaultDepartments]);
  formDepartmentInput = signal<string>('');
  formDepartmentAr = signal<string>('');
  formDepartmentEn = signal<string>('');
  deptTranslationBadge = signal<string>('');
  isDeptDropdownOpen = signal<boolean>(false);

  // Inline Edit State for Department Dropdown Items
  editingDeptOriginalAr = signal<string | null>(null);
  editingDeptInput = signal<string>('');
  editingDeptTranslatedPreview = signal<string>('');

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
  uniqueDepartmentsCount = computed(() => {
    const set = new Set(this.salespersons().map(s => s.departmentName).filter(Boolean));
    return set.size || this.departments().length;
  });

  // Smart Department Combobox Computed Signals
  filteredDepartments = computed(() => {
    const list = this.departments();
    const raw = (this.formDepartmentInput() || '').trim().toLowerCase();
    if (!raw) return list;
    // If input exactly matches an existing department, still show all options so user can switch/edit/delete easily
    const exactMatch = list.some(d => d.nameAr.toLowerCase() === raw || d.nameEn.toLowerCase() === raw);
    if (exactMatch) return list;
    return list.filter(
      d => d.nameAr.toLowerCase().includes(raw) || d.nameEn.toLowerCase().includes(raw)
    );
  });

  isNewCustomDepartment = computed(() => {
    const raw = (this.formDepartmentInput() || '').trim();
    if (!raw) return false;
    const lower = raw.toLowerCase();
    return !this.departments().some(
      d => d.nameAr.trim().toLowerCase() === lower || d.nameEn.trim().toLowerCase() === lower
    );
  });

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Filtered List
  filteredSalespersons = computed(() => {
    return this.salespersons().filter(s => {
      if (this.filterStatus() === 'active' && !s.isActive) return false;
      if (this.filterStatus() === 'inactive' && s.isActive) return false;
      if (this.filterDepartment() !== 'all') {
        if ((s.departmentName || '') !== this.filterDepartment()) return false;
      }
      if (this.searchTerm()) {
        const q = this.searchTerm().toLowerCase();
        return (s.code || '').toLowerCase().includes(q) ||
               (s.nameAr || '').toLowerCase().includes(q) ||
               (s.nameEn || '').toLowerCase().includes(q) ||
               (s.departmentName || '').toLowerCase().includes(q) ||
               (s.departmentNameEn || '').toLowerCase().includes(q) ||
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dept-combobox-wrapper') && !target.closest('.swal2-container')) {
      this.isDeptDropdownOpen.set(false);
      this.editingDeptOriginalAr.set(null);
    }
  }

  ngOnInit() {
    this.loadDepartmentsCatalog();
    this.loadData();
    this.loadUsers();
  }

  private getDeptStorageKey(): string {
    const compId = this.companyContext.activeCompany().id || 'default';
    return `alrobban_sales_departments_${compId}`;
  }

  private getDeletedDeptsStorageKey(): string {
    const compId = this.companyContext.activeCompany().id || 'default';
    return `alrobban_deleted_sales_depts_${compId}`;
  }

  private getRepDeptFallbackKey(): string {
    const compId = this.companyContext.activeCompany().id || 'default';
    return `alrobban_rep_dept_map_${compId}`;
  }

  private getDeletedDeptsSet(): Set<string> {
    try {
      const raw = localStorage.getItem(this.getDeletedDeptsStorageKey());
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        return new Set(arr.map(x => x.trim().toLowerCase()));
      }
    } catch {}
    return new Set<string>();
  }

  private markDepartmentDeleted(nameAr: string, nameEn?: string) {
    try {
      const set = this.getDeletedDeptsSet();
      if (nameAr) set.add(nameAr.trim().toLowerCase());
      if (nameEn) set.add(nameEn.trim().toLowerCase());
      localStorage.setItem(this.getDeletedDeptsStorageKey(), JSON.stringify(Array.from(set)));
    } catch {}
  }

  private unmarkDepartmentDeleted(nameAr: string, nameEn?: string) {
    try {
      const set = this.getDeletedDeptsSet();
      if (nameAr) set.delete(nameAr.trim().toLowerCase());
      if (nameEn) set.delete(nameEn.trim().toLowerCase());
      localStorage.setItem(this.getDeletedDeptsStorageKey(), JSON.stringify(Array.from(set)));
    } catch {}
  }

  private persistDepartmentsCatalog(list: SalesDepartmentOption[]) {
    this.departments.set(list);
    try {
      localStorage.setItem(this.getDeptStorageKey(), JSON.stringify(list));
    } catch {}
    this.salespersonsService.saveDepartmentsStore(list).subscribe({ error: () => {} });
  }

  loadDepartmentsCatalog() {
    let loadedAuthoritative = false;

    // 1. Load from localStorage immediately for zero-latency UI (respecting edits & deletions)
    try {
      const savedJson = localStorage.getItem(this.getDeptStorageKey());
      if (savedJson !== null) {
        const parsed: SalesDepartmentOption[] = JSON.parse(savedJson);
        if (Array.isArray(parsed)) {
          this.departments.set(parsed);
          loadedAuthoritative = true;
        }
      }
    } catch {}

    // 2. Load from SystemKeyValueStores on Backend
    this.salespersonsService.getSavedDepartmentsStore().subscribe({
      next: (res) => {
        if (res?.found && Array.isArray(res.data)) {
          if (!loadedAuthoritative) {
            this.departments.set(res.data);
            loadedAuthoritative = true;
            try {
              localStorage.setItem(this.getDeptStorageKey(), JSON.stringify(res.data));
            } catch {}
          } else {
            this.mergeDepartments(res.data);
          }
        }
      },
      error: () => {}
    });

    // 3. Load distinct departments from Salespersons table on Backend
    this.salespersonsService.getDepartments().subscribe({
      next: (depts) => {
        if (Array.isArray(depts) && depts.length > 0) {
          this.mergeDepartments(depts);
        }
      },
      error: () => {}
    });
  }

  private mergeDepartments(incoming: SalesDepartmentOption[]) {
    if (!incoming || incoming.length === 0) return;
    const deletedSet = this.getDeletedDeptsSet();
    const current = [...this.departments()];
    let changed = false;

    for (const item of incoming) {
      const ar = (item.nameAr || '').trim();
      const en = (item.nameEn || ar).trim();
      if (!ar) continue;
      if (deletedSet.has(ar.toLowerCase()) || (en && deletedSet.has(en.toLowerCase()))) {
        continue;
      }
      const exists = current.some(
        d => d.nameAr.trim().toLowerCase() === ar.toLowerCase() ||
             (en && d.nameEn.trim().toLowerCase() === en.toLowerCase())
      );
      if (!exists) {
        current.push({ nameAr: ar, nameEn: en, isCustom: item.isCustom ?? true });
        changed = true;
      }
    }

    if (changed) {
      this.departments.set(current);
      try {
        localStorage.setItem(this.getDeptStorageKey(), JSON.stringify(current));
      } catch {}
    }
  }

  loadData() {
    this.isLoading.set(true);
    this.salespersonsService.getSalespersons().subscribe({
      next: (res) => {
        const list = res || [];
        let fallbackMap: Record<string, { departmentName: string; departmentNameEn: string }> = {};
        try {
          const raw = localStorage.getItem(this.getRepDeptFallbackKey());
          if (raw) fallbackMap = JSON.parse(raw);
        } catch {}

        const discoveredDepts: SalesDepartmentOption[] = [];
        const enriched = list.map(s => {
          const fb = fallbackMap[s.id] || fallbackMap[s.code];
          const departmentName = s.departmentName || fb?.departmentName || undefined;
          const departmentNameEn = s.departmentNameEn || fb?.departmentNameEn || departmentName;
          if (departmentName) {
            discoveredDepts.push({ nameAr: departmentName, nameEn: departmentNameEn || departmentName, isCustom: true });
          }
          return { ...s, departmentName, departmentNameEn };
        });

        if (discoveredDepts.length > 0) {
          this.mergeDepartments(discoveredDepts);
        }

        this.salespersons.set(enriched);
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

  // Smart Department Input & Auto-Translation (Rule 1)
  onDepartmentInputChange(val: string) {
    this.formDepartmentInput.set(val);
    this.isDeptDropdownOpen.set(true);

    const text = (val || '').trim();
    if (!text) {
      this.formDepartmentAr.set('');
      this.formDepartmentEn.set('');
      this.deptTranslationBadge.set('');
      return;
    }

    // Check if it matches an existing department
    const existing = this.departments().find(
      d => d.nameAr.trim().toLowerCase() === text.toLowerCase() ||
           d.nameEn.trim().toLowerCase() === text.toLowerCase()
    );

    if (existing) {
      this.formDepartmentAr.set(existing.nameAr);
      this.formDepartmentEn.set(existing.nameEn);
      this.deptTranslationBadge.set(
        this.langService.currentLang() === 'ar' ? existing.nameEn : existing.nameAr
      );
      return;
    }

    // New Department: Auto-translate via AccountingTranslatorService (Rule 1)
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.formDepartmentAr.set(text);
      const instantEn = this.translator.translateArabicToEnglish(text);
      this.formDepartmentEn.set(instantEn);
      this.deptTranslationBadge.set(instantEn);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          if (this.formDepartmentInput().trim() === text) {
            this.formDepartmentEn.set(refined);
            this.deptTranslationBadge.set(refined);
          }
        }
      );
    } else {
      this.formDepartmentEn.set(text);
      const instantAr = this.translator.translateEnglishToArabic(text);
      this.formDepartmentAr.set(instantAr);
      this.deptTranslationBadge.set(instantAr);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined && this.formDepartmentInput().trim() === text) {
          this.formDepartmentAr.set(refined);
          this.deptTranslationBadge.set(refined);
        }
      });
    }
  }

  selectDepartment(dept: SalesDepartmentOption) {
    if (this.editingDeptOriginalAr() === dept.nameAr) return;
    const display = this.langService.currentLang() === 'ar' ? dept.nameAr : (dept.nameEn || dept.nameAr);
    this.formDepartmentInput.set(display);
    this.formDepartmentAr.set(dept.nameAr);
    this.formDepartmentEn.set(dept.nameEn || dept.nameAr);
    this.deptTranslationBadge.set(
      this.langService.currentLang() === 'ar' ? dept.nameEn : dept.nameAr
    );
    this.isDeptDropdownOpen.set(false);
    this.editingDeptOriginalAr.set(null);
  }

  // =========================================================================
  // INLINE EDIT & DELETE DEPARTMENT ACTIONS (INSIDE DROPDOWN)
  // =========================================================================
  startEditDepartment(dept: SalesDepartmentOption, event: Event) {
    event.stopPropagation();
    this.editingDeptOriginalAr.set(dept.nameAr);
    const currentDisplay = this.langService.currentLang() === 'ar' ? dept.nameAr : (dept.nameEn || dept.nameAr);
    this.editingDeptInput.set(currentDisplay);
    this.editingDeptTranslatedPreview.set(
      this.langService.currentLang() === 'ar' ? (dept.nameEn || '') : dept.nameAr
    );
  }

  onEditDeptInputChange(val: string) {
    this.editingDeptInput.set(val);
    const text = (val || '').trim();
    if (!text) {
      this.editingDeptTranslatedPreview.set('');
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.editingDeptTranslatedPreview.set(this.translator.translateArabicToEnglish(text));
    } else {
      this.editingDeptTranslatedPreview.set(this.translator.translateEnglishToArabic(text));
    }
  }

  cancelEditDepartment(event: Event) {
    event.stopPropagation();
    this.editingDeptOriginalAr.set(null);
    this.editingDeptInput.set('');
    this.editingDeptTranslatedPreview.set('');
  }

  saveEditDepartment(dept: SalesDepartmentOption, event: Event) {
    event.stopPropagation();
    const raw = (this.editingDeptInput() || '').trim();
    if (!raw) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.currentLang() === 'ar' ? 'تنبيه' : 'Warning',
        text: this.langService.currentLang() === 'ar' ? 'يرجى كتابة اسم القسم قبل الحفظ.' : 'Please enter a department name.',
        confirmButtonColor: '#059669'
      });
      return;
    }

    const isAr = this.translator.containsArabic(raw);
    const newNameAr = isAr ? raw : (this.translator.translateEnglishToArabic(raw) || raw);
    const newNameEn = isAr ? (this.translator.translateArabicToEnglish(raw) || raw) : raw;

    // Check duplicate against other items
    const duplicate = this.departments().some(
      d => d.nameAr !== dept.nameAr &&
           (d.nameAr.trim().toLowerCase() === newNameAr.toLowerCase() ||
            d.nameEn.trim().toLowerCase() === newNameEn.toLowerCase())
    );
    if (duplicate) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.currentLang() === 'ar' ? 'القسم موجود مسبقاً' : 'Duplicate Department',
        text: this.langService.currentLang() === 'ar' ? 'يوجد قسم آخر مسجل بنفس الاسم في القائمة.' : 'Another department with this name already exists.',
        confirmButtonColor: '#059669'
      });
      return;
    }

    const oldNameAr = dept.nameAr;
    const updatedList = this.departments().map(item =>
      item.nameAr === oldNameAr
        ? { ...item, nameAr: newNameAr, nameEn: newNameEn }
        : item
    );

    this.markDepartmentDeleted(oldNameAr, dept.nameEn);
    this.unmarkDepartmentDeleted(newNameAr, newNameEn);
    this.persistDepartmentsCatalog(updatedList);

    // If this department was currently selected in the form, update the form selection
    if (this.formDepartmentAr() === oldNameAr) {
      const display = this.langService.currentLang() === 'ar' ? newNameAr : newNameEn;
      this.formDepartmentInput.set(display);
      this.formDepartmentAr.set(newNameAr);
      this.formDepartmentEn.set(newNameEn);
      this.deptTranslationBadge.set(this.langService.currentLang() === 'ar' ? newNameEn : newNameAr);
    }

    // Update any salespersons in memory & fallback storage using the old department name
    this.salespersons.update(list =>
      list.map(s =>
        s.departmentName === oldNameAr
          ? { ...s, departmentName: newNameAr, departmentNameEn: newNameEn }
          : s
      )
    );

    this.editingDeptOriginalAr.set(null);
    this.editingDeptInput.set('');
    this.editingDeptTranslatedPreview.set('');
  }

  deleteDepartment(dept: SalesDepartmentOption, event: Event) {
    event.stopPropagation();
    const isAr = this.langService.currentLang() === 'ar';
    const displayName = isAr ? dept.nameAr : (dept.nameEn || dept.nameAr);

    Swal.fire({
      icon: 'warning',
      title: isAr ? 'حذف القسم من القائمة؟' : 'Delete Department?',
      text: isAr
        ? `هل أنت متأكد من حذف قسم "${displayName}" من قائمة الأقسام المسجلة؟`
        : `Are you sure you want to delete "${displayName}" from the registered departments list?`,
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، حذف القسم' : 'Yes, Delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedList = this.departments().filter(d => d.nameAr !== dept.nameAr);
        this.markDepartmentDeleted(dept.nameAr, dept.nameEn);
        this.persistDepartmentsCatalog(updatedList);

        if (this.formDepartmentAr() === dept.nameAr) {
          this.clearDepartmentSelection();
        }
        if (this.filterDepartment() === dept.nameAr) {
          this.filterDepartment.set('all');
        }
        if (this.editingDeptOriginalAr() === dept.nameAr) {
          this.editingDeptOriginalAr.set(null);
        }
        this.isDeptDropdownOpen.set(true);
      }
    });
  }

  confirmCustomDepartmentFromDropdown() {
    this.isDeptDropdownOpen.set(false);
  }

  clearDepartmentSelection() {
    this.formDepartmentInput.set('');
    this.formDepartmentAr.set('');
    this.formDepartmentEn.set('');
    this.deptTranslationBadge.set('');
    this.isDeptDropdownOpen.set(true);
  }

  /**
   * Automatically registers the department in the dropdown list if it doesn't exist yet,
   * persisting it to localStorage and the Backend store so it appears next time.
   */
  private ensureDepartmentRegistered(): { nameAr?: string; nameEn?: string; wasNew: boolean } {
    const rawInput = (this.formDepartmentInput() || '').trim();
    if (!rawInput) {
      return { nameAr: undefined, nameEn: undefined, wasNew: false };
    }

    const nameAr = (this.formDepartmentAr() || rawInput).trim();
    const nameEn = (this.formDepartmentEn() || this.translator.translateArabicToEnglish(nameAr) || nameAr).trim();

    const existing = this.departments().find(
      d => d.nameAr.trim().toLowerCase() === nameAr.toLowerCase() ||
           d.nameEn.trim().toLowerCase() === nameEn.toLowerCase() ||
           d.nameAr.trim().toLowerCase() === rawInput.toLowerCase()
    );

    if (existing) {
      return { nameAr: existing.nameAr, nameEn: existing.nameEn, wasNew: false };
    }

    const newDept: SalesDepartmentOption = {
      nameAr,
      nameEn,
      isCustom: true
    };

    this.unmarkDepartmentDeleted(nameAr, nameEn);
    const updatedList = [...this.departments(), newDept];
    this.persistDepartmentsCatalog(updatedList);

    return { nameAr, nameEn, wasNew: true };
  }

  private saveRepDepartmentFallback(idOrCode: string, nameAr?: string, nameEn?: string) {
    if (!idOrCode || !nameAr) return;
    try {
      const key = this.getRepDeptFallbackKey();
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      map[idOrCode] = { departmentName: nameAr, departmentNameEn: nameEn || nameAr };
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
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
    this.userMappingMode.set(mode);

    if (mode === 'create') {
      this.selectedUserId.set('');
      const nextNum = this.salespersons().length + 1;
      this.newUserName.set(`sales${nextNum}`);
      this.newUserPassword.set('Sales@123456');
      this.targetUserRole.set('Salesperson');

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
    this.formDepartmentInput.set('');
    this.formDepartmentAr.set('');
    this.formDepartmentEn.set('');
    this.deptTranslationBadge.set('');
    this.isDeptDropdownOpen.set(false);
    this.editingDeptOriginalAr.set(null);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Populate Department
    const deptAr = s.departmentName || '';
    const deptEn = s.departmentNameEn || deptAr;
    this.formDepartmentInput.set(this.langService.currentLang() === 'ar' ? deptAr : (deptEn || deptAr));
    this.formDepartmentAr.set(deptAr);
    this.formDepartmentEn.set(deptEn);
    this.deptTranslationBadge.set(deptEn && deptEn !== deptAr ? deptEn : '');
    this.isDeptDropdownOpen.set(false);
    this.editingDeptOriginalAr.set(null);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeModal() {
    this.showModal.set(false);
    this.isDeptDropdownOpen.set(false);
    this.editingDeptOriginalAr.set(null);
  }

  saveSalesperson() {
    if (!this.formNameAr().trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('salespersons.alerts.warning'),
        text: this.langService.t('salespersons.alerts.nameRequired'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    // Automatically register department if it's not yet in the dropdown list
    const deptInfo = this.ensureDepartmentRegistered();

    this.isSubmitting.set(true);

    if (this.isEditMode() && this.currentId()) {
      const req: UpdateSalespersonRequest = {
        nameAr: this.formNameAr().trim(),
        nameEn: this.formNameEn().trim() || this.formNameAr().trim(),
        phoneNumber: this.formPhone().trim() || undefined,
        email: this.formEmail().trim() || undefined,
        departmentName: deptInfo.nameAr,
        departmentNameEn: deptInfo.nameEn,
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
          this.saveRepDepartmentFallback(this.currentId()!, deptInfo.nameAr, deptInfo.nameEn);
          this.saveRepDepartmentFallback(this.formCode(), deptInfo.nameAr, deptInfo.nameEn);
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadData();
          Swal.fire({
            icon: 'success',
            title: this.langService.t('salespersons.alerts.savedTitle'),
            text: deptInfo.wasNew
              ? `${this.langService.t('salespersons.alerts.savedText')} — تم تسجيل القسم الجديد (${deptInfo.nameAr}) في القائمة تلقائياً.`
              : this.langService.t('salespersons.alerts.savedText'),
            timer: 1800,
            showConfirmButton: false
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          Swal.fire({
            icon: 'error',
            title: this.langService.t('salespersons.alerts.errorTitle'),
            text: err.error?.message || this.langService.t('salespersons.alerts.updateFailed'),
            confirmButtonColor: '#059669'
          });
        }
      });
    } else {
      const req: CreateSalespersonRequest = {
        code: this.formCode().trim(),
        nameAr: this.formNameAr().trim(),
        nameEn: this.formNameEn().trim() || this.formNameAr().trim(),
        phoneNumber: this.formPhone().trim() || undefined,
        email: this.formEmail().trim() || undefined,
        departmentName: deptInfo.nameAr,
        departmentNameEn: deptInfo.nameEn,
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
        next: (created) => {
          if (created?.id) {
            this.saveRepDepartmentFallback(created.id, deptInfo.nameAr, deptInfo.nameEn);
          }
          this.saveRepDepartmentFallback(this.formCode(), deptInfo.nameAr, deptInfo.nameEn);
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadData();
          this.loadUsers();
          Swal.fire({
            icon: 'success',
            title: this.langService.t('salespersons.alerts.createdTitle'),
            text: deptInfo.wasNew
              ? `${this.langService.t('salespersons.alerts.createdText')} — تم تسجيل القسم الجديد (${deptInfo.nameAr}) في القائمة تلقائياً.`
              : this.langService.t('salespersons.alerts.createdText'),
            timer: 1800,
            showConfirmButton: false
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          Swal.fire({
            icon: 'error',
            title: this.langService.t('salespersons.alerts.errorTitle'),
            text: err.error?.message || this.langService.t('salespersons.alerts.createFailed'),
            confirmButtonColor: '#059669'
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
