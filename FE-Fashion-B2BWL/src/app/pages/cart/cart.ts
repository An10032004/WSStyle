import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../../services/cart.service';
import { TuiButton, TuiIcon, TuiFormatNumberPipe, TuiLabel, TuiAlertService, TuiLoader, TuiDropdown } from '@taiga-ui/core';
import { TuiBadge, TuiCheckbox } from '@taiga-ui/kit';
import { BehaviorSubject, combineLatest, debounceTime, map, of, shareReplay, startWith, switchMap, take } from 'rxjs';

interface CartBundleGroup {
  bundleId: number;
  label: string;
  items: CartItem[];
  selectedSubtotal: number;
}
import { TranslocoModule } from '@jsverse/transloco';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { ApiService, DebtSummary } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { QuantityBreakTableComponent } from '../../shared/components/quantity-break-table/quantity-break-table';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, TuiButton, TuiIcon, TuiBadge,
    TuiFormatNumberPipe, TuiLabel, TuiLoader, TranslocoModule, TuiCheckbox,
    StorefrontHeaderComponent, StorefrontFooterComponent,
    QuantityBreakTableComponent, TuiDropdown
  ],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(TuiAlertService);

  cart$ = this.cartService.cart$;

  /** Bố cục giỏ: nhóm combo + dòng lẻ (đồng bộ một snapshot). */
  readonly cartLayout$ = this.cart$.pipe(
    map((items) => ({
      items,
      bundleGroups: this.buildBundleGroups(items),
      regularItems: items.filter((i) => i.bundleId == null),
    })),
    shareReplay(1),
  );

  readonly comboSubtotalSelected$ = this.cart$.pipe(
    map((items) =>
      items
        .filter((i) => i.bundleId != null && i.selected !== false)
        .reduce((s, i) => s + i.price * i.quantity, 0),
    ),
    shareReplay(1),
  );

  readonly regularSubtotalSelected$ = this.cart$.pipe(
    map((items) =>
      items
        .filter((i) => i.bundleId == null && i.selected !== false)
        .reduce((s, i) => s + i.price * i.quantity, 0),
    ),
    shareReplay(1),
  );

  readonly hasComboInCart$ = this.cart$.pipe(
    map((items) => items.some((i) => i.bundleId != null)),
    shareReplay(1),
  );

  private buildBundleGroups(items: CartItem[]): CartBundleGroup[] {
    const m = new Map<number, CartItem[]>();
    for (const i of items) {
      if (i.bundleId == null) continue;
      const id = i.bundleId;
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(i);
    }
    return Array.from(m.entries()).map(([bundleId, lineItems]) => ({
      bundleId,
      label:
        lineItems[0]?.bundleLabel ||
        (lineItems[0]?.discountLabel?.startsWith('Combo · ')
          ? lineItems[0]!.discountLabel!.slice(8)
          : lineItems[0]?.discountLabel) ||
        `Combo #${bundleId}`,
      items: lineItems,
      selectedSubtotal: lineItems
        .filter((i) => i.selected !== false)
        .reduce((s, i) => s + i.price * i.quantity, 0),
    }));
  }

  couponCode = '';
  appliedCoupon$ = this.cartService.appliedCoupon$;

  applyCoupon() {
    if (!this.couponCode.trim()) return;
    this.cartService.applyCoupon(this.couponCode).subscribe({
      next: () => {
        this.revalidate();
        this.couponCode = '';
      },
      error: (err) => {
        const msg = err?.error?.message || 'Mã giảm giá không hợp lệ';
        this.alerts.open(msg, { appearance: 'error' }).subscribe();
      }
    });
  }

  removeCoupon() {
    this.cartService.removeCoupon();
    this.revalidate();
  }

  /** Phí ship theo tổng đơn + loại KH (API), không lọc SP — chỉ hiển thị giỏ hàng. */
  shippingQuote$ = combineLatest([this.cartService.cart$, this.auth.user$, this.appliedCoupon$]).pipe(
    debounceTime(200),
    switchMap(([items, user, coupon]) => {
      const selected = items.filter(i => i.selected !== false);
      let subtotal = selected.reduce((s, i) => s + i.price * i.quantity, 0);
      
      // Apply discount before shipping calculation if coupon exists
      if (coupon) {
        if (coupon.discountType === 'PERCENTAGE') {
          subtotal = subtotal * (1 - coupon.discountValue / 100);
        } else {
          subtotal = Math.max(0, subtotal - coupon.discountValue);
        }
      }

      const qty = selected.reduce((s, i) => s + i.quantity, 0);
      if (selected.length === 0) {
        return of({
          fee: 0,
          matched: false,
          tierFeeBeforeDiscount: 0,
          ruleName: undefined as string | undefined,
          baseOn: undefined as string | undefined,
        });
      }
      return this.api.quoteShipping({
        userId: user?.id,
        orderAmount: subtotal,
        totalQuantity: qty,
      });
    }),
    shareReplay(1),
  );

  shippingFee$ = this.shippingQuote$.pipe(map(q => q?.fee ?? 0));

  taxQuote$ = combineLatest([this.cartService.cart$, this.auth.user$, this.appliedCoupon$]).pipe(
    debounceTime(200),
    switchMap(([items, user, coupon]) => {
      const selected = items.filter(i => i.selected !== false);
      let subtotal = selected.reduce((s, i) => s + i.price * i.quantity, 0);

      // Apply discount before tax calculation if coupon exists
      if (coupon) {
        if (coupon.discountType === 'PERCENTAGE') {
          subtotal = subtotal * (1 - coupon.discountValue / 100);
        } else {
          subtotal = Math.max(0, subtotal - coupon.discountValue);
        }
      }

      if (selected.length === 0) {
        return of({ applied: false, taxAmount: 0, taxRate: 0, taxDisplayType: 'VAT' });
      }
      return this.api.quoteTax({
        userId: user?.id,
        orderAmount: subtotal
      });
    }),
    shareReplay(1),
  );

  taxFee$ = this.taxQuote$.pipe(map(q => q?.taxAmount ?? 0));

  debtSummary$ = this.auth.user$.pipe(
    switchMap(user => user?.id ? this.api.getDebtSummary(user.id) : of({ blocked: false, overdueCount: 0, items: [] } as DebtSummary)),
    startWith({ blocked: false, overdueCount: 0, items: [] } as DebtSummary),
    shareReplay(1),
  );
  isBlockedByDebt$ = this.debtSummary$.pipe(map(s => s.blocked));
  
  // Validation trigger
  private validateTrigger = new BehaviorSubject<void>(undefined);
  
  validationResults$ = this.validateTrigger.pipe(
    switchMap(() => this.cartService.validate()),
    map(results => results || []),
    startWith([]),
    shareReplay(1)
  );

  isValid$ = this.validationResults$.pipe(
    map(results => results.length === 0 || results.every(r => r.success))
  );

  isAnySelected$ = this.cart$.pipe(
    map(items => items.some(i => i.selected))
  );

  isAllSelected$ = this.cart$.pipe(
    map(items => items.length > 0 && items.every(i => i.selected))
  );

  ngOnInit() {
    this.revalidate();
  }

  updateQuantity(item: CartItem, newQty: number) {
    if (item.bundleId != null) {
      return;
    }
    this.cartService
      .updateQuantity(item.productId, item.variantId, newQty, item.bundleId)
      .subscribe(() => {
        this.revalidate();
      });
  }

  removeItem(item: CartItem) {
    this.cartService.removeItem(item.productId, item.variantId, item.bundleId);
    this.revalidate();
  }

  removeBundleGroup(ev: Event, bundleId: number): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.cartService.removeBundle(bundleId);
    this.revalidate();
  }

  clear() {
    this.cartService.clear();
    this.revalidate();
  }

  revalidate() {
    this.validateTrigger.next();
  }

  goToCheckout() {
    this.isBlockedByDebt$.pipe(take(1)).subscribe(blocked => {
      if (blocked) {
        return;
      }
      this.router.navigate(['/checkout']);
    });
  }

  readonly totalItems$ = this.cart$.pipe(
    map(items => items.filter(i => i.selected).reduce((sum, i) => sum + i.quantity, 0)),
    shareReplay(1),
  );


  readonly totalPrice$ = this.cart$.pipe(
    map(items => items.filter(i => i.selected).reduce((sum, i) => sum + i.price * i.quantity, 0)),
    shareReplay(1),
  );

  readonly discountAmount$ = combineLatest([this.totalPrice$, this.appliedCoupon$]).pipe(
    map(([subtotal, coupon]) => {
      if (!coupon) return 0;
      if (coupon.discountType === 'PERCENTAGE') {
        return subtotal * (coupon.discountValue / 100);
      } else {
        return Math.min(subtotal, coupon.discountValue);
      }
    }),
    shareReplay(1)
  );

  readonly afterDiscountSubtotal$ = combineLatest([this.totalPrice$, this.discountAmount$]).pipe(
    map(([sub, discount]) => Math.max(0, sub - discount)),
    shareReplay(1)
  );

  /** Tổng thanh toán ước tính = tạm tính - giảm giá + phí ship + thuế. */
  readonly grandTotal$ = combineLatest([this.totalPrice$, this.discountAmount$, this.shippingFee$, this.taxFee$]).pipe(
    map(([sub, discount, fee, tax]) => Math.max(0, sub - discount) + fee + tax),
  );

  toggleItem(item: CartItem, selected: boolean) {
    this.cartService.toggleItemSelection(item.productId, item.variantId, selected, item.bundleId);
    this.revalidate();
  }

  toggleAll(selected: boolean) {
    this.cartService.toggleAll(selected);
    this.revalidate();
  }

  getQB(item: CartItem): any[] {
    return this.cartService.getQuantityBreaks(item, this.auth.currentUserValue);
  }
}
