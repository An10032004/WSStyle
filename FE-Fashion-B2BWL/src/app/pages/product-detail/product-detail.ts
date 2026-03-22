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
    TuiFormatNumberPipe,
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
  allImages: string[] = []; // Full pool of images
  displayImages: string[] = []; // Current visible gallery
  quantity: number = 1;
  
  categories = ['NEW ARRIVALS', 'BRANDS', 'MEN', 'WOMEN', 'ACCESSORIES', 'SALE'];
  brandName: string = 'ICON DENIM';

  // Selection state
  selectedColor?: string;
  selectedSize?: string;
  availableColors: string[] = [];
  availableSizes: string[] = [];

  isLightboxOpen: boolean = false;
  lightboxIndex: number = 0;

  // Pricing Rules
  qbRules: any[] = [];
  b2bRule: any | null = null;

  get currentPrice(): number {
    if (!this.product) return 0;
    
    // 1. Determine Base Price (Prioritize Variant-specific price)
    let base = this.product.basePrice;
    if (this.selectedVariant && this.selectedVariant.price != null && this.selectedVariant.price > 0) {
      base = this.selectedVariant.price;
    } else {
      base += (this.selectedVariant?.priceAdjustment || 0);
    }

    // 2. Apply Variant Discount Price if it exists and is lower than base
    if (this.selectedVariant && this.selectedVariant.discountPrice != null && this.selectedVariant.discountPrice > 0) {
      base = Math.min(base, this.selectedVariant.discountPrice);
    }
    
    // 3. Apply B2B Pricing Rule (Wholesale)
    if (this.b2bRule) {
      const discountValue = this.b2bRule.discountValue ?? this.b2bRule.parsedConfig?.discountValue ?? 0;
      const discountType = this.b2bRule.discountType ?? this.b2bRule.parsedConfig?.discountType;

      if (discountType === 'PERCENTAGE') {
        return base * (1 - discountValue / 100);
      } else if (discountType === 'FIXED') {
        return Math.max(0, base - discountValue);
      }
    }
    
    return base;
  }

  get isB2BApplied(): boolean {
    return !!this.b2bRule;
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
      this.loadPricingRules(id);
    });
  }

  loadPricingRules(productId: number) {
    this.api.getPricingRules().subscribe(rules => {
      const activeRules = rules.filter(r => r.status === 'ACTIVE');
      
      // 1. Quantity Break Rules
      this.qbRules = activeRules.filter(r => {
        if (r.ruleType !== 'QUANTITY_BREAK') return false;
        if (r.applyProductType === 'ALL') return true;
        if (r.applyProductType === 'SPECIFIC' && r.applyProductValue) {
          try {
            const val = JSON.parse(r.applyProductValue);
            return val.productIds?.includes(productId);
          } catch (e) { return false; }
        }
        return false;
      });

      this.qbRules.forEach(r => {
        if (r.actionConfig) {
          try {
            r.parsedConfig = JSON.parse(r.actionConfig);
          } catch (e) {}
        }
      });

      // 2. B2B Pricing Rules
      const user = this.auth.currentUserValue;
      const b2bRules = activeRules.filter(r => {
        if (r.ruleType !== 'B2B_PRICE') return false;
        
        // Product Check
        let productMatch = false;
        if (r.applyProductType === 'ALL') productMatch = true;
        else if (r.applyProductType === 'SPECIFIC' && r.applyProductValue) {
          try {
            const val = JSON.parse(r.applyProductValue);
            productMatch = val.productIds?.includes(productId);
          } catch (e) {}
        }

        if (!productMatch) return false;

        // Customer Check
        if (r.applyCustomerType === 'ALL') return true;
        if (r.applyCustomerType === 'GROUP' && r.applyCustomerValue && user?.customerGroup) {
          try {
            const val = JSON.parse(r.applyCustomerValue);
            return val.groupId === user.customerGroup.id;
          } catch (e) {}
        }
        return false;
      });

      // Pick highest priority B2B rule
      if (b2bRules.length > 0) {
        this.b2bRule = b2bRules.sort((a, b) => b.priority - a.priority)[0];
        try {
          this.b2bRule.parsedConfig = JSON.parse(this.b2bRule.actionConfig);
        } catch (e) {}
      } else {
        this.b2bRule = null;
      }
      
      this.cdr.detectChanges();
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
      
      // Collect all possible images (Product images + All Variant images)
      const allVariantImages: string[] = [];
      vs.forEach(v => {
        if (v.imageUrl) allVariantImages.push(v.imageUrl);
        if (v.imageUrls) {
          try {
            const urls = JSON.parse(v.imageUrls);
            if (Array.isArray(urls)) allVariantImages.push(...urls);
          } catch (e) {}
        }
      });

      this.allImages = [...new Set([this.product?.imageUrl, ...allVariantImages])].filter((img): img is string => !!img);
      this.displayImages = [...this.allImages];
      
      if (!this.activeImage && this.displayImages.length > 0) {
        this.activeImage = this.displayImages[0];
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
    
    // 1. Extract variant-specific images
    const variantImages: string[] = [];
    if (v.imageUrl) variantImages.push(v.imageUrl);
    if (v.imageUrls) {
      try {
        const urls = JSON.parse(v.imageUrls);
        if (Array.isArray(urls)) variantImages.push(...urls);
      } catch (e) {}
    }

    // 2. Update displayImages: Variant images first, then others from allImages pool
    if (variantImages.length > 0) {
      this.activeImage = variantImages[0];
      const otherImages = this.allImages.filter(img => !variantImages.includes(img));
      this.displayImages = [...variantImages, ...otherImages];
    } else {
      this.displayImages = [...this.allImages];
    }
    
    this.cdr.detectChanges();
  }

  changeImage(img: string) {
    this.activeImage = img;
    this.cdr.detectChanges();
  }

  prevImage() {
    if (!this.activeImage || this.displayImages.length === 0) return;
    const idx = this.displayImages.indexOf(this.activeImage);
    const prevIdx = (idx - 1 + this.displayImages.length) % this.displayImages.length;
    this.activeImage = this.displayImages[prevIdx];
    this.cdr.detectChanges();
  }

  nextImage() {
    if (!this.activeImage || this.displayImages.length === 0) return;
    const idx = this.displayImages.indexOf(this.activeImage);
    const nextIdx = (idx + 1) % this.displayImages.length;
    this.activeImage = this.displayImages[nextIdx];
    this.cdr.detectChanges();
  }

  zoomImage() {
    if (this.activeImage) {
      this.lightboxIndex = this.displayImages.indexOf(this.activeImage);
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
    this.lightboxIndex = (this.lightboxIndex - 1 + this.displayImages.length) % this.displayImages.length;
    this.cdr.detectChanges();
  }

  lightboxNext() {
    this.lightboxIndex = (this.lightboxIndex + 1) % this.displayImages.length;
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
