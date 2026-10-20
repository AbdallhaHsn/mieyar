import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto, AccountingStandardGuidance, AccountNature, AccountType, CreateAccountRequest, FinancialStatement } from '../../../core/models/account.model';
import { CompanyContextService } from '../../../core/services/company-context.service';

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
  private fb = inject(FormBuilder);

  // Search & Filter signals
  searchQuery = signal<string>('');
  selectedTypeFilter = signal<number | null>(null);
  selectedLevelFilter = signal<number | null>(null);

  // Form for account creation
  accountForm!: FormGroup;

  // Enums for template access
  AccountType = AccountType;
  AccountNature = AccountNature;
  FinancialStatement = FinancialStatement;

  ngOnInit(): void {
    this.initForm();
    this.coaService.getStandards().subscribe();
    this.coaService.loadAccountsTree().subscribe();
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

  // Flat list of non-postable accounts for Parent selector
  availableParents = computed(() => {
    const list: AccountDto[] = [];
    this.flattenNonPostable(this.coaService.accountsTree(), list);
    return list;
  });

  toggleExpand(node: AccountDto): void {
    node.isExpanded = !node.isExpanded;
  }

  expandAll(): void {
    this.setAllExpanded(this.coaService.accountsTree(), true);
  }

  collapseAll(): void {
    this.setAllExpanded(this.coaService.accountsTree(), false);
  }

  openCreateAccount(parent?: AccountDto): void {
    this.coaService.openCreateAccountDrawer(parent);

    if (parent) {
      this.accountForm.patchValue({
        parentAccountId: parent.id,
        accountType: parent.accountType,
        accountNature: parent.accountNature,
        financialStatement: parent.financialStatement,
        isPostable: true,
        standardCode: parent.guidance?.standardCode || 'IAS 16'
      });
      // Suggest next sub-account code
      this.suggestNextCode(parent);
    } else {
      this.accountForm.reset({
        parentAccountId: '',
        accountCode: '',
        accountType: AccountType.Asset,
        accountNature: AccountNature.Debit,
        financialStatement: FinancialStatement.BalanceSheet,
        isPostable: false,
        standardCode: 'IAS 16'
      });
    }
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
    this.coaService.loadAccountsTree().subscribe();
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

  private setAllExpanded(nodes: AccountDto[], expanded: boolean): void {
    for (const node of nodes) {
      node.isExpanded = expanded;
      if (node.subAccounts?.length) {
        this.setAllExpanded(node.subAccounts, expanded);
      }
    }
  }
}
