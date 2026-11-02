import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchesWarehousesService, BranchDto, WarehouseDto, CreateBranchDto, CreateWarehouseDto } from '../../core/services/branches-warehouses.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { AccountingTranslatorService } from '../../core/services/accounting-translator.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-branches-warehouses',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './branches-warehouses.component.html',
  styleUrls: ['./branches-warehouses.component.css']
})
export class BranchesWarehousesComponent implements OnInit {
  private bwService = inject(BranchesWarehousesService);
  public companyContext = inject(CompanyContextService);
  private translator = inject(AccountingTranslatorService);
  public langService = inject(LanguageService);

  activeTab = signal<'branches' | 'warehouses'>('branches');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Search queries
  branchSearch = signal<string>('');
  warehouseSearch = signal<string>('');

  // Data lists
  branches = signal<BranchDto[]>([]);
  warehouses = signal<WarehouseDto[]>([]);

  // Modals state
  showBranchModal = signal<boolean>(false);
  showWarehouseModal = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // New Branch Form
  branchForm: CreateBranchDto = this.getEmptyBranchForm();
  manualBranchEnEdit = false;

  // New Warehouse Form
  warehouseForm: CreateWarehouseDto = this.getEmptyWarehouseForm();
  manualWarehouseEnEdit = false;

  // Computed filtered branches
  filteredBranches = computed(() => {
    const q = this.branchSearch().toLowerCase().trim();
    if (!q) return this.branches();
    return this.branches().filter(b => 
      b.code.toLowerCase().includes(q) ||
      b.nameAr.toLowerCase().includes(q) ||
      b.nameEn.toLowerCase().includes(q) ||
      (b.city && b.city.toLowerCase().includes(q))
    );
  });

  // Computed filtered warehouses
  filteredWarehouses = computed(() => {
    const q = this.warehouseSearch().toLowerCase().trim();
    if (!q) return this.warehouses();
    return this.warehouses().filter(w => 
      w.code.toLowerCase().includes(q) ||
      w.nameAr.toLowerCase().includes(q) ||
      w.nameEn.toLowerCase().includes(q) ||
      (w.branchName && w.branchName.toLowerCase().includes(q)) ||
      (w.location && w.location.toLowerCase().includes(q))
    );
  });

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

  // Metrics
  totalBranchesCount = computed(() => this.branches().length);
  activeBranchesCount = computed(() => this.branches().filter(b => b.isActive).length);
  totalWarehousesCount = computed(() => this.warehouses().length);
  activeWarehousesCount = computed(() => this.warehouses().filter(w => w.isActive).length);

  ngOnInit(): void {
    this.loadData();
  }

  get currentCompanyId(): string {
    return this.companyContext.activeCompany().id;
  }

  loadData(): void {
    const companyId = this.currentCompanyId;
    if (!companyId) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.bwService.getBranches(companyId).subscribe({
      next: (branchesList) => {
        this.branches.set(branchesList);
        this.syncWithCompanyContext(branchesList);
        
        // Load warehouses
        this.bwService.getWarehouses(companyId).subscribe({
          next: (whList) => {
            this.warehouses.set(whList);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Failed to load warehouses', err);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Failed to load branches', err);
        this.errorMessage.set(this.langService.t('branchesWarehouses.alerts.loadFailed'));
        this.isLoading.set(false);
      }
    });
  }

  private syncWithCompanyContext(branchesList: BranchDto[]) {
    const current = this.companyContext.activeCompany();
    if (branchesList && branchesList.length > 0) {
      const mapped = branchesList.map(b => ({
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

  // Single-Field Smart Bilingual Input State
  unifiedBranchName = '';
  backgroundBranchTranslation = '';
  unifiedWarehouseName = '';
  backgroundWarehouseTranslation = '';

  manualBranchCodeEdit = false;

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
    if (this.manualBranchCodeEdit) return;
    this.branchForm.code = this.generateNextBranchCode(this.branchForm.city, !!this.branchForm.isMainBranch);
  }

  onBranchCityChange(city: string): void {
    this.branchForm.city = city;
    this.updateAutoBranchCode();
  }

  onBranchMainToggle(isMain: boolean): void {
    this.branchForm.isMainBranch = isMain;
    this.updateAutoBranchCode();
  }

  resetAutoBranchCode(): void {
    this.manualBranchCodeEdit = false;
    this.updateAutoBranchCode();
  }

  // --- Branch Actions ---
  openAddBranchModal(): void {
    this.branchForm = this.getEmptyBranchForm();
    this.manualBranchEnEdit = false;
    this.manualBranchCodeEdit = false;
    this.unifiedBranchName = '';
    this.backgroundBranchTranslation = '';
    this.updateAutoBranchCode();
    this.showBranchModal.set(true);
  }

  closeBranchModal(): void {
    this.showBranchModal.set(false);
  }

  onUnifiedBranchNameChange(val: string): void {
    const text = (val || '').trim();
    this.unifiedBranchName = val;
    if (!text) {
      this.branchForm.nameAr = '';
      this.branchForm.nameEn = '';
      this.backgroundBranchTranslation = '';
      return;
    }

    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.branchForm.nameAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.branchForm.nameEn = instant;
      this.backgroundBranchTranslation = `الترجمة الإنجليزية: ${instant}`;
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.branchForm.nameEn = refined;
          this.backgroundBranchTranslation = `الترجمة الإنجليزية: ${refined}`;
        }
      );
    } else {
      this.branchForm.nameEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.branchForm.nameAr = instant;
      this.backgroundBranchTranslation = `الترجمة العربية: ${instant}`;
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.branchForm.nameAr = refined;
          this.backgroundBranchTranslation = `الترجمة العربية: ${refined}`;
        }
      });
    }
  }

  onBranchArabicNameChange(val: string): void {
    this.onUnifiedBranchNameChange(val);
  }

  async forceTranslateBranchName(): Promise<void> {
    const text = this.unifiedBranchName || this.branchForm.nameAr || this.branchForm.nameEn;
    if (text) {
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const onlineEn = await this.translator.translateOnline(text, 'ar', 'en');
        this.branchForm.nameEn = onlineEn || this.translator.translateArabicToEnglish(text);
        this.backgroundBranchTranslation = `الترجمة الإنجليزية: ${this.branchForm.nameEn}`;
      } else {
        const onlineAr = await this.translator.translateOnline(text, 'en', 'ar');
        this.branchForm.nameAr = onlineAr || this.translator.translateEnglishToArabic(text);
        this.backgroundBranchTranslation = `الترجمة العربية: ${this.branchForm.nameAr}`;
      }
    }
  }

  saveBranch(): void {
    if (this.unifiedBranchName) {
      if (!this.branchForm.nameAr) this.branchForm.nameAr = this.unifiedBranchName;
      if (!this.branchForm.nameEn) this.branchForm.nameEn = this.unifiedBranchName;
    }

    if (!this.branchForm.code || !this.branchForm.nameAr) {
      this.errorMessage.set(this.langService.t('branchesWarehouses.alerts.branchFieldsRequired'));
      return;
    }

    if (!this.branchForm.nameEn) {
      this.branchForm.nameEn = this.translator.translateArabicToEnglish(this.branchForm.nameAr);
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.bwService.createBranch(this.currentCompanyId, this.branchForm).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeBranchModal();
        this.showSuccess(this.langService.t('branchesWarehouses.alerts.branchAddedSuccess', { name: created.nameAr }));
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message || err?.error || this.langService.t('branchesWarehouses.alerts.branchSaveError'));
      }
    });
  }

  toggleBranchStatus(branch: BranchDto): void {
    const nextStatus = !branch.isActive;
    this.bwService.toggleBranchStatus(this.currentCompanyId, branch.id, nextStatus).subscribe({
      next: () => {
        branch.isActive = nextStatus;
        this.showSuccess(this.langService.t('branchesWarehouses.alerts.branchStatusUpdated', { status: nextStatus ? (this.langService.isArabic() ? 'نشط' : 'Active') : (this.langService.isArabic() ? 'معطل' : 'Inactive') }));
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || this.langService.t('branchesWarehouses.alerts.branchStatusFailed'));
      }
    });
  }

  // --- Warehouse Actions ---
  openAddWarehouseModal(): void {
    this.warehouseForm = this.getEmptyWarehouseForm();
    if (this.branches().length > 0) {
      this.warehouseForm.branchId = this.branches()[0].id;
    }
    this.manualWarehouseEnEdit = false;
    this.unifiedWarehouseName = '';
    this.backgroundWarehouseTranslation = '';
    this.showWarehouseModal.set(true);
  }

  closeWarehouseModal(): void {
    this.showWarehouseModal.set(false);
  }

  onUnifiedWarehouseNameChange(val: string): void {
    const text = (val || '').trim();
    this.unifiedWarehouseName = val;
    if (!text) {
      this.warehouseForm.nameAr = '';
      this.warehouseForm.nameEn = '';
      this.backgroundWarehouseTranslation = '';
      return;
    }

    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.warehouseForm.nameAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.warehouseForm.nameEn = instant;
      this.backgroundWarehouseTranslation = `الترجمة الإنجليزية: ${instant}`;
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.warehouseForm.nameEn = refined;
          this.backgroundWarehouseTranslation = `الترجمة الإنجليزية: ${refined}`;
        }
      );
    } else {
      this.warehouseForm.nameEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.warehouseForm.nameAr = instant;
      this.backgroundWarehouseTranslation = `الترجمة العربية: ${instant}`;
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.warehouseForm.nameAr = refined;
          this.backgroundWarehouseTranslation = `الترجمة العربية: ${refined}`;
        }
      });
    }
  }

  onWarehouseArabicNameChange(val: string): void {
    this.onUnifiedWarehouseNameChange(val);
  }

  async forceTranslateWarehouseName(): Promise<void> {
    const text = this.unifiedWarehouseName || this.warehouseForm.nameAr || this.warehouseForm.nameEn;
    if (text) {
      const isAr = this.translator.containsArabic(text);
      if (isAr) {
        const onlineEn = await this.translator.translateOnline(text, 'ar', 'en');
        this.warehouseForm.nameEn = onlineEn || this.translator.translateArabicToEnglish(text);
        this.backgroundWarehouseTranslation = `الترجمة الإنجليزية: ${this.warehouseForm.nameEn}`;
      } else {
        const onlineAr = await this.translator.translateOnline(text, 'en', 'ar');
        this.warehouseForm.nameAr = onlineAr || this.translator.translateEnglishToArabic(text);
        this.backgroundWarehouseTranslation = `الترجمة العربية: ${this.warehouseForm.nameAr}`;
      }
    }
  }

  saveWarehouse(): void {
    if (this.unifiedWarehouseName) {
      if (!this.warehouseForm.nameAr) this.warehouseForm.nameAr = this.unifiedWarehouseName;
      if (!this.warehouseForm.nameEn) this.warehouseForm.nameEn = this.unifiedWarehouseName;
    }

    if (!this.warehouseForm.code || !this.warehouseForm.nameAr) {
      this.errorMessage.set(this.langService.t('branchesWarehouses.alerts.warehouseFieldsRequired'));
      return;
    }

    if (!this.warehouseForm.nameEn) {
      this.warehouseForm.nameEn = this.translator.translateArabicToEnglish(this.warehouseForm.nameAr);
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.bwService.createWarehouse(this.currentCompanyId, this.warehouseForm).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeWarehouseModal();
        this.showSuccess(this.langService.t('branchesWarehouses.alerts.warehouseAddedSuccess', { name: created.nameAr }));
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message || err?.error || this.langService.t('branchesWarehouses.alerts.warehouseSaveError'));
      }
    });
  }

  toggleWarehouseStatus(wh: WarehouseDto): void {
    const nextStatus = !wh.isActive;
    this.bwService.toggleWarehouseStatus(this.currentCompanyId, wh.id, nextStatus).subscribe({
      next: () => {
        wh.isActive = nextStatus;
        this.showSuccess(this.langService.t('branchesWarehouses.alerts.warehouseStatusUpdated', { status: nextStatus ? (this.langService.isArabic() ? 'نشط' : 'Active') : (this.langService.isArabic() ? 'معطل' : 'Inactive') }));
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || this.langService.t('branchesWarehouses.alerts.warehouseStatusFailed'));
      }
    });
  }

  // Helpers
  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }

  private getEmptyBranchForm(): CreateBranchDto {
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

  private getEmptyWarehouseForm(): CreateWarehouseDto {
    return {
      branchId: '',
      code: '',
      nameAr: '',
      nameEn: '',
      location: '',
      managerName: '',
      managerPhone: '',
      isDefault: false
    };
  }
}
