import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Wallet, WalletTransaction, User } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, TranslocoModule, TuiButton, TuiTextfield, FormsModule],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header page-header--toolbar">
        <h1 class="tui-text_h3 page-header__title">{{ 'SIDEBAR.WALLETS' | transloco }}</h1>
        <div class="search-box admin-search-field">
          <tui-textfield iconStart="@tui.search">
            <input
              tuiTextfield
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
              placeholder="Tìm theo tên, email hoặc ID khách hàng..."
            />
          </tui-textfield>
        </div>
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
                <th class="tui-table__th">User</th>
                <th class="tui-table__th">Balance</th>
                <th class="tui-table__th">Status</th>
                <th class="tui-table__th">Last Activity</th>
                <th class="tui-table__th">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let wallet of filteredWallets()" class="tui-table__tr" [class.selected]="selectedWallet()?.id === wallet.id">
                <td class="tui-table__td">
                  <div class="user-cell">
                    <strong>{{ wallet.user?.fullName || 'Unknown' }}</strong>
                    <span class="email">{{ wallet.user?.email }}</span>
                  </div>
                </td>
                <td class="tui-table__td"><strong>{{ wallet.balance | number }}</strong> {{ wallet.currency }}</td>
                <td class="tui-table__td">
                  <span class="tui-badge" [class.tui-badge_primary]="wallet.status === 'ACTIVE'">{{ wallet.status }}</span>
                </td>
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
              <h3>Transactions: {{ selectedWallet()?.user?.fullName }}</h3>
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
  styleUrl: './wallets.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletsComponent {
  private readonly api = inject(ApiService);
  readonly wallets = signal<any[]>([]);
  readonly totalBalance = signal(0);
  readonly selectedWallet = signal<any | null>(null);
  readonly transactions = signal<WalletTransaction[]>([]);
  readonly search = signal('');
  
  readonly filteredWallets = computed(() => {
    const s = this.search().toLowerCase();
    return this.wallets().filter(w => 
      !s || 
      w.user?.fullName?.toLowerCase().includes(s) || 
      w.user?.email?.toLowerCase().includes(s) ||
      w.userId.toString().includes(s)
    );
  });
  
  users: User[] = [];

  constructor() {
    this.refresh();
  }

  async refresh() {
    const usersData = await firstValueFrom(this.api.getUsers());
    this.users = usersData;

    const data = await firstValueFrom(this.api.getWallets());
    
    // Map user info into wallet
    const enrichedWallets = data.map(w => ({
      ...w,
      user: this.users.find(u => u.id === w.userId)
    }));

    this.wallets.set(enrichedWallets);
    const total = data.reduce((acc, w) => acc + w.balance, 0);
    this.totalBalance.set(total);
  }

  async viewTransactions(wallet: any) {
    this.selectedWallet.set(wallet);
    const data = await firstValueFrom(this.api.getWalletTransactions(wallet.id));
    this.transactions.set(data);
  }
}
