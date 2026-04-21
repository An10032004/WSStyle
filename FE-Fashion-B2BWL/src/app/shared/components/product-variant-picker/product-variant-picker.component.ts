import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TuiButton, TuiIcon, TuiTextfield } from '@taiga-ui/core';
import { TuiCheckbox } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ApiService, ProductVariant } from '../../../services/api.service';

@Component({
  selector: 'app-product-variant-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TuiButton,
    TuiIcon,
    TuiTextfield,
    TuiCheckbox,
    TuiTextfieldControllerModule,
  ],
  templateUrl: './product-variant-picker.component.html',
  styleUrls: ['./product-variant-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantPickerComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Full product catalog for the left column */
  @Input() products: any[] = [];

  /** Initial selection: explicit variant ids (preferred) */
  @Input() initialVariantIds: number[] = [];

  /**
   * Legacy rules: only productIds — on open we load all variants for these products
   * and treat them as selected.
   */
  @Input() initialProductIdsOnly: number[] = [];

  @Output() confirmed = new EventEmitter<{ variantIds: number[]; productIds: number[] }>();

  searchQuery = '';

  /** productId -> loaded variants */
  variantsByProduct = new Map<number, ProductVariant[]>();
  loadingProductIds = new Set<number>();
  expandedProductIds = new Set<number>();
  selectedVariantIds = new Set<number>();

  constructor(
    private readonly api: ApiService,
    public readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      void this.bootstrapSelection();
    }
  }

  private async bootstrapSelection(): Promise<void> {
    this.searchQuery = '';
    this.variantsByProduct.clear();
    this.loadingProductIds.clear();
    this.expandedProductIds.clear();
    this.selectedVariantIds.clear();

    const fromVariants = (this.initialVariantIds || []).filter((id) => id != null);
    if (fromVariants.length) {
      const pidsToLoad =
        this.initialProductIdsOnly?.length > 0
          ? [...new Set(this.initialProductIdsOnly)]
          : [...new Set((this.products || []).map((x: any) => x.id))];
      await this.loadVariantsForProducts(pidsToLoad);
      for (const id of fromVariants) {
        if (this.findVariantById(id)) {
          this.selectedVariantIds.add(id);
        }
      }
      for (const p of this.products || []) {
        if (this.variantsSelectedForProduct(p) > 0) {
          this.expandedProductIds.add(p.id);
        }
      }
      this.cdr.markForCheck();
      return;
    }

    const legacyPids = (this.initialProductIdsOnly || []).filter((id) => id != null);
    if (legacyPids.length) {
      await this.loadVariantsForProducts(legacyPids);
      for (const pid of legacyPids) {
        const list = this.variantsByProduct.get(pid) || [];
        list.forEach((v) => this.selectedVariantIds.add(v.id));
        this.expandedProductIds.add(pid);
      }
    }
    this.cdr.markForCheck();
  }

  private findVariantById(id: number): ProductVariant | undefined {
    for (const list of this.variantsByProduct.values()) {
      const v = list.find((x) => x.id === id);
      if (v) {
        return v;
      }
    }
    return undefined;
  }

  private loadVariantsForProducts(productIds: number[]): Promise<void> {
    const pending = productIds.filter(
      (id) => !this.variantsByProduct.has(id) && !this.loadingProductIds.has(id),
    );
    if (!pending.length) return Promise.resolve();
    pending.forEach((id) => this.loadingProductIds.add(id));
    const reqs = pending.map((pid) =>
      this.api.getProductVariantsByProduct(pid).pipe(
        catchError(() => of([] as ProductVariant[])),
      ),
    );
    return new Promise((resolve) => {
      forkJoin(reqs).subscribe((lists) => {
        pending.forEach((pid, i) => {
          this.variantsByProduct.set(pid, lists[i] || []);
          this.loadingProductIds.delete(pid);
        });
        resolve();
      });
    });
  }

  filteredProducts(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.products || [];
    return (this.products || []).filter((p) => {
      const name = (p.name || '').toLowerCase();
      const code = (p.productCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }

  isExpanded(pid: number): boolean {
    return this.expandedProductIds.has(pid);
  }

  toggleExpand(p: any): void {
    if (this.expandedProductIds.has(p.id)) {
      this.expandedProductIds.delete(p.id);
    } else {
      this.expandedProductIds.add(p.id);
      void this.loadVariantsForProducts([p.id]).then(() => this.cdr.markForCheck());
    }
    this.cdr.markForCheck();
  }

  variantsFor(p: any): ProductVariant[] {
    return this.variantsByProduct.get(p.id) || [];
  }

  isLoadingVariants(pid: number): boolean {
    return this.loadingProductIds.has(pid);
  }

  variantLabel(v: ProductVariant): string {
    const parts: string[] = [];
    if (v.size) parts.push(`Size: ${v.size}`);
    if (v.color) parts.push(`Color: ${v.color}`);
    if (v.weight) parts.push(`Weight: ${v.weight}`);
    if (v.length != null || v.width != null || v.height != null) {
      parts.push(`L×W×H: ${v.length ?? '-'}×${v.width ?? '-'}×${v.height ?? '-'}`);
    }
    if (parts.length) return parts.join(', ');
    return v.sku || `#${v.id}`;
  }

  displayPrice(v: ProductVariant, product: any): number {
    const base = Number(product?.basePrice) || 0;
    if (v.discountPrice != null && v.discountPrice > 0) return Number(v.discountPrice);
    if (v.price != null && v.price > 0) return Number(v.price);
    const adj = v.priceAdjustment != null ? Number(v.priceAdjustment) : 0;
    return base + adj;
  }

  thumb(product: any, v?: ProductVariant): string {
    return (v?.imageUrl || product?.imageUrl || '').trim();
  }

  isVariantSelected(v: ProductVariant): boolean {
    return this.selectedVariantIds.has(v.id);
  }

  toggleVariant(v: ProductVariant, checked: boolean): void {
    if (checked) this.selectedVariantIds.add(v.id);
    else this.selectedVariantIds.delete(v.id);
    this.cdr.markForCheck();
  }

  variantsSelectedForProduct(p: any): number {
    const vs = this.variantsFor(p);
    return vs.filter((v) => this.selectedVariantIds.has(v.id)).length;
  }

  isProductAllSelected(p: any): boolean {
    const vs = this.variantsFor(p);
    if (!vs.length) return false;
    return vs.every((v) => this.selectedVariantIds.has(v.id));
  }

  isProductPartial(p: any): boolean {
    const n = this.variantsSelectedForProduct(p);
    const vs = this.variantsFor(p);
    return n > 0 && n < vs.length;
  }

  toggleProductAll(p: any, checked: boolean): void {
    void this.loadVariantsForProducts([p.id]).then(() => {
      const vs = this.variantsFor(p);
      if (!vs.length) {
        this.cdr.markForCheck();
        return;
      }
      if (checked) vs.forEach((v) => this.selectedVariantIds.add(v.id));
      else vs.forEach((v) => this.selectedVariantIds.delete(v.id));
      this.cdr.markForCheck();
    });
  }

  selectionCount(): number {
    return this.selectedVariantIds.size;
  }

  /** Xem trước nhanh: tên SP + mô tả biến thể (chỉ các dòng đã load trong modal). */
  getSelectedPreviewRows(): { productName: string; variantLabel: string; variantId: number }[] {
    const ids = [...this.selectedVariantIds].sort((a, b) => a - b);
    return ids.map((vid) => {
      for (const p of this.products || []) {
        const vs = this.variantsByProduct.get(p.id);
        if (!vs?.length) continue;
        const v = vs.find((x) => x.id === vid);
        if (v) {
          return {
            productName: (p.name || `Sản phẩm #${p.id}`) as string,
            variantLabel: this.variantLabel(v),
            variantId: vid,
          };
        }
      }
      return {
        productName: '…',
        variantLabel: `ID ${vid} (mở rộng sản phẩm để tải)`,
        variantId: vid,
      };
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.cdr.markForCheck();
  }

  confirm(): void {
    const variantIds = [...this.selectedVariantIds].sort((a, b) => a - b);
    const productIds = new Set<number>();
    for (const p of this.products) {
      const vs = this.variantsByProduct.get(p.id);
      if (!vs) continue;
      if (vs.some((v) => this.selectedVariantIds.has(v.id))) {
        productIds.add(p.id);
      }
    }
    this.confirmed.emit({ variantIds, productIds: [...productIds] });
    this.close();
  }

  formatMoney(n: number): string {
    return (Math.round(n) || 0).toLocaleString('vi-VN');
  }

  onSearchChange(): void {
    this.cdr.markForCheck();
  }
}
