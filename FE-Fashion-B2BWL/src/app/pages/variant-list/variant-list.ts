import { Component, OnInit, ChangeDetectorRef, ViewChild, TemplateRef, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { TuiButton, TuiAlertService, TuiTextfield, TuiLabel, TuiIcon, TuiDialogService } from '@taiga-ui/core';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { MaskitoDirective } from '@maskito/angular';
import { maskitoNumberOptionsGenerator } from '@maskito/kit';
import { ApiService, ProductVariant, Product, Category } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription, forkJoin, concat, EMPTY, of } from 'rxjs';
import { finalize, map, tap } from 'rxjs/operators';
import { readApiErrorMessage } from '../../utils/auth-http.util';
import {
  parseVariantDimensionSlotsFromJson,
  serializeVariantDimensionSlotsJson,
  type VariantDimUi,
} from '../../utils/variant-dimension-slots.util';
import {
  PRESET_COLOR_SWATCHES,
  resolveColorHex,
  isLightColorForSwatch,
} from '../../utils/color-swatch.util';

/** Một hàng thuộc tính động (tối đa 3 hàng → map API color / size / weight). */
export interface VariantAttributeRow {
  name: string;
  values: string[];
  tagInput: string;
  /** Cách hiển thị trên PDP: ô màu tròn hoặc nút chữ. */
  displayAs: VariantDimUi;
}

/** Một dòng trong bảng tổ hợp sau khi Generate hoặc load từ DB. */
export interface CombinationTableRow {
  id?: number;
  label: string;
  dim1: string;
  dim2: string;
  dim3: string;
  sku: string;
  stockQuantity: number;
  costPrice: number;
  price: number;
  status: string;
  barcode: string;
  imageUrl: string;
  imageUrls: string[];
  /** Chọn nhiều để xóa hàng loạt (chỉ UI). */
  _selected?: boolean;
}

@Component({
  selector: 'app-variant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslocoModule,
    TuiButton,
    TuiIcon,
    TuiTextfield,
    TuiLabel,
    TuiSelectModule,
    TuiTextfieldControllerModule,
    MaskitoDirective,
  ],
  templateUrl: './variant-list.html',
  styleUrl: './variant-list.scss',
})
export class VariantListComponent implements OnInit, OnDestroy {
  /** Màu gợi ý khi chiều dùng ô màu trên PDP (bấm để thêm chip). */
  readonly presetColorSwatches = PRESET_COLOR_SWATCHES;
  rowData: ProductVariant[] = [];
  /** Bản sao từ API (không bị ghi đè bởi bản dịch) — dùng suy luận thuộc tính / tổ hợp. */
  variantsRaw: ProductVariant[] = [];

  products: Product[] = [];
  categories: Category[] = [];

  readonly filterProductAllSentinel = -1;
  filterProductId = -1;
  productQuickFilter = '';

  /** Phân trang danh sách sản phẩm (server-side, giống /products/search + shop). */
  productListPage = 1;
  productListPageSize = 10;
  readonly productListPageSizeOptions = [5, 10, 20, 50];
  productsTotalElements = 0;
  productsTotalPages = 1;
  /** Gợi ý SP cho bộ lọc «một sản phẩm» (không tải toàn bộ catalog). */
  filterProductOptions: Product[] = [];
  private quickFilterDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  /** Sản phẩm đang mở rộng danh sách biến thể. */
  expandedProductIds = new Set<number>();

  showCombinationEditor = false;
  combinationEditorProduct: Product | null = null;

  /** Giá / tồn áp cho các dòng tổ hợp mới (chưa có trên DB) khi bấm Tạo tổ hợp. */
  combinationDefaultPrice = 0;
  combinationDefaultStock = 0;

  attributeRows: VariantAttributeRow[] = [];
  combinationRows: CombinationTableRow[] = [];
  combinationSkuSearch = '';
  combinationPage = 1;
  combinationPageSize = 10;

  showDetails = false;
  selectedVariant: ProductVariant | null = null;

  productTranslations: Map<number, string> = new Map();

  currentLanguage: string = 'vi';
  langSub!: Subscription;

  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';
  /** Hàng chờ xóa sau khi xác nhận dialog (1 hoặc nhiều dòng). */
  private pendingCombinationDeleteRows: CombinationTableRow[] | null = null;
  /** true = thông báo xóa nhiều trong dialog. */
  combinationDeleteIsBulk = false;
  combinationBulkDeleteCount = 0;

  /** Chỉ tải biến thể theo từng SP (mở rộng / mở editor) — tránh GET toàn bộ SKU. */
  private variantsFetchedProductIds = new Set<number>();
  /** Đang GET `/product-variants/product/{id}` (skeleton trong card). */
  variantsLoadingProductIds = new Set<number>();
  variantListPageLoading = false;

  formErrors: Record<string, string> = {};

  constructor(
    private api: ApiService,
    private alerts: TuiAlertService,
    private cdr: ChangeDetectorRef,
    private dialogs: TuiDialogService,
    public languageService: LanguageService,
    private transloco: TranslocoService,
  ) {}

  get maskOptions() {
    return maskitoNumberOptionsGenerator({
      thousandSeparator: this.currentLanguage === 'vi' ? '.' : ',',
      precision: 0,
      min: 0,
    });
  }

  private getNumericValue(val: unknown): number {
    if (val === null || val === undefined) return 0;
    const str = String(val);
    return Number(str.replace(/[\.,]/g, ''));
  }

  ngOnInit(): void {
    this.transloco.selectTranslation().subscribe(() => {
      this.loadTranslations();
      this.cdr.detectChanges();
    });

    this.langSub = this.languageService.currentLanguage$.subscribe((lang) => {
      this.currentLanguage = lang;
      this.showDetails = false;
      this.showCombinationEditor = false;
      this.transloco.selectTranslation(lang).subscribe(() => {
        this.loadTranslations();
        this.cdr.detectChanges();
      });
    });
    this.loadData();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    if (this.quickFilterDebounceHandle) {
      clearTimeout(this.quickFilterDebounceHandle);
      this.quickFilterDebounceHandle = null;
    }
  }

  /** Trang hiệu lực (kẹp theo tổng trang server). */
  get effectiveProductListPage(): number {
    return Math.min(Math.max(1, this.productListPage), Math.max(1, this.productsTotalPages));
  }

  get productListRangeFrom(): number {
    if (this.productsTotalElements === 0) return 0;
    return (this.effectiveProductListPage - 1) * this.productListPageSize + 1;
  }

  get productListRangeTo(): number {
    return Math.min(this.effectiveProductListPage * this.productListPageSize, this.productsTotalElements);
  }

  private resetProductListPagination(): void {
    this.productListPage = 1;
  }

  onProductQuickFilterChange(): void {
    if (this.quickFilterDebounceHandle) {
      clearTimeout(this.quickFilterDebounceHandle);
    }
    this.quickFilterDebounceHandle = setTimeout(() => {
      this.quickFilterDebounceHandle = null;
      this.resetProductListPagination();
      this.fetchProductsPage(true);
    }, 320);
  }

  onProductListPageSizeChange(size: number): void {
    this.productListPageSize = size;
    this.resetProductListPagination();
    this.fetchProductsPage(true);
  }

  goProductListPrev(): void {
    this.productListPage = Math.max(1, this.effectiveProductListPage - 1);
    this.fetchProductsPage(false);
  }

  goProductListNext(): void {
    this.productListPage = Math.min(this.productsTotalPages, this.effectiveProductListPage + 1);
    this.fetchProductsPage(false);
  }

  private buildPagedSearchParams(pageIdx: number): Record<string, string | number | number[]> {
    const q = this.productQuickFilter.trim();
    const params: Record<string, string | number | number[]> = {
      sortBy: 'newest',
      page: pageIdx,
      size: this.productListPageSize,
    };
    if (q) params['search'] = q;
    if (this.filterProductId !== this.filterProductAllSentinel) {
      params['productIds'] = [this.filterProductId];
    }
    return params;
  }

  private buildPickerSearchParams(): Record<string, string | number> {
    const q = this.productQuickFilter.trim();
    const params: Record<string, string | number> = { sortBy: 'newest', page: 0, size: 80 };
    if (q) params['search'] = q;
    return params;
  }

  /**
   * Tải trang sản phẩm qua GET /products/search (truy vấn có phân trang, có đếm variantCount).
   * @param refreshPicker làm mới danh sách gợi ý trong select «một sản phẩm» (chỉ khi đang xem «Tất cả»).
   */
  private fetchProductsPage(refreshPicker: boolean): void {
    this.variantListPageLoading = true;
    this.clearVariantClientCache();
    const pageIdx = Math.max(0, this.productListPage - 1);
    const mainParams = this.buildPagedSearchParams(pageIdx);
    forkJoin({
      page: this.api.searchProducts(mainParams),
      categories: this.api.getCategories(),
      picker:
        refreshPicker && this.filterProductId === this.filterProductAllSentinel
          ? this.api.searchProducts(this.buildPickerSearchParams())
          : of({ content: [] as Product[], totalElements: 0, totalPages: 0 }),
    }).subscribe({
      next: ({ page, categories, picker }) => {
        this.categories = categories;
        this.products = page.content ?? [];
        this.productsTotalElements = page.totalElements ?? 0;
        this.productsTotalPages = Math.max(1, page.totalPages ?? 1);
        const srvNum = (page as { number?: number }).number;
        if (typeof srvNum === 'number') {
          this.productListPage = srvNum + 1;
        }
        if (refreshPicker && this.filterProductId === this.filterProductAllSentinel) {
          this.filterProductOptions = picker.content ?? [];
        }
        this.variantListPageLoading = false;
        this.loadTranslations();
        this.cdr.detectChanges();
      },
      error: () => {
        this.variantListPageLoading = false;
        this.alerts.open('Không tải được danh sách sản phẩm hoặc danh mục.', { appearance: 'error' }).subscribe();
        this.cdr.detectChanges();
      },
    });
  }

  private clearVariantClientCache(): void {
    this.expandedProductIds.clear();
    this.variantsFetchedProductIds.clear();
    this.variantsRaw = [];
    this.rowData = [];
    this.variantsLoadingProductIds.clear();
  }

  getProductDisplay(id: number | null | undefined): string {
    if (id == null) return '';
    const p =
      this.products.find((x) => x.id === id) ?? this.filterProductOptions.find((x) => x.id === id);
    if (!p) return '';
    let name = p.name;
    if (this.currentLanguage !== 'vi') {
      name = this.productTranslations.get(p.id) || p.name;
    }
    return `${name} (${p.productCode})`;
  }

  getCategoryName(categoryId: number | null | undefined): string {
    if (categoryId == null) return '—';
    const c = this.categories.find((x) => x.id === categoryId);
    return c?.name ?? `#${categoryId}`;
  }

  countVariants(productId: number): number {
    const p =
      this.products.find((x) => x.id === productId) ?? this.filterProductOptions.find((x) => x.id === productId);
    if (p != null && p.variantCount != null && p.variantCount >= 0) {
      return p.variantCount;
    }
    return this.rowData.filter((v) => v.productId === productId).length;
  }

  isVariantsLoadingForProduct(productId: number): boolean {
    return this.variantsLoadingProductIds.has(productId);
  }

  variantsForProduct(productId: number): ProductVariant[] {
    return this.rowData
      .filter((v) => v.productId === productId)
      .slice()
      .sort((a, b) => (a.sku || '').localeCompare(b.sku || '', undefined, { sensitivity: 'base' }));
  }

  private variantsRawForProduct(productId: number): ProductVariant[] {
    return this.variantsRaw
      .filter((v) => v.productId === productId)
      .slice()
      .sort((a, b) => (a.sku || '').localeCompare(b.sku || '', undefined, { sensitivity: 'base' }));
  }

  isExpanded(productId: number): boolean {
    return this.expandedProductIds.has(productId);
  }

  toggleExpand(productId: number): void {
    if (this.expandedProductIds.has(productId)) {
      this.expandedProductIds.delete(productId);
      this.cdr.markForCheck();
      return;
    }
    this.expandedProductIds.add(productId);
    this.cdr.markForCheck();
    this.ensureVariantsForProduct(productId).subscribe({
      error: (err) => {
        this.expandedProductIds.delete(productId);
        this.handleApiError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onFilterProductIdChange(value: number): void {
    this.filterProductId = value;
    this.resetProductListPagination();
    this.fetchProductsPage(value === this.filterProductAllSentinel);
  }

  clearFormErrors(): void {
    this.formErrors = {};
  }

  private handleApiError(err: unknown): void {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 400 && err.error && err.error.data) {
        this.formErrors = err.error.data;
        this.alerts.open('Dữ liệu không hợp lệ. Vui lòng kiểm tra các trường.', { appearance: 'warning' }).subscribe();
        return;
      }
      if (err.status === 409 && err.error && err.error.message) {
        this.alerts.open(err.error.message, { appearance: 'warning' }).subscribe();
        return;
      }
    }
    const msg = readApiErrorMessage(err, (err as any)?.message || 'Lỗi hệ thống');
    this.alerts.open(msg, { appearance: 'error' }).subscribe();
  }

  loadData(): void {
    this.resetProductListPagination();
    this.fetchProductsPage(true);
  }

  /** Gộp biến thể của một SP vào cache (thay thế bản cũ cùng productId). */
  private replaceVariantsForProduct(productId: number, list: ProductVariant[]): void {
    this.variantsRaw = this.variantsRaw.filter((v) => v.productId !== productId);
    this.variantsRaw.push(...list.map((v) => ({ ...v })));
    this.rowData = this.rowData.filter((v) => v.productId !== productId);
    this.rowData.push(...list.map((v) => ({ ...v })));
  }

  /** Đảm bảo đã có biến thể trong RAM cho SP (lazy theo API). */
  private ensureVariantsForProduct(productId: number) {
    if (this.variantsFetchedProductIds.has(productId)) {
      return of(undefined);
    }
    this.variantsLoadingProductIds.add(productId);
    this.cdr.markForCheck();
    return this.api.getProductVariantsByProduct(productId).pipe(
      tap((list) => {
        this.replaceVariantsForProduct(productId, list);
        this.variantsFetchedProductIds.add(productId);
        if (this.currentLanguage !== 'vi') {
          this.loadTranslations();
        }
      }),
      finalize(() => {
        this.variantsLoadingProductIds.delete(productId);
        this.cdr.markForCheck();
      }),
      map(() => undefined as void),
    );
  }

  loadTranslations(): void {
    if (this.currentLanguage === 'vi') {
      return;
    }
    this.api.getTranslationsByTypeAndLang('PRODUCT', this.currentLanguage).subscribe((data) => {
      this.productTranslations.clear();
      data.forEach((t) => {
        if (t.translatedName) this.productTranslations.set(t.resourceId, t.translatedName);
      });
      this.cdr.detectChanges();
    });

    this.api.getTranslationsByTypeAndLang('PRODUCT_VARIANT', this.currentLanguage).subscribe((data) => {
      if (this.rowData.length === 0) {
        this.cdr.detectChanges();
        return;
      }
      const translatedData = this.rowData.map((v) => {
        const t = data.find((item) => item.resourceId === v.id);
        if (t && t.translatedName) {
          return { ...v, color: t.translatedName, size: t.translatedDescription };
        }
        return v;
      });
      this.rowData = [...translatedData];
      this.cdr.detectChanges();
    });
  }

  /** Mở trình sửa tổ hợp cho toàn bộ biến thể của một sản phẩm. */
  openCombinationEditor(product: Product): void {
    const pid = product.id;
    if (pid == null) return;
    this.ensureVariantsForProduct(pid).subscribe({
      next: () => this.applyOpenCombinationEditor(product),
      error: (err) => this.handleApiError(err),
    });
  }

  private applyOpenCombinationEditor(product: Product): void {
    const pid = product.id!;
    this.showDetails = false;
    this.combinationEditorProduct = product;
    const raw = this.variantsRawForProduct(pid);
    this.resetCombinationDefaults(product, raw);
    this.attributeRows = this.inferAttributeRows(raw, product);
    this.combinationRows = this.buildCombinationRowsFromVariants(raw);
    this.combinationSkuSearch = '';
    this.combinationPage = 1;
    this.showCombinationEditor = true;
    this.cdr.markForCheck();
  }

  /** Khởi tạo giá/tồn mặc định cho dòng tổ hợp mới từ SP gốc hoặc biến thể đầu tiên. */
  private resetCombinationDefaults(product: Product, raw: ProductVariant[]): void {
    if (raw.length) {
      const v0 = raw[0];
      this.combinationDefaultPrice = this.getNumericValue(v0.price as unknown);
      this.combinationDefaultStock = this.getNumericValue(v0.stockQuantity as unknown);
    } else {
      this.combinationDefaultPrice = this.getNumericValue(product.basePrice as unknown);
      this.combinationDefaultStock = 0;
    }
  }

  onCancelCombinationEditor(): void {
    this.showCombinationEditor = false;
    this.combinationEditorProduct = null;
    this.combinationDefaultPrice = 0;
    this.combinationDefaultStock = 0;
    this.attributeRows = [];
    this.combinationRows = [];
    this.pendingCombinationDeleteRows = null;
    this.combinationDeleteIsBulk = false;
    this.combinationBulkDeleteCount = 0;
    this.clearFormErrors();
    this.cdr.markForCheck();
  }

  addAttributeRow(): void {
    if (this.attributeRows.length >= 3) {
      this.alerts.open(this.transloco.translate('VARIANT.ATTR_MAX'), { appearance: 'warning' }).subscribe();
      return;
    }
    const idx = this.attributeRows.length;
    this.attributeRows.push({
      name: '',
      values: [],
      tagInput: '',
      displayAs: idx === 0 ? 'swatch' : 'buttons',
    });
    this.cdr.markForCheck();
  }

  removeAttributeRow(index: number): void {
    this.attributeRows.splice(index, 1);
    this.cdr.markForCheck();
  }

  onAttributeTagKeydown(row: VariantAttributeRow, ev: KeyboardEvent): void {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    const t = (row.tagInput || '').trim();
    if (!t) return;
    if (!row.values.includes(t)) row.values.push(t);
    row.tagInput = '';
    this.cdr.markForCheck();
  }

  removeAttributeValue(row: VariantAttributeRow, value: string): void {
    row.values = row.values.filter((v) => v !== value);
    this.cdr.markForCheck();
  }

  /** Thêm nhanh một màu có sẵn vào danh sách giá trị (tránh trùng). */
  appendPresetColorToRow(row: VariantAttributeRow, label: string): void {
    const t = (label || '').trim();
    if (!t || row.values.includes(t)) return;
    row.values.push(t);
    this.cdr.markForCheck();
  }

  presetSwatchHex(label: string): string {
    return resolveColorHex(label);
  }

  presetSwatchIsLight(label: string): boolean {
    return isLightColorForSwatch(label);
  }

  generateCombinations(): void {
    const dims = this.attributeRows
      .map((r) => r.values.map((v) => v.trim()).filter(Boolean))
      .filter((arr) => arr.length > 0);
    if (dims.length === 0) {
      this.alerts.open(this.transloco.translate('VARIANT.GENERATE_NEED_VALUES'), { appearance: 'warning' }).subscribe();
      return;
    }
    const combos = this.cartesian(dims);
    const raw = this.combinationEditorProduct
      ? this.variantsRawForProduct(this.combinationEditorProduct.id)
      : [];
    const next: CombinationTableRow[] = [];
    for (const parts of combos) {
      const dim1 = parts[0] ?? '';
      const dim2 = parts[1] ?? '';
      const dim3 = parts[2] ?? '';
      const label = parts.filter(Boolean).join(' / ');
      const existing = raw.find(
        (v) =>
          (v.color ?? '') === dim1 &&
          (v.size ?? '') === dim2 &&
          (v.weight ?? '') === dim3,
      );
      if (existing) {
        next.push(this.variantToCombinationRow(existing, label));
      } else {
        const defP = this.getNumericValue(this.combinationDefaultPrice as unknown);
        const defS = this.getNumericValue(this.combinationDefaultStock as unknown);
        next.push({
          label,
          dim1,
          dim2,
          dim3,
          sku: '',
          stockQuantity: defS,
          costPrice: 0,
          price: defP,
          status: 'ACTIVE',
          barcode: '',
          imageUrl: '',
          imageUrls: [] as string[],
        });
      }
    }
    this.combinationRows = next;
    this.autofillEmptySkus();
    this.combinationPage = 1;
    this.cdr.markForCheck();
  }

  private autofillEmptySkus(): void {
    const code = this.combinationEditorProduct?.productCode || 'SKU';
    let i = 0;
    for (const r of this.combinationRows) {
      if (!String(r.sku || '').trim()) {
        r.sku = `${code}-${i}`;
      }
      i++;
    }
  }

  private cartesian<T>(arrays: T[][]): T[][] {
    if (!arrays.length) return [[]];
    return arrays.reduce<T[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
      [[]],
    );
  }

  /** Lưu 3 nhãn + kiểu PDP (swatch / nút) đồng bộ với trang chi tiết sản phẩm. */
  private serializeVariantDimensionLabels(): string {
    const pad: VariantAttributeRow[] = [...this.attributeRows];
    while (pad.length < 3) {
      const i = pad.length;
      pad.push({
        name: '',
        values: [],
        tagInput: '',
        displayAs: i === 0 ? 'swatch' : 'buttons',
      });
    }
    return serializeVariantDimensionSlotsJson(
      pad.slice(0, 3).map((r, i) => ({
        name: (r.name || '').trim(),
        ui: r.displayAs ?? (i === 0 ? 'swatch' : 'buttons'),
      })),
    );
  }

  private inferAttributeRows(variants: ProductVariant[], product?: Product | null): VariantAttributeRow[] {
    const slotsParsed = parseVariantDimensionSlotsFromJson(product?.variantDimensionLabels ?? null);
    const uniq = (get: (v: ProductVariant) => string | undefined) => {
      const s = new Set<string>();
      for (const v of variants) {
        const x = (get(v) ?? '').trim();
        if (x) s.add(x);
      }
      return [...s];
    };
    const colors = uniq((v) => v.color);
    const sizes = uniq((v) => v.size);
    const weights = uniq((v) => v.weight);
    const rows: VariantAttributeRow[] = [];
    if (variants.length === 0) {
      rows.push({
        name: slotsParsed[0].name || this.transloco.translate('VARIANT.COLOR'),
        values: [],
        tagInput: '',
        displayAs: slotsParsed[0].ui,
      });
      return rows;
    }
    if (colors.length || variants.some((v) => (v.color ?? '').trim())) {
      rows.push({
        name: slotsParsed[0].name || this.transloco.translate('VARIANT.COLOR'),
        values: colors,
        tagInput: '',
        displayAs: slotsParsed[0].ui,
      });
    }
    if (sizes.length || variants.some((v) => (v.size ?? '').trim())) {
      rows.push({
        name: slotsParsed[1].name || this.transloco.translate('VARIANT.SIZE'),
        values: sizes,
        tagInput: '',
        displayAs: slotsParsed[1].ui,
      });
    }
    if (weights.length || variants.some((v) => (v.weight ?? '').trim())) {
      rows.push({
        name: slotsParsed[2].name || this.transloco.translate('VARIANT.WEIGHT'),
        values: weights,
        tagInput: '',
        displayAs: slotsParsed[2].ui,
      });
    }
    if (rows.length === 0) {
      rows.push({
        name: slotsParsed[0].name || this.transloco.translate('VARIANT.COLOR'),
        values: [],
        tagInput: '',
        displayAs: slotsParsed[0].ui,
      });
    }
    return rows.slice(0, 3);
  }

  private buildCombinationRowsFromVariants(variants: ProductVariant[]): CombinationTableRow[] {
    return variants.map((v) => {
      const parts = [v.color, v.size, v.weight].map((x) => (x ?? '').trim()).filter(Boolean);
      const label = parts.join(' / ') || v.sku;
      return this.variantToCombinationRow(v, label);
    });
  }

  private variantToCombinationRow(v: ProductVariant, label: string): CombinationTableRow {
    return {
      id: v.id,
      label,
      dim1: v.color ?? '',
      dim2: v.size ?? '',
      dim3: v.weight ?? '',
      sku: v.sku ?? '',
      stockQuantity: v.stockQuantity ?? 0,
      costPrice: v.costPrice ?? 0,
      price: v.price ?? 0,
      status: v.status ?? 'ACTIVE',
      barcode: v.barcode ?? '',
      imageUrl: v.imageUrl ?? '',
      imageUrls: this.parseImageUrls(v.imageUrls),
    };
  }

  get filteredCombinationRows(): CombinationTableRow[] {
    const q = this.combinationSkuSearch.trim().toLowerCase();
    return this.combinationRows.filter((r) => !q || (r.sku || '').toLowerCase().includes(q));
  }

  get allFilteredCombinationSelected(): boolean {
    const vis = this.filteredCombinationRows;
    return vis.length > 0 && vis.every((r) => !!r._selected);
  }

  get combinationSelectedCount(): number {
    return this.combinationRows.filter((r) => !!r._selected).length;
  }

  toggleSelectAllFiltered(checked: boolean): void {
    for (const r of this.filteredCombinationRows) {
      r._selected = checked;
    }
    this.cdr.markForCheck();
  }

  private clearCombinationRowSelection(): void {
    for (const r of this.combinationRows) {
      r._selected = false;
    }
  }

  private removeVariantFromLocalCaches(variantId: number): void {
    this.variantsRaw = this.variantsRaw.filter((v) => v.id !== variantId);
    this.rowData = this.rowData.filter((v) => v.id !== variantId);
  }

  /** Xóa ngay trên DB (sau dialog); dòng chưa có id chỉ bỏ khỏi bảng. */
  private executeDeleteCombinationRows(rows: CombinationTableRow[]): void {
    const withIds = rows.filter((r): r is CombinationTableRow & { id: number } => r.id != null && r.id > 0);
    const withoutIds = rows.filter((r) => !r.id);

    for (const r of withoutIds) {
      const idx = this.combinationRows.indexOf(r);
      if (idx >= 0) {
        this.combinationRows.splice(idx, 1);
      }
    }

    if (withIds.length === 0) {
      this.clearCombinationRowSelection();
      this.cdr.markForCheck();
      return;
    }

    forkJoin(withIds.map((r) => this.api.deleteProductVariant(r.id!))).subscribe({
      next: () => {
        const idSet = new Set(withIds.map((r) => r.id!));
        for (const id of idSet) {
          this.removeVariantFromLocalCaches(id);
        }
        this.combinationRows = this.combinationRows.filter((r) => r.id == null || !idSet.has(r.id));
        this.clearCombinationRowSelection();
        this.alerts.open(this.transloco.translate('VARIANT.DELETE_VARIANTS_OK'), { appearance: 'success' }).subscribe();
        this.cdr.markForCheck();
      },
      error: (err) => this.handleApiError(err),
    });
  }

  openBulkDeleteCombinationDialog(): void {
    const selected = this.combinationRows.filter((r) => !!r._selected);
    if (!selected.length) {
      this.alerts.open(this.transloco.translate('VARIANT.BULK_DELETE_NONE'), { appearance: 'warning' }).subscribe();
      return;
    }
    this.combinationDeleteIsBulk = true;
    this.combinationBulkDeleteCount = selected.length;
    this.deleteTargetName = selected
      .slice(0, 8)
      .map((r) => String(r.sku || r.label).trim())
      .filter(Boolean)
      .join(', ');
    if (selected.length > 8) {
      this.deleteTargetName += '…';
    }
    this.pendingCombinationDeleteRows = selected;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' }).subscribe((ok) => {
      const pending = this.pendingCombinationDeleteRows;
      this.pendingCombinationDeleteRows = null;
      this.combinationDeleteIsBulk = false;
      this.combinationBulkDeleteCount = 0;
      if (ok && pending?.length) {
        this.executeDeleteCombinationRows(pending);
      }
    });
  }

  get combinationPageCount(): number {
    return Math.max(1, Math.ceil(this.filteredCombinationRows.length / this.combinationPageSize));
  }

  get pagedCombinationRows(): CombinationTableRow[] {
    const start = (this.combinationPage - 1) * this.combinationPageSize;
    return this.filteredCombinationRows.slice(start, start + this.combinationPageSize);
  }

  get totalStockInEditor(): number {
    return this.combinationRows.reduce((s, r) => s + this.getNumericValue(r.stockQuantity), 0);
  }

  markCombinationRowRemoved(row: CombinationTableRow): void {
    this.combinationDeleteIsBulk = false;
    this.combinationBulkDeleteCount = 1;
    this.deleteTargetName = row.sku || row.label;
    this.pendingCombinationDeleteRows = [row];
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' }).subscribe((ok) => {
      const pending = this.pendingCombinationDeleteRows;
      this.pendingCombinationDeleteRows = null;
      this.combinationBulkDeleteCount = 0;
      if (ok && pending?.length) {
        this.executeDeleteCombinationRows(pending);
      }
    });
  }

  onView(v: ProductVariant): void {
    if (this.currentLanguage !== 'vi') {
      this.api.getTranslationByLang('PRODUCT_VARIANT', v.id, this.currentLanguage).subscribe({
        next: (translation) => {
          this.selectedVariant = { ...v };
          if (translation) {
            this.selectedVariant.color = translation.translatedName || v.color;
            this.selectedVariant.size = translation.translatedDescription || v.size;
          }
          this.showDetails = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.selectedVariant = v;
          this.showDetails = true;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.selectedVariant = v;
      this.showDetails = true;
    }
    this.cdr.markForCheck();
  }

  onCloseDetails(): void {
    this.showDetails = false;
    this.selectedVariant = null;
  }

  parseImageUrls(json: unknown): string[] {
    if (!json) return [];
    if (Array.isArray(json)) return json as string[];
    if (typeof json === 'string') {
      return json.split(',').filter((x) => !!x.trim());
    }
    return [];
  }

  addCombinationGalleryRow(row: CombinationTableRow): void {
    if (!row.imageUrls) row.imageUrls = [];
    row.imageUrls.push('');
    this.cdr.markForCheck();
  }

  removeCombinationGalleryRow(row: CombinationTableRow, index: number): void {
    row.imageUrls.splice(index, 1);
    this.cdr.markForCheck();
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByProductId(_: number, p: Product): number {
    return p.id;
  }

  trackByVariantId(_: number, v: ProductVariant): number {
    return v.id;
  }

  saveCombinationEditor(): void {
    this.clearFormErrors();
    if (!this.combinationEditorProduct) return;
    const productId = this.combinationEditorProduct.id;
    const activeRows = this.combinationRows;
    for (const r of activeRows) {
      if (!String(r.sku || '').trim()) {
        this.alerts.open(this.transloco.translate('VARIANT.SKU_REQUIRED'), { appearance: 'warning' }).subscribe();
        return;
      }
    }
    const skuSet = new Set<string>();
    for (const r of activeRows) {
      const sk = String(r.sku).trim().toLowerCase();
      if (skuSet.has(sk)) {
        this.alerts.open(this.transloco.translate('VARIANT.SKU_DUPLICATE'), { appearance: 'warning' }).subscribe();
        return;
      }
      skuSet.add(sk);
    }

    const buildBody = (r: CombinationTableRow): Record<string, unknown> => ({
      productId,
      sku: String(r.sku).trim(),
      stockQuantity: this.getNumericValue(r.stockQuantity),
      color: r.dim1 ?? '',
      size: r.dim2 ?? '',
      weight: r.dim3 ?? '',
      length: 0,
      width: 0,
      height: 0,
      costPrice: this.getNumericValue(r.costPrice),
      price: this.getNumericValue(r.price),
      status: r.status || 'ACTIVE',
      barcode: r.barcode || '',
      imageUrl: r.imageUrl || '',
      imageUrls: r.imageUrls.filter((u) => u.trim()).join(','),
    });

    const updates = activeRows.filter((r) => r.id);
    const creates = activeRows.filter((r) => !r.id);

    // Mọi biến thể đang có trên DB cho SP này mà *không* còn trong bảng đang lưu → phải xóa.
    // (Chỉ dựa vào _removed là không đủ: sau «Tạo tổ hợp» danh sách bị replace, dòng cũ mất khỏi UI
    // nhưng không gắn _removed → không DELETE → INSERT cùng SKU bị trùng UK.)
    const activeIds = new Set(
      activeRows.map((r) => r.id).filter((id): id is number => id != null && id > 0),
    );
    const loadedForProduct = this.variantsRawForProduct(productId);
    const idsToDelete = loadedForProduct
      .map((v) => v.id)
      .filter((id): id is number => id != null && id > 0 && !activeIds.has(id));

    const ops = [
      ...idsToDelete.map((id) => this.api.deleteProductVariant(id)),
      ...updates.map((r) => this.api.updateProductVariant(r.id!, buildBody(r) as any)),
      ...creates.map((r) => this.api.createProductVariant(buildBody(r) as any)),
    ];

    // Cột trái chỉ xem — cập nhật SP gửi đúng dữ liệu đã load (tên/giá/danh mục sửa ở form sản phẩm).
    const base = this.combinationEditorProduct;
    const categoryId = base.categoryId;
    if (categoryId == null) {
      this.alerts.open(this.transloco.translate('VARIANT.CATEGORY_REQUIRED'), { appearance: 'warning' }).subscribe();
      return;
    }
    const productCode = String(base.productCode ?? '').trim();
    if (!productCode) {
      this.alerts.open(this.transloco.translate('VARIANT.PRODUCT_CODE_REQUIRED'), { appearance: 'warning' }).subscribe();
      return;
    }
    const nameTrimmed = String(base.name ?? '').trim();
    const brandTrimmed = String(base.brand ?? '').trim();
    const productBody: Partial<Product> = {
      productCode,
      name: nameTrimmed,
      brand: brandTrimmed || '-',
      categoryId,
      basePrice: this.getNumericValue(base.basePrice as unknown),
      material: base.material ?? '',
      origin: base.origin ?? '',
      imageUrl: (base.imageUrl ?? '').trim(),
      imageUrls: base.imageUrls ?? '',
      isSale: base.isSale ?? false,
      variantDimensionLabels: this.serializeVariantDimensionLabels(),
    };

    this.api.updateProduct(productId, productBody).subscribe({
      next: () => {
        const pipeline = ops.length ? concat(...ops) : EMPTY;
        pipeline.subscribe({
          complete: () => {
            this.alerts.open(this.transloco.translate('GLOBAL.UPDATE_SUCCESS'), { appearance: 'success' }).subscribe();
            this.onCancelCombinationEditor();
            this.loadData();
          },
          error: (err) => this.handleApiError(err),
        });
      },
      error: (err) => this.handleApiError(err),
    });
  }

  /** Mở cùng form tổ hợp theo sản phẩm cha (từ một dòng biến thể). */
  openCombinationEditorForVariant(v: ProductVariant): void {
    const pid = v.productId;
    if (pid == null) return;
    const p =
      this.products.find((x) => x.id === pid) ?? this.filterProductOptions.find((x) => x.id === pid);
    if (p) {
      this.openCombinationEditor(p);
      return;
    }
    this.api.getProductById(pid).subscribe({
      next: (prod) => this.openCombinationEditor(prod),
      error: (err) => this.handleApiError(err),
    });
  }
}
