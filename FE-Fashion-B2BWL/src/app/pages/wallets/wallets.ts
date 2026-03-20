import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton } from '@taiga-ui/core';
import { ApiService, Wallet, WalletTransaction } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, TranslocoModule, TuiIcon, TuiButton],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <h1 class="tui-text_h3">{{ 'SIDEBAR.WALLETS' | transloco }}</h1>
      </div>
      
      <div class="wallet-stats">
        <div class="stat-card">
          <span class="label">Total System Balance</span>
          <span class="value">{{ totalBalance() | number }}đ</span>
        </div>
      </div>

      <div class="main-content">
        <div class="content-table">
          <table class="tui-table">
            <thead>
              <tr class="tui-table__tr">
                <th class="tui-table__th">User ID</th>
                <th class="tui-table__th">Balance</th>
                <th class="tui-table__th">Currency</th>
                <th class="tui-table__th">Last Activity</th>
                <th class="tui-table__th">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let wallet of wallets()" class="tui-table__tr" [class.selected]="selectedWallet()?.id === wallet.id">
                <td class="tui-table__td">#{{ wallet.userId }}</td>
                <td class="tui-table__td"><strong>{{ wallet.balance | number }}</strong></td>
                <td class="tui-table__td">{{ wallet.currency }}</td>
                <td class="tui-table__td">{{ wallet.updatedAt | date:'medium' }}</td>
                <td class="tui-table__td">
                  <button tuiButton type="button" size="s" appearance="flat" (click)="viewTransactions(wallet)">Transactions</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="transactions-panel" *ngIf="selectedWallet()">
           <div class="panel-header">
              <h3>Transactions: User #{{ selectedWallet()?.userId }}</h3>
              <button tuiButton type="button" size="xs" appearance="flat" (click)="selectedWallet.set(null)">Close</button>
           </div>
           <div class="tx-list">
              <div *ngFor="let tx of transactions()" class="tx-item">
                 <div class="tx-info">
                    <span class="type" [class.plus]="tx.type === 'TOP_UP' || tx.type === 'REFUND'">{{ tx.type }}</span>
                    <span class="desc">{{ tx.description }}</span>
                 </div>
                 <div class="tx-amount" [class.plus]="tx.type === 'TOP_UP' || tx.type === 'REFUND'">
                    {{ tx.type === 'PAYMENT' || tx.type === 'WITHDRAW' ? '-' : '+' }}{{ tx.amount | number }}đ
                 </div>
              </div>
              <div *ngIf="transactions().length === 0" class="empty">No transactions found.</div>
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; }
    .page-header { margin-bottom: 24px; }
    .wallet-stats { display: flex; gap: 24px; margin-bottom: 32px; }
    .stat-card { padding: 24px; background: #3f51b5; color: #fff; border-radius: 16px; flex: 1; }
    .stat-card .label { display: block; font-size: 14px; opacity: 0.8; margin-bottom: 8px; }
    .stat-card .value { font-size: 32px; font-weight: bold; }
    .main-content { display: flex; gap: 24px; align-items: flex-start; }
    .content-table { background: #fff; border-radius: 12px; border: 1px solid #eee; overflow: hidden; flex: 1; }
    table { width: 100%; border-collapse: collapse; }
    tr.selected { background: #f0f4ff; }
    .transactions-panel { width: 400px; background: #fff; border-radius: 12px; border: 1px solid #eee; padding: 20px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 12px; }
    .tx-list { display: flex; flex-direction: column; gap: 12px; max-height: 500px; overflow-y: auto; }
    .tx-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9f9f9; border-radius: 8px; }
    .type { font-weight: bold; font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #eee; text-transform: uppercase; }
    .type.plus { background: #e8f5e9; color: #2e7d32; }
    .tx-amount { font-weight: bold; }
    .tx-amount.plus { color: #2e7d32; }
    .tx-info { display: flex; flex-direction: column; gap: 4px; }
    .desc { font-size: 13px; color: #666; }
    .empty { padding: 40px; text-align: center; color: #999; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletsComponent {
  private readonly api = inject(ApiService);
  readonly wallets = signal<Wallet[]>([]);
  readonly totalBalance = signal(0);
  readonly selectedWallet = signal<Wallet | null>(null);
  readonly transactions = signal<WalletTransaction[]>([]);

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await firstValueFrom(this.api.getWallets());
    this.wallets.set(data);
    const total = data.reduce((acc, w) => acc + w.balance, 0);
    this.totalBalance.set(total);
  }

  async viewTransactions(wallet: Wallet) {
    this.selectedWallet.set(wallet);
    const data = await firstValueFrom(this.api.getWalletTransactions(wallet.id));
    this.transactions.set(data);
  }
}
