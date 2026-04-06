import { Injectable, inject } from '@angular/core';
import { ApiService, Product, ProductVariant } from './api.service';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { TuiAlertService } from '@taiga-ui/core';

export interface CartItem {
  productId: number;
  variantId?: number;
  name: string;
  color?: string;
  size?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  categoryId?: number;
  selected?: boolean;
  isNetTermEligible?: boolean;
  netTermDays?: number;
  basePrice?: number;
  quantityBreaksJson?: string;
  isFixedPrice?: boolean; // New flag to skip recalculations
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(TuiAlertService);

  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartSubject.asObservable();
  private currentUserId: number | null = null;

  get currentItems(): CartItem[] {
    return [...this.cartSubject.value];
  }

  constructor() {
    this.auth.user$.subscribe(user => {
      const oldUserId = this.currentUserId;
      this.currentUserId = user?.id || null;
      
      if (oldUserId === null && this.currentUserId !== null) {
        // Guest becomes User -> Merge
        this.syncOnLogin(this.currentUserId);
      } else {
        // User becomes Guest or User Switch
        this.cartSubject.next(this.loadCart(this.currentUserId));
      }
    });
  }

  private getCartKey(userId: number | null): string {
    return userId ? `app_cart_${userId}` : 'app_cart_guest';
  }

  private loadCart(userId: number | null): CartItem[] {
    const saved = localStorage.getItem(this.getCartKey(userId));
    if (saved) {
        const items: CartItem[] = JSON.parse(saved);
        // Ensure legacy items and undefined states are selected by default
        return items.map(i => ({
            ...i,
            selected: i.selected !== false
        }));
    }
    return [];
  }

  private saveCart(items: CartItem[]) {
    localStorage.setItem(this.getCartKey(this.currentUserId), JSON.stringify(items));
    this.cartSubject.next(items);
  }

  private syncOnLogin(userId: number) {
    const guestItems = this.loadCart(null);
    const userItems = this.loadCart(userId);
    
    // Merge guestItems into userItems
    const merged = [...userItems];
    guestItems.forEach(gi => {
      const existing = merged.find(mi => mi.productId === gi.productId && mi.variantId === gi.variantId);
      if (existing) {
        existing.quantity += gi.quantity;
      } else {
        merged.push(gi);
      }
    });

    this.saveCart(merged); // Save to user key
    localStorage.removeItem(this.getCartKey(null)); // Clear guest cart after merge
  }

  addToCart(product: Product, variant: ProductVariant | undefined, quantity: number, priceOverride?: number) {
    const items = [...this.cartSubject.value];
    let price = priceOverride || product.calculatedPrice || product.basePrice;
    
    // 1. Prioritize Variant-specific price (Absolute Override)
    const hasVariantPrice = !!(variant && (
      (variant.price != null && variant.price > 0) || 
      (variant.discountPrice != null && variant.discountPrice > 0)
    ));

    if (variant) {
      price = variant.discountPrice || variant.price || (price + (variant.priceAdjustment || 0));
    }

    // 2. Evaluate Quantity Breaks ONLY if NO specific variant price is set
    if (!hasVariantPrice && product.quantityBreaksJson) {
      try {
        const breaks = JSON.parse(product.quantityBreaksJson);
        const matchedBreak = breaks.find((b: any) => {
          const min = b.min ?? 1;
          const max = b.max ?? 999999999;
          return quantity >= min && quantity <= max;
        });
        if (matchedBreak && matchedBreak.discount != null) {
          const base = variant?.price || product.basePrice;
          price = base * (1 - matchedBreak.discount / 100);
        }
      } catch (e) {}
    }

    const existingIndex = items.findIndex(i => 
      i.productId === product.id && 
      i.variantId === variant?.id
    );

    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
      this.recalculateItemPrice(items[existingIndex]);
    } else {
      items.push({
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        color: variant?.color,
        size: variant?.size,
        price: price,
        quantity: quantity,
        imageUrl: variant?.imageUrl || product.imageUrl,
        categoryId: product.categoryId || undefined,
        selected: true,
        isNetTermEligible: product.isNetTermEligible,
        netTermDays: product.netTermDays,
        basePrice: hasVariantPrice ? (variant?.discountPrice || variant?.price) : product.basePrice,
        quantityBreaksJson: product.quantityBreaksJson,
        isFixedPrice: hasVariantPrice
      });
    }

    this.saveCart(items);
    this.validate().subscribe(results => {
       const failures = results.filter(r => !r.success);
       if (failures.length > 0) {
         failures.forEach(f => {
           this.alerts.open(f.message, { label: 'Cảnh báo Quy định Đơn hàng', appearance: 'warning' }).subscribe();
         });
       } else {
         this.alerts.open('Đã thêm sản phẩm vào giỏ hàng', { label: 'Thành công', appearance: 'success' }).subscribe();
       }
    });
  }

  validate(): Observable<any[]> {
    const items = this.cartSubject.value.map(i => ({
      productId: i.productId,
      categoryId: i.categoryId,
      quantity: i.quantity,
      price: i.price
    }));
    
    if (items.length === 0) return of([]);

    return this.auth.user$.pipe(
      switchMap(user => this.api.validateCart(user?.id, items))
    );
  }

  updateQuantity(productId: number, variantId: number | undefined, quantity: number) {
    if (quantity < 1) {
      this.removeItem(productId, variantId);
      return;
    }
    const items = this.currentItems;
    const idx = items.findIndex(i => i.productId === productId && i.variantId === variantId);
    if (idx > -1) {
      items[idx].quantity = quantity;
      this.recalculateItemPrice(items[idx]); // Update unit price for bulk
      this.saveCart(items);
    }
  }

  private recalculateItemPrice(item: CartItem) {
    if (item.isFixedPrice) return; // Skip recalculation for fixed variant prices
    
    if (item.quantityBreaksJson && item.basePrice) {
      try {
        const breaks = JSON.parse(item.quantityBreaksJson);
        const qty = item.quantity;
        const matchedBreak = breaks.find((b: any) => {
          const min = b.min ?? 1;
          const max = b.max ?? 999999999;
          return qty >= min && qty <= max;
        });
        if (matchedBreak && matchedBreak.discount != null) {
          item.price = item.basePrice * (1 - matchedBreak.discount / 100);
        } else {
          item.price = item.basePrice;
        }
      } catch (e) {
        item.price = item.basePrice;
      }
    }
  }

  removeItem(productId: number, variantId: number | undefined) {
    const items = this.currentItems.filter(i => 
      !(i.productId === productId && i.variantId === variantId)
    );
    this.saveCart(items);
  }

  clear() {
    this.saveCart([]);
  }

  clearSelected() {
    const remaining = this.currentItems.filter(i => !i.selected);
    this.saveCart(remaining);
  }

  toggleItemSelection(productId: number, variantId: number | undefined, selected: boolean) {
    const items = this.currentItems;
    const idx = items.findIndex(i => i.productId === productId && i.variantId === variantId);
    if (idx > -1) {
      items[idx].selected = !!selected;
      this.saveCart(items);
    }
  }

  toggleAll(selected: boolean) {
    const items = this.currentItems.map(i => ({ ...i, selected }));
    this.saveCart(items);
  }

  get totalItems(): number {
    return this.cartSubject.value.reduce((sum, i) => sum + i.quantity, 0);
  }

  get totalPrice$() {
    return this.cart$.pipe(map(items => items.filter(i => i.selected).reduce((sum, i) => sum + (i.price * i.quantity), 0)));
  }

  get cartItems(): CartItem[] {
    return this.cartSubject.value;
  }
}
