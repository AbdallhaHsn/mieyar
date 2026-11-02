import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { PosService, PosShiftDto, PosFastItemDto, PosReceiptDto, PosPaymentMethod, CashMovementType, PosShiftStatus } from '../../../core/services/pos.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ModulesSettingsService } from '../../../core/services/modules-settings.service';

interface CartItem {
  id: string;
  itemCode: string;
  nameAr: string;
  nameEn?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
}

import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-pos-cashier',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './pos-cashier.component.html',
  styleUrls: ['./pos-cashier.component.scss']
})
export class PosCashierComponent implements OnInit {
  public langService = inject(LanguageService);
  public modulesSettings = inject(ModulesSettingsService);
  private posService = inject(PosService);
  private authService = inject(AuthService);

  // Active Shift State
  currentShift: PosShiftDto | null = null;
  shiftLoading = false;

  // Catalog & Search
  items: PosFastItemDto[] = [];
  filteredItems: PosFastItemDto[] = [];
  categories: string[] = ['ALL'];
  selectedCategory = 'ALL';
  searchTerm = '';
  barcodeInput = '';

  // Cart
  cart: CartItem[] = [];
  customerName = '';
  customerVatNumber = '';

  // Payment & Checkout
  selectedPaymentMethod: PosPaymentMethod = PosPaymentMethod.Cash;
  cashReceived: number = 0;
  cashPart: number = 0;
  madaPart: number = 0;

  // Modals
  showPaymentModal = false;
  showReceiptModal = false;
  showOpenShiftModal = false;
  showCloseShiftModal = false;
  showCashMovementModal = false;

  // Active Receipt for Printing
  activeReceipt: PosReceiptDto | null = null;

  // Open Shift Form
  openingFloat: number = 200;
  terminalCode: string = 'POS-01';

  // Close Shift Form
  actualCashCounted: number = 0;
  closingNotes: string = '';

  // Cash Movement Form
  movementType: CashMovementType = CashMovementType.CashIn;
  movementAmount: number = 50;
  movementReason: string = '';

  // Feedback Messages
  successMessage: string | null = null;
  errorMessage: string | null = null;
  processingSale = false;

  ngOnInit(): void {
    this.checkCurrentShift();
    this.loadFastItems();
  }

  // Keyboard shortcut listener for barcode scanner
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    // F2: Quick Cash checkout
    if (event.key === 'F2' && this.cart.length > 0 && !this.showPaymentModal && !this.showReceiptModal) {
      event.preventDefault();
      this.openPaymentModal(PosPaymentMethod.Cash);
    }
    // F3: Quick Mada checkout
    if (event.key === 'F3' && this.cart.length > 0 && !this.showPaymentModal && !this.showReceiptModal) {
      event.preventDefault();
      this.openPaymentModal(PosPaymentMethod.Mada);
    }
  }

  checkCurrentShift(): void {
    this.shiftLoading = true;
    const user = this.authService.currentUser();
    const userId = user?.userName || 'USER-01';

    this.posService.getCurrentShift(this.terminalCode, userId).subscribe({
      next: (shift) => {
        this.currentShift = shift;
        this.shiftLoading = false;
        if (!shift) {
          this.showOpenShiftModal = true;
        }
      },
      error: () => {
        this.shiftLoading = false;
      }
    });
  }

  loadFastItems(): void {
    this.posService.getFastItems().subscribe({
      next: (items) => {
        this.items = items;
        const cats = new Set<string>();
        items.forEach(i => cats.add(i.categoryName || 'General'));
        this.categories = ['ALL', ...Array.from(cats)];
        this.applyItemFilter();
      }
    });
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.applyItemFilter();
  }

  applyItemFilter(): void {
    let list = [...this.items];
    if (this.selectedCategory !== 'ALL') {
      list = list.filter(i => (i.categoryName || 'General') === this.selectedCategory);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      list = list.filter(i =>
        i.nameAr.toLowerCase().includes(term) ||
        i.nameEn.toLowerCase().includes(term) ||
        i.itemCode.toLowerCase().includes(term) ||
        (i.barcode && i.barcode.toLowerCase().includes(term))
      );
    }
    this.filteredItems = list;
  }

  onBarcodeSubmit(): void {
    if (!this.barcodeInput.trim()) return;
    const code = this.barcodeInput.trim();
    const match = this.items.find(i => i.barcode === code || i.itemCode === code);
    if (match) {
      this.addToCart(match);
      this.barcodeInput = '';
    } else {
      this.errorMessage = this.langService.t('pos.alerts.barcodeNotFound', { code });
      setTimeout(() => this.errorMessage = null, 3000);
    }
  }

  // --- CART OPERATIONS ---
  addToCart(item: PosFastItemDto): void {
    const existing = this.cart.find(c => c.id === item.id);
    if (existing) {
      existing.quantity += 1;
      this.recalculateCartLine(existing);
    } else {
      const rate = (this.modulesSettings.invoicingSettings().defaultVatRate ?? 15) / 100;
      const line: CartItem = {
        id: item.id,
        itemCode: item.itemCode,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        unitPrice: item.salePrice,
        quantity: 1,
        discount: 0,
        taxableAmount: item.salePrice,
        vatAmount: Math.round(item.salePrice * rate * 100) / 100,
        totalAmount: Math.round((item.salePrice * (1 + rate)) * 100) / 100
      };
      this.cart.push(line);
    }
  }

  incrementQty(line: CartItem): void {
    line.quantity += 1;
    this.recalculateCartLine(line);
  }

  decrementQty(line: CartItem): void {
    if (line.quantity > 1) {
      line.quantity -= 1;
      this.recalculateCartLine(line);
    } else {
      this.removeLine(line);
    }
  }

  removeLine(line: CartItem): void {
    this.cart = this.cart.filter(c => c !== line);
  }

  clearCart(): void {
    this.cart = [];
  }

  recalculateCartLine(line: CartItem): void {
    const subtotal = line.quantity * line.unitPrice;
    line.taxableAmount = Math.max(0, subtotal - (line.discount || 0));
    const rate = (this.modulesSettings.invoicingSettings().defaultVatRate ?? 15) / 100;
    line.vatAmount = Math.round(line.taxableAmount * rate * 100) / 100;
    line.totalAmount = Math.round((line.taxableAmount + line.vatAmount) * 100) / 100;
  }

  // Cart Financials
  get cartSubtotal(): number {
    return this.cart.reduce((acc, c) => acc + (c.quantity * c.unitPrice), 0);
  }

  get cartDiscount(): number {
    return this.cart.reduce((acc, c) => acc + (c.discount || 0), 0);
  }

  get cartTaxable(): number {
    return Math.max(0, this.cartSubtotal - this.cartDiscount);
  }

  get cartVat(): number {
    const rate = (this.modulesSettings.invoicingSettings().defaultVatRate ?? 15) / 100;
    return Math.round(this.cartTaxable * rate * 100) / 100;
  }

  get cartGrandTotal(): number {
    return Math.round((this.cartTaxable + this.cartVat) * 100) / 100;
  }

  get changeDue(): number {
    if (this.selectedPaymentMethod === PosPaymentMethod.Cash) {
      return Math.max(0, this.cashReceived - this.cartGrandTotal);
    }
    return 0;
  }

  // --- CHECKOUT & PAYMENT ---
  openPaymentModal(method: PosPaymentMethod = PosPaymentMethod.Cash): void {
    if (this.cart.length === 0) return;
    this.selectedPaymentMethod = method;
    this.cashReceived = this.cartGrandTotal;
    this.cashPart = 0;
    this.madaPart = this.cartGrandTotal;
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  setExactCash(): void {
    this.cashReceived = this.cartGrandTotal;
  }

  addCashPreset(amount: number): void {
    this.cashReceived = (this.cashReceived || 0) + amount;
  }

  processCheckout(): void {
    if (this.cart.length === 0) return;

    if (this.selectedPaymentMethod === PosPaymentMethod.Cash && this.cashReceived < this.cartGrandTotal) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('pos.alerts.cashReceivedInsufficient'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    this.processingSale = true;
    const user = this.authService.currentUser();
    const cashierName = (this.langService.isArabic() ? user?.fullNameAr : (user?.fullNameEn || user?.fullNameAr)) || this.langService.t('pos.defaultCashierName');

    const payload = {
      posShiftId: this.currentShift?.id,
      terminalCode: this.terminalCode,
      cashierName: cashierName,
      paymentMethod: this.selectedPaymentMethod,
      lines: this.cart.map(c => ({
        itemId: c.id,
        itemCode: c.itemCode,
        itemNameAr: c.nameAr,
        itemNameEn: c.nameEn,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        discount: c.discount
      })),
      cashReceived: this.selectedPaymentMethod === PosPaymentMethod.Cash ? this.cashReceived : this.cartGrandTotal,
      changeGiven: this.changeDue,
      cashPart: this.selectedPaymentMethod === PosPaymentMethod.Split ? this.cashPart : 0,
      madaPart: this.selectedPaymentMethod === PosPaymentMethod.Split ? this.madaPart : 0,
      customerName: this.customerName,
      customerVatNumber: this.customerVatNumber
    };

    this.posService.checkout(payload).subscribe({
      next: (receipt) => {
        this.activeReceipt = receipt;
        this.processingSale = false;
        this.closePaymentModal();
        this.clearCart();
        this.showReceiptModal = true;
        this.checkCurrentShift(); // Refresh shift running totals
        if (this.modulesSettings.posSettings().autoPrintReceipt) {
          setTimeout(() => this.printReceipt(), 400);
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || this.langService.t('pos.alerts.saleFailedDefault');
        this.processingSale = false;
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.activeReceipt = null;
  }

  // --- SHIFTS MANAGEMENT ---
  openShift(): void {
    const user = this.authService.currentUser();
    this.posService.openShift({
      cashierUserId: user?.userName || 'USER-01',
      cashierName: (this.langService.isArabic() ? user?.fullNameAr : (user?.fullNameEn || user?.fullNameAr)) || this.langService.t('pos.defaultCashierName'),
      terminalCode: this.terminalCode,
      openingFloatCash: this.openingFloat
    }).subscribe({
      next: (shift) => {
        this.currentShift = shift;
        this.showOpenShiftModal = false;
        this.successMessage = this.langService.t('pos.alerts.shiftOpenedSuccess', { shiftNumber: shift.shiftNumber, amount: shift.openingFloatCash });
        setTimeout(() => this.successMessage = null, 4000);
      }
    });
  }

  openCloseShiftDialog(): void {
    if (!this.currentShift) return;
    this.actualCashCounted = this.currentShift.expectedCashDrawer;
    this.closingNotes = '';
    this.showCloseShiftModal = true;
  }

  closeShift(): void {
    if (!this.currentShift) return;
    this.posService.closeShift({
      posShiftId: this.currentShift.id,
      actualClosingCash: this.actualCashCounted,
      notes: this.closingNotes
    }).subscribe({
      next: (closed) => {
        this.currentShift = null;
        this.showCloseShiftModal = false;
        const isMatch = closed.varianceAmount === 0;
        const varText = isMatch
          ? this.langService.t('pos.alerts.perfectMatch')
          : (closed.varianceAmount > 0
              ? this.langService.t('pos.alerts.surplus', { amount: closed.varianceAmount })
              : this.langService.t('pos.alerts.deficit', { amount: closed.varianceAmount }));

        Swal.fire({
          icon: isMatch ? 'success' : (closed.varianceAmount > 0 ? 'info' : 'warning'),
          title: this.langService.t('pos.alerts.shiftClosedSuccessTitle'),
          html: `<p style="font-size: 1.05rem; margin-top: 0.5rem; color: #334155;">${this.langService.t('pos.alerts.varianceLabel')}<strong style="color: ${isMatch ? '#059669' : '#dc2626'}">${varText}</strong></p>`,
          confirmButtonText: this.langService.t('common.ok'),
          confirmButtonColor: isMatch ? '#059669' : '#0284c7'
        });
        this.checkCurrentShift();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.message || this.langService.t('pos.alerts.shiftCloseFailedDefault'),
          confirmButtonText: this.langService.t('common.ok'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  openCashMovementDialog(): void {
    this.movementAmount = 50;
    this.movementReason = '';
    this.movementType = CashMovementType.CashIn;
    this.showCashMovementModal = true;
  }

  submitCashMovement(): void {
    if (!this.currentShift) return;
    if (!this.movementReason.trim()) {
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('common.warning'),
        text: this.langService.t('pos.alerts.movementReasonRequired'),
        confirmButtonText: this.langService.t('common.ok'),
        confirmButtonColor: '#0284c7'
      });
      return;
    }
    this.posService.addCashMovement({
      posShiftId: this.currentShift.id,
      movementType: Number(this.movementType),
      amount: this.movementAmount,
      reasonAr: this.movementReason
    }).subscribe({
      next: () => {
        this.showCashMovementModal = false;
        this.successMessage = this.langService.t('pos.alerts.movementRecordedSuccess');
        setTimeout(() => this.successMessage = null, 4000);
        this.checkCurrentShift();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.langService.t('common.error'),
          text: err.error?.message || this.langService.t('pos.alerts.movementRecordFailedDefault'),
          confirmButtonText: this.langService.t('common.ok'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }
}
