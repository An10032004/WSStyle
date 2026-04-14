import { Component, OnInit, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiButton, TuiIcon, TuiTextfield, TuiLabel, TuiDataList, TuiAlertService, TuiDropdown } from '@taiga-ui/core';
import { TuiInputNumber, TuiDataListWrapper, TuiPagination } from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ApiService, Product, ProductVariant, Category } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { AuthService } from '../../services/auth.service';
import { QuantityBreakTableComponent } from '../../shared/components/quantity-break-table/quantity-break-table';

interface QuickOrderItem {
  product: Product;
  variants: (ProductVariant & { 
    selectedQuantity: number;
    calculatedPrice?: number;
    appliedRulesText?: string;
  })[];
  isExpanded: boolean;
  totalSelected: number;
  minPrice?: number;
}

@Component({
  selector: 'app-quick-order-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TranslocoModule, 
    TuiButton, 
    TuiIcon, 
    TuiTextfield, 
    TuiLabel, 
    TuiInputNumber,
    TuiPagination,
    TuiDataListWrapper,
    TuiSelectModule,
    TuiTextfieldControllerModule,
    StorefrontHeaderComponent,
    QuantityBreakTableComponent,
    TuiDropdown
  ],
  templateUrl: './quick-order-form.html',
  styleUrls: ['./quick-order-form.scss']
})
export class QuickOrderFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cart = inject(CartService);
  private readonly alerts = inject(TuiAlertService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  public Math = Math;

  products: QuickOrderItem[] = [];
  filteredProducts: QuickOrderItem[] = [];
  categories: Category[] = [];
  
  searchQuery: string = '';
  selectedCategory: Category | null = null;

  // Pagination
  readonly pageSize = 10;
  index = 0;

  appliedOrderLimits: any[] = [];
  
  readonly stringifyCategory = (category: Category | string): string => 
    typeof category === 'string' ? category : category.name;
  
  loading = true;

  get paginatedProducts(): QuickOrderItem[] {
    const start = this.index * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  get totalItemsSelected(): number {
    return this.products.reduce((acc, p) => acc + p.totalSelected, 0);
  }

  get totalAmount(): number {
    return this.products.reduce((acc, p) => {
      const productTotal = p.variants.reduce((vAcc, v) => vAcc + (v.calculatedPrice || v.price || p.product.basePrice) * v.selectedQuantity, 0);
      return acc + productTotal;
    }, 0);
  }

  /** Có ít nhất một dòng đang chọn thuộc SP đang ẩn giá — không hiển thị tổng tiền. */
  get hasHiddenPriceInSelection(): boolean {
    return this.products.some(
      p =>
        !!p.product.hidePrice &&
        p.variants.some(v => v.selectedQuantity > 0),
    );
  }

  replacementLabel(product: Product): string {
    const t = product.replacementText?.trim();
    return t || 'Liên hệ để có giá';
  }

  /** Thông báo thay thế khi giỏ chọn có SP ẩn giá (lấy SP ẩn giá đầu tiên đang chọn). */
  get hiddenSelectionReplacement(): string {
    for (const row of this.products) {
      if (!row.product.hidePrice) continue;
      if (row.variants.some(v => v.selectedQuantity > 0)) {
        return this.replacementLabel(row.product);
      }
    }
    return 'Liên hệ để có giá';
  }

  ngOnInit(): void {
    /** Phải gửi userId giống storefront/shop — backend mới áp hide price / B2B đúng theo khách. */
    this.auth.user$
      .pipe(
        map((u) => u?.id),
        distinctUntilChanged(),
        switchMap((uid) => {
          this.loading = true;
          this.products = [];
          this.filteredProducts = [];
          this.index = 0;
          return this.api.getProducts(uid);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((prods) => {
        if (prods.length === 0) {
          this.loading = false;
          this.filterProducts();
          this.cdr.detectChanges();
          return;
        }
        prods.forEach((p) => {
          this.api.getProductVariantsByProduct(p.id).subscribe((variants) => {
            const item: QuickOrderItem = {
              product: p,
              variants: variants.map((v) => ({
                ...v,
                selectedQuantity: 0,
                calculatedPrice: v.price || p.basePrice,
              })),
              isExpanded: false,
              totalSelected: 0,
            };
            item.variants.forEach((v) => this.updateVariantPricing(item.product, v));
            item.minPrice = Math.min(
              ...item.variants.map((v) => v.calculatedPrice || 0).filter((x) => x > 0),
            );

            this.products.push(item);
            this.filterProducts();
            this.loading = false;
            this.cdr.detectChanges();
          });
        });
      });

    this.cart.orderLimits$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((limits) => {
        this.appliedOrderLimits = limits;
        this.cdr.detectChanges();
      });

    this.loadCategories();
  }

  updateVariantPricing(product: Product, variant: any) {
    const qty = variant.selectedQuantity || 1; // Default to 1 to show what price would be
    const result = this.cart.calculatePrice(
      product.id, 
      product.categoryId, 
      variant.price || product.basePrice, 
      qty, 
      product.quantityBreaksJson
    );

    variant.calculatedPrice = result.finalPrice;

    if (product.hidePrice) {
      variant.appliedRulesText = '';
      return;
    }
    const rules = [];
    if (result.appliedB2BRule) rules.push(`B2B: ${result.appliedB2BRule.name}`);
    if (result.appliedQBBreak) rules.push(`Sỉ: -${result.appliedQBBreak.discount}%`);

    variant.appliedRulesText = rules.join(' | ');
  }

  getQB(product: Product): any[] {
    return this.cart.getQuantityBreaks({
      productId: product.id,
      categoryId: product.categoryId,
      quantityBreaksJson: product.quantityBreaksJson
    }, this.auth.currentUserValue);
  }

  loadCategories(): void {
    this.api.getCategories().subscribe(cats => {
      this.categories = cats;
      this.cdr.detectChanges();
    });
  }

  toggleExpand(item: QuickOrderItem): void {
    item.isExpanded = !item.isExpanded;
  }

  onQuantityChange(item: QuickOrderItem, variant: any): void {
    item.totalSelected = item.variants.reduce((acc, v) => acc + v.selectedQuantity, 0);
    this.updateVariantPricing(item.product, variant);
    item.minPrice = Math.min(...item.variants.map(v => v.calculatedPrice || 0).filter(p => p > 0));
  }

  filterProducts(): void {
    this.index = 0; // Reset pagination on filter
    this.filteredProducts = this.products.filter(p => {
      const matchesSearch = p.product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                            p.product.productCode.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = !this.selectedCategory || p.product.categoryId === this.selectedCategory.id;
      return matchesSearch && matchesCategory;
    });
  }

  addToCart(): void {
    const itemsToBuy = this.getPreparedItems();
    if (itemsToBuy.length === 0) {
      this.alerts.open('Vui lòng chọn số lượng cho ít nhất một phân loại.', { label: 'Chưa có sản phẩm', appearance: 'info' }).subscribe();
      return;
    }

    const validationResults = this.cart.validateClientSide(itemsToBuy);
    const errors = validationResults.filter(r => !r.success);
    
    if (errors.length > 0) {
       errors.forEach((e: any) => {
         this.alerts.open(e.message, { label: 'Chưa đủ điều kiện đặt hàng', appearance: 'warning' }).subscribe();
       });
       return; // BLOCK ACTION
    }

    itemsToBuy.forEach(item => {
       const parent = this.products.find(p => p.product.id === item.productId);
       if (parent) {
         const variant = parent.variants.find(v => v.id === item.variantId);
         if (variant) {
            this.cart.addToCart(parent.product, variant, item.quantity);
         }
       }
    });

    // Optional: Reset only if you want to clear the form after success
    this.products.forEach(p => {
      p.variants.forEach(v => v.selectedQuantity = 0);
      p.totalSelected = 0;
    });
    this.cdr.detectChanges();
  }

  checkout(): void {
    const itemsToBuy = this.getPreparedItems();
    if (itemsToBuy.length === 0) {
      this.alerts.open('Vui lòng chọn sản phẩm trước khi thanh toán.', { label: 'Giỏ hàng trống', appearance: 'info' }).subscribe();
      return;
    }

    // Double validation (Cart handles its own too, but better UX to block here)
    const validationResults = this.cart.validateClientSide(itemsToBuy);
    const errors = validationResults.filter(r => !r.success);
    if (errors.length > 0) {
      errors.forEach((e: any) => {
        this.alerts.open(e.message, { label: 'Chưa đủ điều kiện thanh toán', appearance: 'warning' }).subscribe();
      });
      return;
    }

    this.addToCart();
    this.router.navigate(['/checkout']);
  }

  private getPreparedItems(): any[] {
    const items: any[] = [];
    this.products.forEach(p => {
      p.variants.forEach(v => {
        if (v.selectedQuantity > 0) {
          items.push({
            productId: p.product.id,
            variantId: v.id,
            name: p.product.name,
            price: v.calculatedPrice || v.price || p.product.basePrice,
            quantity: v.selectedQuantity,
            categoryId: p.product.categoryId,
            basePrice: v.price || p.product.basePrice,
            quantityBreaksJson: p.product.quantityBreaksJson,
            hidePrice: !!p.product.hidePrice,
            replacementText: p.product.replacementText,
            hideAddToCart: !!p.product.hideAddToCart,
          });
        }
      });
    });
    return items;
  }
}
