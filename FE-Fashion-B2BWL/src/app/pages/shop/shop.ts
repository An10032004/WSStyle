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
  readonly api = inject(ApiService);
  readonly route = inject(ActivatedRoute);
  readonly cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);

  products: Product[] = [];
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
  totalPages = 0;
  totalElements = 0;

  // Derived Brands from products
  availableBrands: string[] = [];

  constructor() {}

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
    this.api.getProductBrands().subscribe(brands => {
        this.availableBrands = brands;
        this.cdr.detectChanges();
    });

    this.route.params.subscribe(params => {
        if (params['id']) {
            this.selectedCategoryId = +params['id'];
        }
        // applyFilters handles loadProducts and resetting page to 0
        this.applyFilters();
    });

    this.route.queryParams.subscribe(params => {
        this.urlSearchQuery = params['search'] || '';
        this.applyFilters();
    });
  }

  urlSearchQuery = '';

  loadCategories() {
    this.api.getCategories().subscribe(cats => {
        this.categories = cats;
        this.cdr.detectChanges();
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
    return ids; // Ensure this returns the correct nested array structure, it currently does flat map.
  }

  loadProducts() {
    const userId = this.auth.currentUserValue?.id;
    let categoryIds: number[] = [];
    if (this.selectedCategoryId) {
       categoryIds = this.getValidCategoryIds(this.selectedCategoryId);
    }

    this.api.searchProducts({
        search: this.urlSearchQuery,
        categoryIds: categoryIds.length > 0 ? categoryIds : null,
        minPrice: this.priceRange[0],
        maxPrice: this.priceRange[1],
        brands: Array.from(this.selectedBrands),
        sortBy: this.sortBy,
        page: this.page,
        size: this.pageSize,
        userId: userId
    }).subscribe(res => {
        this.products = res.content;
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.cdr.detectChanges();
    });
  }

  applyFilters() {
    this.page = 0; // Reset to page 0 on filter change
    this.loadProducts();
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
    this.loadProducts(); // Load new page from server
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
