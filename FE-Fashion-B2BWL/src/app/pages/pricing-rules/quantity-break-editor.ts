import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { 
  TuiButton, 
  TuiTextfield, 
  TuiLabel, 
  TuiIcon,
  TuiDataList,
  TuiDropdown
} from '@taiga-ui/core';
import { 
  TuiDataListWrapper, 
  TuiTabs,
  TuiInputNumber,
  TuiInputDate,
  TuiInputTime,
  TuiCheckbox
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule, TuiInputDateModule, TuiInputTimeModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PricingRule } from '../../services/api.service';
import { TuiDay, TuiTime } from '@taiga-ui/cdk';

interface QuantityBracket {
  min: number;
  max: number | null;
  discount: number;
}

@Component({
  selector: 'app-quantity-break-editor',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    TuiButton, 
    TuiInputNumber, 
    TuiTabs,
    TuiInputDateModule,
    TuiInputTimeModule,
    TuiCheckbox,
    TuiTextfieldControllerModule, 
    TuiLabel, 
    TuiIcon, 
    TranslocoModule, 
    TuiTextfield,
    TuiDropdown
  ],
  template: `
    <div class="editor-container" *transloco="let t">
      <div class="editor-header">
        <button tuiIconButton type="button" iconStart="@tui.arrow-left" appearance="flat" size="s" (click)="cancel.emit()"></button>
        <h3 class="tui-text_h5">{{ 'QUANTITY_BREAK.TITLE' | transloco }}</h3>
      </div>

      <div class="editor-layout">
        <!-- LEFT: CONFIGURATION -->
        <div class="config-panel">
          <nav tuiTabs [(activeItemIndex)]="activeTab" class="tabs-nav">
            <button tuiTab>{{ 'QUANTITY_BREAK.GENERAL_TAB' | transloco }}</button>
            <button tuiTab>{{ 'QUANTITY_BREAK.DISCOUNT_TAB' | transloco }}</button>
            <button tuiTab>{{ 'QUANTITY_BREAK.TABLE_TAB' | transloco }}</button>
          </nav>

          <div class="tab-content" [ngSwitch]="activeTab">
            <!-- GENERAL SETTINGS -->
            <div *ngSwitchCase="0" class="form-section">
              <div class="field-item">
                <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                   <input tuiTextfield [(ngModel)]="rule.name" name="ruleName" />
                   {{ 'QUANTITY_BREAK.NAME' | transloco }}
                </tui-textfield>
                <div class="field-hint">{{ 'QUANTITY_BREAK.NAME_HINT' | transloco }}</div>
              </div>

              <div class="field-item">
                <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                   <input tuiTextfield [(ngModel)]="message" name="ruleMessage" />
                   {{ 'QUANTITY_BREAK.MESSAGE' | transloco }}
                </tui-textfield>
                <div class="field-hint">{{ 'QUANTITY_BREAK.MESSAGE_HINT' | transloco }}</div>
              </div>

              <div class="field-item">
                <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                   <input tuiTextfield [(ngModel)]="description" name="ruleDescription" />
                   {{ 'QUANTITY_BREAK.DESCRIPTION' | transloco }}
                </tui-textfield>
                <div class="field-hint">{{ 'QUANTITY_BREAK.DESCRIPTION_HINT' | transloco }}</div>
              </div>

              <div class="field-item">
                <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                   <input tuiTextfield type="number" [(ngModel)]="rule.priority" name="rulePriority" />
                   {{ 'RULE.PRIORITY' | transloco }}
                </tui-textfield>
                <div class="field-hint">{{ 'QUANTITY_BREAK.PRIORITY_HINT' | transloco }}</div>
              </div>

              <div class="date-section">
                <h4 class="section-title">{{ 'QUANTITY_BREAK.ACTIVE_DATES' | transloco }}</h4>
                <div class="date-row">
                   <div class="date-col">
                      <tui-input-date 
                        [(ngModel)]="startDate"
                        name="ruleStartDate"
                        tuiTextfieldSize="l" 
                        [tuiTextfieldCleaner]="true">
                         {{ 'QUANTITY_BREAK.START_DATE' | transloco }}
                      </tui-input-date>
                   </div>
                   <div class="date-col">
                      <tui-input-time 
                        [(ngModel)]="startTime"
                        name="ruleStartTime"
                        tuiTextfieldSize="l" 
                        [tuiTextfieldCleaner]="true">
                         {{ 'QUANTITY_BREAK.START_TIME' | transloco }}
                      </tui-input-time>
                   </div>
                </div>
                <div class="checkbox-row">
                  <label tuiLabel style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input tuiCheckbox type="checkbox" [(ngModel)]="hasEndDate" name="ruleHasEndDate" />
                    {{ 'QUANTITY_BREAK.SET_END_DATE' | transloco }}
                  </label>
                </div>
              </div>
            </div>

            <!-- DISCOUNT SETTINGS -->
            <div *ngSwitchCase="1" class="form-section">
              <div class="bracket-list">
                <div *ngFor="let b of brackets; let i = index" class="bracket-row">
                   <div class="bracket-field">
                      <tui-input-number [(ngModel)]="b.min" [name]="'min' + i" tuiTextfieldSize="l">
                         Min
                      </tui-input-number>
                   </div>
                   <div class="bracket-field">
                      <tui-input-number [(ngModel)]="b.max" [name]="'max' + i" tuiTextfieldSize="l">
                         Max
                      </tui-input-number>
                   </div>
                   <div class="bracket-field">
                      <tui-input-number [(ngModel)]="b.discount" [name]="'discount' + i" tuiTextfieldSize="l">
                         Discount %
                      </tui-input-number>
                   </div>
                   <button tuiIconButton type="button" iconStart="@tui.trash" appearance="flat" size="l" (click)="removeBracket(i)" class="delete-btn" title="Remove Range"></button>
                </div>
                <button tuiButton type="button" appearance="secondary" size="l" (click)="addBracket()" class="add-range-btn">+ Add Range</button>
              </div>
            </div>

            <!-- TABLE SETTINGS -->
            <div *ngSwitchCase="2" class="form-section">
               <div class="empty-tab-message">
                  <tui-icon icon="@tui.settings-2" size="xl"></tui-icon>
                  <p>{{ 'SAAS.FEATURES_JSON' | transloco }} - Coming Soon</p>
                  <span>Advanced storefront table customization will be available in the next update.</span>
               </div>
            </div>
          </div>

          <div class="actions-footer">
             <button tuiButton type="button" appearance="secondary" size="l" (click)="cancel.emit()">{{ 'GLOBAL.CANCEL' | transloco }}</button>
             <button tuiButton type="button" appearance="primary" size="l" (click)="saveRule()">{{ 'GLOBAL.SAVE' | transloco }}</button>
          </div>
        </div>

        <!-- RIGHT: PREVIEW -->
        <div class="preview-panel">
          <div class="preview-card-sticky">
            <div class="preview-header">
               <span>{{ 'QUANTITY_BREAK.PREVIEW' | transloco }}</span>
               <tui-icon icon="@tui.eye" size="s"></tui-icon>
            </div>
            <div class="preview-body">
              <div class="preview-product-container">
                <div class="preview-label-tag">{{ 'QUANTITY_BREAK.PREVIEW_PRODUCT' | transloco }}</div>
                <div class="mock-product-main">
                  <div class="mock-product-img">📦</div>
                  <div class="mock-product-details">
                    <div class="mock-name">Sản phẩm thời trang cao cấp</div>
                    <div class="mock-price-original">100.000 {{ 'GLOBAL.CURRENCY_SUFFIX' | transloco }}</div>
                  </div>
                </div>
              </div>
              
              <div class="pricing-table-card">
                <h4 class="table-card-title">{{ 'QUANTITY_BREAK.PRICING_TABLE' | transloco }}</h4>
                
                <div class="qb-styled-table-wrapper">
                  <table class="qb-styled-table">
                    <thead>
                      <tr>
                        <th>{{ 'QUANTITY_BREAK.QUANTITY_RANGE' | transloco }}</th>
                        <th>{{ 'QUANTITY_BREAK.UNIT_PRICE' | transloco }}</th>
                        <th>{{ 'QUANTITY_BREAK.DISCOUNT' | transloco }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let b of brackets">
                        <td>{{ b.min }} - {{ b.max || '+' }}</td>
                        <td class="unit-price-cell">
                          <div class="price-comparison">
                            <span class="old-price">100.000 {{ 'GLOBAL.CURRENCY_SUFFIX' | transloco }}</span>
                            <span class="new-price">{{ (100000 * (1 - b.discount/100)).toLocaleString() }} {{ 'GLOBAL.CURRENCY_SUFFIX' | transloco }}</span>
                          </div>
                        </td>
                        <td class="discount-badge-cell">
                           <span class="preview-discount-badge">-{{ b.discount }}%</span>
                        </td>
                      </tr>
                      <tr *ngIf="brackets.length === 0">
                        <td colspan="3" style="text-align: center; color: #999; padding: 20px;">No discounts configured</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-container { padding: 32px; background: #fbfbfb; min-height: 100vh; color: #2c3e50; font-family: 'Inter', sans-serif; }
    .editor-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
    .editor-layout { display: flex; gap: 40px; align-items: flex-start; }
    
    .config-panel { flex: 3; background: #fff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid #f0f0f0; }
    .tabs-nav { margin-bottom: 40px; }
    
    .form-section { display: flex; flex-direction: column; gap: 28px; }
    .field-item { display: flex; flex-direction: column; gap: 10px; }
    .premium-label { font-size: 14px; font-weight: 600; color: #444; margin-bottom: 2px; }
    .field-hint { font-size: 13px; color: #95a5a6; margin-top: 4px; line-height: 1.4; }
    
    .section-title { margin: 16px 0 8px 0; color: #2c3e50; border-left: 4px solid #3498db; padding-left: 12px; }
    .date-section { margin-top: 16px; padding-top: 32px; border-top: 1px dashed #ecf0f1; }
    .date-row { display: flex; gap: 24px; margin: 12px 0; }
    .date-col { flex: 1; display: flex; flex-direction: column; gap: 10px; }
    .checkbox-row { display: flex; align-items: center; gap: 12px; margin-top: 20px; }
    .checkbox-label { font-weight: 500; font-size: 14px; color: #34495e; cursor: pointer; user-select: none; }

    .bracket-list { display: flex; flex-direction: column; gap: 24px; }
    .bracket-row { display: flex; gap: 16px; align-items: flex-end; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #edf2f7; transition: all 0.2s; }
    .bracket-row:hover { border-color: #cbd5e0; background: #f1f5f9; }
    .bracket-field { flex: 1; display: flex; flex-direction: column; gap: 10px; }
    .delete-btn { margin-bottom: 4px; color: #e74c3c; border-radius: 8px; }
    .add-range-btn { width: fit-content; margin-top: 8px; font-weight: 600; }

    .empty-tab-message { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 40px; text-align: center; color: #7f8c8d; }
    .empty-tab-message p { font-weight: 600; margin-top: 16px; color: #2c3e50; }
    .empty-tab-message span { font-size: 14px; margin-top: 8px; max-width: 300px; }

    .actions-footer { margin-top: 60px; display: flex; gap: 20px; justify-content: flex-end; border-top: 1px solid #f0f0f0; padding-top: 32px; }

    .preview-panel { flex: 2; position: sticky; top: 32px; }
    .preview-card-sticky { background: #fff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; overflow: hidden; }
    .preview-header { background: #fcfcfc; padding: 20px 24px; font-weight: 700; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; color: #34495e; letter-spacing: 0.5px; }
    .preview-body { padding: 32px; display: flex; flex-direction: column; gap: 28px; }
    
    .preview-product-container { background: #f9fafb; border: 1px solid #f1f3f5; border-radius: 16px; padding: 24px; position: relative; }
    .preview-label-tag { position: absolute; top: -12px; left: 24px; background: #3498db; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .mock-product-main { display: flex; align-items: center; gap: 20px; margin-top: 4px; }
    .mock-product-img { width: 64px; height: 64px; background: #fff; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .mock-product-details { flex: 1; }
    .mock-name { font-weight: 700; font-size: 16px; color: #2c3e50; margin-bottom: 4px; }
    .mock-price-original { font-weight: 600; font-size: 14px; color: #95a5a6; }

    .pricing-table-card { border: 1px solid #edf2f7; border-radius: 16px; padding: 24px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
    .table-card-title { margin: 0 0 20px 0; font-size: 17px; color: #2c3e50; font-weight: 700; }

    .qb-styled-table-wrapper { border-radius: 12px; border: 1px solid #f1f3f5; overflow: hidden; }
    .qb-styled-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .qb-styled-table th { background: #f8fafc; padding: 16px; text-align: left; color: #64748b; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f3f5; }
    .qb-styled-table td { padding: 16px; border-bottom: 1px solid #f1f3f5; color: #334155; font-weight: 500; }
    .unit-price-cell { font-weight: 700; color: #1e293b; }
    .price-comparison { display: flex; flex-direction: column; gap: 2px; }
    .old-price { font-size: 12px; color: #94a3b8; text-decoration: line-through; font-weight: 400; }
    .new-price { font-size: 14px; color: #1e293b; font-weight: 700; }
    .discount-badge-cell { text-align: right; }
    .preview-discount-badge { background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 13px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuantityBreakEditorComponent implements OnInit {
  @Input() rule!: Partial<PricingRule>;
  @Output() save = new EventEmitter<Partial<PricingRule>>();
  @Output() cancel = new EventEmitter<void>();

  activeTab = 0;
  message = '';
  description = '';
  
  startDate: TuiDay | null = null;
  startTime: TuiTime | null = null;
  hasEndDate = false;

  brackets: QuantityBracket[] = [
    { min: 1, max: 30, discount: 5 },
    { min: 31, max: 60, discount: 10 }
  ];

  ngOnInit() {
    if (this.rule.actionConfig) {
      try {
        const config = JSON.parse(this.rule.actionConfig);
        this.message = config.message || '';
        this.description = config.description || '';
        if (config.brackets) this.brackets = config.brackets;
        
        // Map any saved dates back to controls if needed
        // (For now just initialized in component)
      } catch (e) {}
    }
  }

  addBracket() {
    const last = this.brackets[this.brackets.length - 1];
    this.brackets.push({ 
      min: (last?.max || 0) + 1, 
      max: (last?.max || 0) + 30, 
      discount: (last?.discount || 0) + 5 
    });
  }

  removeBracket(index: number) {
    this.brackets.splice(index, 1);
  }

  saveRule() {
    // Basic validation / normalization
    this.brackets.forEach(b => {
      b.min = Math.max(1, b.min || 1);
      if (b.max !== null) b.max = Math.max(b.min, b.max);
      b.discount = Math.min(100, Math.max(0, b.discount || 0));
    });

    const config = {
      message: this.message,
      description: this.description,
      brackets: this.brackets
    };
    this.rule.actionConfig = JSON.stringify(config);
    this.save.emit(this.rule);
  }
}
