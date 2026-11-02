import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FiscalPeriod {
  id: string;
  periodNumber: number;
  periodNameAr: string;
  periodNameEn: string;
  startDate: string;
  endDate: string;
  status: number; // 1: Open, 2: Locked, 3: Closed
  isClosingPeriod: boolean;
}

export interface FiscalYear {
  id: string;
  yearNumber: number;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
  periods: FiscalPeriod[];
}

export interface CostCenter {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  parentCostCenterId?: string;
  isActive: boolean;
  subCostCenters: CostCenter[];
}

export interface CompanyFinancialSettings {
  id: string;
  companyId: string;
  defaultCurrency: string;
  calendarType: number; // 1: Gregorian, 2: Hijri
  costCenterPolicy: number; // 1: MandatoryForPL, 2: Optional, 3: Disabled
  allowBackdatedEntries: boolean;
  maxBackdatedDays: number;
  requireApprovalForEntries: boolean;
  include13thClosingPeriod: boolean;
}

export interface FinancialSettingsOverview {
  settings: CompanyFinancialSettings;
  activeFiscalYear?: FiscalYear;
  allFiscalYears: FiscalYear[];
  costCenters: CostCenter[];
}

export interface YearEndAuditCheck {
  fiscalYearId: string;
  yearNumber: number;
  yearNameAr: string;
  startDate: string;
  endDate: string;
  isAlreadyClosed: boolean;
  canClose: boolean;
  blockingErrors: string[];
  warnings: string[];
  draftJournalEntriesCount: number;
  totalPostedJournalEntriesCount: number;
  openPeriodsCount: number;
  totalRevenuesToClose: number;
  totalExpensesToClose: number;
  projectedNetIncome: number;
  projectedNetIncomeTafqeetAr: string;
  defaultRetainedEarningsAccountId: string;
  defaultRetainedEarningsAccountCode: string;
  defaultRetainedEarningsAccountNameAr: string;
}

export interface YearEndClosingResult {
  fiscalYearId: string;
  yearNumber: number;
  closingJournalEntryId: string;
  closingJournalEntryNumber: string;
  netProfitOrLoss: number;
  netProfitOrLossTafqeetAr: string;
  totalRevenuesClosed: number;
  totalExpensesClosed: number;
  closedAtUtc: string;
  nextYearCreated: boolean;
  nextFiscalYearId?: string;
  openingJournalEntryNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialSettingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/financial-settings`;

  getOverview(companyId?: string): Observable<FinancialSettingsOverview> {
    const url = companyId ? `${this.apiUrl}?companyId=${companyId}` : this.apiUrl;
    return this.http.get<FinancialSettingsOverview>(url);
  }

  updateSettings(payload: Partial<CompanyFinancialSettings> & { companyId?: string }): Observable<CompanyFinancialSettings> {
    return this.http.put<CompanyFinancialSettings>(this.apiUrl, payload);
  }

  createFiscalYear(payload: {
    companyId?: string;
    yearNumber: number;
    nameAr: string;
    nameEn: string;
    startDate: string;
    endDate: string;
    includeClosingPeriod: boolean;
  }): Observable<FiscalYear> {
    return this.http.post<FiscalYear>(`${this.apiUrl}/fiscal-years`, payload);
  }

  togglePeriodStatus(periodId: string, status: number): Observable<FiscalPeriod> {
    return this.http.put<FiscalPeriod>(`${this.apiUrl}/periods/${periodId}/status`, { status });
  }

  createCostCenter(payload: {
    companyId?: string;
    code: string;
    nameAr: string;
    nameEn: string;
    parentCostCenterId?: string;
    description?: string;
  }): Observable<CostCenter> {
    return this.http.post<CostCenter>(`${this.apiUrl}/cost-centers`, payload);
  }

  deleteCostCenter(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cost-centers/${id}`);
  }

  getClosingPreview(fiscalYearId: string): Observable<YearEndAuditCheck> {
    return this.http.get<YearEndAuditCheck>(`${this.apiUrl}/fiscal-years/${fiscalYearId}/closing-preview`);
  }

  closeFiscalYear(fiscalYearId: string, payload: {
    retainedEarningsAccountId?: string;
    generateOpeningBalanceNextYear?: boolean;
  }): Observable<YearEndClosingResult> {
    return this.http.post<YearEndClosingResult>(`${this.apiUrl}/fiscal-years/${fiscalYearId}/close`, payload);
  }

  reopenFiscalYear(fiscalYearId: string, reason: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/fiscal-years/${fiscalYearId}/reopen`, { reason });
  }
}

