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
  TuiBadge,
  TuiInputNumber
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
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
    TuiInputNumber,
    TuiSelectModule,
    TuiDataList,
    TuiDataListWrapper,
    TuiTextfieldControllerModule,
    TuiLabel,
    TuiIcon,
    TuiBadge,
    TuiTextfield,
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
  selectedCategoryId: number | null = null;
  products: any[] = [];
  selectedProductId: number | null = null;

  statusOptions = ['ACTIVE', 'INACTIVE'];
  ruleTypeOptions = ['B2B_PRICE', 'QUANTITY_BREAK'];
  customerTypeOptions = ['ALL', 'GUEST', 'LOGGED_IN', 'GROUP'];
  productTypeOptions = ['ALL', 'CATEGORY', 'SPECIFIC'];
  
  conflicts: string[] = [];

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
      { field: 'id', headerName: 'ID', width: 100, pinned: 'left' },
      { 
        field: 'name', 
        headerValueGetter: () => this.transloco.translate('RULE.NAME'), 
        width: 300,
        pinned: 'left',
        tooltipValueGetter: (params: any) => params.value
      },
      { 
        field: 'priority', 
        headerValueGetter: () => this.transloco.translate('RULE.PRIORITY'), 
        width: 100 
      },
      { 
        field: 'status', 
        headerValueGetter: () => this.transloco.translate('RULE.STATUS'), 
        width: 120,
        valueFormatter: (params: any) => this.transloco.translate('ENUMS.' + params.value)
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
    this.selectedCustomerGroupId = null;
    this.selectedCategoryId = null;
    this.selectedProductId = null;
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
        this.selectedCustomerGroupId = val.groupId || null;
      } catch (e) {}
    }

    // Extract Product selection
    if (rule.applyProductType === 'CATEGORY' && rule.applyProductValue) {
      try {
        const val = JSON.parse(rule.applyProductValue);
        this.selectedCategoryId = val.categoryId || null;
      } catch (e) {}
    } else if (rule.applyProductType === 'SPECIFIC' && rule.applyProductValue) {
      try {
        const val = JSON.parse(rule.applyProductValue);
        this.selectedProductId = val.productId || null;
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
    if (this.formData.applyCustomerType === 'GROUP' && this.selectedCustomerGroupId) {
      customerVal = JSON.stringify({ groupIds: [this.selectedCustomerGroupId] });
    }

    let productVal = '{}';
    if (this.formData.applyProductType === 'CATEGORY' && this.selectedCategoryId) {
      productVal = JSON.stringify({ categoryIds: [this.selectedCategoryId] });
    } else if (this.formData.applyProductType === 'SPECIFIC' && this.selectedProductId) {
      productVal = JSON.stringify({ productIds: [this.selectedProductId] });
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
    if (this.formData.applyCustomerType === 'GROUP' && this.selectedCustomerGroupId) {
      this.formData.applyCustomerValue = JSON.stringify({ groupId: this.selectedCustomerGroupId });
    }

    // Handle Product selection
    if (this.formData.applyProductType === 'CATEGORY' && this.selectedCategoryId) {
      this.formData.applyProductValue = JSON.stringify({ categoryId: this.selectedCategoryId });
    } else if (this.formData.applyProductType === 'SPECIFIC' && this.selectedProductId) {
      this.formData.applyProductValue = JSON.stringify({ productId: this.selectedProductId });
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
