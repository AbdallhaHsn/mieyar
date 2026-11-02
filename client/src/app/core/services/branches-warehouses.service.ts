import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BranchDto {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isMainBranch: boolean;
  address?: any;
  city?: string;
  taxRegistrationNumber?: string;
  crNumber?: string;
  isActive: boolean;
}

export interface CreateBranchDto {
  code: string;
  nameAr: string;
  nameEn: string;
  address?: string;
  city?: string;
  taxRegistrationNumber?: string;
  crNumber?: string;
  isMainBranch?: boolean;
}

export interface WarehouseDto {
  id: string;
  companyId: string;
  branchId?: string;
  branchName?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  location?: string;
  managerName?: string;
  managerPhone?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface CreateWarehouseDto {
  branchId?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  location?: string;
  managerName?: string;
  managerPhone?: string;
  isDefault?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BranchesWarehousesService {
  private http = inject(HttpClient);
  private apiUrl = '/api/companies';

  getBranches(companyId: string): Observable<BranchDto[]> {
    return this.http.get<BranchDto[]>(`${this.apiUrl}/${companyId}/branches`);
  }

  createBranch(companyId: string, payload: CreateBranchDto): Observable<BranchDto> {
    const cityName = payload.city?.trim() || (typeof payload.address === 'object' ? (payload.address as any)?.cityName : null) || 'الرياض';
    const streetName = typeof payload.address === 'string' ? payload.address.trim() : (payload.address as any)?.streetName || '';

    const requestBody: any = {
      code: (payload.code || 'BR-01').trim(),
      nameAr: (payload.nameAr || `فرع ${cityName}`).trim(),
      nameEn: (payload.nameEn || `${cityName} Branch`).trim(),
      isMainBranch: !!payload.isMainBranch,
      address: {
        streetName: streetName,
        cityName: cityName,
        buildingNumber: (payload.address as any)?.buildingNumber || '1',
        subDivisionName: (payload.address as any)?.subDivisionName || '',
        postalZone: (payload.address as any)?.postalZone || '11564',
        countryCode: 'SA'
      }
    };

    return this.http.post<BranchDto>(`${this.apiUrl}/${companyId}/branches`, requestBody);
  }

  toggleBranchStatus(companyId: string, branchId: string, isActive: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${companyId}/branches/${branchId}/status`, { isActive });
  }

  updateBranch(companyId: string, branchId: string, payload: Partial<CreateBranchDto>): Observable<BranchDto> {
    const cityName = payload.city?.trim() || (typeof payload.address === 'object' ? (payload.address as any)?.cityName : null) || 'الرياض';
    const streetName = typeof payload.address === 'string' ? payload.address.trim() : (payload.address as any)?.streetName || '';

    const requestBody: any = {
      nameAr: payload.nameAr?.trim(),
      nameEn: payload.nameEn?.trim(),
      address: {
        streetName: streetName,
        cityName: cityName,
        buildingNumber: (payload.address as any)?.buildingNumber || '1',
        subDivisionName: (payload.address as any)?.subDivisionName || '',
        postalZone: (payload.address as any)?.postalZone || '11564',
        countryCode: 'SA'
      }
    };

    return this.http.put<BranchDto>(`${this.apiUrl}/${companyId}/branches/${branchId}`, requestBody);
  }

  deleteBranch(companyId: string, branchId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${companyId}/branches/${branchId}`);
  }

  getWarehouses(companyId: string): Observable<WarehouseDto[]> {
    return this.http.get<WarehouseDto[]>(`${this.apiUrl}/${companyId}/warehouses`);
  }

  createWarehouse(companyId: string, payload: CreateWarehouseDto): Observable<WarehouseDto> {
    return this.http.post<WarehouseDto>(`${this.apiUrl}/${companyId}/warehouses`, payload);
  }

  updateWarehouse(companyId: string, warehouseId: string, payload: Partial<CreateWarehouseDto>): Observable<WarehouseDto> {
    return this.http.put<WarehouseDto>(`${this.apiUrl}/${companyId}/warehouses/${warehouseId}`, payload);
  }

  deleteWarehouse(companyId: string, warehouseId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${companyId}/warehouses/${warehouseId}`);
  }

  toggleWarehouseStatus(companyId: string, warehouseId: string, isActive: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${companyId}/warehouses/${warehouseId}/status`, { isActive });
  }

  getWarehouseAccountingMatrix(companyId: string, warehouseId: string): Observable<WarehouseAccountMappingDto[]> {
    return this.http.get<WarehouseAccountMappingDto[]>(`${this.apiUrl}/${companyId}/warehouses/${warehouseId}/accounting-matrix`);
  }

  saveWarehouseAccountingMatrix(companyId: string, warehouseId: string, paymentMethod: number, payload: WarehouseAccountMappingDto): Observable<WarehouseAccountMappingDto> {
    return this.http.put<WarehouseAccountMappingDto>(`${this.apiUrl}/${companyId}/warehouses/${warehouseId}/accounting-matrix/${paymentMethod}`, payload);
  }

  copyWarehouseAccountingMatrix(companyId: string, warehouseId: string, sourceWarehouseId: string, sourcePaymentMethod: number, targetPaymentMethod: number): Observable<WarehouseAccountMappingDto> {
    return this.http.post<WarehouseAccountMappingDto>(`${this.apiUrl}/${companyId}/warehouses/${warehouseId}/accounting-matrix/copy`, {
      sourceWarehouseId,
      sourcePaymentMethod,
      targetPaymentMethod
    });
  }
}

export interface WarehouseAccountMappingDto {
  id?: string;
  tenantId?: string;
  companyId?: string;
  warehouseId?: string;
  paymentMethod: number; // 1 = Cash (نقدي), 2 = Credit (آجل), 3 = BankCard (شبكة/مدى)
  
  salesInvoiceAccountId?: string | null;
  salesInvoiceAccountCode?: string | null;
  salesInvoiceAccountName?: string | null;

  inventoryAccountId?: string | null;
  inventoryAccountCode?: string | null;
  inventoryAccountName?: string | null;

  cogsAccountId?: string | null;
  cogsAccountCode?: string | null;
  cogsAccountName?: string | null;

  salesRevenueAccountId?: string | null;
  salesRevenueAccountCode?: string | null;
  salesRevenueAccountName?: string | null;

  salesReturnAccountId?: string | null;
  salesReturnAccountCode?: string | null;
  salesReturnAccountName?: string | null;

  advancePaymentAccountId?: string | null;
  advancePaymentAccountCode?: string | null;
  advancePaymentAccountName?: string | null;

  discountAllowedAccountId?: string | null;
  discountAllowedAccountCode?: string | null;
  discountAllowedAccountName?: string | null;

  taxAccountId?: string | null;
  taxAccountCode?: string | null;
  taxAccountName?: string | null;

  servicesRevenueAccountId?: string | null;
  servicesRevenueAccountCode?: string | null;
  servicesRevenueAccountName?: string | null;

  servicesCostAccountId?: string | null;
  servicesCostAccountCode?: string | null;
  servicesCostAccountName?: string | null;

  loyaltyCustomersAccountId?: string | null;
  loyaltyCustomersAccountCode?: string | null;
  loyaltyCustomersAccountName?: string | null;

  roundingAccountId?: string | null;
  roundingAccountCode?: string | null;
  roundingAccountName?: string | null;

  additionalExpensesAccountId?: string | null;
  additionalExpensesAccountCode?: string | null;
  additionalExpensesAccountName?: string | null;

  transferClearingAccountId?: string | null;
  transferClearingAccountCode?: string | null;
  transferClearingAccountName?: string | null;

  adjustmentVarianceAccountId?: string | null;
  adjustmentVarianceAccountCode?: string | null;
  adjustmentVarianceAccountName?: string | null;
}

