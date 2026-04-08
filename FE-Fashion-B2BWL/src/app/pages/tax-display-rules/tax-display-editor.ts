import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  TuiButton, 
  TuiIcon, 
  TuiLabel, 
  TuiDataList,
  TuiTextfield,
  TuiAppearance
} from '@taiga-ui/core';
import { 
  TuiRadio,
  TuiDataListWrapper,
  TuiBadge
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule, TuiMultiSelectModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { TaxDisplayRule, Category, Product, CustomerGroup } from '../../services/api.service';

@Component({
  selector: 'app-tax-display-editor',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TuiButton, 
    TuiIcon, 
    TuiLabel, 
    TuiRadio, 
    TuiSelectModule, 
    TuiDataList, 
    TuiDataListWrapper, 
    TuiTextfieldControllerModule, 
    TuiBadge,
    TuiTextfield,
    TuiAppearance,
    TuiMultiSelectModule,
    TranslocoModule
  ],
  template: `
    <div class="editor-container" *transloco="let t">
      <div class="config-panel">
        <div class="editor-header">
           <h3 class="editor-title">{{ (isEdit ? 'COMMON.EDIT' : 'COMMON.ADD') | transloco }} {{ 'RULE.TAX_DISPLAY' | transloco }}</h3>
           <div class="header-actions">
              <button tuiButton appearance="flat" size="m" (click)="onCancel()">{{ 'COMMON.CANCEL' | transloco }}</button>
              <button tuiButton appearance="primary" size="m" (click)="onSave()">{{ 'COMMON.SAVE' | transloco }}</button>
           </div>
        </div>

        <div class="config-sections">
          <!-- GENERAL -->
          <div class="section-card">
            <h4 class="section-title">Cấu hình chung</h4>
            <div class="field-grid-3">
              <label tuiLabel>Tên quy tắc
                <tui-textfield>
                  <input tuiTextfield [(ngModel)]="data.name" placeholder="Ví dụ: Hiển thị VAT cho khách sỉ" />
                </tui-textfield>
              </label>

              <label tuiLabel>Mức thuế (%)
                <tui-textfield>
                  <input tuiTextfield type="number" [(ngModel)]="data.discountRate" min="0" max="100" />
                </tui-textfield>
              </label>

              <div class="status-toggle">
                <span class="label">{{ 'RULE.STATUS' | transloco }}</span>
                <tui-badge [appearance]="data.status === 'ACTIVE' ? 'success' : 'neutral'" size="m">
                   {{ 'ENUMS.' + (data.status || 'ACTIVE') | transloco }}
                </tui-badge>
              </div>
            </div>
          </div>



          <!-- TARGETING: CUSTOMERS -->
          <div class="section-card">
            <h4 class="section-title">Đối tượng khách hàng áp dụng</h4>
            <div class="field-grid">
               <label tuiLabel>Loại khách hàng áp dụng
                  <tui-select [(ngModel)]="data.applyCustomerType" (ngModelChange)="syncTargeting()">
                    <tui-data-list-wrapper *tuiDataList [items]="['ALL', 'GUEST', 'LOGGED_IN', 'GROUP']"></tui-data-list-wrapper>
                  </tui-select>
               </label>

               <label tuiLabel *ngIf="data.applyCustomerType === 'GROUP'">Chọn nhóm khách hàng
                  <tui-multi-select [(ngModel)]="selectedGroups" [stringify]="stringifyGroup" (ngModelChange)="syncTargeting()">
                    <tui-data-list-wrapper *tuiDataList [items]="customerGroups" [itemContent]="groupContent"></tui-data-list-wrapper>
                    <ng-template #groupContent let-item>{{ item.name }}</ng-template>
                  </tui-multi-select>
               </label>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-container { display: flex; height: 100%; gap: 1px; background: #e2e8f0; border-radius: 12px; overflow: hidden; }
    .config-panel { flex: 1; background: #f8fafc; padding: 24px; overflow-y: auto; }
    .preview-panel { width: 380px; background: #fff; padding: 24px; display: flex; flex-direction: column; gap: 20px; border-left: 1px solid #e2e8f0; }
    
    .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .editor-title { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }
    .header-actions { display: flex; gap: 12px; }

    .section-card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px; }
    .section-title { margin: 0 0 16px 0; font-size: 0.875rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }

    .field-grid { display: grid; gap: 20px; }
    .field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .field-grid-3 { display: grid; grid-template-columns: 2fr 1.5fr 1fr; gap: 20px; align-items: end; }
    
    .status-toggle { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; height: 44px; }
    
    .style-container { margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 20px; display: flex; flex-direction: column; gap: 20px; }
    .style-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .style-item { display: flex; flex-direction: column; gap: 8px; }
    .color-picker-row { display: flex; align-items: center; gap: 12px; }
    input[type="color"] { width: 44px; height: 44px; padding: 0; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 8px; overflow: hidden; }
    
    .preview-title { margin: 0; font-size: 0.875rem; font-weight: 600; color: #64748b; }
    .preview-card { flex: 1; background: #f1f5f9; border-radius: 16px; padding: 20px; display: flex; align-items: center; justify-content: center; }
    .device-mockup { background: #fff; border-radius: 20px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .product-preview { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .product-image { width: 100px; height: 100px; background: #f8fafc; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #94a3b8; }
    .product-info { width: 100%; display: flex; flex-direction: column; gap: 4px; text-align: center; }
    .product-name { font-weight: 700; color: #1e293b; }
    .base-price { font-size: 0.875rem; color: #94a3b8; text-decoration: line-through; }
    .tax-labels { margin: 8px 0; min-height: 48px; display: flex; align-items: center; justify-content: center; }
    .tax-line { display: flex; flex-direction: column; gap: 4px; }
    .add-to-cart { width: 100%; margin-top: 12px; pointer-events: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaxDisplayEditorComponent {
  @Input() categories: Category[] = [];
  @Input() products: Product[] = [];
  @Input() customerGroups: CustomerGroup[] = [];
  
  @Input() data: Partial<TaxDisplayRule> = {
    name: '',
    status: 'ACTIVE',
    taxDisplayType: 'VAT',
    displayType: 'BOTH_PRICES',
    designConfig: '{}',
    applyCustomerType: 'ALL',
    applyCustomerValue: '{}',
    applyProductType: 'ALL',
    applyProductValue: '{}',
    discountRate: 0
  };
  @Input() isEdit = false;
  @Output() save = new EventEmitter<Partial<TaxDisplayRule>>();
  @Output() cancel = new EventEmitter<void>();

  selectedGroups: CustomerGroup[] = [];
  selectedCategories: Category[] = [];
  selectedProducts: Product[] = [];

  design = {
    exclColor: '#303030',
    exclSize: 14,
    incColor: '#EA916E',
    incSize: 14
  };

  stringifyGroup = (item: any) => item?.name || '';
  stringifyCategory = (item: any) => item?.name || '';
  stringifyProduct = (item: any) => item?.name || '';

  ngOnChanges() {
    if (this.data.designConfig) {
      try {
        const savedDesign = JSON.parse(this.data.designConfig);
        this.design = { ...this.design, ...savedDesign };
      } catch (e) {
        console.error('Failed to parse design config', e);
      }
    }
    this.parseTargeting();
  }

  syncTargeting() {
    // Sync Customers
    if (this.data.applyCustomerType === 'GROUP') {
      this.data.applyCustomerValue = JSON.stringify({ groupIds: this.selectedGroups.map(g => g.id) });
    } else {
      this.data.applyCustomerValue = '{}';
    }
  }

  parseTargeting() {
    // Parse Customers
    if (this.data.applyCustomerType === 'GROUP' && this.data.applyCustomerValue) {
      try {
        const val = JSON.parse(this.data.applyCustomerValue);
        const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
        this.selectedGroups = this.customerGroups.filter(g => ids.includes(g.id));
      } catch { this.selectedGroups = []; }
    } else { this.selectedGroups = []; }
  }

  updateDesign() {
    this.data.designConfig = JSON.stringify(this.design);
  }

  onSave() {
    this.syncTargeting();
    this.save.emit(this.data);
  }

  onCancel() {
    this.cancel.emit();
  }
}
