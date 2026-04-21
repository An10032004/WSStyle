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
    <div class="page-container dashboard-body" *transloco="let t">
      <div class="page-header page-header--toolbar">
        <h2 class="tui-text_h3 page-header__title">{{ 'DASHBOARD.TITLE' | transloco }}</h2>
        <div class="page-actions">
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
  styleUrl: './dashboard.scss',
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
