import {
  Component,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-quantity-break-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton, TuiIcon],
  template: `
    <div class="qb-card">
      <div class="qb-header">
        <div class="header-main">
           <tui-icon icon="@tui.tags" class="tag-icon"></tui-icon>
           <span>BẢNG GIÁ ƯU ĐÃI MUA SỈ</span>
        </div>
        <div class="header-badge">Sỉ từ {{ breaks[0]?.min }} sản phẩm</div>
      </div>
      
      <div class="qb-body">
        <table class="qb-modern-table">
          <thead>
            <tr>
              <th>Số lượng mua</th>
              <th>Đơn giá sỉ</th>
              <th>Mức chiết khấu</th>
              <th class="action-col" *ngIf="!hideAddToCart">Thêm vào giỏ</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of breaks; let i = index" [class.highlight]="!hidePrice && i === activeTierIndex">
              <td class="qty-cell">
                <div class="qty-range">{{ b.min }}{{ b.max ? ' - ' + b.max : '+' }} sản phẩm</div>
              </td>
              <td class="price-cell">
                <ng-container *ngIf="!hidePrice; else hiddenUnit">
                  <span class="price-val">{{ (basePrice * (1 - b.discount/100)).toLocaleString() }}₫</span>
                  <span class="price-unit">/sp</span>
                </ng-container>
                <ng-template #hiddenUnit>
                  <span class="replacement-text">{{ replacementText || 'Liên hệ để có giá' }}</span>
                </ng-template>
              </td>
              <td class="discount-cell">
                <div class="discount-badge" *ngIf="!hidePrice">Giảm {{ b.discount }}%</div>
                <span class="dash-muted" *ngIf="hidePrice">—</span>
              </td>
              <td class="action-col" *ngIf="!hideAddToCart">
                <div class="inline-buy">
                  <div class="qty-control">
                    <input type="number" 
                           [(ngModel)]="tierBuyQtys[i]" 
                           (change)="validateQty(i)"
                           [disabled]="buyDisabled()"
                           class="row-input">
                  </div>
                  <button class="cart-btn" type="button" [disabled]="buyDisabled()" (click)="handleBuy(i)">
                    <tui-icon icon="@tui.shopping-cart" class="cart-icon"></tui-icon>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="qb-footer" *ngIf="!hidePrice && activeTierIndex !== -1">
         <div class="active-notif">
            <tui-icon icon="@tui.sparkles" class="sp-icon"></tui-icon>
            Bạn đang mua <strong>{{ currentQty }} mặt hàng</strong>, được hưởng mức giảm <strong>{{ breaks[activeTierIndex].discount }}%</strong>
         </div>
      </div>
      <div class="qb-footer qb-footer-muted" *ngIf="hidePrice && activeTierIndex !== -1">
         <div class="active-notif">
            <tui-icon icon="@tui.info" class="sp-icon"></tui-icon>
            Bạn đang mua <strong>{{ currentQty }} mặt hàng</strong>. {{ replacementText || 'Liên hệ để biết đơn giá theo bậc số lượng.' }}
         </div>
      </div>
    </div>
  `,
  styles: [`
    .qb-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
      margin: 24px 0;
      overflow: hidden;
      font-family: 'Outfit', 'Inter', sans-serif;
    }
    .qb-header {
      background: #f8fafc;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
    }
    .header-main {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 15px;
      color: #0f172a;
    }
    .tag-icon { color: #58ba8f; font-size: 20px; }
    .header-badge {
      background: #f0fdf4;
      color: #166534;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid #dcfce7;
    }
    .qb-body { overflow-x: auto; }
    .qb-modern-table { width: 100%; border-collapse: collapse; min-width: 500px; }
    .qb-modern-table th {
      padding: 16px 20px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      font-weight: 600;
      background: #fafafa;
    }
    .qb-modern-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .qb-modern-table tr:last-child td { border-bottom: none; }
    
    .qb-modern-table tr.highlight { background: #f0fdf4; }
    .highlight .qty-range { color: #15803d; font-weight: 800; }
    .highlight .price-val { color: #166534; }

    .qty-range { font-size: 14px; color: #334155; font-weight: 600; }
    .price-val { font-size: 18px; font-weight: 800; color: #0f172a; }
    .price-unit { font-size: 12px; color: #94a3b8; margin-left: 2px; }
    
    .discount-badge {
      display: inline-flex;
      padding: 6px 12px;
      background: #fef2f2;
      color: #b91c1c;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      border: 1px solid #fee2e2;
    }

    .action-col { text-align: center; width: 180px; }
    .inline-buy { display: flex; align-items: center; justify-content: center; gap: 12px; }
    
    .qty-control { position: relative; }
    .row-input {
      width: 80px;
      height: 40px;
      padding: 0 10px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      text-align: center;
      outline: none;
      transition: all 0.2s;
      background: #fff;
    }
    .row-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

    .cart-btn {
      width: 44px;
      height: 44px;
      background: #58ba8f;
      color: #fff;
      border: none;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(88, 186, 143, 0.2);
    }
    .cart-btn:hover { background: #4ca67e; transform: translateY(-2px); box-shadow: 0 6px 12px -2px rgba(88, 186, 143, 0.3); }
    .cart-btn:active { transform: translateY(0); }
    .cart-icon { font-size: 20px; }

    .qb-footer { padding: 16px 20px; background: #f0fdf4; border-top: 1px solid #dcfce7; }
    .qb-footer-muted { background: #f8fafc; border-top-color: #e2e8f0; }
    .qb-footer-muted .active-notif { color: #475569; }
    .qb-footer-muted .sp-icon { color: #64748b; }
    .active-notif { display: flex; align-items: center; gap: 8px; color: #166534; font-size: 14px; font-weight: 600; }
    .sp-icon { color: #16a34a; font-size: 18px; }
    .replacement-text { font-size: 14px; color: #64748b; font-weight: 600; line-height: 1.35; }
    .dash-muted { color: #94a3b8; font-weight: 700; }
  `]
})
export class QuantityBreakTableComponent implements OnChanges {
  @Input() breaks: any[] = [];
  @Input() basePrice: number = 0;
  @Input() currentQty: number = 0;
  /** Đồng bộ quy tắc ẩn giá (ProductResponseDTO / RuleCoreService). */
  @Input() hidePrice = false;
  @Input() replacementText?: string;
  /** Khi bật, ẩn cột thêm giỏ trên bảng bậc số lượng (đồng bộ hideAddToCart sản phẩm). */
  @Input() hideAddToCart = false;
  /** Chặn thêm từ bảng bậc (MOQ, hết hàng, biến thể ngừng bán, …). */
  readonly buyDisabled = input(false);

  @Output() onBuy = new EventEmitter<number>();

  activeTierIndex: number = -1;
  tierBuyQtys: number[] = [];

  ngOnChanges() {
    this.activeTierIndex = this.breaks.findIndex(b => {
      const min = b.min || 1;
      const max = b.max || 999999999;
      return this.currentQty >= min && this.currentQty <= max;
    });

    if (this.tierBuyQtys.length !== this.breaks.length) {
      this.tierBuyQtys = this.breaks.map(b => b.min || 1);
    }
  }

  validateQty(index: number) {
    const b = this.breaks[index];
    const min = b.min || 1;
    const max = b.max || 999999999;
    
    if (this.tierBuyQtys[index] < min) this.tierBuyQtys[index] = min;
    if (this.tierBuyQtys[index] > max) this.tierBuyQtys[index] = max;
  }

  handleBuy(index: number) {
    if (this.buyDisabled()) return;
    this.validateQty(index);
    const qty = this.tierBuyQtys[index];
    this.onBuy.emit(qty);
  }
}
