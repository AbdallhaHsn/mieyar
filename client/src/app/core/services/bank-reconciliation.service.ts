import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BankAccountSummary {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  currentLedgerBalance: number;
}

export interface BankReconciliationTransaction {
  journalEntryLineId: string;
  transactionDate: string;
  entryNumber: string;
  referenceNumber?: string;
  description: string;
  debit: number;
  credit: number;
  netAmount: number;
  isMatched: boolean;
}

export interface BankReconciliationWorkspace {
  bankAccountId: string;
  bankAccountCode: string;
  bankAccountNameAr: string;
  statementDate: string;
  bookBalance: number;
  statementEndingBalance: number;
  clearedDeposits: number;
  clearedWithdrawals: number;
  clearedBalance: number;
  difference: number;
  transactions: BankReconciliationTransaction[];
}

export interface SaveBankReconciliationRequest {
  companyId: string;
  bankAccountId: string;
  statementDate: string;
  statementEndingBalance: number;
  matchedJournalLineIds: string[];
  notes?: string;
  finalize: boolean;
}

export interface BankReconciliationResult {
  reconciliationId: string;
  reconciliationNumber: string;
  bankAccountId: string;
  bankAccountCode: string;
  bankAccountNameAr: string;
  statementDate: string;
  statementEndingBalance: number;
  bookBalance: number;
  clearedDeposits: number;
  clearedWithdrawals: number;
  difference: number;
  status: number; // 1: Draft, 2: Completed
  statusNameAr: string;
  reconciledAtUtc?: string;
  reconciledBy?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BankReconciliationService {
  private readonly baseUrl = 'http://localhost:5000/api/bank-reconciliation';

  constructor(private http: HttpClient) {}

  getAccounts(companyId?: string): Observable<BankAccountSummary[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId);
    return this.http.get<BankAccountSummary[]>(`${this.baseUrl}/accounts`, { params });
  }

  getWorkspace(
    bankAccountId: string,
    statementDate: string,
    statementEndingBalance: number = 0,
    companyId?: string
  ): Observable<BankReconciliationWorkspace> {
    let params = new HttpParams()
      .set('bankAccountId', bankAccountId)
      .set('statementDate', statementDate)
      .set('statementEndingBalance', statementEndingBalance.toString());

    if (companyId) params = params.set('companyId', companyId);

    return this.http.get<BankReconciliationWorkspace>(`${this.baseUrl}/workspace`, { params });
  }

  save(request: SaveBankReconciliationRequest): Observable<BankReconciliationResult> {
    return this.http.post<BankReconciliationResult>(this.baseUrl, request);
  }

  getHistory(companyId?: string, bankAccountId?: string): Observable<BankReconciliationResult[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId);
    if (bankAccountId) params = params.set('bankAccountId', bankAccountId);
    return this.http.get<BankReconciliationResult[]>(`${this.baseUrl}/history`, { params });
  }

  autoMatch(request: ImportBankStatementRequest): Observable<AutoMatchResultDto> {
    return this.http.post<AutoMatchResultDto>(`${this.baseUrl}/auto-match`, request);
  }
}

export interface ImportBankStatementRequest {
  companyId: string;
  bankAccountId: string;
  rawCsvOrText: string;
  statementDate?: string;
  statementEndingBalance?: number;
}

export interface AutoMatchResultDto {
  totalStatementRows: number;
  matchedRowsCount: number;
  unmatchedRowsCount: number;
  totalMatchedAmount: number;
  matchedJournalLineIds: string[];
  updatedTransactions: BankReconciliationTransaction[];
  message: string;
}
