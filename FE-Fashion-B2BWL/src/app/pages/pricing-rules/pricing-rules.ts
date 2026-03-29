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
  TuiDataList,
  TuiAlertService,
  TuiDialogService
} from '@taiga-ui/core';
import { 
  TuiDataListWrapper, 
  TuiBadge
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiMultiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, PricingRule } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { QuantityBreakEditorComponent } from './quantity-break-editor';
import { RuleConflictWarningComponent } from '../../shared/components/rule-conflict-warning/rule-conflict-warning';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-pricing-rules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    TuiButton,
    TuiSelectModule,
    TuiDataList,
    TuiDataListWrapper,
    TuiTextfieldControllerModule,
    TuiLabel,
    TuiIcon,
    TuiBadge,
    TuiTextfield,
    TuiMultiSelectModule,
    TranslocoModule,
    ActionRendererComponent,
    QuantityBreakEditorComponent,
    RuleConflictWarningComponent
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
    this.api.getProducts().subscribe(prods => {
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
          const color = params.value === 'ACTIVE' ? 'success' : 'neutral';
          const text = params.value === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động';
          return `<span style="padding: 4px 12px; border-radius: 16px; background: ${params.value === 'ACTIVE' ? '#ecfdf5' : '#f3f4f6'}; color: ${params.value === 'ACTIVE' ? '#10b981' : '#6b7280'}; font-size: 12px; font-weight: 600;">${text}</span>`;
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
        const ids = val.productIds || (val.productId ? [val.productId] : []);
        const names = this.products.filter(p => ids.includes(p.id)).map(p => p.name);
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
    this.conflicts = [];

    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onEdit(rule: PricingRule): void {
    this.editingId = rule.id;
    this.formData = { ...rule };
    
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
      productVal = JSON.stringify({ productIds: this.selectedProducts.map(p => p.id) });
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
      this.conflicts = res;
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
    // 1. Handle Group selection to JSON
    if (this.formData.applyCustomerType === 'GROUP') {
      this.formData.applyCustomerValue = JSON.stringify({ groupIds: this.selectedCustomerGroups.map(g => g.id) });
    }

    // Handle Product selection
    if (this.formData.applyProductType === 'GROUP' || this.formData.applyProductType === 'CATEGORY') {
      this.formData.applyProductType = 'CATEGORY'; // Maintain consistency for backend
      this.formData.applyProductValue = JSON.stringify({ categoryIds: this.selectedCategories.map(c => c.id) });
    } else if (this.formData.applyProductType === 'SPECIFIC') {
      this.formData.applyProductValue = JSON.stringify({ productIds: this.selectedProducts.map(p => p.id) });
    }

    // 2. Handle B2B Price config to JSON
    if (this.formData.ruleType === 'B2B_PRICE') {
      this.formData.discountType = this.b2bDiscountType;
      this.formData.discountValue = this.b2bDiscountValue;
      this.formData.actionConfig = JSON.stringify({
        discountType: this.b2bDiscountType,
        discountValue: this.b2bDiscountValue
      });
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
}
