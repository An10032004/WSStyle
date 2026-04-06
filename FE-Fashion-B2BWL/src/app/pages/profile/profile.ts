import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService, Order } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Observable, switchMap, of, tap, BehaviorSubject, combineLatest, map } from 'rxjs';
import { TuiButton, TuiIcon, TuiAlertService } from '@taiga-ui/core';
import { TuiBadge, TuiPagination } from '@taiga-ui/kit';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon, TuiBadge, RouterModule, StorefrontHeaderComponent, StorefrontFooterComponent, TuiPagination],
  template: `
    <app-storefront-header></app-storefront-header>
    <div class="profile-container">
      <h1>My Account</h1>
      
      <div class="profile-grid">
        <!-- Account Info Card -->
        <div class="profile-card" *ngIf="user$ | async as user">
          <div class="profile-header">
            <div class="avatar">{{ user.fullName?.charAt(0) }}</div>
            <h2>{{ user.fullName }}</h2>
            <div class="role-badges">
              <span class="role-badge">{{ user.role }}</span>
              <span class="role-badge group" *ngIf="user.customerGroup">{{ user.customerGroup.name }}</span>
            </div>
          </div>
          <div class="profile-details">
            <div class="detail-item">
              <label>Email Address</label>
              <p>{{ user.email }}</p>
            </div>
            <div class="detail-item">
              <label>Phone Number</label>
              <p>{{ user.phone || 'Not provided' }}</p>
            </div>
            <div class="detail-item">
              <label>Business Name</label>
              <p>{{ user.companyName || 'Personal Account' }}</p>
            </div>
            <div class="detail-item" *ngIf="user.taxCode">
              <label>Tax Code</label>
              <p>{{ user.taxCode }}</p>
            </div>
            <button tuiButton type="button" appearance="outline" size="m" (click)="logout()" style="width: 100%; margin-top: 10px;">
              Logout
            </button>
          </div>
        </div>

        <!-- Order History Card -->
        <div class="orders-card">
          <div class="card-header">
            <h3>Recent Orders</h3>
          </div>
          
          <ng-container *ngIf="orders$ | async as orders">
            <div class="order-list" *ngIf="!loading">
              <div *ngIf="orders.length === 0" class="empty-orders">
                <tui-icon icon="@tui.package"></tui-icon>
                <p>No orders found.</p>
              </div>

              <div class="order-wrapper" *ngFor="let order of orders" [class.expanded]="isExpanded(order.id)">
              <div class="order-item" (click)="toggleOrder(order)">
                <div class="order-info">
                  <div class="id-row">
                    <span class="order-id">Order #{{ order.id }}</span>
                    <tui-badge size="s" [appearance]="getStatusAppearance(order.status)">
                      {{ order.status }}
                    </tui-badge>
                  </div>
                  <span class="order-date">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                
                <div class="order-summary-meta" *ngIf="!isExpanded(order.id)">
                   <div class="item-thumbs" *ngIf="order.items?.length">
                      <img *ngFor="let itm of order.items?.slice(0, 3)" [src]="itm.productVariant?.imageUrl || itm.productVariant?.product?.imageUrl || 'assets/placeholder-product.png'">
                      <span class="more-count" *ngIf="order.items && order.items.length > 3">+{{ order.items.length - 3 }}</span>
                   </div>
                </div>

                <div class="order-total">
                  <span class="total">{{ order.totalAmount | number }}đ</span>
                  <tui-icon [icon]="isExpanded(order.id) ? '@tui.chevron-up' : '@tui.chevron-down'" class="chevron"></tui-icon>
                </div>
              </div>

              <!-- Expanded Details -->
              <div class="order-details-pane" *ngIf="isExpanded(order.id)">
                <div class="items-list">
                   <div class="item-row" *ngFor="let item of order.items || []">
                      <div class="item-pic">
                        <img [src]="item.productVariant?.imageUrl || item.productVariant?.product?.imageUrl || 'assets/placeholder-product.png'">
                      </div>
                      <div class="item-main">
                        <a [routerLink]="['/product', item.productVariant?.productId || item.productVariant?.product?.id]" class="name">
                          {{ item.productVariant?.product?.name || 'Product' }}
                        </a>
                        <div class="meta" *ngIf="item.productVariant?.color || item.productVariant?.size">
                          {{ item.productVariant?.color }}{{ item.productVariant?.color && item.productVariant?.size ? ' / ' : '' }}{{ item.productVariant?.size }}
                        </div>
                      </div>
                      <div class="item-qty">x{{ item.quantity }}</div>
                      <div class="item-sub">{{ (item.unitPrice * item.quantity) | number }}đ</div>
                   </div>
                </div>
                
                <div class="order-actions">
                  <button tuiButton type="button" size="s" appearance="secondary-grayscale" (click)="reorder($event, order)">
                    <tui-icon icon="@tui.refresh-ccw"></tui-icon>
                    Reorder This
                  </button>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div class="pagination-wrap" *ngIf="totalElements > size">
              <tui-pagination
                [length]="Math.ceil(totalElements / size)"
                [index]="(page$ | async) || 0"
                (indexChange)="onPageChange($event)"
              ></tui-pagination>
            </div>
          </div>
        </ng-container>
          <div class="loading-state" *ngIf="loading">Loading your orders...</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container { max-width: 1200px; margin: 40px auto; padding: 0 20px; font-family: 'Inter', sans-serif; }
    h1 { font-weight: 800; margin-bottom: 30px; font-size: 32px; }
    
    .profile-grid { display: grid; grid-template-columns: 350px 1fr; gap: 30px; }
    
    .profile-card, .orders-card { background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #f0f0f0; }
    
    .profile-header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #f0f0f0; padding-bottom: 20px; }
    .avatar { width: 80px; height: 80px; background: #111; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; margin: 0 auto 15px; }
    
    .role-badges { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .role-badge { padding: 4px 12px; background: #f0f0f0; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .role-badge.group { background: #eefdf9; color: #007052; }
    
    .detail-item { margin-bottom: 20px; 
      label { font-size: 11px; color: #888; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px; }
      p { font-size: 15px; color: #333; margin: 0; font-weight: 600; }
    }

    .orders-card { .card-header { margin-bottom: 24px; } }
    .order-list { display: flex; flex-direction: column; gap: 16px; }
    
    .order-wrapper { 
       background: #fafafa; border-radius: 12px; border: 1px solid #eee; overflow: hidden; 
       transition: all 0.2s;
       &.expanded { background: white; border-color: #111; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    }

    .order-item { 
      display: flex; justify-content: space-between; align-items: center; padding: 20px; 
      cursor: pointer;
      &:hover { background: #f5f5f5; }
    }
    
    .id-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .order-info { display: flex; flex-direction: column; 
      .order-id { font-weight: 700; color: #111; font-size: 15px; }
      .order-date { font-size: 12px; color: #777; }
    }

    .order-summary-meta { 
      flex: 1; margin: 0 40px;
      .item-thumbs { display: flex; align-items: center; gap: -10px;
        img { width: 32px; height: 32px; border-radius: 4px; object-fit: cover; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .more-count { font-size: 11px; font-weight: 700; color: #888; margin-left: 8px; }
      }
    }
    
    .order-total { display: flex; align-items: center; gap: 20px;
      .total { font-weight: 800; color: #d32f2f; font-size: 18px; }
      .chevron { color: #888; }
    }

    .order-details-pane { 
      padding: 0 20px 20px;
      border-top: 1px dashed #eee;
      .items-list { padding: 15px 0; }
      .item-row { 
        display: flex; align-items: center; gap: 15px; padding: 10px 0;
        &:not(:last-child) { border-bottom: 1px solid #f5f5f5; }
      }
      .item-pic img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; background: #eee; }
      .item-main { flex: 1; 
        .name { font-weight: 600; font-size: 14px; color: #111; }
        .meta { font-size: 12px; color: #888; margin-top: 2px; }
      }
      .item-qty { font-weight: 700; color: #666; font-size: 14px; }
      .item-sub { font-weight: 700; color: #111; font-size: 14px; }
      
      .order-actions { margin-top: 15px; border-top: 1px solid #f0f0f0; padding-top: 15px; text-align: right; }
    }

    .pagination-wrap { margin-top: 30px; display: flex; justify-content: center; }

    .empty-orders { text-align: center; padding: 60px; color: #999; tui-icon { font-size: 48px; margin-bottom: 15px; } }
    .loading-state { text-align: center; padding: 30px; color: #888; }
  `]
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly cart = inject(CartService);
  private readonly alerts = inject(TuiAlertService);
  private readonly router = inject(Router);
  protected readonly Math = Math;

  user$ = this.auth.user$;
  
  page$ = new BehaviorSubject<number>(0);
  size = 5;
  totalElements = 0;
  loading = false;

  orders$ = combineLatest([this.user$, this.page$]).pipe(
    tap(() => this.loading = true),
    switchMap(([user, page]) => {
        if (!user) {
            this.loading = false;
            return of([]);
        }
        return this.api.getOrdersByUserPaged(user.id, page, this.size).pipe(
            tap(res => {
                this.totalElements = res.totalElements;
                this.loading = false;
            }),
            map(res => res.content)
        );
    })
  );

  expandedOrderIds = new Set<number>();

  getStatusAppearance(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PENDING': return 'warning';
      case 'PROCESSING': return 'info';
      case 'CANCELLED': return 'danger';
      default: return 'neutral';
    }
  }

  isExpanded(orderId: number): boolean {
    return this.expandedOrderIds.has(orderId);
  }

  onPageChange(page: number): void {
    this.page$.next(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleOrder(order: Order): void {
    if (this.expandedOrderIds.has(order.id)) {
      this.expandedOrderIds.delete(order.id);
    } else {
      this.expandedOrderIds.add(order.id);
      // Fetch full order to ensure items are present
      if (!order.items) {
        this.api.getOrderById(order.id).subscribe(fullOrder => {
          order.items = fullOrder.items;
        });
      }
    }
  }

  reorder(event: Event, order: Order): void {
    event.stopPropagation(); // Avoid closing the pane

    // Ensure we have items
    if (!order.items) {
       this.api.getOrderById(order.id).subscribe(fullOrder => {
         this.processReorder(fullOrder);
       });
    } else {
       this.processReorder(order);
    }
  }

  private processReorder(order: Order): void {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        if (item.productVariant) {
          const product = item.productVariant.product || item.productVariant;
          this.cart.addToCart(product, item.productVariant, item.quantity);
        }
      });
      this.alerts.open('Tất cả sản phẩm đã được thêm lại vào giỏ hàng!', { label: 'Thành công', appearance: 'success' }).subscribe();
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
