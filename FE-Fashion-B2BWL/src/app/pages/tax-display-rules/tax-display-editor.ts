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
  TuiInputNumber,
  TuiDataListWrapper,
  TuiBadge
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { TaxDisplayRule } from '../../services/api.service';

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
    TuiInputNumber, 
    TuiSelectModule, 
    TuiDataList, 
    TuiDataListWrapper, 
    TuiTextfieldControllerModule, 
    TuiBadge,
    TuiTextfield,
    TuiAppearance,
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
            <h4 class="section-title">{{ 'ORDER_LIMIT.GENERAL_SETTINGS' | transloco }}</h4>
            <div class="field-group">
              <label tuiLabel>{{ 'RULE.NAME' | transloco }}
                <tui-textfield>
                  <input tuiTextfield [(ngModel)]="data.name" placeholder="e.g. VAT for VIPs" />
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
            <h4 class="section-title">{{ 'ORDER_LIMIT.APPLIES_SECTION' | transloco }}</h4>
            <div class="radio-list">
              <label class="radio-item">
                <input tuiRadio type="radio" name="custType" value="ALL" [(ngModel)]="data.applyCustomerType" />
                <span>{{ 'TAX_DISPLAY.TARGETING.ALL_CUSTOMERS' | transloco }}</span>
              </label>
              <label class="radio-item">
                <input tuiRadio type="radio" name="custType" value="LOGGED_IN" [(ngModel)]="data.applyCustomerType" />
                <span>{{ 'TAX_DISPLAY.TARGETING.LOGGED_IN' | transloco }}</span>
              </label>
              <label class="radio-item">
                <input tuiRadio type="radio" name="custType" value="GUEST" [(ngModel)]="data.applyCustomerType" />
                <span>{{ 'TAX_DISPLAY.TARGETING.GUEST' | transloco }}</span>
              </label>
              <label class="radio-item">
                <input tuiRadio type="radio" name="custType" value="GROUP" [(ngModel)]="data.applyCustomerType" />
                <span>{{ 'TAX_DISPLAY.TARGETING.SPECIFIC_GROUPS' | transloco }}</span>
              </label>
            </div>
          </div>

          <!-- TARGETING: PRODUCTS -->
          <div class="section-card">
            <h4 class="section-title">{{ 'TAX_DISPLAY.APPLY_TO_PRODUCTS' | transloco }}</h4>
            <div class="radio-list">
              <label class="radio-item">
                <input tuiRadio type="radio" name="prodType" value="ALL" [(ngModel)]="data.applyProductType" />
                <span>{{ 'TAX_DISPLAY.TARGETING.ALL_PRODUCTS' | transloco }}</span>
              </label>
              <label class="radio-item">
                <input tuiRadio type="radio" name="prodType" value="CATEGORY" [(ngModel)]="data.applyProductType" />
                <span>{{ 'TAX_DISPLAY.TARGETING.SPECIFIC_CATEGORIES' | transloco }}</span>
              </label>
            </div>
          </div>

          <!-- DESIGN CONFIG -->
          <div class="section-card">
            <h4 class="section-title">{{ 'TAX_DISPLAY.DESIGN_SECTION' | transloco }}</h4>
            <div class="field-grid">
               <label tuiLabel>{{ 'TAX_DISPLAY.TAX_TYPE' | transloco }}
                 <tui-select [(ngModel)]="data.taxDisplayType" [tuiTextfieldCleaner]="false">
                    <tui-data-list-wrapper *tuiDataList [items]="['VAT', 'GST']"></tui-data-list-wrapper>
                 </tui-select>
               </label>

               <label tuiLabel>{{ 'TAX_DISPLAY.DISPLAY_TYPE' | transloco }}
                 <tui-select [(ngModel)]="data.displayType" [tuiTextfieldCleaner]="false">
                    <tui-data-list-wrapper *tuiDataList [items]="['BOTH_PRICES', 'EXCLUDE_TAX_ONLY', 'INCLUDE_TAX_ONLY']"></tui-data-list-wrapper>
                 </tui-select>
               </label>

               <div class="style-container">
                 <div class="style-row">
                    <div class="color-part">
                       <label tuiLabel>{{ 'TAX_DISPLAY.EXCL_COLOR' | transloco }}</label>
                       <div class="color-picker-wrapper">
                         <input type="color" [(ngModel)]="design.exclColor" (ngModelChange)="updateDesign()" />
                         <tui-textfield size="s">
                           <input tuiTextfield [(ngModel)]="design.exclColor" (ngModelChange)="updateDesign()" />
                         </tui-textfield>
                       </div>
                    </div>
                    <div class="size-part">
                       <label tuiLabel>{{ 'TAX_DISPLAY.EXCL_SIZE' | transloco }}</label>
                       <tui-input-number size="s" [(ngModel)]="design.exclSize" (ngModelChange)="updateDesign()">14</tui-input-number>
                    </div>
                 </div>

                 <div class="style-row">
                    <div class="color-part">
                       <label tuiLabel>{{ 'TAX_DISPLAY.INC_COLOR' | transloco }}</label>
                       <div class="color-picker-wrapper">
                         <input type="color" [(ngModel)]="design.incColor" (ngModelChange)="updateDesign()" />
                         <tui-textfield size="s">
                           <input tuiTextfield [(ngModel)]="design.incColor" (ngModelChange)="updateDesign()" />
                         </tui-textfield>
                       </div>
                    </div>
                    <div class="size-part">
                       <label tuiLabel>{{ 'TAX_DISPLAY.INC_SIZE' | transloco }}</label>
                       <tui-input-number size="s" [(ngModel)]="design.incSize" (ngModelChange)="updateDesign()">14</tui-input-number>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PREVIEW PANEL -->
      <div class="preview-panel">
        <h4 class="preview-title">{{ 'TAX_DISPLAY.PREVIEW' | transloco }}</h4>
        <div class="preview-card">
           <div class="device-mockup">
              <div class="product-preview">
                 <div class="product-image">
                    <tui-icon icon="@tui.gift"></tui-icon>
                 </div>
                 <div class="product-info">
                    <span class="product-name">Gift Card</span>
                    <span class="base-price">$10.00</span>
                    
                    <div class="tax-labels" [ngSwitch]="data.displayType">
                       <ng-container *ngSwitchCase="'BOTH_PRICES'">
                          <span class="tax-line">
                             <span [style.color]="design.exclColor" [style.font-size.px]="design.exclSize">$10.00 exc. {{ data.taxDisplayType }}</span>
                             <span class="separator">|</span>
                             <span [style.color]="design.incColor" [style.font-size.px]="design.incSize">$11.00 inc. {{ data.taxDisplayType }}</span>
                          </span>
                       </ng-container>
                       <ng-container *ngSwitchCase="'EXCLUDE_TAX_ONLY'">
                          <span [style.color]="design.exclColor" [style.font-size.px]="design.exclSize">$10.00 exc. {{ data.taxDisplayType }}</span>
                       </ng-container>
                       <ng-container *ngSwitchCase="'INCLUDE_TAX_ONLY'">
                          <span [style.color]="design.incColor" [style.font-size.px]="design.incSize">$11.00 inc. {{ data.taxDisplayType }}</span>
                       </ng-container>
                    </div>
                    
                    <button tuiButton appearance="secondary" size="s" class="add-to-cart">Add to cart</button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-container { display: flex; height: 100%; gap: 1px; background: #e2e8f0; }
    .config-panel { flex: 1; background: #f8fafc; padding: 24px; overflow-y: auto; }
    .preview-panel { width: 420px; background: #fff; padding: 24px; display: flex; flex-direction: column; gap: 24px; border-left: 1px solid #e2e8f0; }
    
    .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .editor-title { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }
    .header-actions { display: flex; gap: 12px; }

    .section-card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
    .section-title { margin: 0 0 16px 0; font-size: 0.875rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.025em; }

    .field-group { display: flex; flex-direction: column; gap: 16px; }
    .status-toggle { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f1f5f9; border-radius: 8px; }
    
    .radio-list { display: flex; flex-direction: column; gap: 12px; }
    .radio-item { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s; }
    .radio-item:hover { background: #f1f5f9; }
    .radio-item span { font-size: 0.9375rem; color: #334155; }

    .field-grid { display: grid; gap: 20px; }
    .style-container { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; border-top: 1px dashed #e2e8f0; padding-top: 16px; }
    .style-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
    .color-part, .size-part { display: flex; flex-direction: column; gap: 6px; }
    
    .color-picker-wrapper { display: flex; align-items: center; gap: 12px; height: 36px; }
    input[type="color"] { width: 38px; height: 38px; padding: 0; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 8px; flex-shrink: 0; }
    .color-picker-wrapper tui-textfield { flex: 1; min-width: 100px; }
    
    .preview-title { margin: 0; font-size: 0.875rem; font-weight: 600; color: #64748b; }
    .preview-card { flex: 1; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 16px; padding: 40px 20px; display: flex; align-items: center; justify-content: center; position: relative; }
    
    .device-mockup { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); border-radius: 20px; width: 100%; max-width: 320px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); border: 1px solid rgba(255, 255, 255, 0.4); overflow: hidden; transform: translateY(0); transition: transform 0.3s ease; }
    .device-mockup:hover { transform: translateY(-5px); }
    .product-preview { padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; }
    .product-image { width: 120px; height: 120px; background: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 48px; color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    
    .product-info { width: 100%; display: flex; flex-direction: column; gap: 8px; }
    .product-name { font-size: 1.125rem; font-weight: 700; color: #1e293b; }
    .base-price { font-size: 0.875rem; color: #94a3b8; text-decoration: line-through; }
    
    .tax-labels { margin: 12px 0; min-height: 44px; display: flex; align-items: center; justify-content: center; }
    .tax-line { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .separator { display: none; }
    
    .add-to-cart { width: 100%; height: 40px; border-radius: 8px; pointer-events: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaxDisplayEditorComponent {
  @Input() data: Partial<TaxDisplayRule> = {
    name: '',
    status: 'ACTIVE',
    taxDisplayType: 'VAT',
    displayType: 'BOTH_PRICES',
    designConfig: '{}',
    applyCustomerType: 'ALL',
    applyCustomerValue: '{}',
    applyProductType: 'ALL',
    applyProductValue: '{}'
  };
  @Input() isEdit = false;
  @Output() save = new EventEmitter<Partial<TaxDisplayRule>>();
  @Output() cancel = new EventEmitter<void>();

  design = {
    exclColor: '#303030',
    exclSize: 14,
    incColor: '#EA916E',
    incSize: 14
  };

  ngOnChanges() {
    if (this.data.designConfig) {
      try {
        const savedDesign = JSON.parse(this.data.designConfig);
        this.design = { ...this.design, ...savedDesign };
      } catch (e) {
        console.error('Failed to parse design config', e);
      }
    }
  }

  updateDesign() {
    this.data.designConfig = JSON.stringify(this.design);
  }

  onSave() {
    this.save.emit(this.data);
  }

  onCancel() {
    this.cancel.emit();
  }
}
