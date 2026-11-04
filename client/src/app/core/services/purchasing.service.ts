import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CompanyContextService } from './company-context.service';
import { environment } from '../../../environments/environment';

export enum ItemType {
  Stockable = 1,
  Service = 2,
  RawMaterial = 3,
  Asset = 4
}

export enum PurchaseInvoiceStatus {
  Draft = 1,
  UnderApproval = 2,
  Posted = 3,
  Cancelled = 4
}

export enum PurchasePaymentStatus {
  Unpaid = 1,
  PartiallyPaid = 2,
  Paid = 3
}

export interface ItemDto {
  id: string;
  companyId?: string;
  itemCode: string;
  barcode?: string;
  nameAr: string;
  nameEn: string;
  itemType: ItemType;
  unitOfMeasure: string;
  purchasePrice: number;
  salePrice: number;
  costPrice: number;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  revenueAccountId?: string;
  currentStockQuantity: number;
  minStockLevel: number;
  categoryCode?: string;
  categoryNameAr?: string;
  categoryNameEn?: string;
  isActive: boolean;
  createdAtUtc?: string;
}

export interface InventoryTransactionDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemNameAr: string;
  transactionDate: string;
  movementType: number;
  quantityIn: number;
  quantityOut: number;
  unitCost: number;
  totalCost: number;
  balanceAfterQuantity: number;
  referenceType?: string;
  referenceNumber?: string;
  notes?: string;
  createdAtUtc: string;
  warehouseId?: string;
  warehouseCode?: string;
}

export interface ItemWarehouseStockDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseNameAr: string;
  warehouseNameEn: string;
  quantity: number;
  costPrice: number;
  totalValue: number;
  minStockLevel: number;
  maxStockLevel: number;
  binLocation?: string;
  lastMovementAtUtc?: string;
}

export interface CreateItemRequest {
  companyId?: string;
  itemCode: string;
  nameAr: string;
  nameEn: string;
  itemType: ItemType;
  unitOfMeasure: string;
  purchasePrice: number;
  salePrice: number;
  costPrice?: number;
  barcode?: string;
  categoryCode?: string;
  categoryNameAr?: string;
  categoryNameEn?: string;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  revenueAccountId?: string;
  minStockLevel?: number;
}

export interface UpdateItemRequest {
  nameAr: string;
  nameEn: string;
  itemType: ItemType;
  unitOfMeasure: string;
  purchasePrice: number;
  salePrice: number;
  barcode?: string;
  categoryCode?: string;
  categoryNameAr?: string;
  categoryNameEn?: string;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  revenueAccountId?: string;
  minStockLevel?: number;
  isActive?: boolean;
}

export interface AdjustStockRequest {
  actualQuantity: number;
  warehouseCode?: string;
  reasonAr: string;
  reasonEn?: string;
}

export interface AdjustStockResultDto {
  itemId: string;
  itemCode: string;
  itemNameAr: string;
  previousQuantity: number;
  actualQuantity: number;
  differenceQuantity: number;
  unitCost: number;
  totalAdjustmentValue: number;
  movementType: string;
  referenceNumber: string;
  journalEntryId?: string;
  journalEntryNumber?: string;
}

export interface InventoryAuditItemInput {
  itemId: string;
  actualQuantity: number;
  reasonAr?: string;
  reasonEn?: string;
}

export interface PostInventoryAuditRequest {
  companyId?: string;
  warehouseCode?: string;
  auditDate?: string;
  auditReference?: string;
  notes?: string;
  items: InventoryAuditItemInput[];
}

export interface PostInventoryAuditResultDto {
  auditReferenceNumber: string;
  auditDate: string;
  warehouseCode: string;
  totalItemsEvaluated: number;
  adjustedItemsCount: number;
  totalSurplusAmount: number;
  totalDeficitAmount: number;
  netAdjustmentAmount: number;
  journalEntryId?: string;
  journalEntryNumber?: string;
  summaryAr: string;
  summaryEn: string;
}

export interface TransferStockRequest {
  sourceWarehouseCode: string;
  destinationWarehouseCode: string;
  quantity: number;
  reasonAr: string;
  reasonEn?: string;
}

export interface TransferStockResultDto {
  itemId: string;
  itemCode: string;
  itemNameAr: string;
  sourceWarehouseCode: string;
  destinationWarehouseCode: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  referenceNumber: string;
  transferDate: string;
  status: string;
}

export interface PurchaseInvoiceLineDto {
  id: string;
  lineNumber: number;
  itemId?: string;
  itemNameAr: string;
  itemNameEn?: string;
  accountId: string;
  costCenterId?: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  discountAmount: number;
  taxableAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

export interface PurchaseInvoiceDto {
  id: string;
  companyId: string;
  invoiceNumber: string;
  vendorInvoiceNumber?: string;
  vendorId: string;
  vendorName: string;
  vendorVatNumber?: string;
  vendorCrNumber?: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  exchangeRateToSar: number;
  subTotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalVat: number;
  totalAmount: number;
  status: PurchaseInvoiceStatus;
  paymentStatus: PurchasePaymentStatus;
  paymentStatusNameAr?: string;
  paymentStatusAr?: string;
  paidAmount: number;
  remainingAmount?: number;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  goodsReceiptNoteId?: string;
  goodsReceiptNoteNumber?: string;
  matchingStatus?: ThreeWayMatchingStatus;
  matchingStatusAr?: string;
  associatedJournalEntryId?: string;
  associatedJournalEntryNumber?: string;
  notes?: string;
  createdAtUtc: string;
  lines: PurchaseInvoiceLineDto[];
}

export interface CreatePurchaseInvoiceLineRequest {
  itemId?: string;
  itemNameAr: string;
  itemNameEn?: string;
  accountId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  vatRate?: number;
  costCenterId?: string;
}

export enum RequisitionStatus {
  Draft = 1,
  Submitted = 2,
  Approved = 3,
  Rejected = 4,
  ConvertedToPo = 5,
  Cancelled = 6
}

export enum RequisitionPriority {
  Low = 1,
  Normal = 2,
  High = 3,
  Urgent = 4
}

export enum PurchaseOrderStatus {
  Draft = 1,
  Confirmed = 2,
  PartiallyReceived = 3,
  FullyReceived = 4,
  Billed = 5,
  Cancelled = 6
}

export enum GoodsReceiptStatus {
  Draft = 1,
  Accepted = 2,
  PartiallyAccepted = 3,
  Rejected = 4,
  Cancelled = 5
}

export enum ThreeWayMatchingStatus {
  NotMatched = 0,
  Matched = 1,
  PriceVariance = 2,
  QuantityVariance = 3,
  ManualApproval = 4
}

export interface PurchaseRequisitionLineDto {
  id: string;
  lineNumber: number;
  itemId?: string;
  itemCode?: string;
  itemNameAr: string;
  itemNameEn?: string;
  unitOfMeasure: string;
  quantityRequested: number;
  estimatedUnitPrice: number;
  estimatedTotal: number;
  warehouseCode?: string;
  costCenterId?: string;
  accountId?: string;
  notes?: string;
}

export interface PurchaseRequisitionDto {
  id: string;
  companyId: string;
  requisitionNumber: string;
  title: string;
  departmentName: string;
  requesterName: string;
  requestDate: string;
  requiredByDate?: string;
  status: RequisitionStatus;
  statusAr: string;
  priority: RequisitionPriority;
  priorityAr: string;
  costCenterId?: string;
  projectCode?: string;
  reason?: string;
  approvalNotes?: string;
  totalEstimatedAmount: number;
  convertedToPoId?: string;
  convertedToPoNumber?: string;
  createdAtUtc: string;
  lines: PurchaseRequisitionLineDto[];
}

export interface CreateRequisitionLineRequest {
  itemId?: string;
  itemCode?: string;
  itemNameAr: string;
  itemNameEn?: string;
  unitOfMeasure?: string;
  quantityRequested: number;
  estimatedUnitPrice: number;
  warehouseCode?: string;
  costCenterId?: string;
  accountId?: string;
  notes?: string;
}

export interface CreatePurchaseRequisitionRequest {
  companyId?: string;
  title: string;
  departmentName: string;
  requesterName: string;
  requestDate: string;
  requiredByDate?: string;
  priority?: RequisitionPriority;
  costCenterId?: string;
  projectCode?: string;
  reason?: string;
  lines: CreateRequisitionLineRequest[];
}

export interface PurchaseOrderLineDto {
  id: string;
  lineNumber: number;
  itemId?: string;
  itemCode?: string;
  itemNameAr: string;
  itemNameEn?: string;
  unitOfMeasure: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityBilled: number;
  unitPrice: number;
  discountAmount: number;
  subTotal: number;
  taxableAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  warehouseCode?: string;
  costCenterId?: string;
  accountId?: string;
  notes?: string;
}

export interface PurchaseOrderDto {
  id: string;
  companyId: string;
  orderNumber: string;
  requisitionId?: string;
  requisitionNumber?: string;
  vendorId: string;
  vendorName: string;
  vendorVatNumber?: string;
  vendorCrNumber?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  paymentTerms: string;
  currency: string;
  exchangeRateToSar: number;
  branchCode: string;
  warehouseCode: string;
  costCenterId?: string;
  status: PurchaseOrderStatus;
  statusAr: string;
  subTotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalVat: number;
  totalAmount: number;
  receivedProgressPercent: number;
  billedProgressPercent: number;
  notes?: string;
  createdAtUtc: string;
  lines: PurchaseOrderLineDto[];
}

export interface CreatePurchaseOrderLineRequest {
  itemId?: string;
  itemCode?: string;
  itemNameAr: string;
  itemNameEn?: string;
  quantityOrdered: number;
  unitPrice: number;
  discountAmount?: number;
  vatRate?: number;
  unitOfMeasure?: string;
  warehouseCode?: string;
  costCenterId?: string;
  accountId?: string;
  notes?: string;
}

export interface CreatePurchaseOrderRequest {
  companyId?: string;
  vendorId: string;
  vendorName: string;
  vendorVatNumber?: string;
  vendorCrNumber?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  requisitionId?: string;
  requisitionNumber?: string;
  paymentTerms?: string;
  currency?: string;
  exchangeRateToSar?: number;
  branchCode?: string;
  warehouseCode?: string;
  costCenterId?: string;
  accountId?: string;
  notes?: string;
  lines: CreatePurchaseOrderLineRequest[];
}

export interface GoodsReceiptNoteLineDto {
  id: string;
  lineNumber: number;
  purchaseOrderLineId?: string;
  itemId?: string;
  itemCode?: string;
  itemNameAr: string;
  itemNameEn?: string;
  unitOfMeasure: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  rejectionReason?: string;
  unitCost: number;
  totalValue: number;
  warehouseCode: string;
  notes?: string;
}

export interface GoodsReceiptNoteDto {
  id: string;
  companyId: string;
  receiptNumber: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  vendorId: string;
  vendorName: string;
  receiptDate: string;
  warehouseCode: string;
  receiverName: string;
  deliveryNoteNumber?: string;
  inspectorName?: string;
  status: GoodsReceiptStatus;
  statusAr: string;
  totalQuantityAccepted: number;
  totalQuantityRejected: number;
  totalReceivedValue: number;
  notes?: string;
  createdAtUtc: string;
  lines: GoodsReceiptNoteLineDto[];
}

export interface CreateReceiptLineRequest {
  purchaseOrderLineId?: string;
  itemId?: string;
  itemCode?: string;
  itemNameAr: string;
  itemNameEn?: string;
  unitOfMeasure?: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected?: number;
  rejectionReason?: string;
  unitCost: number;
  warehouseCode?: string;
  notes?: string;
}

export interface CreateGoodsReceiptNoteRequest {
  companyId?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  vendorId: string;
  vendorName: string;
  deliveryNoteNumber?: string;
  receiptDate: string;
  warehouseCode?: string;
  receiverName: string;
  inspectorName?: string;
  notes?: string;
  lines: CreateReceiptLineRequest[];
  autoPost?: boolean;
}

export interface CreatePurchaseInvoiceRequest {
  companyId?: string;
  vendorId: string;
  vendorInvoiceNumber?: string;
  issueDate: string;
  dueDate?: string;
  currency?: string;
  exchangeRateToSar?: number;
  notes?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  goodsReceiptNoteId?: string;
  goodsReceiptNoteNumber?: string;
  lines: CreatePurchaseInvoiceLineRequest[];
  autoPost?: boolean;
}

export interface PurchaseKpisDto {
  totalInvoicesCount: number;
  totalPurchasesAmount: number;
  totalInputVatAmount: number;
  totalUnpaidAmount: number;
  totalItemsCount: number;
  totalStockValuation: number;
}

@Injectable({
  providedIn: 'root'
})
export class PurchasingService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);

  private itemsUrl = `${environment.apiUrl}/api/items`;
  private invoicesUrl = `${environment.apiUrl}/api/purchase-invoices`;
  private requisitionsUrl = `${environment.apiUrl}/api/purchase-requisitions`;
  private ordersUrl = `${environment.apiUrl}/api/purchase-orders`;
  private receiptsUrl = `${environment.apiUrl}/api/goods-receipts`;

  private get activeCompanyId(): string {
    return this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
  }

  private getItemCategoryMapKey(): string {
    return `alrobban_item_categories_map_${this.activeCompanyId}`;
  }

  getItemCategoryMap(): Record<string, { code: string; nameAr: string; nameEn?: string }> {
    try {
      const stored = localStorage.getItem(this.getItemCategoryMapKey());
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  saveItemCategoryMapping(itemId: string, itemCode?: string, catCode?: string, catNameAr?: string, catNameEn?: string): void {
    try {
      const map = this.getItemCategoryMap();
      if (!catCode) {
        if (itemId) delete map[itemId];
        if (itemCode) delete map[itemCode];
      } else {
        const info = { code: catCode, nameAr: catNameAr || catCode, nameEn: catNameEn };
        if (itemId) map[itemId] = info;
        if (itemCode) map[itemCode] = info;
      }
      localStorage.setItem(this.getItemCategoryMapKey(), JSON.stringify(map));
    } catch {}
  }

  private enrichItemsWithCategories(items: ItemDto[]): ItemDto[] {
    const catMap = this.getItemCategoryMap();
    return items.map(item => {
      const mapped = catMap[item.id] || (item.itemCode ? catMap[item.itemCode] : undefined);
      if (mapped) {
        return {
          ...item,
          categoryCode: mapped.code,
          categoryNameAr: mapped.nameAr,
          categoryNameEn: mapped.nameEn
        };
      }
      return item;
    });
  }

  // --- ITEMS API ---
  getItems(itemType?: ItemType, searchTerm?: string, activeOnly: boolean = true): Observable<ItemDto[]> {
    let params = new HttpParams()
      .set('companyId', this.activeCompanyId)
      .set('activeOnly', activeOnly.toString());

    if (itemType !== undefined && itemType !== null) {
      params = params.set('itemType', itemType.toString());
    }
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm.trim());
    }

    return this.http.get<ItemDto[]>(this.itemsUrl, { params }).pipe(
      map(items => this.enrichItemsWithCategories(this.mergeRawMaterialsIntoItems(items || [], itemType, searchTerm))),
      catchError(() => of(this.enrichItemsWithCategories(this.mergeRawMaterialsIntoItems([], itemType, searchTerm))))
    );
  }

  private mergeRawMaterialsIntoItems(items: ItemDto[], itemType?: ItemType, searchTerm?: string): ItemDto[] {
    const rawKey = `alrobban_raw_materials_${this.activeCompanyId}`;
    const rawStored = localStorage.getItem(rawKey);
    if (!rawStored) return items;

    try {
      const rawList: any[] = JSON.parse(rawStored);
      const existingCodes = new Set(items.map(i => i.itemCode));

      const rawItems: ItemDto[] = rawList
        .filter(r => !existingCodes.has(r.itemCode))
        .map(r => ({
          id: r.id,
          companyId: this.activeCompanyId,
          itemCode: r.itemCode,
          nameAr: r.nameAr,
          nameEn: r.nameEn,
          itemType: ItemType.RawMaterial,
          unitOfMeasure: r.unitOfMeasure,
          purchasePrice: r.unitCost,
          costPrice: r.unitCost,
          salePrice: Number((r.unitCost * 1.25).toFixed(2)), // هامش ربح 25% مع إمكانية تعديل سعر البيع في الفاتورة
          currentStockQuantity: r.currentStock || 0,
          minStockLevel: r.minStockLevel || 0,
          categoryCode: r.category || 'CAT-CONC',
          categoryNameAr: r.categoryAr,
          categoryNameEn: r.categoryEn,
          isActive: true
        }));

      let combined = [...items, ...rawItems];
      if (itemType !== undefined && itemType !== null) {
        combined = combined.filter(i => i.itemType === itemType);
      }
      if (searchTerm) {
        const term = searchTerm.trim().toLowerCase();
        combined = combined.filter(i =>
          i.itemCode.toLowerCase().includes(term) ||
          i.nameAr.toLowerCase().includes(term) ||
          i.nameEn.toLowerCase().includes(term)
        );
      }
      return combined;
    } catch {
      return items;
    }
  }

  getItemById(id: string): Observable<ItemDto> {
    return this.http.get<ItemDto>(`${this.itemsUrl}/${id}`).pipe(
      catchError(() => {
        const rawKey = `alrobban_raw_materials_${this.activeCompanyId}`;
        const rawStored = localStorage.getItem(rawKey);
        if (rawStored) {
          const rawList: any[] = JSON.parse(rawStored);
          const found = rawList.find(r => r.id === id);
          if (found) {
            return of({
              id: found.id,
              companyId: this.activeCompanyId,
              itemCode: found.itemCode,
              nameAr: found.nameAr,
              nameEn: found.nameEn,
              itemType: ItemType.RawMaterial,
              unitOfMeasure: found.unitOfMeasure,
              purchasePrice: found.unitCost,
              costPrice: found.unitCost,
              salePrice: Number((found.unitCost * 1.25).toFixed(2)),
              currentStockQuantity: found.currentStock || 0,
              minStockLevel: found.minStockLevel || 0,
              isActive: true
            } as ItemDto);
          }
        }
        throw new Error('Item not found');
      })
    );
  }

  getItemHistory(id: string): Observable<InventoryTransactionDto[]> {
    return this.http.get<InventoryTransactionDto[]>(`${this.itemsUrl}/${id}/history`);
  }

  createItem(payload: CreateItemRequest): Observable<ItemDto> {
    const body = {
      ...payload,
      companyId: payload.companyId || this.activeCompanyId
    };
    return this.http.post<ItemDto>(this.itemsUrl, body).pipe(
      map(item => {
        if (payload.categoryCode && item?.id) {
          this.saveItemCategoryMapping(item.id, item.itemCode, payload.categoryCode, payload.categoryNameAr, payload.categoryNameEn);
        }
        return this.enrichItemsWithCategories([item])[0] || item;
      })
    );
  }

  updateItem(id: string, payload: UpdateItemRequest): Observable<ItemDto> {
    if (payload.categoryCode) {
      this.saveItemCategoryMapping(id, '', payload.categoryCode, payload.categoryNameAr, payload.categoryNameEn);
    }
    return this.http.put<ItemDto>(`${this.itemsUrl}/${id}`, payload).pipe(
      map(item => this.enrichItemsWithCategories([item])[0] || item)
    );
  }

  deleteItem(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.itemsUrl}/${id}`);
  }

  adjustStock(itemId: string, payload: AdjustStockRequest): Observable<AdjustStockResultDto> {
    return this.http.post<AdjustStockResultDto>(`${this.itemsUrl}/${itemId}/adjust-stock`, payload);
  }

  transferStock(itemId: string, payload: TransferStockRequest): Observable<TransferStockResultDto> {
    return this.http.post<TransferStockResultDto>(`${this.itemsUrl}/${itemId}/transfer-stock`, payload);
  }

  postInventoryAudit(payload: PostInventoryAuditRequest): Observable<PostInventoryAuditResultDto> {
    if (!payload.companyId) {
      payload.companyId = this.activeCompanyId;
    }
    return this.http.post<PostInventoryAuditResultDto>(`${this.itemsUrl}/inventory-audit`, payload);
  }

  getInventoryTransactions(
    movementType?: number,
    itemId?: string,
    warehouseId?: string,
    warehouseCode?: string
  ): Observable<InventoryTransactionDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (movementType !== undefined && movementType !== null) {
      params = params.set('movementType', movementType.toString());
    }
    if (itemId) {
      params = params.set('itemId', itemId);
    }
    if (warehouseId) {
      params = params.set('warehouseId', warehouseId);
    }
    if (warehouseCode) {
      params = params.set('warehouseCode', warehouseCode);
    }
    return this.http.get<InventoryTransactionDto[]>(`${this.itemsUrl}/transactions`, { params });
  }

  getWarehouseStocks(warehouseId?: string, itemId?: string): Observable<ItemWarehouseStockDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    if (itemId) params = params.set('itemId', itemId);
    return this.http.get<ItemWarehouseStockDto[]>(`${this.itemsUrl}/warehouse-stocks`, { params });
  }

  // --- PURCHASE INVOICES API ---
  getPurchaseInvoices(
    vendorId?: string,
    status?: PurchaseInvoiceStatus,
    searchTerm?: string,
    fromDate?: string,
    toDate?: string,
    skip: number = 0,
    take: number = 50
  ): Observable<PurchaseInvoiceDto[]> {
    let params = new HttpParams()
      .set('companyId', this.activeCompanyId)
      .set('skip', skip.toString())
      .set('take', take.toString());

    if (vendorId) params = params.set('vendorId', vendorId);
    if (status !== undefined && status !== null) params = params.set('status', status.toString());
    if (searchTerm) params = params.set('searchTerm', searchTerm.trim());
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);

    return this.http.get<PurchaseInvoiceDto[]>(this.invoicesUrl, { params });
  }

  getPurchaseInvoiceById(id: string): Observable<PurchaseInvoiceDto> {
    return this.http.get<PurchaseInvoiceDto>(`${this.invoicesUrl}/${id}`);
  }

  getPurchaseKpis(): Observable<PurchaseKpisDto> {
    const params = new HttpParams().set('companyId', this.activeCompanyId);
    return this.http.get<PurchaseKpisDto>(`${this.invoicesUrl}/kpis`, { params });
  }

  createPurchaseInvoice(payload: CreatePurchaseInvoiceRequest): Observable<PurchaseInvoiceDto> {
    const body = {
      ...payload,
      companyId: payload.companyId || this.activeCompanyId,
      currency: payload.currency || 'SAR',
      exchangeRateToSar: payload.exchangeRateToSar ?? 1.0,
      autoPost: payload.autoPost ?? false
    };
    return this.http.post<PurchaseInvoiceDto>(this.invoicesUrl, body);
  }

  postPurchaseInvoice(id: string, postedBy?: string): Observable<PurchaseInvoiceDto> {
    return this.http.post<PurchaseInvoiceDto>(`${this.invoicesUrl}/${id}/post`, { postedBy });
  }

  cancelPurchaseInvoice(id: string, reason?: string): Observable<PurchaseInvoiceDto> {
    return this.http.post<PurchaseInvoiceDto>(`${this.invoicesUrl}/${id}/cancel`, { reason });
  }

  payPurchaseInvoice(id: string, request: PayPurchaseInvoiceRequest): Observable<PurchaseInvoiceDto> {
    return this.http.post<PurchaseInvoiceDto>(`${this.invoicesUrl}/${id}/pay`, request);
  }

  returnPurchaseInvoice(id: string, reason?: string): Observable<PurchaseInvoiceDto> {
    return this.http.post<PurchaseInvoiceDto>(`${this.invoicesUrl}/${id}/return`, { reason });
  }

  // --- PURCHASE REQUISITIONS API ---
  getRequisitions(status?: RequisitionStatus, search?: string): Observable<PurchaseRequisitionDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (status !== undefined && status !== null) params = params.set('status', status.toString());
    if (search) params = params.set('search', search.trim());
    return this.http.get<PurchaseRequisitionDto[]>(this.requisitionsUrl, { params });
  }

  getRequisitionById(id: string): Observable<PurchaseRequisitionDto> {
    return this.http.get<PurchaseRequisitionDto>(`${this.requisitionsUrl}/${id}`);
  }

  createRequisition(payload: CreatePurchaseRequisitionRequest): Observable<PurchaseRequisitionDto> {
    const body = {
      ...payload,
      companyId: payload.companyId || this.activeCompanyId
    };
    return this.http.post<PurchaseRequisitionDto>(this.requisitionsUrl, body);
  }

  approveRequisition(id: string, notes?: string): Observable<PurchaseRequisitionDto> {
    return this.http.post<PurchaseRequisitionDto>(`${this.requisitionsUrl}/${id}/approve`, { notes });
  }

  rejectRequisition(id: string, reason?: string): Observable<PurchaseRequisitionDto> {
    return this.http.post<PurchaseRequisitionDto>(`${this.requisitionsUrl}/${id}/reject`, { reason });
  }

  // --- PURCHASE ORDERS API ---
  getOrders(vendorId?: string, status?: PurchaseOrderStatus, search?: string): Observable<PurchaseOrderDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (vendorId) params = params.set('vendorId', vendorId);
    if (status !== undefined && status !== null) params = params.set('status', status.toString());
    if (search) params = params.set('search', search.trim());
    return this.http.get<PurchaseOrderDto[]>(this.ordersUrl, { params });
  }

  getOrderById(id: string): Observable<PurchaseOrderDto> {
    return this.http.get<PurchaseOrderDto>(`${this.ordersUrl}/${id}`);
  }

  createOrder(payload: CreatePurchaseOrderRequest): Observable<PurchaseOrderDto> {
    const body = {
      ...payload,
      companyId: payload.companyId || this.activeCompanyId,
      currency: payload.currency || 'SAR',
      exchangeRateToSar: payload.exchangeRateToSar ?? 1.0,
      branchCode: payload.branchCode || 'BR-01',
      warehouseCode: payload.warehouseCode || 'WH-01',
      paymentTerms: payload.paymentTerms || 'آجل 30 يوم'
    };
    return this.http.post<PurchaseOrderDto>(this.ordersUrl, body);
  }

  confirmOrder(id: string, confirmedBy?: string): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${this.ordersUrl}/${id}/confirm`, { confirmedBy });
  }

  cancelOrder(id: string, cancelledBy?: string): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${this.ordersUrl}/${id}/cancel`, { cancelledBy });
  }

  // --- GOODS RECEIPTS API ---
  getGoodsReceipts(purchaseOrderId?: string, vendorId?: string, status?: GoodsReceiptStatus, search?: string): Observable<GoodsReceiptNoteDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (purchaseOrderId) params = params.set('purchaseOrderId', purchaseOrderId);
    if (vendorId) params = params.set('vendorId', vendorId);
    if (status !== undefined && status !== null) params = params.set('status', status.toString());
    if (search) params = params.set('search', search.trim());
    return this.http.get<GoodsReceiptNoteDto[]>(this.receiptsUrl, { params });
  }

  getGoodsReceiptById(id: string): Observable<GoodsReceiptNoteDto> {
    return this.http.get<GoodsReceiptNoteDto>(`${this.receiptsUrl}/${id}`);
  }

  createGoodsReceipt(payload: CreateGoodsReceiptNoteRequest): Observable<GoodsReceiptNoteDto> {
    const body = {
      ...payload,
      companyId: payload.companyId || this.activeCompanyId,
      autoPost: payload.autoPost ?? true
    };
    return this.http.post<GoodsReceiptNoteDto>(this.receiptsUrl, body);
  }
}

export interface PayPurchaseInvoiceRequest {
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentAccountId?: string;
  referenceNumber?: string;
  notes?: string;
}

