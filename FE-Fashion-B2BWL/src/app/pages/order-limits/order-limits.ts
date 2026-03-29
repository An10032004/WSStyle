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
  TuiBadge
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, OrderLimit } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { OrderLimitEditorComponent } from './order-limit-editor';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-order-limits',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, TuiInputNumber, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper,
    TuiTextfieldControllerModule, TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, TuiTextfield,
    OrderLimitEditorComponent, TuiBadge
  ],
  templateUrl: './order-limits.html',
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderLimitsComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';

  rowData: OrderLimit[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};

  showForm = false;
  showDetails = false;
  editingId: number | null = null;
  selectedRule: OrderLimit | null = null;

  formData: Partial<OrderLimit> = {
    name: '', priority: 0, status: 'ACTIVE', limitLevel: 'PER_ORDER', limitType: 'MIN_ORDER_QUANTITY', limitValue: 0,
    applyCustomerType: 'ALL', applyCustomerValue: '{}', applyProductType: 'ALL', applyProductValue: '{}'
  };

  categories: any[] = [];
  products: any[] = [];
  customerGroups: any[] = [];

  statusOptions = ['ACTIVE', 'INACTIVE'];
  levelOptions = ['PER_VARIANT', 'PER_PRODUCT', 'PER_ORDER'];
  typeOptions = ['MIN_ORDER_QUANTITY', 'MAX_ORDER_AMOUNT'];

  stringifyCategory = (item: any) => item?.name || '';
  stringifyProduct = (item: any) => item?.name || '';
  stringifyGroup = (item: any) => item?.name || '';

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
    this.api.getOrderLimits().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
    this.api.getCategories().subscribe(data => { this.categories = data; this.cdr.detectChanges(); });
    this.api.getProducts().subscribe(data => { this.products = data; this.cdr.detectChanges(); });
    this.api.getCustomerGroups().subscribe(data => { this.customerGroups = data; this.cdr.detectChanges(); });
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
      { field: 'limitLevel', headerValueGetter: () => this.transloco.translate('RULE.LEVEL'), width: 130, valueFormatter: (params: any) => this.transloco.translate('ENUMS.' + params.value) },
      { field: 'limitType', headerValueGetter: () => this.transloco.translate('RULE.TYPE'), width: 150, valueFormatter: (params: any) => this.transloco.translate('ENUMS.' + params.value) },
      { field: 'limitValue', headerValueGetter: () => this.transloco.translate('RULE.VALUE'), width: 100 },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 260,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: OrderLimit) => this.onView(data),
          onEdit: (data: OrderLimit) => this.onEdit(data),
          onDelete: (data: OrderLimit) => this.onDelete(data)
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  onView(rule: OrderLimit): void {
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

  getCustomerGroupNames(rule: OrderLimit): string {
    if (rule.applyCustomerType !== 'GROUP' || !rule.applyCustomerValue) return '';
    try {
      const val = JSON.parse(rule.applyCustomerValue);
      const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
      const names = this.customerGroups.filter(g => ids.includes(g.id)).map(g => g.name);
      return names.length ? names.join(', ') : `(IDs: ${ids.join(', ')})`;
    } catch { return rule.applyCustomerValue || ''; }
  }

  getProductTargetNames(rule: OrderLimit): string {
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
    } catch { return rule.applyProductValue || ''; }
    return '';
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = { name: '', priority: 0, status: 'ACTIVE', limitLevel: 'PER_ORDER', limitType: 'MIN_ORDER_QUANTITY', limitValue: 0 };
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onEdit(data: OrderLimit): void {
    console.log('--- OrderLimit onEdit Data Received ---', data);
    this.editingId = data.id;
    this.formData = { ...data };
    console.log('--- FormData After Spread ---', this.formData);
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onDelete(rule: OrderLimit): void {
    this.deleteTargetName = rule.name;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deleteOrderLimit(rule.id).subscribe(() => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSubmit(): void {
    const action = this.editingId ? this.api.updateOrderLimit(this.editingId, this.formData) : this.api.createOrderLimit(this.formData);
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
