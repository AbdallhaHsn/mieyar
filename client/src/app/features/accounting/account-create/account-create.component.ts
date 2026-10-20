import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto, AccountingStandardGuidance, AccountNature, AccountType, CreateAccountRequest, FinancialStatement } from '../../../core/models/account.model';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';

@Component({
  selector: 'app-account-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './account-create.component.html',
  styleUrls: ['./account-create.component.scss']
})
export class AccountCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  coaService = inject(ChartOfAccountsService);
  companyContext = inject(CompanyContextService);
  translator = inject(AccountingTranslatorService);

  accountForm!: FormGroup;
  isSaving = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Auto-translate bidirectional toggle
  isAutoTranslateEnabled = signal<boolean>(true);
  private isTranslating = false;

  // Active guidance displayed in the side panel
  selectedGuidance = signal<AccountingStandardGuidance | null>(null);

  // Calculated Level
  calculatedLevel = signal<number>(1);

  // Enums for template
  AccountType = AccountType;
  AccountNature = AccountNature;
  FinancialStatement = FinancialStatement;

  // Flattened list of available parent accounts
  availableParents = computed(() => {
    const list: AccountDto[] = [];
    this.flattenNonPostable(this.coaService.accountsTree(), list);
    return list;
  });

  ngOnInit(): void {
    this.initForm();

    // Ensure standards and accounts tree are loaded
    this.coaService.getStandards().subscribe(standards => {
      if (standards.length > 0 && !this.selectedGuidance()) {
        this.selectedGuidance.set(standards[0]);
      }
    });

    this.coaService.loadAccountsTree().subscribe(() => {
      // Check query param for parentId if navigated from "+ إضافة فرعي"
      this.route.queryParams.subscribe(params => {
        const parentId = params['parentId'];
        if (parentId) {
          this.applyParent(parentId);
        }
      });
    });
  }

  private initForm(): void {
    this.accountForm = this.fb.group({
      parentAccountId: [''],
      accountCode: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      nameAr: ['', [Validators.required, Validators.minLength(2)]],
      nameEn: ['', [Validators.required, Validators.minLength(2)]],
      accountType: [AccountType.Asset, Validators.required],
      accountNature: [AccountNature.Debit, Validators.required],
      financialStatement: [FinancialStatement.BalanceSheet, Validators.required],
      isPostable: [true],
      standardCode: ['IAS 16', Validators.required],
      currencyCode: ['SAR', Validators.required],
      description: [''],
      isCostCenterRequired: [false]
    });

    // 1. Bi-directional auto-translation between Arabic and English names
    this.setupBiDirectionalTranslation();

    // 2. Auto-update guidance when standard code changes
    this.accountForm.get('standardCode')?.valueChanges.subscribe(stdCode => {
      if (stdCode) {
        const found = this.coaService.standards().find(s => s.standardCode === stdCode);
        if (found) {
          this.selectedGuidance.set(found);
        }
      }
    });

    // 3. When accountType changes, auto-align default nature and financial statement
    this.accountForm.get('accountType')?.valueChanges.subscribe(typeVal => {
      const type = Number(typeVal);
      if (type === AccountType.Asset || type === AccountType.Expense) {
        this.accountForm.patchValue({ accountNature: AccountNature.Debit }, { emitEvent: false });
      } else {
        this.accountForm.patchValue({ accountNature: AccountNature.Credit }, { emitEvent: false });
      }

      if (type === AccountType.Revenue || type === AccountType.Expense) {
        this.accountForm.patchValue({ financialStatement: FinancialStatement.IncomeStatement }, { emitEvent: false });
      } else {
        this.accountForm.patchValue({ financialStatement: FinancialStatement.BalanceSheet }, { emitEvent: false });
      }

      // Pick default matching standard
      this.autoSelectStandardForType(type);
    });
  }

  private setupBiDirectionalTranslation(): void {
    // When Arabic Name changes -> auto translate to English
    this.accountForm.get('nameAr')?.valueChanges.subscribe(arText => {
      if (!this.isAutoTranslateEnabled() || this.isTranslating) return;

      if (!arText || !arText.trim()) {
        this.isTranslating = true;
        this.accountForm.patchValue({ nameEn: '' }, { emitEvent: false });
        this.isTranslating = false;
        return;
      }

      const enTranslation = this.translator.translateArabicToEnglish(arText);
      this.isTranslating = true;
      this.accountForm.patchValue({ nameEn: enTranslation }, { emitEvent: false });
      this.isTranslating = false;
    });

    // When English Name changes -> auto translate to Arabic
    this.accountForm.get('nameEn')?.valueChanges.subscribe(enText => {
      if (!this.isAutoTranslateEnabled() || this.isTranslating) return;

      if (!enText || !enText.trim()) {
        this.isTranslating = true;
        this.accountForm.patchValue({ nameAr: '' }, { emitEvent: false });
        this.isTranslating = false;
        return;
      }

      const arTranslation = this.translator.translateEnglishToArabic(enText);
      this.isTranslating = true;
      this.accountForm.patchValue({ nameAr: arTranslation }, { emitEvent: false });
      this.isTranslating = false;
    });
  }

  toggleAutoTranslate(): void {
    this.isAutoTranslateEnabled.set(!this.isAutoTranslateEnabled());
  }

  onParentSelected(parentId: string): void {
    if (!parentId) {
      this.calculatedLevel.set(1);
      this.accountForm.patchValue({
        isPostable: false,
        accountCode: ''
      });
      return;
    }

    this.applyParent(parentId);
  }

  setAccountCategory(type: AccountType): void {
    this.accountForm.patchValue({ accountType: type });
  }

  private applyParent(parentId: string): void {
    const parent = this.availableParents().find(p => p.id === parentId);
    if (!parent) return;

    this.calculatedLevel.set(parent.level + 1);

    this.accountForm.patchValue({
      parentAccountId: parent.id,
      accountType: parent.accountType,
      accountNature: parent.accountNature,
      financialStatement: parent.financialStatement,
      isPostable: true,
      standardCode: parent.guidance?.standardCode || this.accountForm.get('standardCode')?.value
    });

    // Suggest next sub-account code
    this.suggestNextCode(parent);

    if (parent.guidance) {
      this.selectedGuidance.set(parent.guidance);
    }
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

  selectStandard(std: AccountingStandardGuidance): void {
    this.selectedGuidance.set(std);
    this.accountForm.patchValue({ standardCode: std.standardCode });
  }

  private autoSelectStandardForType(type: AccountType): void {
    const standards = this.coaService.standards();
    if (standards.length === 0) return;

    let targetCode = 'IAS 16';
    switch (type) {
      case AccountType.Asset: targetCode = 'IAS 16'; break;
      case AccountType.Liability: targetCode = 'IFRS 9'; break;
      case AccountType.Equity: targetCode = 'IAS 1'; break;
      case AccountType.Revenue: targetCode = 'IFRS 15'; break;
      case AccountType.Expense: targetCode = 'IAS 1'; break;
    }

    const std = standards.find(s => s.standardCode === targetCode);
    if (std) {
      this.selectStandard(std);
    }
  }

  onSubmit(createAnother: boolean = false): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      this.errorMessage.set('يرجى استكمال الحقول المطلوبة والتأكد من صحة رمز الحساب والاسم.');
      return;
    }

    this.isSaving.set(true);
    const val = this.accountForm.value;

    const request: CreateAccountRequest = {
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

    this.coaService.createAccount(request).subscribe({
      next: (created) => {
        this.isSaving.set(false);
        this.successMessage.set(`تم حفظ الحساب (${created.accountCode} - ${created.nameAr}) بنجاح.`);

        if (createAnother) {
          const currentParentId = val.parentAccountId;
          this.isTranslating = true;
          this.accountForm.patchValue({
            nameAr: '',
            nameEn: '',
            description: ''
          });
          this.isTranslating = false;

          if (currentParentId) {
            this.applyParent(currentParentId);
          } else {
            this.accountForm.patchValue({ accountCode: '' });
          }
        } else {
          setTimeout(() => {
            this.router.navigate(['/accounting/chart-of-accounts']);
          }, 800);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.description || 'حدث خطأ أثناء حفظ الحساب في قاعدة البيانات.';
        this.errorMessage.set(msg);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/accounting/chart-of-accounts']);
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
}
