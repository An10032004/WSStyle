import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  TuiBadge,
  TuiInputNumber,
  TuiRadio
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { OrderLimit } from '../../services/api.service';

@Component({
  selector: 'app-order-limit-editor',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TuiButton, 
    TuiInputNumber, 
    TuiTabs,
    TuiBadge,
    TuiRadio,
    TuiTextfieldControllerModule, 
    TuiLabel, 
    TuiIcon, 
    TuiSelectModule,
    TuiDataList,
    TuiDataListWrapper,
    TranslocoModule, 
    TuiTextfield,
    TuiDropdown
  ],
  template: `
    <div class="editor-container" *transloco="let t">
      <div class="editor-header">
        <button tuiIconButton type="button" iconStart="@tui.arrow-left" appearance="flat" size="s" (click)="cancel.emit()"></button>
        <h3 class="tui-text_h5">{{ 'ORDER_LIMIT.TITLE' | transloco }}</h3>
      </div>

      <div class="editor-layout">
        <!-- LEFT: CONFIGURATION -->
        <div class="config-panel">
          <nav tuiTabs [(activeItemIndex)]="activeTab" class="tabs-nav">
            <button tuiTab>{{ 'ORDER_LIMIT.SETTINGS_TAB' | transloco }}</button>
            <button tuiTab>{{ 'ORDER_LIMIT.ADVANCED_TAB' | transloco }}</button>
          </nav>

          <div class="tab-content" [ngSwitch]="activeTab">
            <!-- SETTINGS TAB -->
            <div *ngSwitchCase="0" class="form-sections-wrapper">
              
              <!-- General settings -->
              <div class="section-card">
                <h4 class="section-title-premium">{{ 'ORDER_LIMIT.GENERAL_SETTINGS' | transloco }}</h4>
                <div class="field-item">
                  <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                     <input tuiTextfield [(ngModel)]="rule.name" name="ruleName" />
                     {{ 'RULE.NAME' | transloco }}
                  </tui-textfield>
                </div>

                <div class="field-item">
                  <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                     <input tuiTextfield type="number" [(ngModel)]="rule.priority" name="rulePriority" />
                     {{ 'RULE.PRIORITY' | transloco }}
                  </tui-textfield>
                  <div class="field-hint">0 is the highest priority.</div>
                </div>
              </div>

              <!-- Order Limit Rule -->
              <div class="section-card">
                <h4 class="section-title-premium">{{ 'ORDER_LIMIT.RULE_SECTION' | transloco }}</h4>
                
                <div class="radio-group-modern">
                  <label class="modern-radio">
                    <input tuiRadio type="radio" name="limitLevel" value="PER_PRODUCT" [(ngModel)]="rule.limitLevel" />
                    <div class="radio-content">
                      <span class="radio-title">Apply order limit per product</span>
                      <span class="radio-desc">Each product or variant must meet its own quantity or amount limits.</span>
                    </div>
                  </label>
                  <label class="modern-radio">
                    <input tuiRadio type="radio" name="limitLevel" value="PER_ORDER" [(ngModel)]="rule.limitLevel" />
                    <div class="radio-content">
                      <span class="radio-title">Apply order limit per order</span>
                      <span class="radio-desc">The quantity or amount limits apply to the entire order total (combined across all items).</span>
                    </div>
                  </label>
                </div>

                <div class="grid-form-row">
                  <div class="field-item flex-2">
                    <label tuiLabel>
                      {{ 'ORDER_LIMIT.TYPE' | transloco }}
                      <tui-select [(ngModel)]="rule.limitType" tuiTextfieldSize="l">
                        <tui-data-list-wrapper *tuiDataList [items]="typeOptions"></tui-data-list-wrapper>
                      </tui-select>
                    </label>
                  </div>
                  <div class="field-item flex-1">
                    <tui-textfield tuiTextfieldSize="l">
                       <input tuiTextfield type="number" [(ngModel)]="rule.limitValue" name="limitValue" />
                       {{ 'ORDER_LIMIT.MIN_VALUE' | transloco }}
                    </tui-textfield>
                  </div>
                </div>
              </div>

              <!-- Applies to Customers -->
              <div class="section-card">
                <h4 class="section-title-premium">{{ 'ORDER_LIMIT.APPLIES_SECTION' | transloco }}</h4>
                <div class="field-item">
                   <label tuiLabel>
                      {{ 'MEMBER.GROUP' | transloco }}
                      <tui-select [(ngModel)]="rule.applyCustomerType" tuiTextfieldSize="l">
                        <tui-data-list-wrapper *tuiDataList [items]="['ALL', 'SPECIFIC']"></tui-data-list-wrapper>
                      </tui-select>
                   </label>
                </div>
              </div>

            </div>

            <!-- ADVANCED TAB -->
            <div *ngSwitchCase="1" class="form-section">
               <div class="empty-tab-message">
                  <tui-icon icon="@tui.settings-2" size="xl"></tui-icon>
                  <p>Advanced Settings Coming Soon</p>
                  <span>Rule conditions and exclusion logic will be available in the next update.</span>
               </div>
            </div>
          </div>

          <div class="actions-footer">
             <button tuiButton type="button" appearance="secondary" size="l" (click)="cancel.emit()">{{ 'GLOBAL.CANCEL' | transloco }}</button>
             <button tuiButton type="button" appearance="primary" size="l" (click)="save.emit(rule)">{{ 'GLOBAL.SAVE' | transloco }}</button>
          </div>
        </div>

        <!-- RIGHT: PREVIEW -->
        <div class="preview-panel">
          <div class="preview-card-sticky">
            <div class="preview-header">
               <span>{{ 'QUANTITY_BREAK.PREVIEW' | transloco }}</span>
               <div class="device-toggle">
                  <button tuiIconButton type="button" iconStart="@tui.smartphone" appearance="flat" size="s" [class.active]="previewMode === 'mobile'" (click)="previewMode = 'mobile'"></button>
                  <button tuiIconButton type="button" iconStart="@tui.monitor" appearance="flat" size="s" [class.active]="previewMode === 'desktop'" (click)="previewMode = 'desktop'"></button>
               </div>
            </div>
            <div class="preview-body" [class.mobile-view]="previewMode === 'mobile'">
              <div class="preview-product-container">
                <div class="mock-product-main">
                  <div class="mock-product-img">🎁</div>
                  <div class="mock-product-details">
                    <div class="mock-name">Gift Card</div>
                    <div class="mock-price-original">$10.00</div>
                  </div>
                </div>

                <div class="mock-qty-selector">
                  <span class="qty-label">Quantity</span>
                  <div class="qty-controls">
                    <button class="qty-btn">-</button>
                    <span class="qty-val">4</span>
                    <button class="qty-btn">+</button>
                  </div>
                </div>

                <div class="validation-alert" *ngIf="rule.limitValue && rule.limitValue > 4">
                  <tui-icon icon="@tui.info" size="s"></tui-icon>
                  <span>You must choose at least {{ rule.limitValue }} products for this item</span>
                </div>

                <button class="mock-atc-btn">Add to cart</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-container { padding: 32px; background: #f8fafc; min-height: 100vh; color: #1e293b; font-family: 'Inter', system-ui, sans-serif; }
    .editor-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
    .editor-layout { display: flex; gap: 40px; align-items: flex-start; max-width: 1400px; margin: 0 auto; }
    
    .config-panel { flex: 3; }
    .tabs-nav { margin-bottom: 32px; }
    
    .form-sections-wrapper { display: flex; flex-direction: column; gap: 24px; }
    
    .section-card { background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; }
    .section-title-premium { margin: 0 0 24px 0; font-size: 18px; font-weight: 700; color: #334155; }
    
    .field-item { margin-bottom: 20px; }
    .field-hint { font-size: 13px; color: #64748b; margin-top: 6px; }

    .radio-group-modern { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .modern-radio { display: block; padding: 16px 20px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
    .modern-radio:hover { border-color: #cbd5e0; background: #f8fafc; }
    .modern-radio :host-context([tuiRadioBlock][data-state='checked']) { border-color: #3b82f6; background: #eff6ff; }
    
    .radio-content { display: flex; flex-direction: column; gap: 4px; padding-left: 8px; }
    .radio-title { font-weight: 600; color: #1e293b; font-size: 15px; }
    .radio-desc { font-size: 13px; color: #64748b; line-height: 1.5; }

    .grid-form-row { display: flex; gap: 20px; align-items: flex-end; }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }

    .empty-tab-message { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; text-align: center; color: #94a3b8; }
    .empty-tab-message p { font-weight: 700; font-size: 18px; margin-top: 20px; color: #334155; }
    .empty-tab-message span { font-size: 14px; margin-top: 10px; }

    .actions-footer { margin-top: 40px; display: flex; gap: 16px; justify-content: flex-end; padding: 24px 0; }

    .preview-panel { flex: 2; position: sticky; top: 32px; }
    .preview-card-sticky { background: #fff; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; overflow: hidden; }
    .preview-header { background: #f8fafc; padding: 16px 24px; font-weight: 700; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; color: #475569; }
    
    .device-toggle { display: flex; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 8px; }
    .device-toggle button { border-radius: 6px; width: 32px; height: 32px; }
    .device-toggle button.active { background: #fff; color: #3b82f6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

    .preview-body { padding: 40px; background: #fff; transition: all 0.3s; }
    .preview-body.mobile-view { max-width: 375px; margin: 0 auto; border-left: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; }
    
    .preview-product-container { display: flex; flex-direction: column; gap: 24px; }
    .mock-product-main { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; margin-bottom: 16px; }
    .mock-product-img { width: 140px; height: 140px; background: #f8fafc; display: flex; align-items: center; justify-content: center; border-radius: 20px; font-size: 72px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
    .mock-product-details { display: flex; flex-direction: column; gap: 4px; }
    .mock-name { font-weight: 800; font-size: 24px; color: #1e293b; }
    .mock-price-original { font-weight: 700; font-size: 18px; color: #1e293b; }

    .mock-qty-selector { display: flex; flex-direction: column; gap: 8px; }
    .qty-label { font-size: 13px; font-weight: 600; color: #64748b; }
    .qty-controls { display: flex; align-items: center; gap: 20px; background: #f8fafc; width: fit-content; padding: 8px 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .qty-btn { background: none; border: none; font-size: 20px; font-weight: 600; color: #475569; cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
    .qty-val { font-weight: 700; font-size: 16px; color: #1e293b; min-width: 20px; text-align: center; }

    .validation-alert { display: flex; gap: 12px; background: #fffbeb; border: 1px solid #fef3c7; padding: 16px; border-radius: 12px; color: #92400e; font-size: 14px; font-weight: 500; line-height: 1.4; animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .mock-atc-btn { width: 100%; background: #1e293b; color: #fff; border: none; padding: 16px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; transition: background 0.2s; }
    .mock-atc-btn:hover { background: #334155; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderLimitEditorComponent implements OnInit {
  @Input() rule!: Partial<OrderLimit>;
  @Output() save = new EventEmitter<Partial<OrderLimit>>();
  @Output() cancel = new EventEmitter<void>();

  activeTab = 0;
  previewMode: 'mobile' | 'desktop' = 'desktop';
  
  typeOptions = ['MIN_ORDER_QUANTITY', 'MAX_ORDER_AMOUNT'];

  ngOnInit() {
    // Default values if not set
    if (!this.rule.limitLevel) this.rule.limitLevel = 'PER_PRODUCT';
    if (!this.rule.limitType) this.rule.limitType = 'MIN_ORDER_QUANTITY';
    if (this.rule.limitValue === undefined) this.rule.limitValue = 0;
  }
}
