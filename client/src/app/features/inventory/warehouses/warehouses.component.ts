import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BranchesWarehousesService, WarehouseDto, BranchDto, CreateWarehouseDto, WarehouseAccountMappingDto } from '../../../core/services/branches-warehouses.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../core/services/language.service';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { PurchasingService, ItemDto, ItemWarehouseStockDto } from '../../../core/services/purchasing.service';
import { InvoicesService } from '../../../core/services/invoices.service';
import { AccountDto } from '../../../core/models/account.model';
import { AccountPickerComponent } from '../../../shared/components/account-picker/account-picker.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TenantManagementService, CompanyQuotaDto } from '../../../core/services/tenant-management.service';

export interface WarehouseItemAnalyticsDto {
  itemId: string;
  itemCode: string;
  nameAr: string;
  nameEn: string;
  categoryName: string;
  unitOfMeasure: string;
  currentQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  isNearDepletion: boolean;
  isOutOfStock: boolean;
  stockHealthStatus: 'danger' | 'warning' | 'healthy' | 'empty';
  stockHealthLabel: string;
  stockHealthPercent: number;
  averageCostPrice: number;
  highestSalePrice: number;
  lowestSalePrice: number;
  baseSalePrice: number;
  expectedProfitMargin: number;
  totalValuation: number;
  binLocation: string;
}

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, AccountPickerComponent, TranslatePipe],
  templateUrl: './warehouses.component.html',
  styleUrls: ['./warehouses.component.css']
})
export class WarehousesComponent implements OnInit {
  Math = Math;
  private router = inject(Router);
  private bwService = inject(BranchesWarehousesService);
  public companyContext = inject(CompanyContextService);
  private translator = inject(AccountingTranslatorService);
  public langService = inject(LanguageService);
  private coaService = inject(ChartOfAccountsService);
  public purchasingService = inject(PurchasingService);
  public invoicesService = inject(InvoicesService);
  private tenantService = inject(TenantManagementService);

  // License Quota State
  licenseQuota = signal<CompanyQuotaDto | null>(null);
  isWarehouseQuotaFull = computed(() => {
    const q = this.licenseQuota();
    if (!q || q.maxWarehouses === null) return false;
    return (q.usedWarehouses ?? 0) >= q.maxWarehouses;
  });

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  searchQuery = signal<string>('');
  warehouses = signal<WarehouseDto[]>([]);
  branches = signal<BranchDto[]>([]);

  showAddModal = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingWarehouseId = signal<string | null>(null);
  isSubmitting = signal<boolean>(false);

  // Accounting Posting Matrix State
  showMatrixModal = signal<boolean>(false);
  matrixWarehouse = signal<WarehouseDto | null>(null);
  selectedPaymentMethod = signal<number>(1); // 1 = Cash (نقدي), 2 = Credit (آجل), 3 = BankCard (شبكة)
  isMatrixLoading = signal<boolean>(false);
  isMatrixSaving = signal<boolean>(false);
  flattenedAccounts = signal<AccountDto[]>([]);
  allMappings = signal<WarehouseAccountMappingDto[]>([]);
  currentMatrix = signal<WarehouseAccountMappingDto>(this.getEmptyMatrix(1));
  copiedMatrix = signal<WarehouseAccountMappingDto | null>(null);

  matrixRows = [
    {
      id: 'salesInvoice',
      nameAr: 'فاتورة المبيعات (حساب القبض / المدين)',
      nameEn: 'Sales Invoice (Receivables / Debit Account)',
      sideAr: 'الجانب المدين للحساب',
      sideEn: 'Debit Side of Account',
      sideClass: 'side-debit',
      idKey: 'salesInvoiceAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'salesInvoiceAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'salesInvoiceAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'الصندوق (نقدي) أو العميل (آجل) أو وسيط الشبكة (بطاقة)',
      hintEn: 'Cash on hand (Cash) or Customer (Credit) or Card Clearing (POS)'
    },
    {
      id: 'salesRevenue',
      nameAr: 'المخزون المباع (إيرادات المبيعات)',
      nameEn: 'Sold Inventory (Sales Revenue)',
      sideAr: 'الجانب الدائن للحساب',
      sideEn: 'Credit Side of Account',
      sideClass: 'side-credit',
      idKey: 'salesRevenueAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'salesRevenueAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'salesRevenueAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'إيرادات مبيعات المعارض والمستودع',
      hintEn: 'Showroom & warehouse sales revenue'
    },
    {
      id: 'cogs',
      nameAr: 'تكلفة البضاعة المباعة (حساب التكلفة)',
      nameEn: 'Cost of Goods Sold (Expense Account)',
      sideAr: 'الجانب المدين للحساب',
      sideEn: 'Debit Side of Account',
      sideClass: 'side-debit',
      idKey: 'cogsAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'cogsAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'cogsAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'تكلفة بضاعة مبيعات المعارض والمستودع',
      hintEn: 'Cost of goods sold for showroom & warehouse'
    },
    {
      id: 'inventory',
      nameAr: 'تكلفة البضاعة المباعة (إخراج المخزون)',
      nameEn: 'Inventory Outflow (Asset Account)',
      sideAr: 'الجانب الدائن للحساب',
      sideEn: 'Credit Side of Account',
      sideClass: 'side-credit',
      idKey: 'inventoryAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'inventoryAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'inventoryAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'مخزون بضاعة المستودع المعني',
      hintEn: 'Inventory stock of designated warehouse'
    },
    {
      id: 'loyalty',
      nameAr: 'عملاء الولاء والمكافآت',
      nameEn: 'Loyalty & Rewards Customers',
      sideAr: 'الجانب المدين للحساب',
      sideEn: 'Debit Side of Account',
      sideClass: 'side-debit',
      idKey: 'loyaltyCustomersAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'loyaltyCustomersAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'loyaltyCustomersAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'نقاط ومكافآت برامج الولاء',
      hintEn: 'Loyalty program points and rewards'
    },
    {
      id: 'servicesRev',
      nameAr: 'حساب إيراد الخدمات',
      nameEn: 'Services Revenue Account',
      sideAr: 'الجانب الدائن للحساب',
      sideEn: 'Credit Side of Account',
      sideClass: 'side-credit',
      idKey: 'servicesRevenueAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'servicesRevenueAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'servicesRevenueAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'إيرادات الخدمات المساندة بالمستودع',
      hintEn: 'Supporting services revenue in warehouse'
    },
    {
      id: 'servicesCost',
      nameAr: 'تكلفة مواد الخدمات',
      nameEn: 'Services Material Cost',
      sideAr: 'الجانب المدين للحساب',
      sideEn: 'Debit Side of Account',
      sideClass: 'side-debit',
      idKey: 'servicesCostAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'servicesCostAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'servicesCostAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'تكلفة مواد وقطع الغيار للخدمات',
      hintEn: 'Materials and spare parts cost for services'
    },
    {
      id: 'rounding',
      nameAr: 'تقريب وفوارق الهللات',
      nameEn: 'Rounding & Fraction Variance',
      sideAr: 'الجانب المدين / الجانب الدائن',
      sideEn: 'Debit / Credit Side',
      sideClass: 'side-both',
      idKey: 'roundingAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'roundingAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'roundingAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'حساب فروقات الكسور الحسابية والتقريب',
      hintEn: 'Account for fractions and rounding variances'
    },
    {
      id: 'salesReturn',
      nameAr: 'مرتجعات المبيعات',
      nameEn: 'Sales Returns',
      sideAr: 'الجانب المدين للحساب',
      sideEn: 'Debit Side of Account',
      sideClass: 'side-debit',
      idKey: 'salesReturnAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'salesReturnAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'salesReturnAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'مردودات مبيعات المعارض والمستودع',
      hintEn: 'Sales returns for showroom & warehouse'
    },
    {
      id: 'advancePayment',
      nameAr: 'الدفعة المقدمة / العربون',
      nameEn: 'Advance Payment / Deposit',
      sideAr: 'الجانب المدين للحساب',
      sideEn: 'Debit Side of Account',
      sideClass: 'side-debit',
      idKey: 'advancePaymentAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'advancePaymentAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'advancePaymentAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'صندوق أو بنك استلام الدفعات المقدمة',
      hintEn: 'Cash or bank receiving advance payments'
    },
    {
      id: 'discountAllowed',
      nameAr: 'الخصم المسموح به',
      nameEn: 'Discount Allowed',
      sideAr: 'الجانب المدين للحساب',
      sideEn: 'Debit Side of Account',
      sideClass: 'side-debit',
      idKey: 'discountAllowedAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'discountAllowedAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'discountAllowedAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'حساب الخصم الممنوح على المبيعات',
      hintEn: 'Discount allowed expense account on sales'
    },
    {
      id: 'additionalExpenses',
      nameAr: 'الرسوم والمصاريف الإضافية',
      nameEn: 'Additional Fees & Expenses',
      sideAr: 'الجانب الدائن للحساب',
      sideEn: 'Credit Side of Account',
      sideClass: 'side-credit',
      idKey: 'additionalExpensesAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'additionalExpensesAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'additionalExpensesAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'رسوم الشحن والتوصيل الإضافية',
      hintEn: 'Additional shipping and delivery fees'
    },
    {
      id: 'tax',
      nameAr: 'ضريبة القيمة المضافة',
      nameEn: 'Value Added Tax (VAT)',
      sideAr: 'الجانب الدائن للحساب',
      sideEn: 'Credit Side of Account',
      sideClass: 'side-credit',
      idKey: 'taxAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'taxAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'taxAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'ضريبة المخرجات المستحقة (15%)',
      hintEn: 'Output VAT payable (15%)'
    },
    {
      id: 'transferClearing',
      nameAr: 'وسيط تحويلات المخزون (بضاعة بالطريق)',
      nameEn: 'Inter-Warehouse Transfer Clearing (Goods in Transit)',
      sideAr: 'الجانب المدين / الجانب الدائن',
      sideEn: 'Debit / Credit Side',
      sideClass: 'side-both',
      idKey: 'transferClearingAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'transferClearingAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'transferClearingAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'بضاعة بالطريق بين المستودعات',
      hintEn: 'Goods in transit between warehouses'
    },
    {
      id: 'adjustmentVariance',
      nameAr: 'تسويات وفروقات الجرد المخزني',
      nameEn: 'Physical Inventory Adjustment & Variances',
      sideAr: 'الجانب المدين / الجانب الدائن',
      sideEn: 'Debit / Credit Side',
      sideClass: 'side-both',
      idKey: 'adjustmentVarianceAccountId' as keyof WarehouseAccountMappingDto,
      codeKey: 'adjustmentVarianceAccountCode' as keyof WarehouseAccountMappingDto,
      nameKey: 'adjustmentVarianceAccountName' as keyof WarehouseAccountMappingDto,
      hintAr: 'عجز وزيادة الجرد المخزني الفعلي',
      hintEn: 'Actual physical count surplus and deficit'
    }
  ];

  warehouseForm: CreateWarehouseDto = this.getEmptyForm();
  manualEnEdit = false;
  unifiedWarehouseName = '';
  backgroundTranslation = '';

  // View Modes & Quick Filters (Default is Table as requested)
  viewMode = signal<'cards' | 'table'>('table');
  statusFilter = signal<'all' | 'active' | 'default'>('all');

  setStatusFilter(filter: 'all' | 'active' | 'default'): void {
    this.statusFilter.set(filter);
    this.currentPage.set(1);
  }

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  filteredWarehouses = computed(() => {
    let list = this.warehouses();
    const sf = this.statusFilter();
    if (sf === 'active') {
      list = list.filter(w => w.isActive);
    } else if (sf === 'default') {
      list = list.filter(w => w.isDefault);
    }

    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return list;

    return list.filter(w =>
      w.code.toLowerCase().includes(q) ||
      w.nameAr.toLowerCase().includes(q) ||
      w.nameEn.toLowerCase().includes(q) ||
      (w.branchName && w.branchName.toLowerCase().includes(q)) ||
      (w.location && w.location.toLowerCase().includes(q)) ||
      (w.managerName && w.managerName.toLowerCase().includes(q))
    );
  });

  paginatedWarehouses = computed(() => {
    const list = this.filteredWarehouses();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  // KPIs
  totalWarehouses = computed(() => this.warehouses().length);
  activeWarehouses = computed(() => this.warehouses().filter(w => w.isActive).length);
  defaultWarehouses = computed(() => this.warehouses().filter(w => w.isDefault).length);
  branchesServed = computed(() => {
    const bNames = new Set(this.warehouses().map(w => w.branchName).filter(Boolean));
    return bNames.size;
  });

  // Navigate to Dedicated Warehouse Analytics Page
  openWarehouseAnalytics(w: WarehouseDto): void {
    this.router.navigate(['/purchasing/warehouses', w.id, 'analytics']);
  }

  ngOnInit(): void {
    this.loadData();
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

  loadData(): void {
    const companyId = this.currentCompanyId;
    if (!companyId) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Load branches for linked selection
    this.bwService.getBranches(companyId).subscribe({
      next: (bList) => {
        this.branches.set(bList);
        
        // Load warehouses
        this.bwService.getWarehouses(companyId).subscribe({
          next: (whList) => {
            this.warehouses.set(whList);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Failed to load warehouses', err);
            this.errorMessage.set(this.langService.t('inventory.warehouses.alerts.loadWarehousesFailed'));
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Failed to load branches', err);
        this.isLoading.set(false);
      }
    });
  }

  openAddModal(): void {
    if (this.isWarehouseQuotaFull()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('companies.portal.quotaFullWarning'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    this.warehouseForm = this.getEmptyForm();
    if (this.branches().length > 0) {
      this.warehouseForm.branchId = this.branches()[0].id;
    }
    this.manualEnEdit = false;
    this.unifiedWarehouseName = '';
    this.backgroundTranslation = '';
    this.isEditMode.set(false);
    this.editingWarehouseId.set(null);
    this.showAddModal.set(true);
  }

  openEditModal(w: WarehouseDto): void {
    this.warehouseForm = {
      branchId: w.branchId || '',
      code: w.code,
      nameAr: w.nameAr,
      nameEn: w.nameEn,
      location: w.location || '',
      managerName: w.managerName || '',
      managerPhone: w.managerPhone || '',
      isDefault: w.isDefault
    };
    this.manualEnEdit = true;
    this.unifiedWarehouseName = w.nameAr || w.nameEn;
    this.backgroundTranslation = w.nameEn ? `الترجمة الإنجليزية: ${w.nameEn}` : '';
    this.isEditMode.set(true);
    this.editingWarehouseId.set(w.id);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.isEditMode.set(false);
    this.editingWarehouseId.set(null);
  }

  onUnifiedWarehouseNameChange(text: string): void {
    this.unifiedWarehouseName = text;
    if (!text.trim()) {
      this.warehouseForm.nameAr = '';
      this.warehouseForm.nameEn = '';
      this.backgroundTranslation = '';
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.warehouseForm.nameAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.warehouseForm.nameEn = instant;
      this.backgroundTranslation = `الترجمة الإنجليزية: ${instant}`;
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.warehouseForm.nameEn = refined;
          this.backgroundTranslation = `الترجمة الإنجليزية: ${refined}`;
        }
      );
    } else {
      this.warehouseForm.nameEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.warehouseForm.nameAr = instant;
      this.backgroundTranslation = `الترجمة العربية: ${instant}`;
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.warehouseForm.nameAr = refined;
          this.backgroundTranslation = `الترجمة العربية: ${refined}`;
        }
      });
    }
  }

  onArabicNameChange(val: string): void {
    this.onUnifiedWarehouseNameChange(val);
  }

  async forceTranslate(): Promise<void> {
    const text = this.unifiedWarehouseName || this.warehouseForm.nameAr || this.warehouseForm.nameEn;
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const refined = await this.translator.translateOnline(text, 'ar', 'en');
      this.warehouseForm.nameEn = refined || this.translator.translateArabicToEnglish(text);
      this.backgroundTranslation = `الترجمة الإنجليزية: ${this.warehouseForm.nameEn}`;
    } else {
      const refined = await this.translator.translateOnline(text, 'en', 'ar');
      this.warehouseForm.nameAr = refined || this.translator.translateEnglishToArabic(text);
      this.backgroundTranslation = `الترجمة العربية: ${this.warehouseForm.nameAr}`;
    }
  }

  saveWarehouse(): void {
    if (!this.warehouseForm.nameAr && this.unifiedWarehouseName) {
      this.onUnifiedWarehouseNameChange(this.unifiedWarehouseName);
    }

    if (!this.warehouseForm.code || (!this.warehouseForm.nameAr && !this.unifiedWarehouseName)) {
      this.errorMessage.set(this.langService.t('inventory.warehouses.alerts.warehouseValidationRequired'));
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // Resolve branch name if selected
    if (this.warehouseForm.branchId) {
      const selectedB = this.branches().find(b => b.id === this.warehouseForm.branchId);
      if (selectedB) {
        (this.warehouseForm as any).branchName = selectedB.nameAr;
      }
    }

    if (this.isEditMode() && this.editingWarehouseId()) {
      this.bwService.updateWarehouse(this.currentCompanyId, this.editingWarehouseId()!, this.warehouseForm).subscribe({
        next: (updated) => {
          this.isSubmitting.set(false);
          this.closeAddModal();
          this.showSuccess(this.langService.t('inventory.warehouses.alerts.warehouseUpdatedSuccess', { name: updated.nameAr }));
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.description || err?.error?.message || this.langService.t('inventory.warehouses.alerts.warehouseUpdateFailed'));
        }
      });
    } else {
      this.bwService.createWarehouse(this.currentCompanyId, this.warehouseForm).subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.closeAddModal();
          this.showSuccess(this.langService.t('inventory.warehouses.alerts.warehouseAddedSuccess', { name: created.nameAr }));
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const desc = err?.error?.description || err?.error?.message || this.langService.t('inventory.warehouses.alerts.warehouseSaveFailed');
          this.errorMessage.set(desc);
          if (err?.error?.code === 'License.LimitReached') {
            const limit = err.error?.limit ?? '';
            const msg = this.langService.t('companies.portal.licenseLimitReachedWarehouses').replace('{limit}', limit.toString());
            Swal.fire({
              icon: 'warning',
              title: this.langService.t('common.warning'),
              text: msg,
              confirmButtonColor: '#059669'
            });
          } else if (err?.error?.code === 'License.Expired') {
            Swal.fire({
              icon: 'warning',
              title: this.langService.t('common.warning'),
              text: this.langService.t('companies.portal.licenseExpiredNotice'),
              confirmButtonColor: '#059669'
            });
          }
        }
      });
    }
  }

  deleteWarehouse(w: WarehouseDto): void {
    if (w.isDefault) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('inventory.warehouses.alerts.cannotDeleteDefault'),
        confirmButtonText: this.langService.t('inventory.warehouses.alerts.ok'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    const whName = this.langService.currentLang() === 'ar' ? w.nameAr : (w.nameEn || w.nameAr);

    Swal.fire({
      title: this.langService.t('inventory.warehouses.alerts.confirmDeleteTitle'),
      text: this.langService.t('inventory.warehouses.alerts.confirmDeletePrompt', { name: whName }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('common.delete'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bwService.deleteWarehouse(this.currentCompanyId, w.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.langService.t('inventory.warehouses.alerts.deleteSuccessTitle'),
              text: this.langService.t('inventory.warehouses.alerts.deleteSuccessText', { name: whName }),
              timer: 3000,
              showConfirmButton: false
            });
            this.loadData();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.langService.t('inventory.warehouses.alerts.deleteFailedTitle'),
              text: err?.error?.description || err?.error?.message || this.langService.t('inventory.warehouses.alerts.deleteFailedText'),
              confirmButtonText: this.langService.t('inventory.warehouses.alerts.ok'),
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  toggleStatus(w: WarehouseDto): void {
    const nextStatus = !w.isActive;
    this.bwService.toggleWarehouseStatus(this.currentCompanyId, w.id, nextStatus).subscribe({
      next: () => {
        w.isActive = nextStatus;
        this.showSuccess(this.langService.t('inventory.warehouses.alerts.warehouseStatusUpdated', { name: w.nameAr, status: nextStatus ? (this.langService.isArabic() ? 'نشط' : 'Active') : (this.langService.isArabic() ? 'معطل' : 'Inactive') }));
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || this.langService.t('inventory.warehouses.alerts.warehouseStatusFailed'));
      }
    });
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }

  // =========================================================================
  // Accounting Posting Matrix Methods
  // =========================================================================

  openAccountingMatrixModal(w: WarehouseDto): void {
    this.matrixWarehouse.set(w);
    this.selectedPaymentMethod.set(1); // Default to Cash (نقدي)
    this.showMatrixModal.set(true);

    // 1. Ensure accounts tree is loaded for picker
    if (this.flattenedAccounts().length === 0) {
      this.coaService.loadAccountsTree(this.currentCompanyId).subscribe({
        next: (tree) => {
          const flat: AccountDto[] = [];
          const traverse = (nodes: AccountDto[]) => {
            for (const n of nodes) {
              if (n.isPostable) flat.push(n);
              if (n.subAccounts && n.subAccounts.length > 0) traverse(n.subAccounts);
            }
          };
          traverse(tree);
          this.flattenedAccounts.set(flat);
        }
      });
    }

    // 2. Load existing matrix from API
    this.loadAccountingMatrix(w.id);
  }

  loadAccountingMatrix(warehouseId: string): void {
    this.isMatrixLoading.set(true);
    this.bwService.getWarehouseAccountingMatrix(this.currentCompanyId, warehouseId).subscribe({
      next: (mappings) => {
        this.allMappings.set(mappings || []);
        this.switchPaymentMethod(this.selectedPaymentMethod());
        this.isMatrixLoading.set(false);
      },
      error: (err) => {
        this.isMatrixLoading.set(false);
        this.switchPaymentMethod(this.selectedPaymentMethod());
      }
    });
  }

  switchPaymentMethod(pm: number): void {
    this.selectedPaymentMethod.set(pm);
    const existing = this.allMappings().find(m => m.paymentMethod === pm);
    if (existing) {
      this.currentMatrix.set({ ...existing });
    } else {
      this.currentMatrix.set(this.getEmptyMatrix(pm));
    }
  }

  onAccountSelected(idKey: string, codeKey: string, nameKey: string, account: AccountDto | null): void {
    const cur = { ...this.currentMatrix() };
    (cur as any)[idKey] = account ? account.id : null;
    (cur as any)[codeKey] = account ? account.accountCode : null;
    (cur as any)[nameKey] = account ? (account.nameAr || account.nameEn) : null;
    this.currentMatrix.set(cur);
  }

  clearRowAccount(idKey: string, codeKey: string, nameKey: string): void {
    const cur = { ...this.currentMatrix() };
    (cur as any)[idKey] = null;
    (cur as any)[codeKey] = null;
    (cur as any)[nameKey] = null;
    this.currentMatrix.set(cur);
  }

  autoSuggestAccounts(): void {
    const accounts = this.flattenedAccounts();
    if (accounts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('inventory.warehouses.alerts.coaNotLoaded'),
        confirmButtonText: this.langService.t('inventory.warehouses.alerts.ok'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    const pm = this.selectedPaymentMethod();
    const cur = { ...this.currentMatrix() };

    // Find accounts helper
    const findAcc = (prefixes: string[], keywords: string[]): AccountDto | undefined => {
      // 1. Try code prefix
      for (const p of prefixes) {
        const found = accounts.find(a => a.accountCode.startsWith(p));
        if (found) return found;
      }
      // 2. Try keywords in name
      for (const k of keywords) {
        const found = accounts.find(a => (a.nameAr && a.nameAr.includes(k)) || (a.nameEn && a.nameEn.toLowerCase().includes(k.toLowerCase())));
        if (found) return found;
      }
      return undefined;
    };

    // 1. Sales Invoice Account
    let salesInvAcc: AccountDto | undefined;
    if (pm === 1) { // Cash
      salesInvAcc = findAcc(['11101', '111'], ['صندوق', 'نقد']);
    } else if (pm === 2) { // Credit
      salesInvAcc = findAcc(['11201', '112'], ['عملاء', 'مدين']);
    } else { // Card / POS
      salesInvAcc = findAcc(['11102', '11103', '111'], ['بنك', 'شبكة', 'مدى']);
    }
    if (salesInvAcc) {
      cur.salesInvoiceAccountId = salesInvAcc.id;
      cur.salesInvoiceAccountCode = salesInvAcc.accountCode;
      cur.salesInvoiceAccountName = salesInvAcc.nameAr;
    }

    // 2. Sales Revenue (4101)
    const revAcc = findAcc(['4101', '41'], ['إيراد مبيعات', 'مبيعات']);
    if (revAcc) {
      cur.salesRevenueAccountId = revAcc.id;
      cur.salesRevenueAccountCode = revAcc.accountCode;
      cur.salesRevenueAccountName = revAcc.nameAr;
    }

    // 3. COGS (5101)
    const cogsAcc = findAcc(['5101', '51'], ['تكلفة مبيعات', 'تكلفة بضاعة', 'تكلفة']);
    if (cogsAcc) {
      cur.cogsAccountId = cogsAcc.id;
      cur.cogsAccountCode = cogsAcc.accountCode;
      cur.cogsAccountName = cogsAcc.nameAr;
    }

    // 4. Inventory (11401 / 11301)
    const invAcc = findAcc(['11401', '11301', '114'], ['مخزون']);
    if (invAcc) {
      cur.inventoryAccountId = invAcc.id;
      cur.inventoryAccountCode = invAcc.accountCode;
      cur.inventoryAccountName = invAcc.nameAr;
    }

    // 5. Sales Return (4102)
    const retAcc = findAcc(['4102', '41'], ['مردود', 'مرتجع']);
    if (retAcc) {
      cur.salesReturnAccountId = retAcc.id;
      cur.salesReturnAccountCode = retAcc.accountCode;
      cur.salesReturnAccountName = retAcc.nameAr;
    }

    // 6. Advance Payment
    const advAcc = findAcc(['11101', '212'], ['دفعة مقدمة', 'عربون', 'صندوق']);
    if (advAcc) {
      cur.advancePaymentAccountId = advAcc.id;
      cur.advancePaymentAccountCode = advAcc.accountCode;
      cur.advancePaymentAccountName = advAcc.nameAr;
    }

    // 7. Discount Allowed (5105 / 4105)
    const discAcc = findAcc(['5105', '4105', '5'], ['خصم مسموح', 'خصم']);
    if (discAcc) {
      cur.discountAllowedAccountId = discAcc.id;
      cur.discountAllowedAccountCode = discAcc.accountCode;
      cur.discountAllowedAccountName = discAcc.nameAr;
    }

    // 8. Tax (21301)
    const taxAcc = findAcc(['21301', '21401', '213'], ['ضريبة', 'مخرجات']);
    if (taxAcc) {
      cur.taxAccountId = taxAcc.id;
      cur.taxAccountCode = taxAcc.accountCode;
      cur.taxAccountName = taxAcc.nameAr;
    }

    // 9. Services Revenue
    const srvRevAcc = findAcc(['4103', '41'], ['خدمات']);
    if (srvRevAcc) {
      cur.servicesRevenueAccountId = srvRevAcc.id;
      cur.servicesRevenueAccountCode = srvRevAcc.accountCode;
      cur.servicesRevenueAccountName = srvRevAcc.nameAr;
    }

    // 10. Services Cost
    const srvCostAcc = findAcc(['5102', '51'], ['تكلفة الخدمات']);
    if (srvCostAcc) {
      cur.servicesCostAccountId = srvCostAcc.id;
      cur.servicesCostAccountCode = srvCostAcc.accountCode;
      cur.servicesCostAccountName = srvCostAcc.nameAr;
    }

    // 11. Loyalty
    const loyAcc = findAcc(['21', '5'], ['ولاء', 'نقاط']);
    if (loyAcc) {
      cur.loyaltyCustomersAccountId = loyAcc.id;
      cur.loyaltyCustomersAccountCode = loyAcc.accountCode;
      cur.loyaltyCustomersAccountName = loyAcc.nameAr;
    }

    // 12. Rounding
    const rndAcc = findAcc(['5', '4'], ['تقريب', 'فروق']);
    if (rndAcc) {
      cur.roundingAccountId = rndAcc.id;
      cur.roundingAccountCode = rndAcc.accountCode;
      cur.roundingAccountName = rndAcc.nameAr;
    }

    // 13. Additional Expenses
    const addAcc = findAcc(['41', '5'], ['رسوم', 'إضافية', 'شحن']);
    if (addAcc) {
      cur.additionalExpensesAccountId = addAcc.id;
      cur.additionalExpensesAccountCode = addAcc.accountCode;
      cur.additionalExpensesAccountName = addAcc.nameAr;
    }

    // 14. Transfer Clearing
    const trfAcc = findAcc(['11409', '11309', '114'], ['بضاعة بالطريق', 'وسيط']);
    if (trfAcc) {
      cur.transferClearingAccountId = trfAcc.id;
      cur.transferClearingAccountCode = trfAcc.accountCode;
      cur.transferClearingAccountName = trfAcc.nameAr;
    }

    // 15. Adjustment Variance
    const adjAcc = findAcc(['5109', '51'], ['تسوية المخزون', 'عجز', 'زيادة', 'فروقات']);
    if (adjAcc) {
      cur.adjustmentVarianceAccountId = adjAcc.id;
      cur.adjustmentVarianceAccountCode = adjAcc.accountCode;
      cur.adjustmentVarianceAccountName = adjAcc.nameAr;
    }

    this.currentMatrix.set(cur);

    Swal.fire({
      icon: 'success',
      title: this.langService.t('inventory.warehouses.alerts.suggestSuccessTitle'),
      text: this.langService.t('inventory.warehouses.alerts.suggestSuccessText'),
      timer: 2500,
      showConfirmButton: false
    });
  }

  copyMatrix(): void {
    const cur = this.currentMatrix();
    this.copiedMatrix.set({ ...cur });
    Swal.fire({
      icon: 'success',
      title: this.langService.t('inventory.warehouses.alerts.copySuccessTitle'),
      text: this.langService.t('inventory.warehouses.alerts.copySuccessText', { pm: this.getPaymentMethodName(this.selectedPaymentMethod()) }),
      timer: 2500,
      showConfirmButton: false
    });
  }

  pasteMatrix(): void {
    const copied = this.copiedMatrix();
    if (!copied) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('inventory.warehouses.alerts.clipboardEmptyTitle'),
        text: this.langService.t('inventory.warehouses.alerts.clipboardEmptyText'),
        confirmButtonText: this.langService.t('inventory.warehouses.alerts.ok'),
        confirmButtonColor: '#059669'
      });
      return;
    }

    const curPm = this.selectedPaymentMethod();
    const pasted: WarehouseAccountMappingDto = {
      ...copied,
      paymentMethod: curPm,
      id: this.currentMatrix().id // preserve target record id if existing
    };

    // Adjust sales invoice account appropriately if target is credit vs cash
    if (curPm === 2 && copied.paymentMethod !== 2) {
      // Look for clients account
      const clientAcc = this.flattenedAccounts().find(a => a.accountCode.startsWith('11201') || a.accountCode.startsWith('112'));
      if (clientAcc) {
        pasted.salesInvoiceAccountId = clientAcc.id;
        pasted.salesInvoiceAccountCode = clientAcc.accountCode;
        pasted.salesInvoiceAccountName = clientAcc.nameAr;
      }
    } else if (curPm === 1 && copied.paymentMethod !== 1) {
      // Look for cash account
      const cashAcc = this.flattenedAccounts().find(a => a.accountCode.startsWith('11101') || a.accountCode.startsWith('111'));
      if (cashAcc) {
        pasted.salesInvoiceAccountId = cashAcc.id;
        pasted.salesInvoiceAccountCode = cashAcc.accountCode;
        pasted.salesInvoiceAccountName = cashAcc.nameAr;
      }
    } else if (curPm === 3 && copied.paymentMethod !== 3) {
      // Look for bank / pos card account
      const cardAcc = this.flattenedAccounts().find(a => a.accountCode.startsWith('11102') || a.accountCode.startsWith('111'));
      if (cardAcc) {
        pasted.salesInvoiceAccountId = cardAcc.id;
        pasted.salesInvoiceAccountCode = cardAcc.accountCode;
        pasted.salesInvoiceAccountName = cardAcc.nameAr;
      }
    }

    this.currentMatrix.set(pasted);

    Swal.fire({
      icon: 'success',
      title: this.langService.t('inventory.warehouses.alerts.pasteSuccessTitle'),
      text: this.langService.t('inventory.warehouses.alerts.pasteSuccessText', { pm: this.getPaymentMethodName(curPm) }),
      timer: 2500,
      showConfirmButton: false
    });
  }

  saveAccountingMatrix(): void {
    const wh = this.matrixWarehouse();
    if (!wh) return;

    this.isMatrixSaving.set(true);
    const pm = this.selectedPaymentMethod();
    const payload = this.currentMatrix();

    this.bwService.saveWarehouseAccountingMatrix(this.currentCompanyId, wh.id, pm, payload).subscribe({
      next: (saved) => {
        this.isMatrixSaving.set(false);
        // update local list
        const list = [...this.allMappings()];
        const idx = list.findIndex(m => m.paymentMethod === pm);
        if (idx >= 0) {
          list[idx] = saved;
        } else {
          list.push(saved);
        }
        this.allMappings.set(list);
        this.currentMatrix.set(saved);

        const whName = this.langService.currentLang() === 'ar' ? wh.nameAr : (wh.nameEn || wh.nameAr);
        Swal.fire({
          icon: 'success',
          title: this.langService.t('inventory.warehouses.alerts.saveMatrixSuccessTitle'),
          text: this.langService.t('inventory.warehouses.alerts.saveMatrixSuccessText', { whName, pm: this.getPaymentMethodName(pm) }),
          timer: 3000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.isMatrixSaving.set(false);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('inventory.warehouses.alerts.saveMatrixFailedTitle'),
          text: err?.error?.description || err?.error?.message || this.langService.t('inventory.warehouses.alerts.saveMatrixFailedText'),
          confirmButtonText: this.langService.t('inventory.warehouses.alerts.ok'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  closeMatrixModal(): void {
    this.showMatrixModal.set(false);
    this.matrixWarehouse.set(null);
  }

  getMatrixAccountId(key: string): string {
    const cur = this.currentMatrix() as any;
    return cur ? (cur[key] || '') : '';
  }

  getMatrixAccountCode(key: string): string {
    const cur = this.currentMatrix() as any;
    return cur ? (cur[key] || '') : '';
  }

  getMatrixAccountName(key: string): string {
    const cur = this.currentMatrix() as any;
    return cur ? (cur[key] || '') : '';
  }

  hasConfiguredMatrix(pm: number): boolean {
    const m = this.allMappings().find(x => x.paymentMethod === pm);
    return !!(m && (m.salesInvoiceAccountId || m.salesRevenueAccountId || m.cogsAccountId || m.inventoryAccountId));
  }

  getConfiguredAccountsCount(): number {
    const cur = this.currentMatrix() as any;
    if (!cur) return 0;
    return this.matrixRows.filter(r => !!cur[r.idKey]).length;
  }

  getPaymentMethodName(pm: number): string {
    const isAr = this.langService.currentLang() === 'ar';
    switch (pm) {
      case 1: return isAr ? 'نقداً (Cash)' : 'Cash';
      case 2: return isAr ? 'آجل (Credit)' : 'Credit';
      case 3: return isAr ? 'شبكة / مدى / بطاقة (Card / POS)' : 'Card / POS / Mada';
      default: return isAr ? 'نقداً' : 'Cash';
    }
  }

  private getEmptyMatrix(pm: number): WarehouseAccountMappingDto {
    return {
      paymentMethod: pm,
      salesInvoiceAccountId: null, salesInvoiceAccountCode: null, salesInvoiceAccountName: null,
      inventoryAccountId: null, inventoryAccountCode: null, inventoryAccountName: null,
      cogsAccountId: null, cogsAccountCode: null, cogsAccountName: null,
      salesRevenueAccountId: null, salesRevenueAccountCode: null, salesRevenueAccountName: null,
      salesReturnAccountId: null, salesReturnAccountCode: null, salesReturnAccountName: null,
      advancePaymentAccountId: null, advancePaymentAccountCode: null, advancePaymentAccountName: null,
      discountAllowedAccountId: null, discountAllowedAccountCode: null, discountAllowedAccountName: null,
      taxAccountId: null, taxAccountCode: null, taxAccountName: null,
      servicesRevenueAccountId: null, servicesRevenueAccountCode: null, servicesRevenueAccountName: null,
      servicesCostAccountId: null, servicesCostAccountCode: null, servicesCostAccountName: null,
      loyaltyCustomersAccountId: null, loyaltyCustomersAccountCode: null, loyaltyCustomersAccountName: null,
      roundingAccountId: null, roundingAccountCode: null, roundingAccountName: null,
      additionalExpensesAccountId: null, additionalExpensesAccountCode: null, additionalExpensesAccountName: null,
      transferClearingAccountId: null, transferClearingAccountCode: null, transferClearingAccountName: null,
      adjustmentVarianceAccountId: null, adjustmentVarianceAccountCode: null, adjustmentVarianceAccountName: null
    };
  }

  private getEmptyForm(): CreateWarehouseDto {
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

