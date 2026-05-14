import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { 
  AllCommunityModule, 
  ModuleRegistry, 
  ColDef, 
  GridApi, 
  GridReadyEvent 
} from 'ag-grid-community';
import { 
  TuiButton, 
  TuiTextfield, 
  TuiLabel, 
  TuiIcon,
  TuiAlertService,
  TuiDialogService
} from '@taiga-ui/core';
import { 
  TuiBadge,
  TuiRadio,
  TuiCheckbox
} from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, PricingRule } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { QuantityBreakEditorComponent } from './quantity-break-editor';
import { RuleConflictWarningComponent } from '../../shared/components/rule-conflict-warning/rule-conflict-warning';
import { ProductVariantPickerComponent } from '../../shared/components/product-variant-picker/product-variant-picker.component';
import { SelectedVariantsPreviewComponent } from '../../shared/components/selected-variants-preview/selected-variants-preview.component';
import { adminLifecycleStatusPillClass, escapeHtml } from '../../utils/admin-status-pills';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-pricing-rules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    TuiButton,
    TuiTextfieldControllerModule,
    TuiLabel,
    TuiIcon,
    TuiBadge,
    TuiTextfield,
    TuiRadio,
    TuiCheckbox,
    TranslocoModule,
    ActionRendererComponent,
    QuantityBreakEditorComponent,
    RuleConflictWarningComponent,
    ProductVariantPickerComponent,
    SelectedVariantsPreviewComponent,
  ],
  templateUrl: './pricing-rules.html',
  styleUrls: ['./pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingRulesComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';

  rowData: PricingRule[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  
  showForm = false;
  showDetails = false;
  editingId: number | null = null;
  selectedRule: PricingRule | null = null;
  
  formData: Partial<PricingRule> = {
    name: '',
    priority: 0,
    status: 'ACTIVE',
    ruleType: 'B2B_PRICE',
    applyCustomerType: 'ALL',
    applyCustomerValue: '{}',
    excludeCustomerOption: 'NONE',
    excludeCustomerValue: '{}',
    applyProductType: 'ALL',
    applyProductValue: '{}',
    excludeProductOption: 'NONE',
    excludeProductValue: '{}',
    actionConfig: '{}',
    discountValue: 0,
    discountType: 'PERCENTAGE'
  };
  
  // UI Helpers for B2B Price
  b2bDiscountType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE';
  b2bDiscountValue: number = 0;
  
  // Group selection helpers
  customerGroups: any[] = [];
  selectedCustomerGroupId: number | null = null;

  // Smart Picker helpers
  categories: any[] = [];
  selectedCategories: any[] = [];
  products: any[] = [];
  selectedProducts: any[] = [];
  /** Khi SPECIFIC + JSON có variantIds — đồng bộ với backend / giỏ hàng. */
  selectedVariantIds: number[] = [];
  variantPickerOpen = false;
  pickerInitialVariantIds: number[] = [];
  pickerInitialProductIdsOnly: number[] = [];
  selectedCustomerGroups: any[] = [];

  statusOptions = ['ACTIVE', 'INACTIVE'];
  ruleTypeOptions = ['B2B_PRICE', 'QUANTITY_BREAK'];
  customerTypeOptions = ['ALL', 'GUEST', 'LOGGED_IN', 'GROUP'];
  productTypeOptions = ['ALL', 'SPECIFIC', 'GROUP'];
  
  conflicts: string[] = [];

  readonly stringifyGroup = (item: any): string => item.name || '';
  readonly stringifyCategory = (item: any): string => item.name || '';
  readonly stringifyProduct = (item: any): string => item.name ? `${item.name} (${item.productCode})` : '';

  private langSub?: Subscription;

  constructor(
    private api: ApiService,
    private alerts: TuiAlertService,
    private dialogs: TuiDialogService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.updateColumnDefs();
    this.loadData();
    this.loadCustomerGroups();
    this.loadCategories();
    this.loadProducts();
    
    this.langSub = this.transloco.selectTranslation().subscribe(() => {
      this.localeText = this.languageService.currentLanguage === 'vi' ? AG_GRID_LOCALE_VI : {};
      
      if (this.gridApi) {
        this.gridApi.refreshHeader();
        this.gridApi.refreshCells();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  loadData(): void {
    this.api.getPricingRules().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
  }

  loadCustomerGroups(): void {
    this.api.getCustomerGroups().subscribe(groups => {
      this.customerGroups = groups;
      this.cdr.detectChanges();
    });
  }

  loadCategories(): void {
    this.api.getCategories().subscribe(cats => {
      this.categories = cats;
      this.cdr.detectChanges();
    });
  }

  loadProducts(): void {
    this.api.getProducts(undefined, true).subscribe(prods => {
      this.products = prods;
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 80, pinned: 'left' },
      { 
        field: 'name', 
        headerValueGetter: () => this.transloco.translate('RULE.NAME'), 
        width: 250,
        pinned: 'left',
        tooltipValueGetter: (params: any) => params.value
      },
      {
        headerValueGetter: () => "Chiết khấu",
        width: 150,
        valueGetter: (params) => {
          if (params.data.ruleType === 'B2B_PRICE') {
            return `${params.data.discountValue}${params.data.discountType === 'PERCENTAGE' ? '%' : ' VNĐ'}`;
          }
          return params.data.ruleType === 'QUANTITY_BREAK' ? 'Theo số lượng' : '-';
        },
        cellStyle: { color: '#10b981', fontWeight: 'bold' }
      },
      {
        field: 'applyProductType',
        headerValueGetter: () => "Loại sản phẩm áp dụng",
        width: 180,
        valueFormatter: (params) => {
          const val = params.value === 'CATEGORY' ? 'GROUP' : params.value;
          return val;
        }
      },
      {
        field: 'applyCustomerType',
        headerValueGetter: () => "Loại người dùng",
        width: 150,
        valueFormatter: (params) => params.value
      },
      { 
        field: 'priority', 
        headerValueGetter: () => this.transloco.translate('RULE.PRIORITY'), 
        width: 100 
      },
      { 
        field: 'status', 
        headerValueGetter: () => this.transloco.translate('RULE.STATUS'), 
        width: 130,
        cellRenderer: (params: any) => {
          const v = params.value;
          const text = v === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động';
          return `<span class="${adminLifecycleStatusPillClass(v)}">${escapeHtml(text)}</span>`;
        }
      },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 260,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: PricingRule) => this.onView(data),
          onEdit: (data: PricingRule) => this.onEdit(data),
          onDelete: (data: PricingRule) => this.onDelete(data)
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  onView(rule: PricingRule): void {
    this.selectedRule = rule;
    this.showDetails = true;
    this.showForm = false;
    this.cdr.detectChanges();
  }

  onCloseDetails(): void {
    this.showDetails = false;
    this.selectedRule = null;
  }

  parseActionConfig(config: string | undefined): any {
    if (!config) return {};
    try {
      return JSON.parse(config);
    } catch (e) {
      return {};
    }
  }

  getParsedBrackets(rule: PricingRule): any[] {
    const config = this.parseActionConfig(rule.actionConfig);
    return config.brackets || [];
  }

  getCustomerGroupNames(rule: PricingRule): string {
    if (rule.applyCustomerType !== 'GROUP' || !rule.applyCustomerValue) return '';
    try {
      const val = JSON.parse(rule.applyCustomerValue);
      const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
      const names = this.customerGroups.filter(g => ids.includes(g.id)).map(g => g.name);
      return names.length ? names.join(', ') : `(IDs: ${ids.join(', ')})`;
    } catch { return rule.applyCustomerValue; }
  }

  getProductTargetNames(rule: PricingRule): string {
    if (!rule.applyProductValue || rule.applyProductType === 'ALL') return '';
    try {
      const val = JSON.parse(rule.applyProductValue);
      if (rule.applyProductType === 'CATEGORY' || rule.applyProductType === 'GROUP') {
        const ids = val.categoryIds || (val.categoryId ? [val.categoryId] : []);
        const names = this.categories.filter(c => ids.includes(c.id)).map(c => c.name);
        return names.length ? names.join(', ') : `(IDs: ${ids.join(', ')})`;
      } else if (rule.applyProductType === 'SPECIFIC') {
        const vids: number[] = Array.isArray(val.variantIds) ? val.variantIds : [];
        const ids = val.productIds || (val.productId ? [val.productId] : []);
        const names = this.products.filter(p => ids.includes(p.id)).map(p => p.name);
        if (vids.length) {
          const suffix = names.length ? names.join(', ') : `productIds: ${ids.join(', ')}`;
          return `${vids.length} biến thể (${suffix})`;
        }
        return names.length ? names.join(', ') : `(IDs: ${ids.join(', ')})`;
      }
    } catch { return rule.applyProductValue; }
    return '';
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = {
      name: '',
      priority: 0,
      status: 'ACTIVE',
      ruleType: 'B2B_PRICE',
      applyCustomerType: 'ALL',
      applyCustomerValue: '{}',
      excludeCustomerOption: 'NONE',
      excludeCustomerValue: '{}',
      applyProductType: 'ALL',
      applyProductValue: '{}',
      excludeProductOption: 'NONE',
      excludeProductValue: '{}',
      actionConfig: '{}',
      discountValue: 0,
      discountType: 'PERCENTAGE'
    };
    this.b2bDiscountType = 'PERCENTAGE';
    this.b2bDiscountValue = 0;
    this.selectedCustomerGroups = [];
    this.selectedCategories = [];
    this.selectedProducts = [];
    this.selectedVariantIds = [];
    this.conflicts = [];

    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onEdit(rule: PricingRule): void {
    this.editingId = rule.id;
    this.formData = { ...rule };
    this.selectedVariantIds = [];
    
    // Extract B2B helpers
    if (rule.ruleType === 'B2B_PRICE') {
      this.b2bDiscountType = (rule.discountType as any) || 'PERCENTAGE';
      this.b2bDiscountValue = rule.discountValue || 0;
    }
    
    // Extract Group selection
    if (rule.applyCustomerType === 'GROUP' && rule.applyCustomerValue) {
      try {
        const val = JSON.parse(rule.applyCustomerValue);
        const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
        this.selectedCustomerGroups = this.customerGroups.filter(g => ids.includes(g.id));
      } catch (e) {}
    }

    // Extract Product selection
    if ((rule.applyProductType === 'CATEGORY' || rule.applyProductType === 'GROUP') && rule.applyProductValue) {
      try {
        const val = JSON.parse(rule.applyProductValue);
        const ids = val.categoryIds || (val.categoryId ? [val.categoryId] : []);
        this.selectedCategories = this.categories.filter(c => ids.includes(c.id));
      } catch (e) {}
    } else if (rule.applyProductType === 'SPECIFIC' && rule.applyProductValue) {
      try {
        const val = JSON.parse(rule.applyProductValue);
        const ids = val.productIds || (val.productId ? [val.productId] : []);
        this.selectedProducts = this.products.filter(p => ids.includes(p.id));
        this.selectedVariantIds = Array.isArray(val.variantIds) ? [...val.variantIds] : [];
      } catch (e) {}
    }
    
    this.conflicts = [];
    this.checkConflicts();

    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  checkConflicts(): void {
    // Construct RuleTarget for conflict checking
    let customerVal = '{}';
    if (this.formData.applyCustomerType === 'GROUP') {
      customerVal = JSON.stringify({ groupIds: this.selectedCustomerGroups.map(g => g.id) });
    }

    let productVal = '{}';
    const type = this.formData.applyProductType;
    if (type === 'GROUP' || type === 'CATEGORY') {
      productVal = JSON.stringify({ categoryIds: this.selectedCategories.map(c => c.id) });
    } else if (type === 'SPECIFIC') {
      const pids = [...new Set(this.selectedProducts.map(p => p.id))].sort((a, b) => a - b);
      const vids = [...new Set(this.selectedVariantIds)].sort((a, b) => a - b);
      if (vids.length > 0) {
        productVal = JSON.stringify({ productIds: pids, variantIds: vids });
      } else {
        productVal = JSON.stringify({ productIds: pids });
      }
    }

    const target = {
      name: this.formData.name || 'New Rule',
      applyProductType: this.formData.applyProductType || 'ALL',
      applyProductValue: productVal,
      applyCustomerType: this.formData.applyCustomerType || 'ALL',
      applyCustomerValue: customerVal,
      priority: this.formData.priority || 0
    };

    this.api.checkRuleConflicts('PRICING', target).subscribe(res => {
      // Không hiển thị cảnh báo trùng mức ưu tiên ở panel warning.
      // Quy tắc này chỉ chặn bằng lỗi khi bấm Lưu (onSubmit).
      this.conflicts = (res || []).filter(msg => !/priority|ưu tiên/i.test(String(msg)));
      this.cdr.detectChanges();
    });
  }

  onDelete(rule: PricingRule): void {
    this.deleteTargetName = rule.name;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deletePricingRule(rule.id).subscribe(() => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSubmit(): void {
    const ruleName = String(this.formData.name || '').trim();
    if (!ruleName) {
      this.alerts.open('Vui lòng nhập tên quy tắc.', { appearance: 'error' }).subscribe();
      return;
    }
    this.formData.name = ruleName;

    const priorityNum = Number(this.formData.priority);
    if (!Number.isFinite(priorityNum) || priorityNum < 0) {
      this.alerts.open('Vui lòng nhập mức độ ưu tiên hợp lệ (>= 0).', { appearance: 'error' }).subscribe();
      return;
    }
    this.formData.priority = priorityNum;

    // 1. Handle Group selection to JSON
    if (this.formData.applyCustomerType === 'GROUP') {
      this.formData.applyCustomerValue = JSON.stringify({ groupIds: this.selectedCustomerGroups.map(g => g.id) });
    }

    // Handle Product selection
    if (this.formData.applyProductType === 'GROUP' || this.formData.applyProductType === 'CATEGORY') {
      this.formData.applyProductType = 'CATEGORY'; // Maintain consistency for backend
      this.formData.applyProductValue = JSON.stringify({ categoryIds: this.selectedCategories.map(c => c.id) });
    } else if (this.formData.applyProductType === 'SPECIFIC') {
      const pids = [...new Set(this.selectedProducts.map(p => p.id))].sort((a, b) => a - b);
      const vids = [...new Set(this.selectedVariantIds)].sort((a, b) => a - b);
      if (vids.length > 0) {
        this.formData.applyProductValue = JSON.stringify({ productIds: pids, variantIds: vids });
      } else {
        this.formData.applyProductValue = JSON.stringify({ productIds: pids });
      }
    }

    // 2. Handle B2B Price config to JSON
    if (this.formData.ruleType === 'B2B_PRICE') {
      this.formData.discountType = this.b2bDiscountType;
      this.formData.discountValue = this.b2bDiscountValue;
      const discountNum = Number(this.b2bDiscountValue);
      if (!Number.isFinite(discountNum) || discountNum <= 0) {
        this.alerts.open('Vui lòng nhập % giảm/giá trị giảm cụ thể lớn hơn 0.', { appearance: 'error' }).subscribe();
        return;
      }
      if (this.b2bDiscountType === 'PERCENTAGE' && discountNum > 100) {
        this.alerts.open('Giảm theo % phải trong khoảng 0 - 100.', { appearance: 'error' }).subscribe();
        return;
      }
      this.formData.discountValue = discountNum;
      this.formData.actionConfig = JSON.stringify({
        discountType: this.b2bDiscountType,
        discountValue: discountNum
      });
    } else if (this.formData.ruleType === 'QUANTITY_BREAK') {
      let parsed: any = {};
      try {
        parsed = this.formData.actionConfig ? JSON.parse(this.formData.actionConfig) : {};
      } catch {
        parsed = {};
      }
      const brackets = Array.isArray(parsed?.brackets) ? parsed.brackets : [];
      if (!brackets.length) {
        this.alerts.open('Giảm giá theo số lượng phải có ít nhất 1 mức giảm.', { appearance: 'error' }).subscribe();
        return;
      }
      const invalid = brackets.some((b: any) => {
        const min = Number(b?.min);
        const max = b?.max == null ? null : Number(b.max);
        const discount = Number(b?.discount);
        if (!Number.isFinite(min) || min < 1) return true;
        if (max != null && (!Number.isFinite(max) || max < min)) return true;
        if (!Number.isFinite(discount) || discount <= 0 || discount > 100) return true;
        return false;
      });
      if (invalid) {
        this.alerts.open('Các mức giảm theo số lượng chưa hợp lệ (min/max/% giảm).', { appearance: 'error' }).subscribe();
        return;
      }
    }

    // Priority duplicate: không hiện cảnh báo BLOCKED trên form, chỉ báo lỗi khi bấm Lưu.
    const priority = this.formData.priority || 0;
    const duplicate = this.rowData.find(r => r.priority === priority && r.id !== this.editingId);
    if (duplicate) {
      this.alerts.open(`Mức độ ưu tiên đã tồn tại (đang dùng bởi "${duplicate.name}").`, {
        appearance: 'error',
      }).subscribe();
      return;
    }

    const action = this.editingId 
      ? this.api.updatePricingRule(this.editingId, this.formData)
      : this.api.createPricingRule(this.formData);

    action.subscribe(() => {
      const msg = this.editingId 
        ? this.transloco.translate('GLOBAL.UPDATE_SUCCESS') 
        : this.transloco.translate('GLOBAL.CREATE_SUCCESS');
      this.alerts.open(msg, { appearance: 'success' }).subscribe();
      this.showForm = false;
      this.loadData();
    });
  }

  cancel(): void {
    this.showForm = false;
  }

  productApplyTypeLabel(opt: string | null | undefined): string {
    const v = opt || 'ALL';
    if (v === 'GROUP') {
      return this.transloco.translate('ORDER_LIMIT.PRODUCT_TARGET_GROUP');
    }
    if (v === 'SPECIFIC') {
      return this.transloco.translate('ENUMS.SPECIFIC_PRODUCT');
    }
    return this.transloco.translate('ENUMS.' + v);
  }

  customerApplyTypeLabel(opt: string | null | undefined): string {
    const v = opt || 'ALL';
    if (v === 'SPECIFIC') {
      return this.transloco.translate('ENUMS.SPECIFIC_CUSTOMER');
    }
    return this.transloco.translate('ENUMS.' + v);
  }

  isCustomerGroupSelected(g: any): boolean {
    return this.selectedCustomerGroups.some(x => x.id === g.id);
  }

  toggleCustomerGroup(g: any, checked: boolean): void {
    if (checked) {
      if (!this.isCustomerGroupSelected(g)) {
        this.selectedCustomerGroups = [...this.selectedCustomerGroups, g];
      }
    } else {
      this.selectedCustomerGroups = this.selectedCustomerGroups.filter(x => x.id !== g.id);
    }
    this.checkConflicts();
  }

  isCategorySelected(c: any): boolean {
    return this.selectedCategories.some(x => x.id === c.id);
  }

  toggleCategory(c: any, checked: boolean): void {
    if (checked) {
      if (!this.isCategorySelected(c)) {
        this.selectedCategories = [...this.selectedCategories, c];
      }
    } else {
      this.selectedCategories = this.selectedCategories.filter(x => x.id !== c.id);
    }
    this.checkConflicts();
  }

  openVariantPicker(): void {
    this.pickerInitialVariantIds = [...this.selectedVariantIds];
    this.pickerInitialProductIdsOnly = this.selectedProducts.map(p => p.id);
    this.variantPickerOpen = true;
    this.cdr.markForCheck();
  }

  onVariantPickerConfirmed(ev: { variantIds: number[]; productIds: number[] }): void {
    this.selectedVariantIds = ev.variantIds;
    this.selectedProducts = this.products.filter(p => ev.productIds.includes(p.id));
    this.checkConflicts();
    this.cdr.markForCheck();
  }
}
