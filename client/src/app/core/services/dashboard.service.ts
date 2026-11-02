import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyContextService } from './company-context.service';
import { environment } from '../../../environments/environment';

export interface DashboardKpiCardDto {
  titleAr: string;
  titleEn: string;
  amount: number;
  formattedAmount: string;
  trend: string;
  isPositive: boolean;
  accent: 'green' | 'cyan';
}

export interface RecentJournalEntrySummaryDto {
  voucherNo: string;
  date: string;
  descriptionAr: string;
  descriptionEn: string;
  amount: number;
  formattedAmount: string;
  branchAr: string;
  branchEn: string;
  status: 'Posted' | 'Draft';
}

export interface RecentInvoiceSummaryDto {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  totalAmount: number;
  formattedAmount: string;
  statusNameAr: string;
  paymentStatusNameAr: string;
}

export interface DashboardSummaryDto {
  companyId: string;
  generatedAtUtc: string;
  revenueCard: DashboardKpiCardDto;
  expensesCard: DashboardKpiCardDto;
  operatingProfitCard: DashboardKpiCardDto;
  vatCard: DashboardKpiCardDto;
  liquidityCard: DashboardKpiCardDto;
  receivablesCard: DashboardKpiCardDto;
  payablesCard: DashboardKpiCardDto;
  // ZATCA Metrics
  totalInvoicesCount: number;
  totalInvoicesVolume: number;
  clearedInvoicesCount: number;
  reportedInvoicesCount: number;
  draftInvoicesCount: number;
  complianceRate: number;
  avgSigningLatencyMs: number;
  // Operational Metrics
  totalVouchersCount: number;
  totalReceiptsAmount: number;
  totalPaymentsAmount: number;
  totalPurchaseInvoicesCount: number;
  totalPurchaseInvoicesVolume: number;
  // Feeds
  recentEntries: RecentJournalEntrySummaryDto[];
  recentInvoices: RecentInvoiceSummaryDto[];
}

export interface EnterpriseAuditLogDto {
  id: string;
  moduleAr: string;
  moduleEn: string;
  actionAr: string;
  actionEn: string;
  referenceNumber: string;
  timestamp: string;
  formattedTimestamp: string;
  actor: string;
  amount?: number;
  formattedAmount: string;
  description: string;
  statusBadge: string;
  badgeSeverity: 'success' | 'info' | 'warning' | 'danger';
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);
  private readonly apiUrl = `${environment.apiUrl}/api/dashboard`;

  getSummary(companyId?: string): Observable<DashboardSummaryDto> {
    const cid = companyId || this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
    let params = new HttpParams();
    if (cid) {
      params = params.set('companyId', cid);
    }
    return this.http.get<DashboardSummaryDto>(`${this.apiUrl}/summary`, { params });
  }

  getAuditLogs(module?: string, search?: string, take: number = 50, companyId?: string): Observable<EnterpriseAuditLogDto[]> {
    const cid = companyId || this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
    let params = new HttpParams().set('companyId', cid).set('take', take.toString());
    if (module) params = params.set('module', module);
    if (search) params = params.set('search', search);
    return this.http.get<EnterpriseAuditLogDto[]>(`${this.apiUrl}/audit-logs`, { params });
  }
}
