import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../../services/cart.service';
import { TuiButton, TuiIcon, TuiFormatNumberPipe, TuiLabel, TuiAlertService, TuiLoader } from '@taiga-ui/core';
import { TuiBadge, TuiCheckbox } from '@taiga-ui/kit';
import { BehaviorSubject, map, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { ApiService, OrderRequest } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, TuiButton, TuiIcon, TuiBadge,
    TuiFormatNumberPipe, TuiLabel, TuiLoader, TranslocoModule, TuiCheckbox,
    StorefrontHeaderComponent, StorefrontFooterComponent
  ],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  
  cart$ = this.cartService.cart$;
  
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
    this.cartService.updateQuantity(item.productId, item.variantId, newQty);
    this.revalidate();
  }

  removeItem(item: CartItem) {
    this.cartService.removeItem(item.productId, item.variantId);
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
    this.router.navigate(['/checkout']);
  }

  get totalItems$() {
    return this.cart$.pipe(map(items => items.filter(i => i.selected).reduce((sum, i) => sum + i.quantity, 0)));
  }

  get totalPrice$() {
    return this.cart$.pipe(map(items => items.filter(i => i.selected).reduce((sum, i) => sum + (i.price * i.quantity), 0)));
  }

  toggleItem(item: CartItem, selected: boolean) {
    this.cartService.toggleItemSelection(item.productId, item.variantId, selected);
    this.revalidate();
  }

  toggleAll(selected: boolean) {
    this.cartService.toggleAll(selected);
    this.revalidate();
  }
}
