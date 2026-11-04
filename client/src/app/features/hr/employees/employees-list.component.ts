import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  HrService,
  EmployeeDto,
  EmployeeStatus,
  ContractType,
  Gender,
  EndOfServiceReason,
  EosbCalculationResultDto,
  HrDepartmentOption
} from '../../../core/services/hr.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../core/services/language.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

interface BankOption {
  code: string;
  nameAr: string;
  nameEn: string;
}

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TranslatePipe],
  templateUrl: './employees-list.component.html',
  styleUrls: ['./employees-list.component.scss']
})
export class EmployeesListComponent implements OnInit {
  public langService = inject(LanguageService);
  private hrService = inject(HrService);
  public translator = inject(AccountingTranslatorService);
  public companyContext = inject(CompanyContextService);

  // Data
  employees: EmployeeDto[] = [];
  filteredEmployees: EmployeeDto[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Search & Filter
  searchTerm = '';
  statusFilter = 'ALL';
  nationalityFilter = 'ALL';
  departmentFilter = 'ALL';

  // Smart Creatable, Editable & Deletable HR Departments Catalog
  defaultDepartments: HrDepartmentOption[] = [
    { nameAr: 'الإدارة العامة', nameEn: 'General Management' },
    { nameAr: 'الموارد البشرية والشؤون الإدارية', nameEn: 'HR & Administration' },
    { nameAr: 'الإدارة المالية والمحاسبة', nameEn: 'Finance & Accounting' },
    { nameAr: 'المبيعات والتسويق', nameEn: 'Sales & Marketing' },
    { nameAr: 'المشتريات وسلاسل الإمداد', nameEn: 'Procurement & Supply Chain' },
    { nameAr: 'تقنية المعلومات والتحول الرقمي', nameEn: 'IT & Digital Transformation' },
    { nameAr: 'المشاريع والتشغيل', nameEn: 'Projects & Operations' }
  ];

  departments: HrDepartmentOption[] = [...this.defaultDepartments];
  formDepartmentInput = '';
  formDepartmentAr = '';
  formDepartmentEn = '';
  deptTranslationBadge = '';
  isDeptDropdownOpen = false;

  // Inline Edit State for Department Dropdown Items
  editingDeptOriginalAr: string | null = null;
  editingDeptInput = '';
  editingDeptTranslatedPreview = '';

  // Bank Options for WPS / Mudad
  bankOptions: BankOption[] = [
    { code: 'RJHI', nameAr: 'مصرف الراجحي', nameEn: 'Al Rajhi Bank' },
    { code: 'NCB', nameAr: 'البنك الأهلي السعودي (SNB)', nameEn: 'Saudi National Bank' },
    { code: 'INMA', nameAr: 'مصرف الإنماء', nameEn: 'Alinma Bank' },
    { code: 'RIBL', nameAr: 'بنك الرياض', nameEn: 'Riyad Bank' },
    { code: 'ALBI', nameAr: 'بنك البلاد', nameEn: 'Bank Albilad' },
    { code: 'BJAZ', nameAr: 'بنك الجزيرة', nameEn: 'Bank AlJazira' },
    { code: 'ARNB', nameAr: 'البنك العربي الوطني (ANB)', nameEn: 'Arab National Bank' },
    { code: 'SABB', nameAr: 'البنك السعودي البريطاني (SABB / الأول)', nameEn: 'Saudi Awwal Bank' },
    { code: 'BSFR', nameAr: 'البنك السعودي الفرنسي (BSF)', nameEn: 'Banque Saudi Fransi' },
    { code: 'SIBC', nameAr: 'البنك السعودي للاستثمار (SAIB)', nameEn: 'Saudi Investment Bank' }
  ];

  // Full-Page Workspace States (Replaces Popup Modals)
  showModal = false;
  isEditMode = false;
  editingId: string | null = null;

  form = {
    employeeNumber: '',
    firstNameAr: '',
    lastNameAr: '',
    firstNameEn: '',
    lastNameEn: '',
    nationalIdOrIqama: '',
    nationality: 'سعودي',
    isSaudi: true,
    gender: Gender.Male,
    dateOfBirth: '',
    mobileNumber: '',
    email: '',
    departmentName: 'الإدارة العامة',
    jobTitleAr: '',
    jobTitleEn: '',
    hireDate: new Date().toISOString().substring(0, 10),
    contractType: ContractType.Limited,
    contractEndDate: '',
    status: EmployeeStatus.Active,
    bankCode: 'RJHI',
    bankName: 'مصرف الراجحي',
    iban: 'SA',
    basicSalary: 6000,
    housingAllowance: 1500,
    transportationAllowance: 600,
    otherAllowances: 0
  };

  // EOSB Workspace / Calculator State
  showEosbModal = false;
  selectedEmployeeForEosb: EmployeeDto | null = null;
  eosbHireDate = new Date().toISOString().substring(0, 10);
  eosbCalculationDate = new Date().toISOString().substring(0, 10);
  eosbYearsInput = 3;
  eosbSalaryInput = 0;
  eosbTotalDays = 0;
  eosbBaseBenefitBeforeFactor = 0;
  eosbReason: EndOfServiceReason = EndOfServiceReason.ContractEnd;
  eosbResult: EosbCalculationResultDto | null = null;
  eosbLoading = false;

  // Track manual edits to prevent overwriting user input (Rule 1)
  manualEditedFields = {
    firstNameEn: false,
    lastNameEn: false,
    jobTitleEn: false
  };

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dept-combobox-wrapper') && !target.closest('.swal2-container')) {
      this.isDeptDropdownOpen = false;
      this.editingDeptOriginalAr = null;
    }
  }

  ngOnInit(): void {
    this.loadDepartmentsCatalog();
    this.loadEmployees();
  }

  // --- SMART DEPARTMENT COMBOBOX STORAGE & COMPUTED HELPERS ---
  private getDeptStorageKey(): string {
    const compId = this.companyContext.activeCompany()?.id || 'default';
    return `alrobban_hr_departments_${compId}`;
  }

  private getDeletedDeptsStorageKey(): string {
    const compId = this.companyContext.activeCompany()?.id || 'default';
    return `alrobban_deleted_hr_depts_${compId}`;
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

  private markDepartmentDeleted(nameAr: string, nameEn?: string): void {
    try {
      const set = this.getDeletedDeptsSet();
      if (nameAr) set.add(nameAr.trim().toLowerCase());
      if (nameEn) set.add(nameEn.trim().toLowerCase());
      localStorage.setItem(this.getDeletedDeptsStorageKey(), JSON.stringify(Array.from(set)));
    } catch {}
  }

  private unmarkDepartmentDeleted(nameAr: string, nameEn?: string): void {
    try {
      const set = this.getDeletedDeptsSet();
      if (nameAr) set.delete(nameAr.trim().toLowerCase());
      if (nameEn) set.delete(nameEn.trim().toLowerCase());
      localStorage.setItem(this.getDeletedDeptsStorageKey(), JSON.stringify(Array.from(set)));
    } catch {}
  }

  private persistDepartmentsCatalog(list: HrDepartmentOption[]): void {
    this.departments = [...list];
    try {
      localStorage.setItem(this.getDeptStorageKey(), JSON.stringify(list));
    } catch {}
    this.hrService.saveDepartmentsStore(list).subscribe({ error: () => {} });
  }

  loadDepartmentsCatalog(): void {
    let loadedAuthoritative = false;

    try {
      const savedJson = localStorage.getItem(this.getDeptStorageKey());
      if (savedJson !== null) {
        const parsed: HrDepartmentOption[] = JSON.parse(savedJson);
        if (Array.isArray(parsed)) {
          this.departments = parsed;
          loadedAuthoritative = true;
        }
      }
    } catch {}

    this.hrService.getSavedDepartmentsStore().subscribe({
      next: (res) => {
        if (res?.found && Array.isArray(res.data)) {
          if (!loadedAuthoritative) {
            this.departments = res.data;
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
  }

  private mergeDepartments(incoming: HrDepartmentOption[]): void {
    if (!incoming || incoming.length === 0) return;
    const deletedSet = this.getDeletedDeptsSet();
    const current = [...this.departments];
    let changed = false;

    for (const item of incoming) {
      const rawAr = (item.nameAr || '').trim();
      const rawEn = (item.nameEn || '').trim();
      if (!rawAr && !rawEn) continue;

      let ar = rawAr;
      let en = rawEn;
      if (ar && !this.translator.containsArabic(ar)) {
        // Incoming nameAr was actually English; translate to Arabic for nameAr
        en = ar;
        ar = this.translator.containsArabic(rawEn)
          ? rawEn
          : (this.translator.translateEnglishToArabic(en) || en);
      } else if (!en || this.translator.containsArabic(en)) {
        en = this.translator.translateArabicToEnglish(ar) || ar;
      }

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
      this.departments = current;
      try {
        localStorage.setItem(this.getDeptStorageKey(), JSON.stringify(current));
      } catch {}
    }
  }

  get filteredDepartments(): HrDepartmentOption[] {
    const raw = (this.formDepartmentInput || '').trim().toLowerCase();
    if (!raw) return this.departments;
    const exactMatch = this.departments.some(
      d => d.nameAr.toLowerCase() === raw || d.nameEn.toLowerCase() === raw
    );
    if (exactMatch) return this.departments;
    return this.departments.filter(
      d => d.nameAr.toLowerCase().includes(raw) || d.nameEn.toLowerCase().includes(raw)
    );
  }

  get isNewCustomDepartment(): boolean {
    const raw = (this.formDepartmentInput || '').trim();
    if (!raw) return false;
    const lower = raw.toLowerCase();
    return !this.departments.some(
      d => d.nameAr.trim().toLowerCase() === lower || d.nameEn.trim().toLowerCase() === lower
    );
  }

  onDepartmentInputChange(val: string): void {
    this.formDepartmentInput = val;
    this.isDeptDropdownOpen = true;

    const text = (val || '').trim();
    if (!text) {
      this.formDepartmentAr = '';
      this.formDepartmentEn = '';
      this.form.departmentName = '';
      this.deptTranslationBadge = '';
      return;
    }

    const existing = this.departments.find(
      d => d.nameAr.trim().toLowerCase() === text.toLowerCase() ||
           d.nameEn.trim().toLowerCase() === text.toLowerCase()
    );

    if (existing) {
      this.formDepartmentAr = existing.nameAr;
      this.formDepartmentEn = existing.nameEn;
      this.form.departmentName = existing.nameAr;
      this.deptTranslationBadge = this.langService.currentLang() === 'ar' ? existing.nameEn : existing.nameAr;
      return;
    }

    // Auto-translate new department (Rule 1)
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.formDepartmentAr = text;
      this.form.departmentName = text;
      const instantEn = this.translator.translateArabicToEnglish(text);
      this.formDepartmentEn = instantEn;
      this.deptTranslationBadge = instantEn;
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          if (this.formDepartmentInput.trim() === text) {
            this.formDepartmentEn = refined;
            this.deptTranslationBadge = refined;
          }
        }
      );
    } else {
      this.formDepartmentEn = text;
      const instantAr = this.translator.translateEnglishToArabic(text);
      this.formDepartmentAr = instantAr;
      this.form.departmentName = instantAr || text;
      this.deptTranslationBadge = instantAr;
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined && this.formDepartmentInput.trim() === text) {
          this.formDepartmentAr = refined;
          this.form.departmentName = refined;
          this.deptTranslationBadge = refined;
        }
      });
    }
  }

  selectDepartment(dept: HrDepartmentOption): void {
    if (this.editingDeptOriginalAr === dept.nameAr) return;
    const display = this.langService.currentLang() === 'ar' ? dept.nameAr : (dept.nameEn || dept.nameAr);
    this.formDepartmentInput = display;
    this.formDepartmentAr = dept.nameAr;
    this.formDepartmentEn = dept.nameEn || dept.nameAr;
    this.form.departmentName = dept.nameAr;
    this.deptTranslationBadge = this.langService.currentLang() === 'ar' ? dept.nameEn : dept.nameAr;
    this.isDeptDropdownOpen = false;
    this.editingDeptOriginalAr = null;
  }

  confirmCustomDepartmentFromDropdown(): void {
    this.isDeptDropdownOpen = false;
  }

  clearDepartmentSelection(): void {
    this.formDepartmentInput = '';
    this.formDepartmentAr = '';
    this.formDepartmentEn = '';
    this.form.departmentName = '';
    this.deptTranslationBadge = '';
    this.isDeptDropdownOpen = true;
  }

  // Inline Edit & Delete inside Department Dropdown
  startEditDepartment(dept: HrDepartmentOption, event: Event): void {
    event.stopPropagation();
    this.editingDeptOriginalAr = dept.nameAr;
    const currentDisplay = this.langService.currentLang() === 'ar' ? dept.nameAr : (dept.nameEn || dept.nameAr);
    this.editingDeptInput = currentDisplay;
    this.editingDeptTranslatedPreview = this.langService.currentLang() === 'ar' ? (dept.nameEn || '') : dept.nameAr;
  }

  onEditDeptInputChange(val: string): void {
    this.editingDeptInput = val;
    const text = (val || '').trim();
    if (!text) {
      this.editingDeptTranslatedPreview = '';
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.editingDeptTranslatedPreview = this.translator.translateArabicToEnglish(text);
    } else {
      this.editingDeptTranslatedPreview = this.translator.translateEnglishToArabic(text);
    }
  }

  cancelEditDepartment(event: Event): void {
    event.stopPropagation();
    this.editingDeptOriginalAr = null;
    this.editingDeptInput = '';
    this.editingDeptTranslatedPreview = '';
  }

  saveEditDepartment(dept: HrDepartmentOption, event: Event): void {
    event.stopPropagation();
    const raw = (this.editingDeptInput || '').trim();
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

    const duplicate = this.departments.some(
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
    const updatedList = this.departments.map(item =>
      item.nameAr === oldNameAr
        ? { ...item, nameAr: newNameAr, nameEn: newNameEn }
        : item
    );

    this.markDepartmentDeleted(oldNameAr, dept.nameEn);
    this.unmarkDepartmentDeleted(newNameAr, newNameEn);
    this.persistDepartmentsCatalog(updatedList);

    if (this.formDepartmentAr === oldNameAr || this.form.departmentName === oldNameAr) {
      const display = this.langService.currentLang() === 'ar' ? newNameAr : newNameEn;
      this.formDepartmentInput = display;
      this.formDepartmentAr = newNameAr;
      this.formDepartmentEn = newNameEn;
      this.form.departmentName = newNameAr;
      this.deptTranslationBadge = this.langService.currentLang() === 'ar' ? newNameEn : newNameAr;
    }

    this.employees = this.employees.map(emp =>
      emp.departmentName === oldNameAr ? { ...emp, departmentName: newNameAr } : emp
    );
    this.applyFilters();

    this.editingDeptOriginalAr = null;
    this.editingDeptInput = '';
    this.editingDeptTranslatedPreview = '';
  }

  deleteDepartment(dept: HrDepartmentOption, event: Event): void {
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
        const updatedList = this.departments.filter(d => d.nameAr !== dept.nameAr);
        this.markDepartmentDeleted(dept.nameAr, dept.nameEn);
        this.persistDepartmentsCatalog(updatedList);

        if (this.formDepartmentAr === dept.nameAr || this.form.departmentName === dept.nameAr) {
          this.clearDepartmentSelection();
        }
        if (this.departmentFilter === dept.nameAr) {
          this.departmentFilter = 'ALL';
          this.applyFilters();
        }
        if (this.editingDeptOriginalAr === dept.nameAr) {
          this.editingDeptOriginalAr = null;
        }
        this.isDeptDropdownOpen = true;
      }
    });
  }

  private ensureDepartmentRegistered(): { nameAr: string; nameEn: string; wasNew: boolean } {
    const rawInput = (this.formDepartmentInput || this.form.departmentName || '').trim();
    if (!rawInput) {
      return { nameAr: 'الإدارة العامة', nameEn: 'General Management', wasNew: false };
    }

    const nameAr = (this.formDepartmentAr || rawInput).trim();
    const nameEn = (this.formDepartmentEn || this.translator.translateArabicToEnglish(nameAr) || nameAr).trim();

    const existing = this.departments.find(
      d => d.nameAr.trim().toLowerCase() === nameAr.toLowerCase() ||
           d.nameEn.trim().toLowerCase() === nameEn.toLowerCase() ||
           d.nameAr.trim().toLowerCase() === rawInput.toLowerCase()
    );

    if (existing) {
      return { nameAr: existing.nameAr, nameEn: existing.nameEn, wasNew: false };
    }

    const newDept: HrDepartmentOption = {
      nameAr,
      nameEn,
      isCustom: true
    };

    this.unmarkDepartmentDeleted(nameAr, nameEn);
    const updatedList = [...this.departments, newDept];
    this.persistDepartmentsCatalog(updatedList);

    return { nameAr, nameEn, wasNew: true };
  }

  loadEmployees(): void {
    this.loading = true;
    this.error = null;
    this.hrService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data || [];
        const discovered: HrDepartmentOption[] = [];
        for (const emp of this.employees) {
          if (emp.departmentName) {
            discovered.push({
              nameAr: emp.departmentName,
              nameEn: this.translator.translateArabicToEnglish(emp.departmentName) || emp.departmentName,
              isCustom: true
            });
          }
        }
        if (discovered.length > 0) {
          this.mergeDepartments(discovered);
        }
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = this.langService.t('hr.employees.loadError');
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let result = [...this.employees];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(e =>
        (e.employeeNumber || '').toLowerCase().includes(term) ||
        (e.fullNameAr || '').toLowerCase().includes(term) ||
        (e.fullNameEn || '').toLowerCase().includes(term) ||
        (e.nationalIdOrIqama || '').toLowerCase().includes(term) ||
        (e.departmentName || '').toLowerCase().includes(term) ||
        (e.jobTitleAr || '').toLowerCase().includes(term) ||
        (e.jobTitleEn || '').toLowerCase().includes(term)
      );
    }

    if (this.statusFilter !== 'ALL') {
      const st = parseInt(this.statusFilter, 10);
      result = result.filter(e => e.status === st);
    }

    if (this.nationalityFilter === 'SAUDI') {
      result = result.filter(e => e.isSaudi);
    } else if (this.nationalityFilter === 'NON_SAUDI') {
      result = result.filter(e => !e.isSaudi);
    }

    if (this.departmentFilter !== 'ALL') {
      result = result.filter(e => (e.departmentName || '') === this.departmentFilter);
    }

    this.filteredEmployees = result;
    this.currentPage = 1;
  }

  // --- PAGINATION ---
  currentPage = 1;
  pageSize = 10;

  get paginatedEmployees(): EmployeeDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEmployees.slice(start, start + this.pageSize);
  }

  // --- STATS COMPUTATIONS ---
  get totalCount(): number {
    return this.employees.length;
  }

  get saudiCount(): number {
    return this.employees.filter(e => e.isSaudi).length;
  }

  get saudizationRate(): number {
    if (this.totalCount === 0) return 0;
    return Math.round((this.saudiCount / this.totalCount) * 100);
  }

  get totalMonthlyGross(): number {
    return this.employees.reduce((acc, e) => acc + (e.grossSalary || 0), 0);
  }

  get totalMonthlyGosi(): number {
    return this.employees.reduce((acc, e) => acc + (e.monthlyCompanyGosi || 0) + (e.monthlyEmployeeGosi || 0), 0);
  }

  unifiedFullName = '';
  fullNameBgTranslation = '';
  firstNameBgTranslation = '';
  lastNameBgTranslation = '';
  jobTitleBgTranslation = '';

  private splitFullNameParts(fullText: string): { first: string; last: string } {
    const parts = (fullText || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', last: '' };
    if (parts.length === 1) return { first: parts[0], last: '' };
    return {
      first: parts.slice(0, -1).join(' '),
      last: parts[parts.length - 1]
    };
  }

  private applyFullNameToForm(arFull: string, enFull: string): void {
    const arParts = this.splitFullNameParts(arFull);
    const enParts = this.splitFullNameParts(enFull);
    this.form.firstNameAr = arParts.first;
    this.form.lastNameAr = arParts.last;
    this.form.firstNameEn = enParts.first;
    this.form.lastNameEn = enParts.last;
  }

  // --- RULE 1: BILINGUAL SINGLE-ENTRY SMART AUTO-TRANSLATION (QUADRUPLE NAME IN 1 FIELD) ---
  onUnifiedFullNameChange(val: string): void {
    this.unifiedFullName = val;
    const text = (val || '').trim();
    if (!text) {
      this.form.firstNameAr = '';
      this.form.lastNameAr = '';
      this.form.firstNameEn = '';
      this.form.lastNameEn = '';
      this.fullNameBgTranslation = '';
      return;
    }

    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const instantEn = this.translator.translateArabicToEnglish(text);
      this.applyFullNameToForm(text, instantEn);
      this.fullNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', instantEn);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          if (this.unifiedFullName.trim() === text) {
            this.applyFullNameToForm(text, refined);
            this.fullNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', refined);
          }
        }
      );
    } else {
      const instantAr = this.translator.translateEnglishToArabic(text);
      this.applyFullNameToForm(instantAr, text);
      this.fullNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', instantAr);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined && this.unifiedFullName.trim() === text) {
          this.applyFullNameToForm(refined, text);
          this.fullNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', refined);
        }
      });
    }
  }

  onUnifiedFirstNameChange(text: string): void {
    if (!text.trim()) {
      this.form.firstNameAr = '';
      this.form.firstNameEn = '';
      this.firstNameBgTranslation = '';
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.form.firstNameAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.form.firstNameEn = instant;
      this.firstNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', instant);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.form.firstNameEn = refined;
          this.firstNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', refined);
        }
      );
    } else {
      this.form.firstNameEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.form.firstNameAr = instant;
      this.firstNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', instant);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.form.firstNameAr = refined;
          this.firstNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', refined);
        }
      });
    }
  }

  onUnifiedLastNameChange(text: string): void {
    if (!text.trim()) {
      this.form.lastNameAr = '';
      this.form.lastNameEn = '';
      this.lastNameBgTranslation = '';
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.form.lastNameAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.form.lastNameEn = instant;
      this.lastNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', instant);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.form.lastNameEn = refined;
          this.lastNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', refined);
        }
      );
    } else {
      this.form.lastNameEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.form.lastNameAr = instant;
      this.lastNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', instant);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.form.lastNameAr = refined;
          this.lastNameBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', refined);
        }
      });
    }
  }

  onUnifiedJobTitleChange(text: string): void {
    if (!text.trim()) {
      this.form.jobTitleAr = '';
      this.form.jobTitleEn = '';
      this.jobTitleBgTranslation = '';
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.form.jobTitleAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.form.jobTitleEn = instant;
      this.jobTitleBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', instant);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.form.jobTitleEn = refined;
          this.jobTitleBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', refined);
        }
      );
    } else {
      this.form.jobTitleEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.form.jobTitleAr = instant;
      this.jobTitleBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', instant);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.form.jobTitleAr = refined;
          this.jobTitleBgTranslation = this.langService.t('hr.employees.alerts.translationPrefix').replace('{text}', refined);
        }
      });
    }
  }

  onFirstNameArChange(val: string): void {
    this.onUnifiedFirstNameChange(val);
  }

  onLastNameArChange(val: string): void {
    this.onUnifiedLastNameChange(val);
  }

  onJobTitleArChange(val: string): void {
    this.onUnifiedJobTitleChange(val);
  }

  async forceRetranslate(field: 'fullName' | 'firstName' | 'lastName' | 'jobTitle'): Promise<void> {
    if (field === 'fullName') {
      const text = (this.unifiedFullName || `${this.form.firstNameAr} ${this.form.lastNameAr}`).trim();
      if (!text) return;
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const refined = await this.translator.translateOnline(text, 'ar', 'en');
        const enFull = refined || this.translator.translateArabicToEnglish(text);
        this.applyFullNameToForm(text, enFull);
        this.fullNameBgTranslation = `${enFull}`;
      } else {
        const refined = await this.translator.translateOnline(text, 'en', 'ar');
        const arFull = refined || this.translator.translateEnglishToArabic(text);
        this.applyFullNameToForm(arFull, text);
        this.fullNameBgTranslation = `${arFull}`;
      }
    } else if (field === 'firstName') {
      const text = this.form.firstNameAr || this.form.firstNameEn;
      if (!text) return;
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const refined = await this.translator.translateOnline(text, 'ar', 'en');
        this.form.firstNameEn = refined || this.translator.translateArabicToEnglish(text);
        this.firstNameBgTranslation = `${this.form.firstNameEn}`;
      } else {
        const refined = await this.translator.translateOnline(text, 'en', 'ar');
        this.form.firstNameAr = refined || this.translator.translateEnglishToArabic(text);
        this.firstNameBgTranslation = `${this.form.firstNameAr}`;
      }
    } else if (field === 'lastName') {
      const text = this.form.lastNameAr || this.form.lastNameEn;
      if (!text) return;
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const refined = await this.translator.translateOnline(text, 'ar', 'en');
        this.form.lastNameEn = refined || this.translator.translateArabicToEnglish(text);
        this.lastNameBgTranslation = `${this.form.lastNameEn}`;
      } else {
        const refined = await this.translator.translateOnline(text, 'en', 'ar');
        this.form.lastNameAr = refined || this.translator.translateEnglishToArabic(text);
        this.lastNameBgTranslation = `${this.form.lastNameAr}`;
      }
    } else if (field === 'jobTitle') {
      const text = this.form.jobTitleAr || this.form.jobTitleEn;
      if (!text) return;
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const refined = await this.translator.translateOnline(text, 'ar', 'en');
        this.form.jobTitleEn = refined || this.translator.translateArabicToEnglish(text);
        this.jobTitleBgTranslation = `${this.form.jobTitleEn}`;
      } else {
        const refined = await this.translator.translateOnline(text, 'en', 'ar');
        this.form.jobTitleAr = refined || this.translator.translateEnglishToArabic(text);
        this.jobTitleBgTranslation = `${this.form.jobTitleAr}`;
      }
    }
  }

  onBankSelect(code: string): void {
    const b = this.bankOptions.find(opt => opt.code === code);
    if (b) {
      this.form.bankCode = b.code;
      this.form.bankName = b.nameAr;
    }
  }

  onNationalityToggle(isSaudi: boolean): void {
    this.form.isSaudi = isSaudi;
    this.form.nationality = isSaudi ? 'سعودي' : 'مقيم';
  }

  // Live GOSI Calculations
  get previewGrossSalary(): number {
    return (Number(this.form.basicSalary) || 0) +
           (Number(this.form.housingAllowance) || 0) +
           (Number(this.form.transportationAllowance) || 0) +
           (Number(this.form.otherAllowances) || 0);
  }

  get previewGosiSubject(): number {
    const basic = Number(this.form.basicSalary) || 0;
    const housing = Number(this.form.housingAllowance) || 0;
    return Math.min(45000, basic + housing);
  }

  get previewEmployeeGosi(): number {
    if (!this.form.isSaudi) return 0;
    return Math.round(this.previewGosiSubject * 0.0975);
  }

  get previewCompanyGosi(): number {
    if (this.form.isSaudi) {
      return Math.round(this.previewGosiSubject * 0.1175);
    } else {
      return Math.round(this.previewGosiSubject * 0.02);
    }
  }

  get previewNetSalary(): number {
    return Math.max(0, this.previewGrossSalary - this.previewEmployeeGosi);
  }

  // Workspace actions (No Popup Modal)
  openAddModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.showEosbModal = false;
    this.manualEditedFields = { firstNameEn: false, lastNameEn: false, jobTitleEn: false };
    this.unifiedFullName = '';
    this.fullNameBgTranslation = '';
    this.firstNameBgTranslation = '';
    this.lastNameBgTranslation = '';
    this.jobTitleBgTranslation = '';

    const defaultDept = this.departments[0] || { nameAr: 'الإدارة العامة', nameEn: 'General Management' };
    const deptAr = this.translator.containsArabic(defaultDept.nameAr)
      ? defaultDept.nameAr
      : (this.translator.translateEnglishToArabic(defaultDept.nameAr) || 'الإدارة العامة');
    const deptEn = !this.translator.containsArabic(defaultDept.nameEn) && defaultDept.nameEn
      ? defaultDept.nameEn
      : (this.translator.translateArabicToEnglish(deptAr) || 'General Management');

    this.formDepartmentInput = this.langService.currentLang() === 'ar' ? deptAr : deptEn;
    this.formDepartmentAr = deptAr;
    this.formDepartmentEn = deptEn;
    this.deptTranslationBadge = this.langService.currentLang() === 'ar' ? deptEn : deptAr;
    this.isDeptDropdownOpen = false;
    this.editingDeptOriginalAr = null;

    this.form = {
      employeeNumber: '',
      firstNameAr: '',
      lastNameAr: '',
      firstNameEn: '',
      lastNameEn: '',
      nationalIdOrIqama: '',
      nationality: 'سعودي',
      isSaudi: true,
      gender: Gender.Male,
      dateOfBirth: '',
      mobileNumber: '',
      email: '',
      departmentName: defaultDept.nameAr,
      jobTitleAr: '',
      jobTitleEn: '',
      hireDate: new Date().toISOString().substring(0, 10),
      contractType: ContractType.Limited,
      contractEndDate: '',
      status: EmployeeStatus.Active,
      bankCode: 'RJHI',
      bankName: 'مصرف الراجحي',
      iban: 'SA',
      basicSalary: 6000,
      housingAllowance: 1500,
      transportationAllowance: 600,
      otherAllowances: 0
    };
    this.showModal = true;
  }

  openEditModal(emp: EmployeeDto): void {
    this.isEditMode = true;
    this.editingId = emp.id;
    this.showEosbModal = false;
    this.manualEditedFields = { firstNameEn: true, lastNameEn: true, jobTitleEn: true };
    const fullAr = (emp.fullNameAr || `${emp.firstNameAr || ''} ${emp.lastNameAr || ''}`).trim();
    const fullEn = (emp.fullNameEn || `${emp.firstNameEn || ''} ${emp.lastNameEn || ''}`).trim();
    this.unifiedFullName = this.langService.currentLang() === 'ar' ? fullAr : (fullEn || fullAr);
    this.fullNameBgTranslation = this.langService.currentLang() === 'ar' ? fullEn : fullAr;
    this.firstNameBgTranslation = emp.firstNameEn ? `${emp.firstNameEn}` : '';
    this.lastNameBgTranslation = emp.lastNameEn ? `${emp.lastNameEn}` : '';
    this.jobTitleBgTranslation = emp.jobTitleEn ? `${emp.jobTitleEn}` : '';

    const deptAr = emp.departmentName || 'الإدارة العامة';
    const existingDept = this.departments.find(d => d.nameAr === deptAr);
    const deptEn = existingDept?.nameEn || this.translator.translateArabicToEnglish(deptAr) || deptAr;
    this.formDepartmentInput = this.langService.currentLang() === 'ar' ? deptAr : deptEn;
    this.formDepartmentAr = deptAr;
    this.formDepartmentEn = deptEn;
    this.deptTranslationBadge = this.langService.currentLang() === 'ar' ? deptEn : deptAr;
    this.isDeptDropdownOpen = false;
    this.editingDeptOriginalAr = null;

    this.form = {
      employeeNumber: emp.employeeNumber,
      firstNameAr: emp.firstNameAr,
      lastNameAr: emp.lastNameAr,
      firstNameEn: emp.firstNameEn,
      lastNameEn: emp.lastNameEn,
      nationalIdOrIqama: emp.nationalIdOrIqama,
      nationality: emp.nationality,
      isSaudi: emp.isSaudi,
      gender: emp.gender,
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.substring(0, 10) : '',
      mobileNumber: emp.mobileNumber || '',
      email: emp.email || '',
      departmentName: deptAr,
      jobTitleAr: emp.jobTitleAr,
      jobTitleEn: emp.jobTitleEn,
      hireDate: emp.hireDate.substring(0, 10),
      contractType: emp.contractType,
      contractEndDate: emp.contractEndDate ? emp.contractEndDate.substring(0, 10) : '',
      status: emp.status,
      bankCode: emp.bankCode,
      bankName: emp.bankName,
      iban: emp.iban,
      basicSalary: emp.basicSalary,
      housingAllowance: emp.housingAllowance,
      transportationAllowance: emp.transportationAllowance,
      otherAllowances: emp.otherAllowances
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isDeptDropdownOpen = false;
    this.editingDeptOriginalAr = null;
  }

  saveEmployee(): void {
    if (this.unifiedFullName.trim() && !this.form.firstNameAr.trim()) {
      this.onUnifiedFullNameChange(this.unifiedFullName.trim());
    }
    if (!this.form.jobTitleAr.trim() && this.form.jobTitleEn.trim()) {
      this.onUnifiedJobTitleChange(this.form.jobTitleEn.trim());
    }

    if ((!this.form.firstNameAr.trim() && !this.form.firstNameEn.trim()) ||
        (!this.form.jobTitleAr.trim() && !this.form.jobTitleEn.trim())) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('hr.employees.alerts.warning'),
        text: this.langService.t('hr.employees.alerts.nameAndJobRequired'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    if (!this.form.nationalIdOrIqama.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('hr.employees.alerts.warning'),
        text: this.langService.t('hr.employees.alerts.nationalIdRequired'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    // Automatically register department in the dropdown list if it's new
    const deptInfo = this.ensureDepartmentRegistered();
    this.form.departmentName = deptInfo.nameAr;

    this.loading = true;
    if (this.isEditMode && this.editingId) {
      this.hrService.updateEmployee(this.editingId, this.form as any).subscribe({
        next: () => {
          this.closeModal();
          this.loadEmployees();
          Swal.fire({
            icon: 'success',
            title: this.langService.currentLang() === 'ar' ? 'تم تحديث بيانات الموظف' : 'Employee Updated',
            text: deptInfo.wasNew
              ? `${this.langService.t('hr.employees.alerts.updateSuccess')} — وتم تسجيل القسم الجديد (${deptInfo.nameAr}) في القائمة تلقائياً.`
              : this.langService.t('hr.employees.alerts.updateSuccess'),
            timer: 1800,
            showConfirmButton: false
          });
        },
        error: (err) => {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: this.langService.currentLang() === 'ar' ? 'خطأ في الحفظ' : 'Error',
            text: err.error?.description || err.error?.message || err.error?.title || this.langService.t('hr.employees.alerts.updateError'),
            confirmButtonColor: '#059669'
          });
        }
      });
    } else {
      this.hrService.createEmployee(this.form as any).subscribe({
        next: () => {
          this.closeModal();
          this.loadEmployees();
          Swal.fire({
            icon: 'success',
            title: this.langService.currentLang() === 'ar' ? 'تم تسجيل الموظف بنجاح' : 'Employee Created',
            text: deptInfo.wasNew
              ? `${this.langService.t('hr.employees.alerts.createSuccess')} — وتم تسجيل القسم الجديد (${deptInfo.nameAr}) في القائمة تلقائياً.`
              : this.langService.t('hr.employees.alerts.createSuccess'),
            timer: 1800,
            showConfirmButton: false
          });
        },
        error: (err) => {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: this.langService.currentLang() === 'ar' ? 'خطأ في التسجيل' : 'Error',
            text: err.error?.description || err.error?.message || err.error?.title || this.langService.t('hr.employees.alerts.createError'),
            confirmButtonColor: '#059669'
          });
        }
      });
    }
  }

  // --- EOSB CALCULATOR WORKSPACE ---
  openEosbModal(emp?: EmployeeDto): void {
    this.showModal = false;
    this.selectedEmployeeForEosb = emp || this.employees[0] || null;
    this.eosbReason = EndOfServiceReason.ContractEnd;
    this.eosbResult = null;
    this.showEosbModal = true;
    if (this.selectedEmployeeForEosb) {
      this.initEosbForEmployee(this.selectedEmployeeForEosb);
    }
  }

  closeEosbModal(): void {
    this.showEosbModal = false;
  }

  onEosbEmployeeChange(emp: EmployeeDto | null): void {
    this.selectedEmployeeForEosb = emp;
    if (emp) {
      this.initEosbForEmployee(emp);
    }
  }

  private initEosbForEmployee(emp: EmployeeDto): void {
    const hireStr = (emp.hireDate || new Date().toISOString()).substring(0, 10);
    this.eosbHireDate = hireStr;
    this.eosbSalaryInput = Number(emp.grossSalary) || (Number(emp.basicSalary || 0) + Number(emp.housingAllowance || 0) + Number(emp.transportationAllowance || 0) + Number(emp.otherAllowances || 0));

    const todayStr = new Date().toISOString().substring(0, 10);
    const hireMs = new Date(hireStr).getTime();
    const todayMs = new Date(todayStr).getTime();
    const diffDays = Math.max(0, Math.round((todayMs - hireMs) / (1000 * 60 * 60 * 24)));

    if (diffDays < 30) {
      // إذا كان تاريخ تعيين الموظف حديثاً جداً (اليوم مثلاً)، نضع افتراضياً 3 سنوات لتظهر الحاسبة بنتيجة فورية قابلة للتعديل
      this.setEosbYearsPreset(3);
    } else {
      this.eosbCalculationDate = todayStr;
      this.onEosbDatesChange();
    }
  }

  onEosbDatesChange(): void {
    if (!this.eosbHireDate || !this.eosbCalculationDate) return;
    const h = new Date(this.eosbHireDate).getTime();
    const c = new Date(this.eosbCalculationDate).getTime();
    const days = Math.max(0, Math.round((c - h) / (1000 * 60 * 60 * 24)));
    this.eosbTotalDays = days;
    this.eosbYearsInput = Math.round((days / 365.25) * 100) / 100;
    this.syncResignationReasonWithYears(this.eosbYearsInput);
    this.recomputeEosbLocal();
  }

  onEosbYearsInputChange(yearsVal: number): void {
    const y = Math.max(0, Number(yearsVal) || 0);
    this.eosbYearsInput = y;
    const days = Math.round(y * 365.25);
    this.eosbTotalDays = days;
    if (this.eosbHireDate) {
      const h = new Date(this.eosbHireDate);
      h.setDate(h.getDate() + days);
      this.eosbCalculationDate = h.toISOString().substring(0, 10);
    }
    this.syncResignationReasonWithYears(y);
    this.recomputeEosbLocal();
  }

  setEosbYearsPreset(years: number): void {
    this.onEosbYearsInputChange(years);
  }

  onEosbReasonChange(reasonVal: EndOfServiceReason): void {
    this.eosbReason = Number(reasonVal) as EndOfServiceReason;
    const y = Number(this.eosbYearsInput) || 0;

    // إذا اختار المستخدم شريحة استقالة محددة وكانت سنوات الخدمة لا تقع فيها أو تساوي صفراً، نضبط السنوات تلقائياً لتعمل الحاسبة فوراً
    if (this.eosbReason === EndOfServiceReason.ResignationLessThan2Years && (y >= 2 || y <= 0)) {
      this.setEosbYearsPreset(1);
      return;
    }
    if (this.eosbReason === EndOfServiceReason.Resignation2To5Years && (y < 2 || y >= 5)) {
      this.setEosbYearsPreset(3);
      return;
    }
    if (this.eosbReason === EndOfServiceReason.Resignation5To10Years && (y < 5 || y >= 10)) {
      this.setEosbYearsPreset(6);
      return;
    }
    if (this.eosbReason === EndOfServiceReason.ResignationMoreThan10Years && y < 10) {
      this.setEosbYearsPreset(10);
      return;
    }
    if (y <= 0) {
      this.setEosbYearsPreset(3);
      return;
    }
    this.recomputeEosbLocal();
  }

  private syncResignationReasonWithYears(years: number): void {
    const isResignation = [
      EndOfServiceReason.ResignationLessThan2Years,
      EndOfServiceReason.Resignation2To5Years,
      EndOfServiceReason.Resignation5To10Years,
      EndOfServiceReason.ResignationMoreThan10Years
    ].includes(Number(this.eosbReason));

    if (isResignation) {
      if (years < 2) {
        this.eosbReason = EndOfServiceReason.ResignationLessThan2Years;
      } else if (years < 5) {
        this.eosbReason = EndOfServiceReason.Resignation2To5Years;
      } else if (years < 10) {
        this.eosbReason = EndOfServiceReason.Resignation5To10Years;
      } else {
        this.eosbReason = EndOfServiceReason.ResignationMoreThan10Years;
      }
    }
  }

  recomputeEosbLocal(): void {
    if (!this.selectedEmployeeForEosb) return;
    const years = Math.max(0, Number(this.eosbYearsInput) || 0);
    const lastWage = Math.max(0, Number(this.eosbSalaryInput) || 0);
    this.eosbTotalDays = Math.round(years * 365.25);

    // المادة 84: نصف راتب عن كل سنة من السنوات الخمس الأولى، وراتب كامل عن كل سنة تالية
    let baseBenefit = 0;
    if (years <= 5) {
      baseBenefit = years * (lastWage / 2);
    } else {
      baseBenefit = (5 * (lastWage / 2)) + ((years - 5) * lastWage);
    }
    this.eosbBaseBenefitBeforeFactor = Math.round(baseBenefit * 100) / 100;

    // المادة 85: نسبة الاستحقاق حسب سبب انتهاء الخدمة
    let factor = 1.0;
    let percentage = 100;
    let reasonTextAr = 'انتهاء مدة العقد المحدد';

    switch (Number(this.eosbReason)) {
      case EndOfServiceReason.ContractEnd:
        factor = 1.0; percentage = 100; reasonTextAr = 'انتهاء مدة العقد المحدد';
        break;
      case EndOfServiceReason.CompanyTermination:
        factor = 1.0; percentage = 100; reasonTextAr = 'إنهاء العقد من قبل المنشأة (المادة 77)';
        break;
      case EndOfServiceReason.ForceMajeure:
        factor = 1.0; percentage = 100; reasonTextAr = 'قوة قاهرة / عجز أو وفاة';
        break;
      case EndOfServiceReason.ResignationLessThan2Years:
        factor = 0.0; percentage = 0; reasonTextAr = 'استقالة - خدمة أقل من سنتين (لا يستحق مكافأة)';
        break;
      case EndOfServiceReason.Resignation2To5Years:
        factor = 1.0 / 3.0; percentage = 33.33; reasonTextAr = 'استقالة - خدمة من سنتين إلى 5 سنوات (ثلث المكافأة)';
        break;
      case EndOfServiceReason.Resignation5To10Years:
        factor = 2.0 / 3.0; percentage = 66.67; reasonTextAr = 'استقالة - خدمة من 5 إلى 10 سنوات (ثلثي المكافأة)';
        break;
      case EndOfServiceReason.ResignationMoreThan10Years:
        factor = 1.0; percentage = 100; reasonTextAr = 'استقالة - خدمة أكثر من 10 سنوات (كامل المكافأة)';
        break;
    }

    const finalAmount = Math.round(baseBenefit * factor * 100) / 100;

    this.eosbResult = {
      employeeId: this.selectedEmployeeForEosb.id,
      employeeName: this.selectedEmployeeForEosb.fullNameAr,
      hireDate: this.eosbHireDate,
      calculationDate: this.eosbCalculationDate,
      totalYearsOfService: Math.round(years * 100) / 100,
      lastGrossSalary: lastWage,
      reason: this.eosbReason,
      reasonTextAr,
      entitledPercentage: percentage,
      endOfServiceBenefitAmount: finalAmount
    };
  }

  calculateEosb(): void {
    this.recomputeEosbLocal();
  }

  getStatusBadgeClass(status: EmployeeStatus): string {
    switch (status) {
      case EmployeeStatus.Active: return 'badge-active';
      case EmployeeStatus.OnLeave: return 'badge-leave';
      case EmployeeStatus.Probation: return 'badge-probation';
      case EmployeeStatus.Resigned: return 'badge-resigned';
      case EmployeeStatus.Terminated: return 'badge-terminated';
      default: return 'badge-secondary';
    }
  }

  getStatusText(status: EmployeeStatus): string {
    switch (status) {
      case EmployeeStatus.Active: return this.langService.t('hr.employees.statusActive');
      case EmployeeStatus.OnLeave: return this.langService.t('hr.employees.statusLeave');
      case EmployeeStatus.Probation: return this.langService.t('hr.employees.statusProbation');
      case EmployeeStatus.Suspended: return this.langService.t('hr.employees.statusSuspended');
      case EmployeeStatus.Resigned: return this.langService.t('hr.employees.statusResigned');
      case EmployeeStatus.Terminated: return this.langService.t('hr.employees.statusTerminated');
      default: return this.langService.t('hr.employees.alerts.unspecified');
    }
  }
}
