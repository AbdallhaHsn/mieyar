import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyContextService } from './company-context.service';
import { environment } from '../../../environments/environment';

export enum PosShiftStatus {
  Open = 1,
  Closed = 2
}

export enum PosPaymentMethod {
  Cash = 1,
  Mada = 2,
  CreditCard = 3,
  Split = 4
}

export enum CashMovementType {
  CashIn = 1,
  CashOut = 2
}

export interface PosCashMovementDto {
  id: string;
  posShiftId: string;
  movementType: CashMovementType;
  amount: number;
  reasonAr: string;
  reasonEn: string;
  createdAtUtc: string;
  createdBy?: string;
}

export interface PosShiftDto {
  id: string;
  companyId: string;
  shiftNumber: string;
  cashierUserId: string;
  cashierName: string;
  terminalCode: string;
  branchId?: string;
  branchName: string;
  warehouseCode: string;
  warehouseName: string;
  openedAtUtc: string;
  closedAtUtc?: string;
  status: PosShiftStatus;
  openingFloatCash: number;
  totalCashSales: number;
  totalMadaSales: number;
  totalCreditCardSales: number;
  totalSalesAmount: number;
  totalTaxAmount: number;
  invoiceCount: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCashDrawer: number;
  actualClosingCash: number;
  varianceAmount: number;
  closingNotes?: string;
  journalEntryId?: string;
  journalEntryNumber?: string;
  cashMovements?: PosCashMovementDto[];
}

export interface PosFastItemDto {
  id: string;
  itemCode: string;
  barcode?: string;
  nameAr: string;
  nameEn: string;
  salePrice: number;
  costPrice: number;
  unitOfMeasure: string;
  categoryName: string;
  currentStockQuantity: number;
  warehouseCode: string;
}

export interface PosReceiptLineDto {
  itemId?: string;
  itemCode: string;
  itemNameAr: string;
  itemNameEn?: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  discount: number;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface PosReceiptDto {
  invoiceId: string;
  invoiceNumber: string;
  uuid: string;
  issueDate: string;
  issueTime: string;
  companyName: string;
  companyVatNumber: string;
  terminalCode: string;
  cashierName: string;
  customerName: string;
  paymentMethod: PosPaymentMethod;
  paymentMethodNameAr: string;
  subTotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalVat: number;
  grandTotal: number;
  cashReceived: number;
  changeGiven: number;
  qrCodePayload?: string;
  lines: PosReceiptLineDto[];
}

export interface CheckoutRequest {
  companyId?: string;
  posShiftId?: string;
  terminalCode?: string;
  cashierName?: string;
  paymentMethod: PosPaymentMethod;
  lines: {
    itemId?: string;
    itemCode: string;
    itemNameAr: string;
    itemNameEn?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    warehouseCode?: string;
  }[];
  cashReceived: number;
  changeGiven: number;
  cashPart: number;
  madaPart: number;
  customerName?: string;
  customerVatNumber?: string;
  warehouseCode?: string;
}

export interface OpenShiftRequest {
  companyId?: string;
  cashierUserId?: string;
  cashierName?: string;
  terminalCode?: string;
  openingFloatCash: number;
  warehouseCode?: string;
  warehouseName?: string;
  branchId?: string;
  branchName?: string;
}

export interface CloseShiftRequest {
  posShiftId: string;
  actualClosingCash: number;
  notes?: string;
  closedBy?: string;
}

export interface CashMovementRequest {
  posShiftId: string;
  movementType: CashMovementType;
  amount: number;
  reasonAr: string;
  reasonEn?: string;
  createdBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PosService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);

  private posUrl = `${environment.apiUrl}/api/pos`;

  private get activeCompanyId(): string {
    return this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
  }

  getCurrentShift(terminalCode: string = 'POS-01', cashierUserId: string = 'USER-01'): Observable<PosShiftDto | null> {
    const params = new HttpParams()
      .set('companyId', this.activeCompanyId)
      .set('terminalCode', terminalCode)
      .set('cashierUserId', cashierUserId);
    return this.http.get<PosShiftDto | null>(`${this.posUrl}/shifts/current`, { params });
  }

  openShift(request: OpenShiftRequest): Observable<PosShiftDto> {
    const body = {
      ...request,
      companyId: request.companyId || this.activeCompanyId
    };
    return this.http.post<PosShiftDto>(`${this.posUrl}/shifts/open`, body);
  }

  closeShift(request: CloseShiftRequest): Observable<PosShiftDto> {
    return this.http.post<PosShiftDto>(`${this.posUrl}/shifts/close`, request);
  }

  addCashMovement(request: CashMovementRequest): Observable<PosCashMovementDto> {
    return this.http.post<PosCashMovementDto>(`${this.posUrl}/shifts/cash-movement`, request);
  }

  getShiftsHistory(maxCount: number = 50): Observable<PosShiftDto[]> {
    const params = new HttpParams()
      .set('companyId', this.activeCompanyId)
      .set('maxCount', maxCount.toString());
    return this.http.get<PosShiftDto[]>(`${this.posUrl}/shifts/history`, { params });
  }

  getFastItems(searchTerm?: string): Observable<PosFastItemDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm.trim());
    }
    return this.http.get<PosFastItemDto[]>(`${this.posUrl}/items`, { params });
  }

  checkout(request: CheckoutRequest): Observable<PosReceiptDto> {
    const body = {
      ...request,
      companyId: request.companyId || this.activeCompanyId
    };
    return this.http.post<PosReceiptDto>(`${this.posUrl}/checkout`, body);
  }
}
