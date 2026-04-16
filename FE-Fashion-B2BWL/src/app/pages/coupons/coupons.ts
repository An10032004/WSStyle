import { Component, ChangeDetectionStrategy, inject, signal, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiDialogService, TuiTextfield, TuiLabel, TuiDataList } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiDataListWrapper, TuiMultiSelect } from '@taiga-ui/kit';
import { TuiComboBoxModule, TuiTextfieldControllerModule, TuiSelectModule } from '@taiga-ui/legacy';
import { ApiService, Coupon, Category, Product, CustomerGroup } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { RuleConflictWarningComponent } from '../../shared/components/rule-conflict-warning/rule-conflict-warning';
import { adminLifecycleStatusPillClass } from '../../utils/admin-status-pills';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiTextfield, TuiLabel, TuiSelectModule, TuiDataList, TuiDataListWrapper, TuiMultiSelect, TuiComboBoxModule, TuiTextfieldControllerModule, RuleConflictWarningComponent],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <h1 class="tui-text_h3">{{ 'SIDEBAR.COUPONS' | transloco }}</h1>
        <button tuiButton type="button" size="m" (click)="showAddDialog()">Add Coupon</button>
      </div>

      <ng-template #addDialog let-observer>
        <div class="dialog-content coupon-dialog">
          <h2 class="tui-text_h5 coupon-dialog-title">{{ editingId ? 'Edit Coupon' : 'Create New Coupon' }}</h2>
          <app-rule-conflict-warning [conflicts]="conflicts"></app-rule-conflict-warning>

          <div class="coupon-form-grid">
            <label tuiLabel class="coupon-field">
              Mã coupon
              <tui-textfield>
                <input tuiTextfield [(ngModel)]="newCoupon.code" autocomplete="off" />
              </tui-textfield>
            </label>

            <label tuiLabel class="coupon-field">
              Trạng thái
              <tui-select [(ngModel)]="newCoupon.status">
                <tui-data-list-wrapper *tuiDataList [items]="['ACTIVE', 'INACTIVE']"></tui-data-list-wrapper>
              </tui-select>
            </label>

            <label tuiLabel class="coupon-field">
              Loại giảm
              <tui-select [(ngModel)]="newCoupon.discountType">
                <tui-data-list-wrapper *tuiDataList [items]="['PERCENTAGE', 'FIXED_AMOUNT']"></tui-data-list-wrapper>
              </tui-select>
            </label>

            <label tuiLabel class="coupon-field">
              Giá trị giảm
              <tui-textfield>
                <input tuiTextfield type="number" inputmode="decimal" step="any" [(ngModel)]="newCoupon.discountValue" />
              </tui-textfield>
              <div class="coupon-field-hint">% nếu PERCENTAGE; số tiền ₫ nếu FIXED_AMOUNT</div>
            </label>

            <label tuiLabel class="coupon-field coupon-field-span2">
              Số đơn đã mua tối thiểu
              <tui-textfield>
                <input tuiTextfield type="number" inputmode="numeric" min="0" step="1" [(ngModel)]="newCoupon.minimumPriorOrders" />
              </tui-textfield>
              <div class="coupon-field-hint">
                0 = không kiểm tra. Từ 1 trở lên = khách phải có ít nhất chừng đó đơn hợp lệ (không tính đơn hủy / từ chối) mới thấy và áp dụng được mã.
              </div>
            </label>

            <label tuiLabel class="coupon-field">
              Bắt đầu
              <tui-textfield>
                <input tuiTextfield type="datetime-local" [(ngModel)]="newCoupon.startDate" />
              </tui-textfield>
            </label>

            <label tuiLabel class="coupon-field">
              Kết thúc
              <tui-textfield>
                <input tuiTextfield type="datetime-local" [(ngModel)]="newCoupon.endDate" />
              </tui-textfield>
            </label>
          </div>

          <div class="coupon-dialog-actions">
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
              <th class="tui-table__th">Loại</th>
              <th class="tui-table__th">Discount</th>
              <th class="tui-table__th">Tối thiểu đơn đã mua</th>
              <th class="tui-table__th">Status</th>
              <th class="tui-table__th">Start Date</th>
              <th class="tui-table__th">End Date</th>
              <th class="tui-table__th">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of coupons()" class="tui-table__tr">
              <td class="tui-table__td"><strong>{{ item.code }}</strong></td>
              <td class="tui-table__td">{{ item.discountType }}</td>
              <td class="tui-table__td">{{ item.discountValue | number }}</td>
              <td class="tui-table__td">{{ item.minimumPriorOrders ?? 0 }}</td>
              <td class="tui-table__td">
                <span [class]="couponStatusPillClass(item.status)">{{ 'ENUMS.' + item.status | transloco }}</span>
              </td>
              <td class="tui-table__td">{{ item.startDate | date:'short' }}</td>
              <td class="tui-table__td">{{ item.endDate | date:'short' }}</td>
              <td class="tui-table__td">
                <button 
                  tuiButton 
                  type="button" 
                  size="s" 
                  appearance="flat" 
                  (click)="showEditDialog(item)">
                  Edit
                </button>
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

    .coupon-dialog { padding: 4px 0 0; min-width: 0; }
    .coupon-dialog-title { margin-bottom: 12px; }
    .coupon-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px 24px;
      margin-top: 16px;
      align-items: start;
    }
    .coupon-field { display: block; margin: 0; min-width: 0; }
    .coupon-field-span2 { grid-column: 1 / -1; }
    .coupon-field-hint {
      font-size: 12px;
      line-height: 1.45;
      color: var(--tui-text-secondary);
      margin-top: 8px;
    }
    .coupon-dialog-actions {
      margin-top: 28px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    /* Chữ gõ trong ô phải tương phản với nền (tránh “gõ mà không thấy”) */
    .coupon-dialog input[tuiTextfield],
    .coupon-dialog textarea[tuiTextfield] {
      color: var(--tui-text-primary);
      caret-color: var(--tui-text-primary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponsComponent {
  private readonly api = inject(ApiService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly coupons = signal<Coupon[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly customerGroups = signal<CustomerGroup[]>([]);

  selectedCategoryIds: Category[] = [];
  selectedProductIds: Product[] = [];
  selectedGroupIds: CustomerGroup[] = [];

  @ViewChild('addDialog') addDialogTemplate!: TemplateRef<any>;

  editingId: number | null = null;
  newCoupon: Partial<Coupon> = {
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    status: 'ACTIVE',
    startDate: '',
    endDate: '',
    minimumPriorOrders: 0,
  };

  conflicts: string[] = [];

  constructor() {
    this.refresh();
    this.loadCommonData();
  }

  async loadCommonData() {
    const [cats, prods, groups] = await Promise.all([
      firstValueFrom(this.api.getCategories()),
      firstValueFrom(this.api.getProducts()),
      firstValueFrom(this.api.getCustomerGroups())
    ]);
    this.categories.set(cats);
    this.products.set(prods);
    this.customerGroups.set(groups);
  }

  async refresh() {
    const data = await firstValueFrom(this.api.getCoupons());
    this.coupons.set(data);
    this.cdr.detectChanges();
  }

  showAddDialog() {
    this.editingId = null;
    this.newCoupon = {
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      status: 'ACTIVE',
      startDate: '',
      endDate: '',
      minimumPriorOrders: 0,
    };
    this.conflicts = [];
    this.cdr.markForCheck();

    this.dialogs.open<boolean>(this.addDialogTemplate, { size: 'l' }).subscribe({
      next: (res) => {
        if (res) this.saveCoupon();
      }
    });
  }

  showEditDialog(item: Coupon) {
    this.editingId = item.id;
    this.newCoupon = {
      code: item.code,
      discountType: item.discountType,
      discountValue: this.coerceDiscountNumber(item.discountValue),
      status: item.status,
      startDate: this.toDatetimeLocalValue(item.startDate as unknown),
      endDate: this.toDatetimeLocalValue(item.endDate as unknown),
      minimumPriorOrders: item.minimumPriorOrders ?? 0,
      priority: item.priority,
    };
    this.conflicts = [];
    this.cdr.markForCheck();

    this.dialogs.open<boolean>(this.addDialogTemplate, { size: 'l' }).subscribe({
      next: (res) => {
        if (res) this.saveCoupon();
      }
    });
  }

  checkConflicts() {
    // simplified checking removed
  }

  /**
   * API (Jackson) có thể trả chuỗi ISO có offset / có giây phần nghìn;
   * `<input type="datetime-local">` chỉ chấp nhận dạng `YYYY-MM-DDTHH:mm`.
   */
  private toDatetimeLocalValue(value: unknown): string {
    if (value == null || value === '') return '';
    if (typeof value === 'string') {
      const s = value.trim();
      const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
      if (m) return `${m[1]}T${m[2]}`;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
      }
    }
    return '';
  }

  /** BigDecimal / số có thể là string sau JSON — chuẩn hóa cho `type="number"`. */
  private coerceOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }

  private coerceDiscountNumber(value: unknown): number {
    const n = this.coerceOptionalNumber(value);
    return n ?? 0;
  }

  /** Chuẩn hóa số + gửi `null` rõ ràng cho ô tùy chọn (JSON bỏ `undefined` → backend không nhận được giá trị mới). */
  private buildCouponPayload(): Partial<Coupon> {
    const raw = this.newCoupon;
    const num = (v: unknown): number | undefined => {
      if (v === '' || v === null || v === undefined) return undefined;
      const x = Number(v);
      return Number.isFinite(x) ? x : undefined;
    };
    const intOrUndef = (v: unknown): number | undefined => {
      const x = num(v);
      if (x === undefined) return undefined;
      return Math.trunc(x);
    };
    const discount = num(raw.discountValue);
    const minPrior = intOrUndef(raw.minimumPriorOrders);
    const dateOrNull = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s ? s : null;
    };
    const body: Record<string, unknown> = {
      code: (raw.code || '').trim(),
      discountType: raw.discountType,
      discountValue: discount ?? 0,
      status: raw.status,
      startDate: dateOrNull(raw.startDate),
      endDate: dateOrNull(raw.endDate),
      minimumPriorOrders: minPrior !== undefined ? Math.max(0, minPrior) : 0,
      priority: raw.priority ?? null,
    };
    return body as Partial<Coupon>;
  }

  async saveCoupon() {
    const body = this.buildCouponPayload();
    if (this.editingId != null) {
      await firstValueFrom(this.api.updateCoupon(this.editingId, body));
    } else {
      await firstValueFrom(this.api.createCoupon(body));
    }
    await this.refresh();
    this.cdr.markForCheck();
  }

  couponStatusPillClass(status: string | undefined): string {
    return adminLifecycleStatusPillClass(status);
  }

  async deleteCoupon(id: number | undefined) {
    if (!id) return;
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
