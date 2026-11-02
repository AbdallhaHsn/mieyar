import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CompanyContextService } from './company-context.service';

export interface BomComponentDto {
  id: string;
  itemId?: string;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  quantityRequired: number;
  unitOfMeasure: string;
  scrapPercentage: number;
  unitCost: number;
  totalCost: number;
}

export interface BomOperationDto {
  id: string;
  operationNameAr: string;
  operationNameEn: string;
  workstationName: string;
  standardTimeMinutes: number;
  hourlyLaborRate: number;
  hourlyOverheadRate: number;
  totalOperationCost: number;
}

export interface BillOfMaterialsDto {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  finishedProductId: string;
  finishedProductCode: string;
  finishedProductNameAr: string;
  finishedProductNameEn: string;
  outputQuantity: number;
  unitOfMeasure: string;
  rawMaterialsWarehouseId?: string;
  rawMaterialsWarehouseName: string;
  finishedGoodsWarehouseId?: string;
  finishedGoodsWarehouseName: string;
  components: BomComponentDto[];
  operations: BomOperationDto[];
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalUnitCost: number;
  isActive: boolean;
  version: string;
  notes?: string;
}

export type WorkOrderStatus = 'Planned' | 'Confirmed' | 'InProgress' | 'QualityCheck' | 'Completed' | 'Cancelled';

export interface WorkOrderDto {
  id: string;
  companyId: string;
  workOrderNumber: string;
  bomId: string;
  bomCode: string;
  finishedProductId: string;
  finishedProductCode: string;
  finishedProductNameAr: string;
  finishedProductNameEn: string;
  plannedQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  unitOfMeasure: string;
  startDate: string;
  dueDate: string;
  completedDate?: string;
  status: WorkOrderStatus;
  priority: 'Normal' | 'High' | 'Urgent';
  assignedSupervisor: string;
  assignedWorkstation: string;
  rawMaterialsWarehouseName: string;
  finishedGoodsWarehouseName: string;
  estimatedTotalCost: number;
  actualMaterialCost: number;
  actualLaborCost: number;
  actualOverheadCost: number;
  totalActualCost: number;
  unitActualCost: number;
  componentsConsumed?: Array<{
    itemNameAr: string;
    quantity: number;
    unit: string;
    totalCost: number;
  }>;
  notes?: string;
}

export interface WorkstationDto {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: 'Machine' | 'AssemblyLine' | 'Manual';
  hourlyCost: number;
  capacityPerDayHours: number;
  efficiencyPercentage: number;
  status: 'Active' | 'Maintenance' | 'Idle';
  location: string;
}

export interface RawMaterialItemDto {
  id: string;
  companyId?: string;
  itemCode: string;
  nameAr: string;
  nameEn: string;
  category: 'Concrete' | 'Aluminum' | 'Rebar' | 'Chemicals' | 'General';
  categoryAr: string;
  categoryEn: string;
  unitOfMeasure: string;
  unitCost: number;
  currentStock: number;
  warehouseName: string;
  minStockLevel?: number;
  notes?: string;
}

export interface ManufacturingMetricsDto {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  totalBoms: number;
  totalProductionCost: number;
  efficiencyRate: number;
  totalRawMaterials?: number;
  rawMaterialsInventoryValue?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ManufacturingService {
  private http = inject(HttpClient);
  private companyContext = inject(CompanyContextService);
  private baseUrl = `${environment.apiUrl}/api/manufacturing`;

  private isGuid(id?: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
  }

  private getEffectiveCompanyId(companyId?: string): string {
    return companyId || this.companyContext.activeCompany()?.id || '11111111-2222-3333-4444-555555555555';
  }

  // Storage Keys for Offline & Fallback Caching
  private getBomStorageKey(companyId?: string): string {
    return `alrobban_boms_${this.getEffectiveCompanyId(companyId)}`;
  }

  private getWorkOrdersStorageKey(companyId?: string): string {
    return `alrobban_work_orders_${this.getEffectiveCompanyId(companyId)}`;
  }

  private getWorkstationsStorageKey(companyId?: string): string {
    return `alrobban_workstations_${this.getEffectiveCompanyId(companyId)}`;
  }

  private getRawMaterialsStorageKey(companyId?: string): string {
    return `alrobban_raw_materials_${this.getEffectiveCompanyId(companyId)}`;
  }

  // =========================================================================
  // 1. Bill of Materials (BOM - شجرة المنتج وقائمة المواد)
  // =========================================================================
  getBoms(companyId?: string): Observable<BillOfMaterialsDto[]> {
    const cId = this.getEffectiveCompanyId(companyId);
    let params = new HttpParams();
    if (this.isGuid(cId)) {
      params = params.set('companyId', cId);
    }

    return this.http.get<BillOfMaterialsDto[]>(`${this.baseUrl}/boms`, { params }).pipe(
      tap(boms => {
        if (boms && boms.length > 0) {
          localStorage.setItem(this.getBomStorageKey(companyId), JSON.stringify(boms));
        }
      }),
      catchError(() => {
        const key = this.getBomStorageKey(companyId);
        const stored = localStorage.getItem(key);
        let list: BillOfMaterialsDto[] = stored ? JSON.parse(stored) : [];
        if (list.length === 0 && this.companyContext.isDemoCompany(cId)) {
          list = this.getDefaultBoms(cId);
          localStorage.setItem(key, JSON.stringify(list));
        }
        return of(list);
      })
    );
  }

  saveBom(bom: Partial<BillOfMaterialsDto>, companyId?: string): Observable<BillOfMaterialsDto> {
    const cId = this.getEffectiveCompanyId(companyId);
    const matCost = (bom.components || []).reduce((acc, c) => acc + (Number(c.totalCost) || 0), 0);
    const labCost = (bom.operations || []).reduce((acc, o) => {
      const hours = (Number(o.standardTimeMinutes) || 0) / 60;
      return acc + (hours * (Number(o.hourlyLaborRate) || 0));
    }, 0);
    const ovhCost = (bom.operations || []).reduce((acc, o) => {
      const hours = (Number(o.standardTimeMinutes) || 0) / 60;
      return acc + (hours * (Number(o.hourlyOverheadRate) || 0));
    }, 0);

    const fullBom: BillOfMaterialsDto = {
      id: bom.id || `bom-${Date.now()}`,
      companyId: cId,
      code: bom.code || `BOM-${Date.now().toString().slice(-4)}`,
      nameAr: bom.nameAr || 'شجرة منتج صناعي جديدة',
      nameEn: bom.nameEn || 'New Industrial Bill of Materials',
      finishedProductId: bom.finishedProductId || '',
      finishedProductCode: bom.finishedProductCode || 'PRD-NEW',
      finishedProductNameAr: bom.finishedProductNameAr || '',
      finishedProductNameEn: bom.finishedProductNameEn || '',
      outputQuantity: Number(bom.outputQuantity) || 1,
      unitOfMeasure: bom.unitOfMeasure || 'وحدة',
      rawMaterialsWarehouseName: bom.rawMaterialsWarehouseName || 'مستودع المواد الخام',
      finishedGoodsWarehouseName: bom.finishedGoodsWarehouseName || 'مستودع المنتجات تامة الصنع',
      components: bom.components || [],
      operations: bom.operations || [],
      totalMaterialCost: Number(matCost.toFixed(2)),
      totalLaborCost: Number(labCost.toFixed(2)),
      totalOverheadCost: Number(ovhCost.toFixed(2)),
      totalUnitCost: Number((matCost + labCost + ovhCost).toFixed(2)),
      isActive: bom.isActive ?? true,
      version: bom.version || '1.0',
      notes: bom.notes || ''
    };

    const isUpdate = this.isGuid(bom.id);
    const payload = {
      ...(isUpdate ? { id: bom.id } : { companyId: this.isGuid(cId) ? cId : null }),
      code: fullBom.code,
      nameAr: fullBom.nameAr,
      nameEn: fullBom.nameEn,
      finishedProductId: fullBom.finishedProductId,
      finishedProductCode: fullBom.finishedProductCode,
      finishedProductNameAr: fullBom.finishedProductNameAr,
      finishedProductNameEn: fullBom.finishedProductNameEn,
      outputQuantity: fullBom.outputQuantity,
      unitOfMeasure: fullBom.unitOfMeasure,
      rawMaterialsWarehouseName: fullBom.rawMaterialsWarehouseName,
      finishedGoodsWarehouseName: fullBom.finishedGoodsWarehouseName,
      version: fullBom.version,
      notes: fullBom.notes,
      components: (fullBom.components || []).map(c => ({
        itemId: this.isGuid(c.itemId) ? c.itemId : null,
        itemCode: c.itemCode,
        nameAr: c.itemNameAr,
        nameEn: c.itemNameEn,
        quantityRequired: Number(c.quantityRequired) || 0,
        unitOfMeasure: c.unitOfMeasure,
        scrapPercentage: Number(c.scrapPercentage) || 0,
        unitCost: Number(c.unitCost) || 0
      })),
      operations: (fullBom.operations || []).map(o => ({
        operationNameAr: o.operationNameAr,
        operationNameEn: o.operationNameEn,
        workstationName: o.workstationName,
        standardTimeMinutes: Number(o.standardTimeMinutes) || 0,
        hourlyLaborRate: Number(o.hourlyLaborRate) || 0,
        hourlyOverheadRate: Number(o.hourlyOverheadRate) || 0
      }))
    };

    const apiCall = isUpdate
      ? this.http.put<BillOfMaterialsDto>(`${this.baseUrl}/boms/${bom.id}`, payload)
      : this.http.post<BillOfMaterialsDto>(`${this.baseUrl}/boms`, payload);

    return apiCall.pipe(
      tap(saved => this.updateLocalBomCache(saved, companyId)),
      catchError(() => {
        this.updateLocalBomCache(fullBom, companyId);
        return of(fullBom);
      })
    );
  }

  private updateLocalBomCache(bom: BillOfMaterialsDto, companyId?: string): void {
    const key = this.getBomStorageKey(companyId);
    const stored = localStorage.getItem(key);
    let list: BillOfMaterialsDto[] = stored ? JSON.parse(stored) : [];
    const index = list.findIndex(b => b.id === bom.id || b.code === bom.code);
    if (index >= 0) {
      list[index] = bom;
    } else {
      list.unshift(bom);
    }
    localStorage.setItem(key, JSON.stringify(list));
  }

  deleteBom(id: string, companyId?: string): Observable<{ success: boolean }> {
    const key = this.getBomStorageKey(companyId);
    const stored = localStorage.getItem(key);
    if (stored) {
      let list: BillOfMaterialsDto[] = JSON.parse(stored);
      list = list.filter(b => b.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
    }

    if (this.isGuid(id)) {
      return this.http.delete<{ success: boolean }>(`${this.baseUrl}/boms/${id}`).pipe(
        catchError(() => of({ success: true }))
      );
    }
    return of({ success: true });
  }

  // =========================================================================
  // 2. Work Orders (أوامر التشغيل والإنتاج)
  // =========================================================================
  getWorkOrders(companyId?: string): Observable<WorkOrderDto[]> {
    const cId = this.getEffectiveCompanyId(companyId);
    let params = new HttpParams();
    if (this.isGuid(cId)) {
      params = params.set('companyId', cId);
    }

    return this.http.get<WorkOrderDto[]>(`${this.baseUrl}/work-orders`, { params }).pipe(
      tap(orders => {
        if (orders && orders.length > 0) {
          localStorage.setItem(this.getWorkOrdersStorageKey(companyId), JSON.stringify(orders));
        }
      }),
      catchError(() => {
        const key = this.getWorkOrdersStorageKey(companyId);
        const stored = localStorage.getItem(key);
        let list: WorkOrderDto[] = stored ? JSON.parse(stored) : [];
        if (list.length === 0 && this.companyContext.isDemoCompany(cId)) {
          list = this.getDefaultWorkOrders(cId);
          localStorage.setItem(key, JSON.stringify(list));
        }
        return of(list);
      })
    );
  }

  createWorkOrder(data: Partial<WorkOrderDto>, companyId?: string): Observable<WorkOrderDto> {
    const cId = this.getEffectiveCompanyId(companyId);
    const key = this.getWorkOrdersStorageKey(companyId);
    const stored = localStorage.getItem(key);
    let list: WorkOrderDto[] = stored ? JSON.parse(stored) : [];

    const newOrder: WorkOrderDto = {
      id: data.id || `wo-${Date.now()}`,
      companyId: cId,
      workOrderNumber: data.workOrderNumber || `WO-2026-${String(list.length + 1).padStart(4, '0')}`,
      bomId: data.bomId || '',
      bomCode: data.bomCode || '',
      finishedProductId: data.finishedProductId || '',
      finishedProductCode: data.finishedProductCode || '',
      finishedProductNameAr: data.finishedProductNameAr || '',
      finishedProductNameEn: data.finishedProductNameEn || '',
      plannedQuantity: Number(data.plannedQuantity) || 1,
      completedQuantity: 0,
      rejectedQuantity: 0,
      unitOfMeasure: data.unitOfMeasure || 'وحدة',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      dueDate: data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Planned',
      priority: data.priority || 'Normal',
      assignedSupervisor: data.assignedSupervisor || 'م. حسام الدين الخياط',
      assignedWorkstation: data.assignedWorkstation || 'ورشة التصنيع العامة',
      rawMaterialsWarehouseName: data.rawMaterialsWarehouseName || 'مستودع المواد الخام',
      finishedGoodsWarehouseName: data.finishedGoodsWarehouseName || 'مستودع المنتجات الجاهزة',
      estimatedTotalCost: Number(data.estimatedTotalCost) || 0,
      actualMaterialCost: 0,
      actualLaborCost: 0,
      actualOverheadCost: 0,
      totalActualCost: 0,
      unitActualCost: 0,
      notes: data.notes || ''
    };

    const payload = {
      companyId: this.isGuid(cId) ? cId : null,
      bomId: this.isGuid(data.bomId) ? data.bomId : null,
      workOrderNumber: newOrder.workOrderNumber,
      finishedProductId: newOrder.finishedProductId,
      finishedProductCode: newOrder.finishedProductCode,
      finishedProductNameAr: newOrder.finishedProductNameAr,
      finishedProductNameEn: newOrder.finishedProductNameEn,
      plannedQuantity: newOrder.plannedQuantity,
      unitOfMeasure: newOrder.unitOfMeasure,
      startDate: new Date(newOrder.startDate).toISOString(),
      dueDate: new Date(newOrder.dueDate).toISOString(),
      priority: newOrder.priority,
      assignedSupervisor: newOrder.assignedSupervisor,
      assignedWorkstation: newOrder.assignedWorkstation,
      rawMaterialsWarehouseName: newOrder.rawMaterialsWarehouseName,
      finishedGoodsWarehouseName: newOrder.finishedGoodsWarehouseName,
      estimatedTotalCost: newOrder.estimatedTotalCost,
      notes: newOrder.notes
    };

    return this.http.post<WorkOrderDto>(`${this.baseUrl}/work-orders`, payload).pipe(
      tap(saved => {
        list.unshift(saved);
        localStorage.setItem(key, JSON.stringify(list));
      }),
      catchError(() => {
        list.unshift(newOrder);
        localStorage.setItem(key, JSON.stringify(list));
        return of(newOrder);
      })
    );
  }

  updateWorkOrderStatus(id: string, newStatus: WorkOrderStatus, companyId?: string): Observable<WorkOrderDto | null> {
    const key = this.getWorkOrdersStorageKey(companyId);
    const stored = localStorage.getItem(key);
    let list: WorkOrderDto[] = stored ? JSON.parse(stored) : [];
    const order = list.find(w => w.id === id);

    if (order) {
      order.status = newStatus;
      if (newStatus === 'Completed') {
        order.completedQuantity = order.plannedQuantity;
        order.completedDate = new Date().toISOString().split('T')[0];
        if (order.totalActualCost === 0) {
          order.totalActualCost = order.estimatedTotalCost;
          order.actualMaterialCost = order.estimatedTotalCost * 0.75;
          order.actualLaborCost = order.estimatedTotalCost * 0.15;
          order.actualOverheadCost = order.estimatedTotalCost * 0.10;
          order.unitActualCost = order.totalActualCost / (order.completedQuantity || 1);
        }
      } else if (newStatus === 'InProgress' && order.completedQuantity === 0) {
        order.completedQuantity = Math.round(order.plannedQuantity * 0.25);
        order.actualMaterialCost = order.estimatedTotalCost * 0.3;
        order.actualLaborCost = order.estimatedTotalCost * 0.05;
        order.actualOverheadCost = order.estimatedTotalCost * 0.04;
        order.totalActualCost = order.actualMaterialCost + order.actualLaborCost + order.actualOverheadCost;
      }
      localStorage.setItem(key, JSON.stringify(list));
    }

    if (this.isGuid(id)) {
      const payload = {
        status: newStatus,
        completedQuantity: order?.completedQuantity || null,
        rejectedQuantity: order?.rejectedQuantity || null,
        notes: order?.notes || null
      };
      return this.http.put<WorkOrderDto>(`${this.baseUrl}/work-orders/${id}/status`, payload).pipe(
        catchError(() => of(order || null))
      );
    }

    return of(order || null);
  }

  deleteWorkOrder(id: string, companyId?: string): Observable<{ success: boolean }> {
    const key = this.getWorkOrdersStorageKey(companyId);
    const stored = localStorage.getItem(key);
    if (stored) {
      let list: WorkOrderDto[] = JSON.parse(stored);
      list = list.filter(w => w.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
    }

    if (this.isGuid(id)) {
      return this.http.delete<{ success: boolean }>(`${this.baseUrl}/work-orders/${id}`).pipe(
        catchError(() => of({ success: true }))
      );
    }
    return of({ success: true });
  }

  // =========================================================================
  // 3. Workstations (مراكز العمل وخطوط الإنتاج)
  // =========================================================================
  getWorkstations(companyId?: string): Observable<WorkstationDto[]> {
    const cId = this.getEffectiveCompanyId(companyId);
    let params = new HttpParams();
    if (this.isGuid(cId)) {
      params = params.set('companyId', cId);
    }

    return this.http.get<WorkstationDto[]>(`${this.baseUrl}/workstations`, { params }).pipe(
      tap(workstations => {
        if (workstations && workstations.length > 0) {
          localStorage.setItem(this.getWorkstationsStorageKey(companyId), JSON.stringify(workstations));
        }
      }),
      catchError(() => {
        const key = this.getWorkstationsStorageKey(companyId);
        const stored = localStorage.getItem(key);
        let list: WorkstationDto[] = stored ? JSON.parse(stored) : [];
        if (list.length === 0 && this.companyContext.isDemoCompany(cId)) {
          list = this.getDefaultWorkstations(cId);
          localStorage.setItem(key, JSON.stringify(list));
        }
        return of(list);
      })
    );
  }

  saveWorkstation(station: WorkstationDto, companyId?: string): Observable<WorkstationDto> {
    const cId = this.getEffectiveCompanyId(companyId);
    const key = this.getWorkstationsStorageKey(companyId);
    const stored = localStorage.getItem(key);
    let list: WorkstationDto[] = stored ? JSON.parse(stored) : [];

    const item: WorkstationDto = {
      ...station,
      id: station.id || `ws-${Date.now()}`,
      companyId: cId
    };

    const payload = {
      companyId: this.isGuid(cId) ? cId : null,
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      type: item.type,
      hourlyCost: item.hourlyCost,
      capacityPerDayHours: item.capacityPerDayHours,
      efficiencyPercentage: item.efficiencyPercentage,
      location: item.location
    };

    return this.http.post<WorkstationDto>(`${this.baseUrl}/workstations`, payload).pipe(
      tap(saved => {
        const index = list.findIndex(w => w.id === saved.id || w.code === saved.code);
        if (index >= 0) list[index] = saved;
        else list.unshift(saved);
        localStorage.setItem(key, JSON.stringify(list));
      }),
      catchError(() => {
        const index = list.findIndex(w => w.id === item.id || w.code === item.code);
        if (index >= 0) list[index] = item;
        else list.unshift(item);
        localStorage.setItem(key, JSON.stringify(list));
        return of(item);
      })
    );
  }

  deleteWorkstation(id: string, companyId?: string): Observable<boolean> {
    const key = this.getWorkstationsStorageKey(companyId);
    const stored = localStorage.getItem(key);
    if (stored) {
      let list: WorkstationDto[] = JSON.parse(stored);
      list = list.filter(w => w.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
    }

    if (this.isGuid(id)) {
      return this.http.delete<boolean>(`${this.baseUrl}/workstations/${id}`).pipe(
        map(() => true),
        catchError(() => of(true))
      );
    }
    return of(true);
  }

  // =========================================================================
  // 4. Summary Metrics
  // =========================================================================
  getMetrics(companyId?: string): Observable<ManufacturingMetricsDto> {
    const cId = this.getEffectiveCompanyId(companyId);
    let params = new HttpParams();
    if (this.isGuid(cId)) {
      params = params.set('companyId', cId);
    }

    return this.http.get<ManufacturingMetricsDto>(`${this.baseUrl}/metrics`, { params }).pipe(
      catchError(() => {
        const woKey = this.getWorkOrdersStorageKey(companyId);
        const bomKey = this.getBomStorageKey(companyId);
        const woStored = localStorage.getItem(woKey);
        const bomStored = localStorage.getItem(bomKey);

        const workOrders: WorkOrderDto[] = woStored ? JSON.parse(woStored) : [];
        const boms: BillOfMaterialsDto[] = bomStored ? JSON.parse(bomStored) : [];

        const totalCost = workOrders.reduce((acc, w) => acc + (Number(w.totalActualCost) || Number(w.estimatedTotalCost) || 0), 0);
        const active = workOrders.filter(w => w.status === 'InProgress' || w.status === 'Confirmed').length;
        const completed = workOrders.filter(w => w.status === 'Completed').length;

        const rawMatKey = this.getRawMaterialsStorageKey(companyId);
        const rawStored = localStorage.getItem(rawMatKey);
        const rawMaterials: RawMaterialItemDto[] = rawStored ? JSON.parse(rawStored) : [];
        const rawValue = rawMaterials.reduce((acc, m) => acc + ((m.currentStock || 0) * (m.unitCost || 0)), 0);

        return of({
          totalWorkOrders: workOrders.length,
          activeWorkOrders: active,
          completedWorkOrders: completed,
          totalBoms: boms.length,
          totalProductionCost: totalCost,
          efficiencyRate: 94.5,
          totalRawMaterials: rawMaterials.length,
          rawMaterialsInventoryValue: rawValue
        });
      })
    );
  }

  // =========================================================================
  // 5. Raw Materials Catalog (دليل المواد الخام والأصناف الأولية)
  // =========================================================================
  getRawMaterials(companyId?: string): Observable<RawMaterialItemDto[]> {
    const cId = this.getEffectiveCompanyId(companyId);
    let params = new HttpParams();
    if (this.isGuid(cId)) {
      params = params.set('companyId', cId);
    }

    return this.http.get<RawMaterialItemDto[]>(`${this.baseUrl}/raw-materials`, { params }).pipe(
      tap(materials => {
        if (materials && materials.length > 0) {
          localStorage.setItem(this.getRawMaterialsStorageKey(companyId), JSON.stringify(materials));
        }
      }),
      catchError(() => {
        const key = this.getRawMaterialsStorageKey(companyId);
        const stored = localStorage.getItem(key);
        let list: RawMaterialItemDto[] = stored ? JSON.parse(stored) : [];
        if (list.length === 0 && this.companyContext.isDemoCompany(cId)) {
          list = this.getDefaultStandardRawMaterials(companyId);
          localStorage.setItem(key, JSON.stringify(list));
        }
        return of(list);
      })
    );
  }

  saveRawMaterial(material: RawMaterialItemDto, companyId?: string): Observable<RawMaterialItemDto> {
    const cId = this.getEffectiveCompanyId(companyId);
    const key = this.getRawMaterialsStorageKey(companyId);
    const list = this.getRawMaterialsSync(companyId);

    const itemToSave: RawMaterialItemDto = {
      ...material,
      id: material.id || `raw-${Date.now()}`,
      companyId: cId
    };

    const payload = {
      companyId: this.isGuid(cId) ? cId : null,
      itemCode: itemToSave.itemCode,
      nameAr: itemToSave.nameAr,
      nameEn: itemToSave.nameEn,
      category: itemToSave.category || 'General',
      categoryAr: itemToSave.categoryAr,
      categoryEn: itemToSave.categoryEn,
      unitOfMeasure: itemToSave.unitOfMeasure,
      unitCost: itemToSave.unitCost,
      currentStock: itemToSave.currentStock,
      warehouseName: itemToSave.warehouseName,
      minStockLevel: itemToSave.minStockLevel,
      notes: itemToSave.notes
    };

    return this.http.post<RawMaterialItemDto>(`${this.baseUrl}/raw-materials`, payload).pipe(
      tap(saved => {
        const index = list.findIndex(m => m.id === saved.id || m.itemCode === saved.itemCode);
        if (index >= 0) list[index] = saved;
        else list.unshift(saved);
        localStorage.setItem(key, JSON.stringify(list));
      }),
      catchError(() => {
        const index = list.findIndex(m => m.id === itemToSave.id || m.itemCode === itemToSave.itemCode);
        if (index >= 0) list[index] = itemToSave;
        else list.unshift(itemToSave);
        localStorage.setItem(key, JSON.stringify(list));
        return of(itemToSave);
      })
    );
  }

  deleteRawMaterial(id: string, companyId?: string): Observable<boolean> {
    const key = this.getRawMaterialsStorageKey(companyId);
    const list = this.getRawMaterialsSync(companyId).filter(m => m.id !== id);
    localStorage.setItem(key, JSON.stringify(list));

    if (this.isGuid(id)) {
      return this.http.delete<boolean>(`${this.baseUrl}/raw-materials/${id}`).pipe(
        map(() => true),
        catchError(() => of(true))
      );
    }
    return of(true);
  }

  seedStandardRawMaterials(companyId?: string): Observable<RawMaterialItemDto[]> {
    const key = this.getRawMaterialsStorageKey(companyId);
    const list = this.getDefaultStandardRawMaterials(companyId);
    localStorage.setItem(key, JSON.stringify(list));
    return of(list);
  }

  private getRawMaterialsSync(companyId?: string): RawMaterialItemDto[] {
    const key = this.getRawMaterialsStorageKey(companyId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  // =========================================================================
  // Demo Seed Fallbacks (Concrete, Aluminum, Rebar)
  // =========================================================================
  private getDefaultBoms(cId: string): BillOfMaterialsDto[] {
    return [
      {
        id: 'bom-001',
        companyId: cId,
        code: 'BOM-CONC-C35',
        nameAr: 'شجرة خلطة خرسانية جاهزة مقاومة للأملاح C35',
        nameEn: 'Ready-Mix Concrete SRC C35 Formula',
        finishedProductId: 'prd-001',
        finishedProductCode: 'CONC-C35-M3',
        finishedProductNameAr: 'خرسانة جاهزة مقاومة C35 (متر مكعب)',
        finishedProductNameEn: 'Ready-Mix Sulfate Resistant Concrete C35',
        outputQuantity: 1,
        unitOfMeasure: 'م³ (متر مكعب)',
        rawMaterialsWarehouseName: 'مستودع المواد الخام والمخاليط',
        finishedGoodsWarehouseName: 'ساحة التعبئة والتحميل المركزية',
        version: '1.2',
        isActive: true,
        components: [
          { id: 'cmp-101', itemCode: 'RAW-CEM-SRC', itemNameAr: 'إسمنت بورتلاندي مقاوم للأملاح SRC', itemNameEn: 'Sulfate Resistant Portland Cement', quantityRequired: 380, unitOfMeasure: 'كجم', scrapPercentage: 1.5, unitCost: 0.42, totalCost: 162.03 },
          { id: 'cmp-102', itemCode: 'RAW-SND-01', itemNameAr: 'رمل أحمر مغسول ناعم', itemNameEn: 'Washed Fine Red Sand', quantityRequired: 650, unitOfMeasure: 'كجم', scrapPercentage: 2.0, unitCost: 0.05, totalCost: 33.15 },
          { id: 'cmp-103', itemCode: 'RAW-AGG-10', itemNameAr: 'ركام وبحص مقاس 10 مم مغسول', itemNameEn: 'Washed 10mm Aggregate', quantityRequired: 550, unitOfMeasure: 'كجم', scrapPercentage: 1.0, unitCost: 0.045, totalCost: 24.97 },
          { id: 'cmp-104', itemCode: 'RAW-AGG-20', itemNameAr: 'ركام وبحص مقاس 20 مم مغسول', itemNameEn: 'Washed 20mm Aggregate', quantityRequired: 550, unitOfMeasure: 'كجم', scrapPercentage: 1.0, unitCost: 0.045, totalCost: 24.97 },
          { id: 'cmp-105', itemCode: 'RAW-CHM-PLST', itemNameAr: 'ملدن فائق ومقلل مياه MasterGlenium', itemNameEn: 'Superplasticizer Concrete Admixture', quantityRequired: 3.5, unitOfMeasure: 'لتر', scrapPercentage: 0.5, unitCost: 8.50, totalCost: 29.90 },
          { id: 'cmp-106', itemCode: 'RAW-WTR-IND', itemNameAr: 'مياه محلاة مبردة للخلط الإنشائي', itemNameEn: 'Chilled Batching Water', quantityRequired: 160, unitOfMeasure: 'لتر', scrapPercentage: 0.0, unitCost: 0.02, totalCost: 3.20 }
        ],
        operations: [
          { id: 'op-201', operationNameAr: 'وزن وتحميل وتغذية الصوامع آلياً بالركام والإسمنت', operationNameEn: 'Automated Hopper Batching & Silo Weighing', workstationName: 'محطة الوزن الآلي للصوامع', standardTimeMinutes: 4, hourlyLaborRate: 40, hourlyOverheadRate: 25, totalOperationCost: 4.33 },
          { id: 'op-202', operationNameAr: 'خلط ديناميكي ثنائي المحور Twin-Shaft وتبريد المياه بالثلج', operationNameEn: 'Twin-Shaft High-Shear Mixing Cycle', workstationName: 'خلاطة الخرسانة المركزية Twin-Shaft 3m³', standardTimeMinutes: 5, hourlyLaborRate: 40, hourlyOverheadRate: 60, totalOperationCost: 8.33 },
          { id: 'op-203', operationNameAr: 'تفريغ وفحص الهبوط واختبار جودة الخلطة والتحميل بالشاحنات', operationNameEn: 'Transit Mixer Chute Loading & Slump QC Check', workstationName: 'ميزان الشاحنات وبوابة التحميل', standardTimeMinutes: 3, hourlyLaborRate: 35, hourlyOverheadRate: 20, totalOperationCost: 2.75 }
        ],
        totalMaterialCost: 278.22,
        totalLaborCost: 6.92,
        totalOverheadCost: 8.49,
        totalUnitCost: 293.63,
        notes: 'مطابقة لمواصفات وزارة النقل وكود البناء السعودي SBC 304'
      }
    ];
  }

  private getDefaultWorkOrders(cId: string): WorkOrderDto[] {
    return [
      {
        id: 'wo-001',
        companyId: cId,
        workOrderNumber: 'WO-2026-0041',
        bomId: 'bom-001',
        bomCode: 'BOM-CONC-C35',
        finishedProductId: 'prd-001',
        finishedProductCode: 'CONC-C35-M3',
        finishedProductNameAr: 'خرسانة جاهزة مقاومة C35 (صب لبشة برج المحيط)',
        finishedProductNameEn: 'Ready-Mix Concrete C35 Raft Pouring',
        plannedQuantity: 450,
        completedQuantity: 450,
        rejectedQuantity: 0,
        unitOfMeasure: 'م³ (متر مكعب)',
        startDate: '2026-10-24',
        dueDate: '2026-10-25',
        completedDate: '2026-10-25',
        status: 'Completed',
        priority: 'Urgent',
        assignedSupervisor: 'م. حسام الدين الخياط',
        assignedWorkstation: 'خلاطة الخرسانة المركزية Twin-Shaft 3m³',
        rawMaterialsWarehouseName: 'مستودع المواد الخام والمخاليط',
        finishedGoodsWarehouseName: 'ساحة التعبئة والتحميل المركزية',
        estimatedTotalCost: 134712,
        actualMaterialCost: 122935,
        actualLaborCost: 6900,
        actualOverheadCost: 4880,
        totalActualCost: 134715,
        unitActualCost: 299.37,
        componentsConsumed: [
          { itemNameAr: 'إسمنت مقاوم SRC', quantity: 171000, unit: 'كجم', totalCost: 71820 },
          { itemNameAr: 'رمل أحمر مغسول', quantity: 292500, unit: 'كجم', totalCost: 14625 },
          { itemNameAr: 'بحص وركام متدرج', quantity: 495000, unit: 'كجم', totalCost: 19800 },
          { itemNameAr: 'إضافات كيميائية', quantity: 1575, unit: 'لتر', totalCost: 13387.5 },
          { itemNameAr: 'مياه معالجة', quantity: 72000, unit: 'لتر', totalCost: 1440 }
        ],
        notes: 'تم فحص الهبوط Slump Test 180mm ودرجة الحرارة 28°C وتجهيز المكعبات'
      }
    ];
  }

  private getDefaultWorkstations(cId: string): WorkstationDto[] {
    return [
      {
        id: 'ws-001',
        companyId: cId,
        code: 'WS-MIX-01',
        nameAr: 'خلاطة الخرسانة المركزية Twin-Shaft 3m³',
        nameEn: 'Central Concrete Batching Mixer Twin-Shaft',
        type: 'Machine',
        hourlyCost: 95.0,
        capacityPerDayHours: 16,
        efficiencyPercentage: 94,
        status: 'Active',
        location: 'مجمع الخلاطات - المنطقة الصناعية'
      },
      {
        id: 'ws-002',
        companyId: cId,
        code: 'WS-ALUM-CNC',
        nameAr: 'ماكينة قص الألمنيوم ثنائية الرأس CNC',
        nameEn: 'CNC Double Head Aluminum Profile Cutting Machine',
        type: 'Machine',
        hourlyCost: 55.0,
        capacityPerDayHours: 12,
        efficiencyPercentage: 96,
        status: 'Active',
        location: 'ورشة الألمنيوم والواجهات - الخط A'
      }
    ];
  }

  private getDefaultStandardRawMaterials(companyId?: string): RawMaterialItemDto[] {
    const cId = this.getEffectiveCompanyId(companyId);
    return [
      {
        id: 'raw-001',
        companyId: cId,
        itemCode: 'RAW-CEM-SRC',
        nameAr: 'إسمنت بورتلاندي مقاوم للأملاح SRC',
        nameEn: 'Sulfate Resistant Portland Cement (SRC)',
        category: 'Concrete',
        categoryAr: 'خرسانة ومخاليط',
        categoryEn: 'Concrete & Mixes',
        unitOfMeasure: 'كجم',
        unitCost: 0.42,
        currentStock: 45000,
        warehouseName: 'مستودع المواد الخام والمخاليط',
        minStockLevel: 10000,
        notes: 'مقاوم للكبريتات والأملاح تحت الأرض والأساسات'
      },
      {
        id: 'raw-002',
        companyId: cId,
        itemCode: 'RAW-CEM-OPC',
        nameAr: 'إسمنت بورتلاندي عادي نوع 1 (OPC)',
        nameEn: 'Ordinary Portland Cement Type 1 (OPC)',
        category: 'Concrete',
        categoryAr: 'خرسانة ومخاليط',
        categoryEn: 'Concrete & Mixes',
        unitOfMeasure: 'كجم',
        unitCost: 0.38,
        currentStock: 65000,
        warehouseName: 'مستودع المواد الخام والمخاليط',
        minStockLevel: 15000,
        notes: 'للأعمدة والأسقف والخرسانة الإنشائية العادية'
      },
      {
        id: 'raw-003',
        companyId: cId,
        itemCode: 'RAW-SND-01',
        nameAr: 'رمل أحمر مغسول ناعم ممتاز',
        nameEn: 'Washed Fine Red Sand Grade A',
        category: 'Concrete',
        categoryAr: 'خرسانة ومخاليط',
        categoryEn: 'Concrete & Mixes',
        unitOfMeasure: 'كجم',
        unitCost: 0.05,
        currentStock: 120000,
        warehouseName: 'مستودع المواد الخام والمخاليط',
        minStockLevel: 20000,
        notes: 'خالٍ من الطمي والأملاح والشوائب'
      }
    ];
  }
}
