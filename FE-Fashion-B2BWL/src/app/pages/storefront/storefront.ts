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
  
  bestSellerTags = [
    'Tất cả', 'Áo Khoác / Jacket', 'Áo Khoác', 'Giày / Dép', 'Quần', 'Váy', 
    'Áo Hoodie', 'Ba lô, Túi Xách', 'Nón', 'Áo Có Trụ', 'Áo Sơ Mi', 'Áo Sweater'
  ];
  selectedSellerTag = 'Áo Khoác / Jacket';

  activeBannerIndex = 0;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.api.getProducts().subscribe(products => {
      this.products = products;
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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  getBrand(product: Product): string {
    if (!product.specifications) return 'LOCAL BRAND';
    try {
      const specs = JSON.parse(product.specifications);
      return specs.brand || 'LOCAL BRAND';
    } catch (e) {
      return 'LOCAL BRAND';
    }
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
