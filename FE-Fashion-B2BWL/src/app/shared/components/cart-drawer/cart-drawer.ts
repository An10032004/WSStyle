import { Component, ChangeDetectionStrategy, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CartService, CartItem } from '../../../services/cart.service';
import { TuiButton, TuiIcon, TuiAlertService } from '@taiga-ui/core';
import { combineLatest, filter, map, shareReplay, take } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface CartBundleGroup {
  bundleId: number;
  label: string;
  items: CartItem[];
  subtotal: number;
  subtotalVisible: number;
  hasHiddenLine: boolean;
}

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule, TuiButton, TuiIcon],
  templateUrl: './cart-drawer.html',
  styleUrls: ['./cart-drawer.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent implements OnInit {
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly alerts = inject(TuiAlertService);
  private readonly destroyRef = inject(DestroyRef);

  open$ = this.cart.cartDrawerOpen$;

  readonly selectionHasHiddenPrice$ = this.cart.selectionHasHiddenPrice$;

  readonly selectionHasUnavailableLine$ = this.cart.selectionHasUnavailableLine$;

  readonly layout$ = this.cart.cart$.pipe(
    map((items) => ({
      bundleGroups: this.buildBundleGroups(items),
      regularItems: items.filter((i) => i.bundleId == null),
      items,
      isEmpty: items.length === 0,
    })),
    shareReplay(1),
  );

  /** Tạm tính chỉ các dòng không ẩn giá (drawer không lọc checkbox). */
  readonly subtotalVisible$ = this.cart.cart$.pipe(
    map((items) =>
      items.filter((i) => !i.hidePrice).reduce((s, i) => s + i.price * i.quantity, 0),
    ),
    shareReplay(1),
  );

  readonly cartHasHiddenLine$ = this.cart.cart$.pipe(
    map((items) => items.some((i) => !!i.hidePrice)),
    shareReplay(1),
  );

  ngOnInit(): void {
    this.cart.cartDrawerOpen$
      .pipe(
        filter((o) => o),
        debounceTime(50),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.cart.syncHidePriceFlagsFromServer().subscribe({ error: () => {} });
        this.cart.syncLineAvailabilityFromServer().subscribe({ error: () => {} });
      });
  }

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
      subtotal: lineItems.reduce((s, i) => s + i.price * i.quantity, 0),
      subtotalVisible: lineItems
        .filter((i) => !i.hidePrice)
        .reduce((s, i) => s + i.price * i.quantity, 0),
      hasHiddenLine: lineItems.some((i) => !!i.hidePrice),
    }));
  }

  close(): void {
    this.cart.closeCartDrawer();
  }

  inc(item: CartItem): void {
    if (item.bundleId != null) return;
    if (item.variantInactive || item.bundleInactive) return;
    this.cart.updateQuantity(item.productId, item.variantId, item.quantity + 1, item.bundleId ?? null).subscribe();
  }

  dec(item: CartItem): void {
    if (item.bundleId != null) return;
    this.cart.updateQuantity(item.productId, item.variantId, item.quantity - 1, item.bundleId ?? null).subscribe();
  }

  removeLine(item: CartItem): void {
    this.cart.removeItem(item.productId, item.variantId, item.bundleId ?? null);
  }

  removeBundleGroup(bundleId: number): void {
    this.cart.removeBundle(bundleId);
  }

  checkoutFromDrawer(): void {
    combineLatest([this.selectionHasHiddenPrice$, this.selectionHasUnavailableLine$])
      .pipe(take(1))
      .subscribe(([hiddenPrice, unavailable]) => {
        if (hiddenPrice) {
          this.alerts
            .open(
              'Có sản phẩm liên hệ để có giá trong giỏ — không thể thanh toán trực tuyến. Vào giỏ đầy đủ để bỏ chọn hoặc xóa các dòng đó.',
              { label: 'Không thể thanh toán', appearance: 'warning' },
            )
            .subscribe();
          return;
        }
        if (unavailable) {
          this.alerts
            .open(
              'Có sản phẩm hoặc combo đã ngừng bán trong giỏ — không thể thanh toán. Vào giỏ đầy đủ để xóa hoặc bỏ chọn các dòng đó.',
              { label: 'Ngừng bán', appearance: 'warning' },
            )
            .subscribe();
          return;
        }
        this.close();
        this.router.navigate(['/checkout']);
      });
  }
}
