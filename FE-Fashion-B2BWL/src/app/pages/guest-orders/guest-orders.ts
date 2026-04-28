import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TuiAlertService, TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { ApiService, Order } from '../../services/api.service';
import {
  canCustomerConfirmRefundReceived,
  canCustomerMarkReceived,
  getOrderPaymentCaption,
  isAwaitingCustomerRefundConfirm,
  needsCustomerRefundContactNotice,
  shouldWarnQrRefundOnCancel,
} from '../../utils/profile-order-flow';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';

@Component({
  selector: 'app-guest-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TuiButton, TuiBadge, TuiTextfield, StorefrontHeaderComponent, StorefrontFooterComponent],
  template: `
    <app-storefront-header></app-storefront-header>
    <div class="guest-orders-page">
      <h1>Tra cứu đơn hàng nhanh</h1>
      <p class="sub">Nhập số điện thoại đặt hàng để theo dõi trạng thái, xác nhận đã nhận hàng và xác nhận nhận tiền hoàn trả.</p>
      <p class="sub login-hint">Đăng nhập để nhận nhiều ưu đãi hơn, lưu lịch sử đơn đầy đủ và quản lý công nợ.</p>
      <div class="lookup">
        <tui-textfield tuiTextfieldSize="m">
          <input tuiTextfield [(ngModel)]="phone" placeholder="Số điện thoại (vd: 09xxxxxxxx)" />
        </tui-textfield>
        <button tuiButton appearance="primary" size="m" class="lookup-btn" (click)="lookup()">Tra cứu đơn</button>
      </div>

      <div class="orders" *ngIf="orders.length > 0">
        <div class="order" *ngFor="let order of orders">
          <div class="head">
            <strong>Đơn #{{ order.id }}</strong>
            <tui-badge size="s" appearance="info">{{ order.status }}</tui-badge>
          </div>
          <div class="meta">
            <span>{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
            <span>{{ order.totalAmount | number }}đ</span>
          </div>
          <p class="caption">{{ paymentCaption(order) }}</p>
          <p class="notice warn" *ngIf="needsRefundContact(order)">Đơn đã hủy và đã thu tiền online. Vui lòng liên hệ shop để hoàn tiền.</p>
          <p class="notice ok" *ngIf="awaitingRefundConfirm(order)">Shop đã đánh dấu hoàn tiền. Vui lòng kiểm tra tài khoản và xác nhận.</p>

          <div class="actions">
            <button tuiButton appearance="outline" size="s" *ngIf="canCancel(order)" (click)="cancel(order)">Hủy đơn</button>
            <button tuiButton appearance="primary" size="s" *ngIf="canMarkReceived(order)" (click)="markReceived(order)">Đã nhận hàng</button>
            <button tuiButton appearance="accent" size="s" *ngIf="canConfirmRefund(order)" (click)="confirmRefund(order)">Xác nhận đã nhận tiền hoàn trả</button>
          </div>
        </div>
      </div>
      <p *ngIf="loaded && orders.length === 0" class="empty">Không có đơn guest theo số điện thoại này.</p>
    </div>
    <app-storefront-footer></app-storefront-footer>
  `,
  styles: [`
    .guest-orders-page { max-width: 980px; margin: 32px auto; padding: 0 16px; }
    .sub { color: #555; margin: 6px 0; }
    .login-hint { color: #1d4ed8; font-weight: 600; }
    .lookup { display: flex; gap: 12px; align-items: stretch; margin: 18px 0 24px; }
    .lookup tui-textfield { flex: 1; min-width: 260px; }
    .lookup-btn {
      min-width: 140px;
      font-weight: 700;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }
    .orders { display: grid; gap: 14px; }
    .order { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #fff; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .meta { display: flex; gap: 12px; color: #666; font-size: 13px; margin: 8px 0; }
    .caption { margin: 8px 0; font-size: 13px; }
    .notice { padding: 8px 10px; border-radius: 8px; font-size: 12px; }
    .warn { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .ok { background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; }
    .actions { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
    .empty { color: #6b7280; }
    @media (max-width: 640px) {
      .lookup { flex-direction: column; }
      .lookup tui-textfield, .lookup-btn { width: 100%; min-width: 0; }
      .lookup-btn { min-height: 44px; }
    }
  `],
})
export class GuestOrdersComponent {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(TuiAlertService);
  private readonly route = inject(ActivatedRoute);

  phone = '';
  orders: Order[] = [];
  loaded = false;

  constructor() {
    const p = this.route.snapshot.queryParamMap.get('phone');
    if (p) {
      this.phone = p;
      this.lookup();
    }
  }

  lookup(): void {
    const normalized = String(this.phone || '').trim();
    if (!normalized) return;
    this.api.getGuestOrdersByPhone(normalized).subscribe({
      next: (items) => {
        this.orders = items || [];
        this.loaded = true;
      },
      error: (e) => {
        this.orders = [];
        this.loaded = true;
        const msg = e?.error?.message || 'Không tra cứu được đơn.';
        this.alerts.open(String(msg), { appearance: 'error' }).subscribe();
      },
    });
  }

  paymentCaption(order: Order): string {
    return getOrderPaymentCaption(order);
  }

  canCancel(order: Order): boolean {
    const status = (order.status || '').toUpperCase();
    if (status !== 'PENDING' && status !== 'PROCESSING') return false;
    return true;
  }

  canMarkReceived(order: Order): boolean {
    return canCustomerMarkReceived(order);
  }

  canConfirmRefund(order: Order): boolean {
    return canCustomerConfirmRefundReceived(order);
  }

  needsRefundContact(order: Order): boolean {
    return needsCustomerRefundContactNotice(order);
  }

  awaitingRefundConfirm(order: Order): boolean {
    return isAwaitingCustomerRefundConfirm(order);
  }

  cancel(order: Order): void {
    if (shouldWarnQrRefundOnCancel(order)) {
      if (!confirm('Đơn đã thanh toán online. Sau khi hủy, vui lòng liên hệ shop để được hoàn tiền.')) return;
    } else if (!confirm('Bạn có chắc muốn hủy đơn này?')) return;
    this.api.cancelGuestOrder(order.id, this.phone).subscribe({
      next: (updated) => Object.assign(order, updated),
      error: (e) => this.alerts.open(String(e?.error?.message || 'Không hủy được đơn.'), { appearance: 'error' }).subscribe(),
    });
  }

  markReceived(order: Order): void {
    this.api.markGuestOrderReceived(order.id, this.phone).subscribe({
      next: (updated) => Object.assign(order, updated),
      error: (e) => this.alerts.open(String(e?.error?.message || 'Không cập nhật được đơn.'), { appearance: 'error' }).subscribe(),
    });
  }

  confirmRefund(order: Order): void {
    if (!confirm('Xác nhận bạn đã nhận đủ tiền hoàn trả?')) return;
    this.api.confirmGuestRefundReceived(order.id, this.phone).subscribe({
      next: (updated) => Object.assign(order, updated),
      error: (e) => this.alerts.open(String(e?.error?.message || 'Không xác nhận được hoàn tiền.'), { appearance: 'error' }).subscribe(),
    });
  }
}

