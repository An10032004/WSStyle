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

/** Một hàng thuộc tính động (tối đa 3 hàng → map API color / size / weight). */
export interface VariantAttributeRow {
  name: string;
  values: string[];
  tagInput: string;
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
  rowData: ProductVariant[] = [];
  /** Bản sao từ API (không bị ghi đè bởi bản dịch) — dùng suy luận thuộc tính / tổ hợp. */
  variantsRaw: ProductVariant[] = [];

  products: Product[] = [];
  categories: Category[] = [];

  readonly filterProductAllSentinel = -1;
  filterProductId = -1;
  productQuickFilter = '';

  /** Phân trang danh sách sản phẩm (client-side). */
  productListPage = 1;
  productListPageSize = 10;
  readonly productListPageSizeOptions = [5, 10, 20, 50];

  /** Sản phẩm đang mở rộng danh sách biến thể. */
  expandedProductIds = new Set<number>();

  showCombinationEditor = false;
  combinationEditorProduct: Product | null = null;
  /** Bản nháp SP (cột trái): chỉnh tên / mô tả / giá khi Lưu. */
  editorProductDraft: Partial<Product> & { id: number } | null = null;

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
  }

  get productsSorted(): Product[] {
    return [...this.products].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }

  /** Danh sách SP sau lọc (chưa phân trang). */
  get filteredProducts(): Product[] {
    let list = this.productsSorted;
    if (this.filterProductId !== this.filterProductAllSentinel) {
      list = list.filter((p) => p.id === this.filterProductId);
    }
    const q = this.productQuickFilter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.productCode || '').toLowerCase().includes(q) ||
        String(p.id).includes(q),
    );
  }

  get filteredProductCount(): number {
    return this.filteredProducts.length;
  }

  get productListPageCount(): number {
    return Math.max(1, Math.ceil(this.filteredProductCount / this.productListPageSize));
  }

  /** Trang hiệu lực (kẹp sau khi lọc thu hẹp). */
  get effectiveProductListPage(): number {
    return Math.min(Math.max(1, this.productListPage), this.productListPageCount);
  }

  get pagedDisplayedProducts(): Product[] {
    const page = this.effectiveProductListPage;
    const start = (page - 1) * this.productListPageSize;
    return this.filteredProducts.slice(start, start + this.productListPageSize);
  }

  get productListRangeFrom(): number {
    if (this.filteredProductCount === 0) return 0;
    return (this.effectiveProductListPage - 1) * this.productListPageSize + 1;
  }

  get productListRangeTo(): number {
    return Math.min(this.effectiveProductListPage * this.productListPageSize, this.filteredProductCount);
  }

  private resetProductListPagination(): void {
    this.productListPage = 1;
  }

  onProductQuickFilterChange(): void {
    this.resetProductListPagination();
    this.cdr.markForCheck();
  }

  onProductListPageSizeChange(size: number): void {
    this.productListPageSize = size;
    this.resetProductListPagination();
    this.cdr.markForCheck();
  }

  goProductListPrev(): void {
    this.productListPage = Math.max(1, this.effectiveProductListPage - 1);
    this.cdr.markForCheck();
  }

  goProductListNext(): void {
    this.productListPage = Math.min(this.productListPageCount, this.effectiveProductListPage + 1);
    this.cdr.markForCheck();
  }

  getProductDisplay(id: number | null | undefined): string {
    if (id == null) return '';
    const p = this.products.find((x) => x.id === id);
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
    const p = this.products.find((x) => x.id === productId);
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
    this.cdr.markForCheck();
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
    this.variantListPageLoading = true;
    this.expandedProductIds.clear();
    forkJoin({
      products: this.api.getProducts(),
      categories: this.api.getCategories(),
    }).subscribe({
      next: ({ products, categories }) => {
        this.products = products;
        this.categories = categories;
        this.variantsRaw = [];
        this.rowData = [];
        this.variantsFetchedProductIds.clear();
        this.variantsLoadingProductIds.clear();
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
    this.editorProductDraft = {
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      basePrice: product.basePrice,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl ?? '',
    };
    const raw = this.variantsRawForProduct(pid);
    this.attributeRows = this.inferAttributeRows(raw, product);
    this.combinationRows = this.buildCombinationRowsFromVariants(raw);
    this.combinationSkuSearch = '';
    this.combinationPage = 1;
    this.showCombinationEditor = true;
    this.cdr.markForCheck();
  }

  onCancelCombinationEditor(): void {
    this.showCombinationEditor = false;
    this.combinationEditorProduct = null;
    this.editorProductDraft = null;
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
    this.attributeRows.push({ name: '', values: [], tagInput: '' });
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
        next.push({
          label,
          dim1,
          dim2,
          dim3,
          sku: '',
          stockQuantity: 0,
          costPrice: 0,
          price: 0,
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

  private parseVariantDimensionLabelSlots(product?: Product | null): [string, string, string] {
    const empty: [string, string, string] = ['', '', ''];
    if (!product?.variantDimensionLabels) return empty;
    try {
      const a = JSON.parse(product.variantDimensionLabels) as unknown;
      if (!Array.isArray(a)) return empty;
      return [
        String(a[0] ?? '').trim(),
        String(a[1] ?? '').trim(),
        String(a[2] ?? '').trim(),
      ];
    } catch {
      return empty;
    }
  }

  /** Lưu 3 nhãn cột (map với color / size / weight) đồng bộ PDP. */
  private serializeVariantDimensionLabels(): string {
    const pad: VariantAttributeRow[] = [...this.attributeRows];
    while (pad.length < 3) {
      pad.push({ name: '', values: [], tagInput: '' });
    }
    return JSON.stringify(pad.slice(0, 3).map((r) => (r.name || '').trim()));
  }

  private inferAttributeRows(variants: ProductVariant[], product?: Product | null): VariantAttributeRow[] {
    const labelSlots = this.parseVariantDimensionLabelSlots(product);
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
        name: labelSlots[0] || this.transloco.translate('VARIANT.COLOR'),
        values: [],
        tagInput: '',
      });
      return rows;
    }
    if (colors.length || variants.some((v) => (v.color ?? '').trim())) {
      rows.push({
        name: labelSlots[0] || this.transloco.translate('VARIANT.COLOR'),
        values: colors,
        tagInput: '',
      });
    }
    if (sizes.length || variants.some((v) => (v.size ?? '').trim())) {
      rows.push({
        name: labelSlots[1] || this.transloco.translate('VARIANT.SIZE'),
        values: sizes,
        tagInput: '',
      });
    }
    if (weights.length || variants.some((v) => (v.weight ?? '').trim())) {
      rows.push({
        name: labelSlots[2] || this.transloco.translate('VARIANT.WEIGHT'),
        values: weights,
        tagInput: '',
      });
    }
    if (rows.length === 0) {
      rows.push({
        name: labelSlots[0] || this.transloco.translate('VARIANT.COLOR'),
        values: [],
        tagInput: '',
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
    if (!this.combinationEditorProduct || !this.editorProductDraft) return;
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

    // Backend ProductRequest validates full body (@NotBlank productCode, name, brand; @NotNull categoryId).
    // Chỉ gửi draft từ sidebar sẽ thiếu brand/productCode → 400. Luôn merge với sản phẩm đã load.
    const base = this.combinationEditorProduct;
    const draft = this.editorProductDraft;
    const categoryId = draft.categoryId ?? base.categoryId;
    if (categoryId == null) {
      this.alerts.open(this.transloco.translate('VARIANT.CATEGORY_REQUIRED'), { appearance: 'warning' }).subscribe();
      return;
    }
    const productCode = String(base.productCode ?? '').trim();
    if (!productCode) {
      this.alerts.open(this.transloco.translate('VARIANT.PRODUCT_CODE_REQUIRED'), { appearance: 'warning' }).subscribe();
      return;
    }
    const nameTrimmed = String(draft.name ?? base.name ?? '').trim() || String(base.name ?? '').trim();
    const brandTrimmed = String(base.brand ?? '').trim();
    const productBody: Partial<Product> = {
      productCode,
      name: nameTrimmed,
      brand: brandTrimmed || '-',
      categoryId,
      basePrice: this.getNumericValue((draft.basePrice as any) ?? (base.basePrice as any)),
      material: base.material ?? '',
      origin: base.origin ?? '',
      imageUrl: (draft.imageUrl ?? base.imageUrl ?? '').trim(),
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
    const p = this.products.find((x) => x.id === pid);
    if (!p) return;
    this.openCombinationEditor(p);
  }
}
