import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface JournalEntryLine {
  id?: string;
  lineNumber?: number;
  accountId: string;
  accountCode?: string;
  accountNameAr?: string;
  accountNameEn?: string;
  debit: number;
  credit: number;
  description: string;
  costCenterId?: string;
  costCenterName?: string;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  entryNumber: string;
  entryDate: string;
  fiscalPeriodId: string;
  fiscalPeriodNameAr: string;
  fiscalPeriodNameEn: string;
  entryType: number; // 1: Daily, 2: Opening, 3: Adjustment, 4: Closing
  status: number; // 1: Draft, 2: Posted, 3: Reversed
  referenceNumber?: string;
  descriptionAr: string;
  descriptionEn: string;
  totalDebit: number;
  totalCredit: number;
  reversedEntryId?: string;
  reversalReason?: string;
  postedAtUtc?: string;
  postedBy?: string;
  createdAtUtc: string;
  createdBy?: string;
  lines: JournalEntryLine[];
}

export interface JournalEntrySummary {
  id: string;
  entryNumber: string;
  entryDate: string;
  fiscalPeriodNameAr: string;
  entryType: number;
  status: number;
  referenceNumber?: string;
  descriptionAr: string;
  descriptionEn: string;
  totalDebit: number;
  totalCredit: number;
  linesCount: number;
  postedAtUtc?: string;
  postedBy?: string;
  createdAtUtc: string;
}

export interface JournalEntryKpi {
  totalEntries: number;
  postedEntries: number;
  draftEntries: number;
  reversedEntries: number;
  totalDebitVolume: number;
  totalCreditVolume: number;
}

export interface JournalEntriesListResult {
  items: JournalEntrySummary[];
  totalCount: number;
  kpi: JournalEntryKpi;
}

export interface CreateJournalEntryRequest {
  companyId?: string;
  entryDate: string;
  entryType: number;
  descriptionAr: string;
  descriptionEn?: string;
  referenceNumber?: string;
  postImmediately: boolean;
  lines: {
    accountId: string;
    debit: number;
    credit: number;
    description: string;
    costCenterId?: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class JournalEntryService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/journal-entries';

  getList(params?: {
    companyId?: string;
    fromDate?: string;
    toDate?: string;
    status?: number;
    searchTerm?: string;
    skip?: number;
    take?: number;
  }): Observable<JournalEntriesListResult> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
      if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
      if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
      if (params.status !== undefined && params.status !== null) httpParams = httpParams.set('status', params.status.toString());
      if (params.searchTerm) httpParams = httpParams.set('searchTerm', params.searchTerm);
      if (params.skip !== undefined) httpParams = httpParams.set('skip', params.skip.toString());
      if (params.take !== undefined) httpParams = httpParams.set('take', params.take.toString());
    }
    return this.http.get<JournalEntriesListResult>(this.apiUrl, { params: httpParams });
  }

  getById(id: string): Observable<JournalEntry> {
    return this.http.get<JournalEntry>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateJournalEntryRequest): Observable<JournalEntry> {
    return this.http.post<JournalEntry>(this.apiUrl, payload);
  }

  post(id: string, postedBy?: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${id}/post`, { postedBy });
  }

  reverse(id: string, reason: string, reversedBy?: string): Observable<JournalEntry> {
    return this.http.post<JournalEntry>(`${this.apiUrl}/${id}/reverse`, { reason, reversedBy });
  }
}
