import { Component, ChangeDetectionStrategy, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiDialogService, TuiTextfield, TuiLabel } from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { ApiService, Coupon } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiTextfield, TuiLabel],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <h1 class="tui-text_h3">{{ 'SIDEBAR.COUPONS' | transloco }}</h1>
        <button tuiButton type="button" size="m" (click)="showAddDialog()">Add Coupon</button>
      </div>

      <ng-template #addDialog let-observer>
        <div class="dialog-content">
          <h2 class="tui-text_h5" style="margin-bottom: 24px;">Create New Coupon</h2>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <tui-textfield>
              <input tuiTextfield [(ngModel)]="newCoupon.code" placeholder="WELCOME2024" />
              Coupon Code
            </tui-textfield>
            
            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCoupon.discountValue" placeholder="10" />
              Discount Value (%)
            </tui-textfield>
          </div>
          
          <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px;">
            <button tuiButton type="button" size="m" appearance="flat" (click)="observer.complete()">Cancel</button>
            <button tuiButton type="button" size="m" (click)="observer.next(true); observer.complete()">Save Coupon</button>
          </div>
        </div>
      </ng-template>
      
      <div class="content-table">
        <table class="tui-table">
          <thead>
            <tr class="tui-table__tr">
              <th class="tui-table__th">Code</th>
              <th class="tui-table__th">Discount</th>
              <th class="tui-table__th">Min Order</th>
              <th class="tui-table__th">Usage</th>
              <th class="tui-table__th">Status</th>
              <th class="tui-table__th">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of coupons()" class="tui-table__tr">
              <td class="tui-table__td"><strong>{{ item.code }}</strong></td>
              <td class="tui-table__td">{{ item.discountValue }}{{ item.discountType === 'PERCENTAGE' ? '%' : 'đ' }}</td>
              <td class="tui-table__td">{{ item.minOrderAmount | number }}đ</td>
              <td class="tui-table__td">{{ item.usedCount }} / {{ item.usageLimit }}</td>
              <td class="tui-table__td">{{ item.status }}</td>
              <td class="tui-table__td">
                <button 
                  tuiButton 
                  type="button" 
                  size="s" 
                  appearance="flat" 
                  (click)="deleteCoupon(item.id)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .content-table { background: #fff; border-radius: 12px; border: 1px solid #eee; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponsComponent {
  private readonly api = inject(ApiService);
  private readonly dialogs = inject(TuiDialogService);
  
  readonly coupons = signal<Coupon[]>([]);

  @ViewChild('addDialog') addDialogTemplate!: TemplateRef<any>;
  
  newCoupon = {
    code: '',
    discountValue: 0
  };

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await firstValueFrom(this.api.getCoupons());
    this.coupons.set(data);
  }

  showAddDialog() {
    this.newCoupon = { code: '', discountValue: 0 };
    this.dialogs.open<boolean>(this.addDialogTemplate, { size: 's' }).subscribe({
      next: (res) => {
        if (res) this.saveCoupon();
      }
    });
  }

  async saveCoupon() {
    await firstValueFrom(this.api.createCoupon({
      code: this.newCoupon.code,
      discountType: 'PERCENTAGE',
      discountValue: this.newCoupon.discountValue,
      usageLimit: 100,
      usedCount: 0,
      status: 'ACTIVE'
    }));
    this.refresh();
  }

  async deleteCoupon(id: number) {
    this.dialogs.open<boolean>(TUI_CONFIRM, {
      label: 'Delete Coupon',
      size: 's',
      data: {
        content: 'Are you sure you want to delete this coupon? This action cannot be undone.',
        yes: 'Delete',
        no: 'Cancel'
      }
    }).subscribe(async (res) => {
      if (res) {
        await firstValueFrom(this.api.deleteCoupon(id));
        this.refresh();
      }
    });
  }
}
