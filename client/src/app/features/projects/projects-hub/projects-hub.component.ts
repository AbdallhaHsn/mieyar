import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  ProjectsService,
  ProjectDto,
  ProjectDetailsDto,
  ContractProgressBillingDto,
  LetterOfGuaranteeDto,
  ProjectsSummaryMetricsDto,
  ProjectStatus,
  BillingStatus,
  GuaranteeType,
  GuaranteeStatus,
  ProjectExpenseCategory,
  ProjectTimesheetDto,
  GanttTaskItem,
  ProjectSettingsDto,
  TimesheetEntryType,
  TimesheetUnit
} from '../../../core/services/projects.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { environment } from '../../../../environments/environment';

import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChartOfAccountsService } from '../../../core/services/chart-of-accounts.service';
import { AccountDto } from '../../../core/models/account.model';

export type ProjectsViewMode =
  | 'hub'
  | 'project-form'
  | 'project-workspace'
  | 'billing-form'
  | 'guarantee-form'
  | 'engineer-report';

interface PartnerOption {
  id: string;
  code?: string;
  nameAr: string;
  nameEn?: string;
  partnerType?: number;
}

@Component({
  selector: 'app-projects-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent, TranslatePipe],
  templateUrl: './projects-hub.component.html',
  styleUrls: ['./projects-hub.component.scss']
})
export class ProjectsHubComponent implements OnInit {
  public langService = inject(LanguageService);
  private projectsService = inject(ProjectsService);
  public translator = inject(AccountingTranslatorService);
  private companyContext = inject(CompanyContextService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private coaService = inject(ChartOfAccountsService);

  // Active Main View Mode: Inline Workspace Architecture (ZERO POPUPS)
  viewMode: ProjectsViewMode = 'hub';

  // Active Workspace Sub-Tab inside Project Command Center
  workspaceTab: 'overview' | 'wbs' | 'planning' | 'timesheet' | 'costs' | 'billings' | 'guarantees' = 'overview';

  // Active Tab in Hub: 'projects' | 'planning' | 'timesheet' | 'billings' | 'guarantees' | 'settings'
  activeTab: 'projects' | 'planning' | 'timesheet' | 'billings' | 'guarantees' | 'settings' = 'projects';

  // State
  isLoading = false;
  metrics: ProjectsSummaryMetricsDto | null = null;
  projects: ProjectDto[] = [];
  filteredProjects: ProjectDto[] = [];
  billings: ContractProgressBillingDto[] = [];
  guarantees: LetterOfGuaranteeDto[] = [];
  timesheets: ProjectTimesheetDto[] = [];
  planningTasks: GanttTaskItem[] = [];
  customers: PartnerOption[] = [];
  customerOptions: SelectOption[] = [];
  availableAccounts: AccountDto[] = [];
  postableAccountOptions: SelectOption[] = [];
  Math = Math;

  // Project Contracting & Pricing Settings (إعدادات تسعير ومقاولات المشاريع)
  projectSettings: ProjectSettingsDto = {
    companyId: '',
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

    // Standard Default Accounts for GL Routing
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

  // Pagination for Projects List
  projectsCurrentPage = 1;
  projectsPageSize = 6;
  pageSizeOptions = [6, 12, 24, 48];

  // Pagination for Billings Tab
  billingsCurrentPage = 1;
  billingsPageSize = 8;

  // Pagination for Guarantees Tab
  guaranteesCurrentPage = 1;
  guaranteesPageSize = 8;

  // Search & Filters
  searchTerm = '';
  selectedStatusFilter: string = 'all';

  // Timesheets & Subcontractor Field Work State (سجل الأعمال وساعات الميدان والمقاولين)
  selectedTimesheetProjectId: string = 'all';
  timesheetSearchTerm: string = '';
  timesheetViewMode: 'list' | 'weekly' = 'list';
  showTimesheetModal = false;
  timesheetForm = {
    projectId: '',
    phaseId: '',
    date: new Date().toISOString().split('T')[0],
    entryType: 'internal_labor' as TimesheetEntryType,
    unitOfMeasure: 'hour' as TimesheetUnit,
    quantity: 8,
    unitPrice: 150,
    employeeName: 'م. طارق السعيد',
    employeeRole: 'مدير الموقع الإنشائي',
    subcontractorName: '',
    subcontractorNameEn: '',
    subcontractorContractNo: '',
    retentionPercentage: 0,
    retentionAmount: 0,
    netPayable: 1200,
    taskDescription: '',
    hours: 8,
    hourlyRate: 150,
    isBillable: true,
    status: 'Approved' as 'Approved' | 'Draft',
    notes: '',
    postAsProjectExpense: true
  };

  // Planning & Gantt State (التخطيط والجدولة الزمنية)
  selectedPlanningProjectId: string = 'all';
  planningSearchTerm: string = '';
  planningViewMode: 'gantt' | 'grid' = 'gantt';
  showTaskModal = false;
  taskForm = {
    id: '',
    projectId: '',
    phaseId: '',
    titleAr: '',
    titleEn: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0],
    progressPercentage: 0,
    assignedTo: 'م. طارق السعيد',
    assignedRole: 'مهندس الموقع الإنشائي',
    isMilestone: false,
    status: 'Planned' as 'Planned' | 'InProgress' | 'Completed' | 'Delayed',
    estimatedCost: 60000,
    notes: ''
  };

  // Stages & Presentation Architecture (المراحل)
  selectedStage: 'all' | 'planning' | 'execution' | 'billing' | 'completed' = 'all';
  displayMode: 'cards' | 'table' = 'cards';
  showMetricsRibbon = false; // Default collapsed to reduce screen clutter
  projectFormStep = 1; // 1: Contract, 2: Financials, 3: Site & Schedule, 4: Review & Confirm

  // Selected Project for Engineer Command Center & Executive Report
  selectedProject: ProjectDetailsDto | null = null;

  // Inline Project Form State
  isEditingProject = false;
  editingProjectId: string | null = null;
  projectForm = {
    nameAr: '',
    nameEn: '',
    customerId: '',
    customerName: '',
    contractNumber: '',
    contractDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
    contractAmount: 1250000,
    estimatedCost: 950000,
    retentionPercentage: 10,
    advancePaymentAmount: 125000,
    advancePaymentDeductionPercentage: 10,
    costCenterName: 'مركز تكلفة مشاريع الإنشاءات',
    projectManager: 'م. خالد القحطاني',
    siteLocation: 'الرياض - حي النرجس',
    notes: 'مشروع إنشاء مبنى تجاري وسكني متكامل مع بنية تحتية'
  };

  // Single-Field Smart Bilingual Input & Background Online Translation State
  unifiedProjectName = '';
  backgroundTranslationPreview = '';
  isManualNameEn = false;
  isTranslatingOnline = false;
  private translateDebounceTimer: any;

  // Inline Billing Form State
  billingForm = {
    projectId: '',
    billingDate: new Date().toISOString().split('T')[0],
    periodStart: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    currentWorkAmount: 0,
    retentionPercentage: 10,
    advancePaymentDeduction: 0,
    otherDeductions: 0,
    deductionsNotes: '',
    consultantName: 'مكتب الرؤية للاستشارات الهندسية'
  };
  selectedProjectForBilling: ProjectDto | null = null;

  // Inline Guarantee Form State
  guaranteeForm = {
    projectId: '',
    guaranteeNumber: '',
    type: GuaranteeType.PerformanceBond,
    issuingBank: 'البنك الأهلي السعودي (SNB)',
    beneficiaryName: '',
    amount: 0,
    cashMarginPercentage: 10,
    bankCommission: 750,
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    bankBranch: 'فرع طريق الملك فهد',
    bankAccountNumber: 'SA8810000001234567890123',
    notes: 'خطاب ضمان حسن تنفيذ بنكي معتمد وغير مشروط',
    postGlEntry: true
  };

  // Inline Phase Addition Form
  showAddPhaseForm = false;
  unifiedPhaseName = '';
  phaseTranslationBadge = '';
  phaseForm = {
    projectId: '',
    nameAr: '',
    nameEn: '',
    phaseOrder: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
    estimatedCost: 150000,
    weightPercentage: 20,
    notes: ''
  };

  // Inline Quick Expense Logging Form
  showAddExpenseForm = false;
  expenseForm = {
    projectId: '',
    phaseId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    category: ProjectExpenseCategory.Materials,
    amount: 15000,
    description: 'توريد خرسانة جاهزة وحديد تسليح للموقع',
    supplierOrWorkerName: 'شركة مصانع اليمامة للخرسانة',
    referenceType: 'PurchaseInvoice',
    referenceNumber: '',
    notes: 'مطابق للمواصفات الفنية المعتمدة'
  };

  // Notification Toast
  toastMessage: string | null = null;
  toastType: 'success' | 'error' | 'info' = 'success';

  // Enums for template
  ProjectStatus = ProjectStatus;
  BillingStatus = BillingStatus;
  GuaranteeType = GuaranteeType;
  GuaranteeStatus = GuaranteeStatus;
  ProjectExpenseCategory = ProjectExpenseCategory;

  ngOnInit(): void {
    this.syncActiveTabFromRoute();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.syncActiveTabFromRoute();
      this.viewMode = 'hub';
    });

    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'billings' || tab === 'guarantees' || tab === 'planning' || tab === 'timesheet' || tab === 'settings' || tab === 'projects') {
        this.activeTab = tab;
        this.viewMode = 'hub';
      }
    });

    this.loadData();
    this.loadCustomers();
    this.loadProjectSettings();
    this.loadAccounts();
  }

  private syncActiveTabFromRoute(): void {
    const url = (this.router.url || '').split('?')[0];
    if (url.includes('/projects/billings')) {
      this.activeTab = 'billings';
    } else if (url.includes('/projects/guarantees')) {
      this.activeTab = 'guarantees';
    } else if (url.includes('/projects/planning')) {
      this.activeTab = 'planning';
    } else if (url.includes('/projects/timesheet')) {
      this.activeTab = 'timesheet';
    } else if (url.includes('/projects/settings')) {
      this.activeTab = 'settings';
    } else if (url.includes('/projects')) {
      const qTab = this.route.snapshot.queryParams['tab'];
      if (qTab === 'billings' || qTab === 'guarantees' || qTab === 'planning' || qTab === 'timesheet' || qTab === 'settings') {
        this.activeTab = qTab;
      } else {
        this.activeTab = 'projects';
      }
    }
  }

  // -------------------------------------------------------------
  // Navigation & View Mode Handlers
  // -------------------------------------------------------------
  backToHub(): void {
    this.viewMode = 'hub';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (this.activeTab === 'billings') {
      this.router.navigate(['/projects/billings']);
    } else if (this.activeTab === 'guarantees') {
      this.router.navigate(['/projects/guarantees']);
    } else if (this.activeTab === 'planning') {
      this.router.navigate(['/projects/planning']);
    } else if (this.activeTab === 'timesheet') {
      this.router.navigate(['/projects/timesheet']);
    } else if (this.activeTab === 'settings') {
      this.router.navigate(['/projects/settings']);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  setTab(tab: 'projects' | 'planning' | 'timesheet' | 'billings' | 'guarantees' | 'settings'): void {
    this.activeTab = tab;
    this.viewMode = 'hub';
    if (tab === 'billings') {
      this.router.navigate(['/projects/billings']);
    } else if (tab === 'guarantees') {
      this.router.navigate(['/projects/guarantees']);
    } else if (tab === 'planning') {
      this.router.navigate(['/projects/planning']);
    } else if (tab === 'timesheet') {
      this.router.navigate(['/projects/timesheet']);
    } else if (tab === 'settings') {
      this.router.navigate(['/projects/settings']);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  setWorkspaceTab(tab: 'overview' | 'wbs' | 'planning' | 'timesheet' | 'costs' | 'billings' | 'guarantees'): void {
    this.workspaceTab = tab;
  }

  // Open Inline Project Form (New / Edit)
  openProjectForm(project?: ProjectDto): void {
    if (project) {
      this.isEditingProject = true;
      this.editingProjectId = project.id;
      this.isManualNameEn = false;
      this.unifiedProjectName = project.nameAr || project.nameEn || '';
      this.backgroundTranslationPreview = project.nameEn ? `الترجمة الإنجليزية: ${project.nameEn}` : (project.nameAr ? `الترجمة العربية: ${project.nameAr}` : '');
      this.projectForm = {
        nameAr: project.nameAr,
        nameEn: project.nameEn,
        customerId: project.customerId,
        customerName: project.customerName,
        contractNumber: project.contractNumber,
        contractDate: project.contractDate ? project.contractDate.split('T')[0] : '',
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        expectedEndDate: project.expectedEndDate ? project.expectedEndDate.split('T')[0] : '',
        contractAmount: project.contractAmount,
        estimatedCost: project.estimatedCost,
        retentionPercentage: project.retentionPercentage || 10,
        advancePaymentAmount: project.advancePaymentAmount || 0,
        advancePaymentDeductionPercentage: project.advancePaymentDeductionPercentage || 10,
        costCenterName: project.costCenterName || '',
        projectManager: project.projectManager || 'م. خالد القحطاني',
        siteLocation: project.siteLocation || '',
        notes: project.notes || ''
      };
    } else {
      this.isEditingProject = false;
      this.editingProjectId = null;
      this.isManualNameEn = false;
      this.unifiedProjectName = '';
      this.backgroundTranslationPreview = '';
      this.projectForm = {
        nameAr: '',
        nameEn: '',
        customerId: this.customers[0]?.id || '',
        customerName: this.customers[0]?.nameAr || '',
        contractNumber: `CNT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        contractDate: new Date().toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0],
        expectedEndDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
        contractAmount: 1250000,
        estimatedCost: 950000,
        retentionPercentage: 10,
        advancePaymentAmount: 125000,
        advancePaymentDeductionPercentage: 10,
        costCenterName: 'مركز تكلفة مشاريع الإنشاءات',
        projectManager: 'م. خالد القحطاني',
        siteLocation: 'الرياض - حي النرجس',
        notes: 'مشروع إنشاء مبنى تجاري وسكني متكامل مع بنية تحتية'
      };
    }
    this.projectFormStep = 1;
    this.viewMode = 'project-form';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Open Inline Project Command Center (Engineer Workspace)
  openProjectWorkspace(projectId: string, tab: 'overview' | 'wbs' | 'planning' | 'timesheet' | 'costs' | 'billings' | 'guarantees' = 'overview'): void {
    this.isLoading = true;
    this.projectsService.getProjectById(projectId).subscribe({
      next: (details) => {
        this.selectedProject = details;
        this.workspaceTab = tab;
        this.viewMode = 'project-workspace';
        this.isLoading = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.isLoading = false;
        this.showToast(this.langService.t('projects.hub.alerts.loadProjectError'), 'error');
      }
    });
  }

  // Open Inline Executive Engineering Report
  openEngineerReport(projectId: string): void {
    if (this.selectedProject && this.selectedProject.id === projectId) {
      this.viewMode = 'engineer-report';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.isLoading = true;
    this.projectsService.getProjectById(projectId).subscribe({
      next: (details) => {
        this.selectedProject = details;
        this.viewMode = 'engineer-report';
        this.isLoading = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.isLoading = false;
        this.showToast(this.langService.t('projects.hub.alerts.loadReportError'), 'error');
      }
    });
  }

  // Print Report Handler
  printReport(): void {
    window.print();
  }

  // Open Inline Billing Form
  openBillingForm(project?: ProjectDto | ProjectDetailsDto): void {
    const proj = project || (this.selectedProject ? this.selectedProject : this.projects[0]);
    this.selectedProjectForBilling = proj || null;
    this.billingForm = {
      projectId: proj ? proj.id : '',
      billingDate: new Date().toISOString().split('T')[0],
      periodStart: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
      currentWorkAmount: proj ? Math.round(proj.contractAmount * 0.15) : 250000,
      retentionPercentage: proj ? proj.retentionPercentage : 10,
      advancePaymentDeduction: proj ? Math.round((proj.contractAmount * 0.15) * (proj.advancePaymentDeductionPercentage / 100)) : 25000,
      otherDeductions: 0,
      deductionsNotes: '',
      consultantName: 'مكتب الرؤية للاستشارات الهندسية'
    };
    this.viewMode = 'billing-form';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Open Inline Guarantee Form
  openGuaranteeForm(project?: ProjectDto | ProjectDetailsDto): void {
    const proj = project || (this.selectedProject ? this.selectedProject : this.projects[0]);
    this.guaranteeForm = {
      projectId: proj ? proj.id : '',
      guaranteeNumber: `LG-SNB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: GuaranteeType.PerformanceBond,
      issuingBank: 'البنك الأهلي السعودي (SNB)',
      beneficiaryName: proj ? proj.customerName : 'شركة أرامكو السعودية',
      amount: proj ? Math.round(proj.contractAmount * 0.1) : 100000,
      cashMarginPercentage: 10,
      bankCommission: 750,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      bankBranch: 'فرع طريق الملك فهد',
      bankAccountNumber: 'SA8810000001234567890123',
      notes: 'خطاب ضمان حسن تنفيذ بنكي معتمد وغير مشروط',
      postGlEntry: true
    };
    this.viewMode = 'guarantee-form';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // -------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------
  loadData(): void {
    this.isLoading = true;
    this.projectsService.getSummaryMetrics().subscribe({
      next: (m) => this.metrics = m,
      error: () => {}
    });

    this.projectsService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    this.projectsService.getBillings().subscribe({
      next: (billings) => this.billings = billings,
      error: () => {}
    });

    this.projectsService.getGuarantees().subscribe({
      next: (guarantees) => this.guarantees = guarantees,
      error: () => {}
    });

    this.projectsService.getTimesheets().subscribe({
      next: (timesheets) => this.timesheets = timesheets,
      error: () => {}
    });

    this.projectsService.getPlanningTasks().subscribe({
      next: (tasks) => this.planningTasks = tasks,
      error: () => {}
    });
  }

  loadCustomers(): void {
    this.http.get<PartnerOption[]>(`${environment.apiUrl}/api/partners?type=1`).subscribe({
      next: (list) => {
        const raw = list || [];
        // Deduplicate customers by normalized Arabic name or code
        const seen = new Set<string>();
        const uniqueCustomers: PartnerOption[] = [];
        for (const p of raw) {
          const key = (p.nameAr || '').trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueCustomers.push(p);
          } else if (!key && p.id && !seen.has(p.id)) {
            seen.add(p.id);
            uniqueCustomers.push(p);
          }
        }
        this.customers = uniqueCustomers.length > 0 ? uniqueCustomers : raw;
        this.buildCustomerOptions();
      },
      error: () => {
        this.customers = [
          { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', code: 'CUST-01', nameAr: 'شركة أرامكو السعودية', nameEn: 'Saudi Aramco' },
          { id: '4fa85f64-5717-4562-b3fc-2c963f66afa7', code: 'CUST-02', nameAr: 'وزارة النقل والخدمات اللوجستية', nameEn: 'Ministry of Transport' },
          { id: '5fa85f64-5717-4562-b3fc-2c963f66afa8', code: 'CUST-03', nameAr: 'شركة الراجحي للتطوير العقاري', nameEn: 'Al Rajhi Real Estate' },
          { id: '6fa85f64-5717-4562-b3fc-2c963f66afa9', code: 'CUST-04', nameAr: 'مجموعة بن لادن للمقاولات', nameEn: 'Binladin Contracting Group' }
        ];
        this.buildCustomerOptions();
      }
    });
  }

  buildCustomerOptions(): void {
    this.customerOptions = this.customers.map(c => ({
      value: c.id,
      label: c.nameAr,
      sublabel: c.nameEn || 'عميل / جهة عمل معتمدة',
      code: c.code || 'CUST',
      badge: 'عميل',
      badgeClass: 'badge-info',
      icon: 'pi pi-building'
    }));
  }

  onCustomerSelect(customerId: string): void {
    this.projectForm.customerId = customerId;
    const cust = this.customers.find(c => c.id === customerId);
    if (cust) {
      this.projectForm.customerName = cust.nameAr;
    }
  }

  // Project Options for Selectors in Billings & Guarantees
  get projectSelectOptions(): SelectOption[] {
    return this.projects.map(p => ({
      value: p.id,
      label: p.nameAr,
      sublabel: `${p.nameEn || ''} - قيمة العقد: ${this.formatCurrency(p.contractAmount)}`,
      code: p.code,
      badge: p.statusText,
      badgeClass: 'badge-default',
      icon: 'pi pi-briefcase'
    }));
  }

  onBillingProjectSelect(projectId: string): void {
    this.billingForm.projectId = projectId;
    this.onBillingProjectChange();
  }

  onGuaranteeProjectSelect(projectId: string): void {
    this.guaranteeForm.projectId = projectId;
    this.onGuaranteeProjectChange();
  }

  // -------------------------------------------------------------
  // Pagination Getters & Handlers
  // -------------------------------------------------------------
  get totalProjectsPages(): number {
    return Math.ceil(this.filteredProjects.length / this.projectsPageSize) || 1;
  }

  get paginatedProjects(): ProjectDto[] {
    const start = (this.projectsCurrentPage - 1) * this.projectsPageSize;
    return this.filteredProjects.slice(start, start + this.projectsPageSize);
  }

  goToProjectsPage(page: number): void {
    if (page >= 1 && page <= this.totalProjectsPages) {
      this.projectsCurrentPage = page;
    }
  }

  nextProjectsPage(): void {
    if (this.projectsCurrentPage < this.totalProjectsPages) {
      this.projectsCurrentPage++;
    }
  }

  prevProjectsPage(): void {
    if (this.projectsCurrentPage > 1) {
      this.projectsCurrentPage--;
    }
  }

  onProjectsPageSizeChange(newSize: any): void {
    this.projectsPageSize = Number(newSize);
    this.projectsCurrentPage = 1;
  }

  get projectsPagesArray(): (number | string)[] {
    const total = this.totalProjectsPages;
    const current = this.projectsCurrentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  // Billings Pagination
  get totalBillingsPages(): number {
    return Math.ceil(this.billings.length / this.billingsPageSize) || 1;
  }

  get paginatedBillings(): ContractProgressBillingDto[] {
    const start = (this.billingsCurrentPage - 1) * this.billingsPageSize;
    return this.billings.slice(start, start + this.billingsPageSize);
  }

  goToBillingsPage(page: number): void {
    if (page >= 1 && page <= this.totalBillingsPages) {
      this.billingsCurrentPage = page;
    }
  }

  nextBillingsPage(): void {
    if (this.billingsCurrentPage < this.totalBillingsPages) {
      this.billingsCurrentPage++;
    }
  }

  prevBillingsPage(): void {
    if (this.billingsCurrentPage > 1) {
      this.billingsCurrentPage--;
    }
  }

  // Guarantees Pagination
  get totalGuaranteesPages(): number {
    return Math.ceil(this.guarantees.length / this.guaranteesPageSize) || 1;
  }

  get paginatedGuarantees(): LetterOfGuaranteeDto[] {
    const start = (this.guaranteesCurrentPage - 1) * this.guaranteesPageSize;
    return this.guarantees.slice(start, start + this.guaranteesPageSize);
  }

  goToGuaranteesPage(page: number): void {
    if (page >= 1 && page <= this.totalGuaranteesPages) {
      this.guaranteesCurrentPage = page;
    }
  }

  nextGuaranteesPage(): void {
    if (this.guaranteesCurrentPage < this.totalGuaranteesPages) {
      this.guaranteesCurrentPage++;
    }
  }

  prevGuaranteesPage(): void {
    if (this.guaranteesCurrentPage > 1) {
      this.guaranteesCurrentPage--;
    }
  }

  // =============================================================
  // Timesheets Computed Getters & Handlers (سجل الأوقات)
  // =============================================================
  get filteredTimesheets(): ProjectTimesheetDto[] {
    let list = [...this.timesheets];
    if (this.selectedTimesheetProjectId !== 'all') {
      list = list.filter(t => t.projectId === this.selectedTimesheetProjectId);
    }
    if (this.timesheetSearchTerm) {
      const term = this.timesheetSearchTerm.trim().toLowerCase();
      list = list.filter(t =>
        (t.employeeName || '').toLowerCase().includes(term) ||
        (t.taskDescription || '').toLowerCase().includes(term) ||
        (t.projectName || '').toLowerCase().includes(term) ||
        (t.phaseName || '').toLowerCase().includes(term)
      );
    }
    return list;
  }

  get totalTimesheetHours(): number {
    return this.filteredTimesheets.reduce((acc, t) => acc + (Number(t.hours) || 0), 0);
  }

  get totalBillableHours(): number {
    return this.filteredTimesheets
      .filter(t => t.isBillable)
      .reduce((acc, t) => acc + (Number(t.hours) || 0), 0);
  }

  get billablePercentage(): number {
    if (!this.totalTimesheetHours) return 0;
    return Math.round((this.totalBillableHours / this.totalTimesheetHours) * 100);
  }

  get totalTimesheetLaborCost(): number {
    return this.filteredTimesheets.reduce((acc, t) => acc + (Number(t.totalCost) || 0), 0);
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Settings & Contracting Units Management & Accounting GL Routing
  // -------------------------------------------------------------
  loadAccounts(): void {
    const compId = this.companyContext.activeCompany()?.id;
    this.coaService.loadAccountsTree(compId).subscribe({
      next: (tree) => {
        const flat: AccountDto[] = [];
        const recurse = (list: AccountDto[]) => {
          if (!list) return;
          for (const item of list) {
            flat.push(item);
            if (item.subAccounts && item.subAccounts.length > 0) {
              recurse(item.subAccounts);
            }
          }
        };
        recurse(tree);
        this.availableAccounts = flat;
        this.postableAccountOptions = flat
          .filter(a => a.isPostable)
          .map(a => ({
            value: a.id,
            label: `${a.accountCode} - ${a.nameAr}`,
            sublabel: a.accountTypeNameAr || (a.nameEn ? a.nameEn : ''),
            code: a.accountCode,
            badge: a.accountTypeNameAr
          }));

        this.syncAccountIdsFromCodes();
      },
      error: (err) => console.warn('Could not load accounts tree for project routing', err)
    });
  }

  syncAccountIdsFromCodes(): void {
    if (!this.availableAccounts.length) return;
    const findAcc = (code?: string, id?: string) => {
      if (id) {
        const byId = this.availableAccounts.find(a => a.id === id);
        if (byId) return byId;
      }
      if (code) {
        return this.availableAccounts.find(a => a.accountCode === code);
      }
      return undefined;
    };

    const ar = findAcc(this.projectSettings.arAccountCode, this.projectSettings.arAccountId);
    if (ar) {
      this.projectSettings.arAccountId = ar.id;
      this.projectSettings.arAccountCode = ar.accountCode;
      this.projectSettings.arAccountName = ar.nameAr;
    }

    const ret = findAcc(this.projectSettings.retentionAccountCode, this.projectSettings.retentionAccountId);
    if (ret) {
      this.projectSettings.retentionAccountId = ret.id;
      this.projectSettings.retentionAccountCode = ret.accountCode;
      this.projectSettings.retentionAccountName = ret.nameAr;
    }

    const adv = findAcc(this.projectSettings.advancePaymentAccountCode, this.projectSettings.advancePaymentAccountId);
    if (adv) {
      this.projectSettings.advancePaymentAccountId = adv.id;
      this.projectSettings.advancePaymentAccountCode = adv.accountCode;
      this.projectSettings.advancePaymentAccountName = adv.nameAr;
    }

    const rev = findAcc(this.projectSettings.revenueAccountCode, this.projectSettings.revenueAccountId);
    if (rev) {
      this.projectSettings.revenueAccountId = rev.id;
      this.projectSettings.revenueAccountCode = rev.accountCode;
      this.projectSettings.revenueAccountName = rev.nameAr;
    }

    const vat = findAcc(this.projectSettings.vatAccountCode, this.projectSettings.vatAccountId);
    if (vat) {
      this.projectSettings.vatAccountId = vat.id;
      this.projectSettings.vatAccountCode = vat.accountCode;
      this.projectSettings.vatAccountName = vat.nameAr;
    }

    const margin = findAcc(this.projectSettings.guaranteeMarginAccountCode, this.projectSettings.guaranteeMarginAccountId);
    if (margin) {
      this.projectSettings.guaranteeMarginAccountId = margin.id;
      this.projectSettings.guaranteeMarginAccountCode = margin.accountCode;
      this.projectSettings.guaranteeMarginAccountName = margin.nameAr;
    }

    const comm = findAcc(this.projectSettings.guaranteeCommissionAccountCode, this.projectSettings.guaranteeCommissionAccountId);
    if (comm) {
      this.projectSettings.guaranteeCommissionAccountId = comm.id;
      this.projectSettings.guaranteeCommissionAccountCode = comm.accountCode;
      this.projectSettings.guaranteeCommissionAccountName = comm.nameAr;
    }
  }

  onAccountChange(field: 'ar' | 'retention' | 'advance' | 'revenue' | 'vat' | 'margin' | 'commission', accountId: any): void {
    const acc = this.availableAccounts.find(a => a.id === accountId);
    if (!acc) return;
    switch (field) {
      case 'ar':
        this.projectSettings.arAccountId = acc.id;
        this.projectSettings.arAccountCode = acc.accountCode;
        this.projectSettings.arAccountName = acc.nameAr;
        break;
      case 'retention':
        this.projectSettings.retentionAccountId = acc.id;
        this.projectSettings.retentionAccountCode = acc.accountCode;
        this.projectSettings.retentionAccountName = acc.nameAr;
        break;
      case 'advance':
        this.projectSettings.advancePaymentAccountId = acc.id;
        this.projectSettings.advancePaymentAccountCode = acc.accountCode;
        this.projectSettings.advancePaymentAccountName = acc.nameAr;
        break;
      case 'revenue':
        this.projectSettings.revenueAccountId = acc.id;
        this.projectSettings.revenueAccountCode = acc.accountCode;
        this.projectSettings.revenueAccountName = acc.nameAr;
        break;
      case 'vat':
        this.projectSettings.vatAccountId = acc.id;
        this.projectSettings.vatAccountCode = acc.accountCode;
        this.projectSettings.vatAccountName = acc.nameAr;
        break;
      case 'margin':
        this.projectSettings.guaranteeMarginAccountId = acc.id;
        this.projectSettings.guaranteeMarginAccountCode = acc.accountCode;
        this.projectSettings.guaranteeMarginAccountName = acc.nameAr;
        break;
      case 'commission':
        this.projectSettings.guaranteeCommissionAccountId = acc.id;
        this.projectSettings.guaranteeCommissionAccountCode = acc.accountCode;
        this.projectSettings.guaranteeCommissionAccountName = acc.nameAr;
        break;
    }
  }

  resetAccountingRoutingToDefault(): void {
    this.projectSettings.arAccountCode = '11301';
    this.projectSettings.arAccountName = 'العملاء والمدينون التجاريون';
    this.projectSettings.retentionAccountCode = '11303';
    this.projectSettings.retentionAccountName = 'تأمينات وضمان أعمال محتجزة';
    this.projectSettings.advancePaymentAccountCode = '21302';
    this.projectSettings.advancePaymentAccountName = 'دفعات مقدمة من العملاء';
    this.projectSettings.revenueAccountCode = '41103';
    this.projectSettings.revenueAccountName = 'إيرادات عقود ومشاريع مقاولات';
    this.projectSettings.vatAccountCode = '21201';
    this.projectSettings.vatAccountName = 'ضريبة القيمة المضافة المحصلة (مخرجات 15%)';
    this.projectSettings.guaranteeMarginAccountCode = '11204';
    this.projectSettings.guaranteeMarginAccountName = 'تأمينات نقدية لخطابات الضمان لدى البنوك';
    this.projectSettings.guaranteeCommissionAccountCode = '53102';
    this.projectSettings.guaranteeCommissionAccountName = 'عمولات ومصاريف إصدار خطابات الضمان';

    this.projectSettings.arAccountId = undefined;
    this.projectSettings.retentionAccountId = undefined;
    this.projectSettings.advancePaymentAccountId = undefined;
    this.projectSettings.revenueAccountId = undefined;
    this.projectSettings.vatAccountId = undefined;
    this.projectSettings.guaranteeMarginAccountId = undefined;
    this.projectSettings.guaranteeCommissionAccountId = undefined;

    this.syncAccountIdsFromCodes();

    Swal.fire({
      icon: 'info',
      title: this.langService.t('projects.hub.alerts.routingRestoredTitle'),
      text: this.langService.t('projects.hub.alerts.routingRestoredText'),
      timer: 2500,
      showConfirmButton: false
    });
  }

  loadProjectSettings(): void {
    this.projectsService.getProjectSettings().subscribe(s => {
      this.projectSettings = s;
      this.syncAccountIdsFromCodes();
    });
  }

  saveProjectSettings(): void {
    this.projectsService.saveProjectSettings(this.projectSettings).subscribe(() => {
      Swal.fire({
        title: this.langService.t('projects.hub.alerts.settingsSavedTitle'),
        text: this.langService.t('projects.hub.alerts.settingsSavedText'),
        icon: 'success',
        confirmButtonColor: '#059669'
      });
    });
  }

  resetProjectSettings(): void {
    Swal.fire({
      title: this.langService.t('projects.hub.alerts.resetSettingsTitle'),
      text: this.langService.t('projects.hub.alerts.resetSettingsText'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('projects.hub.alerts.resetConfirmBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.projectSettings = {
          companyId: this.companyContext.activeCompany()?.id || '',
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
        this.syncAccountIdsFromCodes();
        this.saveProjectSettings();
      }
    });
  }

  getDefaultRateForUnit(unit: TimesheetUnit): number {
    switch (unit) {
      case 'hour': return this.projectSettings.defaultHourlyRate || 150;
      case 'sqm': return this.projectSettings.defaultSqmRate || 45;
      case 'cum': return this.projectSettings.defaultCumRate || 120;
      case 'linear_m': return this.projectSettings.defaultLinearMRate || 35;
      case 'day': return this.projectSettings.defaultDailyRate || 350;
      case 'unit': return 65;
      case 'lump_sum': return 5000;
      default: return 100;
    }
  }

  onTimesheetEntryTypeChange(): void {
    if (this.timesheetForm.entryType === 'subcontractor') {
      this.timesheetForm.employeeRole = 'مقاول أعمال تخصصية';
      this.timesheetForm.retentionPercentage = this.projectSettings.defaultSubcontractorRetentionPct || 10;
      if (!this.timesheetForm.subcontractorContractNo) {
        this.timesheetForm.subcontractorContractNo = `SUB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      }
      if (this.timesheetForm.unitOfMeasure === 'hour') {
        this.timesheetForm.unitOfMeasure = 'sqm';
        this.timesheetForm.quantity = 150;
        this.timesheetForm.unitPrice = this.getDefaultRateForUnit('sqm');
      }
    } else {
      this.timesheetForm.employeeRole = 'مدير الموقع الإنشائي';
      this.timesheetForm.retentionPercentage = 0;
      if (this.timesheetForm.unitOfMeasure !== 'hour' && this.timesheetForm.unitOfMeasure !== 'day') {
        this.timesheetForm.unitOfMeasure = 'hour';
        this.timesheetForm.quantity = 8;
        this.timesheetForm.unitPrice = this.getDefaultRateForUnit('hour');
      }
    }
    this.recalcTimesheetTotals();
  }

  onTimesheetUnitChange(): void {
    this.timesheetForm.unitPrice = this.getDefaultRateForUnit(this.timesheetForm.unitOfMeasure);
    if (this.timesheetForm.unitOfMeasure === 'hour') {
      this.timesheetForm.quantity = 8;
    } else if (this.timesheetForm.unitOfMeasure === 'sqm') {
      this.timesheetForm.quantity = 150;
    } else if (this.timesheetForm.unitOfMeasure === 'cum') {
      this.timesheetForm.quantity = 60;
    } else if (this.timesheetForm.unitOfMeasure === 'linear_m') {
      this.timesheetForm.quantity = 200;
    } else if (this.timesheetForm.unitOfMeasure === 'day') {
      this.timesheetForm.quantity = 3;
    } else if (this.timesheetForm.unitOfMeasure === 'unit') {
      this.timesheetForm.quantity = 25;
    }
    this.recalcTimesheetTotals();
  }

  recalcTimesheetTotals(): void {
    const qty = Number(this.timesheetForm.quantity) || 0;
    const price = Number(this.timesheetForm.unitPrice) || 0;
    const total = qty * price;
    const retPct = Number(this.timesheetForm.retentionPercentage) || 0;
    const retAmount = total * (retPct / 100);
    this.timesheetForm.retentionAmount = retAmount;
    this.timesheetForm.netPayable = total - retAmount;
    this.timesheetForm.hours = this.timesheetForm.unitOfMeasure === 'hour' ? qty : 0;
    this.timesheetForm.hourlyRate = this.timesheetForm.unitOfMeasure === 'hour' ? price : 0;
  }

  getUnitLabel(unit?: string): string {
    switch (unit) {
      case 'sqm': return 'م² (متر مربع)';
      case 'cum': return 'م³ (متر مكعب)';
      case 'linear_m': return 'م.ط (متر طولي)';
      case 'unit': return 'نقطة / قطعة';
      case 'day': return 'يوم عمل';
      case 'lump_sum': return 'مقطوعية';
      case 'hour':
      default: return 'ساعة';
    }
  }

  onSubcontractorNameArInput(): void {
    if (this.timesheetForm.subcontractorName) {
      this.timesheetForm.subcontractorNameEn = this.translator.autoTranslate(this.timesheetForm.subcontractorName);
    }
  }

  retranslateSubcontractorName(): void {
    if (this.timesheetForm.subcontractorName) {
      this.timesheetForm.subcontractorNameEn = this.translator.autoTranslate(this.timesheetForm.subcontractorName);
    }
  }

  openAddTimesheetModal(projectId?: string): void {
    const pId = projectId || (this.selectedProject ? this.selectedProject.id : this.projects[0]?.id || '');
    const entryType = this.projectSettings.defaultEntryType || 'internal_labor';
    const unit = this.projectSettings.defaultUnitOfMeasure || 'hour';
    const unitPrice = this.getDefaultRateForUnit(unit);
    const quantity = unit === 'hour' ? 8 : (unit === 'sqm' ? 120 : 50);
    const retentionPct = entryType === 'subcontractor' ? (this.projectSettings.defaultSubcontractorRetentionPct || 10) : 0;
    const totalCost = quantity * unitPrice;
    const retentionAmount = totalCost * (retentionPct / 100);

    this.timesheetForm = {
      projectId: pId,
      phaseId: '',
      date: new Date().toISOString().split('T')[0],
      entryType: entryType,
      unitOfMeasure: unit,
      quantity: quantity,
      unitPrice: unitPrice,
      employeeName: entryType === 'subcontractor' ? 'مقاول الباطن' : 'م. طارق السعيد',
      employeeRole: entryType === 'subcontractor' ? 'مقاول أعمال تخصصية' : 'مدير الموقع الإنشائي',
      subcontractorName: entryType === 'subcontractor' ? 'شركة النخبة للمقاولات' : '',
      subcontractorNameEn: '',
      subcontractorContractNo: entryType === 'subcontractor' ? `SUB-${new Date().getFullYear()}-088` : '',
      retentionPercentage: retentionPct,
      retentionAmount: retentionAmount,
      netPayable: totalCost - retentionAmount,
      taskDescription: '',
      hours: unit === 'hour' ? quantity : 0,
      hourlyRate: unit === 'hour' ? unitPrice : 0,
      isBillable: true,
      status: 'Approved',
      notes: '',
      postAsProjectExpense: this.projectSettings.autoPostToCosting
    };
    this.showTimesheetModal = true;
  }

  saveTimesheetEntry(): void {
    if (!this.timesheetForm.projectId || !this.timesheetForm.taskDescription || this.timesheetForm.quantity <= 0 || this.timesheetForm.unitPrice <= 0) {
      Swal.fire({
        title: this.langService.t('projects.hub.alerts.timesheetIncompleteTitle'),
        text: this.langService.t('projects.hub.alerts.timesheetIncompleteText'),
        icon: 'warning',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    if (this.timesheetForm.entryType === 'subcontractor' && !this.timesheetForm.subcontractorName.trim()) {
      Swal.fire({
        title: this.langService.t('projects.hub.alerts.subcontractorNameRequiredTitle'),
        text: this.langService.t('projects.hub.alerts.subcontractorNameRequiredText'),
        icon: 'warning',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const proj = this.projects.find(p => p.id === this.timesheetForm.projectId);
    const totalCost = Number(this.timesheetForm.quantity) * Number(this.timesheetForm.unitPrice);
    const retentionPct = Number(this.timesheetForm.retentionPercentage) || 0;
    const retentionAmount = totalCost * (retentionPct / 100);
    const netPayable = totalCost - retentionAmount;

    const entry: Partial<ProjectTimesheetDto> = {
      ...this.timesheetForm,
      projectName: proj?.nameAr || 'مشروع إنشائي',
      projectCode: proj?.code || 'PRJ-2026',
      totalCost: totalCost,
      retentionAmount: retentionAmount,
      netPayable: netPayable
    };

    this.projectsService.addTimesheet(entry).subscribe(() => {
      // Auto-post as Labor or Subcontractor Expense in project costing if checked
      if (this.timesheetForm.postAsProjectExpense && proj) {
        const isSubcontractor = this.timesheetForm.entryType === 'subcontractor';
        const expenseCategory = isSubcontractor ? ProjectExpenseCategory.Subcontractors : ProjectExpenseCategory.Labor;
        const workerOrVendorName = isSubcontractor ? this.timesheetForm.subcontractorName : this.timesheetForm.employeeName;
        const unitName = this.getUnitLabel(this.timesheetForm.unitOfMeasure);

        this.projectsService.addExpense(proj.id, {
          companyId: proj.companyId,
          expenseDate: new Date(this.timesheetForm.date).toISOString(),
          category: expenseCategory,
          amount: isSubcontractor ? netPayable : totalCost,
          description: `${isSubcontractor ? 'مقاولة باطن' : 'أجور وعمالة'}: ${workerOrVendorName} (${this.timesheetForm.quantity} ${unitName}) - ${this.timesheetForm.taskDescription}`,
          supplierOrWorkerName: workerOrVendorName,
          referenceType: isSubcontractor ? 'SubcontractorClaim' : 'Timesheet',
          referenceNumber: isSubcontractor ? (this.timesheetForm.subcontractorContractNo || `SUB-${Date.now().toString().slice(-4)}`) : `TS-${Date.now().toString().slice(-4)}`
        }).subscribe(() => {
          this.loadData();
        });
      }

      this.projectsService.getTimesheets().subscribe(ts => this.timesheets = ts);
      this.showTimesheetModal = false;
      const unitLabel = this.getUnitLabel(this.timesheetForm.unitOfMeasure);
      const isSub = this.timesheetForm.entryType === 'subcontractor';
      const isAr = this.langService.currentLang() === 'ar';
      Swal.fire({
        title: isSub ? this.langService.t('projects.hub.alerts.timesheetRecordedSubcontractor') : this.langService.t('projects.hub.alerts.timesheetRecordedLabor'),
        text: `${this.langService.t('common.recorded', { defaultValue: 'Recorded' })} ${this.timesheetForm.quantity} ${unitLabel} - ${this.formatCurrency(totalCost)}${isSub ? this.langService.t('projects.hub.alerts.timesheetNetRetention', { net: this.formatCurrency(netPayable) }) : ''}.`,
        icon: 'success',
        confirmButtonColor: '#059669'
      });
    });
  }

  deleteTimesheetEntry(id: string): void {
    Swal.fire({
      title: this.langService.t('projects.hub.alerts.deleteTimesheetTitle'),
      text: this.langService.t('projects.hub.alerts.deleteTimesheetText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.langService.t('projects.hub.alerts.deleteTimesheetConfirmBtn'),
      cancelButtonText: this.langService.t('common.cancel')
    }).then(result => {
      if (result.isConfirmed) {
        this.projectsService.deleteTimesheet(id).subscribe(() => {
          this.timesheets = this.timesheets.filter(t => t.id !== id);
          Swal.fire({
            title: this.langService.t('common.deleted'),
            text: this.langService.t('projects.hub.alerts.timesheetDeletedSuccess'),
            icon: 'success',
            confirmButtonColor: '#059669'
          });
        });
      }
    });
  }

  // =============================================================
  // Planning & Gantt Computed Getters & Handlers (التخطيط ومخطط جانت)
  // =============================================================
  get filteredPlanningTasks(): GanttTaskItem[] {
    let list = [...this.planningTasks];
    if (this.selectedPlanningProjectId !== 'all') {
      list = list.filter(t => t.projectId === this.selectedPlanningProjectId);
    }
    if (this.planningSearchTerm) {
      const term = this.planningSearchTerm.trim().toLowerCase();
      list = list.filter(t =>
        (t.titleAr || '').toLowerCase().includes(term) ||
        (t.titleEn || '').toLowerCase().includes(term) ||
        (t.assignedTo || '').toLowerCase().includes(term) ||
        (t.projectName || '').toLowerCase().includes(term)
      );
    }
    return list;
  }

  get completedPlanningTasksCount(): number {
    return this.filteredPlanningTasks.filter(t => t.status === 'Completed' || t.progressPercentage >= 100).length;
  }

  get inProgressPlanningTasksCount(): number {
    return this.filteredPlanningTasks.filter(t => (t.status === 'InProgress' || (t.progressPercentage > 0 && t.progressPercentage < 100))).length;
  }

  get plannedPlanningTasksCount(): number {
    return this.filteredPlanningTasks.filter(t => t.status === 'Planned' && t.progressPercentage === 0).length;
  }

  get delayedPlanningTasksCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.filteredPlanningTasks.filter(t => t.status === 'Delayed' || (t.endDate < today && t.progressPercentage < 100)).length;
  }

  ganttMonths = [
    { label: 'يناير', year: '2026', month: 0 },
    { label: 'فبراير', year: '2026', month: 1 },
    { label: 'مارس', year: '2026', month: 2 },
    { label: 'أبريل', year: '2026', month: 3 },
    { label: 'مايو', year: '2026', month: 4 },
    { label: 'يونيو', year: '2026', month: 5 },
    { label: 'يوليو', year: '2026', month: 6 },
    { label: 'أغسطس', year: '2026', month: 7 },
    { label: 'سبتمبر', year: '2026', month: 8 },
    { label: 'أكتوبر', year: '2026', month: 9 },
    { label: 'نوفمبر', year: '2026', month: 10 },
    { label: 'ديسمبر', year: '2026', month: 11 }
  ];

  getGanttBarStyle(task: GanttTaskItem): { [key: string]: string } {
    const yearStart = new Date('2026-01-01').getTime();
    const yearEnd = new Date('2026-12-31').getTime();
    const totalYearMs = yearEnd - yearStart;

    const taskStart = new Date(task.startDate || '2026-01-01').getTime();
    const taskEnd = new Date(task.endDate || '2026-12-31').getTime();

    const left = Math.max(0, Math.min(100, ((taskStart - yearStart) / totalYearMs) * 100));
    const width = Math.max(3, Math.min(100 - left, ((taskEnd - taskStart) / totalYearMs) * 100));

    return {
      left: `${left}%`,
      width: `${width}%`
    };
  }

  openAddTaskModal(projectId?: string): void {
    const pId = projectId || (this.selectedProject ? this.selectedProject.id : this.projects[0]?.id || '');
    this.taskForm = {
      id: '',
      projectId: pId,
      phaseId: '',
      titleAr: '',
      titleEn: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0],
      progressPercentage: 0,
      assignedTo: 'م. طارق السعيد',
      assignedRole: 'مهندس الموقع الإنشائي',
      isMilestone: false,
      status: 'Planned',
      estimatedCost: 60000,
      notes: ''
    };
    this.showTaskModal = true;
  }

  onTaskTitleArInput(): void {
    if (!this.taskForm.titleEn || this.taskForm.titleEn.trim() === '') {
      this.taskForm.titleEn = this.translator.autoTranslate(this.taskForm.titleAr);
    }
  }

  retranslateTaskTitle(): void {
    if (this.taskForm.titleAr) {
      this.taskForm.titleEn = this.translator.autoTranslate(this.taskForm.titleAr);
    }
  }

  savePlanningTaskEntry(): void {
    if (!this.taskForm.projectId || !this.taskForm.titleAr) {
      Swal.fire({
        title: this.langService.t('projects.hub.alerts.timesheetIncompleteTitle'),
        text: this.langService.t('projects.hub.alerts.planningTaskIncomplete'),
        icon: 'warning',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const proj = this.projects.find(p => p.id === this.taskForm.projectId);
    const entry: Partial<GanttTaskItem> = {
      ...this.taskForm,
      projectName: proj?.nameAr || 'مشروع',
      projectCode: proj?.code || 'PRJ-2026'
    };

    this.projectsService.savePlanningTask(entry).subscribe(() => {
      this.projectsService.getPlanningTasks().subscribe(tasks => this.planningTasks = tasks);
      this.showTaskModal = false;
      Swal.fire({
        title: this.langService.t('projects.hub.alerts.planningTaskSavedTitle'),
        text: this.langService.t('projects.hub.alerts.planningTaskSavedText', { title: this.taskForm.titleAr }),
        icon: 'success',
        confirmButtonColor: '#059669'
      });
    });
  }

  deletePlanningTaskEntry(id: string): void {
    Swal.fire({
      title: this.langService.t('projects.hub.alerts.deleteTaskTitle'),
      text: this.langService.t('projects.hub.alerts.deleteTaskText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.langService.t('common.confirm'),
      cancelButtonText: this.langService.t('common.cancel')
    }).then(result => {
      if (result.isConfirmed) {
        this.projectsService.deletePlanningTask(id).subscribe(() => {
          this.planningTasks = this.planningTasks.filter(t => t.id !== id);
          Swal.fire({
            title: this.langService.t('common.deleted'),
            text: this.langService.t('projects.hub.alerts.taskDeletedSuccess'),
            icon: 'success',
            confirmButtonColor: '#059669'
          });
        });
      }
    });
  }

  quickUpdateTaskProgress(task: GanttTaskItem, delta: number): void {
    const newProgress = Math.max(0, Math.min(100, task.progressPercentage + delta));
    task.progressPercentage = newProgress;
    task.status = newProgress >= 100 ? 'Completed' : newProgress > 0 ? 'InProgress' : 'Planned';
    this.projectsService.updateTaskProgress(task.id, newProgress).subscribe();
  }

  applyFilter(): void {
    let result = [...this.projects];
    if (this.searchTerm) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(p =>
        p.code.toLowerCase().includes(term) ||
        p.nameAr.toLowerCase().includes(term) ||
        p.nameEn.toLowerCase().includes(term) ||
        p.customerName.toLowerCase().includes(term) ||
        p.contractNumber.toLowerCase().includes(term)
      );
    }
    if (this.selectedStatusFilter !== 'all') {
      const statusNum = parseInt(this.selectedStatusFilter, 10);
      result = result.filter(p => p.status === statusNum);
    }
    if (this.selectedStage !== 'all') {
      result = result.filter(p => this.getStageForProject(p) === this.selectedStage);
    }
    this.filteredProjects = result;
    this.projectsCurrentPage = 1;
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatusFilter = status;
    this.applyFilter();
  }

  // -------------------------------------------------------------
  // Stages & Presentation Architecture Handlers
  // -------------------------------------------------------------
  setStage(stage: 'all' | 'planning' | 'execution' | 'billing' | 'completed'): void {
    this.selectedStage = stage;
    this.applyFilter();
  }

  setDisplayMode(mode: 'cards' | 'table'): void {
    this.displayMode = mode;
  }

  toggleMetricsRibbon(): void {
    this.showMetricsRibbon = !this.showMetricsRibbon;
  }

  getStageForProject(p: ProjectDto): 'planning' | 'execution' | 'billing' | 'completed' {
    if (p.status === ProjectStatus.Completed || p.completionPercentage >= 100) {
      return 'completed';
    }
    if (p.status === ProjectStatus.Planning || (p.completionPercentage === 0 && p.totalBilledAmount === 0)) {
      return 'planning';
    }
    if (p.totalBilledAmount > 0 && p.completionPercentage >= 50) {
      return 'billing';
    }
    return 'execution';
  }

  getStageStepNumber(p: ProjectDto): number {
    const stage = this.getStageForProject(p);
    switch (stage) {
      case 'planning': return 1;
      case 'execution': return 2;
      case 'billing': return 3;
      case 'completed': return 4;
      default: return 2;
    }
  }

  get stageCounts() {
    return {
      all: this.projects.length,
      planning: this.projects.filter(p => this.getStageForProject(p) === 'planning').length,
      execution: this.projects.filter(p => this.getStageForProject(p) === 'execution').length,
      billing: this.projects.filter(p => this.getStageForProject(p) === 'billing').length,
      completed: this.projects.filter(p => this.getStageForProject(p) === 'completed').length
    };
  }

  nextFormStep(): void {
    if (this.projectFormStep < 4) {
      this.projectFormStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevFormStep(): void {
    if (this.projectFormStep > 1) {
      this.projectFormStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToFormStep(step: number): void {
    if (step >= 1 && step <= 4) {
      this.projectFormStep = step;
    }
  }

  // -------------------------------------------------------------
  // Rule 1: Single-Field Smart Bilingual Input (Background Online Translation)
  // User enters text in Arabic or English -> auto translates to opposite language in background
  // -------------------------------------------------------------
  onUnifiedProjectNameInput(): void {
    const text = (this.unifiedProjectName || '').trim();
    if (!text) {
      this.projectForm.nameAr = '';
      this.projectForm.nameEn = '';
      this.backgroundTranslationPreview = '';
      return;
    }

    const hasArabic = this.translator.containsArabic(text);
    if (hasArabic) {
      // 1. User typed in Arabic -> Target English in background
      this.projectForm.nameAr = text;
      const instantEn = this.translator.translateArabicToEnglish(text);
      this.projectForm.nameEn = instantEn;
      this.backgroundTranslationPreview = `الترجمة الإنجليزية: ${instantEn}`;

      clearTimeout(this.translateDebounceTimer);
      this.translateDebounceTimer = setTimeout(async () => {
        this.isTranslatingOnline = true;
        try {
          const onlineEn = await this.translator.translateOnline(text, 'ar', 'en');
          if (onlineEn) {
            this.projectForm.nameEn = onlineEn;
            this.backgroundTranslationPreview = `الترجمة الإنجليزية: ${onlineEn}`;
          }
        } finally {
          this.isTranslatingOnline = false;
        }
      }, 450);
    } else {
      // 2. User typed in English (e.g. "project manager") -> Target Arabic in background
      this.projectForm.nameEn = text;
      const instantAr = this.translator.translateEnglishToArabic(text);
      this.projectForm.nameAr = instantAr;
      this.backgroundTranslationPreview = `الترجمة العربية: ${instantAr}`;

      clearTimeout(this.translateDebounceTimer);
      this.translateDebounceTimer = setTimeout(async () => {
        this.isTranslatingOnline = true;
        try {
          const onlineAr = await this.translator.translateOnline(text, 'en', 'ar');
          if (onlineAr) {
            this.projectForm.nameAr = onlineAr;
            this.backgroundTranslationPreview = `الترجمة العربية: ${onlineAr}`;
          }
        } finally {
          this.isTranslatingOnline = false;
        }
      }, 450);
    }
  }

  onProjectNameArInput(): void {
    this.unifiedProjectName = this.projectForm.nameAr;
    this.onUnifiedProjectNameInput();
  }

  onProjectNameEnInput(): void {
    this.unifiedProjectName = this.projectForm.nameEn;
    this.onUnifiedProjectNameInput();
  }

  async forceRetranslateProjectName(): Promise<void> {
    if (this.unifiedProjectName) {
      this.onUnifiedProjectNameInput();
      this.showToast(this.langService.t('projects.hub.alerts.autoTranslateSuccess'), 'success');
    }
  }

  onUnifiedPhaseNameChange(text: string): void {
    this.unifiedPhaseName = text;
    if (!text || !text.trim()) {
      this.phaseForm.nameAr = '';
      this.phaseForm.nameEn = '';
      this.phaseTranslationBadge = '';
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.phaseForm.nameAr = text;
      const instant = this.translator.translateArabicToEnglish(text);
      this.phaseForm.nameEn = instant;
      this.phaseTranslationBadge = `English: ${instant}`;
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          if (refined) {
            this.phaseForm.nameEn = refined;
            this.phaseTranslationBadge = `English: ${refined}`;
          }
        }
      );
    } else {
      this.phaseForm.nameEn = text;
      const instant = this.translator.translateEnglishToArabic(text);
      this.phaseForm.nameAr = instant;
      this.phaseTranslationBadge = `عربي: ${instant}`;
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.phaseForm.nameAr = refined;
          this.phaseTranslationBadge = `عربي: ${refined}`;
        }
      });
    }
  }

  async forceRetranslatePhase(): Promise<void> {
    const text = this.unifiedPhaseName || this.phaseForm.nameAr || this.phaseForm.nameEn;
    if (!text) return;
    this.onUnifiedPhaseNameChange(text);
  }

  async onPhaseNameArInput(): Promise<void> {
    this.onUnifiedPhaseNameChange(this.phaseForm.nameAr);
  }

  onCustomerChange(): void {
    const cust = this.customers.find(c => c.id === this.projectForm.customerId);
    if (cust) {
      this.projectForm.customerName = cust.nameAr;
    }
  }

  // -------------------------------------------------------------
  // CRUD Actions: Projects
  // -------------------------------------------------------------
  saveProject(): void {
    if (this.unifiedProjectName) {
      if (!this.projectForm.nameAr) this.projectForm.nameAr = this.unifiedProjectName;
      if (!this.projectForm.nameEn) this.projectForm.nameEn = this.unifiedProjectName;
    }

    if (!this.projectForm.nameAr || !this.projectForm.customerId) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('projects.hub.alerts.projectValidationRequired'),
        confirmButtonText: this.langService.t('common.confirm'),
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (this.isEditingProject && this.editingProjectId) {
      this.projectsService.updateProject(this.editingProjectId, this.projectForm).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: this.langService.t('projects.hub.alerts.projectUpdatedSuccessTitle'),
            text: this.langService.t('projects.hub.alerts.projectUpdatedSuccessText'),
            timer: 2500,
            showConfirmButton: false
          });
          this.loadData();
          if (this.selectedProject && this.selectedProject.id === this.editingProjectId) {
            this.openProjectWorkspace(this.editingProjectId);
          } else {
            this.backToHub();
          }
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: this.langService.t('common.error'),
            text: err.error?.error || this.langService.t('projects.hub.alerts.projectSaveFailed'),
            confirmButtonText: this.langService.t('common.confirm')
          });
        }
      });
    } else {
      this.projectsService.createProject(this.projectForm).subscribe({
        next: (created) => {
          Swal.fire({
            icon: 'success',
            title: this.langService.t('projects.hub.alerts.projectCreatedSuccessTitle'),
            text: this.langService.t('projects.hub.alerts.projectCreatedSuccessText', { code: created.code }),
            timer: 2500,
            showConfirmButton: false
          });
          this.loadData();
          this.openProjectWorkspace(created.id);
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: this.langService.t('common.error'),
            text: err.error?.error || this.langService.t('projects.hub.alerts.projectCreateFailed'),
            confirmButtonText: this.langService.t('common.confirm')
          });
        }
      });
    }
  }

  // -------------------------------------------------------------
  // CRUD Actions: Billings (المستخلصات)
  // -------------------------------------------------------------
  onBillingProjectChange(): void {
    const proj = this.projects.find(p => p.id === this.billingForm.projectId);
    this.selectedProjectForBilling = proj || null;
    if (proj) {
      this.billingForm.retentionPercentage = proj.retentionPercentage;
      this.billingForm.currentWorkAmount = Math.round(proj.contractAmount * 0.15);
      this.billingForm.advancePaymentDeduction = Math.round(this.billingForm.currentWorkAmount * (proj.advancePaymentDeductionPercentage / 100));
    }
  }

  get computedBillingRetention(): number {
    return Math.round(this.billingForm.currentWorkAmount * (this.billingForm.retentionPercentage / 100));
  }

  get computedBillingNet(): number {
    const deductions = this.computedBillingRetention + this.billingForm.advancePaymentDeduction + this.billingForm.otherDeductions;
    return Math.max(0, this.billingForm.currentWorkAmount - deductions);
  }

  get computedBillingVat(): number {
    return Math.round(this.computedBillingNet * 0.15);
  }

  get computedBillingTotal(): number {
    return this.computedBillingNet + this.computedBillingVat;
  }

  saveBilling(): void {
    if (!this.billingForm.projectId || this.billingForm.currentWorkAmount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('projects.hub.alerts.billingValidationRequired'),
        confirmButtonText: this.langService.t('common.confirm')
      });
      return;
    }

    this.projectsService.createBilling(this.billingForm).subscribe({
      next: (b) => {
        Swal.fire({
          icon: 'success',
          title: this.langService.t('projects.hub.alerts.billingIssuedSuccessTitle'),
          text: this.langService.t('projects.hub.alerts.billingIssuedSuccessText', { number: b.billingNumber }),
          timer: 2500,
          showConfirmButton: false
        });
        this.loadData();
        if (this.selectedProject && this.selectedProject.id === this.billingForm.projectId) {
          this.openProjectWorkspace(this.billingForm.projectId, 'billings');
        } else {
          this.setTab('billings');
        }
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.error || this.langService.t('projects.hub.alerts.billingSaveFailed')
        });
      }
    });
  }

  submitBilling(id: string): void {
    this.projectsService.submitBilling(id, 'مكتب الاستشاري المعتمد').subscribe({
      next: () => {
        this.showToast(this.langService.t('projects.hub.alerts.submitBillingSuccess'), 'success');
        this.loadData();
        if (this.selectedProject) this.openProjectWorkspace(this.selectedProject.id, 'billings');
      },
      error: (err) => this.showToast(err.error?.error || this.langService.t('projects.hub.alerts.submitBillingError'), 'error')
    });
  }

  approveBilling(id: string): void {
    this.projectsService.approveBilling(id, 'مكتب الاستشاري المعتمد', 'تمت مطابقة الأعمال المنفذة على أرض الواقع').subscribe({
      next: () => {
        this.showToast(this.langService.t('projects.hub.alerts.approveBillingSuccess'), 'success');
        this.loadData();
        if (this.selectedProject) this.openProjectWorkspace(this.selectedProject.id, 'billings');
      },
      error: (err) => this.showToast(err.error?.error || this.langService.t('projects.hub.alerts.approveBillingError'), 'error')
    });
  }

  certifyBilling(id: string): void {
    Swal.fire({
      title: this.langService.t('projects.hub.alerts.billingCertifiedConfirmTitle'),
      text: this.langService.t('projects.hub.alerts.billingCertifiedConfirmText'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('projects.hub.alerts.billingCertifiedConfirmBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        const routing = {
          arAccountId: this.projectSettings.arAccountId,
          retentionAccountId: this.projectSettings.retentionAccountId,
          advancePaymentAccountId: this.projectSettings.advancePaymentAccountId,
          revenueAccountId: this.projectSettings.revenueAccountId,
          vatAccountId: this.projectSettings.vatAccountId
        };
        this.projectsService.certifyBilling(id, true, routing).subscribe({
          next: (b) => {
            Swal.fire({
              icon: 'success',
              title: this.langService.t('projects.hub.alerts.billingCertifiedSuccessTitle'),
              text: this.langService.t('projects.hub.alerts.billingCertifiedSuccessText', { number: b.billingNumber }),
              timer: 3000,
              showConfirmButton: false
            });
            this.loadData();
            if (this.selectedProject) this.openProjectWorkspace(this.selectedProject.id, 'billings');
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.langService.t('common.error'),
              text: err.error?.error || this.langService.t('projects.hub.alerts.billingCertifiedFailed')
            });
          }
        });
      }
    });
  }

  // -------------------------------------------------------------
  // CRUD Actions: Guarantees (خطابات الضمان)
  // -------------------------------------------------------------
  onGuaranteeProjectChange(): void {
    const proj = this.projects.find(p => p.id === this.guaranteeForm.projectId);
    if (proj) {
      this.guaranteeForm.beneficiaryName = proj.customerName;
      this.guaranteeForm.amount = Math.round(proj.contractAmount * 0.1);
    }
  }

  get computedGuaranteeMargin(): number {
    return Math.round(this.guaranteeForm.amount * (this.guaranteeForm.cashMarginPercentage / 100));
  }

  saveGuarantee(): void {
    if (!this.guaranteeForm.projectId || !this.guaranteeForm.guaranteeNumber || this.guaranteeForm.amount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('projects.hub.alerts.guaranteeDataRequired'),
        confirmButtonText: this.langService.t('common.confirm')
      });
      return;
    }

    this.projectsService.createGuarantee(this.guaranteeForm).subscribe({
      next: (g) => {
        Swal.fire({
          icon: 'success',
          title: this.langService.t('projects.hub.alerts.guaranteeIssuedSuccessTitle'),
          text: this.langService.t('projects.hub.alerts.guaranteeIssuedSuccessText', { number: g.guaranteeNumber }),
          timer: 2500,
          showConfirmButton: false
        });
        this.loadData();
        if (this.selectedProject && this.selectedProject.id === this.guaranteeForm.projectId) {
          this.openProjectWorkspace(this.guaranteeForm.projectId, 'guarantees');
        } else {
          this.setTab('guarantees');
        }
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.error || this.langService.t('projects.hub.alerts.guaranteeIssueFailed')
        });
      }
    });
  }

  extendGuaranteeSwal(guarantee: LetterOfGuaranteeDto): void {
    const currentExp = new Date(guarantee.expiryDate);
    const nextExp = new Date(currentExp);
    nextExp.setDate(nextExp.getDate() + 180);
    const defaultNextDate = nextExp.toISOString().split('T')[0];
    const isAr = this.langService.currentLang() === 'ar';

    const htmlContent = isAr ? `
        <div style="text-align: right; font-size: 0.88rem; line-height: 1.8;">
          <p><strong>خطاب الضمان رقم:</strong> ${guarantee.guaranteeNumber} (${guarantee.issuingBank})</p>
          <div style="margin-top: 10px;">
            <label style="display:block; margin-bottom: 4px; font-weight:600;">تاريخ الانتهاء الجديد:</label>
            <input id="swal-new-expiry" type="date" value="${defaultNextDate}" class="swal2-input" style="width: 100%; margin: 0 0 10px 0;">
          </div>
          <div>
            <label style="display:block; margin-bottom: 4px; font-weight:600;">عمولة التمديد البنكية (ر.س):</label>
            <input id="swal-commission" type="number" value="300" class="swal2-input" style="width: 100%; margin: 0 0 10px 0;">
          </div>
          <div>
            <label style="display:block; margin-bottom: 4px; font-weight:600;">ملاحظات / سبب التمديد:</label>
            <input id="swal-notes" type="text" value="تمديد فترة تنفيذ المشروع بناء على طلب المالك" class="swal2-input" style="width: 100%; margin: 0;">
          </div>
        </div>
      ` : `
        <div style="text-align: left; font-size: 0.88rem; line-height: 1.8;">
          <p><strong>Letter of Guarantee No:</strong> ${guarantee.guaranteeNumber} (${guarantee.issuingBank})</p>
          <div style="margin-top: 10px;">
            <label style="display:block; margin-bottom: 4px; font-weight:600;">New Expiry Date:</label>
            <input id="swal-new-expiry" type="date" value="${defaultNextDate}" class="swal2-input" style="width: 100%; margin: 0 0 10px 0;">
          </div>
          <div>
            <label style="display:block; margin-bottom: 4px; font-weight:600;">Bank Extension Fee (SAR):</label>
            <input id="swal-commission" type="number" value="300" class="swal2-input" style="width: 100%; margin: 0 0 10px 0;">
          </div>
          <div>
            <label style="display:block; margin-bottom: 4px; font-weight:600;">Extension Reason / Notes:</label>
            <input id="swal-notes" type="text" value="Project execution extension per client request" class="swal2-input" style="width: 100%; margin: 0;">
          </div>
        </div>
      `;

    Swal.fire({
      title: this.langService.t('projects.hub.alerts.extendGuaranteeTitle'),
      html: htmlContent,
      showCancelButton: true,
      confirmButtonText: this.langService.t('common.confirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const newExpiry = (document.getElementById('swal-new-expiry') as HTMLInputElement).value;
        const commission = +(document.getElementById('swal-commission') as HTMLInputElement).value || 0;
        const notes = (document.getElementById('swal-notes') as HTMLInputElement).value;
        if (!newExpiry) {
          Swal.showValidationMessage(this.langService.t('projects.hub.alerts.selectNewExpiryDate'));
          return false;
        }
        return { newExpiry, commission, notes };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.projectsService.extendGuarantee(
          guarantee.id,
          result.value.newExpiry,
          result.value.commission,
          result.value.notes
        ).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.langService.t('projects.hub.alerts.extendGuaranteeSuccessTitle'),
              text: this.langService.t('projects.hub.alerts.extendGuaranteeSuccessText', { date: result.value.newExpiry }),
              timer: 2500,
              showConfirmButton: false
            });
            this.loadData();
            if (this.selectedProject) this.openProjectWorkspace(this.selectedProject.id, 'guarantees');
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.langService.t('common.error'),
              text: err.error?.error || this.langService.t('projects.hub.alerts.extendGuaranteeFailed')
            });
          }
        });
      }
    });
  }

  releaseGuarantee(id: string): void {
    Swal.fire({
      title: this.langService.t('projects.hub.alerts.releaseGuaranteeTitle'),
      text: this.langService.t('projects.hub.alerts.releaseGuaranteeText'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('projects.hub.alerts.releaseGuaranteeConfirmBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        const isAr = this.langService.currentLang() === 'ar';
        const defaultNote = isAr ? 'استلام محضر التسليم الابتدائي والمخالصة النهائية' : 'Initial handover and final clearance received';
        this.projectsService.releaseGuarantee(id, defaultNote, true).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.langService.t('projects.hub.alerts.releaseGuaranteeSuccessTitle'),
              text: this.langService.t('projects.hub.alerts.releaseGuaranteeSuccessText'),
              timer: 2500,
              showConfirmButton: false
            });
            this.loadData();
            if (this.selectedProject) this.openProjectWorkspace(this.selectedProject.id, 'guarantees');
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.langService.t('common.error'),
              text: err.error?.error || this.langService.t('projects.hub.alerts.releaseGuaranteeFailed')
            });
          }
        });
      }
    });
  }

  // -------------------------------------------------------------
  // Phase Management (WBS Milestones - Inline)
  // -------------------------------------------------------------
  initAddPhase(): void {
    if (!this.selectedProject) return;
    const nextOrder = (this.selectedProject.phases.length || 0) + 1;
    this.unifiedPhaseName = '';
    this.phaseTranslationBadge = '';
    this.phaseForm = {
      projectId: this.selectedProject.id,
      nameAr: '',
      nameEn: '',
      phaseOrder: nextOrder,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
      estimatedCost: 150000,
      weightPercentage: 20,
      notes: ''
    };
    this.showAddPhaseForm = true;
  }

  savePhase(): void {
    if (!this.phaseForm.nameAr && this.unifiedPhaseName) {
      this.onUnifiedPhaseNameChange(this.unifiedPhaseName);
    }
    if (!this.phaseForm.nameAr && this.phaseForm.nameEn) {
      this.phaseForm.nameAr = this.phaseForm.nameEn;
    }
    if (!this.phaseForm.nameEn && this.phaseForm.nameAr) {
      this.phaseForm.nameEn = this.translator.translateArabicToEnglish(this.phaseForm.nameAr);
    }

    if (!this.phaseForm.nameAr || this.phaseForm.weightPercentage <= 0) {
      this.showToast(this.langService.t('projects.hub.alerts.phaseRequired'), 'error');
      return;
    }

    this.projectsService.addPhase(this.phaseForm.projectId, this.phaseForm).subscribe({
      next: () => {
        this.showToast(this.langService.t('projects.hub.alerts.phaseSuccess'), 'success');
        this.showAddPhaseForm = false;
        if (this.selectedProject) {
          this.openProjectWorkspace(this.selectedProject.id, 'wbs');
        }
        this.loadData();
      },
      error: (err) => this.showToast(err.error?.error || this.langService.t('projects.hub.alerts.phaseError'), 'error')
    });
  }

  updatePhaseProgress(phase: any, newProgress: number): void {
    if (!this.selectedProject) return;
    this.projectsService.updatePhaseProgress(this.selectedProject.id, phase.id, newProgress).subscribe({
      next: () => {
        this.showToast(this.langService.t('projects.hub.alerts.progressSuccess'), 'info');
        this.openProjectWorkspace(this.selectedProject!.id, 'wbs');
        this.loadData();
      },
      error: () => this.showToast(this.langService.t('projects.hub.alerts.progressError'), 'error')
    });
  }

  // -------------------------------------------------------------
  // Expense Management (Cost Tracking - Inline)
  // -------------------------------------------------------------
  initAddExpense(phaseId?: string): void {
    if (!this.selectedProject) return;
    this.expenseForm = {
      projectId: this.selectedProject.id,
      phaseId: phaseId || '',
      expenseDate: new Date().toISOString().split('T')[0],
      category: ProjectExpenseCategory.Materials,
      amount: 15000,
      description: 'توريد خرسانة جاهزة وحديد تسليح للموقع',
      supplierOrWorkerName: 'شركة مصانع اليمامة للخرسانة',
      referenceType: 'PurchaseInvoice',
      referenceNumber: `INV-SUPP-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: 'مطابق للمواصفات الفنية المعتمدة'
    };
    this.showAddExpenseForm = true;
  }

  saveExpense(): void {
    if (!this.expenseForm.description || this.expenseForm.amount <= 0) {
      this.showToast(this.langService.t('projects.hub.alerts.expenseRequired'), 'error');
      return;
    }

    this.projectsService.addExpense(this.expenseForm.projectId, this.expenseForm).subscribe({
      next: () => {
        this.showToast(this.langService.t('projects.hub.alerts.expenseSuccess'), 'success');
        this.showAddExpenseForm = false;
        if (this.selectedProject) {
          this.openProjectWorkspace(this.selectedProject.id, 'costs');
        }
        this.loadData();
      },
      error: (err) => this.showToast(err.error?.error || this.langService.t('projects.hub.alerts.expenseError'), 'error')
    });
  }

  // Project Status Update
  changeProjectStatus(project: ProjectDto, newStatus: ProjectStatus): void {
    this.projectsService.updateProjectStatus(project.id, newStatus).subscribe({
      next: () => {
        this.showToast(this.langService.t('projects.hub.alerts.statusSuccess'), 'success');
        this.loadData();
        if (this.selectedProject && this.selectedProject.id === project.id) {
          this.openProjectWorkspace(project.id, this.workspaceTab);
        }
      },
      error: () => this.showToast(this.langService.t('projects.hub.alerts.statusError'), 'error')
    });
  }

  // -------------------------------------------------------------
  // Calculations & Helpers for Engineer Workspace & Report
  // -------------------------------------------------------------
  get expectedProfit(): number {
    return (this.projectForm.contractAmount || 0) - (this.projectForm.estimatedCost || 0);
  }

  get expectedProfitMargin(): number {
    if (!this.projectForm.contractAmount || this.projectForm.contractAmount <= 0) return 0;
    return Math.round((this.expectedProfit / this.projectForm.contractAmount) * 100);
  }

  get expectedRetentionAmount(): number {
    return Math.round((this.projectForm.contractAmount || 0) * ((this.projectForm.retentionPercentage || 10) / 100));
  }

  getFinancialProgressPercentage(project: ProjectDto | ProjectDetailsDto): number {
    if (!project.contractAmount || project.contractAmount <= 0) return 0;
    return Math.min(100, Math.round((project.totalBilledAmount / project.contractAmount) * 100));
  }

  getBudgetBurnPercentage(project: ProjectDto | ProjectDetailsDto): number {
    if (!project.estimatedCost || project.estimatedCost <= 0) return 0;
    return Math.min(100, Math.round((project.totalExpensesAmount / project.estimatedCost) * 100));
  }

  getCostVariance(project: ProjectDto | ProjectDetailsDto): number {
    return (project.estimatedCost || 0) - (project.totalExpensesAmount || 0);
  }

  getExpensesByCategory(cat: ProjectExpenseCategory): number {
    if (!this.selectedProject || !this.selectedProject.expenses) return 0;
    return this.selectedProject.expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }

  getExpensePercentageByCategory(cat: ProjectExpenseCategory): number {
    if (!this.selectedProject || !this.selectedProject.totalExpensesAmount || this.selectedProject.totalExpensesAmount <= 0) return 0;
    const catTotal = this.getExpensesByCategory(cat);
    return Math.round((catTotal / this.selectedProject.totalExpensesAmount) * 100);
  }

  formatCurrency(value?: number | null): string {
    return (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ر.س';
  }

  getStatusClass(status: ProjectStatus): string {
    switch (status) {
      case ProjectStatus.Active: return 'status-active';
      case ProjectStatus.Completed: return 'status-completed';
      case ProjectStatus.Planning: return 'status-planning';
      case ProjectStatus.OnHold: return 'status-onhold';
      case ProjectStatus.Cancelled: return 'status-cancelled';
      default: return '';
    }
  }

  getBillingStatusClass(status: BillingStatus): string {
    switch (status) {
      case BillingStatus.Certified:
      case BillingStatus.Invoiced: return 'status-completed';
      case BillingStatus.ConsultantApproved: return 'status-active';
      case BillingStatus.Submitted: return 'status-planning';
      case BillingStatus.Draft: return 'status-onhold';
      case BillingStatus.Rejected: return 'status-cancelled';
      default: return '';
    }
  }

  getGuaranteeStatusClass(status: GuaranteeStatus): string {
    switch (status) {
      case GuaranteeStatus.Active: return 'status-active';
      case GuaranteeStatus.Extended: return 'status-planning';
      case GuaranteeStatus.Released: return 'status-completed';
      case GuaranteeStatus.Claimed: return 'status-cancelled';
      case GuaranteeStatus.Expired: return 'status-onhold';
      default: return '';
    }
  }

  getGuaranteeTypeText(type: GuaranteeType): string {
    switch (type) {
      case GuaranteeType.BidBond: return this.langService.t('projects.guarantees.types.bidBond');
      case GuaranteeType.PerformanceBond: return this.langService.t('projects.guarantees.types.performanceBond');
      case GuaranteeType.AdvancePaymentBond: return this.langService.t('projects.guarantees.types.advancePaymentBond');
      case GuaranteeType.RetentionBond: return this.langService.t('projects.guarantees.types.retentionBond');
      case GuaranteeType.MaintenanceBond: return this.langService.t('projects.guarantees.types.maintenanceBond');
      default: return String(type);
    }
  }

  getExpenseCategoryText(cat: ProjectExpenseCategory): string {
    switch (cat) {
      case ProjectExpenseCategory.Materials: return this.langService.t('projects.expenses.categories.materials');
      case ProjectExpenseCategory.Labor: return this.langService.t('projects.expenses.categories.labor');
      case ProjectExpenseCategory.Subcontractors: return this.langService.t('projects.expenses.categories.subcontractors');
      case ProjectExpenseCategory.Equipment: return this.langService.t('projects.expenses.categories.equipment');
      case ProjectExpenseCategory.Overhead: return this.langService.t('projects.expenses.categories.overhead');
      case ProjectExpenseCategory.Other: return this.langService.t('projects.expenses.categories.other');
      default: return String(cat);
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    setTimeout(() => {
      if (this.toastMessage === message) {
        this.toastMessage = null;
      }
    }, 4000);
  }
}
