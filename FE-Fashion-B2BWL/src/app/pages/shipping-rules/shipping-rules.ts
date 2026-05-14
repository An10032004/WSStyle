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
import { MaskitoDirective } from '@maskito/angular';
import { maskitoNumberOptionsGenerator } from '@maskito/kit';
import { ApiService, ShippingRule, Category, Product, CustomerGroup } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { RuleConflictWarningComponent } from '../../shared/components/rule-conflict-warning/rule-conflict-warning';
import { ShippingZonesComponent } from '../shipping-zones/shipping-zones';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-shipping-rules',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, 
    TuiRadio, TuiCheckbox,
    TuiTextfieldControllerModule, TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, TuiTextfield,
    RuleConflictWarningComponent, TuiBadge, MaskitoDirective, ShippingZonesComponent,
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
  
  currentLanguage: string = 'vi';

  get maskOptions() {
    return maskitoNumberOptionsGenerator({
      thousandSeparator: this.currentLanguage === 'vi' ? '.' : ',',
      precision: 0,
      min: 0,
    });
  }

  getNumericValue(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    const str = String(val);
    return Number(str.replace(/[\.,]/g, ''));
  }

  trackByRangeIndex(index: number): number {
    return index;
  }
  
  selectedCategoryIds: Category[] = [];
  selectedProductIds: Product[] = [];
  selectedGroupIds: CustomerGroup[] = [];
  rateRangesList: any[] = [];

  selectedCustomerGroupId: number | null = null; // Deprecated, keep for now to avoid break

  statusOptions = ['ACTIVE', 'INACTIVE'];
  baseOptions = ['QUANTITY_RANGE', 'AMOUNT_RANGE'];
  customerTypeOptions = ['ALL', 'GUEST', 'LOGGED_IN', 'GROUP'];
  discountTypeOptions = ['FREE', 'FLAT', 'PERCENTAGE'];

  /** Tạm ẩn form chiết khấu phí vận chuyển — phí chỉ theo khoảng phí. */
  readonly showShippingDiscountUi = false;

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
      this.currentLanguage = this.languageService.currentLanguage;
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
    this.api.getProducts(undefined, true).subscribe(prods => {
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
    } else {
      this.selectedGroupIds = [];
    }

    this.formData.applyProductType = 'ALL';
    this.formData.applyProductValue = '{}';
    this.selectedCategoryIds = [];
    this.selectedProductIds = [];

    this.conflicts = [];
    this.checkConflicts();
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  addRateRange(): void {
    const lastMax = this.rateRangesList.length > 0 ? this.rateRangesList[this.rateRangesList.length - 1].max : 0;
    this.rateRangesList = [
      ...this.rateRangesList,
      { min: lastMax + 1, max: lastMax + 1000000, rate: 0 },
    ];
    this.cdr.markForCheck();
  }

  removeRateRange(index: number): void {
    this.rateRangesList = this.rateRangesList.filter((_, i) => i !== index);
    this.cdr.markForCheck();
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
      applyProductType: 'ALL',
      applyProductValue: '{}',
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

    if (this.formData.applyCustomerType === 'GROUP') {
      this.formData.applyCustomerValue = JSON.stringify({ groupIds: this.selectedGroupIds.map(g => g.id) });
    } else {
      this.formData.applyCustomerValue = '{}';
    }

    this.formData.applyProductType = 'ALL';
    this.formData.applyProductValue = '{}';

    const validationError = this.validateShippingRuleForm();
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

  private validateShippingRuleForm(): string | null {
    const name = String(this.formData.name || '').trim();
    if (!name) return 'Vui lòng nhập tên quy tắc.';
    this.formData.name = name;

    const priority = Number(this.formData.priority);
    if (!Number.isFinite(priority) || priority < 0) {
      return 'Vui lòng nhập mức độ ưu tiên hợp lệ (>= 0).';
    }
    this.formData.priority = priority;

    if (!Array.isArray(this.rateRangesList) || this.rateRangesList.length === 0) {
      return 'Phải có ít nhất một khoảng phí hợp lệ.';
    }

    const sorted = [...this.rateRangesList]
      .map(r => ({ min: Number(r.min), max: Number(r.max), rate: Number(r.rate) }))
      .sort((a, b) => a.min - b.min);

    for (const r of sorted) {
      if (!Number.isFinite(r.min) || !Number.isFinite(r.max) || !Number.isFinite(r.rate)) {
        return 'Cấu hình khoảng phí không hợp lệ.';
      }
      if (r.min < 0 || r.max < 0) {
        return 'Khoảng giá không hợp lý: giá trị không được âm.';
      }
      if (r.max < r.min) {
        return "Khoảng giá không hợp lý: mốc 'đến' phải >= mốc 'từ'.";
      }
      if (r.rate < 0) {
        return 'Khoảng giá không hợp lý: phí vận chuyển không được âm.';
      }
    }

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min <= sorted[i - 1].max) {
        return 'Khoảng giá không hợp lý: các khoảng bị chồng lấn.';
      }
    }

    return null;
  }

  isShippingGroupSelected(g: CustomerGroup): boolean {
    return this.selectedGroupIds.some(x => x.id === g.id);
  }

  toggleShippingGroup(g: CustomerGroup, checked: boolean): void {
    if (checked) {
      if (!this.isShippingGroupSelected(g)) {
        this.selectedGroupIds = [...this.selectedGroupIds, g];
      }
    } else {
      this.selectedGroupIds = this.selectedGroupIds.filter(x => x.id !== g.id);
    }
    this.checkConflicts();
  }
}
