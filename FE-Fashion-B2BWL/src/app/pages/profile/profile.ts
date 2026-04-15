import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ApiService, DebtSummary, Order } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Observable, switchMap, of, tap, BehaviorSubject, combineLatest, map } from 'rxjs';
import { TuiButton, TuiIcon, TuiAlertService } from '@taiga-ui/core';
import { TuiBadge, TuiPagination } from '@taiga-ui/kit';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { buildReorderPricingNotice } from '../../utils/order-pricing-snapshot';
import {
  buildOrderFlowSteps,
  canCustomerCancelOrder,
  canCustomerConfirmRefundReceived,
  canCustomerMarkReceived,
  getOrderPaymentCaption,
  needsCustomerRefundContactNotice,
  isAwaitingCustomerRefundConfirm,
  showFulfilmentWaitingNotice,
  shouldWarnQrRefundOnCancel,
  type OrderFlowStep,
} from '../../utils/profile-order-flow';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiBadge,
    RouterModule,
    ReactiveFormsModule,
    StorefrontHeaderComponent,
    StorefrontFooterComponent,
    TuiPagination,
  ],
  template: `
    <app-storefront-header></app-storefront-header>
    <div class="profile-container">
      <h1>My Account</h1>
      
      <div class="profile-grid">
        <div class="top-row">
          <!-- Account Info Card -->
          <div class="profile-card info-card" *ngIf="user$ | async as user">
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

        <div class="profile-card password-card" *ngIf="user$ | async">
          <div class="profile-header" style="text-align:left">
            <h2 style="margin:0">Đổi mật khẩu</h2>
          </div>
          <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()">
            <div class="pwd-field">
              <label for="pwd-current">Mật khẩu hiện tại</label>
              <input id="pwd-current" type="password" formControlName="currentPassword" autocomplete="current-password" />
            </div>
            <div class="pwd-field">
              <label for="pwd-new">Mật khẩu mới</label>
              <input id="pwd-new" type="password" formControlName="newPassword" autocomplete="new-password" />
            </div>
            <div class="pwd-field">
              <label for="pwd-confirm">Xác nhận mật khẩu mới</label>
              <input id="pwd-confirm" type="password" formControlName="confirmPassword" autocomplete="new-password" />
            </div>
            <p class="pwd-err" *ngIf="passwordForm.errors?.['mismatch'] && passwordForm.touched">Mật khẩu mới và xác nhận không khớp.</p>
            <p class="pwd-hint">Tối thiểu 6 ký tự.</p>
            <button tuiButton type="submit" appearance="primary" size="m" [disabled]="passwordForm.invalid || pwdBusy" style="width:100%; margin-top:4px;">
              Cập nhật mật khẩu
            </button>
          </form>
        </div>

        <div class="profile-card debt-card" *ngIf="debtSummary$ | async as debt">
          <div class="profile-header" style="text-align:left">
            <h2 style="margin:0">Công nợ</h2>
            <div class="role-badges" style="justify-content:flex-start; margin-top:8px;">
              <span class="role-badge" [style.background]="debt.blocked ? '#fee2e2' : '#ecfdf5'" [style.color]="debt.blocked ? '#b91c1c' : '#065f46'">
                {{ debt.blocked ? 'Đang bị khóa đặt đơn' : 'Không quá hạn' }}
              </span>
            </div>
          </div>
          <div class="profile-details">
            <div class="debt-explainer" *ngIf="debt.items.length">
              <p>
                <strong>Cách thanh toán:</strong> Chuyển khoản đúng số tiền theo hướng dẫn của shop (stk / nội dung CK do shop cung cấp).
                Sau khi đã chuyển, bấm <strong>«Báo đã chuyển»</strong> — shop nhận tin trên mục <strong>Tin nhắn</strong> và đối soát.
                Khi shop xác nhận đã nhận tiền, dòng đơn sẽ hết nợ.
              </p>
            </div>
            <div class="detail-item">
              <label>Số đơn công nợ quá hạn</label>
              <p>{{ debt.overdueCount }}</p>
            </div>
            <div class="detail-item" *ngIf="debt.items.length === 0">
              <p>Không có đơn công nợ đang mở.</p>
            </div>
            <div class="detail-item debt-row" *ngFor="let d of debt.items">
              <div class="debt-info">
                <label>Đơn #{{ d.orderId }}</label>
                <p>{{ debtStatusLabel(d.daysLeft) }} — Hạn: {{ d.dueDate | date:'dd/MM/yyyy' }}</p>
                <p class="debt-amount" *ngIf="d.totalAmount != null">Số tiền: <strong>{{ d.totalAmount | number:'1.0-0' }} ₫</strong></p>
              </div>
              <button tuiButton type="button" size="s" appearance="primary" *ngIf="d.paymentStatus !== 'PAID' && d.paymentStatus !== 'AWAITING_CONFIRMATION'" (click)="payDebt(d.orderId)">
                Báo đã chuyển
              </button>
              <tui-badge *ngIf="d.paymentStatus === 'AWAITING_CONFIRMATION'" appearance="warning" size="s">Chờ shop xác nhận</tui-badge>
              <tui-badge *ngIf="d.paymentStatus === 'PAID'" appearance="success" size="s">Đã thanh toán</tui-badge>
            </div>
          </div>
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
                <div class="order-flow">
                  <h4 class="flow-title">Quy trình đơn hàng</h4>
                  <ol class="flow-steps">
                    <li *ngFor="let step of getFlowSteps(order)" class="flow-step" [ngClass]="'flow-step--' + step.state">
                      <span class="flow-dot" aria-hidden="true"></span>
                      <div class="flow-text">
                        <span class="flow-label">{{ step.label }}</span>
                        <span class="flow-hint" *ngIf="step.hint">{{ step.hint }}</span>
                      </div>
                    </li>
                  </ol>
                  <p class="payment-caption">{{ getPaymentCaption(order) }}</p>
                  <p class="flow-notice" *ngIf="fulfilmentWaitingNotice(order)">
                    Tiền đã được ghi nhận, nhưng shop chưa xác nhận đơn — bạn <strong>chưa thể</strong> bấm &quot;Đã nhận hàng&quot;. Giao hàng chỉ bắt đầu sau bước xác nhận đơn của shop.
                  </p>
                  <p class="flow-notice flow-notice--warn" *ngIf="refundContactNotice(order)">
                    Đơn đã thu tiền qua chuyển khoản/QR. Vui lòng <strong>liên hệ shop</strong> để được hoàn tiền. Sau khi shop chuyển khoản lại, bạn sẽ thấy nút xác nhận đã nhận tiền hoàn trả bên dưới.
                  </p>
                  <p class="flow-notice flow-notice--ok" *ngIf="refundAwaitConfirmNotice(order)">
                    Shop đã ghi nhận đã chuyển khoản hoàn tiền. Khi bạn kiểm tra đủ số tiền về tài khoản, hãy bấm xác nhận bên dưới.
                  </p>
                  <div class="customer-actions" *ngIf="canCancelOrder(order) || canMarkReceived(order) || canConfirmRefund(order)">
                    <button
                      tuiButton
                      type="button"
                      size="s"
                      appearance="outline"
                      *ngIf="canCancelOrder(order)"
                      [disabled]="actionBusy.has(order.id)"
                      (click)="cancelCustomerOrder($event, order)"
                    >
                      Hủy đơn
                    </button>
                    <button
                      tuiButton
                      type="button"
                      size="s"
                      appearance="primary"
                      *ngIf="canMarkReceived(order)"
                      [disabled]="actionBusy.has(order.id)"
                      (click)="markOrderReceived($event, order)"
                    >
                      Đã nhận hàng
                    </button>
                    <button
                      tuiButton
                      type="button"
                      size="s"
                      appearance="accent"
                      *ngIf="canConfirmRefund(order)"
                      [disabled]="actionBusy.has(order.id)"
                      (click)="confirmCustomerRefundReceived($event, order)"
                    >
                      Xác nhận đã nhận tiền hoàn trả
                    </button>
                  </div>
                </div>

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
                        <div class="pricing-note" *ngIf="item.pricingNote">{{ item.pricingNote }}</div>
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
    
    .profile-grid { display: flex; flex-direction: column; gap: 30px; }
    .top-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 30px; align-items: start; }
    
    .profile-card { background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #f0f0f0; width: 100%; margin: 0; box-sizing: border-box; }
    .orders-card { background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #f0f0f0; width: 100%; box-sizing: border-box; }
    
    .profile-header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #f0f0f0; padding-bottom: 20px; }
    .avatar { width: 80px; height: 80px; background: #111; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; margin: 0 auto 15px; }
    
    .role-badges { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .role-badge { padding: 4px 12px; background: #f0f0f0; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .role-badge.group { background: #eefdf9; color: #007052; }
    
    .detail-item { margin-bottom: 20px; 
      label { font-size: 11px; color: #888; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px; }
      p { font-size: 15px; color: #333; margin: 0; font-weight: 600; }
    }
    
    .debt-explainer {
      margin-bottom: 16px; padding: 12px 14px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; font-size: 13px; line-height: 1.45; color: #0c4a6e;
      p { margin: 0; }
    }
    .debt-amount { margin: 6px 0 0; font-size: 13px; color: #444; }
    .debt-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #eee; gap: 12px; flex-wrap: wrap; }
    .debt-row:last-child { border-bottom: none; }
    .debt-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }

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

      .order-flow {
        padding: 16px 0 8px;
        border-bottom: 1px solid #f0f0f0;
        margin-bottom: 8px;
      }
      .flow-title { margin: 0 0 12px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #555; }
      .flow-steps { list-style: none; margin: 0; padding: 0 0 0 4px; }
      .flow-step {
        position: relative;
        display: flex;
        gap: 12px;
        padding: 0 0 14px 0;
        margin: 0;
        &:not(:last-child)::before {
          content: '';
          position: absolute;
          left: 5px;
          top: 14px;
          bottom: -2px;
          width: 2px;
          background: #e8e8e8;
        }
      }
      .flow-step--done .flow-dot { background: #0d9488; border-color: #0d9488; }
      .flow-step--current .flow-dot { background: #111; border-color: #111; box-shadow: 0 0 0 3px rgba(17,17,17,0.12); }
      .flow-step--pending .flow-dot { background: #fff; border-color: #ccc; }
      .flow-step--failed .flow-dot { background: #dc2626; border-color: #dc2626; }
      .flow-step--failed .flow-label { color: #b91c1c; }
      .flow-dot {
        flex-shrink: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid #ccc;
        margin-top: 3px;
        z-index: 1;
      }
      .flow-text { display: flex; flex-direction: column; gap: 4px; }
      .flow-label { font-size: 14px; font-weight: 600; color: #111; }
      .flow-hint { font-size: 12px; color: #777; line-height: 1.35; }
      .payment-caption { margin: 12px 0 0; font-size: 13px; color: #444; padding: 10px 12px; background: #f7f7f7; border-radius: 8px; }
      .flow-notice { margin: 10px 0 0; font-size: 12px; line-height: 1.45; color: #444; padding: 10px 12px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd; }
      .flow-notice--warn { background: #fffbeb; border-color: #fcd34d; color: #78350f; }
      .flow-notice--ok { background: #ecfdf5; border-color: #6ee7b7; color: #065f46; }
      .customer-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }

      .items-list { padding: 15px 0; }
      .item-row { 
        display: flex; align-items: center; gap: 15px; padding: 10px 0;
        &:not(:last-child) { border-bottom: 1px solid #f5f5f5; }
      }
      .item-pic img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; background: #eee; }
      .item-main { flex: 1; 
        .name { font-weight: 600; font-size: 14px; color: #111; }
        .meta { font-size: 12px; color: #888; margin-top: 2px; }
        .pricing-note { font-size: 11px; color: #666; margin-top: 6px; line-height: 1.35; font-style: italic; }
      }
      .item-qty { font-weight: 700; color: #666; font-size: 14px; }
      .item-sub { font-weight: 700; color: #111; font-size: 14px; }
      
      .order-actions { margin-top: 15px; border-top: 1px solid #f0f0f0; padding-top: 15px; text-align: right; }
    }

    .pagination-wrap { margin-top: 30px; display: flex; justify-content: center; }

    .password-card {
      form { display: flex; flex-direction: column; gap: 12px; padding: 8px 4px 4px; }
      .pwd-field label { display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 6px; }
      .pwd-field input {
        width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 8px;
        font-size: 14px; box-sizing: border-box;
      }
      .pwd-err { color: #dc2626; font-size: 12px; margin: 0; }
      .pwd-hint { font-size: 12px; color: #888; margin: 0; }
    }

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
  private readonly fb = inject(FormBuilder);
  protected readonly Math = Math;

  pwdBusy = false;

  passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: [ProfileComponent.passwordsMatchValidator] },
  );

  private static passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const n = control.get('newPassword')?.value;
    const c = control.get('confirmPassword')?.value;
    if (n == null || c == null || n === '' || c === '') return null;
    return n === c ? null : { mismatch: true };
  }

  user$ = this.auth.user$;
  
  page$ = new BehaviorSubject<number>(0);
  size = 5;
  totalElements = 0;
  loading = false;
  
  refreshDebt$ = new BehaviorSubject<void>(undefined);

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

  debtSummary$ = combineLatest([this.user$, this.refreshDebt$]).pipe(
    switchMap(([user]) => user?.id ? this.api.getDebtSummary(user.id) : of({ blocked: false, overdueCount: 0, items: [] } as DebtSummary))
  );

  expandedOrderIds = new Set<number>();
  /** Tránh double-submit khi gọi API trạng thái đơn. */
  actionBusy = new Set<number>();

  getFlowSteps(order: Order): OrderFlowStep[] {
    return buildOrderFlowSteps(order);
  }

  getPaymentCaption(order: Order): string {
    return getOrderPaymentCaption(order);
  }

  canCancelOrder(order: Order): boolean {
    return canCustomerCancelOrder(order);
  }

  canMarkReceived(order: Order): boolean {
    return canCustomerMarkReceived(order);
  }

  canConfirmRefund(order: Order): boolean {
    return canCustomerConfirmRefundReceived(order);
  }

  fulfilmentWaitingNotice(order: Order): boolean {
    return showFulfilmentWaitingNotice(order);
  }

  refundContactNotice(order: Order): boolean {
    return needsCustomerRefundContactNotice(order);
  }

  refundAwaitConfirmNotice(order: Order): boolean {
    return isAwaitingCustomerRefundConfirm(order);
  }

  cancelCustomerOrder(event: Event, order: Order): void {
    event.stopPropagation();
    if (shouldWarnQrRefundOnCancel(order)) {
      if (
        !confirm(
          'Đơn đã thanh toán chuyển khoản/QR. Sau khi hủy bạn cần liên hệ shop để hoàn tiền (shop chuyển khoản lại → bạn xác nhận trên trang này). Tiếp tục hủy đơn?'
        )
      ) {
        return;
      }
    } else if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
      return;
    }
    this.actionBusy.add(order.id);
    this.api.updateOrderStatus(order.id, 'CANCELLED').subscribe({
      next: (updated) => {
        Object.assign(order, updated);
        this.actionBusy.delete(order.id);
        this.alerts.open('Đơn đã được hủy.', { label: 'Thành công', appearance: 'success' }).subscribe();
      },
      error: () => {
        this.actionBusy.delete(order.id);
        this.alerts.open('Không hủy được đơn. Thử lại hoặc liên hệ shop.', { label: 'Lỗi', appearance: 'error' }).subscribe();
      },
    });
  }

  confirmCustomerRefundReceived(event: Event, order: Order): void {
    event.stopPropagation();
    const uid = this.auth.currentUserValue?.id;
    if (uid == null) {
      this.alerts.open('Vui lòng đăng nhập lại.', { label: 'Lỗi', appearance: 'error' }).subscribe();
      return;
    }
    if (!confirm('Xác nhận bạn đã nhận đủ tiền hoàn trả về tài khoản?')) return;
    this.actionBusy.add(order.id);
    this.api.confirmRefundReceived(order.id, uid).subscribe({
      next: (updated) => {
        Object.assign(order, updated);
        this.actionBusy.delete(order.id);
        this.alerts.open('Đã ghi nhận. Cảm ơn bạn.', { label: 'Thành công', appearance: 'success' }).subscribe();
      },
      error: () => {
        this.actionBusy.delete(order.id);
        this.alerts.open('Chưa xác nhận được. Shop có thể chưa đánh dấu hoàn tiền.', { label: 'Lỗi', appearance: 'error' }).subscribe();
      },
    });
  }

  markOrderReceived(event: Event, order: Order): void {
    event.stopPropagation();
    this.actionBusy.add(order.id);
    this.api.updateOrderStatus(order.id, 'COMPLETED').subscribe({
      next: (updated) => {
        Object.assign(order, updated);
        this.actionBusy.delete(order.id);
        this.alerts.open('Cảm ơn bạn đã xác nhận nhận hàng.', { label: 'Thành công', appearance: 'success' }).subscribe();
      },
      error: () => {
        this.actionBusy.delete(order.id);
        this.alerts.open('Không cập nhật được trạng thái. Liên hệ shop.', { label: 'Lỗi', appearance: 'error' }).subscribe();
      },
    });
  }

  getStatusAppearance(status: string): string {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'PROCESSING':
      case 'SHIPPED': return 'info';
      case 'CANCELLED': 
      case 'REJECTED': return 'danger';
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
      this.api.getOrderById(order.id).subscribe(fullOrder => {
        Object.assign(order, fullOrder);
      });
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
      const msg =
        'Đã thêm lại vào giỏ. ' + buildReorderPricingNotice(order);
      this.alerts.open(msg, { label: 'Reorder', appearance: 'info', autoClose: 12000 }).subscribe();
    }
  }

  submitPassword(): void {
    const u = this.auth.currentUserValue;
    if (!u?.email) {
      this.alerts.open('Vui lòng đăng nhập lại.', { label: 'Lỗi', appearance: 'error' }).subscribe();
      return;
    }
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) return;
    const v = this.passwordForm.getRawValue();
    this.pwdBusy = true;
    this.api
      .changePassword({
        email: u.email,
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      })
      .subscribe({
        next: (res) => {
          this.pwdBusy = false;
          if (res.success) {
            this.passwordForm.reset();
            this.alerts
              .open(res.message || 'Đã cập nhật mật khẩu.', { label: 'Thành công', appearance: 'success' })
              .subscribe();
          } else {
            this.alerts.open(res.message || 'Không đổi được mật khẩu.', { label: 'Lỗi', appearance: 'error' }).subscribe();
          }
        },
        error: (err) => {
          this.pwdBusy = false;
          const body = err?.error;
          const msg =
            (typeof body?.message === 'string' && body.message) ||
            (body?.success === false && body?.message) ||
            'Không đổi được mật khẩu. Kiểm tra mật khẩu hiện tại.';
          this.alerts.open(msg, { label: 'Lỗi', appearance: 'error' }).subscribe();
        },
      });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  payDebt(orderId: number): void {
    this.api.updatePaymentStatus(orderId, 'AWAITING_CONFIRMATION').pipe(
      tap(() => {
        this.alerts
          .open(
            'Shop đã nhận thông báo trên Tin nhắn và sẽ đối soát chuyển khoản. Trạng thái đơn hiển thị «Chờ shop xác nhận» cho đến khi shop ghi nhận thanh toán công nợ.',
            { label: 'Đã gửi', appearance: 'success', autoClose: 8000 },
          )
          .subscribe();
        this.refreshDebt$.next();
      }),
    ).subscribe();
  }

  debtStatusLabel(daysLeft: number): string {
    if (daysLeft < 0) return `Quá hạn ${Math.abs(daysLeft)} ngày`;
    if (daysLeft === 0) return 'Đến hạn hôm nay';
    return `Còn ${daysLeft} ngày`;
  }
}
