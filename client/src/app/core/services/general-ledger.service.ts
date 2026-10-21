import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GeneralLedgerAccountOverview {
  accountId: string;
  accountCode: string;
  nameAr: string;
  nameEn: string;
  accountType: number;
  accountNature: number;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  netMovement: number;
  closingBalance: number;
  transactionCount: number;
  lastActivityDate?: string;
}

export interface GeneralLedgerReport {
  accounts: GeneralLedgerAccountOverview[];
  fromDate: string;
  toDate: string;
  totalOpeningBalance: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingBalance: number;
  activeAccountsCount: number;
}

export interface AccountStatementLine {
  lineId: string;
  journalEntryId: string;
  entryNumber: string;
  entryDate: string;
  entryType: number;
  referenceNumber?: string;
  description: string;
  costCenterId?: string;
  costCenterName?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface AccountStatementAccountHeader {
  id: string;
  accountCode: string;
  nameAr: string;
  nameEn: string;
  accountType: number;
  accountNature: number;
  currencyCode: string;
  parentAccountNameAr?: string;
}

export interface AccountStatement {
  account: AccountStatementAccountHeader;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  closingBalance: number;
  transactionCount: number;
  lines: AccountStatementLine[];
}

@Injectable({
  providedIn: 'root'
})
export class GeneralLedgerService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5000/api/general-ledger';

  getOverview(params: {
    companyId?: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
    costCenterId?: string;
    includeZeroBalances?: boolean;
  }): Observable<GeneralLedgerReport> {
    let httpParams = new HttpParams();

    if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.searchTerm) httpParams = httpParams.set('searchTerm', params.searchTerm);
    if (params.costCenterId) httpParams = httpParams.set('costCenterId', params.costCenterId);
    if (params.includeZeroBalances !== undefined) httpParams = httpParams.set('includeZeroBalances', params.includeZeroBalances.toString());

    return this.http.get<GeneralLedgerReport>(`${this.baseUrl}/overview`, { params: httpParams });
  }

  getAccountStatement(
    accountId: string,
    params: {
      companyId?: string;
      fromDate?: string;
      toDate?: string;
      costCenterId?: string;
    }
  ): Observable<AccountStatement> {
    let httpParams = new HttpParams();

    if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.costCenterId) httpParams = httpParams.set('costCenterId', params.costCenterId);

    return this.http.get<AccountStatement>(`${this.baseUrl}/account-statement/${accountId}`, { params: httpParams });
  }
}
