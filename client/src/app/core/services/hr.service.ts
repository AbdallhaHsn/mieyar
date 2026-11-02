import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyContextService } from './company-context.service';
import { environment } from '../../../environments/environment';

export enum EmployeeStatus {
  Active = 1,
  OnLeave = 2,
  Probation = 3,
  Suspended = 4,
  Resigned = 5,
  Terminated = 6
}

export enum ContractType {
  Limited = 1,
  Unlimited = 2,
  PartTime = 3,
  Temporary = 4
}

export enum Gender {
  Male = 1,
  Female = 2
}

export enum PayrollStatus {
  Draft = 1,
  Calculated = 2,
  Approved = 3,
  PostedToGl = 4,
  Paid = 5,
  Cancelled = 6
}

export enum EndOfServiceReason {
  ContractEnd = 1,
  CompanyTermination = 2,
  ResignationLessThan2Years = 3,
  Resignation2To5Years = 4,
  Resignation5To10Years = 5,
  ResignationMoreThan10Years = 6,
  ForceMajeure = 7
}

export interface EmployeeDto {
  id: string;
  companyId: string;
  employeeNumber: string;
  firstNameAr: string;
  lastNameAr: string;
  fullNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  fullNameEn: string;
  nationalIdOrIqama: string;
  nationality: string;
  isSaudi: boolean;
  gender: Gender;
  dateOfBirth?: string;
  mobileNumber?: string;
  email?: string;
  departmentId?: string;
  departmentName: string;
  jobTitleAr: string;
  jobTitleEn: string;
  costCenterId?: string;
  branchId?: string;
  hireDate: string;
  contractType: ContractType;
  contractStartDate?: string;
  contractEndDate?: string;
  status: EmployeeStatus;
  bankCode: string;
  bankName: string;
  iban: string;
  basicSalary: number;
  housingAllowance: number;
  transportationAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  monthlyEmployeeGosi: number;
  monthlyCompanyGosi: number;
}

export interface PayrollLineDto {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeNumber: string;
  employeeNameAr: string;
  employeeNameEn: string;
  nationalIdOrIqama: string;
  bankCode: string;
  iban: string;
  basicSalary: number;
  housingAllowance: number;
  transportationAllowance: number;
  otherAllowances: number;
  overtimeAmount: number;
  grossSalary: number;
  employeeGosiDeduction: number;
  companyGosiContribution: number;
  absenceDeduction: number;
  loanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  notes?: string;
}

export interface PayrollPeriodDto {
  id: string;
  companyId: string;
  payrollNumber: string;
  periodYear: number;
  periodMonth: number;
  startDate: string;
  endDate: string;
  status: PayrollStatus;
  employeeCount: number;
  totalBasicSalary: number;
  totalHousingAllowance: number;
  totalTransportationAllowance: number;
  totalOtherAllowances: number;
  totalOvertime: number;
  totalGrossSalary: number;
  totalEmployeeGosiDeduction: number;
  totalCompanyGosiContribution: number;
  totalAbsenceDeductions: number;
  totalLoanDeductions: number;
  totalOtherDeductions: number;
  totalDeductions: number;
  totalNetSalary: number;
  journalEntryId?: string;
  journalEntryNumber?: string;
  postedToGlAtUtc?: string;
  paymentJournalEntryId?: string;
  paymentJournalEntryNumber?: string;
  paidAtUtc?: string;
  paymentBankAccountId?: string;
  wpsExportedAtUtc?: string;
  wpsFileName?: string;
  notes?: string;
  lines?: PayrollLineDto[];
}

export interface DisbursementBankAccountDto {
  id: string;
  accountCode: string;
  nameAr: string;
  nameEn: string;
  currentBalance: number;
}

export interface EosbCalculationResultDto {
  employeeId: string;
  employeeName: string;
  hireDate: string;
  calculationDate: string;
  totalYearsOfService: number;
  lastGrossSalary: number;
  reason: EndOfServiceReason;
  reasonTextAr: string;
  entitledPercentage: number;
  endOfServiceBenefitAmount: number;
}

export interface WpsExportResultDto {
  fileName: string;
  contentType: string;
  fileContent: string;
  recordCount: number;
  totalAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class HrService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);

  private employeesUrl = `${environment.apiUrl}/api/hr/employees`;
  private payrollUrl = `${environment.apiUrl}/api/hr/payroll`;

  private get activeCompanyId(): string {
    return this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
  }

  // --- EMPLOYEES API ---
  getEmployees(activeOnly?: boolean): Observable<EmployeeDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (activeOnly !== undefined && activeOnly !== null) {
      params = params.set('activeOnly', activeOnly.toString());
    }
    return this.http.get<EmployeeDto[]>(this.employeesUrl, { params });
  }

  getEmployeeById(id: string): Observable<EmployeeDto> {
    return this.http.get<EmployeeDto>(`${this.employeesUrl}/${id}`);
  }

  createEmployee(payload: Partial<EmployeeDto>): Observable<EmployeeDto> {
    const body = {
      ...payload,
      companyId: payload.companyId || this.activeCompanyId
    };
    return this.http.post<EmployeeDto>(this.employeesUrl, body);
  }

  updateEmployee(id: string, payload: Partial<EmployeeDto>): Observable<EmployeeDto> {
    return this.http.put<EmployeeDto>(`${this.employeesUrl}/${id}`, payload);
  }

  calculateEosb(employeeId: string, calculationDate: string, reason: EndOfServiceReason): Observable<EosbCalculationResultDto> {
    return this.http.post<EosbCalculationResultDto>(`${this.employeesUrl}/${employeeId}/calculate-eosb`, {
      calculationDate,
      reason
    });
  }

  // --- PAYROLL API ---
  getPayrollPeriods(year?: number): Observable<PayrollPeriodDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (year) {
      params = params.set('year', year.toString());
    }
    return this.http.get<PayrollPeriodDto[]>(this.payrollUrl, { params });
  }

  getPayrollPeriodById(id: string): Observable<PayrollPeriodDto> {
    return this.http.get<PayrollPeriodDto>(`${this.payrollUrl}/${id}`);
  }

  calculatePayroll(payload: { year: number; month: number; adjustments?: any[]; notes?: string }): Observable<PayrollPeriodDto> {
    const body = {
      ...payload,
      companyId: this.activeCompanyId
    };
    return this.http.post<PayrollPeriodDto>(`${this.payrollUrl}/calculate`, body);
  }

  postPayrollToGl(payrollPeriodId: string, notes?: string): Observable<PayrollPeriodDto> {
    return this.http.post<PayrollPeriodDto>(`${this.payrollUrl}/${payrollPeriodId}/post-to-gl`, { notes });
  }

  updatePayrollLine(
    payrollPeriodId: string,
    lineId: string,
    payload: {
      overtimeAmount: number;
      absenceDeduction: number;
      loanDeduction: number;
      otherDeductions: number;
      notes?: string;
    }
  ): Observable<PayrollPeriodDto> {
    return this.http.put<PayrollPeriodDto>(`${this.payrollUrl}/${payrollPeriodId}/lines/${lineId}`, payload);
  }

  markPayrollAsPaid(payrollPeriodId: string, notes?: string, bankAccountId?: string): Observable<PayrollPeriodDto> {
    return this.http.post<PayrollPeriodDto>(`${this.payrollUrl}/${payrollPeriodId}/mark-as-paid`, { notes, bankAccountId });
  }

  getDisbursementBankAccounts(companyId?: string): Observable<DisbursementBankAccountDto[]> {
    const cid = companyId || this.activeCompanyId;
    return this.http.get<DisbursementBankAccountDto[]>(`${this.payrollUrl}/bank-accounts`, {
      params: { companyId: cid }
    });
  }

  generateWps(payrollPeriodId: string, payload?: any): Observable<WpsExportResultDto> {
    return this.http.post<WpsExportResultDto>(`${this.payrollUrl}/${payrollPeriodId}/wps`, payload || {});
  }

  downloadWpsFile(payrollPeriodId: string): Observable<Blob> {
    return this.http.get(`${this.payrollUrl}/${payrollPeriodId}/wps-download`, {
      responseType: 'blob'
    });
  }

  // --- ADVANCES, CUSTODY & SETTINGS URLS ---
  private advancesUrl = `${environment.apiUrl}/api/hr/advances`;
  private custodyUrl = `${environment.apiUrl}/api/hr/custodies`;
  private settingsUrl = `${environment.apiUrl}/api/hr/settings`;

  // --- ADVANCES API ---
  getAdvances(status?: AdvanceStatus, employeeId?: string): Observable<EmployeeAdvanceDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (status !== undefined && status !== null) {
      params = params.set('status', status.toString());
    }
    if (employeeId) {
      params = params.set('employeeId', employeeId);
    }
    return this.http.get<EmployeeAdvanceDto[]>(this.advancesUrl, { params });
  }

  createAdvance(payload: Partial<EmployeeAdvanceDto>): Observable<EmployeeAdvanceDto> {
    const body = {
      ...payload,
      companyId: payload.companyId || this.activeCompanyId
    };
    return this.http.post<EmployeeAdvanceDto>(this.advancesUrl, body);
  }

  approveAdvance(id: string, payload: { approvedAmount: number; notes?: string }): Observable<EmployeeAdvanceDto> {
    return this.http.post<EmployeeAdvanceDto>(`${this.advancesUrl}/${id}/approve`, payload);
  }

  rejectAdvance(id: string, payload: { rejectionReason: string }): Observable<EmployeeAdvanceDto> {
    return this.http.post<EmployeeAdvanceDto>(`${this.advancesUrl}/${id}/reject`, payload);
  }

  disburseAdvance(id: string, payload: { disbursementMethod: string; bankAccountId?: string }): Observable<EmployeeAdvanceDto> {
    return this.http.post<EmployeeAdvanceDto>(`${this.advancesUrl}/${id}/disburse`, payload);
  }

  // --- CUSTODY API ---
  getCustodies(status?: CustodyStatus, employeeId?: string): Observable<EmployeeCustodyDto[]> {
    let params = new HttpParams().set('companyId', this.activeCompanyId);
    if (status !== undefined && status !== null) {
      params = params.set('status', status.toString());
    }
    if (employeeId) {
      params = params.set('employeeId', employeeId);
    }
    return this.http.get<EmployeeCustodyDto[]>(this.custodyUrl, { params });
  }

  createCustody(payload: Partial<EmployeeCustodyDto>): Observable<EmployeeCustodyDto> {
    const body = {
      ...payload,
      companyId: payload.companyId || this.activeCompanyId
    };
    return this.http.post<EmployeeCustodyDto>(this.custodyUrl, body);
  }

  returnCustody(id: string, payload: { returnNotes?: string; status?: CustodyStatus }): Observable<EmployeeCustodyDto> {
    return this.http.post<EmployeeCustodyDto>(`${this.custodyUrl}/${id}/return`, payload);
  }

  // --- HR SETTINGS API ---
  getHrSettings(): Observable<HrPolicySettingsDto> {
    return this.http.get<HrPolicySettingsDto>(this.settingsUrl, {
      params: { companyId: this.activeCompanyId }
    });
  }

  updateHrSettings(payload: Partial<HrPolicySettingsDto>): Observable<HrPolicySettingsDto> {
    const body = {
      ...payload,
      companyId: this.activeCompanyId
    };
    return this.http.put<HrPolicySettingsDto>(this.settingsUrl, body);
  }
}

export enum AdvanceStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Disbursed = 4,
  Settled = 5,
  Cancelled = 6
}

export enum CustodyType {
  TangibleAsset = 1,
  CashFloat = 2,
  AccessCardOrKey = 3,
  SoftwareLicense = 4,
  FuelOrTravelCard = 5,
  Other = 6
}

export enum CustodyStatus {
  Active = 1,
  Returned = 2,
  LostOrDamaged = 3,
  WrittenOff = 4
}

export interface EmployeeAdvanceDto {
  id: string;
  companyId: string;
  advanceNumber: string;
  employeeId: string;
  employeeNameAr: string;
  employeeNameEn: string;
  employeeNumber: string;
  requestDate: string;
  amount: number;
  installmentsCount: number;
  monthlyDeductionAmount: number;
  remainingAmount: number;
  reasonAr: string;
  reasonEn: string;
  status: AdvanceStatus;
  approvedAmount?: number;
  approvedAtUtc?: string;
  approvedByUserId?: string;
  rejectedAtUtc?: string;
  rejectionReason?: string;
  disbursedAtUtc?: string;
  disbursementMethod?: string;
  journalEntryId?: string;
  notes?: string;
  startDeductionYear: number;
  startDeductionMonth: number;
}

export interface EmployeeCustodyDto {
  id: string;
  companyId: string;
  custodyNumber: string;
  employeeId: string;
  employeeNameAr: string;
  employeeNameEn: string;
  employeeNumber: string;
  type: CustodyType;
  itemNameAr: string;
  itemNameEn: string;
  serialOrAssetNumber?: string;
  valueOrAmount?: number;
  assignedDate: string;
  expectedReturnDate?: string;
  actualReturnedDate?: string;
  status: CustodyStatus;
  conditionOnAssignment?: string;
  returnNotes?: string;
  notes?: string;
}

export interface HrPolicySettingsDto {
  id: string;
  companyId: string;
  maxAdvanceSalaryPercentage: number;
  maxAdvanceInstallments: number;
  requireManagerApprovalForAdvance: boolean;
  autoDeductFromPayroll: boolean;
  autoNotifyReturnCustodyBeforeDays: number;
  blockExitClearanceIfCustodyActive: boolean;
  updatedAtUtc?: string;
}
