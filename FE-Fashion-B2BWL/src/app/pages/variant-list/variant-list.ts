import { Component, OnInit, ChangeDetectorRef, ViewChild, TemplateRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  GridReadyEvent,
  GridApi,
  themeQuartz
} from 'ag-grid-community';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { TuiButton, TuiAlertService, TuiTextfield, TuiLabel, TuiIcon, TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiConfirmData } from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { MaskitoDirective } from '@maskito/angular';
import { maskitoNumberOptionsGenerator } from '@maskito/kit';
import { ApiService, ProductVariant, Product, TranslationRequest } from '../../services/api.service';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-variant-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, AgGridAngular, TuiButton, TuiIcon, TuiTextfield, TuiLabel, TuiSelectModule, TuiTextfieldControllerModule, ActionRendererComponent, MaskitoDirective],
  templateUrl: './variant-list.html',
  styleUrl: './variant-list.scss',
})
export class VariantListComponent implements OnInit, OnDestroy {
  rowData: ProductVariant[] = [];
  gridApi!: GridApi;
  theme = themeQuartz;
  localeText: any = AG_GRID_LOCALE_VI;
  gridVisible = true;

  products: Product[] = [];

  showForm = false;
  showDetails = false;
  selectedVariant: ProductVariant | null = null;
  editingId: number | null = null;
  originalVariant: ProductVariant | null = null;
  formData: any = {
    sku: '',
    productId: null as number | null,
    attributes: '',
    stockQuantity: 0,
    priceAdjustment: 0,
    imageUrl: '',
    imageUrls: [] as string[],
    color: '',
    size: '',
    weight: '',
    length: 0,
    width: 0,
    height: 0,
    costPrice: 0,
    price: 0,
    discountPrice: 0,
    status: 'ACTIVE',
    barcode: '',
  };

  currentLanguage: string = 'vi';
  langSub!: Subscription;

  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';

  get maskOptions() {
    return maskitoNumberOptionsGenerator({
      thousandSeparator: this.currentLanguage === 'vi' ? '.' : ',',
      precision: 0,
      min: 0,
    });
  }

  private getNumericValue(val: any): number {
    if (val === null || val === undefined) return 0;
    const str = String(val);
    return Number(str.replace(/[\.,]/g, ''));
  }

  productTranslations: Map<number, string> = new Map();
  variantTranslations: Map<number, string> = new Map();
  columnDefs: ColDef[] = [];

  defaultColDef: ColDef = { resizable: true, minWidth: 100 };

  constructor(
    private api: ApiService, 
    private alerts: TuiAlertService, 
    private cdr: ChangeDetectorRef, 
    private dialogs: TuiDialogService,
    public languageService: LanguageService,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    // Initial translation load
    this.transloco.selectTranslation().subscribe(() => {
      this.updateColumnDefs();
      this.loadTranslations();
      this.cdr.detectChanges();
    });

    this.langSub = this.languageService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
      this.showForm = false;
      this.showDetails = false;
      this.localeText = lang === 'vi' ? AG_GRID_LOCALE_VI : {};

      // Force grid re-init
      this.gridVisible = false;
      this.cdr.detectChanges();

      this.transloco.selectTranslation(lang).subscribe(() => {
        this.gridVisible = true;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.updateColumnDefs();
          this.loadTranslations();
          this.cdr.detectChanges();
        });
      });
    });
    this.loadData();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    if (this.langSub) this.langSub.unsubscribe();
  }

  loadProducts(): void {
    this.api.getProducts().subscribe((data) => {
      this.products = data;
    });
  }

  getProductDisplay(id: number | null): string {
    if (!id) return '';
    const p = this.products.find(x => x.id === id);
    if (!p) return '';
    
    let name = p.name;
    if (this.currentLanguage !== 'vi') {
      name = this.productTranslations.get(p.id) || p.name;
    }
    
    return `${name} (${p.productCode})`;
  }

  readonly renderProduct = (context: any): string => {
    return this.getProductDisplay(context?.$implicit);
  };

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  loadData(): void {
    this.api.getProductVariants().subscribe((data) => {
      this.rowData = data;
      this.loadTranslations();
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { headerName: 'ID', field: 'id', width: 100, sortable: true, cellStyle: { fontWeight: '500' }, pinned: 'left'},
      { 
        headerName: this.transloco.translate('VARIANT.SKU'), 
        field: 'sku', 
        width: 150, 
        sortable: true, 
        filter: true,
        pinned: 'left'
      },
      {
        headerName: this.transloco.translate('VARIANT.STATUS') || 'Trạng thái',
        field: 'status',
        width: 120,
        cellRenderer: (params: any) => {
          const status = params.value === 'ACTIVE' ? '✅' : '❌';
          const text = params.value === 'ACTIVE' ? 'Kích hoạt' : 'Ngừng bán';
          return `<span>${status} ${text}</span>`;
        }
      },
      { 
        headerName: this.transloco.translate('VARIANT.PRODUCT'), 
        field: 'productId', 
        width: 250, 
        sortable: true, 
        filter: true,
        valueFormatter: (params) => this.getProductDisplay(params.value),
        tooltipValueGetter: (params: any) => this.getProductDisplay(params.value)
      },
      { headerName: this.transloco.translate('VARIANT.STOCK'), field: 'stockQuantity', width: 100, sortable: true },
      { 
        headerName: this.transloco.translate('VARIANT.COST_PRICE') || 'Giá nhập', 
        field: 'costPrice', 
        width: 140, 
        sortable: true,
        valueFormatter: (params) => params.value ? `${Number(params.value).toLocaleString()} ${this.transloco.translate('GLOBAL.CURRENCY_SUFFIX')}` : ''
      },
      { 
        headerName: this.transloco.translate('VARIANT.PRICE_ADJ'), 
        field: 'priceAdjustment', 
        width: 150, 
        sortable: true,
        valueFormatter: (params) => {
          if (params.value == null) return '';
          const isEn = this.currentLanguage === 'en';
          const exchangeRate = 25450;
          
          if (isEn) {
            const usdValue = params.value / exchangeRate;
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usdValue);
          } else {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(params.value);
          }
        },
        cellStyle: { fontWeight: '500', color: 'var(--tui-status-positive)' },
      },
      { 
        headerName: 'Giá bán riêng', 
        field: 'price', 
        width: 140, 
        sortable: true,
        valueFormatter: (params) => params.value ? `${Number(params.value).toLocaleString()} ${this.transloco.translate('GLOBAL.CURRENCY_SUFFIX')}` : 'Theo giá gốc'
      },
      { 
        headerName: 'Giá giảm riêng', 
        field: 'discountPrice', 
        width: 140, 
        sortable: true,
        valueFormatter: (params) => params.value ? `${Number(params.value).toLocaleString()} ${this.transloco.translate('GLOBAL.CURRENCY_SUFFIX')}` : '-'
      },
      { headerName: this.transloco.translate('VARIANT.COLOR'), field: 'color', width: 120 },
      { headerName: this.transloco.translate('VARIANT.SIZE'), field: 'size', width: 120 },
      { headerName: this.transloco.translate('VARIANT.WEIGHT'), field: 'weight', width: 120 },
      { headerName: 'Dài (cm)', field: 'length', width: 100 },
      { headerName: 'Rộng (cm)', field: 'width', width: 100 },
      { headerName: 'Cao (cm)', field: 'height', width: 100 },
      { headerName: 'Mã vạch', field: 'barcode', width: 150 },
      { 
        headerName: this.transloco.translate('VARIANT.IMAGE_URL'), 
        field: 'imageUrl', 
        width: 120,
        cellRenderer: (params: any) => params.value ? `<img src="${params.value}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;">` : ''
      },
      {
        headerName: this.transloco.translate('PRODUCT.ACTIONS'),
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: ProductVariant) => this.onView(data),
          onEdit: (data: ProductVariant) => this.onEdit(data),
          onDelete: (data: ProductVariant) => this.onDelete(data),
          lang: this.currentLanguage,
        },
        width: 260,
        sortable: false,
        filter: false,
      },
    ];
  }

  loadTranslations(): void {
    if (this.currentLanguage === 'vi') {
      return;
    }

    // Fetch Product Translations
    this.api.getTranslationsByTypeAndLang('PRODUCT', this.currentLanguage).subscribe((data) => {
      this.productTranslations.clear();
      data.forEach(t => {
        try {
          const content = JSON.parse(t.content);
          if (content.name) this.productTranslations.set(t.resourceId, content.name);
        } catch(e) {}
      });
      if (this.gridApi) this.gridApi.refreshCells({ columns: ['productId'] });
    });

    // Fetch Variant Translations
    this.api.getTranslationsByTypeAndLang('PRODUCT_VARIANT', this.currentLanguage).subscribe((data) => {
      const translatedData = this.rowData.map(v => {
        const t = data.find(item => item.resourceId === v.id);
        if (t && t.content) {
          try {
            const content = JSON.parse(t.content);
            return { ...v, attributes: content.attributes || v.attributes };
          } catch (e) {}
        }
        return v;
      });
      this.rowData = [...translatedData];
      this.cdr.detectChanges();
    });
  }

  onAdd(): void {
    this.editingId = null;
    this.originalVariant = null;
    this.formData = { 
      sku: '', 
      productId: null, 
      attributes: '', 
      stockQuantity: 0, 
      priceAdjustment: 0, 
      imageUrl: '', 
      imageUrls: [],
      color: '', 
      size: '', 
      weight: '',
      length: 0,
      width: 0,
      height: 0,
      costPrice: 0,
      price: 0,
      discountPrice: 0,
      status: 'ACTIVE',
      barcode: '',
    };
    this.showForm = true;
    this.showDetails = false;
  }

  onView(v: ProductVariant): void {
    if (this.currentLanguage !== 'vi') {
      this.api.getTranslationByLang('PRODUCT_VARIANT', v.id, this.currentLanguage).subscribe({
        next: (translation) => {
          this.selectedVariant = { ...v };
          if (translation && translation.content) {
            try {
              const content = JSON.parse(translation.content);
              this.selectedVariant.attributes = content.attributes || v.attributes;
            } catch (e) {}
          }
          this.showDetails = true;
          this.showForm = false;
          this.cdr.detectChanges();
        },
        error: () => {
           this.selectedVariant = v;
           this.showDetails = true;
           this.showForm = false;
           this.cdr.detectChanges();
        }
      });
    } else {
      this.selectedVariant = v;
      this.showDetails = true;
      this.showForm = false;
    }
  }

  onCloseDetails(): void {
    this.showDetails = false;
    this.selectedVariant = null;
  }

  onEdit(v: ProductVariant): void {
    this.editingId = v.id;
    this.originalVariant = { ...v };
    this.showDetails = false;

    const baseData = {
      sku: v.sku,
      productId: v.productId,
      attributes: v.attributes ?? '',
      stockQuantity: v.stockQuantity,
      priceAdjustment: v.priceAdjustment,
      imageUrl: v.imageUrl ?? '',
      imageUrls: this.parseImageUrls(v.imageUrls),
      color: v.color ?? '',
      size: v.size ?? '',
      weight: v.weight ?? '',
      length: v.length ?? 0,
      width: v.width ?? 0,
      height: v.height ?? 0,
      costPrice: v.costPrice ?? 0,
      price: v.price ?? 0,
      discountPrice: v.discountPrice ?? 0,
      status: v.status ?? 'ACTIVE',
      barcode: v.barcode ?? '',
    };

    if (this.currentLanguage !== 'vi') {
      this.formData = { ...baseData };
      this.api.getTranslationByLang('PRODUCT_VARIANT', v.id, this.currentLanguage).subscribe({
        next: (translation) => {
          if (translation && translation.content) {
            try {
               const content = JSON.parse(translation.content);
               this.formData.attributes = content.attributes && content.attributes !== 'Seeded translation' ? content.attributes : this.formData.attributes;
            } catch(e) {}
          }
          this.showForm = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.showForm = true;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.formData = { ...baseData };
      this.showForm = true;
    }
  }

  onDelete(v: ProductVariant): void {
    this.deleteTargetName = v.sku;
    this.dialogs
      .open<boolean>(this.deleteDialogTemplate, {
        size: 'm',
      })
      .subscribe((response) => {
        if (response) {
          this.api.deleteProductVariant(v.id).subscribe(() => {
            this.alerts.open('Đã xóa biến thể', { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSave(): void {
    const numericStock = this.getNumericValue(this.formData.stockQuantity);
    const numericAdjustment = this.getNumericValue(this.formData.priceAdjustment);
    const numericCost = this.getNumericValue(this.formData.costPrice);
    const numericPrice = this.getNumericValue(this.formData.price);
    const numericDiscount = this.getNumericValue(this.formData.discountPrice);
    const numericLength = this.getNumericValue(this.formData.length);
    const numericWidth = this.getNumericValue(this.formData.width);
    const numericHeight = this.getNumericValue(this.formData.height);

    const body: any = { 
      ...this.formData, 
      stockQuantity: numericStock, 
      priceAdjustment: numericAdjustment,
      costPrice: numericCost,
      price: numericPrice,
      discountPrice: numericDiscount,
      length: numericLength,
      width: numericWidth,
      height: numericHeight,
      imageUrls: JSON.stringify(this.formData.imageUrls)
    };

    if (this.currentLanguage !== 'vi' && this.editingId) {
      // 1. Update Global Fields
      body.attributes = this.originalVariant?.attributes || this.formData.attributes;
      
      this.api.updateProductVariant(this.editingId, body).subscribe(() => {
        // 2. Save Translation
        const req: TranslationRequest = {
          resourceId: this.editingId!,
          resourceType: 'PRODUCT_VARIANT',
          languageCode: this.currentLanguage,
          content: JSON.stringify({ 
            attributes: this.formData.attributes,
            sku: this.originalVariant?.sku || this.formData.sku
          })
        };
        
        this.api.saveTranslation(req).subscribe(() => {
           this.alerts.open(`Cập nhật thông tin và bản dịch [${this.currentLanguage}] thành công`, { appearance: 'success' }).subscribe();
           this.showForm = false;
           this.loadData();
        });
      });
    } else {
      if (this.editingId) {
        this.api.updateProductVariant(this.editingId, body).subscribe(() => {
          this.alerts.open('Cập nhật thành công', { appearance: 'success' }).subscribe();
          this.showForm = false;
          this.loadData();
        });
      } else {
        this.api.createProductVariant(body).subscribe(() => {
          this.alerts.open('Tạo biến thể thành công', { appearance: 'success' }).subscribe();
          this.showForm = false;
          this.loadData();
        });
      }
    }
  }

  onCancel(): void {
    this.showForm = false;
  }

  parseImageUrls(json: any): string[] {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    try {
      return JSON.parse(json);
    } catch (e) {
      return [];
    }
  }

  addImageUrl(): void {
    this.formData.imageUrls.push('');
  }

  removeImageUrl(index: number): void {
    this.formData.imageUrls.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
