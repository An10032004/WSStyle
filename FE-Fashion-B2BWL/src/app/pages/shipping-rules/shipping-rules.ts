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
    CommonModule, FormsModule, AgGridAngular, TuiButton, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper, TuiMultiSelectModule,
    TuiTextfieldControllerModule, TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, TuiTextfield,
    RuleConflictWarningComponent, TuiBadge
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
  rateRangesList: any[] = [];

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

  stringifyGroup = (item: CustomerGroup) => item.name || '';
  stringifyCategory = (item: Category) => item.name || '';
  stringifyProduct = (item: Product) => item.name || '';

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
    this.cdr.detectChanges();
  }

  getCustomerGroupNames(rule: ShippingRule): string {
    if (rule.applyCustomerType !== 'GROUP' || !rule.applyCustomerValue) return '';
    try {
      const val = JSON.parse(rule.applyCustomerValue);
      const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
      const names = this.customerGroups.filter(g => ids.includes(g.id)).map(g => g.name);
      return names.length ? names.join(', ') : `(IDs: ${ids.join(', ')})`;
    } catch { return rule.applyCustomerValue; }
  }

  getProductTargetNames(rule: ShippingRule): string {
    if (!rule.applyProductValue || rule.applyProductType === 'ALL') return '';
    try {
      const val = JSON.parse(rule.applyProductValue);
      if (rule.applyProductType === 'CATEGORY') {
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

  parseRateRanges(json: string | undefined): any[] {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = { 
      name: '', 
      priority: 0, 
      status: 'ACTIVE', 
      baseOn: 'AMOUNT_RANGE', 
      rateRanges: '[]',
      applyCustomerType: 'ALL', 
      applyCustomerValue: '{}',
      applyProductType: 'ALL', 
      applyProductValue: '{}',
      discountType: 'FIXED', 
      discountValue: 0
    };
    this.rateRangesList = [{ min: 0, max: 1000000, rate: 30000 }];
    this.selectedCategoryIds = [];
    this.selectedProductIds = [];
    this.selectedGroupIds = [];
    this.conflicts = [];
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onEdit(rule: ShippingRule): void {
    this.editingId = rule.id;
    this.formData = { ...rule };
    
    // Parse Rate Ranges
    try {
      const ranges = JSON.parse(rule.rateRanges || '[]');
      this.rateRangesList = ranges.map((r: any) => ({
        min: r.min ?? r.from ?? 0,
        max: r.max ?? r.to ?? 0,
        rate: r.rate ?? 0
      }));
    } catch {
      this.rateRangesList = [];
    }

    if (rule.applyCustomerType === 'GROUP' && rule.applyCustomerValue) {
      try {
        const val = JSON.parse(rule.applyCustomerValue);
        const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
        this.selectedGroupIds = this.customerGroups.filter(g => ids.includes(g.id));
      } catch (e) {}
    }

    if (rule.applyProductType === 'CATEGORY' && rule.applyProductValue) {
      try {
        const val = JSON.parse(rule.applyProductValue);
        const ids = val.categoryIds || [];
        this.selectedCategoryIds = this.categories.filter(c => ids.includes(c.id));
      } catch (e) {}
    }

    if (rule.applyProductType === 'SPECIFIC' && rule.applyProductValue) {
      try {
        const val = JSON.parse(rule.applyProductValue);
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

  addRateRange(): void {
    const lastMax = this.rateRangesList.length > 0 ? this.rateRangesList[this.rateRangesList.length - 1].max : 0;
    this.rateRangesList.push({ min: lastMax + 1, max: lastMax + 1000000, rate: 0 });
    this.cdr.detectChanges();
  }

  removeRateRange(index: number): void {
    this.rateRangesList.splice(index, 1);
    this.cdr.detectChanges();
  }

  syncRateRanges(): void {
    this.formData.rateRanges = JSON.stringify(this.rateRangesList.map(r => ({
      from: Number(r.min),
      to: Number(r.max),
      rate: Number(r.rate)
    })));
  }

  checkConflicts(): void {
    this.syncRateRanges();
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
            this.cdr.detectChanges();
          });
        }
      });
  }

  onSubmit(): void {
    this.syncRateRanges();

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
      this.cdr.detectChanges();
    });
  }

  cancel(): void { 
    this.showForm = false; 
    this.cdr.detectChanges();
  }
}
