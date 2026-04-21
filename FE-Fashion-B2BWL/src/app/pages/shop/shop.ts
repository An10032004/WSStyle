import { Component, OnInit, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ApiService, Product, Category } from '../../services/api.service';
import { Observable, map, combineLatest } from 'rxjs';
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

    combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, queryParams]) => {
        if (params['id']) {
            this.selectedCategoryId = +params['id'];
        } else {
            this.selectedCategoryId = null;
        }

        this.urlSearchQuery = queryParams['search'] || '';
        const brand = queryParams['brand'];
        if (brand) {
            this.selectedBrands.clear();
            this.selectedBrands.add(brand);
        }
        
        this.applyFilters();
    });
  }

  urlSearchQuery = '';

  /** Tìm kiếm ngữ nghĩa qua API `/api/ai/search` + nạp lại giá qua `/api/products/search`. */
  aiSearchText = '';
  aiSearchLoading = false;
  aiHint: string | null = null;

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
      this.aiHint = null;
      this.applyFilters();
  }

  runAiSemanticSearch(): void {
    const q = this.aiSearchText.trim();
    if (!q || this.aiSearchLoading) return;
    this.aiSearchLoading = true;
    this.aiHint = null;
    this.cdr.markForCheck();
    const userId = this.auth.currentUserValue?.id;
    this.api.aiSemanticSearch(q, { userId }).subscribe({
      next: (res) => {
        this.aiHint = res.message || null;
        const ids = (res.products ?? []).map((p) => p.id).filter((id) => id != null);
        if (ids.length === 0) {
          this.products = [];
          this.totalElements = 0;
          this.totalPages = 0;
        } else {
          this.loadProductsByIds(ids);
        }
        this.aiSearchLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.aiHint = 'Không thể tìm bằng AI lúc này. Bạn thử lại sau.';
        this.aiSearchLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadProductsByIds(ids: number[]): void {
    const userId = this.auth.currentUserValue?.id;
    this.api
      .searchProducts({
        productIds: ids,
        page: 0,
        size: Math.max(ids.length, 12),
        sortBy: this.sortBy,
        userId,
      })
      .subscribe((res) => {
        this.products = res.content;
        this.totalElements = res.totalElements;
        this.totalPages = res.totalPages;
        this.page = 0;
        this.cdr.markForCheck();
      });
  }
}
