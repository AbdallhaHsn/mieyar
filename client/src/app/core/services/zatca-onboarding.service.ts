import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ZatcaOnboardingStatus {
  configId: string;
  companyId: string;
  branchId?: string;
  deviceUuid: string;
  deviceName: string;
  environment: string; // Simulation, Production, Sandbox
  organizationName: string;
  organizationVatNumber: string;
  commonName: string;
  location: string;
  industry: string;
  invoiceType: string;
  status: string; // NotConfigured, CsrGenerated, CompliancePassed, ProductionActive
  hasPrivateKey: boolean;
  hasCsr: boolean;
  csrPem?: string;
  publicKeyPem?: string;
  complianceCsid?: string;
  compliancePassed: boolean;
  complianceCheckedAtUtc?: string;
  productionCsid?: string;
  productionIssuedAtUtc?: string;
  productionExpiresAtUtc?: string;
  currentStep: number;
}

export interface GenerateCsrRequest {
  companyId?: string;
  branchId?: string;
  deviceName: string;
  environment: string;
  organizationName: string;
  organizationVatNumber: string;
  commonName: string;
  location: string;
  industry: string;
  invoiceType?: string;
}

export interface GenerateCsrResponse {
  deviceUuid: string;
  privateKeyPem: string;
  publicKeyPem: string;
  csrPem: string;
  status: string;
}

export interface RequestComplianceCsidRequest {
  companyId?: string;
  deviceUuid: string;
  otp: string;
}

export interface ComplianceCsidResponse {
  binarySecurityToken: string;
  secret: string;
  requestId: string;
  status: string;
  success: boolean;
  message: string;
}

export interface RunComplianceChecksRequest {
  companyId?: string;
  deviceUuid: string;
}

export interface ComplianceChecksResult {
  standardInvoicePassed: boolean;
  simplifiedInvoicePassed: boolean;
  creditNotePassed: boolean;
  debitNotePassed: boolean;
  overallPassed: boolean;
  checkedAtUtc: string;
  checkLogs: string[];
}

export interface RequestProductionCsidRequest {
  companyId?: string;
  deviceUuid: string;
}

export interface ProductionCsidResponse {
  productionCertificate: string;
  productionSecret: string;
  productionRequestId: string;
  issuedAtUtc: string;
  expiresAtUtc: string;
  status: string;
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZatcaOnboardingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/zatca/onboarding`;

  getStatus(companyId?: string, deviceUuid?: string): Observable<ZatcaOnboardingStatus> {
    let url = `${this.apiUrl}/status`;
    const params: string[] = [];
    if (companyId) params.push(`companyId=${companyId}`);
    if (deviceUuid) params.push(`deviceUuid=${deviceUuid}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.http.get<ZatcaOnboardingStatus>(url);
  }

  generateCsr(payload: GenerateCsrRequest): Observable<GenerateCsrResponse> {
    return this.http.post<GenerateCsrResponse>(`${this.apiUrl}/generate-csr`, payload);
  }

  requestComplianceCsid(payload: RequestComplianceCsidRequest): Observable<ComplianceCsidResponse> {
    return this.http.post<ComplianceCsidResponse>(`${this.apiUrl}/request-compliance-csid`, payload);
  }

  runComplianceChecks(payload: RunComplianceChecksRequest): Observable<ComplianceChecksResult> {
    return this.http.post<ComplianceChecksResult>(`${this.apiUrl}/run-compliance-checks`, payload);
  }

  requestProductionCsid(payload: RequestProductionCsidRequest): Observable<ProductionCsidResponse> {
    return this.http.post<ProductionCsidResponse>(`${this.apiUrl}/request-production-csid`, payload);
  }

  reset(companyId?: string, deviceUuid?: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/reset`, { companyId, deviceUuid });
  }
}
