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
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(TuiAlertService);

  private cartSubject = new BehaviorSubject<CartItem[]>(this.loadCart());
  cart$ = this.cartSubject.asObservable();

  constructor() {}

  private loadCart(): CartItem[] {
    const saved = localStorage.getItem('app_cart');
    return saved ? JSON.parse(saved) : [];
  }

  private saveCart(items: CartItem[]) {
    localStorage.setItem('app_cart', JSON.stringify(items));
    this.cartSubject.next(items);
  }

  addToCart(product: Product, variant: ProductVariant | undefined, quantity: number) {
    const items = [...this.cartSubject.value];
    const price = variant?.price || product.calculatedPrice || product.basePrice;
    
    const existingIndex = items.findIndex(i => 
      i.productId === product.id && 
      i.variantId === variant?.id
    );

    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
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
        categoryId: product.categoryId || undefined
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

  clear() {
    this.saveCart([]);
  }

  get totalItems(): number {
    return this.cartSubject.value.reduce((sum, i) => sum + i.quantity, 0);
  }

  get totalPrice(): number {
    return this.cartSubject.value.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  }
}
