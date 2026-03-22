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
  TuiInputNumber, 
  TuiMultiSelect
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, ShippingRule, Category, Product, CustomerGroup } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { RuleConflictWarningComponent } from '../../shared/components/rule-conflict-warning/rule-conflict-warning';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-shipping-rules',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, TuiInputNumber, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper, TuiMultiSelect,
    TuiTextfieldControllerModule, TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, TuiTextfield,
    RuleConflictWarningComponent
  ],
  templateUrl: './shipping-rules.html',
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShippingRulesComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';

  rowData: ShippingRule[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};

  showForm = false;
  showDetails = false;
  editingId: number | null = null;
  selectedRule: ShippingRule | null = null;

  formData: Partial<ShippingRule> = {
    name: '', priority: 0, status: 'ACTIVE', baseOn: 'AMOUNT_RANGE', rateRanges: '[]',
    applyCustomerType: 'ALL', applyCustomerValue: '{}',
    applyProductType: 'ALL', applyProductValue: '{}',
    discountType: 'FIXED', discountValue: 0
  };

  categories: Category[] = [];
  products: Product[] = [];
  customerGroups: CustomerGroup[] = [];
  
  selectedCategoryIds: Category[] = [];
  selectedProductIds: Product[] = [];
  selectedGroupIds: CustomerGroup[] = [];

  selectedCustomerGroupId: number | null = null; // Deprecated, keep for now to avoid break

  statusOptions = ['ACTIVE', 'INACTIVE'];
  baseOptions = ['QUANTITY_RANGE', 'AMOUNT_RANGE'];
  customerTypeOptions = ['ALL', 'GUEST', 'LOGGED_IN', 'GROUP'];
  discountTypeOptions = ['FREE', 'FLAT', 'PERCENTAGE'];

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
    this.loadCommonData();
    this.langSub = this.transloco.selectTranslation().subscribe(() => {
      this.localeText = this.languageService.currentLanguage === 'vi' ? AG_GRID_LOCALE_VI : {};
      if (this.gridApi) {
        this.gridApi.refreshHeader();
        this.gridApi.refreshCells();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void { this.langSub?.unsubscribe(); }

  loadData(): void {
    this.api.getShippingRules().subscribe(data => {
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

  loadCommonData(): void {
    this.api.getCategories().subscribe(cats => {
      this.categories = cats;
      this.cdr.detectChanges();
    });
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
      { field: 'baseOn', headerValueGetter: () => this.transloco.translate('RULE.BASE_ON'), width: 160, valueFormatter: (params: any) => this.transloco.translate('ENUMS.' + params.value) },
      { field: 'priority', headerValueGetter: () => this.transloco.translate('RULE.PRIORITY'), width: 100 },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 260,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: ShippingRule) => this.onView(data),
          onEdit: (data: ShippingRule) => this.onEdit(data),
          onDelete: (data: ShippingRule) => this.onDelete(data)
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  onView(rule: ShippingRule): void {
    this.selectedRule = rule;
    this.showDetails = true;
    this.showForm = false;
    this.cdr.detectChanges();
  }

  onCloseDetails(): void {
    this.showDetails = false;
    this.selectedRule = null;
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = { 
      name: '', priority: 0, status: 'ACTIVE', baseOn: 'AMOUNT_RANGE', 
      rateRanges: '[{"min":0, "max":1000000, "rate":50000}]',
      applyCustomerType: 'ALL', applyCustomerValue: '{}',
      applyProductType: 'ALL', applyProductValue: '{}',
      discountType: 'FIXED', discountValue: 0
    };
    this.selectedCategoryIds = [];
    this.selectedProductIds = [];
    this.selectedGroupIds = [];
    this.conflicts = [];
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onEdit(data: ShippingRule): void {
    this.editingId = data.id;
    this.formData = { ...data };
    
    if (data.applyCustomerType === 'GROUP' && data.applyCustomerValue) {
      try {
        const val = JSON.parse(data.applyCustomerValue);
        const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
        this.selectedGroupIds = this.customerGroups.filter(g => ids.includes(g.id));
      } catch (e) {}
    }

    if (data.applyProductType === 'CATEGORY' && data.applyProductValue) {
      try {
        const val = JSON.parse(data.applyProductValue);
        const ids = val.categoryIds || [];
        this.selectedCategoryIds = this.categories.filter(c => ids.includes(c.id));
      } catch (e) {}
    }

    if (data.applyProductType === 'SPECIFIC' && data.applyProductValue) {
      try {
        const val = JSON.parse(data.applyProductValue);
        const ids = val.productIds || [];
        this.selectedProductIds = this.products.filter(p => ids.includes(p.id));
      } catch (e) {}
    }

    this.conflicts = [];
    this.checkConflicts();
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  checkConflicts(): void {
    const target = {
      name: this.formData.name || 'New Rule',
      applyProductType: this.formData.applyProductType || 'ALL',
      applyProductValue: this.formData.applyProductType === 'CATEGORY' 
        ? JSON.stringify({ categoryIds: this.selectedCategoryIds.map(c => c.id) })
        : (this.formData.applyProductType === 'SPECIFIC' 
          ? JSON.stringify({ productIds: this.selectedProductIds.map(p => p.id) }) 
          : '{}'),
      applyCustomerType: this.formData.applyCustomerType || 'ALL',
      applyCustomerValue: this.formData.applyCustomerType === 'GROUP'
        ? JSON.stringify({ groupIds: this.selectedGroupIds.map(g => g.id) })
        : '{}',
      priority: this.formData.priority || 0
    };

    this.api.checkRuleConflicts('SHIPPING', target).subscribe(res => {
      this.conflicts = res;
      this.cdr.detectChanges();
    });
  }

  onDelete(rule: ShippingRule): void {
    this.deleteTargetName = rule.name;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deleteShippingRule(rule.id).subscribe(() => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSubmit(): void {
    // Process Targeting values
    if (this.formData.applyCustomerType === 'GROUP') {
      this.formData.applyCustomerValue = JSON.stringify({ groupIds: this.selectedGroupIds.map(g => g.id) });
    } else {
      this.formData.applyCustomerValue = '{}';
    }

    if (this.formData.applyProductType === 'CATEGORY') {
      this.formData.applyProductValue = JSON.stringify({ categoryIds: this.selectedCategoryIds.map(c => c.id) });
    } else if (this.formData.applyProductType === 'SPECIFIC') {
      this.formData.applyProductValue = JSON.stringify({ productIds: this.selectedProductIds.map(p => p.id) });
    } else {
      this.formData.applyProductValue = '{}';
    }

    const action = this.editingId ? this.api.updateShippingRule(this.editingId, this.formData) : this.api.createShippingRule(this.formData);
    action.subscribe(() => { 
      const msg = this.editingId 
        ? this.transloco.translate('GLOBAL.UPDATE_SUCCESS') 
        : this.transloco.translate('GLOBAL.CREATE_SUCCESS');
      this.alerts.open(msg, { appearance: 'success' }).subscribe();
      this.showForm = false; 
      this.loadData(); 
    });
  }

  cancel(): void { this.showForm = false; }
}
