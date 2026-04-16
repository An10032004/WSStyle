import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, Order } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { TuiButton, TuiDialogService, TuiAlertService } from '@taiga-ui/core';
import { TuiBadge, TuiCheckbox } from '@taiga-ui/kit';
import {
  adminOrderStatusPillClass,
  adminPaymentStatusPillClass,
  escapeHtml,
} from '../../utils/admin-status-pills';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, TranslocoModule, ActionRendererComponent, TuiButton, TuiBadge, TuiCheckbox],
  template: `
    <div class="page-container">
      <div class="header-section" style="padding: 16px; display:flex; justify-content:space-between; align-items:center;">
        <h2 class="title" style="margin:0">{{ 'ORDER.TITLE' | transloco }}</h2>
        <input type="text" class="tui-input" placeholder="Tìm kiếm đơn hàng..." style="padding:8px 12px; border:1px solid #ccc; border-radius:4px; max-width:300px; width:100%; outline:none;" (input)="onQuickFilterChange($event)"/>
      </div>
      <div class="grid-wrapper">
        <ag-grid-angular
          class="ag-theme-alpine"
          style="width: 100%; height: 600px;"
          [rowData]="rowData"
          [columnDefs]="columnDefs"
          [pagination]="true"
          [paginationPageSize]="20"
          [paginationPageSizeSelector]="[10, 20, 50, 100]"
          [localeText]="localeText"
          [defaultColDef]="defaultColDef"
          (gridReady)="onGridReady($event)"
          [animateRows]="true"
        ></ag-grid-angular>
      </div>
    </div>

    <ng-template #viewDialog let-observer>
      <div class="view-detail" *ngIf="selectedOrder">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">{{ 'ORDER.ID' | transloco }}:</span>
            <span class="value">#{{ selectedOrder.id }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.DATE' | transloco }}:</span>
            <span class="value">{{ selectedOrder.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.USER' | transloco }}:</span>
            <span class="value">{{ selectedOrder.user.fullName }} ({{ selectedOrder.user.email }})</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.TYPE' | transloco }}:</span>
            <tui-badge size="s" [appearance]="selectedOrder.orderType === 'WHOLESALE' ? 'warning' : 'info'">
              {{ 'ENUMS.' + selectedOrder.orderType | transloco }}
            </tui-badge>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.STATUS' | transloco }}:</span>
            <span [class]="orderStatusPillClass(selectedOrder.status)">{{ orderStatusLabel(selectedOrder.status) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.PAYMENT_METHOD' | transloco }}:</span>
            <span class="value">{{ selectedOrder.paymentMethod }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.PAYMENT_STATUS' | transloco }}:</span>
            <span [class]="paymentStatusPillClass(selectedOrder.paymentStatus)">{{ paymentStatusLabel(selectedOrder.paymentStatus) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.TOTAL' | transloco }}:</span>
            <span class="value" style="font-weight: bold; color: #d32f2f;">{{ selectedOrder.totalAmount | number }}đ</span>
          </div>
          <div class="detail-item">
            <span class="label">Đã thanh toán:</span>
            <span class="value" style="font-weight: 600; color: #1b5e20;">{{ (selectedOrder.paidAmount ?? 0) | number }}đ</span>
          </div>
          <div class="detail-item" *ngIf="(selectedOrder.paymentMethod || '').toUpperCase() === 'NET_TERMS'">
            <span class="label">Còn nợ:</span>
            <span class="value" [style.color]="(selectedOrder.debtAmount ?? 0) > 0 ? '#b45309' : '#333'">{{ (selectedOrder.debtAmount ?? 0) | number }}đ</span>
          </div>

          <!-- Section: Recipient Information -->
          <div class="detail-item full-width" style="grid-column: span 2; margin-top: 12px; border-top: 1px solid #f0f0f0; padding-top: 12px;">
            <span class="label" style="color: #00BA88;">{{ 'RECIPIENT INFO' }}</span>
          </div>
          
          <div class="detail-item">
            <span class="label">NGƯỜI NHẬN:</span>
            <span class="value">{{ selectedOrder.fullName || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">SỐ ĐIỆN THOẠI:</span>
            <span class="value">{{ selectedOrder.phone || 'N/A' }}</span>
          </div>
          <div class="detail-item" style="grid-column: span 2;">
            <span class="label">ĐỊA CHỈ GIAO HÀNG:</span>
            <span class="value">{{ selectedOrder.shippingAddress || 'N/A' }}</span>
          </div>
          <div class="detail-item" style="grid-column: span 2;" *ngIf="selectedOrder.note">
            <span class="label">GHI CHÚ:</span>
            <span class="value" style="font-style: italic; color: #666;">{{ selectedOrder.note }}</span>
          </div>
        </div>

        <h3 style="margin-top: 24px; border-bottom: 2px solid #eee; padding-bottom: 8px;">{{ 'ORDER.ITEMS' | transloco }}</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>{{ 'PRODUCT' }}</th>
              <th>SKU</th>
              <th>{{ 'PRODUCT.QUANTITY' | transloco }}</th>
              <th>{{ 'PRODUCT.PRICE' | transloco }}</th>
              <th>{{ 'ORDER.TOTAL' | transloco }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of selectedOrder.items">
              <td>
                <div class="product-cell">
                  <img [src]="item.productVariant?.imageUrl || item.productVariant?.product?.imageUrl || 'assets/placeholder-product.png'" class="item-thumbnail">
                  <div class="prod-info">
                    <span class="prod-name">{{ item.productVariant?.product?.name || 'N/A' }}</span>
                    <span class="prod-attr" *ngIf="item.productVariant">{{ item.productVariant.color }} / {{ item.productVariant.size }}</span>
                  </div>
                </div>
              </td>
              <td><code>{{ item.productVariant?.sku || 'N/A' }}</code></td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.unitPrice | number }}đ</td>
              <td>{{ (item.unitPrice * item.quantity) | number }}đ</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="order-actions-footer" style="margin-top: 24px;">
        <div *ngIf="showRefundPanel(selectedOrder)" style="width:100%; padding:12px; background:#fffbeb; border:1px solid #fcd34d; border-radius:8px; margin-bottom:12px;">
          <strong>Hoàn tiền (đơn hủy/từ chối + đã thu QR/CK)</strong>
          <p style="margin:8px 0 12px; font-size:13px; color:#78350f;">Khách cần liên hệ shop. Sau khi chuyển khoản hoàn cho khách, bấm &quot;Đã hoàn tiền&quot;. Khách sẽ xác nhận trên trang cá nhân — khi đó đơn không còn tính vào doanh thu báo cáo.</p>
          <button tuiButton size="s" appearance="primary" *ngIf="!selectedOrder?.refundProcessedAt" [disabled]="orderActionBusy" (click)="markRefundProcessed()">Đã hoàn tiền cho khách</button>
          <tui-badge *ngIf="selectedOrder?.refundProcessedAt && !selectedOrder?.refundConfirmedByCustomerAt" appearance="warning" size="m">Chờ khách xác nhận đã nhận hoàn tiền</tui-badge>
          <tui-badge *ngIf="selectedOrder?.refundConfirmedByCustomerAt" appearance="success" size="m">Khách đã xác nhận hoàn tiền</tui-badge>
        </div>

        <div *ngIf="selectedOrder?.paymentMethod === 'NET_TERMS' && selectedOrder?.paymentStatus !== 'PAID'" style="width:100%; padding:12px; background:#f0f9ff; border:1px solid #7dd3fc; border-radius:8px; margin-bottom:12px;">
          <strong>Ghi nhận thanh toán công nợ (NET_TERMS)</strong>
          <p style="margin:8px 0 12px; font-size:13px; color:#0c4a6e;">Khác với thu tiền QR trước giao hàng: chỉ ghi nhận khi bạn đã đối chiếu sao kê / chứng từ và xác nhận khách đã thanh toán kỳ công nợ. Khi khách bấm «Báo đã chuyển» trên Hồ sơ, hệ thống gửi tin vào <strong>Tin nhắn</strong> (inbox admin) để bạn biết cần đối soát.</p>
          <p *ngIf="selectedOrder?.paymentStatus === 'AWAITING_CONFIRMATION'" style="margin:0 0 12px; font-size:12px; color:#92400e; background:#fffbeb; padding:8px 10px; border-radius:6px; border:1px solid #fcd34d;">
            <strong>Đang chờ bạn:</strong> Trạng thái thanh toán là AWAITING_CONFIRMATION — khách đã báo đã chuyển. Đối soát xong thì tick và bấm «Ghi nhận thanh toán công nợ».
          </p>
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer; font-size:13px; margin-bottom:12px;">
            <input tuiCheckbox type="checkbox" [(ngModel)]="netTermsPaymentAck" />
            <span>Tôi đã đối chiếu và xác nhận khoản thanh toán công nợ này.</span>
          </label>
          <button tuiButton size="m" appearance="primary" [disabled]="orderActionBusy || !netTermsPaymentAck" (click)="recordNetTermsPaid()">Ghi nhận thanh toán công nợ</button>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
          <button
            tuiButton
            size="m"
            appearance="primary"
            *ngIf="selectedOrder?.paymentMethod !== 'NET_TERMS' && selectedOrder?.paymentStatus !== 'PAID'"
            [disabled]="orderActionBusy"
            (click)="updatePaymentStatus(selectedOrder!.id, 'PAID')"
          >
            Xác nhận đã nhận tiền (CK/QR trước giao)
          </button>
          <button
            tuiButton
            size="m"
            appearance="accent"
            *ngIf="selectedOrder?.status === 'PENDING'"
            [disabled]="orderActionBusy"
            (click)="updateStatus(selectedOrder!.id, 'PROCESSING')"
          >
            Xác nhận đơn
          </button>
          <button tuiButton size="m" appearance="secondary" [disabled]="orderActionBusy" (click)="observer.complete()">{{ 'COMMON.CLOSE' | transloco }}</button>
        </div>
      </div>
    </ng-template>

    <style>
      .view-detail { padding: 4px; }
      .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #fcfcfc; padding: 16px; border-radius: 8px; border: 1px solid #eee; }
      .detail-item { display: flex; flex-direction: column; gap: 4px; }
      .detail-item .label { font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; }
      .detail-item .value { font-size: 14px; color: #333; }
      .items-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      .items-table th { text-align: left; padding: 12px; background: #f5f5f5; color: #555; font-size: 13px; }
      .items-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
      
      .product-cell { display: flex; align-items: center; gap: 12px; }
      .item-thumbnail { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }
      .prod-info { display: flex; flex-direction: column; gap: 2px; }
      .prod-name { font-weight: 600; color: #111; font-size: 13px; }
      .prod-attr { font-size: 11px; color: #777; }
      code { background: #f0f0f0; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 12px; }
    </style>
  `,
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersComponent implements OnInit, OnDestroy {
  @ViewChild('viewDialog') viewDialogTemplate!: TemplateRef<any>;
  /** Tránh gọi song song xác nhận đơn / xác nhận tiền (hai request chồng nhau). */
  orderActionBusy = false;
  /** Tick xác nhận đối soát trước khi ghi nhận thanh toán công nợ. */
  netTermsPaymentAck = false;
  selectedOrder: Order | null = null;
  rowData: Order[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { resizable: true, minWidth: 100 };
  localeText: any = AG_GRID_LOCALE_VI;
  private langSub?: Subscription;
  private querySub?: Subscription;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService,
    private languageService: LanguageService,
    private dialogs: TuiDialogService,
    private alerts: TuiAlertService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.updateColumnDefs();
    this.loadData();
    this.querySub = this.route.queryParamMap
      .pipe(
        map((qm) => qm.get('orderId')),
        distinctUntilChanged(),
      )
      .subscribe((orderIdStr) => {
        if (!orderIdStr) return;
        const id = Number.parseInt(orderIdStr, 10);
        if (!Number.isFinite(id) || id < 1) return;
        this.openOrderFromQueryParam(id);
      });
    this.langSub = this.transloco.selectTranslation().subscribe(() => {
      this.localeText = this.languageService.currentLanguage === 'vi' ? AG_GRID_LOCALE_VI : {};
      if (this.gridApi) {
        this.gridApi.refreshHeader();
        this.gridApi.refreshCells();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.querySub?.unsubscribe();
  }

  loadData(): void {
    this.api.getOrders().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      {
        field: 'id',
        headerValueGetter: () => this.transloco.translate('ORDER.ID'),
        width: 100,
        pinned: 'left'
      },
      { field: 'createdAt', headerValueGetter: () => this.transloco.translate('ORDER.DATE'), width: 170, valueFormatter: params => new Date(params.value).toLocaleString() },
      {
        field: 'user.fullName',
        headerValueGetter: () => this.transloco.translate('ORDER.USER'),
        width: 250,
        pinned: 'left',
        tooltipValueGetter: (params: any) => params.value
      },
      {
        field: 'status',
        headerValueGetter: () => this.transloco.translate('ORDER.STATUS'),
        width: 130,
        cellRenderer: (params: any) => {
          const v = params.value;
          const label = this.orderStatusLabel(v);
          return `<span class="${adminOrderStatusPillClass(v)}">${escapeHtml(label)}</span>`;
        }
      },
      {
        field: 'paymentStatus',
        headerValueGetter: () => this.transloco.translate('ORDER.PAYMENT_STATUS'),
        width: 170,
        cellRenderer: (params: any) => {
          const v = params.value;
          const label = this.paymentStatusLabel(v);
          return `<span class="${adminPaymentStatusPillClass(v)}">${escapeHtml(label)}</span>`;
        }
      },
      {
        field: 'totalAmount',
        headerValueGetter: () => this.transloco.translate('ORDER.TOTAL'),
        width: 140,
        valueFormatter: params => params.value.toLocaleString() + 'đ'
      },
      {
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 250,
        minWidth: 250,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: Order) => this.onView(data),
          onReject: (data: Order) => this.onReject(data)
        }
      }
    ];
  }

  onView(order: Order): void {
    this.api.getOrderById(order.id).subscribe(fullOrder => {
      this.selectedOrder = fullOrder;
      this.netTermsPaymentAck = false;
      this.dialogs.open(this.viewDialogTemplate, { size: 'l', label: this.transloco.translate('ORDER.TITLE') })
        .subscribe();
      this.cdr.detectChanges();
    });
  }

  /** Mở chi tiết đơn khi có `?orderId=` (ví dụ từ Báo cáo nâng cao). */
  private openOrderFromQueryParam(orderId: number): void {
    this.api.getOrderById(orderId).subscribe({
      next: (fullOrder) => {
        this.selectedOrder = fullOrder;
        this.netTermsPaymentAck = false;
        this.dialogs.open(this.viewDialogTemplate, { size: 'l', label: this.transloco.translate('ORDER.TITLE') }).subscribe();
        this.cdr.detectChanges();
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { orderId: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      },
      error: () => {
        this.alerts.open(`Không tải được đơn #${orderId}.`, { appearance: 'error' }).subscribe();
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { orderId: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        this.cdr.detectChanges();
      },
    });
  }

  showRefundPanel(o: Order | null): boolean {
    if (!o) return false;
    const st = (o.status || '').toUpperCase();
    const ps = (o.paymentStatus || '').toUpperCase();
    const m = (o.paymentMethod || '').toUpperCase();
    return (st === 'CANCELLED' || st === 'REJECTED') && ps === 'PAID' && m === 'VNPAY';
  }

  markRefundProcessed(): void {
    if (!this.selectedOrder) return;
    const id = this.selectedOrder.id;
    this.orderActionBusy = true;
    this.cdr.markForCheck();
    this.api.markRefundProcessed(id).subscribe({
      next: (updated) => {
        this.orderActionBusy = false;
        this.alerts.open('Đã ghi nhận hoàn tiền. Khách có thể xác nhận trên trang cá nhân.', { appearance: 'success' }).subscribe();
        this.loadData();
        if (this.selectedOrder?.id === id) this.patchSelectedOrderFromResponse(updated);
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.orderActionBusy = false;
        const msg = e?.error?.message || e?.message || 'Thao tác không hợp lệ.';
        this.alerts.open(String(msg), { appearance: 'error' }).subscribe();
        this.cdr.markForCheck();
      },
    });
  }

  recordNetTermsPaid(): void {
    if (!this.selectedOrder || !this.netTermsPaymentAck) return;
    this.updatePaymentStatus(this.selectedOrder.id, 'PAID');
    this.netTermsPaymentAck = false;
  }

  onReject(order: Order): void {
    if (confirm('Bạn có chắc chắn muốn từ chối đơn hàng này không?')) {
      this.api.updateOrderStatus(order.id, 'REJECTED').subscribe(() => {
        this.alerts.open('Đơn hàng đã bị từ chối.', { appearance: 'success' }).subscribe();
        this.loadData();
      });
    }
  }

  updateStatus(id: number, status: string): void {
    this.orderActionBusy = true;
    this.cdr.markForCheck();
    this.api.updateOrderStatus(id, status).subscribe({
      next: (updated) => {
        this.orderActionBusy = false;
        this.alerts.open(this.transloco.translate('GLOBAL.UPDATE_SUCCESS'), { appearance: 'success' }).subscribe();
        this.loadData();
        if (this.selectedOrder?.id === id) {
          this.patchSelectedOrderFromResponse(updated);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.orderActionBusy = false;
        this.alerts.open('Cập nhật thất bại. Vui lòng thử lại.', { appearance: 'error' }).subscribe();
        this.cdr.markForCheck();
      },
    });
  }

  orderStatusPillClass(status: string | undefined): string {
    return adminOrderStatusPillClass(status);
  }

  paymentStatusPillClass(status: string | undefined): string {
    return adminPaymentStatusPillClass(status);
  }

  orderStatusLabel(code: string | null | undefined): string {
    const c = (code || '').toUpperCase();
    if (!c) return '';
    const key = `ORDER_STATUS.${c}`;
    const t = this.transloco.translate(key);
    return t !== key ? t : String(code);
  }

  paymentStatusLabel(code: string | null | undefined): string {
    const c = (code || '').toUpperCase();
    if (!c) return '';
    const key = `PAYMENT_STATUS.${c}`;
    const t = this.transloco.translate(key);
    return t !== key ? t : String(code);
  }

  updatePaymentStatus(id: number, status: string): void {
    this.orderActionBusy = true;
    this.cdr.markForCheck();
    this.api.updatePaymentStatus(id, status).subscribe({
      next: (updated) => {
        this.orderActionBusy = false;
        this.alerts.open(this.transloco.translate('GLOBAL.UPDATE_SUCCESS'), { appearance: 'success' }).subscribe();
        this.loadData();
        if (this.selectedOrder?.id === id) {
          this.patchSelectedOrderFromResponse(updated);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.orderActionBusy = false;
        this.alerts.open('Cập nhật thất bại. Vui lòng thử lại.', { appearance: 'error' }).subscribe();
        this.cdr.markForCheck();
      },
    });
  }

  private patchSelectedOrderFromResponse(updated: Order): void {
    if (!this.selectedOrder) return;
    this.selectedOrder.status = updated.status;
    this.selectedOrder.paymentStatus = updated.paymentStatus;
    // Luôn đồng bộ tiền từ server (tránh `undefined == null` khiến paidAmount không cập nhật sau PAID).
    this.selectedOrder.totalAmount = updated.totalAmount ?? this.selectedOrder.totalAmount;
    this.selectedOrder.paidAmount = updated.paidAmount ?? 0;
    this.selectedOrder.debtAmount = updated.debtAmount ?? 0;
    this.selectedOrder.refundProcessedAt = updated.refundProcessedAt;
    this.selectedOrder.refundConfirmedByCustomerAt = updated.refundConfirmedByCustomerAt;
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  onQuickFilterChange(event: any): void {
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', event.target.value);
    }
  }
}

