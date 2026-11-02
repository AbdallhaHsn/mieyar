import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HrService, EmployeeDto, EmployeeStatus, ContractType, Gender, EndOfServiceReason, EosbCalculationResultDto } from '../../../core/services/hr.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../core/services/language.service';
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
  private translator = inject(AccountingTranslatorService);

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

  // Add/Edit Modal
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

  // EOSB Modal
  showEosbModal = false;
  selectedEmployeeForEosb: EmployeeDto | null = null;
  eosbCalculationDate = new Date().toISOString().substring(0, 10);
  eosbReason: EndOfServiceReason = EndOfServiceReason.ContractEnd;
  eosbResult: EosbCalculationResultDto | null = null;
  eosbLoading = false;

  // Track manual edits to prevent overwriting user input (Rule 1)
  manualEditedFields = {
    firstNameEn: false,
    lastNameEn: false,
    jobTitleEn: false
  };

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.error = null;
    this.hrService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
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
        e.employeeNumber.toLowerCase().includes(term) ||
        e.fullNameAr.toLowerCase().includes(term) ||
        e.fullNameEn.toLowerCase().includes(term) ||
        e.nationalIdOrIqama.toLowerCase().includes(term) ||
        e.jobTitleAr.toLowerCase().includes(term) ||
        e.jobTitleEn.toLowerCase().includes(term)
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

  firstNameBgTranslation = '';
  lastNameBgTranslation = '';
  jobTitleBgTranslation = '';

  // --- RULE 1: BILINGUAL SINGLE-ENTRY SMART AUTO-TRANSLATION ---
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

  async forceRetranslate(field: 'firstName' | 'lastName' | 'jobTitle'): Promise<void> {
    if (field === 'firstName') {
      const text = this.form.firstNameAr || this.form.firstNameEn;
      if (!text) return;
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const refined = await this.translator.translateOnline(text, 'ar', 'en');
        this.form.firstNameEn = refined || this.translator.translateArabicToEnglish(text);
        this.firstNameBgTranslation = `الترجمة: ${this.form.firstNameEn}`;
      } else {
        const refined = await this.translator.translateOnline(text, 'en', 'ar');
        this.form.firstNameAr = refined || this.translator.translateEnglishToArabic(text);
        this.firstNameBgTranslation = `الترجمة: ${this.form.firstNameAr}`;
      }
    } else if (field === 'lastName') {
      const text = this.form.lastNameAr || this.form.lastNameEn;
      if (!text) return;
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const refined = await this.translator.translateOnline(text, 'ar', 'en');
        this.form.lastNameEn = refined || this.translator.translateArabicToEnglish(text);
        this.lastNameBgTranslation = `الترجمة: ${this.form.lastNameEn}`;
      } else {
        const refined = await this.translator.translateOnline(text, 'en', 'ar');
        this.form.lastNameAr = refined || this.translator.translateEnglishToArabic(text);
        this.lastNameBgTranslation = `الترجمة: ${this.form.lastNameAr}`;
      }
    } else if (field === 'jobTitle') {
      const text = this.form.jobTitleAr || this.form.jobTitleEn;
      if (!text) return;
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const refined = await this.translator.translateOnline(text, 'ar', 'en');
        this.form.jobTitleEn = refined || this.translator.translateArabicToEnglish(text);
        this.jobTitleBgTranslation = `الترجمة: ${this.form.jobTitleEn}`;
      } else {
        const refined = await this.translator.translateOnline(text, 'en', 'ar');
        this.form.jobTitleAr = refined || this.translator.translateEnglishToArabic(text);
        this.jobTitleBgTranslation = `الترجمة: ${this.form.jobTitleAr}`;
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

  // Live GOSI Calculations for modal
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

  // Modal actions
  openAddModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.manualEditedFields = { firstNameEn: false, lastNameEn: false, jobTitleEn: false };
    this.firstNameBgTranslation = '';
    this.lastNameBgTranslation = '';
    this.jobTitleBgTranslation = '';
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
    this.showModal = true;
  }

  openEditModal(emp: EmployeeDto): void {
    this.isEditMode = true;
    this.editingId = emp.id;
    this.manualEditedFields = { firstNameEn: true, lastNameEn: true, jobTitleEn: true };
    this.firstNameBgTranslation = emp.firstNameEn ? `الترجمة: ${emp.firstNameEn}` : '';
    this.lastNameBgTranslation = emp.lastNameEn ? `الترجمة: ${emp.lastNameEn}` : '';
    this.jobTitleBgTranslation = emp.jobTitleEn ? `الترجمة: ${emp.jobTitleEn}` : '';
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
      departmentName: emp.departmentName,
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
  }

  saveEmployee(): void {
    if (!this.form.firstNameAr.trim() && this.form.firstNameEn.trim()) {
      this.onUnifiedFirstNameChange(this.form.firstNameEn.trim());
    }
    if (!this.form.lastNameAr.trim() && this.form.lastNameEn.trim()) {
      this.onUnifiedLastNameChange(this.form.lastNameEn.trim());
    }
    if (!this.form.jobTitleAr.trim() && this.form.jobTitleEn.trim()) {
      this.onUnifiedJobTitleChange(this.form.jobTitleEn.trim());
    }

    if ((!this.form.firstNameAr.trim() && !this.form.firstNameEn.trim()) || 
        (!this.form.lastNameAr.trim() && !this.form.lastNameEn.trim()) || 
        (!this.form.jobTitleAr.trim() && !this.form.jobTitleEn.trim())) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('hr.employees.alerts.warning'),
        text: this.langService.t('hr.employees.alerts.nameAndJobRequired'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    if (!this.form.nationalIdOrIqama.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('hr.employees.alerts.warning'),
        text: this.langService.t('hr.employees.alerts.nationalIdRequired'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    this.loading = true;
    if (this.isEditMode && this.editingId) {
      this.hrService.updateEmployee(this.editingId, this.form as any).subscribe({
        next: () => {
          this.successMessage = this.langService.t('hr.employees.alerts.updateSuccess');
          setTimeout(() => this.successMessage = null, 4000);
          this.closeModal();
          this.loadEmployees();
        },
        error: (err) => {
          this.error = err.error?.message || this.langService.t('hr.employees.alerts.updateError');
          this.loading = false;
        }
      });
    } else {
      this.hrService.createEmployee(this.form as any).subscribe({
        next: () => {
          this.successMessage = this.langService.t('hr.employees.alerts.createSuccess');
          setTimeout(() => this.successMessage = null, 4000);
          this.closeModal();
          this.loadEmployees();
        },
        error: (err) => {
          this.error = err.error?.message || this.langService.t('hr.employees.alerts.createError');
          this.loading = false;
        }
      });
    }
  }

  // --- EOSB CALCULATOR ---
  openEosbModal(emp?: EmployeeDto): void {
    this.selectedEmployeeForEosb = emp || this.employees[0] || null;
    this.eosbCalculationDate = new Date().toISOString().substring(0, 10);
    this.eosbReason = EndOfServiceReason.ContractEnd;
    this.eosbResult = null;
    this.showEosbModal = true;
    if (this.selectedEmployeeForEosb) {
      this.calculateEosb();
    }
  }

  closeEosbModal(): void {
    this.showEosbModal = false;
  }

  calculateEosb(): void {
    if (!this.selectedEmployeeForEosb) return;
    this.eosbLoading = true;
    this.hrService.calculateEosb(this.selectedEmployeeForEosb.id, this.eosbCalculationDate, Number(this.eosbReason)).subscribe({
      next: (res) => {
        this.eosbResult = res;
        this.eosbLoading = false;
      },
      error: () => {
        this.eosbLoading = false;
      }
    });
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
