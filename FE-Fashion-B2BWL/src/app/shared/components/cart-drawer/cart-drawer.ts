import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService, CartItem } from '../../../services/cart.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { map, shareReplay } from 'rxjs';

interface CartBundleGroup {
  bundleId: number;
  label: string;
  items: CartItem[];
  subtotal: number;
}

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule, TuiButton, TuiIcon],
  templateUrl: './cart-drawer.html',
  styleUrls: ['./cart-drawer.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  private readonly cart = inject(CartService);

  open$ = this.cart.cartDrawerOpen$;

  readonly layout$ = this.cart.cart$.pipe(
    map((items) => ({
      bundleGroups: this.buildBundleGroups(items),
      regularItems: items.filter((i) => i.bundleId == null),
      items,
      isEmpty: items.length === 0,
    })),
    shareReplay(1),
  );

  readonly subtotal$ = this.cart.cart$.pipe(
    map((items) => items.reduce((s, i) => s + i.price * i.quantity, 0)),
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
      subtotal: lineItems.reduce((s, i) => s + i.price * i.quantity, 0),
    }));
  }

  close(): void {
    this.cart.closeCartDrawer();
  }

  inc(item: CartItem): void {
    if (item.bundleId != null) return;
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
}
