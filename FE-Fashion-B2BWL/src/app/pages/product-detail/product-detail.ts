import { Component, OnInit, ChangeDetectionStrategy, inject, ChangeDetectorRef, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService, Product, ProductVariant, OrderLimit } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { TuiButton, TuiIcon, TuiFormatNumberPipe, TuiLabel, TuiDropdown, TuiDialogService, TuiDialog, TuiAlertService, TuiNotification } from '@taiga-ui/core';
import { TuiCarousel, TuiPagination, TuiBadge, TuiAccordion, TuiRating } from '@taiga-ui/kit';
import { TuiTextareaModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs';

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
    TuiRating,
    TuiTextareaModule,
    TuiDialog,
    FormsModule,
    ReactiveFormsModule,
    TuiNotification,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cart = inject(CartService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly alerts = inject(TuiAlertService);
  
  user$ = this.auth.user$;

  product?: Product;
  variants: ProductVariant[] = [];
  activeImage?: string;
  allImages: string[] = []; // Full pool of images
  displayImages: string[] = []; // Current visible gallery
  
  categories = ['NEW ARRIVALS', 'BRANDS', 'MEN', 'WOMEN', 'ACCESSORIES', 'SALE'];
  brandName: string = 'ICON DENIM';

  // Selection state
  selectedColor: string | undefined;
  selectedSize: string | undefined;
  selectedVariant: ProductVariant | undefined;
  selectedTab: 'SPEC' | 'DESC' | 'REVIEWS' = 'SPEC';
  quantity = 1;
  reviews: any[] = [];
  editingReviewId: number | null = null;
  
  // Selected variant / state
  reviewRating = 5;
  reviewComment = '';
  availableColors: string[] = [];
  availableSizes: string[] = [];

  isLightboxOpen: boolean = false;
  lightboxIndex: number = 0;

  selectedWeight: string | undefined;
  selectedLength: number | undefined;

  isVariantsLoaded = false; // Sync flag to prevent initial price jump
  selectedWidth: number | undefined;
  selectedHeight: number | undefined;
  
  availableWeights: string[] = [];

  // Pricing Rules
  @ViewChild('reviewDialog') reviewDialog!: TemplateRef<any>;
  
  qbRules: any[] = [];
  b2bRule: any | null = null;
  quantityBreaks: any[] = [];
  activeOrderLimit: OrderLimit | null = null;

  get isSelectionIncomplete(): boolean {
    if (!this.product || !this.variants || this.variants.length === 0) return false;
    
    const needsColor = this.variants.some(v => !!v.color);
    const needsSize = this.variants.some(v => !!v.size);
    const needsWeight = this.variants.some(v => !!v.weight);

    if (needsColor && !this.selectedColor) return true;
    if (needsSize && !this.selectedSize) return true;
    if (needsWeight && !this.selectedWeight) return true;

    return false;
  }

  get currentPrice(): number {
    if (!this.product) return 0;
    
    // 0. Wait for variants to load to prevent initial price jump (167k -> 190k flash)
    if (!this.isVariantsLoaded) {
      return this.product.basePrice;
    }
    
    // 1. Determine Base Price (Prioritize Variant-specific price as Absolute Override)
    if (this.selectedVariant) {
      if (this.selectedVariant.discountPrice != null && this.selectedVariant.discountPrice > 0) {
        return this.selectedVariant.discountPrice;
      }
      if (this.selectedVariant.price != null && this.selectedVariant.price > 0) {
        return this.selectedVariant.price;
      }
    }

    // 2. If Selection is Incomplete for a product with variants, SHOW RAW BASE PRICE ONLY
    // We suppress all B2B/QB rules to prevent "Price Dipping" (167k vs 190k)
    if (this.isSelectionIncomplete) {
      return this.product.basePrice;
    }

    let base = this.product.basePrice;
    base += (this.selectedVariant?.priceAdjustment || 0);

    // 3. Apply B2B Pricing Rule (Wholesale)
    if (this.b2bRule) {
      const discountValue = this.b2bRule.discountValue ?? this.b2bRule.parsedConfig?.discountValue ?? 0;
      const discountType = this.b2bRule.discountType ?? this.b2bRule.parsedConfig?.discountType;

      if (discountType === 'PERCENTAGE') {
        base = base * (1 - discountValue / 100);
      } else if (discountType === 'FIXED') {
        base = Math.max(0, base - discountValue);
      }
    }

    // 4. Apply Quantity Break Pricing Rule
    if (this.quantityBreaks && this.quantityBreaks.length > 0) {
      const matchedBreak = this.quantityBreaks.find(b => {
        const min = b.min ?? 1;
        const max = b.max ?? 999999999;
        return this.quantity >= min && this.quantity <= max;
      });
      if (matchedBreak && matchedBreak.discount != null) {
        base = base * (1 - matchedBreak.discount / 100);
      }
    }
    
    return base;
  }

  get isVariantPriceApplied(): boolean {
    return !!(this.selectedVariant && (
      (this.selectedVariant.price != null && this.selectedVariant.price > 0) ||
      (this.selectedVariant.discountPrice != null && this.selectedVariant.discountPrice > 0)
    ));
  }

  get isB2BApplied(): boolean {
    if (!this.isVariantsLoaded) return false;
    if (this.isVariantPriceApplied) return false;
    
    // Suppress B2B badges if selection is incomplete for a variant product
    if (this.isSelectionIncomplete) return false;

    return !!this.b2bRule;
  }

  get isQBApplied(): boolean {
    if (!this.isVariantsLoaded) return false;
    if (this.isVariantPriceApplied) return false;
    
    // Suppress QB banners if selection is incomplete for a variant product
    if (this.isSelectionIncomplete) return false;

    return this.quantityBreaks && this.quantityBreaks.length > 0;
  }

  get isMoqViolation(): boolean {
    if (!this.activeOrderLimit || this.activeOrderLimit.limitType !== 'MIN_ORDER_QUANTITY') return false;
    // We match PER_PRODUCT and PER_VARIANT for product-level enforcement
    const isProductLevel = this.activeOrderLimit.limitLevel === 'PER_PRODUCT' || this.activeOrderLimit.limitLevel === 'PER_VARIANT';
    return isProductLevel && this.quantity < this.activeOrderLimit.limitValue;
  }

  constructor() {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadProduct();
    }
    this.route.params.subscribe(() => {
        this.loadProduct();
    });
  }

  loadOrderLimits(productId: number, categoryId: number) {
    this.api.getOrderLimits().subscribe(rules => {
      const activeRules = rules.filter(r => r.status === 'ACTIVE');
      const user = this.auth.currentUserValue;

      const matchedRules = activeRules.filter(r => {
        // 1. Customer Check
        let customerMatch = false;
        if (r.applyCustomerType === 'ALL') customerMatch = true;
        else if (r.applyCustomerType === 'GROUP' && r.applyCustomerValue && user?.customerGroup) {
          try {
            const val = JSON.parse(r.applyCustomerValue);
            customerMatch = val.groupId === user.customerGroup.id;
          } catch (e) {}
        }
        if (!customerMatch) return false;

        // 2. Product Check
        if (r.applyProductType === 'ALL') return true;
        if (r.applyProductType === 'SPECIFIC' && r.applyProductValue) {
          try {
            const val = JSON.parse(r.applyProductValue);
            return val.productIds?.includes(productId);
          } catch (e) {}
        }
        if (r.applyProductType === 'CATEGORY' && r.applyProductValue) {
          try {
            const val = JSON.parse(r.applyProductValue);
            return val.categoryIds?.includes(categoryId);
          } catch (e) {}
        }
        return false;
      });

      if (matchedRules.length > 0) {
        // Pick highest priority MOQ rule
        this.activeOrderLimit = matchedRules.sort((a, b) => b.priority - a.priority)[0];
      } else {
        this.activeOrderLimit = null;
      }
      this.cdr.detectChanges();
    });
  }

  loadReviews(productId: number) {
    this.api.getReviewsByProduct(productId).subscribe(res => {
      this.reviews = res;
      this.cdr.markForCheck();
    });
  }

  get averageRating(): number {
    if (this.reviews.length === 0) return 5.0;
    const sum = this.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / this.reviews.length) * 10) / 10;
  }

  getRatingPercent(stars: number): number {
    if (this.reviews.length === 0) return stars === 5 ? 100 : 0;
    const count = this.reviews.filter(r => r.rating === stars).length;
    return Math.round((count / this.reviews.length) * 100);
  }

  openReviewDialog() {
    console.log('Opening review dialog...');
    this.auth.user$.pipe(take(1)).subscribe(user => {
      console.log('User state:', user);
      if (!user) {
        this.alerts.open('Vui lòng đăng nhập để đánh giá', { label: 'Thông báo', appearance: 'warning' }).subscribe();
        return;
      }
      this.editingReviewId = null;
      this.reviewRating = 5;
      this.reviewComment = '';
      
      console.log('Dialog Template:', this.reviewDialog);
      if (this.reviewDialog) {
        this.dialogs.open(this.reviewDialog, { size: 'm', label: 'Viết đánh giá sản phẩm' }).subscribe();
      } else {
        this.alerts.open('Lỗi: Không tìm thấy mẫu giao diện đánh giá', { appearance: 'error' }).subscribe();
      }
    });
  }

  openEditReview(review: any) {
    this.editingReviewId = review.id;
    this.reviewRating = review.rating;
    this.reviewComment = review.comment;
    if (this.reviewDialog) {
      this.dialogs.open(this.reviewDialog, { size: 'm', label: 'Chỉnh sửa đánh giá' }).subscribe();
    }
  }

  deleteReview(reviewId: number) {
    if (confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
      this.api.deleteReview(reviewId).subscribe(res => {
        this.alerts.open('Xóa đánh giá thành công', { appearance: 'success' }).subscribe();
        this.loadReviews(this.product!.id);
      });
    }
  }

  submitNewReview(observer: any) {
    this.auth.user$.pipe(take(1)).subscribe(user => {
      if (!user || !this.product) return;
      
      const reviewData = {
        productId: this.product.id,
        userId: user.id,
        rating: this.reviewRating,
        comment: this.reviewComment
      };

      if (this.editingReviewId) {
        this.api.updateReview(this.editingReviewId, reviewData).subscribe({
          next: () => {
            this.alerts.open('Cập nhật đánh giá thành công!', { label: 'Thành công', appearance: 'success' }).subscribe();
            this.loadReviews(this.product!.id);
            observer.complete();
          },
          error: (err) => {
            this.alerts.open(err.error?.message || 'Có lỗi xảy ra khi cập nhật đánh giá', { appearance: 'error' }).subscribe();
          }
        });
      } else {
        this.api.submitReview(reviewData).subscribe({
          next: () => {
            this.alerts.open('Gửi đánh giá thành công!', { label: 'Thành công', appearance: 'success' }).subscribe();
            this.loadReviews(this.product!.id);
            observer.complete();
          },
          error: (err) => {
            this.alerts.open(err.error?.message || 'Có lỗi xảy ra khi gửi đánh giá', { appearance: 'error' }).subscribe();
          }
        });
      }
    });
  }

  private loadProduct() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const userId = this.auth.currentUserValue?.id;
    if (idParam) {
      const id = parseInt(idParam);
      this.api.getProductById(id, userId).subscribe((p) => {
        this.product = p;
        this.loadReviews(p.id);
        if (p.quantityBreaksJson) {
          try {
            this.quantityBreaks = JSON.parse(p.quantityBreaksJson);
          } catch (e) {
            console.error('Error parsing quantity breaks', e);
          }
        }
        this.brandName = p.brand || 'NO BRAND';
        this.cdr.detectChanges();
        this.loadVariants(id);
        this.loadPricingRules(id);
        if (p.categoryId) {
          this.loadOrderLimits(p.id, p.categoryId);
        }
      });
    }
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
      
      // Extract colors from structured fields
      const colors = new Set<string>();
      this.variants.forEach(v => {
        if (v.color) colors.add(v.color);
      });
      this.availableColors = Array.from(colors);

      // No auto-selection: let the user pick
      
      // Collect all possible images (Product images + All Variant images)
      const allVariantImages: string[] = [];
      vs.forEach(v => {
        if (v.imageUrl) allVariantImages.push(v.imageUrl);
        if (v.imageUrls) {
          const urls = typeof v.imageUrls === 'string' ? v.imageUrls.split(',').filter(u => !!u.trim()) : (v.imageUrls as any);
          if (Array.isArray(urls)) allVariantImages.push(...urls);
        }
      });

      const prodImageUrls: string[] = [];
      if (this.product?.imageUrls) {
        const urls = typeof this.product.imageUrls === 'string' ? this.product.imageUrls.split(',').filter(u => !!u.trim()) : (this.product.imageUrls as any);
        if (Array.isArray(urls)) prodImageUrls.push(...urls);
      }

      this.allImages = [...new Set([
        this.product?.imageUrl, 
        ...prodImageUrls, 
        ...allVariantImages
      ])].filter((img): img is string => !!img);
      this.displayImages = [...this.allImages];
      
      if (!this.activeImage && this.displayImages.length > 0) {
        this.activeImage = this.displayImages[0];
      }
      this.isVariantsLoaded = true; // Signal that we are ready
      this.cdr.detectChanges();
    });
  }

  selectColor(color: string) {
    this.selectedColor = color;
    const sizes = this.variants
      .filter(v => v.color === color)
      .map(v => v.size)
      .filter(s => !!s);
    
    this.availableSizes = Array.from(new Set(sizes as string[]));
    
    // No auto-selection of size: find variant if current selection is complete
    this.findMatchingVariant();
  }

  selectSize(size: string) {
    this.selectedSize = size;
    const weights = this.variants
      .filter(v => v.color === this.selectedColor && v.size === size)
      .map(v => v.weight)
      .filter(w => !!w);
    
    this.availableWeights = Array.from(new Set(weights as string[]));

    // No auto-selection of weight: find variant if current selection is complete
    this.findMatchingVariant();
  }

  selectWeight(weight: string) {
    this.selectedWeight = weight;
    this.findMatchingVariant();
  }

  findMatchingVariant() {
    if (!this.product || !this.variants) return;

    // Reset current variant if selection is incomplete
    if (this.isSelectionIncomplete) {
      this.applyVariant(undefined);
      return;
    }

    const matched = this.variants.find(v => {
      const colorMatch = !v.color || v.color === this.selectedColor;
      const sizeMatch = !v.size || v.size === this.selectedSize;
      const weightMatch = !v.weight || v.weight === this.selectedWeight;
      return colorMatch && sizeMatch && weightMatch;
    });

    if (matched) {
      this.applyVariant(matched);
    } else {
      this.applyVariant(undefined); // No match found for this combo
    }
  }

  selectVariant(v: ProductVariant) {
    this.selectedColor = v.color;
    this.selectedSize = v.size;
    this.selectedWeight = v.weight;
    this.applyVariant(v);
  }

  private applyVariant(v: ProductVariant | undefined) {
    this.selectedVariant = v;
    
    if (!v) {
      this.displayImages = [...this.allImages];
      this.cdr.detectChanges();
      return;
    }

    // 1. Extract variant-specific images
    const variantImages: string[] = [];
    if (v.imageUrl) variantImages.push(v.imageUrl);
    if (v.imageUrls) {
      const urls = typeof v.imageUrls === 'string' ? v.imageUrls.split(',').filter(u => !!u.trim()) : (v.imageUrls as any);
      if (Array.isArray(urls)) variantImages.push(...urls);
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

  getColorHex(color: string): string {
    const map: { [key: string]: string } = {
      'Đỏ': '#dc2626',
      'Đen': '#171717',
      'Trắng': '#ffffff',
      'Xanh': '#2563eb',
      'Vàng': '#facc15',
      'Hồng': '#db2777',
      'Xám': '#4b5563',
      'Nâu': '#78350f',
      'Kem': '#fef3c7',
      'Rêu': '#166534',
      'Be': '#f5f5dc',
      'Tím': '#7c3aed',
      'Cam': '#ea580c',
      'Xanh lá': '#16a34a',
      'Xanh dương': '#1d4ed8',
      'Xanh navy': '#1e3a8a',
      'Xanh rêu': '#3f6212',
      'Than': '#334155'
    };
    return map[color] || color; // Fallback to raw string if no map found
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
    const limit = max > 0 ? max : 999;
    this.quantity = Math.max(1, Math.min(limit, this.quantity + amt));
    this.cdr.detectChanges();
  }

  handleQuantityInput(event: any) {
    const val = parseInt(event.target.value);
    const max = this.selectedVariant?.stockQuantity || 0;
    const limit = max > 0 ? max : 999;
    
    if (isNaN(val) || val < 1) {
      this.quantity = 1;
    } else if (val > limit) {
      this.quantity = limit;
    } else {
      this.quantity = val;
    }
    this.cdr.detectChanges();
  }

  addToCart() {
    if (!this.product) return;
    this.cart.addToCart(this.product, this.selectedVariant, this.quantity, this.currentPrice);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
