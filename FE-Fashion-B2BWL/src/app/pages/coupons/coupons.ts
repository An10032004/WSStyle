import { Component, ChangeDetectionStrategy, inject, signal, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiDialogService, TuiTextfield, TuiLabel, TuiDataList } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiDataListWrapper, TuiSelect, TuiMultiSelect } from '@taiga-ui/kit';
import { TuiComboBoxModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ApiService, Coupon, Category, Product, CustomerGroup } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { RuleConflictWarningComponent } from '../../shared/components/rule-conflict-warning/rule-conflict-warning';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiTextfield, TuiLabel, TuiSelect, TuiDataList, TuiDataListWrapper, TuiMultiSelect, TuiComboBoxModule, TuiTextfieldControllerModule, RuleConflictWarningComponent],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <h1 class="tui-text_h3">{{ 'SIDEBAR.COUPONS' | transloco }}</h1>
        <button tuiButton type="button" size="m" (click)="showAddDialog()">Add Coupon</button>
      </div>

      <ng-template #addDialog let-observer>
        <div class="dialog-content">
          <h2 class="tui-text_h5" style="margin-bottom: 12px;">Create New Coupon</h2>
          <app-rule-conflict-warning [conflicts]="conflicts"></app-rule-conflict-warning>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px;">
            <tui-textfield class="full-width">
              <input tuiTextfield [(ngModel)]="newCoupon.code" (ngModelChange)="checkConflicts()" placeholder="WELCOME2024" />
              Coupon Code
            </tui-textfield>

            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCoupon.priority" (ngModelChange)="checkConflicts()" />
              Priority (0=Highest)
            </tui-textfield>
            
            <label tuiLabel>
              Discount Type
              <tui-select [(ngModel)]="newCoupon.discountType">
                <tui-data-list-wrapper *tuiDataList [items]="['PERCENTAGE', 'FIXED_AMOUNT']"></tui-data-list-wrapper>
              </tui-select>
            </label>

            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCoupon.discountValue" />
              Discount Value
            </tui-textfield>

            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCoupon.minOrderAmount" />
              Min Order (đ)
            </tui-textfield>

            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCoupon.maxDiscountAmount" />
              Max Discount (đ)
            </tui-textfield>

            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCoupon.usageLimit" />
              Usage Limit
            </tui-textfield>

            <label tuiLabel>
              Start Date
              <tui-textfield>
                <input tuiTextfield type="datetime-local" [(ngModel)]="newCoupon.startDate" />
              </tui-textfield>
            </label>

            <label tuiLabel>
              End Date
              <tui-textfield>
                <input tuiTextfield type="datetime-local" [(ngModel)]="newCoupon.endDate" />
              </tui-textfield>
            </label>
          </div>

          <!-- TARGETING SECTION -->
          <h3 class="tui-text_h6" style="margin: 24px 0 16px;">Targeting (Who can use this?)</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <label tuiLabel>
              Apply To Customer Type
              <tui-select [(ngModel)]="newCoupon.applyCustomerType" (ngModelChange)="checkConflicts()">
                <tui-data-list-wrapper *tuiDataList [items]="['ALL', 'GUEST', 'LOGGED_IN', 'GROUP']"></tui-data-list-wrapper>
              </tui-select>
            </label>

            <div *ngIf="newCoupon.applyCustomerType === 'GROUP'">
              <label tuiLabel>Select Customer Groups</label>
              <tui-multi-select [(ngModel)]="selectedGroupIds" (ngModelChange)="checkConflicts()">
                <tui-data-list-wrapper *tuiDataList [items]="customerGroups()" [itemContent]="groupContent"></tui-data-list-wrapper>
                <ng-template #groupContent let-item>{{ item.name }}</ng-template>
              </tui-multi-select>
            </div>
            
            <label tuiLabel>
              Apply To Product Type
              <tui-select [(ngModel)]="newCoupon.applyProductType" (ngModelChange)="checkConflicts()">
                <tui-data-list-wrapper *tuiDataList [items]="['ALL', 'CATEGORY', 'SPECIFIC']"></tui-data-list-wrapper>
              </tui-select>
            </label>

            <div *ngIf="newCoupon.applyProductType === 'CATEGORY'">
              <label tuiLabel>Select Categories</label>
              <tui-multi-select [(ngModel)]="selectedCategoryIds" (ngModelChange)="checkConflicts()">
                <tui-data-list-wrapper *tuiDataList [items]="categories()" [itemContent]="catContent"></tui-data-list-wrapper>
                <ng-template #catContent let-item>{{ item.name }}</ng-template>
              </tui-multi-select>
            </div>

            <div *ngIf="newCoupon.applyProductType === 'SPECIFIC'">
              <label tuiLabel>Select Products</label>
              <tui-multi-select [(ngModel)]="selectedProductIds" (ngModelChange)="checkConflicts()">
                <tui-data-list-wrapper *tuiDataList [items]="products()" [itemContent]="prodContent"></tui-data-list-wrapper>
                <ng-template #prodContent let-item>{{ item.name }}</ng-template>
              </tui-multi-select>
            </div>
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
              <th class="tui-table__th">Priority</th>
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
              <td class="tui-table__td">{{ item.priority }}</td>
              <td class="tui-table__td">{{ item.discountValue }}{{ item.discountType === 'PERCENTAGE' ? '%' : 'đ' }}</td>
              <td class="tui-table__td">
                <div *ngIf="item.minOrderAmount">{{ item.minOrderAmount | number }}đ</div>
                <div *ngIf="item.maxDiscountAmount" style="font-size: 11px; color: #666;">Max: {{ item.maxDiscountAmount | number }}đ</div>
              </td>
              <td class="tui-table__td">
                <div>{{ item.usedCount }} / {{ item.usageLimit }}</div>
                <div style="font-size: 11px; color: #666;" *ngIf="item.endDate">Until: {{ item.endDate | date:'shortDate' }}</div>
              </td>
              <td class="tui-table__td">
                <span class="tui-badge" [class.tui-badge_primary]="item.status === 'ACTIVE'">{{ item.status }}</span>
              </td>
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
  private readonly cdr = inject(ChangeDetectorRef);
  
  readonly coupons = signal<Coupon[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly customerGroups = signal<CustomerGroup[]>([]);

  selectedCategoryIds: Category[] = [];
  selectedProductIds: Product[] = [];
  selectedGroupIds: CustomerGroup[] = [];

  @ViewChild('addDialog') addDialogTemplate!: TemplateRef<any>;
  
  newCoupon = {
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    startDate: '',
    endDate: '',
    usageLimit: 100,
    applyProductType: 'ALL',
    applyProductValue: '',
    applyCustomerType: 'ALL',
    applyCustomerValue: '',
    priority: 99
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
    this.newCoupon = { 
      code: '', 
      discountType: 'PERCENTAGE',
      discountValue: 0,
      minOrderAmount: 0,
      maxDiscountAmount: 0,
      startDate: '',
      endDate: '',
      usageLimit: 100,
      applyProductType: 'ALL',
      applyProductValue: '',
      applyCustomerType: 'ALL',
      applyCustomerValue: '',
      priority: 99
    };
    this.selectedCategoryIds = [];
    this.selectedProductIds = [];
    this.selectedGroupIds = [];
    this.conflicts = [];

    this.dialogs.open<boolean>(this.addDialogTemplate, { size: 'l' }).subscribe({
      next: (res) => {
        if (res) this.saveCoupon();
      }
    });
  }

  checkConflicts() {
    const target = {
      name: `Coupon ${this.newCoupon.code}`,
      applyProductType: this.newCoupon.applyProductType || 'ALL',
      applyProductValue: this.newCoupon.applyProductType === 'CATEGORY' 
        ? JSON.stringify({ categoryIds: this.selectedCategoryIds.map(c => c.id) })
        : (this.newCoupon.applyProductType === 'SPECIFIC' 
          ? JSON.stringify({ productIds: this.selectedProductIds.map(p => p.id) }) 
          : '{}'),
      applyCustomerType: this.newCoupon.applyCustomerType || 'ALL',
      applyCustomerValue: this.newCoupon.applyCustomerType === 'GROUP'
        ? JSON.stringify({ groupIds: this.selectedGroupIds.map(g => g.id) })
        : '{}',
      priority: this.newCoupon.priority || 0
    };

    this.api.checkRuleConflicts('COUPON', target).subscribe(res => {
      this.conflicts = res;
      this.cdr.detectChanges();
    });
  }

  async saveCoupon() {
    this.checkConflicts(); // Final check
    
    // Stringify targeting values
    let productVal = '{}';
    if (this.newCoupon.applyProductType === 'CATEGORY') {
      productVal = JSON.stringify({ categoryIds: this.selectedCategoryIds.map(c => c.id) });
    } else if (this.newCoupon.applyProductType === 'SPECIFIC') {
      productVal = JSON.stringify({ productIds: this.selectedProductIds.map(p => p.id) });
    }

    let customerVal = '{}';
    if (this.newCoupon.applyCustomerType === 'GROUP') {
      customerVal = JSON.stringify({ groupIds: this.selectedGroupIds.map(g => g.id) });
    }

    await firstValueFrom(this.api.createCoupon({
      ...this.newCoupon,
      applyProductValue: productVal,
      applyCustomerValue: customerVal,
      usedCount: 0,
      status: 'ACTIVE'
    }));
    this.refresh();
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
