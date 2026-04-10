import { Component, OnInit, ChangeDetectorRef, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridReadyEvent,
  GridApi,
  themeQuartz,
  AllCommunityModule,
  ModuleRegistry
} from 'ag-grid-community';
import { TuiButton, TuiAlertService, TuiTextfield, TuiLabel, TuiIcon, TuiDialogService, TuiDataList, TuiDropdown } from '@taiga-ui/core';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TuiDataListWrapper, TuiPagination } from '@taiga-ui/kit';
import { MaskitoDirective } from '@maskito/angular';
import { maskitoNumberOptionsGenerator } from '@maskito/kit';
import { ApiService, Bundle, BundleItem, ProductVariant, Product } from '../../services/api.service';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-bundles',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, AgGridAngular, TuiButton, TuiIcon, TuiTextfield, TuiLabel, TuiDataList, TuiDataListWrapper, TuiSelectModule, TuiTextfieldControllerModule, ActionRendererComponent, MaskitoDirective, TuiPagination],
  templateUrl: './bundles.html',
  styleUrl: './bundles.scss',
})
export class BundlesComponent implements OnInit {
  rowData: Bundle[] = [];
  gridApi!: GridApi;
  theme = themeQuartz;
  localeText: any = AG_GRID_LOCALE_VI;

  showForm = false;
  editingId: number | null = null;
  formData: Partial<Bundle> = {
    name: '',
    status: 'ACTIVE',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    applyCustomerType: 'ALL',
    items: []
  };

  // Pricing & Status options
  statusOptions = ['ACTIVE', 'INACTIVE'];
  
  // Picker states
  expandedProductIds: Set<number> = new Set();
  productVariantsMap: Map<number, ProductVariant[]> = new Map();
  pickerSelectedVariants: Set<number> = new Set();
  productSearch = '';
  filteredProducts: Product[] = [];
  showPicker = false;
  
  // Picker Pagination
  pickerPage = 0;
  pickerSize = 5;
  get pagedProducts(): Product[] {
    const start = this.pickerPage * this.pickerSize;
    return this.filteredProducts.slice(start, start + this.pickerSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.pickerSize);
  }

  allVariants: ProductVariant[] = [];
  allProducts: Product[] = [];
  variantSearch = '';
  filteredVariants: ProductVariant[] = [];

  columnDefs: ColDef[] = [
    { headerName: 'ID', field: 'id', width: 80, pinned: 'left' },
    { headerName: 'Tên Bundle', field: 'name', width: 250, filter: true, pinned: 'left' },
    { 
      headerName: 'Trạng thái', 
      field: 'status', 
      width: 150,
      cellRenderer: (p: any) => {
        const active = p.value === 'ACTIVE';
        return `<span class="badge ${active ? 'badge-success' : 'badge-secondary'}">${active ? '✅ Hoạt động' : '❌ Tạm ngưng'}</span>`;
      }
    },
    { 
      headerName: 'Giá cũ', 
      field: 'oldPrice', 
      width: 140,
      valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString() + ' ₫' : '0 ₫'
    },
    { 
      headerName: 'Giảm giá', 
      field: 'discountValue', 
      width: 140,
      valueFormatter: (p: any) => {
        if (!p.value) return '0';
        return p.data.discountType === 'PERCENTAGE' ? p.value + '%' : Number(p.value).toLocaleString() + ' ₫';
      }
    },
    { 
      headerName: 'Giá mới', 
      field: 'newPrice', 
      width: 140,
      cellStyle: { fontWeight: 'bold', color: '#008558' },
      valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString() + ' ₫' : '0 ₫'
    },
    {
      headerName: 'Thao tác',
      width: 200,
      pinned: 'right',
      cellRenderer: ActionRendererComponent,
      cellRendererParams: {
        onEdit: (d: Bundle) => this.onEdit(d),
        onDelete: (d: Bundle) => this.onDelete(d)
      }
    }
  ];

  @ViewChild('variantPickerDialog') variantPickerDialog!: TemplateRef<any>;

  readonly maskOptions = maskitoNumberOptionsGenerator({
    thousandSeparator: '.',
    precision: 0,
    min: 0,
  });

  constructor(
    private api: ApiService,
    private alerts: TuiAlertService,
    private dialogs: TuiDialogService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadVariants();
  }

  loadData() {
    this.api.getBundles().subscribe(res => {
      this.rowData = res;
      this.cdr.detectChanges();
    });
  }

  loadVariants() {
    this.api.getProducts().subscribe(prods => {
      this.allProducts = prods;
      this.filteredProducts = prods;
    });
    this.api.getProductVariants().subscribe(vars => {
      this.allVariants = vars;
    });
  }

  getProductName(productId: number): string {
    return this.allProducts.find(p => p.id === productId)?.name || 'N/A';
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    setTimeout(() => params.api.sizeColumnsToFit(), 200);
  }

  onAdd() {
    this.editingId = null;
    this.formData = {
      name: '',
      status: 'ACTIVE',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      applyCustomerType: 'ALL',
      items: [],
      oldPrice: 0,
      newPrice: 0
    };
    this.showForm = true;
    this.showPicker = false;
  }

  onSave() {
    if (!this.formData.name || !this.formData.items?.length) {
      this.alerts.open('Vui lòng nhập tên và ít nhất 1 linh kiện', { appearance: 'warning' }).subscribe();
      return;
    }

    const payload = JSON.parse(JSON.stringify(this.formData));
    payload.applyCustomerType = 'ALL';
    payload.customerType = 'ALL';
    payload.customerGroupIds = null;

    const obs = this.editingId 
      ? this.api.updateBundle(this.editingId, payload)
      : this.api.createBundle(payload);

    obs.subscribe({
      next: () => {
        this.alerts.open('Lưu Bundle thành công', { appearance: 'success' }).subscribe();
        this.showForm = false;
        this.loadData();
      },
      error: () => this.alerts.open('Lỗi khi lưu Bundle', { appearance: 'negative' }).subscribe()
    });
  }

  onEdit(b: Bundle) {
    this.editingId = b.id;
    
    // Hydrate variants: Try existing variant object first, then find in allVariants
    const items = (b.items || []).map(i => {
      const variant = i.variant || this.allVariants.find(v => v.id === i.variantId);
      return { ...i, variant };
    });

    this.formData = { 
      ...b,
      applyCustomerType: 'ALL',
      items: items
    };
    
    this.showForm = true;
    this.showPicker = false;
    
    // Re-calculate price after a short delay to ensure variants are bound
    setTimeout(() => {
        this.calculatePrices();
        this.cdr.detectChanges();
    }, 150);
  }

  onDelete(b: Bundle) {
    if (confirm(`Bạn có chắc chắn muốn xóa bundle "${b.name}"?`)) {
      this.api.deleteBundle(b.id).subscribe(() => {
        this.alerts.open('Đã xóa bundle thành công', { appearance: 'success' }).subscribe();
        this.loadData();
      });
    }
  }

  calculatePrices() {
    const items = this.formData.items || [];
    const oldPrice = items.reduce((acc, item) => {
      // Find variant price, fallback to product base price
      const v = item.variant || this.allVariants.find(x => x.id === item.variantId);
      const unitPrice = v?.price || 0; 
      // Note: If v.price is 0 or null, it might use product base price logic in real app
      // but here we follow the variant data
      return acc + (unitPrice * item.quantity);
    }, 0);

    let newPrice = oldPrice;
    const discount = this.formData.discountValue || 0;
    
    if (this.formData.discountType === 'PERCENTAGE') {
      newPrice = oldPrice * (1 - discount / 100);
    } else {
      newPrice = oldPrice - discount;
    }

    this.formData.oldPrice = oldPrice;
    this.formData.newPrice = Math.max(0, Math.round(newPrice));
  }

  openVariantPicker() {
    this.showPicker = !this.showPicker;
    if (this.showPicker) {
      this.productSearch = '';
      this.pickerPage = 0;
      this.expandedProductIds.clear();
      this.pickerSelectedVariants.clear();
      this.filteredProducts = [...this.allProducts];
    }
  }

  filterProducts() {
    this.pickerPage = 0;
    const s = this.productSearch.toLowerCase().trim();
    if (!s) {
      this.filteredProducts = [...this.allProducts];
    } else {
      this.filteredProducts = this.allProducts.filter(p => 
        p.name.toLowerCase().includes(s) || p.productCode.toLowerCase().includes(s)
      );
    }
  }

  onPickerPageChange(page: number) {
    this.pickerPage = page;
  }

  toggleProductExpand(p: Product) {
    if (this.expandedProductIds.has(p.id)) {
      this.expandedProductIds.delete(p.id);
    } else {
      this.expandedProductIds.add(p.id);
      if (!this.productVariantsMap.has(p.id)) {
        this.api.getProductVariantsByProduct(p.id).subscribe((vars: ProductVariant[]) => {
          this.productVariantsMap.set(p.id, vars);
          this.cdr.detectChanges();
        });
      }
    }
  }

  toggleVariantSelection(vId: number) {
    if (this.pickerSelectedVariants.has(vId)) {
      this.pickerSelectedVariants.delete(vId);
    } else {
      this.pickerSelectedVariants.add(vId);
    }
  }

  addSelectedVariantsToBundle() {
    const items = this.formData.items || [];
    let count = 0;
    
    this.productVariantsMap.forEach((vars) => {
      vars.forEach(v => {
        if (this.pickerSelectedVariants.has(v.id)) {
          const existing = items.find(i => i.variantId === v.id);
          if (existing) {
            existing.quantity++;
          } else {
            items.push({
              variantId: v.id,
              variant: v,
              quantity: 1
            });
          }
          count++;
        }
      });
    });

    this.formData.items = [...items];
    this.calculatePrices();
    this.alerts.open(`Đã thêm ${count} biến thể thành công`, { appearance: 'success' }).subscribe();
  }

  readonly stringifyGroup = (item: any): string => item.name || '';

  removeItem(index: number) {
    this.formData.items?.splice(index, 1);
    this.calculatePrices();
  }

  onCancel() {
    this.showForm = false;
  }
}
