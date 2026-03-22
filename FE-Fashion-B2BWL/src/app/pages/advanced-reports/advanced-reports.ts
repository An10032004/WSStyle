import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton } from '@taiga-ui/core';
import { ApiService, SalesReport } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, TranslocoModule, TuiIcon, TuiButton],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <h1 class="tui-text_h3">{{ 'SIDEBAR.ADVANCED_REPORTS' | transloco }}</h1>
        <div class="filters">
           <button tuiButton type="button" size="s" appearance="secondary" (click)="setRange('7days')">Last 7 Days</button>
           <button tuiButton type="button" size="s" appearance="secondary" (click)="setRange('30days')">Last 30 Days</button>
           <button tuiButton type="button" size="s" appearance="primary" (click)="refresh()">Refresh</button>
        </div>
      </div>

      <div class="report-summary" *ngIf="report() as r">
        <div class="summary-card">
          <div class="icon-box"><tui-icon icon="@tui.dollar-sign"></tui-icon></div>
          <div class="data">
             <span class="label">Total Revenue</span>
             <span class="value">{{ r.totalRevenue | number }}đ</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="icon-box"><tui-icon icon="@tui.shopping-cart"></tui-icon></div>
          <div class="data">
             <span class="label">Total Orders</span>
             <span class="value">{{ r.totalOrders }}</span>
          </div>
        </div>
      </div>

      <div class="details-section">
        <div class="table-container">
           <h2 class="tui-text_h6">Best Selling Products</h2>
           <table class="tui-table">
             <thead>
               <tr class="tui-table__tr">
                 <th class="tui-table__th">Product Name</th>
                 <th class="tui-table__th">Quantity</th>
                 <th class="tui-table__th">Revenue</th>
               </tr>
             </thead>
             <tbody>
               <tr *ngFor="let item of report()?.bestSellers" class="tui-table__tr">
                 <td class="tui-table__td">{{ item.name }}</td>
                 <td class="tui-table__td">{{ item.quantity }}</td>
                 <td class="tui-table__td">{{ item.revenue | number }}đ</td>
               </tr>
             </tbody>
           </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .filters { display: flex; gap: 12px; }
    .report-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 40px; }
    .summary-card { background: #fff; padding: 24px; border-radius: 16px; border: 1px solid #eee; display: flex; gap: 20px; align-items: center; }
    .icon-box { background: #f0f4ff; color: #3f51b5; padding: 12px; border-radius: 12px; }
    .data .label { display: block; font-size: 14px; color: #777; margin-bottom: 4px; }
    .data .value { font-size: 24px; font-weight: bold; }
    .details-section { background: #fff; border-radius: 16px; border: 1px solid #eee; padding: 24px; }
    .table-container h2 { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedReportsComponent {
  private readonly api = inject(ApiService);
  readonly report = signal<SalesReport | null>(null);
  
  startDate = '';
  endDate = '';

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await firstValueFrom(this.api.getSalesReport(this.startDate, this.endDate));
    this.report.set(data);
  }

  setRange(type: '7days' | '30days') {
    const end = new Date();
    const start = new Date();
    if (type === '7days') start.setDate(end.getDate() - 7);
    if (type === '30days') start.setDate(end.getDate() - 30);
    
    this.startDate = start.toISOString().split('T')[0];
    this.endDate = end.toISOString().split('T')[0];
    this.refresh();
  }
}
