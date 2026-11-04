import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyContextService } from './company-context.service';
import { environment } from '../../../environments/environment';

export interface SalespersonDto {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phoneNumber?: string;
  email?: string;
  userId?: string;
  userName?: string;
  warehouseCode: string;
  warehouseNameAr: string;
  branchId?: string;
  commissionRate: number;
  isActive: boolean;
  createdAtUtc: string;
  canGiveDiscount?: boolean;
  maxDiscountPercent?: number;
  canSellCredit?: boolean;
  canEditPrice?: boolean;
  canProcessReturns?: boolean;
  canSellBelowCost?: boolean;
  canViewCostPrice?: boolean;
  canSellFromAnyWarehouse?: boolean;
  userRole?: string;
  departmentName?: string;
  departmentNameEn?: string;
}

export interface SalesDepartmentOption {
  nameAr: string;
  nameEn: string;
  isCustom?: boolean;
}

export interface AvailableUserDto {
  id: string;
  userName: string;
  email: string;
  fullNameAr: string;
  fullNameEn: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  isAlreadyLinked?: boolean;
}

export interface CreateSalespersonRequest {
  companyId?: string;
  code?: string;
  nameAr: string;
  nameEn: string;
  phoneNumber?: string;
  email?: string;
  userId?: string;
  userName?: string;
  createUserAccount?: boolean;
  userPassword?: string;
  targetRole?: string;
  warehouseCode: string;
  warehouseNameAr: string;
  branchId?: string;
  commissionRate?: number;
  canGiveDiscount?: boolean;
  maxDiscountPercent?: number;
  canSellCredit?: boolean;
  canEditPrice?: boolean;
  canProcessReturns?: boolean;
  canSellBelowCost?: boolean;
  canViewCostPrice?: boolean;
  canSellFromAnyWarehouse?: boolean;
  departmentName?: string;
  departmentNameEn?: string;
}

export interface UpdateSalespersonRequest {
  nameAr: string;
  nameEn: string;
  phoneNumber?: string;
  email?: string;
  departmentName?: string;
  departmentNameEn?: string;
  userId?: string;
  userName?: string;
  targetRole?: string;
  warehouseCode: string;
  warehouseNameAr: string;
  branchId?: string;
  commissionRate?: number;
  isActive: boolean;
  canGiveDiscount?: boolean;
  maxDiscountPercent?: number;
  canSellCredit?: boolean;
  canEditPrice?: boolean;
  canProcessReturns?: boolean;
  canSellBelowCost?: boolean;
  canViewCostPrice?: boolean;
  canSellFromAnyWarehouse?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SalespersonsService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);
  private readonly apiUrl = `${environment.apiUrl}/api/salespersons`;

  getSalespersons(isActive?: boolean, search?: string): Observable<SalespersonDto[]> {
    const compId = this.companyContext.activeCompany().id;
    let params = new HttpParams();
    if (compId) params = params.set('companyId', compId);
    if (isActive !== undefined && isActive !== null) params = params.set('isActive', isActive.toString());
    if (search) params = params.set('search', search);

    return this.http.get<SalespersonDto[]>(this.apiUrl, { params });
  }

  getSalespersonById(id: string): Observable<SalespersonDto> {
    return this.http.get<SalespersonDto>(`${this.apiUrl}/${id}`);
  }

  getSalespersonByUserId(userId: string): Observable<SalespersonDto> {
    const compId = this.companyContext.activeCompany().id;
    let params = new HttpParams();
    if (compId) params = params.set('companyId', compId);
    return this.http.get<SalespersonDto>(`${this.apiUrl}/by-user/${userId}`, { params });
  }

  getAvailableUsers(): Observable<AvailableUserDto[]> {
    const compId = this.companyContext.activeCompany().id;
    let params = new HttpParams();
    if (compId) params = params.set('companyId', compId);
    return this.http.get<AvailableUserDto[]>(`${this.apiUrl}/available-users`, { params });
  }

  createSalesperson(request: CreateSalespersonRequest): Observable<SalespersonDto> {
    const compId = request.companyId || this.companyContext.activeCompany().id;
    return this.http.post<SalespersonDto>(this.apiUrl, { ...request, companyId: compId });
  }

  updateSalesperson(id: string, request: UpdateSalespersonRequest): Observable<SalespersonDto> {
    return this.http.put<SalespersonDto>(`${this.apiUrl}/${id}`, request);
  }

  toggleActive(id: string): Observable<{ success: boolean; isActive: boolean }> {
    return this.http.patch<{ success: boolean; isActive: boolean }>(`${this.apiUrl}/${id}/toggle-active`, {});
  }

  getDepartments(): Observable<SalesDepartmentOption[]> {
    return this.http.get<SalesDepartmentOption[]>(`${this.apiUrl}/departments`);
  }

  getSavedDepartmentsStore(): Observable<{ found: boolean; data: SalesDepartmentOption[] | null }> {
    const compId = this.companyContext.activeCompany().id || 'default';
    return this.http.get<{ found: boolean; data: SalesDepartmentOption[] | null }>(`${environment.apiUrl}/api/system-data/store/sales_departments_${compId}`);
  }

  saveDepartmentsStore(departments: SalesDepartmentOption[]): Observable<any> {
    const compId = this.companyContext.activeCompany().id || 'default';
    return this.http.post(`${environment.apiUrl}/api/system-data/store/sales_departments_${compId}`, departments);
  }
}
