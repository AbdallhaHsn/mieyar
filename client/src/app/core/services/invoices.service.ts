import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompanyContextService } from './company-context.service';

export enum InvoiceType {
  StandardTaxInvoice = 1, // فاتورة ضريبية قياسية B2B
  SimplifiedTaxInvoice = 2 // فاتورة ضريبية مبسطة B2C
}

export enum TransactionType {
  Invoice = 1,      // فاتورة بيع
  CreditNote = 2,   // إشعار دائن (مرتجع مبيعات)
  DebitNote = 3     // إشعار مدين (تسوية بالإضافة)
}

export enum InvoiceStatus {
  Draft = 1,        // مسودة
  Issued = 2,       // معتمدة ومصدرة
  Cleared = 3,      // مقبولة معتمدة من هيئة زكاة (B2B Clearance)
  Reported = 4,     // مبلّغة ومسجلة لدى هيئة زكاة (B2C Reporting)
  Rejected = 5,     // مرفوضة
  Cancelled = 6     // ملغاة بإشعار دائن
}

export interface InvoiceLineDto {
  id?: string;
  lineNumber?: number;
  itemNameAr: string;
  itemNameEn?: string;
  itemName?: string;
  itemCode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountAmount?: number;
  taxableAmount?: number;
  netAmount?: number;
  vatRate: number;
  vatPercent?: number;
  vatAmount: number;
  totalAmount: number;
  totalWithVat?: number;
  vatCategory?: string;
}

export interface InvoiceDto {
  id: string;
  companyId?: string;
  invoiceNumber: string;
  uuid: string;
  issueDate: string;
  issueTime?: string;
  supplyDate?: string;
  invoiceType: InvoiceType;
  invoiceTypeNameAr?: string;
  transactionType?: TransactionType;
  transactionTypeNameAr?: string;
  status: InvoiceStatus;
  invoiceStatus?: InvoiceStatus;
  statusNameAr?: string;
  currency: string;

  // Seller Details
  sellerName?: string;
  sellerVatNumber?: string;
  paymentMeansCode?: string;

  // Buyer / Customer
  customerName: string;
  buyerName?: string;
  customerVatNumber?: string;
  buyerVatNumber?: string;
  customerCrNumber?: string;
  buyerCrNumber?: string;
  customerAddress?: string;
  buyerAddress?: string;
  buyerCity?: string;
  buyerDistrict?: string;

  // Financial Totals
  subTotal: number;
  subtotal?: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalVat: number;
  totalVatAmount?: number;
  totalAmount: number;
  grandTotal?: number;

  // References
  referenceInvoiceId?: string;
  referenceInvoiceNumber?: string;
  modificationReason?: string;

  // ZATCA Cryptography
  previousInvoiceHash?: string;
  invoiceHash?: string;
  cryptographicStamp?: string;
  qrCodePayload?: string;
  qrCodeBase64?: string;
  associatedJournalEntryId?: string;
  associatedJournalEntryNumber?: string;
  createdAtUtc: string;

  lines: InvoiceLineDto[];
}

export interface CreateInvoiceRequest {
  companyId?: string;
  invoiceNumber?: string;
  invoiceType: InvoiceType;
  transactionType?: TransactionType;
  issueDate?: string;
  supplyDate?: string;
  customerName?: string;
  buyerName?: string;
  customerVatNumber?: string;
  buyerVatNumber?: string;
  customerCrNumber?: string;
  buyerCrNumber?: string;
  customerAddress?: string;

  // ZATCA National Address fields
  buyerStreet?: string;
  buyerBuildingNumber?: string;
  buyerPlotIdentification?: string;
  buyerCitySubdivisionName?: string;
  buyerDistrict?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  buyerCountryCode?: string;

  buyerOtherIdType?: string;
  buyerOtherIdValue?: string;
  buyerNationalId?: string;
  paymentMeansCode?: string;
  notes?: string;

  referenceInvoiceId?: string;
  referenceInvoiceNumber?: string;
  modificationReason?: string;
  autoIssueAndPost?: boolean;

  lines: {
    itemNameAr?: string;
    itemName?: string;
    itemNameEn?: string;
    itemCode?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountAmount?: number;
    vatRate?: number;
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
    if (type !== undefined && type !== null) params = params.set('invoiceType', type.toString());
    if (status !== undefined && status !== null) params = params.set('status', status.toString());

    return this.http.get<InvoiceDto[]>(this.apiUrl, { params }).pipe(
      map(list => (list || []).map(inv => this.normalizeInvoice(inv)))
    );
  }

  getInvoiceById(id: string): Observable<InvoiceDto> {
    return this.http.get<InvoiceDto>(`${this.apiUrl}/${id}`).pipe(
      map(inv => this.normalizeInvoice(inv))
    );
  }

  createInvoice(request: CreateInvoiceRequest): Observable<InvoiceDto> {
    const compId = request.companyId || this.companyContext.activeCompany().id;
    const payload = {
      ...request,
      companyId: compId,
      customerName: request.customerName || request.buyerName || '',
      customerVatNumber: request.customerVatNumber || request.buyerVatNumber || null,
      customerCrNumber: request.customerCrNumber || request.buyerCrNumber || request.buyerOtherIdValue || null,
      transactionType: request.transactionType ?? TransactionType.Invoice,
      lines: (request.lines || []).map(l => ({
        ...l,
        itemNameAr: l.itemNameAr || l.itemName || '',
        discount: l.discount ?? l.discountAmount ?? 0,
        vatRate: l.vatRate ?? l.vatPercent ?? 15
      }))
    };
    return this.http.post<InvoiceDto>(this.apiUrl, payload).pipe(
      map(inv => this.normalizeInvoice(inv))
    );
  }

  issueToZatca(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/issue`, {});
  }

  downloadUblXml(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/xml`, {
      responseType: 'blob'
    });
  }

  private normalizeInvoice(inv: any): InvoiceDto {
    return {
      ...inv,
      sellerName: inv.sellerName || 'شركة الربان للحلول والأنظمة المحاسبية',
      sellerVatNumber: inv.sellerVatNumber || '300000000000003',
      buyerName: inv.customerName || inv.buyerName || '',
      customerName: inv.customerName || inv.buyerName || '',
      status: inv.status ?? inv.invoiceStatus ?? InvoiceStatus.Draft,
      invoiceStatus: inv.status ?? inv.invoiceStatus ?? InvoiceStatus.Draft,
      buyerVatNumber: inv.customerVatNumber || inv.buyerVatNumber,
      buyerCrNumber: inv.customerCrNumber || inv.buyerCrNumber,
      buyerAddress: inv.customerAddress || inv.buyerAddress,
      buyerCity: inv.buyerCity || 'الرياض',
      buyerDistrict: inv.buyerDistrict || '',
      paymentMeansCode: inv.paymentMeansCode || '10',
      qrCodeBase64: inv.qrCodePayload || inv.qrCodeBase64,
      grandTotal: inv.totalAmount ?? inv.grandTotal ?? 0,
      totalVat: inv.totalVat ?? inv.totalVatAmount ?? 0,
      totalVatAmount: inv.totalVat ?? inv.totalVatAmount ?? 0,
      subTotal: inv.subTotal ?? inv.subtotal ?? 0,
      subtotal: inv.subTotal ?? inv.subtotal ?? 0,
      lines: (inv.lines || []).map((l: any) => ({
        ...l,
        itemName: l.itemNameAr || l.itemName || '',
        netAmount: l.taxableAmount ?? l.subTotal ?? l.netAmount ?? 0,
        discountAmount: l.discount ?? l.discountAmount ?? 0,
        vatPercent: l.vatRate ?? l.vatPercent ?? 15,
        totalWithVat: l.totalAmount ?? l.totalWithVat ?? 0
      }))
    };
  }
}
