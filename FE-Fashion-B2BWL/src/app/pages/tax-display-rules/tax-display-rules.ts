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
import { TuiSelectModule, TuiTextfieldControllerModule, TuiMultiSelectModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, TaxDisplayRule, Category, Product, CustomerGroup } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { TaxDisplayEditorComponent } from './tax-display-editor';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-tax-display-rules',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper, TuiBadge,
    TuiTextfieldControllerModule, TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, TuiTextfield,
    TaxDisplayEditorComponent, TuiMultiSelectModule
  ],
  templateUrl: './tax-display-rules.html',
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxDisplayRulesComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';

  rowData: TaxDisplayRule[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  
  showForm = false;
  showDetails = false;
  editingId: number | null = null;
  selectedRule: TaxDisplayRule | null = null;
  
  formData: Partial<TaxDisplayRule> = {
    name: '', status: 'ACTIVE', taxDisplayType: 'VAT', displayType: 'BOTH_PRICES', designConfig: '{}',
    applyCustomerType: 'ALL', applyCustomerValue: '{}', applyProductType: 'ALL', applyProductValue: '{}'
  };

  statusOptions = ['ACTIVE', 'INACTIVE'];
  taxTypeOptions = ['VAT', 'GST'];
  displayTypeOptions = ['BOTH_PRICES', 'EXCLUDE_TAX_ONLY', 'INCLUDE_TAX_ONLY'];
  customerTypeOptions = ['ALL', 'GROUP', 'SPECIFIC'];
  productTypeOptions = ['ALL', 'CATEGORY', 'SPECIFIC'];

  categories: Category[] = [];
  products: Product[] = [];
  customerGroups: CustomerGroup[] = [];

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
    this.api.getTaxDisplayRules().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
    this.api.getCategories().subscribe(data => {
      this.categories = data;
      this.cdr.detectChanges();
    });
    this.api.getProducts().subscribe(data => {
      this.products = data;
      this.cdr.detectChanges();
    });
    this.api.getCustomerGroups().subscribe(data => {
      this.customerGroups = data;
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
        field: 'taxDisplayType', 
        headerValueGetter: () => this.transloco.translate('RULE.TAX_TYPE'), 
        width: 120 
      },
      { 
        field: 'displayType', 
        headerValueGetter: () => this.transloco.translate('RULE.DISPLAY_TYPE'), 
        width: 150 
      },
      { 
        field: 'discountRate', 
        headerName: 'Giảm giá %', 
        width: 120,
        valueFormatter: (params: any) => params.value ? `${params.value}%` : '-'
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
          onView: (data: TaxDisplayRule) => this.onView(data),
          onEdit: (data: TaxDisplayRule) => this.onEdit(data),
          onDelete: (data: TaxDisplayRule) => this.onDelete(data)
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  onView(rule: TaxDisplayRule): void {
    this.selectedRule = rule;
    this.showDetails = true;
    this.showForm = false;
    this.cdr.detectChanges();
  }

  getCustomerGroupNames(rule: TaxDisplayRule): string {
    if (rule.applyCustomerType !== 'GROUP' || !rule.applyCustomerValue) return '';
    try {
      const val = JSON.parse(rule.applyCustomerValue);
      const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
      const names = this.customerGroups.filter(g => ids.includes(g.id)).map(g => g.name);
      return names.length ? names.join(', ') : '';
    } catch { return ''; }
  }

  getCategoryNames(rule: TaxDisplayRule): string {
    if (rule.applyProductType !== 'CATEGORY' || !rule.applyProductValue) return '';
    try {
      const val = JSON.parse(rule.applyProductValue);
      const ids = val.categoryIds || (val.categoryId ? [val.categoryId] : []);
      const names = this.categories.filter(c => ids.includes(c.id)).map(c => c.name);
      return names.length ? names.join(', ') : '';
    } catch { return ''; }
  }

  getProductNames(rule: TaxDisplayRule): string {
    if (rule.applyProductType !== 'SPECIFIC' || !rule.applyProductValue) return '';
    try {
      const val = JSON.parse(rule.applyProductValue);
      const ids = val.productIds || (val.productId ? [val.productId] : []);
      const names = this.products.filter(p => ids.includes(p.id)).map(p => p.name);
      return names.length ? names.join(', ') : '';
    } catch { return ''; }
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = {
      name: '', status: 'ACTIVE', taxDisplayType: 'VAT', displayType: 'BOTH_PRICES', designConfig: '{}',
      applyCustomerType: 'ALL', applyCustomerValue: '{}', applyProductType: 'ALL', applyProductValue: '{}',
      discountRate: 0
    };
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onEdit(rule: TaxDisplayRule): void {
    this.editingId = rule.id;
    this.formData = { ...rule };
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onDelete(rule: TaxDisplayRule): void {
    this.deleteTargetName = rule.name;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deleteTaxDisplayRule(rule.id).subscribe(() => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSubmit(): void {
    const action = this.editingId 
      ? this.api.updateTaxDisplayRule(this.editingId, this.formData)
      : this.api.createTaxDisplayRule(this.formData);

    action.subscribe(() => {
      const msg = this.editingId ? 'GLOBAL.UPDATE_SUCCESS' : 'GLOBAL.CREATE_SUCCESS';
      this.alerts.open(this.transloco.translate(msg), { appearance: 'success' }).subscribe();
      this.showForm = false;
      this.loadData();
    });
  }

  cancel(): void { this.showForm = false; }
}
