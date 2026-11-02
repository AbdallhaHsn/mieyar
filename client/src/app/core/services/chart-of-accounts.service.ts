import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { AccountDto, AccountingStandardGuidance, CreateAccountRequest } from '../models/account.model';
import { CompanyContextService } from './company-context.service';
import { LanguageService } from './language.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChartOfAccountsService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);
  private langService = inject(LanguageService);
  private readonly apiUrl = `${environment.apiUrl}/api/accounts`;

  accountsTree = signal<AccountDto[]>([]);
  standards = signal<AccountingStandardGuidance[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Selected account for guidance / inspection
  inspectedAccount = signal<AccountDto | null>(null);
  
  // Active guidance object shown in the side panel
  activeGuidance = signal<AccountingStandardGuidance | null>(null);

  // Side Drawer state
  isDrawerOpen = signal<boolean>(false);
  drawerMode = signal<'view-guidance' | 'create-account'>('view-guidance');
  selectedParentForCreation = signal<AccountDto | null>(null);

  getStandards(): Observable<AccountingStandardGuidance[]> {
    return this.http.get<AccountingStandardGuidance[]>(`${this.apiUrl}/standards`).pipe(
      tap(data => {
        this.standards.set(data);
        if (data.length > 0 && !this.activeGuidance()) {
          this.activeGuidance.set(data[0]);
        }
      }),
      catchError(err => {
        console.warn('Could not fetch standards from API, using fallback catalog', err);
        return of([]);
      })
    );
  }

  loadAccountsTree(companyId?: string): Observable<AccountDto[]> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const compId = companyId || this.companyContext.activeCompany().id;
    let params = new HttpParams();
    if (compId) {
      params = params.set('companyId', compId);
    }

    return this.http.get<AccountDto[]>(`${this.apiUrl}/tree`, { params }).pipe(
      tap(data => {
        // Expand root nodes by default
        const prepared = this.markInitialExpanded(data);
        this.accountsTree.set(prepared);
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.error('Failed to load accounts tree', err);
        this.errorMessage.set(this.langService.t('accounting.chartOfAccounts.service.loadTreeFailed'));
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  createAccount(request: CreateAccountRequest): Observable<AccountDto> {
    this.isLoading.set(true);
    const compId = request.companyId || this.companyContext.activeCompany().id;
    const payload = { ...request, companyId: compId };

    return this.http.post<AccountDto>(this.apiUrl, payload).pipe(
      tap(created => {
        this.isLoading.set(false);
        this.loadAccountsTree().subscribe();
        this.closeDrawer();
      }),
      catchError(err => {
        this.isLoading.set(false);
        const msg = err.error?.description || this.langService.t('accounting.chartOfAccounts.service.createFailed');
        this.errorMessage.set(msg);
        throw err;
      })
    );
  }

  updateAccount(id: string, request: { nameAr: string; nameEn: string; description?: string; isActive?: boolean; standardCode?: string }): Observable<AccountDto> {
    this.isLoading.set(true);
    return this.http.put<AccountDto>(`${this.apiUrl}/${id}`, request).pipe(
      tap(() => {
        this.isLoading.set(false);
        this.loadAccountsTree().subscribe();
      }),
      catchError(err => {
        this.isLoading.set(false);
        const msg = err.error?.description || this.langService.t('accounting.chartOfAccounts.service.updateFailed');
        this.errorMessage.set(msg);
        throw err;
      })
    );
  }

  deleteAccount(id: string): Observable<void> {
    this.isLoading.set(true);
    const compId = this.companyContext.activeCompany().id;
    const params = new HttpParams().set('companyId', compId);

    return this.http.delete<void>(`${this.apiUrl}/${id}`, { params }).pipe(
      tap(() => {
        this.isLoading.set(false);
        this.loadAccountsTree().subscribe();
      }),
      catchError(err => {
        this.isLoading.set(false);
        throw err;
      })
    );
  }

  openGuidanceDrawer(account: AccountDto) {
    this.inspectedAccount.set(account);
    this.drawerMode.set('view-guidance');
    
    if (account.guidance) {
      this.activeGuidance.set(account.guidance);
    } else {
      // Find matching standard by type
      const fallbackStd = this.findMatchingStandard(account);
      this.activeGuidance.set(fallbackStd);
    }
    this.isDrawerOpen.set(true);
  }

  openCreateAccountDrawer(parent?: AccountDto) {
    this.selectedParentForCreation.set(parent || null);
    this.drawerMode.set('create-account');
    
    if (parent?.guidance) {
      this.activeGuidance.set(parent.guidance);
    } else if (this.standards().length > 0) {
      this.activeGuidance.set(this.standards()[0]);
    }
    this.isDrawerOpen.set(true);
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.selectedParentForCreation.set(null);
  }

  setGuidanceByCode(code: string) {
    const found = this.standards().find(s => s.standardCode.toLowerCase() === code.toLowerCase());
    if (found) {
      this.activeGuidance.set(found);
    }
  }

  private markInitialExpanded(accounts: AccountDto[]): AccountDto[] {
    return accounts.map(acc => ({
      ...acc,
      isExpanded: acc.level <= 2,
      subAccounts: acc.subAccounts ? this.markInitialExpanded(acc.subAccounts) : []
    }));
  }

  exportCsv(): Observable<Blob> {
    const compId = this.companyContext.activeCompany().id;
    let params = new HttpParams();
    if (compId) params = params.set('companyId', compId);

    return this.http.get(`${this.apiUrl}/export-csv`, {
      params,
      responseType: 'blob'
    });
  }

  importCsv(csvContent: string): Observable<{ totalRows: number; createdCount: number; updatedCount: number; errorCount: number; errorMessages: string[] }> {
    const compId = this.companyContext.activeCompany().id;
    return this.http.post<any>(`${this.apiUrl}/import-csv`, {
      csvContent,
      companyId: compId
    });
  }

  private findMatchingStandard(account: AccountDto): AccountingStandardGuidance | null {
    const list = this.standards();
    if (list.length === 0) return null;

    if (account.accountCode.startsWith('111')) return list.find(s => s.standardCode === 'IAS 7') || list[0];
    if (account.accountCode.startsWith('112')) return list.find(s => s.standardCode === 'IFRS 9') || list[0];
    if (account.accountCode.startsWith('113')) return list.find(s => s.standardCode === 'IAS 2') || list[0];
    if (account.accountCode.startsWith('114') || account.accountCode.startsWith('212')) return list.find(s => s.standardCode === 'ZATCA VAT') || list[0];
    if (account.accountCode.startsWith('121')) return list.find(s => s.standardCode === 'IAS 16') || list[0];
    if (account.accountCode.startsWith('41')) return list.find(s => s.standardCode === 'IFRS 15') || list[0];
    if (account.accountCode.startsWith('53101') || account.accountCode.startsWith('222')) return list.find(s => s.standardCode === 'IAS 19') || list[0];
    if (account.accountCode.startsWith('3')) return list.find(s => s.standardCode === 'IAS 1') || list[0];
    
    return list[0];
  }
}

