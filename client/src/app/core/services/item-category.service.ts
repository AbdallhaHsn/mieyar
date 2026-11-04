import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError, map, tap } from 'rxjs';
import { CompanyContextService } from './company-context.service';
import { AccountingTranslatorService } from './accounting-translator.service';
import { LanguageService } from './language.service';
import Swal from 'sweetalert2';

export interface ItemCategoryDto {
  id: string;
  companyId?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ItemCategoryService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);
  private translator = inject(AccountingTranslatorService);
  private langService = inject(LanguageService);

  private getEffectiveCompanyId(companyId?: string): string {
    return companyId || this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
  }

  private getStorageKey(companyId?: string): string {
    return `alrobban_item_categories_${this.getEffectiveCompanyId(companyId)}`;
  }

  getCategories(companyId?: string): Observable<ItemCategoryDto[]> {
    const cId = this.getEffectiveCompanyId(companyId);
    const key = this.getStorageKey(companyId);
    const stored = localStorage.getItem(key);
    let list: ItemCategoryDto[] = stored ? JSON.parse(stored) : [];

    // Filter out unwanted sample categories (CAT-CONC, CAT-ALUM, etc.)
    const sampleIds = new Set(['cat-001', 'cat-002', 'cat-003', 'cat-004', 'cat-005', 'cat-006', 'cat-007', 'cat-008']);
    const sampleCodes = new Set(['CAT-CONC', 'CAT-ALUM', 'CAT-STEEL', 'CAT-CHEM', 'CAT-BLDG', 'CAT-ELEC', 'CAT-SPARE', 'CAT-GEN']);

    const filtered = list.filter(c => !sampleIds.has(c.id) && !sampleCodes.has(c.code));
    if (filtered.length !== list.length) {
      list = filtered;
      localStorage.setItem(key, JSON.stringify(list));
    }

    const params = new HttpParams().set('companyId', cId);
    return this.http.get<ItemCategoryDto[]>('/api/items/categories', { params }).pipe(
      map(remote => (remote && remote.length > 0 ? remote : list)),
      tap(res => {
        if (res.length > 0) {
          localStorage.setItem(key, JSON.stringify(res));
        }
      }),
      catchError(() => of(list))
    );
  }

  saveCategory(category: Partial<ItemCategoryDto>, companyId?: string): Observable<ItemCategoryDto> {
    const key = this.getStorageKey(companyId);
    const list = this.getCategoriesSync(companyId);
    const cId = this.getEffectiveCompanyId(companyId);

    const nameAr = (category.nameAr || 'تصنيف جديد').trim();
    const nameEn = (category.nameEn || this.translator.translateArabicToEnglish(nameAr)).trim();

    const item: ItemCategoryDto = {
      id: category.id || `cat-${Date.now()}`,
      companyId: cId,
      code: category.code || `CAT-${Date.now().toString().slice(-4)}`,
      nameAr,
      nameEn,
      description: category.description || '',
      color: category.color || this.getRandomColor(),
      icon: category.icon || 'pi pi-folder',
      isActive: category.isActive ?? true
    };

    const upsertLocal = (savedItem: ItemCategoryDto) => {
      const index = list.findIndex(c => c.id === savedItem.id || c.id === item.id || (savedItem.code && c.code.toLowerCase() === savedItem.code.toLowerCase()));
      if (index >= 0) {
        list[index] = savedItem;
      } else {
        list.push(savedItem);
      }
      localStorage.setItem(key, JSON.stringify(list));
    };

    return this.http.post<ItemCategoryDto>('/api/items/categories', item).pipe(
      tap(saved => upsertLocal(saved)),
      catchError(() => {
        upsertLocal(item);
        return of(item);
      })
    );
  }

  deleteCategory(id: string, companyId?: string): Observable<boolean> {
    const cId = this.getEffectiveCompanyId(companyId);
    const key = this.getStorageKey(companyId);
    const list = this.getCategoriesSync(companyId).filter(c => c.id !== id);
    localStorage.setItem(key, JSON.stringify(list));

    const params = new HttpParams().set('companyId', cId);
    return this.http.delete<boolean>(`/api/items/categories/${encodeURIComponent(id)}`, { params }).pipe(
      catchError(() => of(true))
    );
  }

  clearAllCategories(companyId?: string): Observable<boolean> {
    const cId = this.getEffectiveCompanyId(companyId);
    const key = this.getStorageKey(companyId);
    localStorage.removeItem(key);

    const params = new HttpParams().set('companyId', cId);
    return this.http.delete<boolean>('/api/items/categories', { params }).pipe(
      catchError(() => of(true))
    );
  }

  async promptCreateCategory(defaultNameAr = '', companyId?: string): Promise<ItemCategoryDto | null> {
    const isAr = this.langService.currentLang() === 'ar';
    const result = await Swal.fire({
      title: this.langService.t('itemCategory.addCategoryTitle'),
      html: `
        <div style="display:flex; flex-direction:column; gap:0.75rem; text-align:${isAr ? 'right' : 'left'}; font-size:0.9rem;">
          <div>
            <label style="font-weight:600; display:block; margin-bottom:0.25rem;">${this.langService.t('itemCategory.categoryNameArLabel')} <span style="color:#ef4444;">*</span></label>
            <input id="swal-cat-name-ar" class="swal2-input" placeholder="e.g. Hydraulic Spare Parts" value="${defaultNameAr}" style="width:100%; margin:0; padding:0.55rem; font-size:0.9rem;" />
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:0.25rem;">${this.langService.t('itemCategory.categoryNameEnLabel')}</label>
            <input id="swal-cat-name-en" class="swal2-input" placeholder="e.g. Hydraulic Spare Parts" style="width:100%; margin:0; padding:0.55rem; font-size:0.9rem; direction:ltr;" />
          </div>
          <div>
            <label style="font-weight:600; display:block; margin-bottom:0.25rem;">${this.langService.t('itemCategory.categoryCodeLabel')}</label>
            <input id="swal-cat-code" class="swal2-input" placeholder="e.g. CAT-HYD" style="width:100%; margin:0; padding:0.55rem; font-size:0.9rem; direction:ltr;" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: this.langService.t('itemCategory.saveCategoryBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      focusConfirm: false,
      didOpen: () => {
        const arInput = document.getElementById('swal-cat-name-ar') as HTMLInputElement;
        const enInput = document.getElementById('swal-cat-name-en') as HTMLInputElement;
        const codeInput = document.getElementById('swal-cat-code') as HTMLInputElement;

        if (arInput && enInput) {
          if (arInput.value) {
            enInput.value = this.translator.translateArabicToEnglish(arInput.value);
            if (!codeInput.value) {
              codeInput.value = `CAT-${arInput.value.slice(0, 3).toUpperCase()}`;
            }
          }
          arInput.addEventListener('input', () => {
            enInput.value = this.translator.translateArabicToEnglish(arInput.value);
            if (!codeInput.value || codeInput.value.startsWith('CAT-')) {
              const clean = enInput.value.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
              if (clean) codeInput.value = `CAT-${clean}`;
            }
          });
        }
      },
      preConfirm: () => {
        const nameAr = (document.getElementById('swal-cat-name-ar') as HTMLInputElement)?.value?.trim();
        const nameEn = (document.getElementById('swal-cat-name-en') as HTMLInputElement)?.value?.trim();
        const code = (document.getElementById('swal-cat-code') as HTMLInputElement)?.value?.trim();

        if (!nameAr) {
          Swal.showValidationMessage(this.langService.t('itemCategory.categoryRequired'));
          return null;
        }

        return { nameAr, nameEn, code };
      }
    });

    if (result.isConfirmed && result.value) {
      const saved = await this.saveCategory(result.value, companyId).toPromise();
      if (saved) {
        const catName = this.langService.currentLang() === 'en' ? (saved.nameEn || saved.nameAr) : saved.nameAr;
        Swal.fire({
          icon: 'success',
          title: this.langService.t('itemCategory.categoryCreatedSuccess'),
          text: this.langService.t('itemCategory.categoryAddedPrefix').replace('{name}', catName),
          timer: 1800,
          showConfirmButton: false
        });
        return saved;
      }
    }

    return null;
  }

  async promptManageCategories(companyId?: string): Promise<boolean> {
    const list = this.getCategoriesSync(companyId);
    if (list.length === 0) {
      const res = await Swal.fire({
        title: this.langService.t('itemCategory.noCustomCategoriesTitle'),
        text: this.langService.t('itemCategory.noCustomCategoriesText'),
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: this.langService.t('itemCategory.addNewCategoryBtn'),
        cancelButtonText: this.langService.t('common.close'),
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b'
      });
      if (res.isConfirmed) {
        await this.promptCreateCategory('', companyId);
        return true;
      }
      return false;
    }

    const htmlList = list.map(c => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; margin-bottom:6px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
        <div style="text-align:right;">
          <strong style="color:#0f172a; font-size:0.9rem;">${c.nameAr}</strong>
          <small style="display:block; color:#64748b; font-size:0.75rem;">${c.code} - ${c.nameEn}</small>
        </div>
        <button id="del-cat-${c.id}" style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:4px; padding:4px 10px; cursor:pointer; font-size:0.8rem; font-weight:600;">
          حذف
        </button>
      </div>
    `).join('');

    return new Promise((resolve) => {
      Swal.fire({
        title: this.langService.t('itemCategory.manageCategoriesTitle'),
        html: `
          <div style="max-height:280px; overflow-y:auto; text-align:inherit; margin-top:0.5rem;">
            ${htmlList}
          </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        denyButtonText: this.langService.t('itemCategory.addNewCategoryBtn'),
        denyButtonColor: '#0284c7',
        confirmButtonText: this.langService.t('itemCategory.clearAllBtn'),
        confirmButtonColor: '#dc2626',
        cancelButtonText: this.langService.t('common.close'),
        cancelButtonColor: '#64748b',
        didOpen: () => {
          list.forEach(c => {
            const btn = document.getElementById(`del-cat-${c.id}`);
            if (btn) {
              btn.addEventListener('click', async () => {
                await this.deleteCategory(c.id, companyId).toPromise();
                Swal.close();
                this.promptManageCategories(companyId);
                resolve(true);
              });
            }
          });
        }
      }).then(async (res) => {
        if (res.isConfirmed) {
          await this.clearAllCategories(companyId).toPromise();
          Swal.fire({ icon: 'success', title: this.langService.t('itemCategory.allCategoriesCleared'), timer: 1500, showConfirmButton: false });
          resolve(true);
        } else if (res.isDenied) {
          await this.promptCreateCategory('', companyId);
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  private getCategoriesSync(companyId?: string): ItemCategoryDto[] {
    const key = this.getStorageKey(companyId);
    const stored = localStorage.getItem(key);
    let list: ItemCategoryDto[] = stored ? JSON.parse(stored) : [];
    const sampleIds = new Set(['cat-001', 'cat-002', 'cat-003', 'cat-004', 'cat-005', 'cat-006', 'cat-007', 'cat-008']);
    const sampleCodes = new Set(['CAT-CONC', 'CAT-ALUM', 'CAT-STEEL', 'CAT-CHEM', 'CAT-BLDG', 'CAT-ELEC', 'CAT-SPARE', 'CAT-GEN']);
    return list.filter(c => !sampleIds.has(c.id) && !sampleCodes.has(c.code));
  }

  private getRandomColor(): string {
    const colors = ['#0284c7', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getDefaultCategories(cId: string): ItemCategoryDto[] {
    // Return empty list so no sample categories are forced
    return [];
  }
}
