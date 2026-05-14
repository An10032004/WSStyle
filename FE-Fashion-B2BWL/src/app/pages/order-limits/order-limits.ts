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
  typeOptions = ['MIN_ORDER_QUANTITY', 'MAX_ORDER_QUANTITY', 'MIN_ORDER_AMOUNT', 'MAX_ORDER_AMOUNT'];

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
    this.api.getProducts(undefined, true).subscribe(data => { this.products = data; this.cdr.detectChanges(); });
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
      { field: 'priority', headerValueGetter: () => this.transloco.translate('RULE.PRIORITY'), width: 100 },
      { field: 'limitLevel', headerValueGetter: () => this.transloco.translate('RULE.LEVEL'), width: 130, valueFormatter: (params: any) => this.transloco.translate('ENUMS.' + params.value) },
      { field: 'limitType', headerValueGetter: () => this.transloco.translate('RULE.TYPE'), width: 170, valueFormatter: (params: any) => this.transloco.translate('ENUMS.' + params.value) },
      { field: 'limitValue', headerValueGetter: () => this.transloco.translate('RULE.VALUE'), width: 110 },
      {
        field: 'applyCustomerType',
        headerValueGetter: () => this.transloco.translate('RULE.CUSTOMER_SCOPE'),
        width: 140,
        valueFormatter: (params: any) => this.formatApplyCustomerType(params.value),
      },
      {
        field: 'applyProductType',
        headerValueGetter: () => this.transloco.translate('RULE.PRODUCT_SCOPE'),
        width: 160,
        valueFormatter: (params: any) => this.formatApplyProductType(params.value),
      },
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

  /** Nhãn phạm vi khách (SPECIFIC = khách cụ thể, không dùng chung nhãn sản phẩm). */
  formatApplyCustomerType(value: string | null | undefined): string {
    const v = value || 'ALL';
    if (v === 'SPECIFIC') {
      return this.transloco.translate('ENUMS.SPECIFIC_CUSTOMER');
    }
    return this.transloco.translate('ENUMS.' + v);
  }

  /** Nhãn phạm vi sản phẩm (tránh ENUMS.GROUP = nhóm KH khi hiển thị cột SP). */
  formatApplyProductType(value: string | null | undefined): string {
    const v = value || 'ALL';
    switch (v) {
      case 'GROUP':
        return this.transloco.translate('ORDER_LIMIT.PRODUCT_TARGET_GROUP');
      case 'CATEGORY':
        return this.transloco.translate('ORDER_LIMIT.PRODUCT_TARGET_CATEGORY');
      case 'SPECIFIC':
        return this.transloco.translate('ORDER_LIMIT.PRODUCT_TARGET_SPECIFIC');
      case 'ALL':
        return this.transloco.translate('ENUMS.ALL');
      default:
        return this.transloco.translate('ENUMS.' + v);
    }
  }

  getProductTargetNames(rule: OrderLimit): string {
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
    const validationError = this.validateOrderLimitForm();
    if (validationError) {
      this.alerts.open(validationError, { appearance: 'error' }).subscribe();
      this.cdr.detectChanges();
      return;
    }

    const priority = Number(this.formData.priority || 0);
    const duplicate = this.rowData.find(r => r.priority === priority && r.id !== this.editingId);
    if (duplicate) {
      this.alerts.open(`Mức độ ưu tiên đã tồn tại (đang dùng bởi "${duplicate.name}").`, {
        appearance: 'error',
      }).subscribe();
      this.cdr.detectChanges();
      return;
    }

    const action = this.editingId ? this.api.updateOrderLimit(this.editingId, this.formData) : this.api.createOrderLimit(this.formData);
    action.subscribe({
      next: () => {
        const msg = this.editingId
          ? this.transloco.translate('GLOBAL.UPDATE_SUCCESS')
          : this.transloco.translate('GLOBAL.CREATE_SUCCESS');
        this.alerts.open(msg, { appearance: 'success' }).subscribe();
        this.showForm = false;
        this.loadData();
      },
      error: (err: { error?: { message?: string } }) => {
        const msg = err?.error?.message ?? 'Không thể lưu. Vui lòng kiểm tra dữ liệu.';
        this.alerts.open(msg, { appearance: 'error' }).subscribe();
        this.cdr.detectChanges();
      },
    });
  }

  cancel(): void { this.showForm = false; }

  private validateOrderLimitForm(): string | null {
    const name = String(this.formData.name || '').trim();
    if (!name) return 'Vui lòng nhập tên quy tắc.';
    this.formData.name = name;

    const priority = Number(this.formData.priority);
    if (!Number.isFinite(priority) || priority < 0) {
      return 'Vui lòng nhập mức độ ưu tiên hợp lệ (>= 0).';
    }
    this.formData.priority = priority;

    const limitValue = Number(this.formData.limitValue);
    if (!Number.isFinite(limitValue) || limitValue <= 0) {
      return 'Ngưỡng giới hạn phải lớn hơn 0.';
    }
    this.formData.limitValue = limitValue;

    const pType = String(this.formData.applyProductType || 'ALL').toUpperCase();
    const pValue = String(this.formData.applyProductValue || '{}');
    if ((pType === 'CATEGORY' || pType === 'GROUP') && !/categoryIds|categoryId/.test(pValue.replace(/\s+/g, ''))) {
      return 'Phải chọn đối tượng áp dụng.';
    }
    if (pType === 'SPECIFIC' && !/productIds|productId|variantIds|variantId/.test(pValue.replace(/\s+/g, ''))) {
      return 'Phải chọn đối tượng áp dụng.';
    }

    const mmError = this.validateMinMaxPair();
    if (mmError) return mmError;

    return null;
  }

  private validateMinMaxPair(): string | null {
    const type = String(this.formData.limitType || '').toUpperCase();
    const isMin = type.includes('MIN_');
    const isMax = type.includes('MAX_');
    if (!isMin && !isMax) return null;

    const currentVal = Number(this.formData.limitValue);
    const competitors = this.rowData.filter(r => r.id !== this.editingId).filter(r => this.isSameScope(r));
    for (const r of competitors) {
      const rt = String(r.limitType || '').toUpperCase();
      const rv = Number(r.limitValue);
      if (!Number.isFinite(rv)) continue;

      if (isMin && rt.includes('MAX_') && currentVal > rv) {
        return 'Ngưỡng tối thiểu không được lớn hơn ngưỡng tối đa.';
      }
      if (isMax && rt.includes('MIN_') && currentVal < rv) {
        return 'Ngưỡng tối đa không được nhỏ hơn ngưỡng tối thiểu.';
      }
    }
    return null;
  }

  private isSameScope(r: OrderLimit): boolean {
    const lvlA = String(this.formData.limitLevel || 'PER_ORDER').toUpperCase();
    const lvlB = String(r.limitLevel || 'PER_ORDER').toUpperCase();
    const lineA = lvlA === 'PER_PRODUCT' || lvlA === 'PER_VARIANT';
    const lineB = lvlB === 'PER_PRODUCT' || lvlB === 'PER_VARIANT';
    const bucketA = lineA ? 'PER_LINE' : lvlA;
    const bucketB = lineB ? 'PER_LINE' : lvlB;
    if (bucketA !== bucketB) return false;

    const axisA = String(this.formData.limitType || '').toUpperCase().includes('AMOUNT') || String(this.formData.limitType || '').toUpperCase().includes('VALUE') ? 'AMOUNT' : 'QTY';
    const rt = String(r.limitType || '').toUpperCase();
    const axisB = rt.includes('AMOUNT') || rt.includes('VALUE') ? 'AMOUNT' : 'QTY';
    if (axisA !== axisB) return false;

    const cTypeA = String(this.formData.applyCustomerType || 'ALL').toUpperCase();
    const cTypeB = String(r.applyCustomerType || 'ALL').toUpperCase();
    const pTypeA = String(this.formData.applyProductType || 'ALL').toUpperCase();
    const pTypeB = String(r.applyProductType || 'ALL').toUpperCase();
    if (cTypeA !== cTypeB || pTypeA !== pTypeB) return false;

    const cvA = String(this.formData.applyCustomerValue || '{}').replace(/\s+/g, '');
    const cvB = String(r.applyCustomerValue || '{}').replace(/\s+/g, '');
    const pvA = String(this.formData.applyProductValue || '{}').replace(/\s+/g, '');
    const pvB = String(r.applyProductValue || '{}').replace(/\s+/g, '');
    return cvA === cvB && pvA === pvB;
  }
}
