import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FixedAssetsService, FixedAssetDto, FixedAssetStatus, DepreciationMethod, CreateFixedAssetRequest, DepreciationPreviewDto } from '../../../core/services/fixed-assets.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto } from '../../../core/models/account.model';
import { CompanyContextService } from '../../../core/services/company-context.service';

@Component({
  selector: 'app-fixed-assets',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './fixed-assets.component.html',
  styleUrls: ['./fixed-assets.component.css']
})
export class FixedAssetsComponent implements OnInit {
  // State Signals
  assets = signal<FixedAssetDto[]>([]);
  postableAccounts = signal<AccountDto[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Filters
  searchTerm = signal<string>('');
  statusFilter = signal<FixedAssetStatus | 0>(0);

  // New Asset Modal State
  showCreateModal = signal<boolean>(false);
  newAsset = signal<CreateFixedAssetRequest>({
    nameAr: '',
    nameEn: '',
    assetAccountId: '',
    accumulatedDepreciationAccountId: '',
    depreciationExpenseAccountId: '',
    purchaseDate: new Date().toISOString().substring(0, 10),
    depreciationStartDate: new Date().toISOString().substring(0, 10),
    acquisitionCost: 0,
    salvageValue: 0,
    usefulLifeMonths: 36,
    depreciationMethod: DepreciationMethod.StraightLine,
    depreciationRate: 0,
    serialNumber: '',
    location: '',
    notes: ''
  });

  // Depreciation Run Modal State
  showDepreciationModal = signal<boolean>(false);
  depreciationDate = signal<string>(new Date().toISOString().substring(0, 10));
  depreciationPreview = signal<DepreciationPreviewDto | null>(null);
  isLoadingPreview = signal<boolean>(false);
  isRunningDepreciation = signal<boolean>(false);

  // Asset Disposal Modal State
  showDisposalModal = signal<boolean>(false);
  selectedAssetForDisposal = signal<FixedAssetDto | null>(null);
  disposalDate = signal<string>(new Date().toISOString().substring(0, 10));
  disposalSalePrice = signal<number>(0);
  disposalProceedsAccountId = signal<string>('');
  disposalReason = signal<string>('بيع الأصل بعد انتهاء الحاجة التشغيلية');
  disposalNotes = signal<string>('');
  isDisposing = signal<boolean>(false);

  // KPI Metrics
  totalAcquisitionCost = computed(() => {
    return this.assets().reduce((sum, a) => sum + (a.acquisitionCost || 0), 0);
  });

  totalAccumulatedDepreciation = computed(() => {
    return this.assets().reduce((sum, a) => sum + (a.totalAccumulatedDepreciation || 0), 0);
  });

  netBookValue = computed(() => {
    return this.assets().reduce((sum, a) => sum + (a.currentBookValue || 0), 0);
  });

  activeAssetsCount = computed(() => {
    return this.assets().filter(a => a.status === FixedAssetStatus.Active).length;
  });

  filteredAssets = computed(() => {
    const list = this.assets();
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return list.filter(a => {
      if (status !== 0 && a.status !== status) return false;
      if (query) {
        const code = (a.assetCode || '').toLowerCase();
        const name = (a.nameAr || '').toLowerCase();
        const en = (a.nameEn || '').toLowerCase();
        const loc = (a.location || '').toLowerCase();
        return code.includes(query) || name.includes(query) || en.includes(query) || loc.includes(query);
      }
      return true;
    });
  });

  // Filtered account lists for select dropdowns
  assetAccounts = computed(() => {
    return this.postableAccounts().filter(a => a.accountCode.startsWith('12'));
  });

  accumAccounts = computed(() => {
    return this.postableAccounts().filter(a => 
      a.accountCode.startsWith('12') && (a.accountCode.endsWith('2') || a.accountCode.endsWith('4') || a.accountCode.endsWith('6') || a.accountCode.endsWith('9') || a.nameAr.includes('مجمع'))
    );
  });

  expenseAccounts = computed(() => {
    return this.postableAccounts().filter(a => a.accountCode.startsWith('53'));
  });

  constructor(
    private fixedAssetsService: FixedAssetsService,
    private coaService: ChartOfAccountsService,
    private companyContext: CompanyContextService
  ) {}

  ngOnInit(): void {
    this.loadAssets();
    this.loadAccounts();
  }

  loadAssets(): void {
    const companyId = this.companyContext.activeCompany()?.id;
    this.isLoading.set(true);
    this.fixedAssetsService.getAssets(companyId).subscribe({
      next: (data) => {
        this.assets.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('فشل تحميل قائمة الأصول: ' + (err.error?.description || err.message));
        this.isLoading.set(false);
      }
    });
  }

  loadAccounts(): void {
    const compId = this.companyContext.activeCompany()?.id;
    this.coaService.loadAccountsTree(compId).subscribe({
      next: (tree: AccountDto[]) => {
        const flat: AccountDto[] = [];
        const flatten = (items: AccountDto[]) => {
          for (const item of items) {
            if (item.isPostable) {
              flat.push(item);
            }
            if (item.subAccounts && item.subAccounts.length > 0) {
              flatten(item.subAccounts);
            }
          }
        };
        flatten(tree);
        this.postableAccounts.set(flat);

        // Pre-select defaults if available
        const defaultAsset = flat.find(a => a.accountCode === '12103' || a.accountCode.startsWith('121'));
        const defaultAccum = flat.find(a => a.accountCode === '12104' || a.nameAr.includes('مجمع'));
        const defaultExp = flat.find(a => a.accountCode === '53102' || a.nameAr.includes('استهلاك'));

        this.newAsset.update(curr => ({
          ...curr,
          assetAccountId: defaultAsset?.id || '',
          accumulatedDepreciationAccountId: defaultAccum?.id || '',
          depreciationExpenseAccountId: defaultExp?.id || ''
        }));
      }
    });
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  saveAsset(): void {
    const asset = this.newAsset();
    if (!asset.nameAr.trim()) {
      this.errorMessage.set('يرجى إدخال اسم الأصل بالعربية');
      return;
    }
    if (!asset.assetAccountId || !asset.accumulatedDepreciationAccountId || !asset.depreciationExpenseAccountId) {
      this.errorMessage.set('يرجى تحديد حساب الأصل، مجمع الإهلاك، ومصروف الإهلاك');
      return;
    }
    if (asset.acquisitionCost <= 0) {
      this.errorMessage.set('تكلفة اقتناء الأصل يجب أن تكون أكبر من الصفر');
      return;
    }
    if (asset.usefulLifeMonths <= 0) {
      this.errorMessage.set('العمر الإنتاجي بالشهور يجب أن يكون أكبر من الصفر');
      return;
    }

    this.isSaving.set(true);
    const companyId = this.companyContext.activeCompany()?.id;
    const req = { ...asset, companyId };

    this.fixedAssetsService.createAsset(req).subscribe({
      next: (created) => {
        this.isSaving.set(false);
        this.closeCreateModal();
        this.successMessage.set(`تم إضافة الأصل الثابت بنجاح برقم [${created.assetCode}].`);
        this.loadAssets();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set('فشل إضافة الأصل: ' + (err.error?.description || err.message));
      }
    });
  }

  // Depreciation Run Modal
  openDepreciationModal(): void {
    this.showDepreciationModal.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.loadDepreciationPreview();
  }

  closeDepreciationModal(): void {
    this.showDepreciationModal.set(false);
  }

  loadDepreciationPreview(): void {
    const companyId = this.companyContext.activeCompany()?.id;
    const targetDate = this.depreciationDate();
    this.isLoadingPreview.set(true);

    this.fixedAssetsService.previewDepreciation(companyId, targetDate).subscribe({
      next: (preview) => {
        this.depreciationPreview.set(preview);
        this.isLoadingPreview.set(false);
      },
      error: (err) => {
        this.isLoadingPreview.set(false);
        this.errorMessage.set('فشل معاينة الإهلاك: ' + (err.error?.description || err.message));
      }
    });
  }

  executeDepreciation(): void {
    const companyId = this.companyContext.activeCompany()?.id;
    const targetDate = this.depreciationDate();

    this.isRunningDepreciation.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const req = {
      companyId,
      depreciationDate: targetDate,
      notes: `تشغيل الإهلاك الدوري لتاريخ ${targetDate}`
    };

    this.fixedAssetsService.runDepreciation(req).subscribe({
      next: (res) => {
        this.isRunningDepreciation.set(false);
        this.closeDepreciationModal();
        this.successMessage.set(res.message);
        this.loadAssets();
      },
      error: (err) => {
        this.isRunningDepreciation.set(false);
        this.errorMessage.set('فشل تشغيل الإهلاك: ' + (err.error?.description || err.message));
      }
    });
  }

  calculatePreviewMonthly(): number {
    const cost = Number(this.newAsset().acquisitionCost) || 0;
    const salvage = Number(this.newAsset().salvageValue) || 0;
    const months = Number(this.newAsset().usefulLifeMonths) || 1;
    const base = cost - salvage;
    return base > 0 ? Math.round((base / months) * 100) / 100 : 0;
  }

  cashBankAccounts = computed(() => {
    return this.postableAccounts().filter(a => a.accountCode.startsWith('111'));
  });

  openDisposalModal(asset: FixedAssetDto): void {
    this.selectedAssetForDisposal.set(asset);
    this.disposalSalePrice.set(asset.currentBookValue);
    this.disposalProceedsAccountId.set(this.cashBankAccounts()[0]?.id || '');
    this.disposalReason.set('بيع الأصل بعد استهلاك جزء من عمره الإنتاجي');
    this.disposalNotes.set('');
    this.showDisposalModal.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  closeDisposalModal(): void {
    this.showDisposalModal.set(false);
    this.selectedAssetForDisposal.set(null);
  }

  calculateDisposalGainLoss(): { amount: number; isGain: boolean } {
    const asset = this.selectedAssetForDisposal();
    if (!asset) return { amount: 0, isGain: true };
    const sale = Number(this.disposalSalePrice()) || 0;
    const book = asset.currentBookValue || 0;
    const diff = sale - book;
    return {
      amount: Math.abs(diff),
      isGain: diff >= 0
    };
  }

  executeDisposal(): void {
    const asset = this.selectedAssetForDisposal();
    if (!asset) return;

    const companyId = this.companyContext.activeCompany()?.id;
    const req = {
      companyId,
      disposalDate: this.disposalDate(),
      salePrice: Number(this.disposalSalePrice()) || 0,
      proceedsAccountId: this.disposalProceedsAccountId() || undefined,
      reason: this.disposalReason(),
      notes: this.disposalNotes()
    };

    this.isDisposing.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.fixedAssetsService.disposeAsset(asset.id, req).subscribe({
      next: (res) => {
        this.isDisposing.set(false);
        this.closeDisposalModal();
        this.successMessage.set(res.message);
        this.loadAssets();
      },
      error: (err) => {
        this.isDisposing.set(false);
        this.errorMessage.set('فشل استبعاد الأصل: ' + (err.error?.description || err.message));
      }
    });
  }
}
