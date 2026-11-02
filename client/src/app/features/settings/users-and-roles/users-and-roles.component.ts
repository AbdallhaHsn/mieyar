import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import {
  UsersAndRolesService,
  CompanyUserDto,
  CompanyRoleDto,
  PermissionModuleDto,
  CreateCompanyUserRequest,
  UpdateCompanyUserRequest,
  CreateRoleRequest,
  UpdateRoleRequest
} from '../../../core/services/users-and-roles.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { BranchesWarehousesService, BranchDto } from '../../../core/services/branches-warehouses.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { LanguageService } from '../../../core/services/language.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-users-and-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TranslatePipe],
  templateUrl: './users-and-roles.component.html',
  styleUrls: ['./users-and-roles.component.scss']
})
export class UsersAndRolesComponent implements OnInit {
  public langService = inject(LanguageService);
  private iamService = inject(UsersAndRolesService);
  private translator = inject(AccountingTranslatorService);
  private bwService = inject(BranchesWarehousesService);
  private companyContext = inject(CompanyContextService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Active Tab
  activeTab = signal<'users' | 'roles'>('users');

  // Loading States
  isLoadingUsers = signal(false);
  isLoadingRoles = signal(false);
  isSavingUser = signal(false);
  isSavingRole = signal(false);

  // Data Signals
  users = signal<CompanyUserDto[]>([]);
  roles = signal<CompanyRoleDto[]>([]);
  branches = signal<BranchDto[]>([]);
  permissionsCatalog = signal<PermissionModuleDto[]>([]);

  // Search & Filter
  userSearchTerm = signal('');
  userRoleFilter = signal<string>('ALL');
  roleSearchTerm = signal('');

  // Modals visibility
  showUserModal = signal(false);
  showPasswordModal = signal(false);
  showRoleModal = signal(false);

  // User Form State
  isEditingUser = signal(false);
  editingUserId = signal<string | null>(null);
  userFormUserName = signal('');
  userFormEmail = signal('');
  userFormPassword = signal('');
  userFormFullNameAr = signal('');
  userFormFullNameEn = signal('');
  unifiedUserFullName = signal('');
  userBackgroundTranslation = signal('');
  userFormPhoneNumber = signal('');
  userFormRoleEnum = signal<number>(3); // Default Accountant
  userFormCompanyRoleId = signal<string | null>(null);
  userFormBranchId = signal<string | null>(null);
  userFormIsActive = signal(true);

  // Password Reset Form State
  passwordTargetUser = signal<CompanyUserDto | null>(null);
  newPassword = signal('');
  confirmPassword = signal('');

  // Role Form State
  isEditingRole = signal(false);
  editingRoleId = signal<string | null>(null);
  roleFormCode = signal('');
  roleFormNameAr = signal('');
  roleFormNameEn = signal('');
  unifiedRoleName = signal('');
  roleBackgroundTranslation = signal('');
  roleFormDescAr = signal('');
  roleFormDescEn = signal('');
  roleSelectedPermissions = signal<Set<string>>(new Set<string>());

  // Computed Counters
  totalUsersCount = computed(() => this.users().length);
  activeUsersCount = computed(() => this.users().filter(u => u.isActive).length);
  inactiveUsersCount = computed(() => this.users().filter(u => !u.isActive).length);
  rolesCount = computed(() => this.roles().length);

  // Filtered Users
  filteredUsers = computed(() => {
    const term = this.userSearchTerm().trim().toLowerCase();
    const filter = this.userRoleFilter();

    return this.users().filter(u => {
      const matchSearch = !term ||
        u.userName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.fullNameAr.toLowerCase().includes(term) ||
        u.fullNameEn.toLowerCase().includes(term);

      const matchRole = filter === 'ALL' ||
        (u.companyRoleCode && u.companyRoleCode === filter) ||
        (!u.companyRoleCode && u.role.toString() === filter);

      return matchSearch && matchRole;
    });
  });

  // Filtered Roles
  filteredRoles = computed(() => {
    const term = this.roleSearchTerm().trim().toLowerCase();
    return this.roles().filter(r =>
      !term ||
      r.nameAr.toLowerCase().includes(term) ||
      r.nameEn.toLowerCase().includes(term) ||
      r.code.toLowerCase().includes(term)
    );
  });

  // Pagination
  currentUserPage = signal(1);
  userPageSize = signal(10);
  currentRolePage = signal(1);
  rolePageSize = signal(8);

  paginatedUsers = computed(() => {
    const list = this.filteredUsers();
    const start = (this.currentUserPage() - 1) * this.userPageSize();
    return list.slice(start, start + this.userPageSize());
  });

  paginatedRoles = computed(() => {
    const list = this.filteredRoles();
    const start = (this.currentRolePage() - 1) * this.rolePageSize();
    return list.slice(start, start + this.rolePageSize());
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'roles') {
        this.activeTab.set('roles');
      }
    });
    this.loadUsers();
    this.loadRoles();
    this.loadBranches();
    this.loadPermissionsCatalog();
  }

  // --- DATA LOADING ---
  loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.iamService.getUsers().subscribe({
      next: (res) => {
        this.users.set(res);
        this.isLoadingUsers.set(false);
      },
      error: (err) => {
        this.isLoadingUsers.set(false);
        Swal.fire(this.langService.t('usersAndRoles.alerts.errorTitle'), this.langService.t('usersAndRoles.alerts.loadUsersError'), 'error');
      }
    });
  }

  loadRoles(): void {
    this.isLoadingRoles.set(true);
    this.iamService.getRoles().subscribe({
      next: (res) => {
        this.roles.set(res);
        this.isLoadingRoles.set(false);
      },
      error: (err) => {
        this.isLoadingRoles.set(false);
        Swal.fire(this.langService.t('usersAndRoles.alerts.errorTitle'), this.langService.t('usersAndRoles.alerts.loadRolesError'), 'error');
      }
    });
  }

  loadBranches(): void {
    const compId = this.companyContext.activeCompany().id;
    if (!compId) return;
    this.bwService.getBranches(compId).subscribe({
      next: (res) => this.branches.set(res),
      error: () => {}
    });
  }

  loadPermissionsCatalog(): void {
    this.iamService.getPermissionsCatalog().subscribe({
      next: (res) => this.permissionsCatalog.set(res),
      error: () => {}
    });
  }

  // --- SINGLE-ENTRY BILINGUAL AUTO-TRANSLATION (Smart Background Translation) ---
  onUnifiedUserFullNameChange(text: string): void {
    this.unifiedUserFullName.set(text);
    if (!text.trim()) {
      this.userFormFullNameAr.set('');
      this.userFormFullNameEn.set('');
      this.userBackgroundTranslation.set('');
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.userFormFullNameAr.set(text);
      const instant = this.translator.translateArabicToEnglish(text);
      this.userFormFullNameEn.set(instant);
      this.userBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.englishTranslation').replace('{text}', instant));
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.userFormFullNameEn.set(refined);
          this.userBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.englishTranslation').replace('{text}', refined));
        }
      );
    } else {
      this.userFormFullNameEn.set(text);
      const instant = this.translator.translateEnglishToArabic(text);
      this.userFormFullNameAr.set(instant);
      this.userBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.arabicTranslation').replace('{text}', instant));
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.userFormFullNameAr.set(refined);
          this.userBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.arabicTranslation').replace('{text}', refined));
        }
      });
    }
  }

  async forceRetranslateUser(): Promise<void> {
    const text = this.unifiedUserFullName() || this.userFormFullNameAr() || this.userFormFullNameEn();
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const refined = await this.translator.translateOnline(text, 'ar', 'en');
      this.userFormFullNameEn.set(refined || this.translator.translateArabicToEnglish(text));
      this.userBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.englishTranslation').replace('{text}', this.userFormFullNameEn()));
    } else {
      const refined = await this.translator.translateOnline(text, 'en', 'ar');
      this.userFormFullNameAr.set(refined || this.translator.translateEnglishToArabic(text));
      this.userBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.arabicTranslation').replace('{text}', this.userFormFullNameAr()));
    }
  }

  onUserFullNameArChange(val: string): void {
    this.onUnifiedUserFullNameChange(val);
  }

  retranslateUserName(): void {
    this.forceRetranslateUser();
  }

  onUnifiedRoleNameChange(text: string): void {
    this.unifiedRoleName.set(text);
    if (!text.trim()) {
      this.roleFormNameAr.set('');
      this.roleFormNameEn.set('');
      this.roleBackgroundTranslation.set('');
      return;
    }
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.roleFormNameAr.set(text);
      const instant = this.translator.translateArabicToEnglish(text);
      this.roleFormNameEn.set(instant);
      this.roleBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.englishTranslation').replace('{text}', instant));
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.roleFormNameEn.set(refined);
          this.roleBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.englishTranslation').replace('{text}', refined));
        }
      );
    } else {
      this.roleFormNameEn.set(text);
      const instant = this.translator.translateEnglishToArabic(text);
      this.roleFormNameAr.set(instant);
      this.roleBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.arabicTranslation').replace('{text}', instant));
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.roleFormNameAr.set(refined);
          this.roleBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.arabicTranslation').replace('{text}', refined));
        }
      });
    }
  }

  async forceRetranslateRole(): Promise<void> {
    const text = this.unifiedRoleName() || this.roleFormNameAr() || this.roleFormNameEn();
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const refined = await this.translator.translateOnline(text, 'ar', 'en');
      this.roleFormNameEn.set(refined || this.translator.translateArabicToEnglish(text));
      this.roleBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.englishTranslation').replace('{text}', this.roleFormNameEn()));
    } else {
      const refined = await this.translator.translateOnline(text, 'en', 'ar');
      this.roleFormNameAr.set(refined || this.translator.translateEnglishToArabic(text));
      this.roleBackgroundTranslation.set(this.langService.t('usersAndRoles.alerts.arabicTranslation').replace('{text}', this.roleFormNameAr()));
    }
  }

  onRoleNameArChange(val: string): void {
    this.onUnifiedRoleNameChange(val);
  }

  retranslateRoleName(): void {
    this.forceRetranslateRole();
  }

  onRoleDescArChange(val: string): void {
    this.roleFormDescAr.set(val);
    if (!this.roleFormDescEn().trim() || !this.isEditingRole()) {
      this.roleFormDescEn.set(this.translator.autoTranslate(val, 'ar'));
    }
  }

  // --- USER MODAL ACTIONS ---
  openCreateUserModal(): void {
    this.isEditingUser.set(false);
    this.editingUserId.set(null);
    this.userFormUserName.set('');
    this.userFormEmail.set('');
    this.userFormPassword.set('');
    this.userFormFullNameAr.set('');
    this.userFormFullNameEn.set('');
    this.unifiedUserFullName.set('');
    this.userBackgroundTranslation.set('');
    this.userFormPhoneNumber.set('');
    this.userFormBranchId.set(this.branches().length > 0 ? this.branches()[0].id : null);
    this.userFormIsActive.set(true);
    const initialRoleId = this.roles().length > 0 ? this.roles()[0].id : null;
    this.onCompanyRoleChange(initialRoleId);
    this.showUserModal.set(true);
  }

  onCompanyRoleChange(roleId: string | null): void {
    this.userFormCompanyRoleId.set(roleId);
    if (!roleId) {
      this.userFormRoleEnum.set(3); // Accountant fallback
      return;
    }
    const role = this.roles().find(r => r.id === roleId);
    if (role) {
      switch (role.code) {
        case 'SALES_REP':
          this.userFormRoleEnum.set(5); // Salesperson
          break;
        case 'COMPANY_ADMIN':
          this.userFormRoleEnum.set(2); // CompanyAdmin
          break;
        case 'ACCOUNTANT':
        case 'FINANCE_MANAGER':
          this.userFormRoleEnum.set(3); // Accountant
          break;
        case 'AUDIT_SPECIALIST':
          this.userFormRoleEnum.set(4); // FinancialAuditor
          break;
        default:
          break;
      }
    }
  }

  openEditUserModal(user: CompanyUserDto): void {
    this.isEditingUser.set(true);
    this.editingUserId.set(user.id);
    this.userFormUserName.set(user.userName);
    this.userFormEmail.set(user.email);
    this.userFormPassword.set(''); // Blank on edit
    this.userFormFullNameAr.set(user.fullNameAr);
    this.userFormFullNameEn.set(user.fullNameEn);
    this.unifiedUserFullName.set(user.fullNameAr || user.fullNameEn);
    this.userBackgroundTranslation.set(user.fullNameEn ? this.langService.t('usersAndRoles.alerts.englishTranslation').replace('{text}', user.fullNameEn) : '');
    this.userFormPhoneNumber.set(user.phoneNumber || '');
    this.userFormRoleEnum.set(user.role);
    this.userFormCompanyRoleId.set(user.companyRoleId || null);
    this.userFormBranchId.set(user.branchId || null);
    this.userFormIsActive.set(user.isActive);
    this.showUserModal.set(true);
  }

  closeUserModal(): void {
    this.showUserModal.set(false);
  }

  saveUser(): void {
    if (!this.userFormFullNameAr().trim() && this.unifiedUserFullName().trim()) {
      this.onUnifiedUserFullNameChange(this.unifiedUserFullName().trim());
    }

    if ((!this.userFormFullNameAr().trim() && !this.unifiedUserFullName().trim()) || !this.userFormUserName().trim() || !this.userFormEmail().trim()) {
      Swal.fire(this.langService.t('usersAndRoles.alerts.incompleteDataTitle'), this.langService.t('usersAndRoles.alerts.userRequiredFields'), 'warning');
      return;
    }

    if (!this.isEditingUser() && (!this.userFormPassword().trim() || this.userFormPassword().length < 6)) {
      Swal.fire(this.langService.t('usersAndRoles.alerts.incompleteDataTitle'), this.langService.t('usersAndRoles.alerts.passwordMinLength'), 'warning');
      return;
    }

    this.isSavingUser.set(true);

    if (this.isEditingUser()) {
      const updateReq: UpdateCompanyUserRequest = {
        fullNameAr: this.userFormFullNameAr().trim(),
        fullNameEn: this.userFormFullNameEn().trim() || this.userFormFullNameAr().trim(),
        phoneNumber: this.userFormPhoneNumber().trim() || undefined,
        role: this.userFormRoleEnum(),
        companyRoleId: this.userFormCompanyRoleId() || undefined,
        branchId: this.userFormBranchId() || undefined,
        isActive: this.userFormIsActive()
      };

      this.iamService.updateUser(this.editingUserId()!, updateReq).subscribe({
        next: () => {
          this.isSavingUser.set(false);
          this.closeUserModal();
          Swal.fire(this.langService.t('usersAndRoles.alerts.updatedTitle'), this.langService.t('usersAndRoles.alerts.userUpdateSuccess'), 'success');
          this.loadUsers();
          this.loadRoles();
        },
        error: (err) => {
          this.isSavingUser.set(false);
          Swal.fire(this.langService.t('usersAndRoles.alerts.errorTitle'), err.error?.description || this.langService.t('usersAndRoles.alerts.userUpdateError'), 'error');
        }
      });
    } else {
      const createReq: CreateCompanyUserRequest = {
        userName: this.userFormUserName().trim(),
        email: this.userFormEmail().trim(),
        password: this.userFormPassword().trim(),
        fullNameAr: this.userFormFullNameAr().trim(),
        fullNameEn: this.userFormFullNameEn().trim() || this.userFormFullNameAr().trim(),
        phoneNumber: this.userFormPhoneNumber().trim() || undefined,
        role: this.userFormRoleEnum(),
        companyRoleId: this.userFormCompanyRoleId() || undefined,
        branchId: this.userFormBranchId() || undefined
      };

      this.iamService.createUser(createReq).subscribe({
        next: () => {
          this.isSavingUser.set(false);
          this.closeUserModal();
          Swal.fire(this.langService.t('usersAndRoles.alerts.successTitle'), this.langService.t('usersAndRoles.alerts.userCreateSuccess'), 'success');
          this.loadUsers();
          this.loadRoles();
        },
        error: (err) => {
          this.isSavingUser.set(false);
          Swal.fire(this.langService.t('usersAndRoles.alerts.errorTitle'), err.error?.description || this.langService.t('usersAndRoles.alerts.userCreateError'), 'error');
        }
      });
    }
  }

  // --- PASSWORD RESET ---
  openResetPasswordModal(user: CompanyUserDto): void {
    this.passwordTargetUser.set(user);
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showPasswordModal.set(true);
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
    this.passwordTargetUser.set(null);
  }

  savePasswordReset(): void {
    const pwd = this.newPassword().trim();
    const conf = this.confirmPassword().trim();

    if (!pwd || pwd.length < 6) {
      Swal.fire(this.langService.t('usersAndRoles.alerts.warningTitle'), this.langService.t('usersAndRoles.alerts.passwordResetMinLength'), 'warning');
      return;
    }
    if (pwd !== conf) {
      Swal.fire(this.langService.t('usersAndRoles.alerts.warningTitle'), this.langService.t('usersAndRoles.alerts.passwordMismatch'), 'warning');
      return;
    }

    const user = this.passwordTargetUser();
    if (!user) return;

    this.iamService.resetPassword(user.id, pwd).subscribe({
      next: () => {
        this.closePasswordModal();
        Swal.fire(this.langService.t('usersAndRoles.alerts.successTitle'), this.langService.t('usersAndRoles.alerts.passwordResetSuccess').replace('{name}', this.langService.currentLang() === 'en' ? (user.fullNameEn || user.fullNameAr) : user.fullNameAr), 'success');
      },
      error: (err) => {
        Swal.fire(this.langService.t('usersAndRoles.alerts.errorTitle'), err.error?.description || this.langService.t('usersAndRoles.alerts.passwordResetError'), 'error');
      }
    });
  }

  // --- USER TOGGLE STATUS ---
  toggleUserStatus(user: CompanyUserDto): void {
    const newStatus = !user.isActive;
    const actionKey = newStatus ? 'usersAndRoles.alerts.actionActivate' : 'usersAndRoles.alerts.actionDisable';
    const actionText = this.langService.t(actionKey);
    const userName = this.langService.currentLang() === 'en' ? (user.fullNameEn || user.fullNameAr) : user.fullNameAr;

    const title = newStatus
      ? this.langService.t('usersAndRoles.alerts.activateUserConfirmTitle')
      : this.langService.t('usersAndRoles.alerts.disableUserConfirmTitle');

    const text = (newStatus
      ? this.langService.t('usersAndRoles.alerts.activateUserConfirmText')
      : this.langService.t('usersAndRoles.alerts.disableUserConfirmText')).replace('{name}', userName);

    const confirmBtn = newStatus
      ? this.langService.t('usersAndRoles.alerts.confirmActivate')
      : this.langService.t('usersAndRoles.alerts.confirmDisable');

    Swal.fire({
      title: title,
      text: text,
      icon: newStatus ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: confirmBtn,
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: newStatus ? '#059669' : '#dc2626'
    }).then((res) => {
      if (res.isConfirmed) {
        this.iamService.toggleUserStatus(user.id, newStatus).subscribe({
          next: () => {
            Swal.fire(this.langService.t('usersAndRoles.alerts.successTitle'), this.langService.t('usersAndRoles.alerts.userStatusUpdateSuccess').replace('{action}', actionText), 'success');
            this.loadUsers();
          },
          error: (err) => {
            Swal.fire(this.langService.t('usersAndRoles.alerts.errorTitle'), err.error?.description || this.langService.t('usersAndRoles.alerts.userStatusUpdateError'), 'error');
          }
        });
      }
    });
  }

  // --- ROLES & PERMISSIONS MATRIX ACTIONS ---
  openCreateRoleModal(): void {
    this.router.navigate(['/settings/users-and-roles/roles/create']);
  }

  openEditRoleModal(role: CompanyRoleDto): void {
    this.router.navigate(['/settings/users-and-roles/roles', role.id, 'edit']);
  }

  closeRoleModal(): void {
    this.showRoleModal.set(false);
  }

  isPermissionSelected(key: string): boolean {
    return this.roleSelectedPermissions().has(key);
  }

  togglePermission(key: string): void {
    const set = new Set(this.roleSelectedPermissions());
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    this.roleSelectedPermissions.set(set);
  }

  isModuleAllSelected(module: PermissionModuleDto): boolean {
    const set = this.roleSelectedPermissions();
    return module.permissions.every(p => set.has(p.key));
  }

  toggleModulePermissions(module: PermissionModuleDto): void {
    const set = new Set(this.roleSelectedPermissions());
    const allSelected = this.isModuleAllSelected(module);

    if (allSelected) {
      // Unselect all
      module.permissions.forEach(p => set.delete(p.key));
    } else {
      // Select all
      module.permissions.forEach(p => set.add(p.key));
    }
    this.roleSelectedPermissions.set(set);
  }

  selectAllPermissions(): void {
    const set = new Set<string>();
    this.permissionsCatalog().forEach(m => m.permissions.forEach(p => set.add(p.key)));
    this.roleSelectedPermissions.set(set);
  }

  clearAllPermissions(): void {
    this.roleSelectedPermissions.set(new Set<string>());
  }

  saveRole(): void {
    if (!this.roleFormNameAr().trim() && this.unifiedRoleName().trim()) {
      this.onUnifiedRoleNameChange(this.unifiedRoleName().trim());
    }

    if ((!this.roleFormNameAr().trim() && !this.unifiedRoleName().trim()) || (!this.isEditingRole() && !this.roleFormCode().trim())) {
      Swal.fire(this.langService.t('usersAndRoles.alerts.incompleteDataTitle'), this.langService.t('usersAndRoles.alerts.roleNameRequired'), 'warning');
      return;
    }

    const perms = Array.from(this.roleSelectedPermissions());
    if (perms.length === 0) {
      Swal.fire(this.langService.t('usersAndRoles.alerts.incompleteDataTitle'), this.langService.t('usersAndRoles.alerts.rolePermissionsRequired'), 'warning');
      return;
    }

    this.isSavingRole.set(true);

    if (this.isEditingRole()) {
      const updateReq: UpdateRoleRequest = {
        nameAr: this.roleFormNameAr().trim(),
        nameEn: this.roleFormNameEn().trim() || this.roleFormNameAr().trim(),
        descriptionAr: this.roleFormDescAr().trim() || undefined,
        descriptionEn: this.roleFormDescEn().trim() || undefined,
        permissions: perms
      };

      this.iamService.updateRole(this.editingRoleId()!, updateReq).subscribe({
        next: () => {
          this.isSavingRole.set(false);
          this.closeRoleModal();
          Swal.fire(this.langService.t('usersAndRoles.alerts.updatedTitle'), this.langService.t('usersAndRoles.alerts.roleUpdateSuccess'), 'success');
          this.loadRoles();
        },
        error: (err) => {
          this.isSavingRole.set(false);
          Swal.fire(this.langService.t('usersAndRoles.alerts.errorTitle'), err.error?.description || this.langService.t('usersAndRoles.alerts.roleUpdateError'), 'error');
        }
      });
    } else {
      const createReq: CreateRoleRequest = {
        code: this.roleFormCode().trim(),
        nameAr: this.roleFormNameAr().trim(),
        nameEn: this.roleFormNameEn().trim() || this.roleFormNameAr().trim(),
        descriptionAr: this.roleFormDescAr().trim() || undefined,
        descriptionEn: this.roleFormDescEn().trim() || undefined,
        permissions: perms
      };

      this.iamService.createRole(createReq).subscribe({
        next: () => {
          this.isSavingRole.set(false);
          this.closeRoleModal();
          Swal.fire(this.langService.t('usersAndRoles.alerts.successTitle'), this.langService.t('usersAndRoles.alerts.roleCreateSuccess'), 'success');
          this.loadRoles();
        },
        error: (err) => {
          this.isSavingRole.set(false);
          Swal.fire(this.langService.t('usersAndRoles.alerts.errorTitle'), err.error?.description || this.langService.t('usersAndRoles.alerts.roleCreateError'), 'error');
        }
      });
    }
  }

  deleteRole(role: CompanyRoleDto): void {
    if (role.isSystemRole) {
      Swal.fire(this.langService.t('usersAndRoles.alerts.warningTitle'), this.langService.t('usersAndRoles.alerts.systemRoleCannotDelete'), 'warning');
      return;
    }

    if (role.assignedUsersCount > 0) {
      Swal.fire(this.langService.t('usersAndRoles.alerts.warningTitle'), this.langService.t('usersAndRoles.alerts.roleAssignedUsersCannotDelete').replace('{count}', role.assignedUsersCount.toString()), 'warning');
      return;
    }

    const roleName = this.langService.currentLang() === 'en' ? (role.nameEn || role.nameAr) : role.nameAr;
    Swal.fire({
      title: this.langService.t('usersAndRoles.alerts.roleDeleteConfirmTitle'),
      text: this.langService.t('usersAndRoles.alerts.roleDeleteConfirmText').replace('{name}', roleName),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('usersAndRoles.alerts.confirmDelete'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626'
    }).then((res) => {
      if (res.isConfirmed) {
        this.iamService.deleteRole(role.id).subscribe({
          next: () => {
            Swal.fire(this.langService.t('usersAndRoles.alerts.deletedTitle'), this.langService.t('usersAndRoles.alerts.roleDeleteSuccess'), 'success');
            this.loadRoles();
          },
          error: (err) => {
            Swal.fire(this.langService.t('usersAndRoles.alerts.errorTitle'), err.error?.description || this.langService.t('usersAndRoles.alerts.roleDeleteError'), 'error');
          }
        });
      }
    });
  }
}
