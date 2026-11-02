import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CompanyUserDto {
  id: string;
  tenantId?: string;
  userName: string;
  email: string;
  fullNameAr: string;
  fullNameEn: string;
  phoneNumber?: string;
  role: number;
  roleNameAr: string;
  roleNameEn: string;
  companyRoleId?: string;
  companyRoleCode?: string;
  companyRoleNameAr?: string;
  companyRoleNameEn?: string;
  branchId?: string;
  branchNameAr?: string;
  branchNameEn?: string;
  isActive: boolean;
  lastLoginUtc?: string;
  createdAtUtc: string;
}

export interface CreateCompanyUserRequest {
  userName: string;
  email: string;
  password: string;
  fullNameAr: string;
  fullNameEn: string;
  phoneNumber?: string;
  role: number;
  companyRoleId?: string;
  branchId?: string;
}

export interface UpdateCompanyUserRequest {
  fullNameAr: string;
  fullNameEn: string;
  phoneNumber?: string;
  role: number;
  companyRoleId?: string;
  branchId?: string;
  isActive: boolean;
}

export interface CompanyRoleDto {
  id: string;
  tenantId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  isSystemRole: boolean;
  permissions: string[];
  assignedUsersCount: number;
  createdAtUtc: string;
}

export interface CreateRoleRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  permissions: string[];
}

export interface PermissionItemDto {
  key: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
}

export interface PermissionModuleDto {
  moduleKey: string;
  moduleNameAr: string;
  moduleNameEn: string;
  icon: string;
  permissions: PermissionItemDto[];
}

@Injectable({
  providedIn: 'root'
})
export class UsersAndRolesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/iam`;

  // --- USERS API ---
  getUsers(): Observable<CompanyUserDto[]> {
    return this.http.get<CompanyUserDto[]>(`${this.baseUrl}/users`);
  }

  createUser(req: CreateCompanyUserRequest): Observable<CompanyUserDto> {
    return this.http.post<CompanyUserDto>(`${this.baseUrl}/users`, req);
  }

  updateUser(id: string, req: UpdateCompanyUserRequest): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/users/${id}`, req);
  }

  resetPassword(id: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/users/${id}/reset-password`, { newPassword });
  }

  toggleUserStatus(id: string, isActive: boolean): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.baseUrl}/users/${id}/toggle-status`, { isActive });
  }

  // --- ROLES & PERMISSIONS API ---
  getRoles(): Observable<CompanyRoleDto[]> {
    return this.http.get<CompanyRoleDto[]>(`${this.baseUrl}/roles`);
  }

  getPermissionsCatalog(): Observable<PermissionModuleDto[]> {
    return this.http.get<PermissionModuleDto[]>(`${this.baseUrl}/roles/permissions-catalog`);
  }

  createRole(req: CreateRoleRequest): Observable<CompanyRoleDto> {
    return this.http.post<CompanyRoleDto>(`${this.baseUrl}/roles`, req);
  }

  updateRole(id: string, req: UpdateRoleRequest): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/roles/${id}`, req);
  }

  deleteRole(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/roles/${id}`);
  }
}
