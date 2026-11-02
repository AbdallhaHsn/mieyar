import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  FixedAssetsService, 
  FixedAssetDto, 
  FixedAssetStatus, 
  DepreciationMethod, 
  CreateFixedAssetRequest, 
  DepreciationPreviewDto,
  FixedAssetFinancialReportDto,
  FixedAssetCategorySummaryDto,
  FixedAssetMovementCategoryDto,
  FixedAssetDisposalReportItemDto
} from '../../../core/services/fixed-assets.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto } from '../../../core/models/account.model';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../core/services/language.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { FinancialSettingsService, CostCenter } from '../../../core/services/financial-settings.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-fixed-assets',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, TranslatePipe],
  templateUrl: './fixed-assets.component.html',
  styleUrls: ['./fixed-assets.component.css']
})
export class FixedAssetsComponent implements OnInit {
  // Navigation View: 'register' (Asset Register) or 'reports' (Financial Reports)
  activeView = signal<'register' | 'reports'>('register');

  // State Signals
  assets = signal<FixedAssetDto[]>([]);
  postableAccounts = signal<AccountDto[]>([]);
  costCenters = signal<CostCenter[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Financial Reports State
  activeReportTab = signal<'inventory' | 'movement' | 'disposals'>('inventory');
  reportAsOfDate = signal<string>(new Date().toISOString().substring(0, 10));
  reportFiscalYear = signal<number>(new Date().getFullYear());
  financialReport = signal<FixedAssetFinancialReportDto | null>(null);
  isLoadingReport = signal<boolean>(false);
  reportFilterAccount = signal<string>('all');

  // Filters
  searchTerm = signal<string>('');
  statusFilter = signal<FixedAssetStatus | 0>(0);

  // New Asset Modal State
  showCreateModal = signal<boolean>(false);
  manualEnEdited = signal<boolean>(false);
  unifiedAssetName = signal<string>('');
  backgroundTranslation = signal<string>('');
  newAsset = signal<CreateFixedAssetRequest>({
    nameAr: '',
    nameEn: '',
    assetAccountId: '',
    accumulatedDepreciationAccountId: '',
    depreciationExpenseAccountId: '',
    costCenterId: undefined,
    purchaseDate: new Date().toISOString().substring(0, 10),
    depreciationStartDate: new Date().toISOString().substring(0, 10),
    acquisitionCost: 0,
    salvageValue: 0,
    usefulLifeMonths: 36,
    depreciationMethod: DepreciationMethod.StraightLine,
    depreciationRate: 20,
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
  disposalReason = signal<string>('');
  disposalNotes = signal<string>('');
  isDisposing = signal<boolean>(false);

  // Asset Details Drawer State
  selectedAssetForDetails = signal<FixedAssetDto | null>(null);

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
        const cc = (a.costCenterNameAr || '').toLowerCase();
        return code.includes(query) || name.includes(query) || en.includes(query) || loc.includes(query) || cc.includes(query);
      }
      return true;
    });
  });

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedAssets = computed(() => {
    const list = this.filteredAssets();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
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

  cashBankAccounts = computed(() => {
    return this.postableAccounts().filter(a => a.accountCode.startsWith('111'));
  });

  filteredReportCategories = computed(() => {
    const report = this.financialReport();
    if (!report) return [];
    const filter = this.reportFilterAccount();
    if (filter === 'all') return report.categories;
    return report.categories.filter(c => c.assetAccountId === filter);
  });

  filteredMovementSchedule = computed(() => {
    const report = this.financialReport();
    if (!report) return [];
    const filter = this.reportFilterAccount();
    if (filter === 'all') return report.movementSchedule;
    return report.movementSchedule.filter(m => {
      const matchCat = report.categories.find(c => c.assetAccountId === filter);
      return matchCat ? matchCat.accountCode === m.accountCode : true;
    });
  });

  constructor(
    private fixedAssetsService: FixedAssetsService,
    private coaService: ChartOfAccountsService,
    private financialSettingsService: FinancialSettingsService,
    public companyContext: CompanyContextService,
    private translator: AccountingTranslatorService,
    public langService: LanguageService,
    private router: Router
  ) {}

  // Rule 1: Single-Entry Bilingual Auto-Translation (Smart Background Translation)
  onUnifiedAssetNameChange(text: string): void {
    this.unifiedAssetName.set(text);
    if (!text.trim()) {
      this.newAsset.update(curr => ({ ...curr, nameAr: '', nameEn: '' }));
      this.backgroundTranslation.set('');
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const instant = this.translator.translateArabicToEnglish(text);
      this.newAsset.update(curr => ({ ...curr, nameAr: text, nameEn: instant }));
      this.backgroundTranslation.set(`${this.langService.t('accounting.fixedAssets.englishTranslationPrefix')}${instant}`);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.newAsset.update(curr => ({ ...curr, nameEn: refined }));
          this.backgroundTranslation.set(`${this.langService.t('accounting.fixedAssets.englishTranslationPrefix')}${refined}`);
        }
      );
    } else {
      const instant = this.translator.translateEnglishToArabic(text);
      this.newAsset.update(curr => ({ ...curr, nameEn: text, nameAr: instant }));
      this.backgroundTranslation.set(`${this.langService.t('accounting.fixedAssets.arabicTranslationPrefix')}${instant}`);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.newAsset.update(curr => ({ ...curr, nameAr: refined }));
          this.backgroundTranslation.set(`${this.langService.t('accounting.fixedAssets.arabicTranslationPrefix')}${refined}`);
        }
      });
    }
  }

  async forceRetranslateAsset(): Promise<void> {
    const text = this.unifiedAssetName() || this.newAsset().nameAr || this.newAsset().nameEn;
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const refined = await this.translator.translateOnline(text, 'ar', 'en');
      const finalEn = refined || this.translator.translateArabicToEnglish(text);
      this.newAsset.update(curr => ({ ...curr, nameEn: finalEn }));
      this.backgroundTranslation.set(`${this.langService.t('accounting.fixedAssets.englishTranslationPrefix')}${finalEn}`);
    } else {
      const refined = await this.translator.translateOnline(text, 'en', 'ar');
      const finalAr = refined || this.translator.translateEnglishToArabic(text);
      this.newAsset.update(curr => ({ ...curr, nameAr: finalAr }));
      this.backgroundTranslation.set(`${this.langService.t('accounting.fixedAssets.arabicTranslationPrefix')}${finalAr}`);
    }
  }

  onAssetNameArChange(val: string) {
    this.onUnifiedAssetNameChange(val);
  }

  onAssetNameEnChange(val: string) {
    this.onUnifiedAssetNameChange(val);
  }

  retranslateToEnglish() {
    this.forceRetranslateAsset();
  }

  ngOnInit(): void {
    this.loadAssets();
    this.loadAccounts();
    this.loadCostCenters();
  }

  loadAssets(): void {
    const companyId = this.companyContext.activeCompany()?.id;
    this.isLoading.set(true);
    this.fixedAssetsService.getAssets(companyId).subscribe({
      next: (data) => {
        this.assets.set(data);
        this.isLoading.set(false);
        // Refresh selected asset if details drawer is open
        if (this.selectedAssetForDetails()) {
          const updated = data.find(x => x.id === this.selectedAssetForDetails()?.id);
          if (updated) this.selectedAssetForDetails.set(updated);
        }
      },
      error: (err) => {
        this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.loadAssetsFailed', { msg: err.error?.description || err.message || '' }));
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

  loadCostCenters(): void {
    const compId = this.companyContext.activeCompany()?.id;
    this.financialSettingsService.getOverview(compId).subscribe({
      next: (overview) => {
        this.costCenters.set(overview.costCenters || []);
      },
      error: () => {}
    });
  }

  openCreateModal(): void {
    this.manualEnEdited.set(false);
    this.unifiedAssetName.set('');
    this.backgroundTranslation.set('');
    this.showCreateModal.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  saveAsset(): void {
    if (!this.newAsset().nameAr.trim() && this.unifiedAssetName().trim()) {
      this.onUnifiedAssetNameChange(this.unifiedAssetName().trim());
    }

    const asset = this.newAsset();
    if (!asset.nameAr.trim() && !this.unifiedAssetName().trim()) {
      this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.nameRequired'));
      return;
    }
    if (!asset.assetAccountId || !asset.accumulatedDepreciationAccountId || !asset.depreciationExpenseAccountId) {
      this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.accountsRequired'));
      return;
    }
    if (asset.acquisitionCost <= 0) {
      this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.costGreaterThanZero'));
      return;
    }
    if (asset.usefulLifeMonths <= 0) {
      this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.lifeGreaterThanZero'));
      return;
    }

    this.isSaving.set(true);
    const companyId = this.companyContext.activeCompany()?.id;
    const req = { ...asset, companyId };

    this.fixedAssetsService.createAsset(req).subscribe({
      next: (created) => {
        this.isSaving.set(false);
        this.closeCreateModal();
        this.successMessage.set(this.langService.t('accounting.fixedAssets.alerts.assetAddedSuccess', { code: created.assetCode || '' }));
        this.loadAssets();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.assetAddFailed', { msg: err.error?.description || err.message || '' }));
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
        this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.previewFailed', { msg: err.error?.description || err.message || '' }));
      }
    });
  }

  executeDepreciation(): void {
    const companyId = this.companyContext.activeCompany()?.id;
    const targetDate = this.depreciationDate();
    const preview = this.depreciationPreview();
    const count = preview?.eligibleAssetsCount ?? 0;
    const totalAmount = preview?.totalDepreciationAmount ?? 0;

    const isAr = this.langService.isArabic();
    Swal.fire({
      title: this.langService.t('accounting.fixedAssets.alerts.confirmDepreciationTitle'),
      html: `
        <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.88rem; line-height: 1.6; color: #334155;">
          <p>${this.langService.t('accounting.fixedAssets.alerts.confirmDeprIntro')}</p>
          <div style="margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('accounting.fixedAssets.alerts.deprDueDate')}</span> <strong style="color: #0284c7;">${targetDate}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('accounting.fixedAssets.alerts.dueAssetsCount')}</span> <strong>${count} ${this.langService.t('accounting.fixedAssets.activeAssetUnit')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
              <span>${this.langService.t('accounting.fixedAssets.alerts.totalDeprAmount')}</span> <strong style="color: #059669; font-size: 1rem;">${totalAmount.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}</strong>
            </div>
          </div>
          <div style="padding: 8px 12px; background: #eff6ff; border-radius: 6px; border-inline-start: 4px solid #0284c7; font-size: 0.8rem; color: #1e40af;">
            <i class="pi pi-info-circle"></i> ${this.langService.t('accounting.fixedAssets.alerts.deprGlInfo')}
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.fixedAssets.alerts.confirmRunDeprBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then(modalRes => {
      if (modalRes.isConfirmed) {
        this.isRunningDepreciation.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');

        const req = {
          companyId,
          depreciationDate: targetDate,
          notes: this.langService.t('accounting.fixedAssets.periodicDeprNotes', { date: targetDate })
        };

        this.fixedAssetsService.runDepreciation(req).subscribe({
          next: (res) => {
            this.isRunningDepreciation.set(false);
            this.closeDepreciationModal();
            this.loadAssets();

            Swal.fire({
              icon: 'success',
              title: this.langService.t('accounting.fixedAssets.alerts.deprSuccessTitle'),
              html: `
                <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; line-height: 1.6;">
                  <div>${this.langService.t('accounting.fixedAssets.alerts.generatedEntryNumber')} <strong style="color: #059669; font-family: monospace;">${res.journalEntryNumber}</strong></div>
                  <div>${this.langService.t('accounting.fixedAssets.alerts.depreciatedAssetsCount')} <strong>${res.depreciatedAssetsCount} ${this.langService.t('accounting.fixedAssets.assetUnit')}</strong></div>
                  <div>${this.langService.t('accounting.fixedAssets.alerts.totalDepreciatedAmount')} <strong style="color: #059669;">${res.totalDepreciationAmount.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}</strong></div>
                  <div>${this.langService.t('accounting.fixedAssets.alerts.accountingDate')} <strong>${res.depreciationDate.substring(0, 10)}</strong></div>
                </div>
              `,
              showCancelButton: !!res.journalEntryNumber,
              confirmButtonText: this.langService.t('common.ok'),
              cancelButtonText: this.langService.t('accounting.fixedAssets.viewJournalEntry'),
              confirmButtonColor: '#059669',
              cancelButtonColor: '#0284c7'
            }).then((navRes) => {
              if (navRes.dismiss === Swal.DismissReason.cancel && res.journalEntryNumber) {
                this.router.navigate(['/accounting/journal-entries'], {
                  queryParams: { search: res.journalEntryNumber }
                });
              }
            });
          },
          error: (err) => {
            this.isRunningDepreciation.set(false);
            const msg = err.error?.description || err.error?.Description || err.message;
            this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.deprFailedTitle') + ': ' + msg);
            Swal.fire({
              icon: 'error',
              title: this.langService.t('accounting.fixedAssets.alerts.deprFailedTitle'),
              text: msg
            });
          }
        });
      }
    });
  }

  calculatePreviewMonthly(): number {
    const cost = Number(this.newAsset().acquisitionCost) || 0;
    const salvage = Number(this.newAsset().salvageValue) || 0;
    const months = Number(this.newAsset().usefulLifeMonths) || 1;
    const method = this.newAsset().depreciationMethod;
    const base = cost - salvage;
    if (base <= 0) return 0;

    if (method === DepreciationMethod.StraightLine) {
      return Math.round((base / months) * 100) / 100;
    } else {
      const rate = Number(this.newAsset().depreciationRate) > 0 
        ? Number(this.newAsset().depreciationRate) / 100 
        : (2 / (months / 12));
      const monthlyRate = rate / 12;
      return Math.round(cost * monthlyRate * 100) / 100;
    }
  }

  // Details Drawer
  openAssetDetails(asset: FixedAssetDto): void {
    this.selectedAssetForDetails.set(asset);
  }

  closeAssetDetails(): void {
    this.selectedAssetForDetails.set(null);
  }

  // Disposal Modal
  openDisposalModal(asset: FixedAssetDto): void {
    this.selectedAssetForDisposal.set(asset);
    this.disposalSalePrice.set(asset.currentBookValue);
    this.disposalProceedsAccountId.set(this.cashBankAccounts()[0]?.id || '');
    this.disposalReason.set(this.langService.t('accounting.fixedAssets.defaultDisposalReasonPartial'));
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
    const gainLoss = this.calculateDisposalGainLoss();
    const salePrice = Number(this.disposalSalePrice()) || 0;

    const isAr = this.langService.isArabic();
    const assetName = isAr ? asset.nameAr : (asset.nameEn || asset.nameAr);
    const gainLossLabel = gainLoss.isGain
      ? this.langService.t('accounting.fixedAssets.alerts.capitalGainPlus')
      : this.langService.t('accounting.fixedAssets.alerts.capitalLossMinus');

    Swal.fire({
      title: this.langService.t('accounting.fixedAssets.alerts.confirmDisposalTitle'),
      html: `
        <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.88rem; line-height: 1.6; color: #334155;">
          <p>${this.langService.t('accounting.fixedAssets.alerts.confirmDisposalIntro', { code: asset.assetCode, name: assetName })}</p>
          <div style="margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('accounting.fixedAssets.alerts.historicalCost')}</span> <strong>${asset.acquisitionCost.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('accounting.fixedAssets.alerts.accumulatedDeprToDate')}</span> <strong>${asset.totalAccumulatedDepreciation.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('accounting.fixedAssets.alerts.netBookValue')}</span> <strong>${asset.currentBookValue.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${this.langService.t('accounting.fixedAssets.alerts.collectedSalePrice')}</span> <strong style="color: #0284c7;">${salePrice.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
              <span>${gainLossLabel}</span>
              <strong style="color: ${gainLoss.isGain ? '#059669' : '#dc2626'}; font-size: 1rem;">
                ${gainLoss.amount.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}
              </strong>
            </div>
          </div>
          <div style="padding: 8px 12px; background: #fffbeb; border-radius: 6px; border-inline-start: 4px solid #f59e0b; font-size: 0.8rem; color: #92400e;">
            <i class="pi pi-exclamation-triangle"></i> ${this.langService.t('accounting.fixedAssets.alerts.disposalGlWarning')}
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('accounting.fixedAssets.alerts.confirmDisposalBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    }).then(modalRes => {
      if (modalRes.isConfirmed) {
        this.isDisposing.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');

        const req = {
          companyId,
          disposalDate: this.disposalDate(),
          salePrice,
          proceedsAccountId: this.disposalProceedsAccountId() || undefined,
          reason: this.disposalReason(),
          notes: this.disposalNotes()
        };

        this.fixedAssetsService.disposeAsset(asset.id, req).subscribe({
          next: (res) => {
            this.isDisposing.set(false);
            this.closeDisposalModal();
            this.loadAssets();

            const resAssetName = res.nameAr;
            const gainOrLossText = res.isGain
              ? this.langService.t('accounting.fixedAssets.capitalGainLabel')
              : this.langService.t('accounting.fixedAssets.capitalLossLabel');

            Swal.fire({
              icon: 'success',
              title: this.langService.t('accounting.fixedAssets.alerts.disposalSuccessTitle'),
              html: `
                <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.85rem; line-height: 1.6;">
                  <div>${this.langService.t('accounting.fixedAssets.alerts.disposalEntryNumber')} <strong style="color: #059669; font-family: monospace;">${res.journalEntryNumber}</strong></div>
                  <div>${this.langService.t('accounting.fixedAssets.alerts.disposedAsset')} <strong>[${res.assetCode}] ${resAssetName}</strong></div>
                  <div>${this.langService.t('accounting.fixedAssets.alerts.bookValueAtDisposal')} <strong>${res.bookValueAtDisposal.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}</strong></div>
                  <div>${this.langService.t('accounting.fixedAssets.alerts.collectedSalePriceLabel')} <strong>${res.salePrice.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}</strong></div>
                  <div>${gainOrLossText} <strong style="color: ${res.isGain ? '#059669' : '#dc2626'};">${res.gainOrLossAmount.toFixed(2)} ${this.langService.t('accounting.fixedAssets.currencySar')}</strong></div>
                </div>
              `,
              showCancelButton: !!res.journalEntryNumber,
              confirmButtonText: this.langService.t('common.ok'),
              cancelButtonText: this.langService.t('accounting.fixedAssets.viewJournalEntry'),
              confirmButtonColor: '#059669',
              cancelButtonColor: '#0284c7'
            }).then((navRes) => {
              if (navRes.dismiss === Swal.DismissReason.cancel && res.journalEntryNumber) {
                this.router.navigate(['/accounting/journal-entries'], {
                  queryParams: { search: res.journalEntryNumber }
                });
              }
            });
          },
          error: (err) => {
            this.isDisposing.set(false);
            const msg = err.error?.description || err.error?.Description || err.message;
            this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.disposalFailedTitle') + ': ' + msg);
            Swal.fire({
              icon: 'error',
              title: this.langService.t('accounting.fixedAssets.alerts.disposalFailedTitle'),
              text: msg
            });
          }
        });
      }
    });
  }

  // Financial Reports Actions
  switchToReports(): void {
    this.activeView.set('reports');
    if (!this.financialReport()) {
      this.loadFinancialReport();
    }
  }

  switchToRegister(): void {
    this.activeView.set('register');
  }

  loadFinancialReport(): void {
    const companyId = this.companyContext.activeCompany()?.id;
    this.isLoadingReport.set(true);
    this.fixedAssetsService.getFinancialReport(companyId, this.reportAsOfDate(), this.reportFiscalYear())
      .subscribe({
        next: (data) => {
          this.financialReport.set(data);
          this.isLoadingReport.set(false);
        },
        error: (err) => {
          this.isLoadingReport.set(false);
          this.errorMessage.set(this.langService.t('accounting.fixedAssets.alerts.loadReportFailed', { msg: err.error?.description || err.message || '' }));
        }
      });
  }

  exportReportToExcel(): void {
    const report = this.financialReport();
    if (!report) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Arabic support

    if (this.activeReportTab() === 'inventory') {
      csvContent += `${this.langService.t('accounting.fixedAssets.csv.inventoryTitle')}\r\n`;
      csvContent += `${this.langService.t('accounting.fixedAssets.csv.reportDatePrefix')}${this.reportAsOfDate()}\r\n\r\n`;
      csvContent += `${this.langService.t('accounting.fixedAssets.csv.inventoryHeaders')}\r\n`;

      for (const cat of this.filteredReportCategories()) {
        for (const a of cat.assets) {
          csvContent += `"${a.assetCode}","${a.nameAr}","${cat.accountNameAr}","${a.costCenterNameAr || ''}","${a.purchaseDate ? a.purchaseDate.substring(0, 10) : ''}",${a.acquisitionCost},${a.salvageValue},${a.totalAccumulatedDepreciation},${a.currentBookValue},"${a.depreciationMethodNameAr}","${a.statusNameAr}"\r\n`;
        }
      }
    } else if (this.activeReportTab() === 'movement') {
      csvContent += `${this.langService.t('accounting.fixedAssets.csv.movementTitle')}\r\n`;
      csvContent += `${this.langService.t('accounting.fixedAssets.csv.fiscalYearPrefix')}${this.reportFiscalYear()}\r\n\r\n`;
      csvContent += `${this.langService.t('accounting.fixedAssets.csv.movementHeaders')}\r\n`;

      for (const m of this.filteredMovementSchedule()) {
        csvContent += `"${m.categoryNameAr}","${m.accountCode}",${m.openingCost},${m.additionsCost},${m.disposalsCost},${m.closingCost},${m.openingAccumulated},${m.periodDepreciation},${m.disposalsAccumulated},${m.closingAccumulated},${m.openingBookValue},${m.closingBookValue}\r\n`;
      }
    } else {
      csvContent += `${this.langService.t('accounting.fixedAssets.csv.disposalTitle')}\r\n`;
      csvContent += `${this.langService.t('accounting.fixedAssets.csv.reportDatePrefix')}${this.reportAsOfDate()}\r\n\r\n`;
      csvContent += `${this.langService.t('accounting.fixedAssets.csv.disposalHeaders')}\r\n`;

      for (const d of report.disposals) {
        const typeStr = d.isGain ? this.langService.t('accounting.fixedAssets.capitalGain') : this.langService.t('accounting.fixedAssets.capitalLoss');
        csvContent += `"${d.assetCode}","${d.nameAr}","${d.disposalDate ? d.disposalDate.substring(0, 10) : ''}",${d.acquisitionCost},${d.accumulatedDepreciationAtDisposal},${d.bookValueAtDisposal},${d.salePrice},${d.gainOrLossAmount},"${typeStr}","${d.reason || ''}"\r\n`;
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FixedAssets_Report_${this.activeReportTab()}_${this.reportAsOfDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printReport(): void {
    window.print();
  }
}
