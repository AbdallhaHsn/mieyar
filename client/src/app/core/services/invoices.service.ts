import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyContextService } from './company-context.service';

export enum InvoiceType {
  StandardTaxInvoice = 0,
  SimplifiedTaxInvoice = 1,
  DebitNote = 2,
  CreditNote = 3
}

export enum InvoiceStatus {
  Draft = 0,
  Issued = 1,
  Cleared = 2,
  Reported = 3,
  Rejected = 4,
  Cancelled = 5
}

export interface InvoiceLineDto {
  id: string;
  itemName: string;
  itemCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  netAmount: number;
  vatPercent: number;
  vatAmount: number;
  totalWithVat: number;
  vatCategory: string;
}

export interface InvoiceDto {
  id: string;
  companyId: string;
  invoiceNumber: string;
  uuid: string;
  invoiceType: InvoiceType;
  invoiceStatus: InvoiceStatus;
  issueDate: string;
  supplyDate: string;
  sellerName: string;
  sellerVatNumber: string;
  buyerName: string;
  buyerVatNumber?: string;
  buyerNationalId?: string;
  buyerStreet?: string;
  buyerBuildingNumber?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  buyerDistrict?: string;
  buyerCountryCode: string;
  subtotal: number;
  totalDiscount: number;
  totalVatAmount: number;
  grandTotal: number;
  paymentMeansCode: string;
  notes?: string;
  invoiceHash?: string;
  qrCodeBase64?: string;
  zatcaClearanceStatus?: string;
  zatcaValidationMessages?: string;
  clearedOrReportedAtUtc?: string;
  createdAtUtc: string;
  lines: InvoiceLineDto[];
}

export interface CreateInvoiceRequest {
  companyId?: string;
  invoiceNumber?: string;
  invoiceType: InvoiceType;
  issueDate?: string;
  supplyDate?: string;
  buyerName: string;
  buyerVatNumber?: string;
  buyerNationalId?: string;
  buyerStreet?: string;
  buyerBuildingNumber?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  buyerDistrict?: string;
  buyerCountryCode?: string;
  paymentMeansCode?: string;
  notes?: string;
  lines: {
    itemName: string;
    itemCode?: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    vatPercent?: number;
    vatCategory?: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);
  private readonly apiUrl = 'http://localhost:5000/api/invoices';

  getInvoices(type?: InvoiceType, status?: InvoiceStatus): Observable<InvoiceDto[]> {
    const compId = this.companyContext.activeCompany().id;
    let params = new HttpParams();
    if (compId) params = params.set('companyId', compId);
    if (type !== undefined && type !== null) params = params.set('type', type.toString());
    if (status !== undefined && status !== null) params = params.set('status', status.toString());

    return this.http.get<InvoiceDto[]>(this.apiUrl, { params });
  }

  getInvoiceById(id: string): Observable<InvoiceDto> {
    return this.http.get<InvoiceDto>(`${this.apiUrl}/${id}`);
  }

  createInvoice(request: CreateInvoiceRequest): Observable<InvoiceDto> {
    const compId = request.companyId || this.companyContext.activeCompany().id;
    const payload = { ...request, companyId: compId };
    return this.http.post<InvoiceDto>(this.apiUrl, payload);
  }

  issueToZatca(id: string): Observable<InvoiceDto> {
    return this.http.post<InvoiceDto>(`${this.apiUrl}/${id}/issue`, {});
  }

  downloadUblXml(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/ubl-xml`, {
      responseType: 'blob'
    });
  }
}
