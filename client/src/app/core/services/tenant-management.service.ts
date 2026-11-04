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

export interface CompanyLicense {
  companyId: string;
  maxUsers: number | null;
  maxWarehouses: number | null;
  maxBranches: number | null;
  expiresAtUtc: string | null;
}

export interface CompanyLicenseOverview extends CompanyLicense {
  usedUsers: number;
  usedWarehouses: number;
  usedBranches: number;
  remainingUsers?: number | null;
  remainingWarehouses?: number | null;
  remainingBranches?: number | null;
  adminUserName?: string | null;
  adminFullName?: string | null;
}

export interface CompanyQuotaDto {
  companyId: string;
  maxUsers: number | null;
  usedUsers: number;
  remainingUsers: number | null;
  maxWarehouses: number | null;
  usedWarehouses: number;
  remainingWarehouses: number | null;
  maxBranches: number | null;
  usedBranches: number;
  remainingBranches: number | null;
  expiresAtUtc: string | null;
  isExpired: boolean;
  daysRemaining: number | null;
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

  getLicenseOverview(): Observable<CompanyLicenseOverview[]> {
    return this.http.get<CompanyLicenseOverview[]>(`${this.apiUrl}/licenses`);
  }

  getCurrentLicenseQuota(): Observable<CompanyQuotaDto> {
    return this.http.get<CompanyQuotaDto>(`${this.apiUrl}/current/license-quota`);
  }

  setLicense(companyId: string, license: Omit<CompanyLicense, 'companyId'>): Observable<CompanyLicense> {
    return this.http.put<CompanyLicense>(`${this.apiUrl}/${companyId}/license`, license);
  }

  resetAdminPassword(companyId: string, newPassword?: string): Observable<{
    success: boolean;
    userName: string;
    fullName: string;
    companyNameAr: string;
    newPassword: string;
  }> {
    return this.http.post<{
      success: boolean;
      userName: string;
      fullName: string;
      companyNameAr: string;
      newPassword: string;
    }>(`${this.apiUrl}/${companyId}/reset-admin-password`, { newPassword });
  }
}
