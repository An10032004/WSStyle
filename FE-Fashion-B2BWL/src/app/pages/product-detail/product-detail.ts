import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef,
  ViewChild,
  TemplateRef,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService, Product, ProductVariant, OrderLimit, Bundle } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';
import { QuantityBreakTableComponent } from '../../shared/components/quantity-break-table/quantity-break-table';
import { TuiButton, TuiIcon, TuiFormatNumberPipe, TuiLabel, TuiDropdown, TuiDialogService, TuiDialog, TuiAlertService, TuiNotification } from '@taiga-ui/core';
import { TuiCarousel, TuiPagination, TuiBadge, TuiAccordion, TuiRating } from '@taiga-ui/kit';
import { TuiTextareaModule } from '@taiga-ui/legacy';
import { TranslocoModule } from '@jsverse/transloco';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { distinctUntilChanged, finalize, map, skip } from 'rxjs/operators';
import { pickSingleBestRule } from '../../utils/rule-priority';
import {
  resolveOrderLimitWinners,
  isMaxOrderQtyType,
  isMinOrderQtyType,
} from '../../utils/order-limit-precedence';
import { ruleMatchesTargeting } from '../../utils/rule-targeting';
import { isVariantAvailableForSale } from '../../utils/variant-availability';

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
    QuantityBreakTableComponent
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cart = inject(CartService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly alerts = inject(TuiAlertService);
  
  user$ = this.auth.user$;
  /** Các bundleId đang có trong giỏ (để gắn nhãn «Đã có trong giỏ» trên từng combo). */
  cartBundleIds$ = this.cart.cart$.pipe(
    map(items => {
      const s = new Set<number>();
      for (const i of items) {
        if (i.bundleId != null) s.add(i.bundleId);
      }
      return s;
    }),
  );

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

  /** Combo ACTIVE có chứa sản phẩm này. */
  productBundles: Bundle[] = [];
  /** Sau khi gọi API containing-product xong (để hiển thị empty state). */
  productBundlesLoaded = false;
  /** Cùng danh mục (trừ SP hiện tại). */
  relatedProducts: Product[] = [];
  
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
  winnerType: 'B2B' | 'QB' | 'NONE' = 'NONE';
  quantityBreaks: any[] = [];
  activeOrderLimit: OrderLimit | null = null;
  /** Giới hạn SL tối đa (PER_PRODUCT / PER_VARIANT), chọn theo priority giống MOQ */
  activeMaxQtyLimit: OrderLimit | null = null;

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
    
    // Use the central logic from CartService to ensure consistency
    const result = this.cart.calculatePrice(
      this.product.id,
      this.product.categoryId,
      this.selectedVariant?.price || this.product.basePrice || 0,
      this.quantity,
      this.product.quantityBreaksJson
    );

    return result.finalPrice;
  }

  get isVariantPriceApplied(): boolean {
    return false; // Deprecated conceptually as variant price is the base now
  }

  get isB2BApplied(): boolean {
    if (!this.isVariantsLoaded) return false;
    if (this.isSelectionIncomplete) return false;

    return !!this.b2bRule;
  }

  get isQBApplied(): boolean {
    if (!this.isVariantsLoaded) return false;
    if (this.isSelectionIncomplete) return false;

    return this.quantityBreaks && this.quantityBreaks.length > 0;
  }

  get isMoqViolation(): boolean {
    if (!this.activeOrderLimit) return false;
    const t = this.activeOrderLimit.limitType;
    if (t !== 'MIN_ORDER_QUANTITY' && t !== 'MIN_ORDER_QTY') return false;
    const isProductLevel =
      this.activeOrderLimit.limitLevel === 'PER_PRODUCT' ||
      this.activeOrderLimit.limitLevel === 'PER_VARIANT';
    return isProductLevel && this.quantity < (this.activeOrderLimit.limitValue ?? 0);
  }

  get isMaxQtyViolation(): boolean {
    if (!this.activeMaxQtyLimit) return false;
    const t = this.activeMaxQtyLimit.limitType;
    if (t !== 'MAX_ORDER_QUANTITY' && t !== 'MAX_ORDER_QTY') return false;
    const isProductLevel =
      this.activeMaxQtyLimit.limitLevel === 'PER_PRODUCT' ||
      this.activeMaxQtyLimit.limitLevel === 'PER_VARIANT';
    const maxV = Number(this.activeMaxQtyLimit.limitValue ?? 0);
    return isProductLevel && maxV > 0 && this.quantity > maxV;
  }

  /** Chặn thêm giỏ khi vi phạm MOQ hoặc vượt max SL (theo dòng SP) */
  get orderLimitBuyBlocked(): boolean {
    return this.isMoqViolation || this.isMaxQtyViolation || this.isSelectedVariantInactive;
  }

  /** True khi biến thể đang chọn tồn kho bằng 0 hoặc âm */
  get isSelectedVariantOutOfStock(): boolean {
    const qty = this.selectedVariant?.stockQuantity;
    return qty != null && qty <= 0;
  }

  /** Biến thể đã ngừng bán (admin INACTIVE). */
  get isSelectedVariantInactive(): boolean {
    return !!this.selectedVariant && !isVariantAvailableForSale(this.selectedVariant);
  }

  /** Thông báo info khi có MOQ theo dòng SP và khách đã đạt ngưỡng */
  get showMoqPolicyNotice(): boolean {
    if (!this.activeOrderLimit) return false;
    const t = this.activeOrderLimit.limitType;
    if (t !== 'MIN_ORDER_QUANTITY' && t !== 'MIN_ORDER_QTY') return false;
    const isProductLevel =
      this.activeOrderLimit.limitLevel === 'PER_PRODUCT' ||
      this.activeOrderLimit.limitLevel === 'PER_VARIANT';
    return isProductLevel && !this.isMoqViolation;
  }

  /** Thông báo info khi có max SL theo dòng SP và SL hiện tại không vượt ngưỡng */
  get showMaxQtyPolicyNotice(): boolean {
    if (!this.activeMaxQtyLimit) return false;
    const isProductLevel =
      this.activeMaxQtyLimit.limitLevel === 'PER_PRODUCT' ||
      this.activeMaxQtyLimit.limitLevel === 'PER_VARIANT';
    return isProductLevel && !this.isMaxQtyViolation;
  }

  /** Trần số lượng trên PDP: tồn kho ∧ max quy tắc (nếu có) */
  private get effectiveQuantityCap(): number {
    if (this.isSelectedVariantInactive) {
      return Math.max(1, this.quantity);
    }
    const stock = this.selectedVariant?.stockQuantity ?? 0;
    const stockCap = stock > 0 ? stock : 999;
    if (this.activeMaxQtyLimit) {
      const t = this.activeMaxQtyLimit.limitType;
      if (
        (t === 'MAX_ORDER_QUANTITY' || t === 'MAX_ORDER_QTY') &&
        (this.activeMaxQtyLimit.limitLevel === 'PER_PRODUCT' ||
          this.activeMaxQtyLimit.limitLevel === 'PER_VARIANT')
      ) {
        const ruleMax = Number(this.activeMaxQtyLimit.limitValue ?? 0);
        if (ruleMax > 0) {
          return Math.min(stockCap, ruleMax);
        }
      }
    }
    return stockCap;
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

    this.auth.user$
      .pipe(
        map((u) => u?.id ?? null),
        distinctUntilChanged(),
        skip(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (this.route.snapshot.paramMap.get('id')) {
          this.loadProduct();
        }
      });
  }

  loadOrderLimits(productId: number, categoryId: number | null | undefined) {
      const activeRules = this.cart.orderLimits;
      const user = this.auth.currentUserValue;

      const matchedRules = activeRules.filter((r) =>
        ruleMatchesTargeting(r, { productId, categoryId, user })
      );

      const lineQtyMatched = matchedRules.filter(
        (r) =>
          (isMinOrderQtyType(r.limitType) || isMaxOrderQtyType(r.limitType)) &&
          (r.limitLevel === 'PER_PRODUCT' || r.limitLevel === 'PER_VARIANT')
      );
      const lineQtyWinners = resolveOrderLimitWinners(lineQtyMatched);
      this.activeOrderLimit =
        lineQtyWinners.find((r) => isMinOrderQtyType(r.limitType)) ?? null;
      this.activeMaxQtyLimit =
        lineQtyWinners.find((r) => isMaxOrderQtyType(r.limitType)) ?? null;

      const cap = this.effectiveQuantityCap;
      let q = this.quantity;
      if (q > cap) {
        q = cap;
      }
      const moq = this.activeOrderLimit?.limitValue;
      if (
        this.activeOrderLimit &&
        (this.activeOrderLimit.limitType === 'MIN_ORDER_QUANTITY' ||
          this.activeOrderLimit.limitType === 'MIN_ORDER_QTY') &&
        moq != null &&
        Number(moq) > 0 &&
        q < Number(moq)
      ) {
        q = Number(moq);
      }
      if (q > cap) {
        q = cap;
      }
      this.quantity = Math.max(1, q);

      this.cdr.detectChanges();
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
        this.productBundles = [];
        this.productBundlesLoaded = false;
        this.relatedProducts = [];

        if (p.categoryId != null) {
          this.api
            .getProductsByCategory(p.categoryId, userId)
            .pipe(take(1))
            .subscribe({
              next: list => {
                this.relatedProducts = (list || [])
                  .filter(x => x.id !== p.id)
                  .slice(0, 8);
                this.cdr.markForCheck();
              },
              error: () => {
                this.relatedProducts = [];
                this.cdr.markForCheck();
              },
            });
        }

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
        
        // Use CartService rules if already loaded, or they will update automatically via subscription
        this.cart.pricingRules$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
           this.loadPricingRules(id, p.categoryId);
        });
        this.cart.orderLimits$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
           this.loadOrderLimits(id, p.categoryId);
        });
      });
    }
  }

  loadPricingRules(productId: number, categoryId: number | null | undefined) {
      const activeRules = this.cart.pricingRules;
      const user = this.auth.currentUserValue;

      // 1. Gather all applicable rules
      const allMatches = activeRules.filter(r => ruleMatchesTargeting(r, { productId, categoryId, user }));
      
      // 2. Sort by priority (1 is highest)
      allMatches.sort((a, b) => (a.priority || 999) - (b.priority || 999));

      const winner = allMatches[0];

      // 3. Handle QB Discovery (always do this to have data available)
      this.quantityBreaks = this.cart.getQuantityBreaks({
        productId,
        categoryId,
        quantityBreaksJson: this.product?.quantityBreaksJson
      }, user);

      // 4. Set Winner UI State
      if (winner?.ruleType === 'QUANTITY_BREAK') {
        this.winnerType = 'QB';
        this.b2bRule = null;
      } else if (winner?.ruleType === 'B2B_PRICE') {
        this.winnerType = 'B2B';
        this.b2bRule = winner;
        if (this.b2bRule.actionConfig) {
          try { this.b2bRule.parsedConfig = JSON.parse(this.b2bRule.actionConfig); } catch(e) {}
        }
      } else {
        this.winnerType = 'NONE';
        this.b2bRule = null;
      }

      this.cdr.detectChanges();
  }

  /** Tránh race khi đổi biến thể nhanh — chỉ áp dữ liệu combo của request mới nhất. */
  private bundlesFetchSeq = 0;

  /** Load combo theo đúng biến thể (item bundle gắn variant_id). */
  private refreshProductBundles(variantId: number | undefined): void {
    if (variantId == null) {
      this.productBundles = [];
      this.productBundlesLoaded = true;
      this.cdr.markForCheck();
      return;
    }
    this.productBundlesLoaded = false;
    this.cdr.markForCheck();
    const seq = ++this.bundlesFetchSeq;
    this.api
      .getBundlesContainingVariant(variantId)
      .pipe(
        take(1),
        finalize(() => {
          if (seq === this.bundlesFetchSeq) {
            this.productBundlesLoaded = true;
            this.cdr.markForCheck();
          }
        }),
      )
      .subscribe({
        next: bs => {
          if (seq !== this.bundlesFetchSeq) return;
          this.productBundles = bs || [];
          this.cdr.markForCheck();
        },
        error: () => {
          if (seq !== this.bundlesFetchSeq) return;
          this.productBundles = [];
          this.cdr.markForCheck();
        },
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

      // Auto-select: ưu tiên biến thể còn mở bán
      if (this.variants.length > 0) {
        const firstOpen =
          this.variants.find((v) => isVariantAvailableForSale(v)) ??
          this.variants[0];
        this.selectVariant(firstOpen);
      } else {
        this.refreshProductBundles(undefined);
      }
      
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
    if (this.availableSizes.length > 0 && (!this.selectedSize || !this.availableSizes.includes(this.selectedSize))) {
      this.selectedSize = this.availableSizes[0];
    } else if (this.availableSizes.length === 0) {
      this.selectedSize = undefined;
    }

    this.updateWeights();
    this.findMatchingVariant();
  }

  updateWeights() {
    const weights = this.variants
      .filter(v => (!v.color || v.color === this.selectedColor) && (!v.size || v.size === this.selectedSize))
      .map(v => v.weight)
      .filter(w => !!w);
    
    this.availableWeights = Array.from(new Set(weights as string[]));
    if (this.availableWeights.length > 0 && (!this.selectedWeight || !this.availableWeights.includes(this.selectedWeight))) {
      this.selectedWeight = this.availableWeights[0];
    } else if (this.availableWeights.length === 0) {
      this.selectedWeight = undefined;
    }
  }

  selectSize(size: string) {
    this.selectedSize = size;
    this.updateWeights();
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

    const candidates = this.variants.filter((v) => {
      const colorMatch = !v.color || v.color === this.selectedColor;
      const sizeMatch = !v.size || v.size === this.selectedSize;
      const weightMatch = !v.weight || v.weight === this.selectedWeight;
      return colorMatch && sizeMatch && weightMatch;
    });
    const matched =
      candidates.find((v) => isVariantAvailableForSale(v)) ?? candidates[0];

    if (matched) {
      this.applyVariant(matched);
    } else {
      this.applyVariant(undefined); // No match found for this combo
    }
  }

  selectVariant(v: ProductVariant) {
    this.selectedColor = v.color;
    
    const sizes = this.variants
      .filter(va => !va.color || va.color === v.color)
      .map(va => va.size)
      .filter(s => !!s);
    this.availableSizes = Array.from(new Set(sizes as string[]));
    this.selectedSize = v.size;

    const weights = this.variants
      .filter(va => (!va.color || va.color === v.color) && (!va.size || va.size === v.size))
      .map(va => va.weight)
      .filter(w => !!w);
    this.availableWeights = Array.from(new Set(weights as string[]));
    this.selectedWeight = v.weight;

    this.applyVariant(v);
  }

  private applyVariant(v: ProductVariant | undefined) {
    this.selectedVariant = v;
    this.refreshProductBundles(v?.id);

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

  /** Còn ít nhất một biến thể đang mở bán (theo màu / size / cân). */
  colorHasOpenSale(color: string): boolean {
    return this.variants.some(
      (v) => (!v.color || v.color === color) && isVariantAvailableForSale(v),
    );
  }

  sizeHasOpenSale(size: string): boolean {
    return this.variants.some(
      (v) =>
        (!v.color || v.color === this.selectedColor) &&
        (!v.size || v.size === size) &&
        isVariantAvailableForSale(v),
    );
  }

  weightHasOpenSale(weight: string): boolean {
    return this.variants.some(
      (v) =>
        (!v.color || v.color === this.selectedColor) &&
        (!v.size || v.size === this.selectedSize) &&
        (!v.weight || v.weight === weight) &&
        isVariantAvailableForSale(v),
    );
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

  handleTableBuy(qty: number) {
    if (!this.product) return;
    
    // Check if variant is selected (if product has variants)
    if (this.isSelectionIncomplete) {
       this.alerts.open('Vui lòng chọn đầy đủ Màu sắc và Kích thước trước khi thêm vào giỏ hàng.', {
          label: 'Chưa chọn phân loại',
          appearance: 'warning'
       }).subscribe();
       return;
    }

    if (this.isSelectedVariantInactive) {
      this.alerts
        .open('Biến thể này đã ngừng bán — không thể thêm vào giỏ.', {
          label: 'Ngừng bán',
          appearance: 'warning',
        })
        .subscribe();
      return;
    }
    if (this.selectedVariant) {
        this.cart.addToCart(this.product, this.selectedVariant, qty);
        // Toast success
        this.alerts.open(`Đã thêm ${qty} sản phẩm vào giỏ hàng`, {
           appearance: 'success',
           label: 'Thành công'
        }).subscribe();
    }
  }

  buyNow() {
    if (!this.product) return;
    if (this.isSelectionIncomplete) {
       this.alerts.open('Vui lòng chọn đầy đủ phiên bản.', { appearance: 'warning' }).subscribe();
       return;
    }
    if (this.isSelectedVariantInactive) {
      this.alerts
        .open('Biến thể này đã ngừng bán — không thể mua.', {
          label: 'Ngừng bán',
          appearance: 'warning',
        })
        .subscribe();
      return;
    }
    if (this.selectedVariant) {
        this.cart.addToCart(this.product, this.selectedVariant, this.quantity);
        this.router.navigate(['/cart']);
    }
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
    const limit = this.effectiveQuantityCap;
    this.quantity = Math.max(1, Math.min(limit, this.quantity + amt));
    this.cdr.detectChanges();
  }

  handleQuantityInput(event: any) {
    const val = parseInt(event.target.value, 10);
    const limit = this.effectiveQuantityCap;

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
    if (this.isSelectedVariantInactive) {
      this.alerts
        .open('Biến thể này đã ngừng bán — không thể thêm vào giỏ.', {
          label: 'Ngừng bán',
          appearance: 'warning',
        })
        .subscribe();
      return;
    }
    if (this.variants.length > 0 && !this.selectedVariant) {
      this.alerts
        .open('Vui lòng chọn đủ màu / size (hoặc biến thể) trước khi thêm vào giỏ hàng.', {
          label: 'Chưa chọn biến thể',
          appearance: 'warning',
        })
        .subscribe();
      return;
    }
    this.cart.addToCart(this.product, this.selectedVariant, this.quantity, this.currentPrice, undefined, undefined, undefined, undefined, {
      openDrawer: true,
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
