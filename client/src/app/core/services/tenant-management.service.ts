import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NationalAddressPayload {
  streetName: string;
  buildingNumber: string;
  subDivisionName: string;
  cityName: string;
  postalZone: string;
  additionalNumber?: string;
  countryCode: string;
}

export interface BranchDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isMainBranch: boolean;
  isActive: boolean;
}

export interface FiscalYearDto {
  id: string;
  yearNumber: number;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

export interface TenantCompanyDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  vatNumber: string;
  commercialRegistration: string;
  currencyCode: string;
  logoUrl?: string;
  brandThemeColor?: string;
  address: NationalAddressPayload;
  isActive: boolean;
  branches: BranchDto[];
  fiscalYears: FiscalYearDto[];
}

export interface OnboardCompanyPayload {
  code: string;
  nameAr: string;
  nameEn: string;
  vatNumber: string;
  commercialRegistration: string;
  currencyCode: string;
  logoUrl?: string;
  brandThemeColor?: string;
  address: NationalAddressPayload;
  adminUser: {
    userName: string;
    email: string;
    password: string;
    fullNameAr: string;
    fullNameEn: string;
    phoneNumber?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TenantManagementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/companies`;

  getAllCompanies(): Observable<TenantCompanyDto[]> {
    return this.http.get<TenantCompanyDto[]>(this.apiUrl);
  }

  onboardCompany(payload: OnboardCompanyPayload): Observable<TenantCompanyDto> {
    return this.http.post<TenantCompanyDto>(`${this.apiUrl}/onboard`, payload);
  }

  updateCompanyStatus(companyId: string, isActive: boolean): Observable<{ companyId: string; isActive: boolean }> {
    return this.http.put<{ companyId: string; isActive: boolean }>(`${this.apiUrl}/${companyId}/status`, { isActive });
  }

  seedCompanyDefaults(companyId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${companyId}/seed-defaults`, {});
  }
}
