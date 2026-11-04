import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BranchesWarehousesService, BranchDto, CreateBranchDto } from '../../../core/services/branches-warehouses.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../core/services/language.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TenantManagementService, CompanyQuotaDto } from '../../../core/services/tenant-management.service';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TranslatePipe],
  templateUrl: './branches.component.html',
  styleUrls: ['./branches.component.css']
})
export class BranchesComponent implements OnInit {
  private bwService = inject(BranchesWarehousesService);
  public companyContext = inject(CompanyContextService);
  private translator = inject(AccountingTranslatorService);
  public langService = inject(LanguageService);
  private tenantService = inject(TenantManagementService);

  // License Quota State
  licenseQuota = signal<CompanyQuotaDto | null>(null);
  isBranchQuotaFull = computed(() => {
    const q = this.licenseQuota();
    if (!q || q.maxBranches === null) return false;
    return (q.usedBranches ?? 0) >= q.maxBranches;
  });

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  searchQuery = signal<string>('');
  branches = signal<BranchDto[]>([]);

  showAddModal = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingBranchId = signal<string | null>(null);
  isSubmitting = signal<boolean>(false);

  branchForm: CreateBranchDto = this.getEmptyForm();
  manualEnEdit = false;
  manualCodeEdit = false;
  unifiedBranchName = '';
  backgroundTranslation = '';

  // View Modes & Filters (Default is Table as requested)
  viewMode = signal<'cards' | 'table'>('table');
  statusFilter = signal<'all' | 'active' | 'main' | 'inactive'>('all');
  cityFilter = signal<string>('all');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(12);

  availableCities = computed(() => {
    const set = new Set(this.branches().map(b => this.getBranchCity(b)).filter(Boolean));
    return Array.from(set);
  });

  filteredBranches = computed(() => {
    let list = this.branches();
    const sf = this.statusFilter();
    if (sf === 'active') {
      list = list.filter(b => b.isActive);
    } else if (sf === 'inactive') {
      list = list.filter(b => !b.isActive);
    } else if (sf === 'main') {
      list = list.filter(b => b.isMainBranch);
    }

    const cf = this.cityFilter();
    if (cf !== 'all') {
      list = list.filter(b => this.getBranchCity(b) === cf);
    }

    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(b =>
      b.code.toLowerCase().includes(q) ||
      b.nameAr.toLowerCase().includes(q) ||
      b.nameEn.toLowerCase().includes(q) ||
      (this.getBranchCity(b).toLowerCase().includes(q)) ||
      (b.crNumber && b.crNumber.toLowerCase().includes(q)) ||
      (b.taxRegistrationNumber && b.taxRegistrationNumber.toLowerCase().includes(q))
    );
  });

  paginatedBranches = computed(() => {
    const list = this.filteredBranches();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  // KPIs
  totalBranches = computed(() => this.branches().length);
  activeBranches = computed(() => this.branches().filter(b => b.isActive).length);
  inactiveBranches = computed(() => this.branches().filter(b => !b.isActive).length);
  mainBranchCount = computed(() => this.branches().filter(b => b.isMainBranch).length);
  mainBranchName = computed(() => {
    const main = this.branches().find(b => b.isMainBranch);
    return main ? (this.langService.currentLang() === 'en' ? (main.nameEn || main.nameAr) : main.nameAr) : this.langService.translate('branches.alerts.unspecified');
  });
  citiesCovered = computed(() => {
    const cities = new Set(this.branches().map(b => this.getBranchCity(b)).filter(Boolean));
    return cities.size;
  });

  setStatusFilter(filter: 'all' | 'active' | 'main' | 'inactive'): void {
    this.statusFilter.set(filter);
    this.currentPage.set(1);
  }

  ngOnInit(): void {
    this.loadBranches();
    this.loadQuota();
  }

  loadQuota(): void {
    this.tenantService.getCurrentLicenseQuota().subscribe({
      next: (q) => this.licenseQuota.set(q),
      error: () => {}
    });
  }

  get currentCompanyId(): string {
    return this.companyContext.activeCompany().id;
  }

  loadBranches(): void {
    const companyId = this.currentCompanyId;
    if (!companyId) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.bwService.getBranches(companyId).subscribe({
      next: (list) => {
        this.branches.set(list);
        this.syncWithCompanyContext(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load branches', err);
        this.errorMessage.set(this.langService.translate('branches.alerts.loadErrorMsg'));
        this.isLoading.set(false);
      }
    });
  }

  private syncWithCompanyContext(list: BranchDto[]) {
    if (list && list.length > 0) {
      const mapped = list.map(b => ({
        id: b.id,
        code: b.code,
        nameAr: b.nameAr,
        nameEn: b.nameEn,
        isMainBranch: b.isMainBranch
      }));
      this.companyContext.activeCompany.update(c => ({
        ...c,
        branches: mapped
      }));
    }
  }

  openAddModal(): void {
    if (this.isBranchQuotaFull()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.translate('common.warning'),
        text: this.langService.translate('companies.portal.quotaFullWarning'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    this.branchForm = this.getEmptyForm();
    this.manualEnEdit = false;
    this.manualCodeEdit = false;
    this.unifiedBranchName = '';
    this.backgroundTranslation = '';
    this.isEditMode.set(false);
    this.editingBranchId.set(null);
    this.updateAutoBranchCode();
    this.showAddModal.set(true);
  }

  getCityPrefix(cityName?: string): string {
    const normalized = (cityName || '').trim().toLowerCase();
    if (!normalized) return 'BR';

    if (normalized.includes('رياض') || normalized.includes('riyadh') || normalized.includes('ruh')) return 'RUH';
    if (normalized.includes('جدة') || normalized.includes('jeddah') || normalized.includes('jed')) return 'JED';
    if (normalized.includes('دمام') || normalized.includes('dammam') || normalized.includes('dmm')) return 'DMM';
    if (normalized.includes('مكة') || normalized.includes('makkah') || normalized.includes('mecca')) return 'MAK';
    if (normalized.includes('مدينة') || normalized.includes('madinah') || normalized.includes('medina')) return 'MED';
    if (normalized.includes('خبر') || normalized.includes('khobar') || normalized.includes('khb')) return 'KHB';
    if (normalized.includes('قصيم') || normalized.includes('بريدة') || normalized.includes('qassim') || normalized.includes('buraidah')) return 'QAS';
    if (normalized.includes('تبوك') || normalized.includes('tabuk') || normalized.includes('tbk')) return 'TBK';
    if (normalized.includes('أبها') || normalized.includes('ابها') || normalized.includes('عسير') || normalized.includes('abha')) return 'AHB';
    if (normalized.includes('طائف') || normalized.includes('taif')) return 'TIF';
    if (normalized.includes('جازان') || normalized.includes('jazan')) return 'JAZ';
    if (normalized.includes('حائل') || normalized.includes('hail')) return 'HAS';
    if (normalized.includes('جبيل') || normalized.includes('jubail')) return 'JBL';
    if (normalized.includes('أحساء') || normalized.includes('احساء') || normalized.includes('هفوف') || normalized.includes('hofuf') || normalized.includes('ahsa')) return 'HOF';
    if (normalized.includes('ينبع') || normalized.includes('yanbu')) return 'YNB';
    if (normalized.includes('نجران') || normalized.includes('najran')) return 'NAJ';

    const latinMatch = normalized.match(/[a-z]{2,3}/);
    if (latinMatch) {
      return latinMatch[0].toUpperCase();
    }
    return 'BR';
  }

  generateNextBranchCode(cityName?: string, isMain?: boolean): string {
    const prefix = this.getCityPrefix(cityName);
    const existingCodes = (this.branches() || []).map(b => (b.code || '').trim().toUpperCase());

    if (isMain) {
      const candidateHq = `${prefix}-HQ`;
      if (!existingCodes.includes(candidateHq)) {
        return candidateHq;
      }
    }

    let maxSeq = 0;
    const regex = new RegExp(`^${prefix}-(\\d+)`, 'i');
    for (const code of existingCodes) {
      const match = code.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    const nextNum = (maxSeq + 1).toString().padStart(2, '0');
    return `${prefix}-${nextNum}`;
  }

  updateAutoBranchCode(): void {
    if (this.isEditMode() || this.manualCodeEdit) return;
    this.branchForm.code = this.generateNextBranchCode(this.branchForm.city, !!this.branchForm.isMainBranch);
  }

  onCityChange(city: string): void {
    this.branchForm.city = city;
    this.updateAutoBranchCode();
  }

  onMainBranchToggle(isMain: boolean): void {
    this.branchForm.isMainBranch = isMain;
    this.updateAutoBranchCode();
  }

  resetAutoCode(): void {
    this.manualCodeEdit = false;
    this.updateAutoBranchCode();
  }

  openEditModal(b: BranchDto): void {
    this.branchForm = {
      code: b.code,
      nameAr: b.nameAr,
      nameEn: b.nameEn,
      city: this.getBranchCity(b) || 'الرياض',
      address: this.formatBranchAddress(b) || (typeof b.address === 'string' ? b.address : ''),
      taxRegistrationNumber: b.taxRegistrationNumber || '',
      crNumber: b.crNumber || '',
      isMainBranch: b.isMainBranch
    };
    this.manualEnEdit = true;
    this.unifiedBranchName = b.nameAr || b.nameEn;
    this.backgroundTranslation = b.nameEn ? this.langService.translate('branches.alerts.englishTranslation').replace('{text}', b.nameEn) : '';
    this.isEditMode.set(true);
    this.editingBranchId.set(b.id);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.isEditMode.set(false);
    this.editingBranchId.set(null);
  }

  onUnifiedBranchNameChange(text: string): void {
    this.unifiedBranchName = text;
    if (!text.trim()) {
      this.branchForm.nameAr = '';
      this.branchForm.nameEn = '';
      this.backgroundTranslation = '';
      return;
    }

    if (!this.isEditMode() && !this.manualCodeEdit) {
      const lower = text.toLowerCase();
      const detectedCity = 
        lower.includes('جدة') || lower.includes('jeddah') ? 'جدة' :
        lower.includes('دمام') || lower.includes('dammam') ? 'الدمام' :
        lower.includes('مكة') || lower.includes('makkah') ? 'مكة المكرمة' :
        lower.includes('مدينة') || lower.includes('madinah') ? 'المدينة المنورة' :
        lower.includes('خبر') || lower.includes('khobar') ? 'الخبر' :
        lower.includes('رياض') || lower.includes('riyadh') ? 'الرياض' :
        lower.includes('قصيم') || lower.includes('بريدة') ? 'القصيم' :
        lower.includes('تبوك') || lower.includes('tabuk') ? 'تبوك' :
        lower.includes('أبها') || lower.includes('abha') ? 'أبها' :
        lower.includes('طائف') || lower.includes('taif') ? 'الطائف' : null;
      if (detectedCity && this.branchForm.city !== detectedCity) {
        this.branchForm.city = detectedCity;
        this.updateAutoBranchCode();
      }
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.branchForm.nameAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.branchForm.nameEn = instant;
      this.backgroundTranslation = this.langService.translate('branches.alerts.englishTranslation').replace('{text}', instant);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.branchForm.nameEn = refined;
          this.backgroundTranslation = this.langService.translate('branches.alerts.englishTranslation').replace('{text}', refined);
        }
      );
    } else {
      this.branchForm.nameEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.branchForm.nameAr = instant;
      this.backgroundTranslation = this.langService.translate('branches.alerts.arabicTranslation').replace('{text}', instant);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.branchForm.nameAr = refined;
          this.backgroundTranslation = this.langService.translate('branches.alerts.arabicTranslation').replace('{text}', refined);
        }
      });
    }
  }

  onArabicNameChange(val: string): void {
    this.onUnifiedBranchNameChange(val);
  }

  async forceTranslate(): Promise<void> {
    const text = this.unifiedBranchName || this.branchForm.nameAr || this.branchForm.nameEn;
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const refined = await this.translator.translateOnline(text, 'ar', 'en');
      this.branchForm.nameEn = refined || this.translator.translateArabicToEnglish(text);
      this.backgroundTranslation = this.langService.translate('branches.alerts.englishTranslation').replace('{text}', this.branchForm.nameEn);
    } else {
      const refined = await this.translator.translateOnline(text, 'en', 'ar');
      this.branchForm.nameAr = refined || this.translator.translateEnglishToArabic(text);
      this.backgroundTranslation = this.langService.translate('branches.alerts.arabicTranslation').replace('{text}', this.branchForm.nameAr);
    }
  }

  saveBranch(): void {
    if (!this.branchForm.nameAr && this.unifiedBranchName) {
      this.onUnifiedBranchNameChange(this.unifiedBranchName);
    }

    // Fields are not mandatory: Graceful fallbacks for code, city, and name
    if (!this.branchForm.code || !this.branchForm.code.trim()) {
      this.branchForm.code = this.generateNextBranchCode(this.branchForm.city, !!this.branchForm.isMainBranch);
    }

    if (!this.branchForm.city || !this.branchForm.city.trim()) {
      this.branchForm.city = 'الرياض';
    }

    if (!this.branchForm.nameAr && !this.branchForm.nameEn) {
      const city = this.branchForm.city || 'الرئيسي';
      this.branchForm.nameAr = `فرع ${city} (${this.branchForm.code})`;
      this.branchForm.nameEn = `${city} Branch (${this.branchForm.code})`;
    } else if (!this.branchForm.nameEn) {
      this.branchForm.nameEn = this.translator.autoTranslate(this.branchForm.nameAr, 'ar') || this.branchForm.nameAr;
    } else if (!this.branchForm.nameAr) {
      this.branchForm.nameAr = this.translator.autoTranslate(this.branchForm.nameEn, 'en') || this.branchForm.nameEn;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    if (this.isEditMode() && this.editingBranchId()) {
      this.bwService.updateBranch(this.currentCompanyId, this.editingBranchId()!, this.branchForm).subscribe({
        next: (updated) => {
          this.isSubmitting.set(false);
          this.closeAddModal();
          Swal.fire({
            icon: 'success',
            title: this.langService.translate('branches.alerts.saveSuccessTitle'),
            text: this.langService.translate('branches.alerts.updateSuccessMsg'),
            confirmButtonColor: '#059669',
            confirmButtonText: this.langService.translate('common.ok')
          });
          this.loadBranches();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          Swal.fire({
            icon: 'error',
            title: this.langService.translate('branches.alerts.errorTitle'),
            text: this.extractErrorMessage(err),
            confirmButtonColor: '#dc2626',
            confirmButtonText: this.langService.translate('common.ok')
          });
        }
      });
    } else {
      this.bwService.createBranch(this.currentCompanyId, this.branchForm).subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.closeAddModal();
          Swal.fire({
            icon: 'success',
            title: this.langService.translate('branches.alerts.saveSuccessTitle'),
            text: this.langService.translate('branches.alerts.createSuccessMsg'),
            confirmButtonColor: '#059669',
            confirmButtonText: this.langService.translate('common.ok')
          });
          this.loadBranches();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          if (err?.error?.code === 'License.LimitReached') {
            const limit = err.error?.limit ?? '';
            const msg = this.langService.translate('companies.portal.licenseLimitReachedBranches').replace('{limit}', limit.toString());
            Swal.fire({
              icon: 'warning',
              title: this.langService.translate('common.warning'),
              text: msg,
              confirmButtonColor: '#059669',
              confirmButtonText: this.langService.translate('common.ok')
            });
          } else if (err?.error?.code === 'License.Expired') {
            Swal.fire({
              icon: 'warning',
              title: this.langService.translate('common.warning'),
              text: this.langService.translate('companies.portal.licenseExpiredNotice'),
              confirmButtonColor: '#059669',
              confirmButtonText: this.langService.translate('common.ok')
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: this.langService.translate('branches.alerts.errorTitle'),
              text: this.extractErrorMessage(err),
              confirmButtonColor: '#dc2626',
              confirmButtonText: this.langService.translate('common.ok')
            });
          }
        }
      });
    }
  }

  private extractErrorMessage(err: any): string {
    if (err?.error?.description) return err.error.description;
    if (err?.error?.message) return err.error.message;
    if (err?.error?.errors && typeof err.error.errors === 'object') {
      const keys = Object.keys(err.error.errors);
      if (keys.length > 0) {
        const msgs = err.error.errors[keys[0]];
        if (Array.isArray(msgs) && msgs.length > 0) return msgs[0];
      }
    }
    return this.langService.translate('branches.alerts.saveErrorMsg');
  }

  deleteBranch(b: BranchDto): void {
    if (b.isMainBranch) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.translate('branches.alerts.errorTitle'),
        text: this.langService.translate('branches.alerts.cannotDeleteMainBranch'),
        confirmButtonText: this.langService.translate('common.ok'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    const branchName = this.langService.currentLang() === 'en' ? (b.nameEn || b.nameAr) : b.nameAr;
    Swal.fire({
      title: this.langService.translate('branches.alerts.deleteConfirmTitle'),
      text: this.langService.translate('branches.alerts.deleteNamedBranchConfirm').replace('{name}', branchName),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.translate('branches.alerts.confirmDeleteBtn'),
      cancelButtonText: this.langService.translate('branches.alerts.cancelDeleteBtn'),
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bwService.deleteBranch(this.currentCompanyId, b.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.langService.translate('branches.alerts.deleteSuccess'),
              text: this.langService.translate('branches.alerts.deleteNamedBranchSuccess').replace('{name}', branchName),
              timer: 3000,
              showConfirmButton: false
            });
            this.loadBranches();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.langService.translate('branches.alerts.errorTitle'),
              text: err?.error?.description || err?.error?.message || this.langService.translate('branches.alerts.deleteFailed'),
              confirmButtonText: this.langService.translate('common.ok'),
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  toggleStatus(b: BranchDto): void {
    const nextStatus = !b.isActive;
    this.bwService.toggleBranchStatus(this.currentCompanyId, b.id, nextStatus).subscribe({
      next: () => {
        b.isActive = nextStatus;
        const branchName = this.langService.currentLang() === 'en' ? (b.nameEn || b.nameAr) : b.nameAr;
        const statusLabel = nextStatus
          ? this.langService.translate('branches.alerts.active')
          : this.langService.translate('branches.alerts.inactive');
        this.showSuccess(
          this.langService.translate('branches.alerts.statusToggledSuccess')
            .replace('{name}', branchName)
            .replace('{status}', statusLabel)
        );
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || this.langService.translate('branches.alerts.statusToggleFailed'));
      }
    });
  }

  formatBranchAddress(b: BranchDto): string {
    if (!b.address) return '';
    if (typeof b.address === 'string') return b.address;
    const addr = b.address as any;
    if (typeof addr === 'object') {
      const parts = [
        addr.streetName,
        addr.buildingNumber,
        addr.subDivisionName
      ].filter(Boolean);
      return parts.join(' ').trim();
    }
    return '';
  }

  getBranchCity(b: BranchDto): string {
    if (b.city) return b.city;
    const addr = b.address as any;
    if (addr && typeof addr === 'object' && addr.cityName) {
      return addr.cityName;
    }
    return '';
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }

  private getEmptyForm(): CreateBranchDto {
    return {
      code: '',
      nameAr: '',
      nameEn: '',
      city: 'الرياض',
      address: '',
      taxRegistrationNumber: '',
      crNumber: '',
      isMainBranch: false
    };
  }
}
