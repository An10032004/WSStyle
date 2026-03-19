import { Component, OnInit, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService, Product, ProductVariant } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { TuiButton, TuiIcon, TuiFormatNumberPipe, TuiLabel, TuiDropdown } from '@taiga-ui/core';
import { TuiCarousel, TuiPagination, TuiBadge } from '@taiga-ui/kit';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TuiButton,
    TuiCarousel,
    TuiPagination,
    TuiFormatNumberPipe,
    TuiBadge,
    TuiIcon,
    TuiLabel,
    TuiDropdown,
    TranslocoModule,
    StorefrontHeaderComponent,
    StorefrontFooterComponent,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  user$ = this.auth.user$;

  product?: Product;
  variants: ProductVariant[] = [];
  selectedVariant?: ProductVariant;
  activeImage?: string;
  images: string[] = [];
  quantity: number = 1;
  
  categories = ['NEW ARRIVALS', 'BRANDS', 'MEN', 'WOMEN', 'ACCESSORIES', 'SALE'];
  brandName: string = 'ICON DENIM';

  // Selection state
  selectedColor?: string;
  selectedSize?: string;
  availableColors: string[] = [];
  availableSizes: string[] = [];

  // Lightbox state
  isLightboxOpen: boolean = false;
  lightboxIndex: number = 0;

  get currentPrice(): number {
    if (!this.product) return 0;
    return this.product.basePrice + (this.selectedVariant?.priceAdjustment || 0);
  }

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadProduct(id);
    }
  }

  loadProduct(id: number) {
    this.api.getProductById(id).subscribe(p => {
      this.product = p;
      if (p.specifications) {
        try {
          const specs = JSON.parse(p.specifications);
          this.brandName = specs.brand || 'NO BRAND';
        } catch (e) {}
      }
      this.cdr.detectChanges();
      this.loadVariants(id);
    });
  }

  loadVariants(productId: number) {
    this.api.getProductVariantsByProduct(productId).subscribe(vs => {
      this.variants = vs;
      
      // Parse attributes and extract colors
      const colors = new Set<string>();
      this.variants.forEach(v => {
        if (v.attributes) {
          try {
            const attr = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
            if (attr.color) colors.add(attr.color);
            (v as any).parsedAttributes = attr;
          } catch (e) {
            console.error('Failed to parse attributes', e);
          }
        }
      });
      this.availableColors = Array.from(colors);

      if (this.availableColors.length > 0) {
        this.selectColor(this.availableColors[0]);
      } else if (this.variants.length > 0) {
        this.selectVariant(this.variants[0]);
      }
      
      const variantImages = vs.map(v => v.imageUrl).filter((img): img is string => !!img);
      this.images = [...new Set([this.product?.imageUrl, ...variantImages])].filter((img): img is string => !!img);
      
      if (!this.activeImage && this.images.length > 0) {
        this.activeImage = this.images[0];
      }
      this.cdr.detectChanges();
    });
  }

  selectColor(color: string) {
    this.selectedColor = color;
    const sizes = this.variants
      .filter(v => (v as any).parsedAttributes?.color === color)
      .map(v => (v as any).parsedAttributes?.size)
      .filter(s => !!s);
    
    this.availableSizes = Array.from(new Set(sizes));
    
    if (this.availableSizes.length > 0) {
      // Preserve size if available in new color, otherwise select first
      if (!this.selectedSize || !this.availableSizes.includes(this.selectedSize)) {
        this.selectSize(this.availableSizes[0]);
      } else {
        this.selectSize(this.selectedSize);
      }
    } else {
      const v = this.variants.find(v => (v as any).parsedAttributes?.color === color);
      if (v) this.selectVariant(v);
    }
  }

  selectSize(size: string) {
    this.selectedSize = size;
    const v = this.variants.find(v => 
      (v as any).parsedAttributes?.color === this.selectedColor && 
      (v as any).parsedAttributes?.size === size
    );
    if (v) {
      this.selectVariant(v);
    } else {
      // Fallback if size not found for color (shouldn't happen with filtered list)
      const v2 = this.variants.find(v => (v as any).parsedAttributes?.size === size);
      if (v2) this.selectVariant(v2);
    }
  }

  selectVariant(v: ProductVariant) {
    this.selectedVariant = v;
    if (v.imageUrl) {
      this.activeImage = v.imageUrl;
    }
    this.cdr.detectChanges();
  }

  changeImage(img: string) {
    this.activeImage = img;
    this.cdr.detectChanges();
  }

  prevImage() {
    if (!this.activeImage || this.images.length === 0) return;
    const idx = this.images.indexOf(this.activeImage);
    const prevIdx = (idx - 1 + this.images.length) % this.images.length;
    this.activeImage = this.images[prevIdx];
    this.cdr.detectChanges();
  }

  nextImage() {
    if (!this.activeImage || this.images.length === 0) return;
    const idx = this.images.indexOf(this.activeImage);
    const nextIdx = (idx + 1) % this.images.length;
    this.activeImage = this.images[nextIdx];
    this.cdr.detectChanges();
  }

  zoomImage() {
    if (this.activeImage) {
      this.lightboxIndex = this.images.indexOf(this.activeImage);
      if (this.lightboxIndex === -1) this.lightboxIndex = 0;
      this.isLightboxOpen = true;
      document.body.style.overflow = 'hidden'; // Prevent scroll
      this.cdr.detectChanges();
    }
  }

  closeLightbox() {
    this.isLightboxOpen = false;
    document.body.style.overflow = 'auto';
    this.cdr.detectChanges();
  }

  lightboxPrev() {
    this.lightboxIndex = (this.lightboxIndex - 1 + this.images.length) % this.images.length;
    this.cdr.detectChanges();
  }

  lightboxNext() {
    this.lightboxIndex = (this.lightboxIndex + 1) % this.images.length;
    this.cdr.detectChanges();
  }

  adjQuantity(amt: number) {
    const max = this.selectedVariant?.stockQuantity || 0;
    this.quantity = Math.max(1, Math.min(max > 0 ? max : 999, this.quantity + amt));
    this.cdr.detectChanges();
  }

  addToCart() {
    alert(`Added ${this.quantity} x ${this.product?.name} (${this.selectedColor}/${this.selectedSize}) to cart!`);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
