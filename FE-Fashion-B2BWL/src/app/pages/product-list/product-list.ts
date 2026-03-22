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
import { ApiService, Product, Category, TranslationRequest } from '../../services/api.service';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, AgGridAngular, TuiButton, TuiIcon, TuiTextfield, TuiLabel, TuiSelectModule, TuiTextfieldControllerModule, ActionRendererComponent, MaskitoDirective],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductListComponent implements OnInit, OnDestroy {
  rowData: Product[] = [];
  gridApi!: GridApi;
  theme = themeQuartz;
  localeText: any = AG_GRID_LOCALE_VI;
  gridVisible = true;

  categories: Category[] = [];

  showForm = false;
  showDetails = false;
  selectedProduct: Product | null = null;
  editingId: number | null = null;
  formData = {
    name: '',
    productCode: '',
    basePrice: 0,
    categoryId: null as number | null,
    brand: '',
    specifications: '',
    imageUrl: '',
    imageUrls: [] as string[],
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
    // Remove both . and , then parse
    return Number(str.replace(/[\.,]/g, ''));
  }

  productTranslations: Map<number, string> = new Map();
  categoryTranslations: Map<number, string> = new Map();
  columnDefs: ColDef[] = [];
  originalProduct: Product | null = null; // Store original for partial updates

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
    // Wait for the translation file to load before the first render
    this.transloco.selectTranslation().subscribe(() => {
      this.updateColumnDefs();
      if (this.gridApi) {
        this.gridApi.refreshHeader();
      }
      this.loadTranslations(); 
      this.cdr.detectChanges();
    });

    this.langSub = this.languageService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
      this.showForm = false;
      this.showDetails = false;
      this.localeText = lang === 'vi' ? AG_GRID_LOCALE_VI : {}; 
      
      // Force grid re-init to apply new localeText
      this.gridVisible = false;
      this.cdr.detectChanges();
      
      // Wait for the new language file to be ready before updating headers
      this.transloco.selectTranslation(lang).subscribe(() => {
        this.gridVisible = true;
        this.cdr.detectChanges();
        
        // Wait for next tick for gridApi to be available
        setTimeout(() => {
          this.updateColumnDefs();
          if (this.gridApi) {
            this.gridApi.refreshHeader();
          }
          this.loadTranslations(); // Fetch dynamic translations from DB
          this.cdr.detectChanges();
        });
      });
    });

    this.loadData();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    if (this.langSub) this.langSub.unsubscribe();
  }

  updateColumnDefs(): void {
    const isEn = this.currentLanguage === 'en';
    this.columnDefs = [
      { headerName: 'ID', field: 'id', width: 100, sortable: true, cellStyle: { fontWeight: '500' }, pinned: 'left' },
      { 
        headerName: this.transloco.translate('PRODUCT.CODE'), 
        field: 'productCode', 
        width: 150, 
        sortable: true, 
        filter: true 
      },
      { 
        headerName: this.transloco.translate('PRODUCT.BRAND'), 
        field: 'brand', 
        width: 150, 
        sortable: true, 
        filter: true 
      },
      { 
        headerName: this.transloco.translate('PRODUCT.NAME'), 
        field: 'name', 
        width: 300, 
        sortable: true, 
        filter: true,
        pinned: 'left',
        tooltipValueGetter: (params: any) => params.value,
        cellRenderer: (params: any) => {
          const img = params.data.imageUrl ? `<img src="${params.data.imageUrl}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; margin-right: 8px; vertical-align: middle;">` : '';
          return `${img}<span>${params.value || ''}</span>`;
        }
      },
      {
        headerName: this.transloco.translate('PRODUCT.PRICE'),
        field: 'basePrice',
        width: 150,
        sortable: true,
        valueFormatter: (p: any) => {
          if (p.value == null) return '';
          const isEn = this.currentLanguage === 'en';
          const exchangeRate = 25450; // Standard rate for demonstration
          
          if (isEn) {
            const usdValue = p.value / exchangeRate;
            return new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD',
                maximumFractionDigits: 2 
            }).format(usdValue);
          } else {
            return new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND',
                maximumFractionDigits: 0 
            }).format(p.value);
          }
        },
        cellStyle: { fontWeight: '500', color: 'var(--tui-status-positive)' },
      },
      { 
        headerName: this.transloco.translate('PRODUCT.CATEGORY'), 
        field: 'categoryId', 
        width: 150,
        valueGetter: (params) => {
          const id = params.data.categoryId;
          if (this.currentLanguage === 'vi') return this.getCategoryName(id);
          return this.categoryTranslations.get(id) || this.getCategoryName(id);
        }
      },
      {
        headerName: this.transloco.translate('PRODUCT.ACTIONS'),
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: Product) => this.onView(data),
          onEdit: (data: Product) => this.onEdit(data),
          onDelete: (data: Product) => this.onDelete(data),
          lang: this.currentLanguage, // Force refresh when lang changes
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
      const translatedData = this.rowData.map(p => {
        const t = data.find(item => item.resourceId === p.id);
        if (t && t.content) {
          try {
            const content = JSON.parse(t.content);
            return { ...p, name: content.name || p.name };
          } catch (e) {}
        }
        return p;
      });
      this.rowData = [...translatedData];
      this.cdr.detectChanges();
    });

    // Fetch Category Translations
    this.api.getTranslationsByTypeAndLang('CATEGORY', this.currentLanguage).subscribe((data) => {
      this.categoryTranslations.clear();
      data.forEach(t => {
        try {
          const content = JSON.parse(t.content);
          if (content.name) this.categoryTranslations.set(t.resourceId, content.name);
        } catch(e) {}
      });
      if (this.gridApi) this.gridApi.refreshCells({ columns: ['categoryId'] });
    });
  }

  loadCategories(): void {
    this.api.getCategories().subscribe((data) => {
      this.categories = data;
      if (this.gridApi) {
        this.gridApi.refreshCells({ columns: ['categoryId'] });
      }
    });
  }

  getCategoryName(id: number | null): string {
    if (id === null) return '';
    if (this.currentLanguage !== 'vi') {
      const translated = this.categoryTranslations.get(id);
      if (translated) return translated;
    }
    return this.categories.find(c => c.id === id)?.name || '';
  }

  readonly renderCategory = (context: any): string => {
    return this.getCategoryName(context?.$implicit);
  };

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  loadData(): void {
    this.api.getProducts().subscribe((data) => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
  }

  onAdd(): void {
    this.editingId = null;
    this.originalProduct = null;
    this.formData = { 
      name: '', 
      productCode: '', 
      brand: '', 
      basePrice: 0, 
      categoryId: null, 
      specifications: '',
      imageUrl: '',
      imageUrls: []
    };
    this.showForm = true;
    this.showDetails = false;
  }

  onView(p: Product): void {
    if (this.currentLanguage !== 'vi') {
      this.api.getTranslationByLang('PRODUCT', p.id, this.currentLanguage).subscribe({
        next: (translation) => {
          this.selectedProduct = { ...p };
          if (translation && translation.content) {
            try {
              const content = JSON.parse(translation.content);
              this.selectedProduct.name = content.name || p.name;
              this.selectedProduct.specifications = content.specifications || p.specifications;
            } catch (e) {}
          }
          this.showDetails = true;
          this.showForm = false;
          this.cdr.detectChanges();
        },
        error: () => {
           this.selectedProduct = p;
           this.showDetails = true;
           this.showForm = false;
           this.cdr.detectChanges();
        }
      });
    } else {
      this.selectedProduct = p;
      this.showDetails = true;
      this.showForm = false;
    }
  }

  onCloseDetails(): void {
    this.showDetails = false;
    this.selectedProduct = null;
  }

  onEdit(p: Product): void {
    this.editingId = p.id;
    this.originalProduct = { ...p };
    this.showDetails = false;

    if (this.currentLanguage !== 'vi') {
      this.formData = {
        name: p.name,
        productCode: p.productCode,
        brand: p.brand ?? '',
        basePrice: p.basePrice,
        categoryId: p.categoryId ?? null,
        specifications: p.specifications && p.specifications !== 'Seeded translation' ? p.specifications : '',
        imageUrl: p.imageUrl ?? '',
        imageUrls: this.parseImageUrls(p.imageUrls),
      };
      
      this.api.getTranslationByLang('PRODUCT', p.id, this.currentLanguage).subscribe({
        next: (translation) => {
          if (translation && translation.content) {
            try {
               const content = JSON.parse(translation.content);
               this.formData.name = content.name && content.name !== 'Seeded translation' ? content.name : this.formData.name;
               this.formData.specifications = content.specifications && content.specifications !== 'Seeded translation' ? content.specifications : this.formData.specifications;
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
      this.formData = {
        name: p.name,
        productCode: p.productCode,
        brand: p.brand ?? '',
        basePrice: p.basePrice,
        categoryId: p.categoryId ?? null,
        specifications: p.specifications ?? '',
        imageUrl: p.imageUrl ?? '',
        imageUrls: this.parseImageUrls(p.imageUrls),
      };
      this.showForm = true;
    }
  }

  onDelete(p: Product): void {

    this.deleteTargetName = p.name;
    this.dialogs
      .open<boolean>(this.deleteDialogTemplate, {
        size: 'm',
      })
      .subscribe((response) => {
        if (response) {
          this.api.deleteProduct(p.id).subscribe(() => {
            this.alerts.open('Đã xóa sản phẩm', { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSave(): void {
    const numericPrice = this.getNumericValue(this.formData.basePrice);
    
    if (this.currentLanguage !== 'vi' && this.editingId) {
      // 1. Update Global Fields in Multi-lingual mode
      // We keep the original (Vietnamese) name and specifications in the main table
      const { imageUrls: _urls, ...restData } = this.formData;
      const globalUpdate: any = {
        ...restData,
        name: this.originalProduct?.name || this.formData.name,
        specifications: this.originalProduct?.specifications || this.formData.specifications,
        basePrice: numericPrice,
        imageUrls: JSON.stringify(this.formData.imageUrls)
      };
      
      this.api.updateProduct(this.editingId, globalUpdate).subscribe(() => {
        // 2. Save Translation for Name & Specifications
        const req: TranslationRequest = {
           resourceId: this.editingId!,
           resourceType: 'PRODUCT',
           languageCode: this.currentLanguage,
           content: JSON.stringify({ 
             name: this.formData.name,
             specifications: this.formData.specifications
           })
        };
        
        this.api.saveTranslation(req).subscribe(() => {
           this.alerts.open(`Cập nhật thông tin và bản dịch [${this.currentLanguage}] thành công`, { appearance: 'success' }).subscribe();
           this.showForm = false;
           this.loadData();
        });
      });
    } else {
    // Primary Language (vi) or New Product
    const { imageUrls: _, ...rest } = this.formData;
    const body: any = { 
      ...rest,
      basePrice: numericPrice,
      imageUrls: JSON.stringify(this.formData.imageUrls)
    };
      
      if (this.editingId) {
        this.api.updateProduct(this.editingId, body).subscribe(() => {
          this.alerts.open('Cập nhật thành công', { appearance: 'success' }).subscribe();
          this.showForm = false;
          this.loadData();
        });
      } else {
        this.api.createProduct(body).subscribe(() => {
          this.alerts.open('Tạo sản phẩm thành công', { appearance: 'success' }).subscribe();
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
