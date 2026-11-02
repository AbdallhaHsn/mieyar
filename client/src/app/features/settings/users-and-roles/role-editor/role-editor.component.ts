import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import {
  UsersAndRolesService,
  CompanyRoleDto,
  PermissionModuleDto,
  CreateRoleRequest,
  UpdateRoleRequest
} from '../../../../core/services/users-and-roles.service';
import { AccountingTranslatorService } from '../../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../../core/services/language.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-role-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './role-editor.component.html',
  styleUrls: ['./role-editor.component.scss']
})
export class RoleEditorComponent implements OnInit {
  public langService = inject(LanguageService);
  private iamService = inject(UsersAndRolesService);
  private translator = inject(AccountingTranslatorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Mode & State
  isEditing = signal<boolean>(false);
  roleId = signal<string | null>(null);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isGeneratingCode = signal<boolean>(false);
  currentRole = signal<CompanyRoleDto | null>(null);

  // Form Fields
  roleCode = signal<string>('ROLE-001');
  roleNameAr = signal<string>('');
  roleNameEn = signal<string>('');
  unifiedRoleName = signal<string>('');
  roleBackgroundTranslation = signal<string>('');
  roleDescAr = signal<string>('');
  roleDescEn = signal<string>('');
  showDetailedNameInputs = signal<boolean>(false);

  // Permissions Catalog & Selection
  permissionsCatalog = signal<PermissionModuleDto[]>([]);
  selectedPermissions = signal<Set<string>>(new Set<string>());

  // Collapsible module states
  collapsedModules = signal<Set<string>>(new Set<string>());

  // Search & Filter
  permSearchTerm = signal<string>('');
  activeModuleFilter = signal<string>('ALL');

  // Computed Metrics
  totalPermissionsCount = computed(() => {
    let count = 0;
    this.permissionsCatalog().forEach(m => count += m.permissions.length);
    return count;
  });

  selectedPermissionsCount = computed(() => this.selectedPermissions().size);

  selectionPercentage = computed(() => {
    const total = this.totalPermissionsCount();
    if (total === 0) return 0;
    return Math.round((this.selectedPermissionsCount() / total) * 100);
  });

  isAllSelected = computed(() => {
    const total = this.totalPermissionsCount();
    return total > 0 && this.selectedPermissionsCount() === total;
  });

  // Filtered Modules and Permissions
  filteredModules = computed(() => {
    const term = this.permSearchTerm().trim().toLowerCase();
    const moduleFilter = this.activeModuleFilter();
    const catalog = this.permissionsCatalog();

    return catalog.map(module => {
      const moduleMatchesFilter = moduleFilter === 'ALL' || module.moduleKey === moduleFilter;

      if (!moduleMatchesFilter) {
        return { ...module, permissions: [], totalInModule: module.permissions.length, matches: false };
      }

      if (!term) {
        return { ...module, permissions: module.permissions, totalInModule: module.permissions.length, matches: true };
      }

      const matchedPerms = module.permissions.filter(p =>
        p.key.toLowerCase().includes(term) ||
        p.labelAr.toLowerCase().includes(term) ||
        p.labelEn.toLowerCase().includes(term) ||
        p.descriptionAr.toLowerCase().includes(term) ||
        p.descriptionEn.toLowerCase().includes(term) ||
        module.moduleNameAr.toLowerCase().includes(term) ||
        module.moduleNameEn.toLowerCase().includes(term)
      );

      return {
        ...module,
        permissions: matchedPerms,
        totalInModule: module.permissions.length,
        matches: matchedPerms.length > 0
      };
    }).filter(m => m.matches);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.roleId.set(id);
    } else {
      this.generateAutoRoleCode();
    }

    this.loadCatalogAndData();
  }

  loadCatalogAndData(): void {
    this.isLoading.set(true);

    this.iamService.getPermissionsCatalog().subscribe({
      next: (catalog) => {
        this.permissionsCatalog.set(catalog);

        const id = this.roleId();
        if (id) {
          this.iamService.getRoles().subscribe({
            next: (roles) => {
              const role = roles.find(r => r.id === id);
              if (role) {
                this.currentRole.set(role);
                this.populateRoleData(role, catalog);
              } else {
                Swal.fire({
                  title: this.langService.t('roles.alerts.saveErrorTitle'),
                  text: this.langService.t('roles.alerts.notFound'),
                  icon: 'error',
                  confirmButtonText: this.langService.t('common.ok'),
                  confirmButtonColor: '#dc2626'
                });
                this.goBack();
              }
              this.isLoading.set(false);
            },
            error: () => {
              this.isLoading.set(false);
              Swal.fire({
                title: this.langService.t('roles.alerts.saveErrorTitle'),
                text: this.langService.t('roles.alerts.loadError'),
                icon: 'error',
                confirmButtonText: this.langService.t('common.ok'),
                confirmButtonColor: '#dc2626'
              });
            }
          });
        } else {
          this.generateAutoRoleCode();
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
        Swal.fire({
          title: this.langService.t('roles.alerts.saveErrorTitle'),
          text: this.langService.t('roles.alerts.loadError'),
          icon: 'error',
          confirmButtonText: this.langService.t('common.ok'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  onRoleCodeChange(val: string): void {
    this.roleCode.set((val || '').toUpperCase().trim());
  }

  generateAutoRoleCode(): void {
    this.isGeneratingCode.set(true);
    this.iamService.getRoles().subscribe({
      next: (roles) => {
        let maxSeq = 0;
        const regex = /^ROLE[-_]?(\d+)$/i;
        roles.forEach(r => {
          const match = r.code ? r.code.match(regex) : null;
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num;
            }
          }
        });

        const nextNum = maxSeq > 0 ? maxSeq + 1 : 1;
        const nextSeq = nextNum.toString().padStart(3, '0');
        this.roleCode.set(`ROLE-${nextSeq}`);
        this.isGeneratingCode.set(false);
      },
      error: () => {
        if (!this.roleCode()) {
          this.roleCode.set('ROLE-001');
        }
        this.isGeneratingCode.set(false);
      }
    });
  }

  private populateRoleData(role: CompanyRoleDto, catalog: PermissionModuleDto[]): void {
    this.roleCode.set(role.code);
    this.roleNameAr.set(role.nameAr);
    this.roleNameEn.set(role.nameEn);
    this.unifiedRoleName.set(role.nameAr || role.nameEn);
    this.roleBackgroundTranslation.set(role.nameEn ? `${this.langService.currentLang() === 'ar' ? 'الترجمة:' : 'Translation:'} ${role.nameEn}` : '');
    this.roleDescAr.set(role.descriptionAr || '');
    this.roleDescEn.set(role.descriptionEn || '');

    const set = new Set<string>();
    if (role.permissions.includes('*')) {
      catalog.forEach(m => m.permissions.forEach(p => set.add(p.key)));
    } else {
      role.permissions.forEach(p => set.add(p));
    }
    this.selectedPermissions.set(set);
  }

  // --- SINGLE-ENTRY BILINGUAL AUTO-TRANSLATION ---
  onUnifiedRoleNameChange(text: string): void {
    this.unifiedRoleName.set(text);
    if (!text.trim()) {
      this.roleNameAr.set('');
      this.roleNameEn.set('');
      this.roleBackgroundTranslation.set('');
      return;
    }

    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      this.roleNameAr.set(text);
      const instant = this.translator.translateArabicToEnglish(text);
      this.roleNameEn.set(instant);
      this.roleBackgroundTranslation.set(`${this.langService.currentLang() === 'ar' ? 'الترجمة:' : 'Translation:'} ${instant}`);
      this.translator.translateWithOnlineRefinement(
        text,
        () => {},
        (refined) => {
          this.roleNameEn.set(refined);
          this.roleBackgroundTranslation.set(`${this.langService.currentLang() === 'ar' ? 'الترجمة:' : 'Translation:'} ${refined}`);
        }
      );
    } else {
      this.roleNameEn.set(text);
      const instant = this.translator.translateEnglishToArabic(text);
      this.roleNameAr.set(instant);
      this.roleBackgroundTranslation.set(`${this.langService.currentLang() === 'ar' ? 'الترجمة:' : 'Translation:'} ${instant}`);
      this.translator.translateOnline(text, 'en', 'ar').then(refined => {
        if (refined) {
          this.roleNameAr.set(refined);
          this.roleBackgroundTranslation.set(`${this.langService.currentLang() === 'ar' ? 'الترجمة:' : 'Translation:'} ${refined}`);
        }
      });
    }
  }

  async forceRetranslateRole(): Promise<void> {
    const text = this.unifiedRoleName() || this.roleNameAr() || this.roleNameEn();
    if (!text) return;
    const isAr = this.translator.containsArabic(text);
    if (isAr) {
      const refined = await this.translator.translateOnline(text, 'ar', 'en');
      this.roleNameEn.set(refined || this.translator.translateArabicToEnglish(text));
      this.roleBackgroundTranslation.set(`${this.langService.currentLang() === 'ar' ? 'الترجمة:' : 'Translation:'} ${this.roleNameEn()}`);
    } else {
      const refined = await this.translator.translateOnline(text, 'en', 'ar');
      this.roleNameAr.set(refined || this.translator.translateEnglishToArabic(text));
      this.roleBackgroundTranslation.set(`${this.langService.currentLang() === 'ar' ? 'الترجمة:' : 'Translation:'} ${this.roleNameAr()}`);
    }
  }

  onRoleDescArChange(val: string): void {
    this.roleDescAr.set(val);
    if (!this.roleDescEn().trim() || !this.isEditing()) {
      this.roleDescEn.set(this.translator.autoTranslate(val, 'ar'));
    }
  }

  // --- PERMISSIONS MATRIX ACTIONS ---
  isPermissionSelected(key: string): boolean {
    return this.selectedPermissions().has(key);
  }

  togglePermission(key: string): void {
    const set = new Set(this.selectedPermissions());
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    this.selectedPermissions.set(set);
  }

  isModuleAllSelected(module: PermissionModuleDto): boolean {
    const set = this.selectedPermissions();
    return module.permissions.length > 0 && module.permissions.every(p => set.has(p.key));
  }

  getModuleSelectedCount(module: PermissionModuleDto): number {
    const set = this.selectedPermissions();
    return module.permissions.filter(p => set.has(p.key)).length;
  }

  toggleModulePermissions(module: PermissionModuleDto): void {
    const set = new Set(this.selectedPermissions());
    const allSelected = this.isModuleAllSelected(module);

    if (allSelected) {
      module.permissions.forEach(p => set.delete(p.key));
    } else {
      module.permissions.forEach(p => set.add(p.key));
    }
    this.selectedPermissions.set(set);
  }

  selectAllPermissions(): void {
    const set = new Set<string>();
    this.permissionsCatalog().forEach(m => m.permissions.forEach(p => set.add(p.key)));
    this.selectedPermissions.set(set);
  }

  clearAllPermissions(): void {
    this.selectedPermissions.set(new Set<string>());
  }

  // --- MODULE COLLAPSE / EXPAND ---
  isModuleCollapsed(key: string): boolean {
    return this.collapsedModules().has(key);
  }

  toggleModuleCollapse(key: string): void {
    const set = new Set(this.collapsedModules());
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    this.collapsedModules.set(set);
  }

  collapseAllModules(): void {
    const set = new Set<string>();
    this.permissionsCatalog().forEach(m => set.add(m.moduleKey));
    this.collapsedModules.set(set);
  }

  expandAllModules(): void {
    this.collapsedModules.set(new Set<string>());
  }

  // --- SAVE & CANCEL WITH I18N VALIDATION ---
  saveRole(): void {
    if (!this.roleNameAr().trim() && this.unifiedRoleName().trim()) {
      this.onUnifiedRoleNameChange(this.unifiedRoleName().trim());
    }

    const nameAr = this.roleNameAr().trim();
    const code = this.roleCode().trim();

    // Validation using active language JSON keys
    if (!nameAr || (!this.isEditing() && !code)) {
      Swal.fire({
        title: this.langService.t('roles.validation.missingFieldsTitle'),
        text: this.langService.t('roles.validation.missingFields'),
        icon: 'warning',
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const perms = Array.from(this.selectedPermissions());
    if (perms.length === 0) {
      Swal.fire({
        title: this.langService.t('roles.validation.permsWarningTitle'),
        text: this.langService.t('roles.validation.selectAtLeastOne'),
        icon: 'warning',
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    this.isSaving.set(true);

    if (this.isEditing()) {
      const updateReq: UpdateRoleRequest = {
        nameAr: nameAr,
        nameEn: this.roleNameEn().trim() || nameAr,
        descriptionAr: this.roleDescAr().trim() || undefined,
        descriptionEn: this.roleDescEn().trim() || undefined,
        permissions: perms
      };

      this.iamService.updateRole(this.roleId()!, updateReq).subscribe({
        next: () => {
          this.isSaving.set(false);
          Swal.fire({
            title: this.langService.t('roles.alerts.saveSuccessTitle'),
            text: this.langService.t('roles.alerts.updateSuccessMsg'),
            icon: 'success',
            confirmButtonText: this.langService.t('roles.alerts.backToRolesBtn'),
            confirmButtonColor: '#059669'
          }).then(() => {
            this.goBack();
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          Swal.fire({
            title: this.langService.t('roles.alerts.saveErrorTitle'),
            text: err.error?.description || this.langService.t('roles.alerts.saveErrorMsg'),
            icon: 'error',
            confirmButtonText: this.langService.t('common.ok'),
            confirmButtonColor: '#dc2626'
          });
        }
      });
    } else {
      const createReq: CreateRoleRequest = {
        code: code,
        nameAr: nameAr,
        nameEn: this.roleNameEn().trim() || nameAr,
        descriptionAr: this.roleDescAr().trim() || undefined,
        descriptionEn: this.roleDescEn().trim() || undefined,
        permissions: perms
      };

      this.iamService.createRole(createReq).subscribe({
        next: () => {
          this.isSaving.set(false);
          Swal.fire({
            title: this.langService.t('roles.alerts.saveSuccessTitle'),
            text: this.langService.t('roles.alerts.createSuccessMsg'),
            icon: 'success',
            confirmButtonText: this.langService.t('roles.alerts.backToRolesBtn'),
            confirmButtonColor: '#059669'
          }).then(() => {
            this.goBack();
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          Swal.fire({
            title: this.langService.t('roles.alerts.saveErrorTitle'),
            text: err.error?.description || this.langService.t('roles.alerts.saveErrorMsg'),
            icon: 'error',
            confirmButtonText: this.langService.t('common.ok'),
            confirmButtonColor: '#dc2626'
          });
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/settings/users-and-roles'], { queryParams: { tab: 'roles' } });
  }
}
