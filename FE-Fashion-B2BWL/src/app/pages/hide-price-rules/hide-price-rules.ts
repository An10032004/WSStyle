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
  TuiInputNumber,
  TuiCheckbox
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiMultiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, HidePriceRule, CustomerGroup, Category, Product } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-hide-price-rules',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, TuiInputNumber, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper, TuiBadge, TuiCheckbox,
    TuiTextfieldControllerModule, TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, 
    TuiTextfield, TuiMultiSelectModule
  ],
  templateUrl: './hide-price-rules.html',
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HidePriceRulesComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';

  rowData: HidePriceRule[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  
  showForm = false;
  showDetails = false;
  editingId: number | null = null;
  selectedRule: HidePriceRule | null = null;
  
  formData: Partial<HidePriceRule> = {
    name: '', priority: 0, status: 'ACTIVE', hidePrice: true, hideAddToCart: true, replacementText: '',
    applyCustomerType: 'ALL', applyCustomerValue: '{}', applyProductType: 'ALL', applyProductValue: '{}'
  };

  statusOptions = ['ACTIVE', 'INACTIVE'];
  customerTypeOptions = ['ALL', 'GUEST', 'LOGGED_IN', 'GROUP'];
  productTypeOptions = ['ALL', 'CATEGORY', 'SPECIFIC'];

  // Targeting helpers
  customerGroups: CustomerGroup[] = [];
  categories: Category[] = [];
  products: Product[] = [];
  
  selectedCustomerGroups: CustomerGroup[] = [];
  selectedCategories: Category[] = [];
  selectedProducts: Product[] = [];

  readonly stringifyGroup = (item: CustomerGroup): string => item.name || '';
  readonly stringifyCategory = (item: Category): string => item.name || '';
  readonly stringifyProduct = (item: Product): string => item.name ? `${item.name} (${item.productCode})` : '';

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

  ngOnDestroy(): void { this.langSub?.unsubscribe(); }

  loadData(): void {
    this.api.getHidePriceRules().subscribe(data => {
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
      { field: 'priority', headerValueGetter: () => this.transloco.translate('RULE.PRIORITY'), width: 100 },
      { 
        field: 'hidePrice', 
        headerValueGetter: () => this.transloco.translate('RULE.HIDE_PRICE'), 
        width: 120,
        cellRenderer: (params: any) => params.value ? '✅' : '❌'
      },
      { 
        field: 'status', 
        headerValueGetter: () => this.transloco.translate('RULE.STATUS'), 
        width: 120,
        valueFormatter: (params: any) => this.transloco.translate('ENUMS.' + params.value)
      },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 200,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: HidePriceRule) => this.onView(data),
          onEdit: (data: HidePriceRule) => this.onEdit(data),
          onDelete: (data: HidePriceRule) => this.onDelete(data)
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  onView(rule: HidePriceRule): void {
    this.selectedRule = rule;
    this.showDetails = true;
    this.showForm = false;
    this.cdr.detectChanges();
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = {
      name: '', priority: 0, status: 'ACTIVE', hidePrice: true, hideAddToCart: true, replacementText: '',
      applyCustomerType: 'ALL', applyCustomerValue: '{}', applyProductType: 'ALL', applyProductValue: '{}'
    };
    this.selectedCustomerGroups = [];
    this.selectedCategories = [];
    this.selectedProducts = [];
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onEdit(rule: HidePriceRule): void {
    this.editingId = rule.id;
    this.formData = { ...rule };
    
    // Parse Customer selection
    this.selectedCustomerGroups = [];
    if (this.formData.applyCustomerType === 'GROUP' && this.formData.applyCustomerValue) {
      try {
        const val = JSON.parse(this.formData.applyCustomerValue);
        const ids = val.groupIds || [];
        this.selectedCustomerGroups = this.customerGroups.filter(g => ids.includes(g.id));
      } catch (e) {}
    }

    // Parse Product selection
    this.selectedCategories = [];
    this.selectedProducts = [];
    if (this.formData.applyProductType === 'CATEGORY' && this.formData.applyProductValue) {
      try {
        const val = JSON.parse(this.formData.applyProductValue);
        const ids = val.categoryIds || [];
        this.selectedCategories = this.categories.filter(c => ids.includes(c.id));
      } catch (e) {}
    } else if (this.formData.applyProductType === 'SPECIFIC' && this.formData.applyProductValue) {
      try {
        const val = JSON.parse(this.formData.applyProductValue);
        const ids = val.productIds || [];
        this.selectedProducts = this.products.filter(p => ids.includes(p.id));
      } catch (e) {}
    }

    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onDelete(rule: HidePriceRule): void {
    this.deleteTargetName = rule.name;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deleteHidePriceRule(rule.id).subscribe(() => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSubmit(): void {
    // Serialize Customer selection
    if (this.formData.applyCustomerType === 'GROUP') {
      this.formData.applyCustomerValue = JSON.stringify({ groupIds: this.selectedCustomerGroups.map(g => g.id) });
    } else {
      this.formData.applyCustomerValue = '{}';
    }

    // Serialize Product selection
    if (this.formData.applyProductType === 'CATEGORY') {
      this.formData.applyProductValue = JSON.stringify({ categoryIds: this.selectedCategories.map(c => c.id) });
    } else if (this.formData.applyProductType === 'SPECIFIC') {
      this.formData.applyProductValue = JSON.stringify({ productIds: this.selectedProducts.map(p => p.id) });
    } else {
      this.formData.applyProductValue = '{}';
    }

    const action = this.editingId 
      ? this.api.updateHidePriceRule(this.editingId, this.formData)
      : this.api.createHidePriceRule(this.formData);

    action.subscribe(() => {
      const msg = this.editingId ? 'GLOBAL.UPDATE_SUCCESS' : 'GLOBAL.CREATE_SUCCESS';
      this.alerts.open(this.transloco.translate(msg), { appearance: 'success' }).subscribe();
      this.showForm = false;
      this.loadData();
    });
  }

  cancel(): void { this.showForm = false; }
}
