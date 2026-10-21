import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto, AccountingStandardGuidance, AccountNature, AccountType, CreateAccountRequest, FinancialStatement } from '../../../core/models/account.model';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-chart-of-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './chart-of-accounts.component.html',
  styleUrls: ['./chart-of-accounts.component.scss']
})
export class ChartOfAccountsComponent implements OnInit {
  coaService = inject(ChartOfAccountsService);
  companyContext = inject(CompanyContextService);
  langService = inject(LanguageService);
  translator = inject(AccountingTranslatorService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Global Language Reactivity bound directly to Layout Navbar
  currentLang = computed(() => this.langService.currentLang());

  // Search & Filter signals
  searchQuery = signal<string>('');
  selectedTypeFilter = signal<number | null>(null);
  selectedLevelFilter = signal<number | null>(null);

  // Reactive Tree Grouping & Expansion state (التجميع والطي والتوسيع)
  expandedIds = signal<Set<string>>(new Set());

  // Form for account creation
  accountForm!: FormGroup;

  // Enums for template access
  AccountType = AccountType;
  AccountNature = AccountNature;
  FinancialStatement = FinancialStatement;

  constructor() {
    // Automatically reload and isolate chart of accounts whenever active company changes
    effect(() => {
      const company = this.companyContext.activeCompany();
      if (company && company.id) {
        this.coaService.loadAccountsTree(company.id).subscribe(tree => {
          const initial = new Set<string>();
          this.collectInitialExpandedIds(tree, initial);
          this.expandedIds.set(initial);
        });
      }
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.coaService.getStandards().subscribe();
  }

  private initForm(): void {
    this.accountForm = this.fb.group({
      parentAccountId: [''],
      accountCode: [''],
      nameAr: ['', [Validators.required, Validators.minLength(2)]],
      nameEn: ['', [Validators.required, Validators.minLength(2)]],
      accountType: [AccountType.Asset, Validators.required],
      accountNature: [AccountNature.Debit, Validators.required],
      financialStatement: [FinancialStatement.BalanceSheet, Validators.required],
      isPostable: [true],
      standardCode: ['IAS 16'],
      description: ['']
    });

    // Listen to standard changes to update guidance panel in real-time
    this.accountForm.get('standardCode')?.valueChanges.subscribe(stdCode => {
      if (stdCode) {
        this.coaService.setGuidanceByCode(stdCode);
      }
    });

    // Auto-align Nature and Statement based on Type
    this.accountForm.get('accountType')?.valueChanges.subscribe(type => {
      const numType = Number(type);
      if (numType === AccountType.Asset || numType === AccountType.Expense) {
        this.accountForm.patchValue({ accountNature: AccountNature.Debit }, { emitEvent: false });
      } else {
        this.accountForm.patchValue({ accountNature: AccountNature.Credit }, { emitEvent: false });
      }

      if (numType === AccountType.Revenue || numType === AccountType.Expense) {
        this.accountForm.patchValue({ financialStatement: FinancialStatement.IncomeStatement }, { emitEvent: false });
      } else {
        this.accountForm.patchValue({ financialStatement: FinancialStatement.BalanceSheet }, { emitEvent: false });
      }
    });
  }

  // Filtered accounts tree computed
  filteredTree = computed(() => {
    const raw = this.coaService.accountsTree();
    const query = this.searchQuery().trim().toLowerCase();
    const typeFilter = this.selectedTypeFilter();
    const levelFilter = this.selectedLevelFilter();

    if (!query && typeFilter === null && levelFilter === null) {
      return raw;
    }

    return this.filterNodes(raw, query, typeFilter, levelFilter);
  });

  // KPI Computations
  totalAccountsCount = computed(() => {
    return this.countAllAccounts(this.coaService.accountsTree());
  });

  assetsCount = computed(() => {
    return this.countByType(this.coaService.accountsTree(), AccountType.Asset);
  });

  liabilitiesAndEquityCount = computed(() => {
    return this.countByType(this.coaService.accountsTree(), AccountType.Liability) +
           this.countByType(this.coaService.accountsTree(), AccountType.Equity);
  });

  revenueAndExpensesCount = computed(() => {
    return this.countByType(this.coaService.accountsTree(), AccountType.Revenue) +
           this.countByType(this.coaService.accountsTree(), AccountType.Expense);
  });

  postableCount = computed(() => {
    return this.countPostable(this.coaService.accountsTree());
  });

  groupAccountsCount = computed(() => {
    return Math.max(0, this.totalAccountsCount() - this.postableCount());
  });

  // Flat list of non-postable accounts for Parent selector
  availableParents = computed(() => {
    const list: AccountDto[] = [];
    this.flattenNonPostable(this.coaService.accountsTree(), list);
    return list;
  });

  isNodeExpanded(node: AccountDto): boolean {
    return this.expandedIds().has(node.id);
  }

  toggleNode(node: AccountDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.expandedIds.update(set => {
      const next = new Set(set);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }

  expandAll(): void {
    const allIds = new Set<string>();
    this.collectAllParentIds(this.coaService.accountsTree(), allIds);
    this.expandedIds.set(allIds);
  }

  collapseAll(): void {
    this.expandedIds.set(new Set<string>());
  }

  exportToCsv(): void {
    this.coaService.exportCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ChartOfAccounts_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'ar' ? 'تم التصدير بنجاح' : 'Export Successful',
          text: this.currentLang() === 'ar' ? 'تم تحميل ملف دليل الحسابات بنجاح بصيغة CSV المتوافقة مع Excel' : 'Chart of Accounts CSV downloaded successfully',
          confirmButtonColor: '#0284c7'
        });
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'ar' ? 'خطأ في التصدير' : 'Export Failed',
          text: this.currentLang() === 'ar' ? 'حدث خطأ أثناء تصدير شجرة الحسابات.' : 'Error exporting chart of accounts.',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      if (csvText) {
        this.coaService.importCsv(csvText).subscribe({
          next: (res) => {
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'ar' ? 'اكتمل الاستيراد بنجاح' : 'Import Complete',
              html: `
                <div style="text-align: right; direction: rtl; font-family: Cairo, sans-serif; line-height: 1.8;">
                  <p>✅ <strong>تم إنشاء:</strong> ${res.createdCount} حساب جديد</p>
                  <p>🔄 <strong>تم تحديث:</strong> ${res.updatedCount} حساب سابق</p>
                  ${res.errorCount > 0 ? `<p style="color: #ef4444;">⚠️ <strong>أخطاء:</strong> ${res.errorCount}</p>` : ''}
                </div>
              `,
              confirmButtonColor: '#10b981'
            });
            this.coaService.loadAccountsTree().subscribe();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'ar' ? 'فشل الاستيراد' : 'Import Failed',
              text: err.error?.description || 'فشل في استيراد البيانات من ملف CSV.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  openCreateAccount(parent?: AccountDto): void {
    if (parent) {
      this.router.navigate(['/accounting/chart-of-accounts/create'], {
        queryParams: { parentId: parent.id }
      });
    } else {
      this.router.navigate(['/accounting/chart-of-accounts/create']);
    }
  }

  renameAccount(node: AccountDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const isEn = this.currentLang() === 'en';

    Swal.fire({
      title: isEn ? 'Edit / Rename Account' : 'تعديل وإعادة تسمية الحساب',
      html: `
        <div style="font-family: inherit; text-align: right; direction: ${isEn ? 'ltr' : 'rtl'}; padding: 0.25rem 0;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 0.5rem 0.8rem; border-radius: 8px; margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-family: monospace; color: #0284C7; font-size: 0.95rem;">${node.accountCode}</span>
            <span style="font-size: 0.75rem; color: #64748B;">${isEn ? 'Level ' + node.level : 'المستوى ' + node.level}</span>
          </div>

          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.25rem;">
            ${isEn ? 'Account Name (Arabic):' : 'اسم الحساب باللغة العربية:'}
          </label>
          <input 
            id="swal-name-ar" 
            class="swal2-input" 
            style="width: 100%; margin: 0 0 0.75rem 0; font-size: 0.875rem; height: 38px; border-radius: 6px; box-sizing: border-box;" 
            value="${node.nameAr || ''}" 
            placeholder="الاسم بالعربية..."
          />

          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.25rem;">
            ${isEn ? 'Account Name (English):' : 'اسم الحساب باللغة الإنجليزية:'}
          </label>
          <input 
            id="swal-name-en" 
            class="swal2-input" 
            style="width: 100%; margin: 0 0 0.75rem 0; font-size: 0.875rem; height: 38px; border-radius: 6px; box-sizing: border-box;" 
            value="${node.nameEn || ''}" 
            placeholder="Account Name in English..." 
            dir="ltr"
          />

          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 0.25rem;">
            ${isEn ? 'Description / Notes (Optional):' : 'ملاحظات وتوجيه (اختياري):'}
          </label>
          <textarea 
            id="swal-desc" 
            class="swal2-textarea" 
            style="width: 100%; margin: 0; font-size: 0.825rem; height: 55px; border-radius: 6px; box-sizing: border-box; resize: none;" 
            placeholder="${isEn ? 'Notes...' : 'شرح أو ملاحظات توجيهية...'}"
          >${node.description || ''}</textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#64748B',
      confirmButtonText: isEn ? 'Save Changes' : 'حفظ التعديلات',
      cancelButtonText: isEn ? 'Cancel' : 'إلغاء',
      focusConfirm: false,
      didOpen: () => {
        const arInput = document.getElementById('swal-name-ar') as HTMLInputElement;
        const enInput = document.getElementById('swal-name-en') as HTMLInputElement;

        if (arInput && enInput) {
          arInput.addEventListener('blur', () => {
            if (arInput.value.trim() && !enInput.value.trim()) {
              enInput.value = this.translator.translateArabicToEnglish(arInput.value.trim());
            }
          });
        }
      },
      preConfirm: () => {
        const nameAr = (document.getElementById('swal-name-ar') as HTMLInputElement)?.value?.trim();
        const nameEn = (document.getElementById('swal-name-en') as HTMLInputElement)?.value?.trim();
        const description = (document.getElementById('swal-desc') as HTMLTextAreaElement)?.value?.trim();

        if (!nameAr) {
          Swal.showValidationMessage(isEn ? 'Arabic name is required' : 'يرجى إدخال اسم الحساب بالعربية');
          return false;
        }
        if (!nameEn) {
          Swal.showValidationMessage(isEn ? 'English name is required' : 'يرجى إدخال اسم الحساب بالإنجليزية');
          return false;
        }

        return { nameAr, nameEn, description };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { nameAr, nameEn, description } = result.value;
        this.coaService.updateAccount(node.id, {
          nameAr,
          nameEn,
          description: description || undefined,
          isActive: node.isActive
        }).subscribe({
          next: () => {
            Swal.fire({
              title: isEn ? 'Updated Successfully' : 'تم تعديل الحساب بنجاح',
              text: isEn ? `Account (${node.accountCode}) details have been updated.` : `تم حفظ وتعديل مسميات الحساب (${node.accountCode}) بنجاح.`,
              icon: 'success',
              confirmButtonColor: '#059669',
              confirmButtonText: isEn ? 'OK' : 'حسناً',
              timer: 1800,
              timerProgressBar: true
            });
          },
          error: (err) => {
            const msg = err.error?.description || (isEn ? 'Failed to update account.' : 'تعذر تحديث بيانات الحساب.');
            Swal.fire({
              title: isEn ? 'Update Error' : 'خطأ أثناء التعديل',
              text: msg,
              icon: 'error',
              confirmButtonColor: '#059669',
              confirmButtonText: isEn ? 'OK' : 'موافق'
            });
          }
        });
      }
    });
  }

  deleteAccount(node: AccountDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const isEn = this.currentLang() === 'en';

    // Rule 1: Root accounts protection
    if (node.level === 1) {
      Swal.fire({
        title: isEn ? 'Protected Root Account' : 'حساب رئيسي جذري محمي',
        text: isEn 
          ? 'Level 1 root categories (Assets, Liabilities, Equity, Revenues, Expenses) cannot be deleted as they form the foundational architecture of the General Ledger.'
          : 'الحسابات الجذرية للمستوى الأول (مثل الأصول، الخصوم، حقوق الملكية، الإيرادات، المصروفات) تمثل الهيكل الأساسي للنظام المحاسبي ولا يمكن حذفها للحفاظ على التوازن المالي.',
        icon: 'info',
        confirmButtonColor: '#059669',
        confirmButtonText: isEn ? 'Understood' : 'حسناً، مفهوم'
      });
      return;
    }

    // Rule 2: Account has children
    if (node.hasChildren || (node.subAccounts && node.subAccounts.length > 0)) {
      const count = node.subAccounts ? node.subAccounts.length : 0;
      Swal.fire({
        title: isEn ? 'Cannot Delete Group Account' : 'لا يمكن حذف الحساب حالياً',
        html: `
          <div style="font-family: inherit; text-align: center; padding: 0.5rem 0;">
            <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">
              ${node.accountCode} - ${isEn ? (node.nameEn || node.nameAr) : node.nameAr}
            </div>
            <p style="color: #475569; font-size: 0.85rem; line-height: 1.6; margin: 0;">
              ${isEn 
                ? `This is a group account containing <b>${count}</b> sub-account(s). To delete it, you must first delete or reassign all its dependent sub-accounts.`
                : `هذا الحساب تجميعي يحتوي على <b>${count}</b> حسابات فرعية تابعة له.<br><br>لحذف هذا الحساب، يرجى حذف كافة الحسابات الفرعية التابعة له أولاً ثم تكرار العملية.`}
            </p>
          </div>
        `,
        icon: 'warning',
        confirmButtonColor: '#0284c7',
        confirmButtonText: isEn ? 'OK, Understood' : 'حسناً، فهمت'
      });
      return;
    }

    // Rule 3: Valid to delete (leaf or empty group)
    Swal.fire({
      title: isEn ? 'Delete Account?' : 'هل أنت متأكد من حذف الحساب؟',
      html: `
        <div style="font-family: inherit; text-align: center; padding: 0.5rem 0;">
          <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.4rem;">
            ${node.accountCode} - ${isEn ? (node.nameEn || node.nameAr) : node.nameAr}
          </div>
          <p style="color: #ef4444; font-size: 0.85rem; margin: 0; font-weight: 600;">
            ${isEn ? 'This action is permanent and cannot be undone.' : 'هذا الإجراء نهائي ولا يمكن التراجع عنه.'}
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, Delete Permanently' : 'نعم، حذف الحساب نهائياً',
      cancelButtonText: isEn ? 'Cancel' : 'إلغاء',
      reverseButtons: true,
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.coaService.deleteAccount(node.id).subscribe({
          next: () => {
            Swal.fire({
              title: isEn ? 'Deleted Successfully' : 'تم الحذف بنجاح',
              text: isEn ? `Account (${node.accountCode}) has been removed.` : `تم حذف الحساب (${node.accountCode} - ${node.nameAr}) من شجرة الحسابات بنجاح.`,
              icon: 'success',
              confirmButtonColor: '#059669',
              confirmButtonText: isEn ? 'OK' : 'حسناً',
              timer: 2000,
              timerProgressBar: true
            });
          },
          error: (err) => {
            const msg = err.error?.description || (isEn ? 'Could not delete account. Make sure it has no dependent sub-accounts.' : 'تعذر حذف الحساب. يرجى التأكد من عدم وجود حسابات فرعية تابعة له.');
            Swal.fire({
              title: isEn ? 'Cannot Delete Account' : 'تعذر حذف الحساب',
              text: msg,
              icon: 'error',
              confirmButtonColor: '#059669',
              confirmButtonText: isEn ? 'OK' : 'موافق'
            });
          }
        });
      }
    });
  }

  openInspectGuidance(account: AccountDto): void {
    this.coaService.openGuidanceDrawer(account);
  }

  onParentChange(parentId: string): void {
    if (!parentId) return;
    const parent = this.availableParents().find(p => p.id === parentId);
    if (parent) {
      this.suggestNextCode(parent);
      if (parent.guidance) {
        this.coaService.activeGuidance.set(parent.guidance);
        this.accountForm.patchValue({ standardCode: parent.guidance.standardCode });
      }
    }
  }

  selectStandard(std: AccountingStandardGuidance): void {
    this.coaService.activeGuidance.set(std);
    this.accountForm.patchValue({ standardCode: std.standardCode });
  }

  onSubmitAccount(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    const val = this.accountForm.value;
    const req: CreateAccountRequest = {
      parentAccountId: val.parentAccountId || undefined,
      accountCode: val.accountCode ? val.accountCode.trim() : undefined,
      nameAr: val.nameAr.trim(),
      nameEn: val.nameEn.trim(),
      isPostable: !!val.isPostable,
      standardCode: val.standardCode || undefined,
      accountType: Number(val.accountType),
      accountNature: Number(val.accountNature),
      financialStatement: Number(val.financialStatement),
      description: val.description ? val.description.trim() : undefined
    };

    this.coaService.createAccount(req).subscribe({
      next: () => {
        this.accountForm.reset();
      }
    });
  }

  closeDrawer(): void {
    this.coaService.closeDrawer();
  }

  refresh(): void {
    this.coaService.loadAccountsTree().subscribe(tree => {
      if (this.expandedIds().size === 0) {
        const initial = new Set<string>();
        this.collectInitialExpandedIds(tree, initial);
        this.expandedIds.set(initial);
      }
    });
  }

  private suggestNextCode(parent: AccountDto): void {
    const siblings = parent.subAccounts || [];
    const nextNum = siblings.length + 1;
    let suggested = '';

    if (parent.level === 1) {
      suggested = `${parent.accountCode}${nextNum}`;
    } else if (parent.level === 2) {
      suggested = `${parent.accountCode}${nextNum}`;
    } else {
      suggested = `${parent.accountCode}${nextNum.toString().padStart(2, '0')}`;
    }

    this.accountForm.patchValue({ accountCode: suggested });
  }

  private filterNodes(
    nodes: AccountDto[],
    query: string,
    typeFilter: number | null,
    levelFilter: number | null
  ): AccountDto[] {
    const result: AccountDto[] = [];

    for (const node of nodes) {
      const matchQuery = !query ||
        node.accountCode.toLowerCase().includes(query) ||
        node.nameAr.toLowerCase().includes(query) ||
        node.nameEn.toLowerCase().includes(query);

      const matchType = typeFilter === null || node.accountType === typeFilter;
      const matchLevel = levelFilter === null || node.level === levelFilter;

      const subMatches = node.subAccounts ? this.filterNodes(node.subAccounts, query, typeFilter, levelFilter) : [];

      if ((matchQuery && matchType && matchLevel) || subMatches.length > 0) {
        result.push({
          ...node,
          isExpanded: query.length > 0 ? true : node.isExpanded,
          subAccounts: subMatches
        });
      }
    }

    return result;
  }

  private countAllAccounts(nodes: AccountDto[]): number {
    let count = 0;
    for (const node of nodes) {
      count++;
      if (node.subAccounts?.length) {
        count += this.countAllAccounts(node.subAccounts);
      }
    }
    return count;
  }

  private countByType(nodes: AccountDto[], type: AccountType): number {
    let count = 0;
    for (const node of nodes) {
      if (node.accountType === type) count++;
      if (node.subAccounts?.length) {
        count += this.countByType(node.subAccounts, type);
      }
    }
    return count;
  }

  private countPostable(nodes: AccountDto[]): number {
    let count = 0;
    for (const node of nodes) {
      if (node.isPostable) count++;
      if (node.subAccounts?.length) {
        count += this.countPostable(node.subAccounts);
      }
    }
    return count;
  }

  private flattenNonPostable(nodes: AccountDto[], list: AccountDto[]): void {
    for (const node of nodes) {
      if (!node.isPostable) {
        list.push(node);
      }
      if (node.subAccounts?.length) {
        this.flattenNonPostable(node.subAccounts, list);
      }
    }
  }

  private collectAllParentIds(nodes: AccountDto[], set: Set<string>): void {
    for (const node of nodes) {
      if (node.hasChildren || (node.subAccounts && node.subAccounts.length > 0)) {
        set.add(node.id);
        if (node.subAccounts && node.subAccounts.length > 0) {
          this.collectAllParentIds(node.subAccounts, set);
        }
      }
    }
  }

  private collectInitialExpandedIds(nodes: AccountDto[], set: Set<string>): void {
    for (const node of nodes) {
      if (node.level <= 2 && (node.hasChildren || (node.subAccounts && node.subAccounts.length > 0))) {
        set.add(node.id);
        if (node.subAccounts && node.subAccounts.length > 0) {
          this.collectInitialExpandedIds(node.subAccounts, set);
        }
      }
    }
  }
}
