import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { TuiBadge } from '@taiga-ui/kit';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, AgGridAngular, TranslocoModule, ActionRendererComponent, TuiButton, TuiBadge],
  template: `
    <div class="page-container">
      <div class="header-section" style="padding: 16px">
        <h2 class="title">{{ 'ORDER.TITLE' | transloco }}</h2>
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
            <tui-badge size="s" [appearance]="getStatusAppearance(selectedOrder.status)">
              {{ selectedOrder.status }}
            </tui-badge>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.PAYMENT_METHOD' | transloco }}:</span>
            <span class="value">{{ selectedOrder.paymentMethod }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.PAYMENT_STATUS' | transloco }}:</span>
            <tui-badge size="s" [appearance]="selectedOrder.paymentStatus === 'PAID' ? 'success' : 'danger'">
              {{ selectedOrder.paymentStatus }}
            </tui-badge>
          </div>
          <div class="detail-item">
            <span class="label">{{ 'ORDER.TOTAL' | transloco }}:</span>
            <span class="value" style="font-weight: bold; color: #d32f2f;">{{ selectedOrder.totalAmount | number }}đ</span>
          </div>
        </div>

        <h3 style="margin-top: 24px; border-bottom: 2px solid #eee; padding-bottom: 8px;">{{ 'ORDER.ITEMS' | transloco }}</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>{{ 'PRODUCT.QUANTITY' | transloco }}</th>
              <th>{{ 'PRODUCT.PRICE' | transloco }}</th>
              <th>{{ 'ORDER.TOTAL' | transloco }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of selectedOrder.items">
              <td>{{ item.productVariant?.sku || 'N/A' }}</td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.unitPrice | number }}đ</td>
              <td>{{ (item.unitPrice * item.quantity) | number }}đ</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 24px; gap: 8px;">
        <button tuiButton size="m" appearance="accent" *ngIf="selectedOrder?.status === 'PENDING'" (click)="updateStatus(selectedOrder!.id, 'PROCESSING')">
          Xác nhận đơn
        </button>
        <button tuiButton size="m" appearance="secondary" (click)="observer.complete()">{{ 'COMMON.CLOSE' | transloco }}</button>
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
    </style>
  `,
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersComponent implements OnInit, OnDestroy {
  @ViewChild('viewDialog') viewDialogTemplate!: TemplateRef<any>;
  selectedOrder: Order | null = null;
  rowData: Order[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  private langSub?: Subscription;

  constructor(
    private api: ApiService, 
    private cdr: ChangeDetectorRef, 
    private transloco: TranslocoService, 
    private languageService: LanguageService,
    private dialogs: TuiDialogService,
    private alerts: TuiAlertService
  ) {}

  ngOnInit(): void {
    this.updateColumnDefs();
    this.loadData();
    this.langSub = this.transloco.selectTranslation().subscribe(() => {
      this.localeText = this.languageService.currentLanguage === 'vi' ? AG_GRID_LOCALE_VI : {};
      if (this.gridApi) {
        this.gridApi.refreshHeader();
        this.gridApi.refreshCells();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void { this.langSub?.unsubscribe(); }

  loadData(): void {
    this.api.getOrders().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { field: 'id', headerValueGetter: () => this.transloco.translate('ORDER.ID'), width: 100 },
      { field: 'createdAt', headerValueGetter: () => this.transloco.translate('ORDER.DATE'), width: 150, valueFormatter: params => new Date(params.value).toLocaleString() },
      { field: 'user.fullName', headerValueGetter: () => this.transloco.translate('ORDER.USER'), flex: 1 },
      { 
        field: 'status', 
        headerValueGetter: () => this.transloco.translate('ORDER.STATUS'), 
        width: 130,
        cellRenderer: (params: any) => `<span class="tui-badge tui-badge_${this.getStatusAppearance(params.value)}">${params.value}</span>`
      },
      { 
        field: 'paymentStatus', 
        headerValueGetter: () => this.transloco.translate('ORDER.PAYMENT_STATUS'), 
        width: 140,
        cellRenderer: (params: any) => `<span class="tui-badge tui-badge_${params.value === 'PAID' ? 'success' : 'danger'}">${params.value}</span>`
      },
      { 
        field: 'totalAmount', 
        headerValueGetter: () => this.transloco.translate('ORDER.TOTAL'), 
        width: 140,
        valueFormatter: params => params.value.toLocaleString() + 'đ'
      },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 120,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: Order) => this.onView(data)
        }
      }
    ];
  }

  onView(order: Order): void {
    this.api.getOrderById(order.id).subscribe(fullOrder => {
      this.selectedOrder = fullOrder;
      this.dialogs.open(this.viewDialogTemplate, { size: 'l', label: this.transloco.translate('ORDER.TITLE') })
        .subscribe();
      this.cdr.detectChanges();
    });
  }

  updateStatus(id: number, status: string): void {
    this.api.updateOrderStatus(id, status).subscribe(() => {
      this.alerts.open(this.transloco.translate('GLOBAL.UPDATE_SUCCESS'), { appearance: 'success' }).subscribe();
      this.loadData();
    });
  }

  getStatusAppearance(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PENDING': return 'warning';
      case 'PROCESSING': return 'info';
      case 'CANCELLED': return 'danger';
      default: return 'neutral';
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }
}
