import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiIcon, TuiLabel } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, SalesReport, Expense, VatReport } from '../../services/api.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon, TuiLabel, TuiBadge, TranslocoModule],
  template: `
    <div class="dashboard-container" *transloco="let t">
      <div class="header-section">
        <h2 class="title">{{ 'DASHBOARD.TITLE' | transloco }}</h2>
        <div class="date-range">
           <tui-badge appearance="info" size="l">Today: {{ today | date:'mediumDate' }}</tui-badge>
        </div>
      </div>

      <!-- KPi CARDS -->
       <div class="stats-grid">
          <div class="stat-card revenue">
            <div class="card-icon"><tui-icon icon="@tui.banknote"></tui-icon></div>
            <div class="card-info">
              <span class="card-label">{{ 'DASHBOARD.REVENUE' | transloco }}</span>
              <h3 class="card-value">{{ (salesData?.totalRevenue || 0) | currency:'VND':'symbol':'1.0-0' }}</h3>
              <div class="trend up"><tui-icon icon="@tui.trending-up"></tui-icon> +12%</div>
            </div>
          </div>

          <div class="stat-card orders">
            <div class="card-icon"><tui-icon icon="@tui.shopping-bag"></tui-icon></div>
            <div class="card-info">
              <span class="card-label">{{ 'DASHBOARD.ORDERS' | transloco }}</span>
              <h3 class="card-value">{{ salesData?.totalOrders || 0 }}</h3>
              <div class="trend up"><tui-icon icon="@tui.trending-up"></tui-icon> +5%</div>
            </div>
          </div>

          <div class="stat-card expenses">
            <div class="card-icon"><tui-icon icon="@tui.wallet"></tui-icon></div>
            <div class="card-info">
              <span class="card-label">{{ 'DASHBOARD.EXPENSES' | transloco }}</span>
              <h3 class="card-value">{{ totalExpenses | currency:'VND':'symbol':'1.0-0' }}</h3>
              <div class="trend down"><tui-icon icon="@tui.trending-down"></tui-icon> -2%</div>
            </div>
          </div>

          <div class="stat-card vat">
            <div class="card-icon"><tui-icon icon="@tui.file-text"></tui-icon></div>
            <div class="card-info">
              <span class="card-label">{{ 'DASHBOARD.VAT_NET' | transloco }}</span>
              <h3 class="card-value">{{ (vatData?.netVat || 0) | currency:'VND':'symbol':'1.0-0' }}</h3>
              <span class="sub-text">Payable: {{ (vatData?.payableVat || 0) | currency:'VND':'symbol':'1.0-0' }}</span>
            </div>
          </div>
       </div>

       <div class="main-content">
          <!-- BEST SELLERS -->
          <div class="content-card best-sellers">
            <h4 class="card-title">{{ 'DASHBOARD.BEST_SELLERS' | transloco }}</h4>
            <div class="list-container">
               <div class="list-item" *ngFor="let item of salesData?.bestSellers">
                  <div class="item-info">
                     <span class="item-name">{{ item.name }}</span>
                     <span class="item-meta">{{ item.quantity }} units sold</span>
                  </div>
                  <span class="item-price">{{ item.revenue | currency:'VND':'symbol':'1.0-0' }}</span>
               </div>
               <div *ngIf="!salesData?.bestSellers?.length" class="empty-state">No sales data yet</div>
            </div>
          </div>

          <!-- RECENT EXPENSES -->
           <div class="content-card expenses-list">
             <h4 class="card-title">{{ 'DASHBOARD.RECENT_EXPENSES' | transloco }}</h4>
             <div class="list-container">
               <div class="list-item" *ngFor="let exp of expenses">
                  <div class="item-info">
                    <span class="item-name">{{ exp.description || exp.category }}</span>
                    <span class="item-meta">{{ exp.date | date:'shortDate' }}</span>
                  </div>
                  <span class="item-price penalty">-{{ exp.amount | currency:'VND':'symbol':'1.0-0' }}</span>
               </div>
               <div *ngIf="!expenses?.length" class="empty-state">No expenses recorded</div>
             </div>
           </div>
       </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 32px; background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
    .header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .title { margin: 0; font-size: 28px; font-weight: 800; color: #1e293b; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 40px; }
    
    .stat-card { background: #fff; padding: 24px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; gap: 20px; align-items: center; border: 1px solid #f1f5f9; transition: transform 0.2s; }
    .stat-card:hover { transform: translateY(-4px); }
    
    .card-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .revenue .card-icon { background: #eff6ff; color: #3b82f6; }
    .orders .card-icon { background: #f0fdf4; color: #10b981; }
    .expenses .card-icon { background: #fff1f2; color: #f43f5e; }
    .vat .card-icon { background: #faf5ff; color: #a855f7; }

    .card-info { flex: 1; display: flex; flex-direction: column; }
    .card-label { font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
    .card-value { margin: 0; font-size: 24px; font-weight: 800; color: #1e293b; }
    .sub-text { font-size: 11px; color: #94a3b8; }

    .trend { font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 4px; margin-top: 6px; }
    .trend.up { color: #10b981; }
    .trend.down { color: #f43f5e; }

    .main-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 32px; }
    .content-card { background: #fff; border-radius: 20px; padding: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .card-title { margin: 0 0 24px 0; font-size: 18px; font-weight: 700; color: #334155; }

    .list-container { display: flex; flex-direction: column; gap: 16px; }
    .list-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 12px; border: 1px solid transparent; transition: all 0.2s; }
    .list-item:hover { border-color: #e2e8f0; background: #fff; shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    
    .item-info { display: flex; flex-direction: column; }
    .item-name { font-weight: 700; color: #1e293b; font-size: 15px; }
    .item-meta { font-size: 12px; color: #64748b; }
    .item-price { font-weight: 700; color: #1e293b; font-size: 15px; }
    .item-price.penalty { color: #f43f5e; }

    .empty-state { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  salesData?: SalesReport;
  expenses: Expense[] = [];
  vatData?: VatReport;
  totalExpenses = 0;
  today = new Date();

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    forkJoin({
      sales: this.api.getSalesReport(),
      expenses: this.api.getExpenses(),
      vat: this.api.getVatReport()
    }).subscribe(({ sales, expenses, vat }) => {
      this.salesData = sales;
      this.expenses = expenses;
      this.vatData = vat;
      this.totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      this.cdr.detectChanges();
    });
  }
}
