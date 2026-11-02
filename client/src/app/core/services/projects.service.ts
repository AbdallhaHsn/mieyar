import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompanyContextService } from './company-context.service';

export enum ProjectStatus {
  Planning = 0,
  Active = 1,
  OnHold = 2,
  Completed = 3,
  Cancelled = 4
}

export enum BillingStatus {
  Draft = 0,
  Submitted = 1,
  ConsultantApproved = 2,
  Certified = 3,
  Invoiced = 4,
  Rejected = 5
}

export enum GuaranteeType {
  BidBond = 0,
  PerformanceBond = 1,
  AdvancePaymentBond = 2,
  RetentionBond = 3,
  MaintenanceBond = 4
}

export enum GuaranteeStatus {
  Active = 0,
  Extended = 1,
  Released = 2,
  Claimed = 3,
  Expired = 4
}

export enum ProjectExpenseCategory {
  Materials = 0,
  Labor = 1,
  Subcontractors = 2,
  Equipment = 3,
  Overhead = 4,
  Other = 5
}

export interface ProjectDto {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  customerId: string;
  customerName: string;
  costCenterId?: string;
  costCenterName?: string;
  contractNumber: string;
  contractDate?: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  contractAmount: number;
  vatRate: number;
  totalContractWithVat: number;
  estimatedCost: number;
  retentionPercentage: number;
  advancePaymentAmount: number;
  advancePaymentDeductionPercentage: number;
  status: ProjectStatus;
  statusText: string;
  completionPercentage: number;
  projectManager?: string;
  siteLocation?: string;
  notes?: string;
  phasesCount: number;
  billingsCount: number;
  guaranteesCount: number;
  totalWorkCompletedAmount: number;
  totalBilledAmount: number;
  totalExpensesAmount: number;
  profitabilityAmount: number;
  profitMarginPercentage: number;
  costVariance: number;
  remainingContractAmount: number;
}

export interface ProjectPhaseDto {
  id: string;
  projectId: string;
  nameAr: string;
  nameEn: string;
  phaseOrder: number;
  startDate?: string;
  endDate?: string;
  estimatedCost: number;
  weightPercentage: number;
  completionPercentage: number;
  status: string;
  notes?: string;
}

export interface ContractProgressBillingDto {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  billingNumber: string;
  billingSequence: number;
  billingDate: string;
  periodStart: string;
  periodEnd: string;
  previousWorkAmount: number;
  currentWorkAmount: number;
  totalWorkAmount: number;
  retentionPercentage: number;
  retentionAmount: number;
  advancePaymentDeduction: number;
  otherDeductions: number;
  deductionsNotes?: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  status: BillingStatus;
  statusText: string;
  consultantName?: string;
  consultantApprovalDate?: string;
  consultantNotes?: string;
  associatedInvoiceId?: string;
  associatedInvoiceNumber?: string;
  associatedJournalEntryId?: string;
  associatedJournalEntryNumber?: string;
}

export interface LetterOfGuaranteeDto {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  guaranteeNumber: string;
  type: GuaranteeType;
  typeText: string;
  issuingBank: string;
  bankBranch?: string;
  bankAccountNumber?: string;
  beneficiaryName: string;
  amount: number;
  cashMarginPercentage: number;
  cashMarginAmount: number;
  bankCommission: number;
  issueDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: GuaranteeStatus;
  statusText: string;
  associatedJournalEntryId?: string;
  associatedJournalEntryNumber?: string;
  notes?: string;
}

export interface ProjectExpenseDto {
  id: string;
  companyId: string;
  projectId: string;
  phaseId?: string;
  phaseName?: string;
  expenseDate: string;
  category: ProjectExpenseCategory;
  categoryText: string;
  amount: number;
  description: string;
  supplierOrWorkerName?: string;
  referenceType?: string;
  referenceNumber?: string;
  referenceId?: string;
  notes?: string;
}

export interface ProjectsSummaryMetricsDto {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalContractAmount: number;
  totalEstimatedCost: number;
  totalBilledAmount: number;
  totalRetentionHeld: number;
  totalExpenses: number;
  totalNetProfit: number;
  averageProfitMargin: number;
  activeGuaranteesCount: number;
  totalActiveGuaranteesAmount: number;
  totalCashMarginHeldInBanks: number;
}

export interface ProjectDetailsDto extends ProjectDto {
  phases: ProjectPhaseDto[];
  billings: ContractProgressBillingDto[];
  guarantees: LetterOfGuaranteeDto[];
  expenses: ProjectExpenseDto[];
}

export type TimesheetEntryType = 'internal_labor' | 'subcontractor';
export type TimesheetUnit = 'hour' | 'sqm' | 'cum' | 'linear_m' | 'unit' | 'day' | 'lump_sum';

export interface ProjectTimesheetDto {
  id: string;
  companyId: string;
  projectId: string;
  projectName?: string;
  projectCode?: string;
  phaseId?: string;
  phaseName?: string;
  date: string;
  entryType: TimesheetEntryType;
  unitOfMeasure: TimesheetUnit;
  quantity: number;
  unitPrice: number;
  employeeName: string;
  employeeRole?: string;
  subcontractorName?: string;
  subcontractorContractNo?: string;
  retentionPercentage?: number;
  retentionAmount?: number;
  netPayable?: number;
  taskDescription: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
  isBillable: boolean;
  status: 'Draft' | 'Approved' | 'Posted';
  notes?: string;
}

export interface ProjectSettingsDto {
  companyId: string;
  defaultEntryType: TimesheetEntryType;
  defaultUnitOfMeasure: TimesheetUnit;
  defaultHourlyRate: number;
  defaultSqmRate: number;
  defaultCumRate: number;
  defaultLinearMRate: number;
  defaultDailyRate: number;
  defaultSubcontractorRetentionPct: number;
  autoPostToCosting: boolean;
  autoPostCategory: 'auto' | 'labor' | 'subcontractor';
  billableMarkupPercentage: number;
  requireSubcontractorContractNumber: boolean;

  // =========================================================================
  // Accounting GL Routing (التوجيه المحاسبي لقيود المستخلصات والمشاريع)
  // =========================================================================
  arAccountId?: string;
  arAccountCode?: string;
  arAccountName?: string;

  retentionAccountId?: string;
  retentionAccountCode?: string;
  retentionAccountName?: string;

  advancePaymentAccountId?: string;
  advancePaymentAccountCode?: string;
  advancePaymentAccountName?: string;

  revenueAccountId?: string;
  revenueAccountCode?: string;
  revenueAccountName?: string;

  vatAccountId?: string;
  vatAccountCode?: string;
  vatAccountName?: string;

  guaranteeMarginAccountId?: string;
  guaranteeMarginAccountCode?: string;
  guaranteeMarginAccountName?: string;

  guaranteeCommissionAccountId?: string;
  guaranteeCommissionAccountCode?: string;
  guaranteeCommissionAccountName?: string;
}

export interface GanttTaskItem {
  id: string;
  companyId: string;
  projectId: string;
  projectName?: string;
  projectCode?: string;
  phaseId?: string;
  titleAr: string;
  titleEn: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  progressPercentage: number;
  assignedTo?: string;
  assignedRole?: string;
  isMilestone: boolean;
  status: 'Planned' | 'InProgress' | 'Completed' | 'Delayed';
  predecessorId?: string;
  estimatedCost?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);
  private baseUrl = `${environment.apiUrl}/api/projects`;

  private getEffectiveCompanyId(companyId?: string): string {
    return companyId || this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
  }

  getSummaryMetrics(companyId?: string): Observable<ProjectsSummaryMetricsDto> {
    const params = new HttpParams().set('companyId', this.getEffectiveCompanyId(companyId));
    return this.http.get<ProjectsSummaryMetricsDto>(`${this.baseUrl}/summary`, { params });
  }

  getProjects(search?: string, companyId?: string): Observable<ProjectDto[]> {
    let params = new HttpParams().set('companyId', this.getEffectiveCompanyId(companyId));
    if (search) params = params.set('search', search);
    return this.http.get<ProjectDto[]>(this.baseUrl, { params });
  }

  getProjectById(id: string): Observable<ProjectDetailsDto> {
    return this.http.get<ProjectDetailsDto>(`${this.baseUrl}/${id}`);
  }

  createProject(data: any): Observable<ProjectDto> {
    const payload = {
      ...data,
      companyId: this.getEffectiveCompanyId(data.companyId)
    };
    return this.http.post<ProjectDto>(this.baseUrl, payload);
  }

  updateProject(id: string, data: any): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/${id}`, data);
  }

  updateProjectStatus(id: string, status: ProjectStatus, actualEndDate?: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/${id}/status`, { status, actualEndDate });
  }

  addPhase(projectId: string, data: any): Observable<ProjectPhaseDto> {
    return this.http.post<ProjectPhaseDto>(`${this.baseUrl}/${projectId}/phases`, data);
  }

  updatePhaseProgress(projectId: string, phaseId: string, completionPercentage: number, status?: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/${projectId}/phases/${phaseId}/progress`, {
      completionPercentage,
      status
    });
  }

  addExpense(projectId: string, data: any): Observable<ProjectExpenseDto> {
    const payload = {
      ...data,
      companyId: this.getEffectiveCompanyId(data.companyId)
    };
    return this.http.post<ProjectExpenseDto>(`${this.baseUrl}/${projectId}/expenses`, payload);
  }

  // Progress Billings
  getBillings(projectId?: string, companyId?: string): Observable<ContractProgressBillingDto[]> {
    let params = new HttpParams().set('companyId', this.getEffectiveCompanyId(companyId));
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get<ContractProgressBillingDto[]>(`${this.baseUrl}/billings`, { params });
  }

  createBilling(data: any): Observable<ContractProgressBillingDto> {
    const payload = {
      ...data,
      companyId: this.getEffectiveCompanyId(data.companyId)
    };
    return this.http.post<ContractProgressBillingDto>(`${this.baseUrl}/billings`, payload);
  }

  submitBilling(id: string, consultantName?: string, notes?: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/billings/${id}/submit`, { consultantName, notes });
  }

  approveBilling(id: string, consultantName: string, notes?: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/billings/${id}/approve`, { consultantName, notes });
  }

  certifyBilling(
    id: string, 
    postGlEntry: boolean = true,
    routing?: {
      arAccountId?: string;
      retentionAccountId?: string;
      advancePaymentAccountId?: string;
      revenueAccountId?: string;
      vatAccountId?: string;
    }
  ): Observable<ContractProgressBillingDto> {
    return this.http.post<ContractProgressBillingDto>(`${this.baseUrl}/billings/${id}/certify`, {
      postGlEntry,
      arAccountId: routing?.arAccountId,
      retentionAccountId: routing?.retentionAccountId,
      advancePaymentAccountId: routing?.advancePaymentAccountId,
      revenueAccountId: routing?.revenueAccountId,
      vatAccountId: routing?.vatAccountId
    });
  }

  // Letters of Guarantee
  getGuarantees(projectId?: string, companyId?: string): Observable<LetterOfGuaranteeDto[]> {
    let params = new HttpParams().set('companyId', this.getEffectiveCompanyId(companyId));
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get<LetterOfGuaranteeDto[]>(`${this.baseUrl}/guarantees`, { params });
  }

  createGuarantee(data: any): Observable<LetterOfGuaranteeDto> {
    const payload = {
      ...data,
      companyId: this.getEffectiveCompanyId(data.companyId)
    };
    return this.http.post<LetterOfGuaranteeDto>(`${this.baseUrl}/guarantees`, payload);
  }

  extendGuarantee(id: string, newExpiryDate: string, additionalCommission: number = 0, notes?: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/guarantees/${id}/extend`, {
      newExpiryDate,
      additionalCommission,
      notes
    });
  }

  releaseGuarantee(id: string, notes?: string, postReleaseGl: boolean = true): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/guarantees/${id}/release`, {
      notes,
      postReleaseGl
    });
  }

  // =========================================================================
  // Project Settings & Timesheets (سجل ساعات وأعمال الميدان ومقاولو الباطن)
  // =========================================================================
  private getTimesheetsStorageKey(): string {
    return `alrobban_timesheets_${this.getEffectiveCompanyId()}`;
  }

  private getSettingsStorageKey(companyId?: string): string {
    return `alrobban_project_settings_${this.getEffectiveCompanyId(companyId)}`;
  }

  getProjectSettings(companyId?: string): Observable<ProjectSettingsDto> {
    const key = this.getSettingsStorageKey(companyId);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure GL account defaults exist if missing
        if (!parsed.arAccountCode) parsed.arAccountCode = '11301';
        if (!parsed.arAccountName) parsed.arAccountName = 'العملاء والمدينون التجاريون';
        if (!parsed.retentionAccountCode) parsed.retentionAccountCode = '11303';
        if (!parsed.retentionAccountName) parsed.retentionAccountName = 'تأمينات وضمان أعمال محتجزة';
        if (!parsed.advancePaymentAccountCode) parsed.advancePaymentAccountCode = '21302';
        if (!parsed.advancePaymentAccountName) parsed.advancePaymentAccountName = 'دفعات مقدمة من العملاء';
        if (!parsed.revenueAccountCode) parsed.revenueAccountCode = '41103';
        if (!parsed.revenueAccountName) parsed.revenueAccountName = 'إيرادات عقود ومشاريع مقاولات';
        if (!parsed.vatAccountCode) parsed.vatAccountCode = '21201';
        if (!parsed.vatAccountName) parsed.vatAccountName = 'ضريبة القيمة المضافة المحصلة (مخرجات 15%)';
        if (!parsed.guaranteeMarginAccountCode) parsed.guaranteeMarginAccountCode = '11204';
        if (!parsed.guaranteeMarginAccountName) parsed.guaranteeMarginAccountName = 'تأمينات نقدية لخطابات الضمان لدى البنوك';
        if (!parsed.guaranteeCommissionAccountCode) parsed.guaranteeCommissionAccountCode = '53102';
        if (!parsed.guaranteeCommissionAccountName) parsed.guaranteeCommissionAccountName = 'عمولات ومصاريف إصدار خطابات الضمان';
        return of(parsed);
      } catch (e) {
        // fallback
      }
    }

    const defaultSettings: ProjectSettingsDto = {
      companyId: this.getEffectiveCompanyId(companyId),
      defaultEntryType: 'internal_labor',
      defaultUnitOfMeasure: 'hour',
      defaultHourlyRate: 150,
      defaultSqmRate: 45,
      defaultCumRate: 120,
      defaultLinearMRate: 35,
      defaultDailyRate: 350,
      defaultSubcontractorRetentionPct: 10,
      autoPostToCosting: true,
      autoPostCategory: 'auto',
      billableMarkupPercentage: 15,
      requireSubcontractorContractNumber: true,

      // Default Standard Accounts
      arAccountCode: '11301',
      arAccountName: 'العملاء والمدينون التجاريون',
      retentionAccountCode: '11303',
      retentionAccountName: 'تأمينات وضمان أعمال محتجزة',
      advancePaymentAccountCode: '21302',
      advancePaymentAccountName: 'دفعات مقدمة من العملاء',
      revenueAccountCode: '41103',
      revenueAccountName: 'إيرادات عقود ومشاريع مقاولات',
      vatAccountCode: '21201',
      vatAccountName: 'ضريبة القيمة المضافة المحصلة (مخرجات 15%)',
      guaranteeMarginAccountCode: '11204',
      guaranteeMarginAccountName: 'تأمينات نقدية لخطابات الضمان لدى البنوك',
      guaranteeCommissionAccountCode: '53102',
      guaranteeCommissionAccountName: 'عمولات ومصاريف إصدار خطابات الضمان'
    };
    localStorage.setItem(key, JSON.stringify(defaultSettings));
    return of(defaultSettings);
  }

  saveProjectSettings(settings: ProjectSettingsDto): Observable<ProjectSettingsDto> {
    const key = this.getSettingsStorageKey(settings.companyId);
    localStorage.setItem(key, JSON.stringify(settings));
    return of(settings);
  }

  getTimesheets(projectId?: string, companyId?: string): Observable<ProjectTimesheetDto[]> {
    const key = `alrobban_timesheets_${this.getEffectiveCompanyId(companyId)}`;
    const stored = localStorage.getItem(key);
    let list: ProjectTimesheetDto[] = stored ? JSON.parse(stored) : [];

    if (list.length === 0 && this.companyContext.isDemoCompany(this.getEffectiveCompanyId(companyId))) {
      // Seed default professional timesheets for the active company
      list = [
        {
          id: 'ts-001',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: projectId || '411db7fc-d532-4ed4-8311-d7b0890a177f',
          projectName: 'مشروع برج المحيط الذكي للأعمال والمؤتمرات',
          projectCode: 'PRJ-2026-0001',
          phaseName: 'الهيكل الإنشائي والخرسانات المسلحة للأدوار المتكررة',
          date: '2026-10-25',
          entryType: 'internal_labor',
          unitOfMeasure: 'hour',
          quantity: 8.5,
          unitPrice: 180,
          employeeName: 'م. طارق السعيد',
          employeeRole: 'مدير الموقع الإنشائي',
          taskDescription: 'إشراف ميداني على صب بلاطة الدور الخامس وفحص اختبارات الهبوط ومعاينة حديد التسليح',
          hours: 8.5,
          hourlyRate: 180,
          totalCost: 1530,
          isBillable: true,
          status: 'Approved',
          notes: 'مطابق لمواصفات كود البناء السعودي'
        },
        {
          id: 'ts-002',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: projectId || '411db7fc-d532-4ed4-8311-d7b0890a177f',
          projectName: 'مشروع برج المحيط الذكي للأعمال والمؤتمرات',
          projectCode: 'PRJ-2026-0001',
          phaseName: 'الواجهات والتشطيبات الداخلية',
          date: '2026-10-26',
          entryType: 'subcontractor',
          unitOfMeasure: 'sqm',
          quantity: 350,
          unitPrice: 42,
          employeeName: 'أبو أحمد - مقاول الباطن',
          employeeRole: 'مقاول باطن أعمال اللياسة والدهانات',
          subcontractorName: 'شركة النخبة للتشطيبات والمقاولات',
          subcontractorContractNo: 'SUB-2026-088',
          retentionPercentage: 10,
          retentionAmount: 1470,
          netPayable: 13230,
          taskDescription: 'تنفيذ أعمال اللياسة الإسمنتية وتنعيم جدران الأدوار 3 و 4 مع معالجة الفواصل',
          hours: 350,
          hourlyRate: 42,
          totalCost: 14700,
          isBillable: true,
          status: 'Approved',
          notes: 'تم فحص استواء الأسطح بواسطة القدة وميزان الماء'
        },
        {
          id: 'ts-003',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: projectId || '07108216-e3cb-4b34-94ee-754c50dbe6aa',
          projectName: 'مشروع مجمع مستودعات الخمرة اللوجستية الحديثة',
          projectCode: 'PRJ-2026-0002',
          phaseName: 'الحفريات والأساسات الخرسانية',
          date: '2026-10-26',
          entryType: 'subcontractor',
          unitOfMeasure: 'cum',
          quantity: 110,
          unitPrice: 195,
          employeeName: 'م. سالم باوزير',
          employeeRole: 'مقاول باطن صب خرسانات',
          subcontractorName: 'مؤسسة الرمال الذهبية للخرسانة الجاهزة',
          subcontractorContractNo: 'SUB-2026-104',
          retentionPercentage: 5,
          retentionAmount: 1072.5,
          netPayable: 20377.5,
          taskDescription: 'توريد وصب خرسانة مقاومة للأملاح C35 لقواعد المستودع رقم 2 مع الهز الميكانيكي',
          hours: 110,
          hourlyRate: 195,
          totalCost: 21450,
          isBillable: true,
          status: 'Approved'
        },
        {
          id: 'ts-004',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: projectId || '411db7fc-d532-4ed4-8311-d7b0890a177f',
          projectName: 'مشروع برج المحيط الذكي للأعمال والمؤتمرات',
          projectCode: 'PRJ-2026-0001',
          phaseName: 'الأنظمة الكهروميكانيكية MEP',
          date: '2026-10-26',
          entryType: 'internal_labor',
          unitOfMeasure: 'hour',
          quantity: 7.0,
          unitPrice: 160,
          employeeName: 'م. خالد القحطاني',
          employeeRole: 'مهندس أنظمة كهروميكانيكية',
          taskDescription: 'تدقيق وتنسيق مسارات دكتات التكييف المركزي وتمديدات شبكة الإطفاء ومطابقتها مع المخططات',
          hours: 7.0,
          hourlyRate: 160,
          totalCost: 1120,
          isBillable: true,
          status: 'Approved'
        },
        {
          id: 'ts-005',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: projectId || 'a2c765a4-ed55-4312-a2a5-da18f4f74452',
          projectName: 'مشروع إنشاء وتجهيز المجمع الطبي التخصصي',
          projectCode: 'PRJ-2026-0003',
          phaseName: 'تمديدات الشبكات الطبية والكهربائية',
          date: '2026-10-27',
          entryType: 'subcontractor',
          unitOfMeasure: 'linear_m',
          quantity: 480,
          unitPrice: 28,
          employeeName: 'فني أول تمديدات',
          employeeRole: 'مقاول باطن تمديد كابلات',
          subcontractorName: 'شركة التقنية الحديثة للتمديدات',
          subcontractorContractNo: 'SUB-2026-112',
          retentionPercentage: 5,
          retentionAmount: 672,
          netPayable: 12768,
          taskDescription: 'سحب وتمديد كابلات الجهد المنخفض داخل المواسير المعزولة حتى لوحات التوزيع الفرعية',
          hours: 480,
          hourlyRate: 28,
          totalCost: 13440,
          isBillable: true,
          status: 'Posted'
        }
      ];
      localStorage.setItem(key, JSON.stringify(list));
    }

    if (projectId) {
      list = list.filter(t => t.projectId === projectId);
    }
    return of(list);
  }

  addTimesheet(entry: Partial<ProjectTimesheetDto>): Observable<ProjectTimesheetDto> {
    const key = this.getTimesheetsStorageKey();
    const stored = localStorage.getItem(key);
    const list: ProjectTimesheetDto[] = stored ? JSON.parse(stored) : [];

    const unit = entry.unitOfMeasure || 'hour';
    const quantity = Number(entry.quantity ?? entry.hours) || 0;
    const unitPrice = Number(entry.unitPrice ?? entry.hourlyRate) || 0;
    const totalCost = quantity * unitPrice;
    const retentionPercentage = Number(entry.retentionPercentage) || 0;
    const retentionAmount = totalCost * (retentionPercentage / 100);
    const netPayable = totalCost - retentionAmount;

    const newEntry: ProjectTimesheetDto = {
      id: entry.id || `ts-${Date.now()}`,
      companyId: this.getEffectiveCompanyId(),
      projectId: entry.projectId || '',
      projectName: entry.projectName || '',
      projectCode: entry.projectCode || '',
      phaseId: entry.phaseId,
      phaseName: entry.phaseName || '',
      date: entry.date || new Date().toISOString().split('T')[0],
      entryType: entry.entryType || 'internal_labor',
      unitOfMeasure: unit,
      quantity: quantity,
      unitPrice: unitPrice,
      employeeName: entry.employeeName || (entry.entryType === 'subcontractor' ? 'ممثل مقاول الباطن' : 'مهندس الموقع'),
      employeeRole: entry.employeeRole || (entry.entryType === 'subcontractor' ? 'مقاول أعمال تخصصية' : 'مهندس مشاريع'),
      subcontractorName: entry.subcontractorName || '',
      subcontractorContractNo: entry.subcontractorContractNo || '',
      retentionPercentage: retentionPercentage,
      retentionAmount: retentionAmount,
      netPayable: netPayable,
      taskDescription: entry.taskDescription || '',
      hours: unit === 'hour' ? quantity : (Number(entry.hours) || 0),
      hourlyRate: unit === 'hour' ? unitPrice : (Number(entry.hourlyRate) || 0),
      totalCost: totalCost,
      isBillable: entry.isBillable ?? true,
      status: entry.status || 'Approved',
      notes: entry.notes || ''
    };

    list.unshift(newEntry);
    localStorage.setItem(key, JSON.stringify(list));
    return of(newEntry);
  }

  deleteTimesheet(id: string): Observable<{ success: boolean }> {
    const key = this.getTimesheetsStorageKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      let list: ProjectTimesheetDto[] = JSON.parse(stored);
      list = list.filter(t => t.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
    }
    return of({ success: true });
  }

  // =========================================================================
  // Planning & Gantt Timeline (التخطيط والجدولة الزمنية - MS Project Style)
  // =========================================================================
  private getPlanningStorageKey(): string {
    return `alrobban_planning_${this.getEffectiveCompanyId()}`;
  }

  getPlanningTasks(projectId?: string, companyId?: string): Observable<GanttTaskItem[]> {
    const key = `alrobban_planning_${this.getEffectiveCompanyId(companyId)}`;
    const stored = localStorage.getItem(key);
    let list: GanttTaskItem[] = stored ? JSON.parse(stored) : [];

    if (list.length === 0 && this.companyContext.isDemoCompany(this.getEffectiveCompanyId(companyId))) {
      list = [
        {
          id: 'tsk-001',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: '411db7fc-d532-4ed4-8311-d7b0890a177f',
          projectName: 'مشروع برج المحيط الذكي للأعمال والمؤتمرات',
          projectCode: 'PRJ-2026-0001',
          titleAr: 'أعمال الحفريات ونزح المياه والأساسات الخازوقية العميقة',
          titleEn: 'Deep Excavation, Dewatering & Piling Foundations',
          startDate: '2026-01-10',
          endDate: '2026-03-15',
          durationDays: 64,
          progressPercentage: 100,
          assignedTo: 'م. طارق السعيد',
          assignedRole: 'مدير الموقع الإنشائي',
          isMilestone: true,
          status: 'Completed',
          estimatedCost: 1200000
        },
        {
          id: 'tsk-002',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: '411db7fc-d532-4ed4-8311-d7b0890a177f',
          projectName: 'مشروع برج المحيط الذكي للأعمال والمؤتمرات',
          projectCode: 'PRJ-2026-0001',
          titleAr: 'صب الهيكل الخرساني والأدوار المتكررة حتى الدور الخامس',
          titleEn: 'Reinforced Concrete Framework & Upper Floors',
          startDate: '2026-03-16',
          endDate: '2026-07-20',
          durationDays: 126,
          progressPercentage: 65,
          assignedTo: 'م. طارق السعيد',
          assignedRole: 'مدير الموقع الإنشائي',
          isMilestone: false,
          status: 'InProgress',
          estimatedCost: 2100000
        },
        {
          id: 'tsk-003',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: '411db7fc-d532-4ed4-8311-d7b0890a177f',
          projectName: 'مشروع برج المحيط الذكي للأعمال والمؤتمرات',
          projectCode: 'PRJ-2026-0001',
          titleAr: 'توريد وتركيب الواجهات الزجاجية الذكية المزدوجة (Double Glazing)',
          titleEn: 'Smart Curtain Wall & Double Glazing Installation',
          startDate: '2026-07-01',
          endDate: '2026-10-15',
          durationDays: 106,
          progressPercentage: 20,
          assignedTo: 'م. خالد المنصور',
          assignedRole: 'مهندس الواجهات والتصميم',
          isMilestone: false,
          status: 'InProgress',
          estimatedCost: 950000
        },
        {
          id: 'tsk-004',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: '411db7fc-d532-4ed4-8311-d7b0890a177f',
          projectName: 'مشروع برج المحيط الذكي للأعمال والمؤتمرات',
          projectCode: 'PRJ-2026-0001',
          titleAr: 'تمديدات الأنظمة الكهروميكانيكية والتكييف المركزي وشبكة الإطفاء MEP',
          titleEn: 'MEP Infrastructure, HVAC & Firefighting Systems',
          startDate: '2026-08-01',
          endDate: '2026-11-30',
          durationDays: 121,
          progressPercentage: 10,
          assignedTo: 'م. خالد القحطاني',
          assignedRole: 'مهندس أنظمة كهروميكانيكية',
          isMilestone: false,
          status: 'Planned',
          estimatedCost: 850000
        },
        {
          id: 'tsk-005',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: '411db7fc-d532-4ed4-8311-d7b0890a177f',
          projectName: 'مشروع برج المحيط الذكي للأعمال والمؤتمرات',
          projectCode: 'PRJ-2026-0001',
          titleAr: 'التسليم الابتدائي وإطلاق التيار الكهربائي واختبارات التشغيل',
          titleEn: 'Primary Handover, Power Energization & Commissioning',
          startDate: '2026-12-01',
          endDate: '2026-12-31',
          durationDays: 30,
          progressPercentage: 0,
          assignedTo: 'م. طارق السعيد',
          assignedRole: 'مدير الموقع الإنشائي',
          isMilestone: true,
          status: 'Planned',
          estimatedCost: 150000
        },
        // Project 2: مستودعات الخمرة
        {
          id: 'tsk-006',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: '07108216-e3cb-4b34-94ee-754c50dbe6aa',
          projectName: 'مشروع مجمع مستودعات الخمرة اللوجستية الحديثة',
          projectCode: 'PRJ-2026-0002',
          titleAr: 'أعمال تسوية الموقع والردم الهندسي والقواعد الخرسانية',
          titleEn: 'Site Earthworks, Compaction & Concrete Footings',
          startDate: '2026-02-01',
          endDate: '2026-04-10',
          durationDays: 68,
          progressPercentage: 100,
          assignedTo: 'م. بدر الحربي',
          assignedRole: 'مدير المشروع اللوجستي',
          isMilestone: true,
          status: 'Completed',
          estimatedCost: 900000
        },
        {
          id: 'tsk-007',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: '07108216-e3cb-4b34-94ee-754c50dbe6aa',
          projectName: 'مشروع مجمع مستودعات الخمرة اللوجستية الحديثة',
          projectCode: 'PRJ-2026-0002',
          titleAr: 'توريد وتركيب الهياكل الفولاذية وساندوتش بانل عازل للحرارة',
          titleEn: 'Steel Structure Fabrication & Insulated Sandwich Panels',
          startDate: '2026-04-15',
          endDate: '2026-07-31',
          durationDays: 107,
          progressPercentage: 50,
          assignedTo: 'م. بدر الحربي',
          assignedRole: 'مدير المشروع اللوجستي',
          isMilestone: false,
          status: 'InProgress',
          estimatedCost: 1200000
        },
        {
          id: 'tsk-008',
          companyId: this.getEffectiveCompanyId(companyId),
          projectId: '07108216-e3cb-4b34-94ee-754c50dbe6aa',
          projectName: 'مشروع مجمع مستودعات الخمرة اللوجستية الحديثة',
          projectCode: 'PRJ-2026-0002',
          titleAr: 'صب الأرضيات الخرسانية الليزرية فائقة الاستواء سيكريت',
          titleEn: 'Laser Screed Industrial Flooring & Surface Hardener',
          startDate: '2026-08-01',
          endDate: '2026-09-30',
          durationDays: 60,
          progressPercentage: 0,
          assignedTo: 'م. بدر الحربي',
          assignedRole: 'مدير المشروع اللوجستي',
          isMilestone: false,
          status: 'Planned',
          estimatedCost: 800000
        }
      ];
      localStorage.setItem(key, JSON.stringify(list));
    }

    if (projectId) {
      list = list.filter(t => t.projectId === projectId);
    }
    return of(list);
  }

  savePlanningTask(task: Partial<GanttTaskItem>): Observable<GanttTaskItem> {
    const key = this.getPlanningStorageKey();
    const stored = localStorage.getItem(key);
    let list: GanttTaskItem[] = stored ? JSON.parse(stored) : [];

    const existingIndex = list.findIndex(t => t.id === task.id);
    let duration = 30;
    if (task.startDate && task.endDate) {
      const start = new Date(task.startDate).getTime();
      const end = new Date(task.endDate).getTime();
      duration = Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)));
    }

    const item: GanttTaskItem = {
      id: task.id || `tsk-${Date.now()}`,
      companyId: this.getEffectiveCompanyId(),
      projectId: task.projectId || '',
      projectName: task.projectName || '',
      projectCode: task.projectCode || '',
      phaseId: task.phaseId,
      titleAr: task.titleAr || '',
      titleEn: task.titleEn || task.titleAr || '',
      startDate: task.startDate || new Date().toISOString().split('T')[0],
      endDate: task.endDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      durationDays: duration,
      progressPercentage: Number(task.progressPercentage) || 0,
      assignedTo: task.assignedTo || 'فريق العمل الإنشائي',
      assignedRole: task.assignedRole || 'مهندس الموقع',
      isMilestone: task.isMilestone ?? false,
      status: task.status || (Number(task.progressPercentage) >= 100 ? 'Completed' : Number(task.progressPercentage) > 0 ? 'InProgress' : 'Planned'),
      predecessorId: task.predecessorId,
      estimatedCost: Number(task.estimatedCost) || 0,
      notes: task.notes || ''
    };

    if (existingIndex >= 0) {
      list[existingIndex] = item;
    } else {
      list.push(item);
    }

    localStorage.setItem(key, JSON.stringify(list));
    return of(item);
  }

  deletePlanningTask(id: string): Observable<{ success: boolean }> {
    const key = this.getPlanningStorageKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      let list: GanttTaskItem[] = JSON.parse(stored);
      list = list.filter(t => t.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
    }
    return of({ success: true });
  }

  updateTaskProgress(taskId: string, progress: number): Observable<{ success: boolean }> {
    const key = this.getPlanningStorageKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      const list: GanttTaskItem[] = JSON.parse(stored);
      const task = list.find(t => t.id === taskId);
      if (task) {
        task.progressPercentage = Math.max(0, Math.min(100, progress));
        task.status = task.progressPercentage >= 100 ? 'Completed' : task.progressPercentage > 0 ? 'InProgress' : 'Planned';
        localStorage.setItem(key, JSON.stringify(list));
      }
    }
    return of({ success: true });
  }
}
