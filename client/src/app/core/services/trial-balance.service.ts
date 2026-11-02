import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TrialBalanceAccount {
  accountId: string;
  accountCode: string;
  nameAr: string;
  nameEn: string;
  accountType: number;
  accountNature: number;
  level: number;
  parentAccountId?: string;
  isPostable: boolean;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  endingDebit: number;
  endingCredit: number;
  subAccounts: TrialBalanceAccount[];
}

export interface TrialBalanceReport {
  fromDate: string;
  toDate: string;
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalEndingDebit: number;
  totalEndingCredit: number;
  isBalanced: boolean;
  balanceDifference: number;
  totalAccountsCount: number;
  accounts: TrialBalanceAccount[];
}

@Injectable({
  providedIn: 'root'
})
export class TrialBalanceService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/trial-balance`;

  getTrialBalance(params: {
    companyId?: string;
    fromDate?: string;
    toDate?: string;
    costCenterId?: string;
    hideZeroBalances?: boolean;
    maxLevel?: number;
    searchTerm?: string;
  }): Observable<TrialBalanceReport> {
    let httpParams = new HttpParams();

    if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.costCenterId) httpParams = httpParams.set('costCenterId', params.costCenterId);
    if (params.hideZeroBalances !== undefined) httpParams = httpParams.set('hideZeroBalances', params.hideZeroBalances.toString());
    if (params.maxLevel !== undefined && params.maxLevel !== null) httpParams = httpParams.set('maxLevel', params.maxLevel.toString());
    if (params.searchTerm) httpParams = httpParams.set('searchTerm', params.searchTerm);

    return this.http.get<TrialBalanceReport>(this.baseUrl, { params: httpParams });
  }
}
