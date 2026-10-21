import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FinancialStatementItem {
  accountId: string;
  accountCode: string;
  nameAr: string;
  nameEn: string;
  level: number;
  isPostable: boolean;
  amount: number;
  comparativeAmount?: number;
  percentage: number;
  subItems?: FinancialStatementItem[];
}

export interface FinancialStatementSection {
  code: string;
  titleAr: string;
  titleEn: string;
  totalAmount: number;
  comparativeTotalAmount?: number;
  percentage: number;
  items: FinancialStatementItem[];
}

export interface IncomeStatementReport {
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  commercialRegistration?: string;
  taxNumber?: string;
  fromDate: string;
  toDate: string;
  currency: string;
  presentationFormat: string;
  costCenterId?: string;
  costCenterName?: string;
  maxLevel?: number;
  hideZeroBalances: boolean;

  operatingRevenues: FinancialStatementSection;
  costOfSales: FinancialStatementSection;
  grossProfit: number;
  comparativeGrossProfit?: number;
  grossMarginPercentage: number;

  sellingExpenses: FinancialStatementSection;
  generalAdminExpenses: FinancialStatementSection;
  totalOperatingExpenses: number;
  operatingProfit: number;
  comparativeOperatingProfit?: number;
  operatingMarginPercentage: number;

  otherIncome: FinancialStatementSection;
  financeAndZakatCosts: FinancialStatementSection;
  totalOtherExpenses: number;

  netProfitBeforeZakat: number;
  netProfitOrLoss: number;
  comparativeNetProfitOrLoss?: number;
  netMarginPercentage: number;
  isProfit: boolean;
  netProfitTafqeetAr: string;
  generatedAtUtc: string;
}

export interface BalanceSheetReport {
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  commercialRegistration?: string;
  taxNumber?: string;
  asOfDate: string;
  currency: string;
  costCenterId?: string;
  costCenterName?: string;
  maxLevel?: number;
  hideZeroBalances: boolean;

  currentAssets: FinancialStatementSection;
  nonCurrentAssets: FinancialStatementSection;
  totalAssets: number;
  comparativeTotalAssets?: number;

  currentLiabilities: FinancialStatementSection;
  nonCurrentLiabilities: FinancialStatementSection;
  totalLiabilities: number;
  comparativeTotalLiabilities?: number;

  equityItems: FinancialStatementSection;
  currentPeriodNetIncome: number;
  totalEquity: number;
  comparativeTotalEquity?: number;

  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  balanceDifference: number;

  workingCapital: number;
  currentRatio: number;
  debtToEquityRatio: number;
  totalAssetsTafqeetAr: string;
  generatedAtUtc: string;
}

export interface CashFlowStatementReport {
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  commercialRegistration?: string;
  taxNumber?: string;
  fromDate: string;
  toDate: string;
  currency: string;
  cashFlowMethod: string;
  costCenterId?: string;
  costCenterName?: string;
  hideZeroBalances: boolean;

  startingNetProfitOrLoss: number;
  nonCashAdjustments: FinancialStatementSection;
  operatingProfitBeforeWorkingCapitalChanges: number;
  workingCapitalChanges: FinancialStatementSection;
  netCashFromOperatingActivities: number;
  comparativeNetCashFromOperatingActivities?: number;

  investingActivities: FinancialStatementSection;
  netCashFromInvestingActivities: number;
  comparativeNetCashFromInvestingActivities?: number;

  financingActivities: FinancialStatementSection;
  netCashFromFinancingActivities: number;
  comparativeNetCashFromFinancingActivities?: number;

  netChangeInCashAndEquivalents: number;
  cashAtBeginningOfPeriod: number;
  cashAtEndOfPeriod: number;
  actualCashBalanceInGeneralLedger: number;
  isReconciled: boolean;
  reconciliationDifference: number;
  netCashTafqeetAr: string;
  generatedAtUtc: string;
}

export interface FinancialStatementSettings {
  id?: string;
  companyId?: string;
  incomeStatementFormat: string; // 'multi-step' | 'single-step'
  defaultHideZeroBalances: boolean;
  defaultLevelDepth: number | null;
  retainedEarningsAccountCode: string;
  showComparativePeriod: boolean;
  showSignaturesBlock: boolean;
  decimalPlaces: number;
  accountingBasis: string;
  allowDraftSimulation: boolean;
  cashFlowMethod?: string;
  cashAccountPrefix?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialStatementsService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5000/api/financial-statements';

  getIncomeStatement(params: {
    companyId?: string;
    fromDate?: string;
    toDate?: string;
    costCenterId?: string;
    maxLevel?: number | null;
    hideZeroBalances?: boolean;
    presentationFormat?: string;
  }): Observable<IncomeStatementReport> {
    let httpParams = new HttpParams();
    if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.costCenterId) httpParams = httpParams.set('costCenterId', params.costCenterId);
    if (params.maxLevel !== undefined && params.maxLevel !== null) httpParams = httpParams.set('maxLevel', params.maxLevel.toString());
    if (params.hideZeroBalances !== undefined) httpParams = httpParams.set('hideZeroBalances', params.hideZeroBalances.toString());
    if (params.presentationFormat) httpParams = httpParams.set('presentationFormat', params.presentationFormat);

    return this.http.get<IncomeStatementReport>(`${this.baseUrl}/income-statement`, { params: httpParams });
  }

  getBalanceSheet(params: {
    companyId?: string;
    asOfDate?: string;
    costCenterId?: string;
    maxLevel?: number | null;
    hideZeroBalances?: boolean;
  }): Observable<BalanceSheetReport> {
    let httpParams = new HttpParams();
    if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
    if (params.asOfDate) httpParams = httpParams.set('asOfDate', params.asOfDate);
    if (params.costCenterId) httpParams = httpParams.set('costCenterId', params.costCenterId);
    if (params.maxLevel !== undefined && params.maxLevel !== null) httpParams = httpParams.set('maxLevel', params.maxLevel.toString());
    if (params.hideZeroBalances !== undefined) httpParams = httpParams.set('hideZeroBalances', params.hideZeroBalances.toString());

    return this.http.get<BalanceSheetReport>(`${this.baseUrl}/balance-sheet`, { params: httpParams });
  }

  getCashFlowStatement(params: {
    companyId?: string;
    fromDate?: string;
    toDate?: string;
    costCenterId?: string;
    hideZeroBalances?: boolean;
    method?: string;
  }): Observable<CashFlowStatementReport> {
    let httpParams = new HttpParams();
    if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.costCenterId) httpParams = httpParams.set('costCenterId', params.costCenterId);
    if (params.hideZeroBalances !== undefined) httpParams = httpParams.set('hideZeroBalances', params.hideZeroBalances.toString());
    if (params.method) httpParams = httpParams.set('method', params.method);

    return this.http.get<CashFlowStatementReport>(`${this.baseUrl}/cash-flow`, { params: httpParams });
  }

  getSettings(companyId?: string): Observable<FinancialStatementSettings> {
    let httpParams = new HttpParams();
    if (companyId) httpParams = httpParams.set('companyId', companyId);
    return this.http.get<FinancialStatementSettings>(`${this.baseUrl}/settings`, { params: httpParams });
  }

  updateSettings(settings: FinancialStatementSettings): Observable<FinancialStatementSettings> {
    return this.http.put<FinancialStatementSettings>(`${this.baseUrl}/settings`, settings);
  }

  getEquityStatement(params: {
    companyId?: string;
    fromDate?: string;
    toDate?: string;
  }): Observable<EquityStatementReport> {
    let httpParams = new HttpParams();
    if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);

    return this.http.get<EquityStatementReport>(`${this.baseUrl}/equity-statement`, { params: httpParams });
  }

  getZatcaVatReturn(params: {
    companyId?: string;
    fromDate?: string;
    toDate?: string;
    adjustments?: number;
  }): Observable<ZatcaVatReturn> {
    let httpParams = new HttpParams();
    if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.adjustments !== undefined) httpParams = httpParams.set('adjustments', params.adjustments.toString());

    return this.http.get<ZatcaVatReturn>(`${this.baseUrl}/vat-return`, { params: httpParams });
  }
}

export interface EquityStatementRow {
  activityAr: string;
  activityEn: string;
  shareCapital: number;
  statutoryReserve: number;
  retainedEarnings: number;
  currentYearProfit: number;
  totalEquity: number;
  isBold?: boolean;
}

export interface EquityStatementReport {
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  commercialRegistration?: string;
  taxNumber?: string;
  fromDate: string;
  toDate: string;
  currency: string;
  rows: EquityStatementRow[];
  endingTotalEquity: number;
  endingEquityTafqeetAr: string;
  generatedAtUtc: string;
}

export interface VatBox {
  boxNumber: number;
  titleAr: string;
  titleEn: string;
  amount: number;
  adjustment: number;
  vatAmount: number;
}

export interface ZatcaVatReturn {
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  commercialRegistration?: string;
  taxNumber: string;
  vatRegistrationNumber: string;
  taxPeriod: string;
  fromDate: string;
  toDate: string;
  currency: string;

  standardRatedSales: VatBox;
  specialSalesToGcc: VatBox;
  zeroRatedSales: VatBox;
  exemptSales: VatBox;
  totalSales: VatBox;

  standardRatedPurchases: VatBox;
  customsImports: VatBox;
  reverseChargeImports: VatBox;
  zeroRatedPurchases: VatBox;
  exemptPurchases: VatBox;
  totalPurchases: VatBox;

  totalVatDue: number;
  totalVatDeductible: number;
  netVatDue: number;
  adjustmentsFromPrevious: number;
  netVatPayableOrRefundable: number;
  isRefundable: boolean;
  netVatTafqeetAr: string;
  generatedAtUtc: string;
}
