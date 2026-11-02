import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum VoucherType {
  Receipt = 1,
  Payment = 2
}

export enum PaymentMethod {
  Cash = 1,
  BankTransfer = 2,
  Cheque = 3,
  Card = 4
}

export enum VoucherStatus {
  Draft = 1,
  Posted = 2,
  Cancelled = 3
}

export interface VoucherLineDto {
  id: string;
  lineNumber: number;
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  costCenterId?: string;
  costCenterNameAr?: string;
  amount: number;
  description?: string;
}

export interface VoucherDto {
  id: string;
  companyId: string;
  voucherType: VoucherType;
  voucherTypeNameAr: string;
  voucherTypeNameEn: string;
  voucherNumber: string;
  voucherDate: string;
  fiscalPeriodId: string;
  fiscalPeriodNameAr: string;
  paymentMethod: PaymentMethod;
  paymentMethodNameAr: string;
  paymentMethodNameEn?: string;
  referenceNumber?: string;
  cashOrBankAccountId: string;
  cashOrBankAccountCode: string;
  cashOrBankAccountNameAr: string;
  cashOrBankAccountNameEn?: string;
  beneficiaryOrPayerName: string;
  description: string;
  amount: number;
  amountTafqeetAr: string;
  journalEntryId?: string;
  journalEntryNumber?: string;
  status: VoucherStatus;
  statusNameAr: string;
  statusNameEn?: string;
  linesCount: number;
  postedAtUtc?: string;
  postedBy?: string;
  cancelledAtUtc?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAtUtc?: string;
  createdBy?: string;
  lines: VoucherLineDto[];
}

export interface VoucherKpisDto {
  totalVouchers: number;
  receiptCount: number;
  paymentCount: number;
  postedCount: number;
  draftCount: number;
  totalReceiptsAmount: number;
  totalPaymentsAmount: number;
  netCashFlow: number;
}

export interface VoucherListResponse {
  items: VoucherDto[];
  kpis: VoucherKpisDto;
}

export interface CreateVoucherLineRequest {
  accountId: string;
  amount: number;
  description?: string;
  costCenterId?: string;
}

export interface CreateVoucherRequest {
  companyId: string;
  voucherType: VoucherType;
  voucherDate: string;
  fiscalPeriodId?: string;
  paymentMethod: PaymentMethod;
  cashOrBankAccountId: string;
  beneficiaryOrPayerName: string;
  description: string;
  referenceNumber?: string;
  lines: CreateVoucherLineRequest[];
}

@Injectable({
  providedIn: 'root'
})
export class VouchersService {
  private readonly apiUrl = `${environment.apiUrl}/api/vouchers`;

  constructor(private http: HttpClient) {}

  getVouchers(params?: {
    companyId?: string;
    type?: number;
    status?: number;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  }): Observable<VoucherListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
      if (params.type !== undefined && params.type !== null) httpParams = httpParams.set('type', params.type.toString());
      if (params.status !== undefined && params.status !== null) httpParams = httpParams.set('status', params.status.toString());
      if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
      if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
      if (params.searchTerm) httpParams = httpParams.set('searchTerm', params.searchTerm);
    }
    return this.http.get<VoucherListResponse>(this.apiUrl, { params: httpParams });
  }

  getVoucherById(id: string): Observable<VoucherDto> {
    return this.http.get<VoucherDto>(`${this.apiUrl}/${id}`);
  }

  createVoucher(request: CreateVoucherRequest, autoPost: boolean = false): Observable<VoucherDto> {
    const params = new HttpParams().set('autoPost', autoPost.toString());
    return this.http.post<VoucherDto>(this.apiUrl, request, { params });
  }

  postVoucher(id: string): Observable<VoucherDto> {
    return this.http.post<VoucherDto>(`${this.apiUrl}/${id}/post`, {});
  }

  cancelVoucher(id: string, reason: string): Observable<VoucherDto> {
    return this.http.post<VoucherDto>(`${this.apiUrl}/${id}/cancel`, { reason });
  }
}
