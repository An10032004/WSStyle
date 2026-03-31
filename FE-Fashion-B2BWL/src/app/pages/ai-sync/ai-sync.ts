import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Product, AIProductSync } from '../../services/api.service';
import { TuiButton, TuiAlertService, TuiLoader } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TranslocoModule } from '@jsverse/transloco';
import { AgGridAngular } from 'ag-grid-angular';
import { 
  AllCommunityModule, 
  ModuleRegistry, 
  ColDef, 
  GridApi, 
  GridReadyEvent 
} from 'ag-grid-community';
import { forkJoin } from 'rxjs';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-ai-sync',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiBadge,
    TuiLoader,
    TranslocoModule,
    AgGridAngular
  ],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="header-section" style="padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <h2 class="title">🦾 Trợ lý AI & Đồng bộ Dữ liệu</h2>
        <div style="display: flex; gap: 12px;">
           <button tuiButton size="m" appearance="primary" (click)="generateAllDescriptions()">
             ⚡ Viết mô tả hàng loạt
           </button>
           <button tuiButton size="m" appearance="secondary" (click)="loadData()">
             {{ 'COMMON.REFRESH' | transloco }}
           </button>
        </div>
      </div>

      <div class="grid-wrapper">
        <tui-loader [overlay]="true" [showLoader]="loading">
          <ag-grid-angular
            style="width: 100%; height: 600px;"
            class="ag-theme-alpine"
            [rowData]="combinedData"
            [columnDefs]="columnDefs"
            [pagination]="true"
            [paginationPageSize]="20"
            (gridReady)="onGridReady($event)"
          ></ag-grid-angular>
        </tui-loader>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 0; }
    .grid-wrapper { padding: 0 16px; }
    .ag-theme-alpine {
      --ag-header-background-color: #f8fafc;
      --ag-border-color: #e2e8f0;
    }
  `],
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiSyncComponent implements OnInit {
  loading = false;
  combinedData: any[] = [];
  gridApi!: GridApi;
  
  columnDefs: ColDef[] = [
    { field: 'productId', headerName: 'ID', width: 80, pinned: 'left' },
    { 
      field: 'productName', 
      headerName: 'Tên sản phẩm', 
      width: 250, 
      pinned: 'left',
      tooltipValueGetter: (params: any) => params.value
    },
    { 
      field: 'content', 
      headerName: 'Mô tả AI', 
      width: 400,
      wrapText: true,
      autoHeight: true,
      cellStyle: { 'line-height': '1.5', 'padding': '8px' },
      valueFormatter: params => params.value || '(Chưa có mô tả)'
    },
    { 
      field: 'status', 
      headerName: 'Trạng thái', 
      width: 150,
      cellRenderer: (params: any) => {
        const hasContent = !!params.data.content;
        const appearance = hasContent ? 'success' : 'neutral';
        const text = hasContent ? 'Đã viết mô tả' : 'Đang chờ';
        return `<span class="tui-badge tui-badge_${appearance}">${text}</span>`;
      }
    },
    { field: 'lastSyncedAt', headerName: 'Cập nhật cuối', width: 180, valueFormatter: params => params.value ? new Date(params.value).toLocaleString() : '-' },
    {
      headerName: 'Thao tác',
      width: 180,
      pinned: 'right',
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '8px';

        const btn = document.createElement('button');
        btn.innerText = 'Đồng bộ RAG';
        btn.className = 'tui-button tui-button_size_s tui-button_appearance_secondary';
        btn.style.padding = '4px 8px';
        btn.style.fontSize = '11px';
        btn.onclick = () => this.syncProduct(params.data.productId);
        
        container.appendChild(btn);
        return container;
      }
    }
  ];

  constructor(
    private api: ApiService, 
    private cdr: ChangeDetectorRef,
    private alerts: TuiAlertService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      products: this.api.getProducts(),
      syncStatus: this.api.getAiSyncStatus()
    }).subscribe({
      next: (res) => {
        this.combinedData = res.products.map(p => {
          const sync = res.syncStatus.find(s => s.product.id === p.id);
          return {
            productId: p.id,
            productName: p.name,
            content: sync?.content,
            vectorId: sync?.vectorId,
            lastSyncedAt: sync?.lastSyncedAt,
          };
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  syncProduct(productId: number) {
    this.loading = true;
    this.cdr.detectChanges();
    
    this.api.syncProductAi(productId).subscribe({
      next: (res) => {
        this.alerts.open('Đồng bộ RAG thành công!', { appearance: 'success' }).subscribe();
        this.loadData();
      },
      error: (err) => {
        this.loading = false;
        this.alerts.open('Lỗi đồng bộ: ' + err.message, { appearance: 'error' }).subscribe();
        this.cdr.detectChanges();
      }
    });
  }

  generateAllDescriptions() {
    this.loading = true;
    this.cdr.detectChanges();
    
    this.api.generateAiDescriptions().subscribe({
      next: (msg) => {
        this.alerts.open(msg, { appearance: 'success', label: 'Tiến trình AI' }).subscribe();
        // Giả lập load lại sau 2s để thấy kết quả (vì AI chạy async ngầm trong thực tế, nhưng ở code java mình đang block)
        setTimeout(() => this.loadData(), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.alerts.open('Lỗi kích hoạt AI: ' + err.message, { appearance: 'error' }).subscribe();
        this.cdr.detectChanges();
      }
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }
}
