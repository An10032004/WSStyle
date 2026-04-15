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
        <div class="dialog-content">
          <h2 class="tui-text_h5" style="margin-bottom: 12px;">{{ editingId ? 'Edit Coupon' : 'Create New Coupon' }}</h2>
          <app-rule-conflict-warning [conflicts]="conflicts"></app-rule-conflict-warning>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px;">
            <tui-textfield class="full-width">
              <input tuiTextfield [(ngModel)]="newCoupon.code" placeholder="WELCOME2024" />
              Coupon Code
            </tui-textfield>

            <label tuiLabel>
              Status
              <tui-select [(ngModel)]="newCoupon.status">
                <tui-data-list-wrapper *tuiDataList [items]="['ACTIVE', 'INACTIVE']"></tui-data-list-wrapper>
              </tui-select>
            </label>

            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCoupon.discountValue" />
              Discount Value
            </tui-textfield>

            <tui-textfield>
              <input tuiTextfield type="datetime-local" [(ngModel)]="newCoupon.startDate" />
              Start Date
            </tui-textfield>

            <tui-textfield>
              <input tuiTextfield type="datetime-local" [(ngModel)]="newCoupon.endDate" />
              End Date
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
              <th class="tui-table__th">Status</th>
              <th class="tui-table__th">Start Date</th>
              <th class="tui-table__th">End Date</th>
              <th class="tui-table__th">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of coupons()" class="tui-table__tr">
              <td class="tui-table__td"><strong>{{ item.code }}</strong></td>
              <td class="tui-table__td">{{ item.discountValue | number }}</td>
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
    endDate: ''
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
      endDate: ''
    };
    this.conflicts = [];

    this.dialogs.open<boolean>(this.addDialogTemplate, { size: 'm' }).subscribe({
      next: (res) => {
        if (res) this.saveCoupon();
      }
    });
  }

  showEditDialog(item: Coupon) {
    this.editingId = item.id;
    this.newCoupon = {
      code: item.code,
      discountValue: item.discountValue,
      status: item.status,
      startDate: item.startDate,
      endDate: item.endDate
    };
    this.conflicts = [];

    this.dialogs.open<boolean>(this.addDialogTemplate, { size: 'm' }).subscribe({
      next: (res) => {
        if (res) this.saveCoupon();
      }
    });
  }

  checkConflicts() {
    // simplified checking removed
  }

  async saveCoupon() {
    if (this.editingId) {
      await firstValueFrom(this.api.updateCoupon(this.editingId, this.newCoupon));
    } else {
      await firstValueFrom(this.api.createCoupon(this.newCoupon));
    }
    this.refresh();
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
