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
        <h2 class="title">Đồng bộ Trợ lý AI (RAG)</h2>
        <div style="display: flex; gap: 12px;">
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
  `],
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiSyncComponent implements OnInit {
  loading = false;
  combinedData: any[] = [];
  gridApi!: GridApi;
  
  columnDefs: ColDef[] = [
    { field: 'productId', headerName: 'ID', width: 100, pinned: 'left' },
    { 
      field: 'productName', 
      headerName: 'Tên sản phẩm', 
      width: 300, 
      pinned: 'left',
      tooltipValueGetter: (params: any) => params.value
    },
    { 
      field: 'status', 
      headerName: 'Trạng thái đồng bộ', 
      width: 180,
      cellRenderer: (params: any) => {
        const isSynced = !!params.data.vectorId;
        const appearance = isSynced ? 'success' : 'neutral';
        const text = isSynced ? 'Đã đồng bộ' : 'Chưa đồng bộ';
        return `<span class="tui-badge tui-badge_${appearance}">${text}</span>`;
      }
    },
    { field: 'vectorId', headerName: 'Vector ID', width: 150, valueFormatter: params => params.value || '-' },
    { field: 'lastSyncedAt', headerName: 'Lần cuối đồng bộ', width: 180, valueFormatter: params => params.value ? new Date(params.value).toLocaleString() : '-' },
    {
      headerName: 'Thao tác',
      width: 150,
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.innerText = 'Đồng bộ ngay';
        btn.className = 'tui-button tui-button_size_s tui-button_appearance_primary';
        btn.style.padding = '4px 12px';
        btn.style.fontSize = '12px';
        btn.onclick = () => this.syncProduct(params.data.productId);
        return btn;
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
        this.alerts.open('Đồng bộ thành công!', { appearance: 'success' }).subscribe();
        this.loadData();
      },
      error: (err) => {
        this.loading = false;
        this.alerts.open('Lỗi đồng bộ: ' + err.message, { appearance: 'error' }).subscribe();
        this.cdr.detectChanges();
      }
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }
}
