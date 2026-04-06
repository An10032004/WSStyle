import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiButton, TuiIcon, TuiTextfield, TuiLabel, TuiDataList, TuiDropdownService } from '@taiga-ui/core';
import { TuiInputNumber, TuiDataListWrapper } from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ApiService, Product, ProductVariant, Category } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';

interface QuickOrderItem {
  product: Product;
  variants: (ProductVariant & { selectedQuantity: number })[];
  isExpanded: boolean;
  totalSelected: number;
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
    TuiDataListWrapper,
    TuiSelectModule,
    TuiTextfieldControllerModule,
    StorefrontHeaderComponent
  ],
  templateUrl: './quick-order-form.html',
  styleUrls: ['./quick-order-form.scss']
})
export class QuickOrderFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cart = inject(CartService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  public Math = Math;

  products: QuickOrderItem[] = [];
  filteredProducts: QuickOrderItem[] = [];
  categories: Category[] = [];
  
  searchQuery: string = '';
  selectedCategory: Category | null = null;
  
  readonly stringifyCategory = (category: Category | string): string => 
    typeof category === 'string' ? category : category.name;
  loading = true;

  get totalItemsSelected(): number {
    return this.products.reduce((acc, p) => acc + p.totalSelected, 0);
  }

  get totalAmount(): number {
    return this.products.reduce((acc, p) => {
      const productTotal = p.variants.reduce((vAcc, v) => vAcc + (v.price || p.product.basePrice) * v.selectedQuantity, 0);
      return acc + productTotal;
    }, 0);
  }

  ngOnInit(): void {
    this.loadData();
    this.loadCategories();
  }

  loadData(): void {
    this.loading = true;
    this.api.getProducts().subscribe(prods => {
      prods.forEach(p => {
        this.api.getProductVariantsByProduct(p.id).subscribe(variants => {
          this.products.push({
            product: p,
            variants: variants.map(v => ({ ...v, selectedQuantity: 0 })),
            isExpanded: false,
            totalSelected: 0
          });
          this.filterProducts();
          this.loading = false;
          this.cdr.detectChanges();
        });
      });
    });
  }

  loadCategories(): void {
    this.api.getCategories().subscribe(cats => {
      this.categories = cats;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  toggleExpand(item: QuickOrderItem): void {
    item.isExpanded = !item.isExpanded;
  }

  onQuantityChange(item: QuickOrderItem): void {
    item.totalSelected = item.variants.reduce((acc, v) => acc + v.selectedQuantity, 0);
  }

  filterProducts(): void {
    this.filteredProducts = this.products.filter(p => {
      const matchesSearch = p.product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                            p.product.productCode.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = !this.selectedCategory || p.product.categoryId === this.selectedCategory.id;
      return matchesSearch && matchesCategory;
    });
  }

  addToCart(): void {
    let count = 0;
    this.products.forEach(p => {
      p.variants.forEach(v => {
        if (v.selectedQuantity > 0) {
          this.cart.addToCart(p.product, v, v.selectedQuantity);
          count++;
        }
      });
    });

    if (count > 0) {
      // Reset quantities after adding to cart? User preference.
      // this.products.forEach(p => p.variants.forEach(v => v.selectedQuantity = 0));
      // this.products.forEach(p => p.totalSelected = 0);
    }
  }

  checkout(): void {
    this.addToCart();
    this.router.navigate(['/checkout']);
  }
}
