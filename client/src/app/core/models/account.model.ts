export interface SampleJournalEntryLeg {
  accountSide: 'Debit' | 'Credit';
  accountNameAr: string;
  accountNameEn: string;
  explanationAr: string;
}

export interface SampleJournalEntry {
  transactionTitleAr: string;
  transactionTitleEn: string;
  scenarioDescriptionAr: string;
  legs: SampleJournalEntryLeg[];
}

export interface AccountingStandardGuidance {
  standardCode: string;
  standardTitleAr: string;
  standardTitleEn: string;
  recognitionCriteriaAr: string;
  debitRuleAr: string;
  creditRuleAr: string;
  zatcaTaxImpactAr: string;
  typicalJournalEntries: SampleJournalEntry[];
}

export enum AccountType {
  Asset = 1,
  Liability = 2,
  Equity = 3,
  Revenue = 4,
  Expense = 5
}

export enum AccountNature {
  Debit = 1,
  Credit = 2
}

export enum FinancialStatement {
  BalanceSheet = 1,
  IncomeStatement = 2
}

export interface AccountDto {
  id: string;
  companyId: string;
  accountCode: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  parentAccountId?: string;
  parentAccountCode?: string;
  parentAccountName?: string;
  level: number;
  accountType: AccountType;
  accountTypeNameAr: string;
  accountNature: AccountNature;
  accountNatureNameAr: string;
  financialStatement: FinancialStatement;
  financialStatementNameAr: string;
  isPostable: boolean;
  isActive: boolean;
  currencyCode: string;
  currentBalance: number;
  guidance?: AccountingStandardGuidance;
  subAccounts: AccountDto[];
  hasChildren: boolean;
  
  // UI State helper
  isExpanded?: boolean;
}

export interface CreateAccountRequest {
  companyId?: string;
  parentAccountId?: string;
  accountCode?: string;
  nameAr: string;
  nameEn: string;
  isPostable: boolean;
  standardCode?: string;
  accountType?: AccountType;
  accountNature?: AccountNature;
  financialStatement?: FinancialStatement;
  description?: string;
}
