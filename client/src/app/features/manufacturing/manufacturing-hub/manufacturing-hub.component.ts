import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  ManufacturingService,
  BillOfMaterialsDto,
  BomComponentDto,
  BomOperationDto,
  WorkOrderDto,
  WorkOrderStatus,
  WorkstationDto,
  ManufacturingMetricsDto,
  RawMaterialItemDto
} from '../../../core/services/manufacturing.service';
import { AccountingTranslatorService } from '../../../core/services/accounting-translator.service';
import { LanguageService } from '../../../core/services/language.service';
import { ItemCategoryService, ItemCategoryDto } from '../../../core/services/item-category.service';

@Component({
  selector: 'app-manufacturing-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './manufacturing-hub.component.html',
  styleUrls: ['./manufacturing-hub.component.scss']
})
export class ManufacturingHubComponent implements OnInit {
  public langService = inject(LanguageService);
  public translator = inject(AccountingTranslatorService);
  private manufacturingService = inject(ManufacturingService);
  public itemCategoryService = inject(ItemCategoryService);
  // Expose Math for template calculations
  readonly Math = Math;

  // Active Main Tab: 'work-orders' | 'bom' | 'raw-materials' | 'workstations' | 'analytics'
  activeTab: 'work-orders' | 'bom' | 'raw-materials' | 'workstations' | 'analytics' = 'work-orders';

  // State
  isLoading = false;
  metrics: ManufacturingMetricsDto | null = null;
  boms: BillOfMaterialsDto[] = [];
  workOrders: WorkOrderDto[] = [];
  workstations: WorkstationDto[] = [];
  rawMaterials: RawMaterialItemDto[] = [];
  categories: ItemCategoryDto[] = [];

  // Search & Filters
  woSearchTerm = '';
  woStatusFilter: string = 'all';
  bomSearchTerm = '';
  selectedBomForView: BillOfMaterialsDto | null = null;
  rawMaterialCategoryFilter = 'all';
  rawMaterialSearchTerm = '';

  // Selected raw material for BOM component line
  selectedRawMaterialId = '';

  // Raw Material Modal State
  showRawMaterialModal = false;
  isEditingRawMaterial = false;
  rawMaterialForm: Partial<RawMaterialItemDto> = {
    itemCode: '',
    nameAr: '',
    nameEn: '',
    category: 'Concrete',
    categoryAr: 'خرسانة ومخاليط',
    categoryEn: 'Concrete & Mixes',
    unitOfMeasure: 'كجم',
    unitCost: 1.0,
    currentStock: 1000,
    warehouseName: 'مستودع المواد الخام والمخاليط',
    minStockLevel: 200,
    notes: ''
  };

  // Work Order Modal State
  showWorkOrderModal = false;
  workOrderForm = {
    bomId: '',
    workOrderNumber: '',
    plannedQuantity: 100,
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    priority: 'Normal' as 'Normal' | 'High' | 'Urgent',
    assignedSupervisor: 'م. حسام الدين الخياط',
    assignedWorkstation: 'خلاطة الخرسانة المركزية Twin-Shaft 3m³',
    notes: ''
  };

  // BOM Modal State
  showBomModal = false;
  isEditingBom = false;
  bomForm: Partial<BillOfMaterialsDto> = {
    code: '',
    nameAr: '',
    nameEn: '',
    finishedProductCode: '',
    finishedProductNameAr: '',
    finishedProductNameEn: '',
    outputQuantity: 1,
    unitOfMeasure: 'م³ (متر مكعب)',
    rawMaterialsWarehouseName: 'مستودع المواد الخام والمخاليط',
    finishedGoodsWarehouseName: 'ساحة التعبئة والتحميل المركزية',
    version: '1.0',
    notes: '',
    components: [],
    operations: []
  };

  // Temp item line for adding to BOM
  newComponentLine: BomComponentDto = {
    id: '',
    itemCode: '',
    itemNameAr: '',
    itemNameEn: '',
    quantityRequired: 10,
    unitOfMeasure: 'كجم',
    scrapPercentage: 2,
    unitCost: 15,
    totalCost: 150
  };

  // Temp operation line for adding to BOM
  newOperationLine: BomOperationDto = {
    id: '',
    operationNameAr: '',
    operationNameEn: '',
    workstationName: 'محطة التشغيل الرئيسية',
    standardTimeMinutes: 20,
    hourlyLaborRate: 50,
    hourlyOverheadRate: 30,
    totalOperationCost: 26.67
  };

  ngOnInit(): void {
    this.loadCategories();
    this.loadData();
  }

  loadCategories(): void {
    this.itemCategoryService.getCategories().subscribe(cats => {
      this.categories = cats;
      if (cats.length > 0 && !this.rawMaterialForm.category) {
        this.rawMaterialForm.category = cats[0].code as any;
        this.rawMaterialForm.categoryAr = cats[0].nameAr;
        this.rawMaterialForm.categoryEn = cats[0].nameEn;
      }
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.manufacturingService.getBoms().subscribe(b => {
      this.boms = b;
      if (b.length > 0 && !this.selectedBomForView) {
        this.selectedBomForView = b[0];
      }
      this.manufacturingService.getWorkOrders().subscribe(w => {
        this.workOrders = w;
        this.manufacturingService.getRawMaterials().subscribe(rm => {
          this.rawMaterials = rm;
          this.isLoading = false;
          this.refreshMetrics();
        });
      });
    });
    this.manufacturingService.getWorkstations().subscribe(ws => this.workstations = ws);
  }

  refreshMetrics(): void {
    const totalCost = this.workOrders.reduce((acc, w) => acc + (Number(w.totalActualCost) || Number(w.estimatedTotalCost) || 0), 0);
    const active = this.workOrders.filter(w => w.status === 'InProgress' || w.status === 'Confirmed' || w.status === 'QualityCheck').length;
    const completed = this.workOrders.filter(w => w.status === 'Completed').length;
    const rawValue = this.rawMaterials.reduce((acc, m) => acc + ((m.currentStock || 0) * (m.unitCost || 0)), 0);

    this.metrics = {
      totalWorkOrders: this.workOrders.length,
      activeWorkOrders: active,
      completedWorkOrders: completed,
      totalBoms: this.boms.length,
      totalProductionCost: totalCost,
      efficiencyRate: 95.8,
      totalRawMaterials: this.rawMaterials.length,
      rawMaterialsInventoryValue: rawValue
    };
  }

  setTab(tab: 'work-orders' | 'bom' | 'raw-materials' | 'workstations' | 'analytics'): void {
    this.activeTab = tab;
  }

  // -------------------------------------------------------------
  // Work Orders Logic
  // -------------------------------------------------------------
  get filteredWorkOrders(): WorkOrderDto[] {
    let list = this.workOrders;
    if (this.woStatusFilter !== 'all') {
      list = list.filter(w => w.status === this.woStatusFilter);
    }
    if (this.woSearchTerm.trim()) {
      const term = this.woSearchTerm.trim().toLowerCase();
      list = list.filter(w =>
        w.workOrderNumber.toLowerCase().includes(term) ||
        w.finishedProductNameAr.toLowerCase().includes(term) ||
        w.assignedSupervisor.toLowerCase().includes(term) ||
        w.bomCode.toLowerCase().includes(term)
      );
    }
    return list;
  }

  openCreateWorkOrderModal(): void {
    const defaultBom = this.boms[0];
    this.workOrderForm = {
      bomId: defaultBom ? defaultBom.id : '',
      workOrderNumber: `WO-2026-${Math.floor(100 + Math.random() * 900)}`,
      plannedQuantity: defaultBom ? (defaultBom.unitOfMeasure.includes('م³') ? 150 : (defaultBom.unitOfMeasure.includes('م²') ? 200 : 50)) : 100,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
      priority: 'Normal',
      assignedSupervisor: 'م. حسام الدين الخياط',
      assignedWorkstation: defaultBom && defaultBom.operations[0] ? defaultBom.operations[0].workstationName : 'محطة الإنتاج الرئيسية',
      notes: ''
    };
    this.showWorkOrderModal = true;
  }

  onWorkOrderBomSelect(): void {
    const selBom = this.boms.find(b => b.id === this.workOrderForm.bomId);
    if (selBom && selBom.operations[0]) {
      this.workOrderForm.assignedWorkstation = selBom.operations[0].workstationName;
    }
  }

  saveWorkOrder(): void {
    const selectedBom = this.boms.find(b => b.id === this.workOrderForm.bomId);
    if (!selectedBom) {
      Swal.fire({
        title: this.langService.t('manufacturing.hub.alerts.selectBomTitle'),
        text: this.langService.t('manufacturing.hub.alerts.selectBomText'),
        icon: 'warning',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const estimatedTotalCost = Number((this.workOrderForm.plannedQuantity * selectedBom.totalUnitCost).toFixed(2));

    this.manufacturingService.createWorkOrder({
      ...this.workOrderForm,
      bomCode: selectedBom.code,
      finishedProductId: selectedBom.finishedProductId,
      finishedProductCode: selectedBom.finishedProductCode,
      finishedProductNameAr: selectedBom.finishedProductNameAr,
      finishedProductNameEn: selectedBom.finishedProductNameEn,
      unitOfMeasure: selectedBom.unitOfMeasure,
      rawMaterialsWarehouseName: selectedBom.rawMaterialsWarehouseName,
      finishedGoodsWarehouseName: selectedBom.finishedGoodsWarehouseName,
      estimatedTotalCost: estimatedTotalCost,
      status: 'Confirmed'
    }).subscribe(newOrder => {
      this.loadData();
      this.showWorkOrderModal = false;
      Swal.fire({
        title: this.langService.t('manufacturing.hub.alerts.orderCreatedSuccessTitle'),
        text: this.langService.t('manufacturing.hub.alerts.orderCreatedSuccessText', {
          orderNo: newOrder.workOrderNumber,
          qty: newOrder.plannedQuantity,
          uom: newOrder.unitOfMeasure
        }),
        icon: 'success',
        confirmButtonColor: '#059669'
      });
    });
  }

  updateOrderStatus(order: WorkOrderDto, newStatus: WorkOrderStatus): void {
    const isAr = this.langService.currentLang() === 'ar';
    const actionText = newStatus === 'InProgress' 
      ? (isAr ? 'بدء التشغيل وسحب المواد' : 'Start Execution & Issue Materials')
      : (newStatus === 'QualityCheck' 
        ? (isAr ? 'تحويل للمختبر وفحص الجودة' : 'Transfer to Lab & Quality Check')
        : (newStatus === 'Completed' 
          ? (isAr ? 'اعتماد الإنتاج التام وتوريد المستودع' : 'Complete Production & Receive in FG') 
          : (isAr ? 'تحديث الحالة' : 'Update Status')));

    Swal.fire({
      title: this.langService.t('manufacturing.hub.alerts.updateStatusTitle', { action: actionText }),
      text: this.langService.t('manufacturing.hub.alerts.updateStatusText', {
        orderNo: order.workOrderNumber,
        qty: order.plannedQuantity,
        uom: order.unitOfMeasure
      }),
      icon: newStatus === 'Completed' ? 'success' : 'question',
      showCancelButton: true,
      confirmButtonText: `${isAr ? 'نعم، ' : 'Yes, '}${actionText}`,
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: newStatus === 'Completed' ? '#059669' : '#0284c7',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.manufacturingService.updateWorkOrderStatus(order.id, newStatus).subscribe(() => {
          this.loadData();
          if (newStatus === 'Completed') {
            Swal.fire({
              title: this.langService.t('manufacturing.hub.alerts.orderCompletedSuccessTitle'),
              text: this.langService.t('manufacturing.hub.alerts.orderCompletedSuccessText', {
                rawWh: order.rawMaterialsWarehouseName,
                qty: order.plannedQuantity,
                uom: order.unitOfMeasure,
                fgWh: order.finishedGoodsWarehouseName
              }),
              icon: 'success',
              confirmButtonColor: '#059669'
            });
          }
        });
      }
    });
  }

  deleteWorkOrder(id: string): void {
    Swal.fire({
      title: this.langService.t('manufacturing.hub.alerts.deleteOrderTitle'),
      text: this.langService.t('manufacturing.hub.alerts.deleteOrderText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('common.confirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.manufacturingService.deleteWorkOrder(id).subscribe(() => {
          this.loadData();
          Swal.fire({
            title: this.langService.t('common.deleted'),
            text: this.langService.t('manufacturing.hub.alerts.orderDeletedSuccess'),
            icon: 'success',
            confirmButtonColor: '#059669'
          });
        });
      }
    });
  }

  // -------------------------------------------------------------
  // Bill of Materials (BOM) Logic
  // -------------------------------------------------------------
  get filteredBoms(): BillOfMaterialsDto[] {
    if (!this.bomSearchTerm.trim()) return this.boms;
    const term = this.bomSearchTerm.trim().toLowerCase();
    return this.boms.filter(b =>
      b.code.toLowerCase().includes(term) ||
      b.nameAr.toLowerCase().includes(term) ||
      b.finishedProductNameAr.toLowerCase().includes(term)
    );
  }

  selectBomView(bom: BillOfMaterialsDto): void {
    this.selectedBomForView = bom;
  }

  openCreateBomModal(): void {
    this.isEditingBom = false;
    this.bomForm = {
      code: `BOM-${Date.now().toString().slice(-4)}`,
      nameAr: '',
      nameEn: '',
      finishedProductCode: `PRD-${Date.now().toString().slice(-3)}`,
      finishedProductNameAr: '',
      finishedProductNameEn: '',
      outputQuantity: 1,
      unitOfMeasure: 'م³ (متر مكعب)',
      rawMaterialsWarehouseName: 'مستودع المواد الخام والمخاليط',
      finishedGoodsWarehouseName: 'ساحة التعبئة والتحميل المركزية',
      version: '1.0',
      notes: '',
      components: [
        {
          id: 'c-1',
          itemCode: 'RAW-MAT-01',
          itemNameAr: 'مادة خام أساسية أ',
          itemNameEn: 'Primary Raw Material A',
          quantityRequired: 100,
          unitOfMeasure: 'كجم',
          scrapPercentage: 2,
          unitCost: 1.5,
          totalCost: 153
        }
      ],
      operations: [
        {
          id: 'op-1',
          operationNameAr: 'أعمال الخلط والمعالجة الحرارية',
          operationNameEn: 'Mixing & Thermal Processing',
          workstationName: 'خط الإنتاج الرئيسي',
          standardTimeMinutes: 30,
          hourlyLaborRate: 50,
          hourlyOverheadRate: 30,
          totalOperationCost: 40
        }
      ]
    };
    this.showBomModal = true;
  }

  // Rule 1: Bilingual Auto-Translation for BOM Names
  onBomNameArInput(): void {
    if (this.bomForm.nameAr) {
      this.bomForm.nameEn = this.translator.autoTranslate(this.bomForm.nameAr);
    }
  }

  retranslateBomName(): void {
    if (this.bomForm.nameAr) {
      this.bomForm.nameEn = this.translator.autoTranslate(this.bomForm.nameAr);
    }
  }

  onProductNameArInput(): void {
    if (this.bomForm.finishedProductNameAr) {
      this.bomForm.finishedProductNameEn = this.translator.autoTranslate(this.bomForm.finishedProductNameAr);
    }
  }

  retranslateProductName(): void {
    if (this.bomForm.finishedProductNameAr) {
      this.bomForm.finishedProductNameEn = this.translator.autoTranslate(this.bomForm.finishedProductNameAr);
    }
  }

  addComponentToBom(): void {
    if (!this.newComponentLine.itemNameAr || this.newComponentLine.quantityRequired <= 0) {
      Swal.fire({
        title: this.langService.t('manufacturing.hub.alerts.itemDataIncompleteTitle'),
        text: this.langService.t('manufacturing.hub.alerts.itemDataIncompleteText'),
        icon: 'warning',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const scrapMultiplier = 1 + (Number(this.newComponentLine.scrapPercentage) || 0) / 100;
    const total = Number((this.newComponentLine.quantityRequired * this.newComponentLine.unitCost * scrapMultiplier).toFixed(2));

    this.bomForm.components = this.bomForm.components || [];
    this.bomForm.components.push({
      ...this.newComponentLine,
      id: `cmp-${Date.now()}`,
      itemNameEn: this.newComponentLine.itemNameEn || this.translator.autoTranslate(this.newComponentLine.itemNameAr),
      totalCost: total
    });

    // Reset line
    this.newComponentLine = {
      id: '',
      itemCode: `RAW-${Date.now().toString().slice(-3)}`,
      itemNameAr: '',
      itemNameEn: '',
      quantityRequired: 10,
      unitOfMeasure: 'كجم',
      scrapPercentage: 2,
      unitCost: 10,
      totalCost: 102
    };
  }

  removeComponentFromBom(index: number): void {
    if (this.bomForm.components) {
      this.bomForm.components.splice(index, 1);
    }
  }

  addOperationToBom(): void {
    if (!this.newOperationLine.operationNameAr) {
      return;
    }

    const hours = (Number(this.newOperationLine.standardTimeMinutes) || 0) / 60;
    const totalCost = Number((hours * (this.newOperationLine.hourlyLaborRate + this.newOperationLine.hourlyOverheadRate)).toFixed(2));

    this.bomForm.operations = this.bomForm.operations || [];
    this.bomForm.operations.push({
      ...this.newOperationLine,
      id: `op-${Date.now()}`,
      operationNameEn: this.newOperationLine.operationNameEn || this.translator.autoTranslate(this.newOperationLine.operationNameAr),
      totalOperationCost: totalCost
    });

    this.newOperationLine = {
      id: '',
      operationNameAr: '',
      operationNameEn: '',
      workstationName: 'محطة تجميع ثانوية',
      standardTimeMinutes: 15,
      hourlyLaborRate: 50,
      hourlyOverheadRate: 25,
      totalOperationCost: 18.75
    };
  }

  removeOperationFromBom(index: number): void {
    if (this.bomForm.operations) {
      this.bomForm.operations.splice(index, 1);
    }
  }

  get bomTotalMaterialCost(): number {
    return (this.bomForm.components || []).reduce((acc, c) => acc + (Number(c.totalCost) || 0), 0);
  }

  get bomTotalLaborCost(): number {
    return (this.bomForm.operations || []).reduce((acc, o) => {
      const h = (Number(o.standardTimeMinutes) || 0) / 60;
      return acc + (h * (Number(o.hourlyLaborRate) || 0));
    }, 0);
  }

  get bomTotalOverheadCost(): number {
    return (this.bomForm.operations || []).reduce((acc, o) => {
      const h = (Number(o.standardTimeMinutes) || 0) / 60;
      return acc + (h * (Number(o.hourlyOverheadRate) || 0));
    }, 0);
  }

  get bomTotalUnitCost(): number {
    return this.bomTotalMaterialCost + this.bomTotalLaborCost + this.bomTotalOverheadCost;
  }

  saveBom(): void {
    if (!this.bomForm.nameAr || !this.bomForm.finishedProductNameAr) {
      Swal.fire({
        title: this.langService.t('common.warning'),
        text: this.langService.t('manufacturing.hub.alerts.bomDataIncompleteText'),
        icon: 'warning',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    this.manufacturingService.saveBom(this.bomForm).subscribe(saved => {
      this.loadData();
      this.selectedBomForView = saved;
      this.showBomModal = false;
      Swal.fire({
        title: this.langService.t('manufacturing.hub.alerts.bomSavedSuccessTitle'),
        text: this.langService.t('manufacturing.hub.alerts.bomSavedSuccessText', {
          name: this.langService.currentLang() === 'ar' ? saved.nameAr : (saved.nameEn || saved.nameAr),
          cost: this.formatCurrency(saved.totalUnitCost),
          uom: saved.unitOfMeasure
        }),
        icon: 'success',
        confirmButtonColor: '#059669'
      });
    });
  }

  deleteBom(id: string): void {
    Swal.fire({
      title: this.langService.t('manufacturing.hub.alerts.deleteBomTitle'),
      text: this.langService.t('manufacturing.hub.alerts.deleteBomText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('common.confirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.manufacturingService.deleteBom(id).subscribe(() => {
          this.loadData();
          Swal.fire({
            title: this.langService.t('common.deleted'),
            text: this.langService.t('manufacturing.hub.alerts.bomDeletedSuccess'),
            icon: 'success',
            confirmButtonColor: '#059669'
          });
        });
      }
    });
  }

  // -------------------------------------------------------------
  // Raw Materials Logic (دليل المواد الخام الصناعية)
  // -------------------------------------------------------------
  get filteredRawMaterials(): RawMaterialItemDto[] {
    let list = this.rawMaterials;
    if (this.rawMaterialCategoryFilter !== 'all') {
      list = list.filter(m =>
        m.category === this.rawMaterialCategoryFilter ||
        m.categoryAr === this.rawMaterialCategoryFilter ||
        (m as any).categoryCode === this.rawMaterialCategoryFilter
      );
    }
    if (this.rawMaterialSearchTerm.trim()) {
      const term = this.rawMaterialSearchTerm.trim().toLowerCase();
      list = list.filter(m =>
        m.nameAr.toLowerCase().includes(term) ||
        m.nameEn.toLowerCase().includes(term) ||
        m.itemCode.toLowerCase().includes(term) ||
        m.warehouseName.toLowerCase().includes(term) ||
        (m.categoryAr && m.categoryAr.toLowerCase().includes(term))
      );
    }
    return list;
  }

  onRawMaterialSelectedInBom(): void {
    if (!this.selectedRawMaterialId) return;
    const item = this.rawMaterials.find(m => m.id === this.selectedRawMaterialId);
    if (item) {
      this.newComponentLine.itemCode = item.itemCode;
      this.newComponentLine.itemNameAr = item.nameAr;
      this.newComponentLine.itemNameEn = item.nameEn;
      this.newComponentLine.unitOfMeasure = item.unitOfMeasure;
      this.newComponentLine.unitCost = item.unitCost;
      this.newComponentLine.scrapPercentage = this.newComponentLine.scrapPercentage || 2;
    }
  }

  openCreateRawMaterialModal(): void {
    this.isEditingRawMaterial = false;
    this.rawMaterialForm = {
      itemCode: `RAW-${Math.floor(100 + Math.random() * 900)}`,
      nameAr: '',
      nameEn: '',
      category: 'Concrete',
      categoryAr: 'خرسانة ومخاليط',
      categoryEn: 'Concrete & Mixes',
      unitOfMeasure: 'كجم',
      unitCost: 1.0,
      currentStock: 1000,
      warehouseName: 'مستودع المواد الخام والمخاليط',
      minStockLevel: 200,
      notes: ''
    };
    this.showRawMaterialModal = true;
  }

  editRawMaterial(mat: RawMaterialItemDto): void {
    this.isEditingRawMaterial = true;
    this.rawMaterialForm = { ...mat };
    this.showRawMaterialModal = true;
  }

  onRawMaterialNameArInput(): void {
    if (this.rawMaterialForm.nameAr) {
      this.rawMaterialForm.nameEn = this.translator.autoTranslate(this.rawMaterialForm.nameAr);
    }
  }

  retranslateRawMaterialName(): void {
    if (this.rawMaterialForm.nameAr) {
      this.rawMaterialForm.nameEn = this.translator.autoTranslate(this.rawMaterialForm.nameAr);
    }
  }

  onRawMaterialCategoryChange(): void {
    const catCode = this.rawMaterialForm.category;
    const found = this.categories.find(c => c.code === catCode || c.nameAr === catCode || c.nameAr === this.rawMaterialForm.categoryAr);
    if (found) {
      this.rawMaterialForm.category = found.code as any;
      this.rawMaterialForm.categoryAr = found.nameAr;
      this.rawMaterialForm.categoryEn = found.nameEn;
      if (found.code.includes('ALUM')) {
        this.rawMaterialForm.warehouseName = 'مستودع قطاعات الألمنيوم والإكسسوارات';
      } else if (found.code.includes('STEEL')) {
        this.rawMaterialForm.warehouseName = 'ساحة تخزين حديد التسليح الخام';
      } else {
        this.rawMaterialForm.warehouseName = 'مستودع المواد الخام والمخاليط';
      }
    }
  }

  async addNewCategoryFromModal(): Promise<void> {
    const newCat = await this.itemCategoryService.promptCreateCategory();
    if (newCat) {
      this.loadCategories();
      this.rawMaterialForm.category = newCat.code as any;
      this.rawMaterialForm.categoryAr = newCat.nameAr;
      this.rawMaterialForm.categoryEn = newCat.nameEn;
    }
  }

  async manageCategoriesFromModal(): Promise<void> {
    await this.itemCategoryService.promptManageCategories();
    this.loadCategories();
  }

  saveRawMaterial(): void {
    if (!this.rawMaterialForm.nameAr || !this.rawMaterialForm.itemCode) {
      Swal.fire({
        title: this.langService.t('common.warning'),
        text: this.langService.t('manufacturing.hub.alerts.rawMaterialDataIncomplete'),
        icon: 'warning',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    this.rawMaterialForm.nameEn = this.rawMaterialForm.nameEn || this.translator.autoTranslate(this.rawMaterialForm.nameAr);

    this.manufacturingService.saveRawMaterial(this.rawMaterialForm as RawMaterialItemDto).subscribe(saved => {
      this.loadData();
      this.showRawMaterialModal = false;
      Swal.fire({
        title: this.langService.t('manufacturing.hub.alerts.rawMaterialSavedTitle'),
        text: this.langService.t('manufacturing.hub.alerts.rawMaterialSavedText', {
          name: this.langService.currentLang() === 'ar' ? saved.nameAr : (saved.nameEn || saved.nameAr),
          qty: saved.currentStock,
          uom: saved.unitOfMeasure,
          wh: saved.warehouseName
        }),
        icon: 'success',
        confirmButtonColor: '#059669'
      });
    });
  }

  deleteRawMaterial(mat: RawMaterialItemDto): void {
    Swal.fire({
      title: this.langService.t('manufacturing.hub.alerts.deleteRawMaterialTitle'),
      text: this.langService.t('manufacturing.hub.alerts.deleteRawMaterialText', {
        name: this.langService.currentLang() === 'ar' ? mat.nameAr : (mat.nameEn || mat.nameAr)
      }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.langService.t('common.confirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.manufacturingService.deleteRawMaterial(mat.id).subscribe(() => {
          this.loadData();
          Swal.fire({
            title: this.langService.t('common.deleted'),
            text: this.langService.t('manufacturing.hub.alerts.rawMaterialDeletedSuccess'),
            icon: 'success',
            confirmButtonColor: '#059669'
          });
        });
      }
    });
  }

  seedStandardMaterials(): void {
    Swal.fire({
      title: this.langService.t('manufacturing.hub.alerts.importPackageTitle'),
      text: this.langService.t('manufacturing.hub.alerts.importPackageText'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.langService.t('manufacturing.hub.alerts.importPackageConfirm'),
      cancelButtonText: this.langService.t('common.cancel'),
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then(res => {
      if (res.isConfirmed) {
        this.manufacturingService.seedStandardRawMaterials().subscribe(list => {
          this.loadData();
          Swal.fire({
            title: this.langService.t('manufacturing.hub.alerts.importPackageSuccessTitle'),
            text: this.langService.t('manufacturing.hub.alerts.importPackageSuccessText', { count: list.length }),
            icon: 'success',
            confirmButtonColor: '#059669'
          });
        });
      }
    });
  }

  useRawMaterialInNewBom(mat: RawMaterialItemDto): void {
    this.openCreateBomModal();
    this.selectedRawMaterialId = mat.id;
    this.onRawMaterialSelectedInBom();
    this.addComponentToBom();
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  formatCurrency(value?: number | null): string {
    const v = value ?? 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(v) + ' ر.س';
  }

  getStatusClass(status: WorkOrderStatus): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'InProgress': return 'status-inprogress';
      case 'QualityCheck': return 'status-quality';
      case 'Confirmed': return 'status-confirmed';
      case 'Planned': return 'status-planned';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusText(status: WorkOrderStatus): string {
    switch (status) {
      case 'Completed': return 'مكتمل وتوريد 100%';
      case 'InProgress': return 'قيد التشغيل والتصنيع';
      case 'QualityCheck': return 'فحص واختبار الجودة';
      case 'Confirmed': return 'مؤكد ومحجوز المواد';
      case 'Planned': return 'مجدول مخطط';
      case 'Cancelled': return 'ملغي';
      default: return status;
    }
  }
}
