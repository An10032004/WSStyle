import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of, Observable } from 'rxjs';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
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
import { TuiSelectModule, TuiTextfieldControllerModule, TuiMultiSelectModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, OrderLimit } from '../../services/api.service';
import { RuleConflictWarningComponent } from '../../shared/components/rule-conflict-warning/rule-conflict-warning';

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
    TuiDataListWrapper,
    TranslocoModule, 
    TuiTextfield,
    TuiDropdown,
    TuiMultiSelectModule,
    RuleConflictWarningComponent,
  ],
  template: `
    <div class="editor-container" *transloco="let t">
      <div class="editor-header">
        <button tuiIconButton type="button" iconStart="@tui.arrow-left" appearance="flat" size="s" (click)="cancel.emit()"></button>
        <h3 class="tui-text_h5">{{ 'ORDER_LIMIT.TITLE' | transloco }}</h3>
      </div>

      <app-rule-conflict-warning [conflicts]="conflicts" style="display: block; max-width: 1400px; margin: 0 auto 16px; padding: 0 32px;"></app-rule-conflict-warning>

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
                  <label tuiLabel>
                    {{ 'RULE.NAME' | transloco }}
                    <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                      <input tuiTextfield [(ngModel)]="rule.name" name="ruleName" (input)="touchLimitForm()" />
                    </tui-textfield>
                  </label>
                </div>

                <div class="field-item">
                  <label tuiLabel>
                    {{ 'RULE.PRIORITY' | transloco }}
                    <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                      <input
                        tuiTextfield
                        type="number"
                        [(ngModel)]="rule.priority"
                        name="rulePriority"
                        (ngModelChange)="touchLimitForm()"
                      />
                    </tui-textfield>
                  </label>
                  <div class="field-hint">Số nhỏ hơn = ưu tiên cao hơn (đồng bộ bảng giá / chiết khấu). Không được trùng mức ưu tiên với quy tắc MOQ/MOV khác.</div>
                </div>
              </div>

              <!-- Order Limit Rule -->
              <div class="section-card">
                <h4 class="section-title-premium">{{ 'ORDER_LIMIT.RULE_SECTION' | transloco }}</h4>
                
                <div class="radio-group-modern">
                  <label class="modern-radio">
                    <input tuiRadio type="radio" name="limitLevel" value="PER_PRODUCT" [(ngModel)]="rule.limitLevel" (ngModelChange)="touchLimitForm()" />
                    <div class="radio-content">
                      <span class="radio-title">Apply order limit per product</span>
                      <span class="radio-desc">Each product or variant must meet its own quantity or amount limits.</span>
                    </div>
                  </label>
                  <label class="modern-radio">
                    <input tuiRadio type="radio" name="limitLevel" value="PER_ORDER" [(ngModel)]="rule.limitLevel" (ngModelChange)="touchLimitForm()" />
                    <div class="radio-content">
                      <span class="radio-title">Apply order limit per order</span>
                      <span class="radio-desc">The quantity or amount limits apply to the entire order total (combined across all items).</span>
                    </div>
                  </label>
                </div>

                <div class="grid-form-row grid-form-row-limit">
                  <div class="field-item flex-2 grid-form-col">
                    <label tuiLabel>
                      {{ 'ORDER_LIMIT.TYPE' | transloco }}
                      <tui-select
                        [(ngModel)]="rule.limitType"
                        tuiTextfieldSize="l"
                        (ngModelChange)="touchLimitForm()"
                      >
                        <tui-data-list-wrapper *tuiDataList [items]="typeOptions"></tui-data-list-wrapper>
                      </tui-select>
                    </label>
                  </div>
                  <div class="field-item flex-1 grid-form-col">
                    <label tuiLabel>
                      {{ limitValueLabelKey | transloco }}
                      <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                        <input
                          tuiTextfield
                          type="number"
                          [(ngModel)]="rule.limitValue"
                          name="limitValue"
                          min="0"
                          step="any"
                          (ngModelChange)="onLimitValueChange($event)"
                          (input)="touchLimitForm()"
                        />
                      </tui-textfield>
                    </label>
                    <div class="field-hint">{{ 'ORDER_LIMIT.VALUE_HINT' | transloco }}</div>
                  </div>
                </div>
              </div>

              <!-- Applies to Customers -->
              <div class="section-card">
                <h4 class="section-title-premium">Đối tượng khách hàng</h4>
                <div class="field-item">
                   <label tuiLabel>
                      Loại khách hàng áp dụng
                      <tui-select [(ngModel)]="rule.applyCustomerType" (ngModelChange)="syncTargeting()" tuiTextfieldSize="l">
                        <tui-data-list-wrapper *tuiDataList [items]="customerTypeOptions"></tui-data-list-wrapper>
                      </tui-select>
                   </label>
                </div>
                
                <div class="field-item" *ngIf="rule.applyCustomerType === 'GROUP'">
                   <label tuiLabel>
                      Chọn nhóm khách hàng
                      <tui-multi-select 
                        [(ngModel)]="selectedGroupIds" 
                        (ngModelChange)="syncTargeting()" 
                        [stringify]="stringifyGroup">
                        <tui-data-list-wrapper 
                          *tuiDataList 
                          [items]="customerGroups" 
                          [itemContent]="groupContent">
                        </tui-data-list-wrapper>
                        <ng-template #groupContent let-item>{{ item.name }}</ng-template>
                      </tui-multi-select>
                   </label>
                </div>
              </div>

              <!-- Applies to Products -->
              <div class="section-card">
                <h4 class="section-title-premium">Sản phẩm áp dụng</h4>
                <div class="field-item">
                   <label tuiLabel>
                      Loại sản phẩm áp dụng
                      <tui-select
                        [(ngModel)]="rule.applyProductType"
                        (ngModelChange)="syncTargeting()"
                        tuiTextfieldSize="l"
                        [stringify]="stringifyProductType"
                      >
                        <tui-data-list-wrapper *tuiDataList [items]="productTypeOptions"></tui-data-list-wrapper>
                      </tui-select>
                   </label>
                   <div class="field-hint">{{ 'ORDER_LIMIT.PRODUCT_SCOPE_HINT' | transloco }}</div>
                </div>
                
                <div class="field-item" *ngIf="rule.applyProductType === 'CATEGORY' || rule.applyProductType === 'GROUP'">
                   <label tuiLabel>
                      {{ pickCategoriesLabelKey | transloco }}
                      <tui-multi-select 
                        [(ngModel)]="selectedCategoryIds" 
                        (ngModelChange)="syncTargeting()" 
                        [stringify]="stringifyCategory">
                        <tui-data-list-wrapper 
                          *tuiDataList 
                          [items]="categories" 
                          [itemContent]="catContent">
                        </tui-data-list-wrapper>
                        <ng-template #catContent let-item>{{ item.name }}</ng-template>
                      </tui-multi-select>
                   </label>
                </div>

                <div class="field-item" *ngIf="rule.applyProductType === 'SPECIFIC'">
                   <label tuiLabel>
                      Chọn sản phẩm
                      <tui-multi-select 
                        [(ngModel)]="selectedProductIds" 
                        (ngModelChange)="syncTargeting()" 
                        [stringify]="stringifyProduct">
                        <tui-data-list-wrapper 
                          *tuiDataList 
                          [items]="products" 
                          [itemContent]="prodContent">
                        </tui-data-list-wrapper>
                        <ng-template #prodContent let-item>{{ item.name }}</ng-template>
                      </tui-multi-select>
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
             <button tuiButton type="button" appearance="primary" size="l" [disabled]="hasBlockingConflict()" (click)="save.emit(rule)">{{ 'GLOBAL.SAVE' | transloco }}</button>
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

                <div class="validation-alert" *ngIf="previewNeedsMoreQty">
                  <tui-icon icon="@tui.info" size="s"></tui-icon>
                  <span>Preview: cần tối thiểu {{ rule.limitValue }} sản phẩm cho mặt hàng này (min SL).</span>
                </div>
                <div class="validation-alert" *ngIf="previewExceedsMaxQty">
                  <tui-icon icon="@tui.info" size="s"></tui-icon>
                  <span>Preview: vượt tối đa {{ rule.limitValue }} sản phẩm (max SL).</span>
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

    .grid-form-row { display: flex; gap: 20px; align-items: flex-start; }
    .grid-form-row-limit .grid-form-col { display: flex; flex-direction: column; min-width: 0; }
    .grid-form-row-limit .grid-form-col label[tuiLabel] { width: 100%; }
    .flex-1 { flex: 1; min-width: 0; }
    .flex-2 { flex: 2; min-width: 0; }

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
export class OrderLimitEditorComponent implements OnInit, OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly transloco = inject(TranslocoService);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly conflictCheck$ = new Subject<void>();

  @Input() rule!: Partial<OrderLimit>;
  /** Khi sửa: loại trừ rule hiện tại khỏi so khớp xung đột. */
  @Input() excludeRuleId: number | null = null;
  @Input() categories: any[] = [];
  @Input() products: any[] = [];
  @Input() customerGroups: any[] = [];
  @Input() stringifyCategory: any;
  @Input() stringifyProduct: any;
  @Input() stringifyGroup: any;

  @Output() save = new EventEmitter<Partial<OrderLimit>>();
  @Output() cancel = new EventEmitter<void>();

  /** Cảnh báo MOQ/MOV từ backend (trùng ưu tiên, trùng phạm vi khác ngưỡng, …). */
  conflicts: string[] = [];

  activeTab = 0;
  previewMode: 'mobile' | 'desktop' = 'desktop';
  
  typeOptions = ['MIN_ORDER_QUANTITY', 'MAX_ORDER_QUANTITY', 'MIN_ORDER_AMOUNT', 'MAX_ORDER_AMOUNT'];
  customerTypeOptions = ['ALL', 'GUEST', 'LOGGED_IN', 'GROUP'];
  productTypeOptions = ['ALL', 'CATEGORY', 'GROUP', 'SPECIFIC'];

  /** Nhãn trong select (ENUMS.GROUP là nhóm KH — không dùng cho phạm vi SP). */
  stringifyProductType = (v: string | null | undefined): string => {
    const t = v ?? 'ALL';
    switch (t) {
      case 'GROUP':
        return this.transloco.translate('ORDER_LIMIT.PRODUCT_TARGET_GROUP');
      case 'CATEGORY':
        return this.transloco.translate('ORDER_LIMIT.PRODUCT_TARGET_CATEGORY');
      case 'SPECIFIC':
        return this.transloco.translate('ORDER_LIMIT.PRODUCT_TARGET_SPECIFIC');
      case 'ALL':
        return this.transloco.translate('ENUMS.ALL');
      default:
        return t;
    }
  };

  get pickCategoriesLabelKey(): string {
    return this.rule?.applyProductType === 'GROUP'
      ? 'ORDER_LIMIT.PICK_CATEGORY_GROUP'
      : 'ORDER_LIMIT.PICK_CATEGORIES';
  }

  selectedCategoryIds: any[] = [];
  selectedProductIds: any[] = [];
  selectedGroupIds: any[] = [];

  /** Nhãn ô nhập theo loại quy tắc (tránh hiển thị \"tối thiểu\" khi đang cấu hình max). */
  get limitValueLabelKey(): string {
    const t = this.rule?.limitType || 'MIN_ORDER_QUANTITY';
    switch (t) {
      case 'MIN_ORDER_QTY':
      case 'MIN_ORDER_QUANTITY':
        return 'ORDER_LIMIT.VALUE_MIN_QTY';
      case 'MAX_ORDER_QTY':
      case 'MAX_ORDER_QUANTITY':
        return 'ORDER_LIMIT.VALUE_MAX_QTY';
      case 'MIN_ORDER_VALUE':
      case 'MIN_ORDER_AMOUNT':
        return 'ORDER_LIMIT.VALUE_MIN_AMOUNT';
      case 'MAX_ORDER_AMOUNT':
        return 'ORDER_LIMIT.VALUE_MAX_AMOUNT';
      default:
        return 'ORDER_LIMIT.VALUE_THRESHOLD';
    }
  }

  /** Mock preview qty = 4 */
  get previewNeedsMoreQty(): boolean {
    const v = Number(this.rule?.limitValue);
    if (!v || v <= 0) return false;
    const t = this.rule?.limitType;
    if (t !== 'MIN_ORDER_QUANTITY' && t !== 'MIN_ORDER_QTY') return false;
    if (this.rule?.limitLevel !== 'PER_PRODUCT' && this.rule?.limitLevel !== 'PER_VARIANT') return false;
    return 4 < v;
  }

  get previewExceedsMaxQty(): boolean {
    const v = Number(this.rule?.limitValue);
    if (!v || v <= 0) return false;
    const t = this.rule?.limitType;
    if (t !== 'MAX_ORDER_QUANTITY' && t !== 'MAX_ORDER_QTY') return false;
    if (this.rule?.limitLevel !== 'PER_PRODUCT' && this.rule?.limitLevel !== 'PER_VARIANT') return false;
    return 4 > v;
  }

  touchLimitForm(): void {
    this.cdr.markForCheck();
    this.scheduleConflictCheck();
  }

  private scheduleConflictCheck(): void {
    this.conflictCheck$.next();
  }

  /** Trùng priority với quy tắc khác — không cho lưu (đồng bộ thông báo BLOCKED phía trên). */
  hasBlockingConflict(): boolean {
    return this.conflicts.some(c => c.startsWith('BLOCKED'));
  }

  private runConflictCheck(): Observable<string[]> {
    this.syncTargeting({ skipConflictSchedule: true });
    const r = this.rule;
    const draft: Partial<OrderLimit> = {
      name: r.name ?? '',
      priority: r.priority ?? 0,
      status: r.status ?? 'ACTIVE',
      limitLevel: r.limitLevel ?? 'PER_PRODUCT',
      limitType: r.limitType ?? 'MIN_ORDER_QUANTITY',
      applyCustomerType: r.applyCustomerType ?? 'ALL',
      applyCustomerValue: r.applyCustomerValue ?? '{}',
      applyProductType: r.applyProductType ?? 'ALL',
      applyProductValue: r.applyProductValue ?? '{}',
      limitValue: typeof r.limitValue === 'number' ? r.limitValue : Number(r.limitValue) || 0,
    };
    return this.api.checkOrderLimitConflicts(draft, this.excludeRuleId).pipe(catchError(() => of([])));
  }

  onLimitValueChange(value: number | string | null): void {
    if (value === '' || value === null || value === undefined) {
      this.rule.limitValue = 0;
    } else {
      const n = typeof value === 'number' ? value : Number(value);
      this.rule.limitValue = Number.isFinite(n) ? n : 0;
    }
    this.touchLimitForm();
  }

  ngOnInit() {
    // Default values if not set
    if (!this.rule.limitLevel) this.rule.limitLevel = 'PER_PRODUCT';
    if (!this.rule.limitType) this.rule.limitType = 'MIN_ORDER_QUANTITY';
    if (this.rule.limitValue === undefined || this.rule.limitValue === null) {
      this.rule.limitValue = 0;
    } else if (typeof this.rule.limitValue !== 'number') {
      const n = Number(this.rule.limitValue);
      this.rule.limitValue = Number.isFinite(n) ? n : 0;
    }
    if (!this.rule.applyCustomerType) this.rule.applyCustomerType = 'ALL';
    if (!this.rule.applyProductType) this.rule.applyProductType = 'ALL';

    // Parse targeting data
    this.parseTargeting();

    this.conflictCheck$
      .pipe(
        debounceTime(400),
        switchMap(() => this.runConflictCheck()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(msgs => {
        this.conflicts = msgs;
        this.cdr.markForCheck();
      });
    this.scheduleConflictCheck();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rule'] && !changes['rule'].firstChange) {
      this.parseTargeting();
    }
    if (
      (changes['excludeRuleId'] && !changes['excludeRuleId'].firstChange) ||
      (changes['rule'] && !changes['rule'].firstChange)
    ) {
      this.scheduleConflictCheck();
    }
  }

  parseTargeting() {
    if (this.rule.applyCustomerType === 'GROUP' && this.rule.applyCustomerValue) {
      try {
        const val = JSON.parse(this.rule.applyCustomerValue);
        const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
        this.selectedGroupIds = this.customerGroups.filter(g => ids.includes(g.id));
      } catch (e) {}
    }

    if (
      (this.rule.applyProductType === 'CATEGORY' || this.rule.applyProductType === 'GROUP') &&
      this.rule.applyProductValue
    ) {
      try {
        const val = JSON.parse(this.rule.applyProductValue);
        const ids = val.categoryIds || (val.categoryId ? [val.categoryId] : []);
        this.selectedCategoryIds = this.categories.filter(c => ids.includes(c.id));
      } catch (e) {}
    }

    if (this.rule.applyProductType === 'SPECIFIC' && this.rule.applyProductValue) {
      try {
        const val = JSON.parse(this.rule.applyProductValue);
        const ids = val.productIds || (val.productId ? [val.productId] : []);
        this.selectedProductIds = this.products.filter(p => ids.includes(p.id));
      } catch (e) {}
    }
  }

  syncTargeting(options?: { skipConflictSchedule?: boolean }) {
    if (this.rule.applyCustomerType === 'GROUP') {
      this.rule.applyCustomerValue = JSON.stringify({ groupIds: this.selectedGroupIds.map(g => g.id) });
    } else {
      this.rule.applyCustomerValue = '{}';
    }

    if (this.rule.applyProductType === 'CATEGORY' || this.rule.applyProductType === 'GROUP') {
      this.rule.applyProductValue = JSON.stringify({ categoryIds: this.selectedCategoryIds.map(c => c.id) });
    } else if (this.rule.applyProductType === 'SPECIFIC') {
      this.rule.applyProductValue = JSON.stringify({ productIds: this.selectedProductIds.map(p => p.id) });
    } else {
      this.rule.applyProductValue = '{}';
    }
    if (!options?.skipConflictSchedule) {
      this.scheduleConflictCheck();
    }
  }
}
