import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TuiButton, TuiIcon, TuiLabel, TuiDropdown } from '@taiga-ui/core';
import { TuiBadge, TuiCarousel } from '@taiga-ui/kit';
import { TranslocoModule } from '@jsverse/transloco';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { ApiService, Product } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-storefront',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    TuiButton, 
    TuiIcon, 
    TuiLabel, 
    TuiBadge, 
    TuiCarousel, 
    TranslocoModule, 
    TuiDropdown,
    StorefrontHeaderComponent,
    StorefrontFooterComponent
  ],
  templateUrl: './storefront.html',
  styleUrls: ['./storefront.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  user$ = this.auth.user$;

  products: Product[] = [];
  banners = [
    'https://dosi-in.com/file/detailed/392/dosiin-89773346_141384927379462_7482344538762117120_n__1_392970.jpg?w=1200&h=500&fit=crop&fm=webp',
    'https://dosi-in.com/file/detailed/101/dosiin-FB_header101073.jpeg?w=1200&h=500&fit=crop&fm=webp',
    'https://dosi-in.com/file/detailed/33/dosiin-Banner_-_Gori33171.jpg?w=1200&h=500&fit=crop&fm=webp'
  ];
  
  subBanners = [
    'https://dosi-in.com/file/detailed/48/dosiin-Untitled-2.jpg?w=1200&h=500&fit=crop&fm=webp',
    'https://dosi-in.com/file/detailed/127/dosiin-dosin127004.jpeg?w=1200&h=500&fit=crop&fm=webp'
  ];
  
  categories = ['NEW ARRIVALS', 'BRANDS', 'MEN', 'WOMEN', 'ACCESSORIES', 'SALE'];
  
  bestSellerTags: string[] = ['Tất cả'];
  selectedSellerTag = 'Tất cả';
  filteredProducts: Product[] = [];
  categoriesData: any[] = [];

  trendingCategories: any[] = [];
  activeBannerIndex = 0;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit() {
    this.api.getProducts().subscribe(products => {
      this.products = products;
      this.filterByTag();
      this.updateTrendingCategories();
      this.cdr.detectChanges();
    });

    this.api.getCategories().subscribe(cats => {
      this.categoriesData = cats;
      this.bestSellerTags = ['Tất cả', ...cats.map(c => c.name)];
      this.updateTrendingCategories();
      this.cdr.detectChanges();
    });

    this.api.getHomeSettings().subscribe(settings => {
      const hero = settings.find(s => s.settingKey === 'HERO_BANNERS');
      if (hero && hero.settingValue) {
        const urls = JSON.parse(hero.settingValue);
        if (urls.length > 0) this.banners = urls;
      }

      const sub = settings.find(s => s.settingKey === 'SUB_BANNERS');
      if (sub && sub.settingValue) {
        const urls = JSON.parse(sub.settingValue);
        if (urls.length > 0) this.subBanners = urls;
      }
      this.cdr.detectChanges();
    });
  }

  updateTrendingCategories() {
    if (this.categoriesData.length === 0 || this.products.length === 0) {
      // Fallback mocks if truly empty
      this.trendingCategories = [
        { name: 'OUTERWEAR', imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop' },
        { name: 'ACCESSORIES', imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop' }
      ];
      return;
    }
    
    // Diverse placeholder set to avoid identical images
    const placeholders = [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop', // Jacket
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop', // Bag/Acc
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop', // T-shirt
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=400&h=400&fit=crop'  // Sneakers
    ];
    
    // Pick top 4 categories and try to find a product image for each
    this.trendingCategories = this.categoriesData.slice(0, 4).map((cat, idx) => {
      const productImage = this.products.find(p => p.categoryId === cat.id)?.imageUrl;
      return {
        name: cat.name,
        imageUrl: productImage || placeholders[idx % placeholders.length]
      };
    });
  }

  selectTag(tag: string) {
    this.selectedSellerTag = tag;
    this.filterByTag();
    this.cdr.detectChanges();
  }

  filterByTag() {
    if (this.selectedSellerTag === 'Tất cả') {
      this.filteredProducts = this.products;
    } else {
      const selectedCat = this.categoriesData.find(c => c.name === this.selectedSellerTag);
      if (selectedCat) {
        this.filteredProducts = this.products.filter(p => p.categoryId === selectedCat.id);
      } else {
        this.filteredProducts = [];
      }
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  getBrand(product: Product): string {
    return product.brand || 'LOCAL BRAND';
  }

  formatIndex(i: number): string {
    return (i + 1).toString().padStart(2, '0');
  }

  prev(): void {
    this.activeBannerIndex = (this.activeBannerIndex - 1 + this.banners.length) % this.banners.length;
  }

  next(): void {
    this.activeBannerIndex = (this.activeBannerIndex + 1) % this.banners.length;
  }
}
