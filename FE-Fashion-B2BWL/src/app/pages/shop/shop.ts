import { Component, OnInit, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ApiService, Product, Category } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { TuiButton, TuiIcon, TuiFormatNumberPipe, TuiLabel, TuiDataList } from '@taiga-ui/core';
import { TuiAccordion, TuiCheckbox, TuiBadge, TuiSlider, TuiPagination } from '@taiga-ui/kit';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TuiButton,
    TuiIcon,
    TuiAccordion,
    TuiCheckbox,
    TuiBadge,
    TuiSlider,
    TuiPagination,
    TuiLabel,
    TuiDataList,
    TuiFormatNumberPipe,
    TranslocoModule,
    StorefrontHeaderComponent,
    StorefrontFooterComponent
  ],
  templateUrl: './shop.html',
  styleUrl: './shop.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);

  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: Category[] = [];
  
  // Filter State (Pure properties to avoid NG01203)
  selectedCategoryId: number | null = null;
  priceRange: [number, number] = [0, 10000000];
  selectedBrands = new Set<string>();
  sortBy: 'newest' | 'price-asc' | 'price-desc' = 'newest';
  categorySearchQuery = '';
  brandSearchQuery = '';

  // Pagination State
  page = 0;
  pageSize = 30;

  // Derived Brands from products
  availableBrands: string[] = [];

  constructor() {}

  get pagedProducts(): Product[] {
    const start = this.page * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredProducts.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.pageSize);
  }

  get filteredCategories(): Category[] {
    if (!this.categorySearchQuery.trim()) {
      return this.categories;
    }
    const query = this.categorySearchQuery.toLowerCase();
    return this.categories.filter(c => c.name.toLowerCase().includes(query));
  }

  get filteredBrands(): string[] {
    if (!this.brandSearchQuery.trim()) {
      return this.availableBrands;
    }
    const query = this.brandSearchQuery.toLowerCase();
    return this.availableBrands.filter(b => b.toLowerCase().includes(query));
  }

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();

    this.route.params.subscribe(params => {
        if (params['id']) {
            this.selectedCategoryId = +params['id'];
            this.applyFilters();
        }
    });
  }

  loadCategories() {
    this.api.getCategories().subscribe(cats => {
        this.categories = cats;
        this.cdr.detectChanges();
    });
  }

  loadProducts() {
    const userId = this.auth.currentUserValue?.id;
    this.api.getProducts(userId).subscribe(prods => {
      this.products = prods;
      // Extract unique brands for filtering
      this.availableBrands = Array.from(new Set(prods.map(p => this.getBrand(p)))).filter(b => !!b && b !== 'No Brand');
      this.applyFilters();
    });
  }

  getBrand(p: Product): string {
    return p.brand || 'No Brand';
  }

  getValidCategoryIds(categoryId: number): number[] {
    const ids = [categoryId];
    const findChildren = (parentId: number) => {
      this.categories.filter(c => c.parentId === parentId).forEach(c => {
        ids.push(c.id);
        findChildren(c.id);
      });
    };
    findChildren(categoryId);
    return ids;
  }

  applyFilters() {
    let result = [...this.products];

    // 1. Filter by Category (include children)
    if (this.selectedCategoryId) {
      const validIds = this.getValidCategoryIds(this.selectedCategoryId);
      result = result.filter(p => p.categoryId != null && validIds.includes(p.categoryId));
    }

    // 2. Filter by Price
    const [min, max] = this.priceRange;
    result = result.filter(p => p.basePrice >= min && p.basePrice <= max);

    // 3. Filter by Brand
    if (this.selectedBrands.size > 0) {
      result = result.filter(p => this.selectedBrands.has(this.getBrand(p)));
    }

    // 4. Sorting
    if (this.sortBy === 'price-asc') {
      result.sort((a, b) => a.basePrice - b.basePrice);
    } else if (this.sortBy === 'price-desc') {
      result.sort((a, b) => b.basePrice - a.basePrice);
    } else {
        result.sort((a, b) => b.id - a.id);
    }

    this.filteredProducts = result;
    this.page = 0; // Reset to page 1 on filter change
    
    this.cdr.detectChanges();
  }

  onMinPriceChange(val: number) {
    this.priceRange[0] = Math.min(val, this.priceRange[1] - 100000);
    this.applyFilters();
  }

  onMaxPriceChange(val: number) {
    this.priceRange[1] = Math.max(val, this.priceRange[0] + 100000);
    this.applyFilters();
  }

  toggleBrand(brand: string) {
    if (this.selectedBrands.has(brand)) {
      this.selectedBrands.delete(brand);
    } else {
      this.selectedBrands.add(brand);
    }
    this.applyFilters();
  }

  updateSort(sort: any) {
    this.sortBy = sort;
    this.applyFilters();
  }

  onPageChange(page: number) {
    this.page = page;
    this.scrollToTop();
    this.cdr.detectChanges();
  }

  private scrollToTop() {
    const mainHeader = document.querySelector('.main-content');
    if (mainHeader) {
      mainHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetFilters() {
      this.selectedCategoryId = null;
      this.priceRange = [0, 5000000];
      this.selectedBrands.clear();
      this.sortBy = 'newest';
      this.page = 0;
      this.applyFilters();
  }
}
