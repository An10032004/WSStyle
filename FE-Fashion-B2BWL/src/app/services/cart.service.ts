import { Injectable, inject } from '@angular/core';
import { ApiService, Product, ProductVariant } from './api.service';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { TuiAlertService } from '@taiga-ui/core';

export interface CartItem {
  productId: number;
  variantId?: number;
  name: string;
  color?: string;
  size?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  categoryId?: number;
  selected?: boolean;
  isNetTermEligible?: boolean;
  netTermDays?: number;
  basePrice?: number;
  quantityBreaksJson?: string;
  isFixedPrice?: boolean; // New flag to skip recalculations
  discountLabel?: string;
}

export interface PriceCalculationResult {
  finalPrice: number;
  basePrice: number;
  appliedB2BRule: any | null;
  appliedQBBreak: any | null;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(TuiAlertService);

  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartSubject.asObservable();
  
  private appliedCouponSubject = new BehaviorSubject<any | null>(null);
  appliedCoupon$ = this.appliedCouponSubject.asObservable();

  private pricingRulesSubject = new BehaviorSubject<any[]>([]);
  pricingRules$ = this.pricingRulesSubject.asObservable();

  private orderLimitsSubject = new BehaviorSubject<any[]>([]);
  orderLimits$ = this.orderLimitsSubject.asObservable();

  private currentUserId: number | null = null;
  
  get appliedCoupon(): any | null {
    return this.appliedCouponSubject.value;
  }

  private loadPricingRules() {
    this.api.getPricingRules().subscribe(rules => {
      const active = rules.filter(r => r.status === 'ACTIVE');
      this.pricingRulesSubject.next(active);
      this.refreshCartPrices();
    });
    this.api.getOrderLimits().subscribe(limits => {
      const active = limits.filter(l => l.status === 'ACTIVE');
      this.orderLimitsSubject.next(active);
    });
  }

  get pricingRules(): any[] {
    return this.pricingRulesSubject.value;
  }

  get orderLimits(): any[] {
    return this.orderLimitsSubject.value;
  }

  private refreshCartPrices() {
    const items = this.currentItems;
    items.forEach(i => this.recalculateItemPrice(i));
    this.saveCart(items);
  }

  applyCoupon(code: string) {
    return this.api.validateCoupon(code).pipe(
      map(coupon => {
        this.appliedCouponSubject.next(coupon);
        return coupon;
      })
    );
  }

  removeCoupon() {
    this.appliedCouponSubject.next(null);
  }

  get currentItems(): CartItem[] {
    return [...this.cartSubject.value];
  }

  constructor() {
    this.auth.user$.subscribe(user => {
      const oldUserId = this.currentUserId;
      this.currentUserId = user?.id || null;
      
      if (oldUserId === null && this.currentUserId !== null) {
        // Guest becomes User -> Merge
        this.syncOnLogin(this.currentUserId);
      } else {
        // User becomes Guest or User Switch
        this.cartSubject.next(this.loadCart(this.currentUserId));
      }
      this.loadPricingRules();
    });
  }

  private getCartKey(userId: number | null): string {
    return userId ? `app_cart_${userId}` : 'app_cart_guest';
  }

  private loadCart(userId: number | null): CartItem[] {
    const saved = localStorage.getItem(this.getCartKey(userId));
    if (saved) {
        const items: CartItem[] = JSON.parse(saved);
        // Ensure legacy items and undefined states are selected by default
        return items.map(i => ({
            ...i,
            selected: i.selected !== false,
            basePrice: i.basePrice || i.price // Fallback for legacy items
        }));
    }
    return [];
  }

  private saveCart(items: CartItem[]) {
    localStorage.setItem(this.getCartKey(this.currentUserId), JSON.stringify(items));
    this.cartSubject.next(items);
  }

  private syncOnLogin(userId: number) {
    const guestItems = this.loadCart(null);
    const userItems = this.loadCart(userId);
    
    // Merge guestItems into userItems
    const merged = [...userItems];
    guestItems.forEach(gi => {
      const existing = merged.find(mi => mi.productId === gi.productId && mi.variantId === gi.variantId);
      if (existing) {
        existing.quantity += gi.quantity;
      } else {
        merged.push(gi);
      }
    });

    this.saveCart(merged); // Save to user key
    localStorage.removeItem(this.getCartKey(null)); // Clear guest cart after merge
  }

  addToCart(product: Product, variant: ProductVariant | undefined, quantity: number, priceOverride?: number) {
    if (!variant?.id) {
      this.alerts.open(
        'Thiếu mã biến thể (variant) sản phẩm. Vui lòng chọn đủ màu/size trên trang sản phẩm rồi thêm lại.',
        { label: 'Không thể thêm vào giỏ', appearance: 'warning' },
      ).subscribe();
      return;
    }
    // Block adding if variant is out of stock or requested quantity exceeds available stock
    if (variant.stockQuantity != null) {
      if (variant.stockQuantity <= 0) {
        this.alerts.open(
          'Sản phẩm này hiện đã hết hàng và không thể thêm vào giỏ.',
          { label: 'Hết hàng', appearance: 'warning' }
        ).subscribe();
        return;
      }
      const items = [...this.cartSubject.value];
      const existing = items.find(i => i.productId === product.id && i.variantId === variant.id);
      const existingQty = existing ? existing.quantity : 0;
      const available = variant.stockQuantity - existingQty;
      if (available <= 0) {
        this.alerts.open(
          'Sản phẩm này đã đạt giới hạn tồn kho trong giỏ hàng. Vui lòng kiểm tra giỏ hàng.',
          { label: 'Hết hàng', appearance: 'warning' }
        ).subscribe();
        return;
      }
      if (quantity > available) {
        this.alerts.open(
          `Chỉ còn ${available} chiếc khả dụng cho biến thể này. Vui lòng giảm số lượng hoặc kiểm tra giỏ hàng.`,
          { label: 'Số lượng vượt quá', appearance: 'warning' }
        ).subscribe();
        return;
      }
    }
    const items = [...this.cartSubject.value];
    let price = priceOverride || product.calculatedPrice || product.basePrice;
    
    // 1. Prioritize Variant-specific price (Absolute Override)
    const hasVariantPrice = !!(variant && (
      (variant.price != null && variant.price > 0) || 
      (variant.discountPrice != null && variant.discountPrice > 0)
    ));

    if (variant) {
      price = variant.discountPrice || variant.price || (price + (variant.priceAdjustment || 0));
    }

    // 2. Evaluate Quantity Breaks ONLY if NO specific variant price is set
    if (!hasVariantPrice && product.quantityBreaksJson) {
      try {
        const breaks = JSON.parse(product.quantityBreaksJson);
        const matchedBreak = breaks.find((b: any) => {
          const min = b.min ?? 1;
          const max = b.max ?? 999999999;
          return quantity >= min && quantity <= max;
        });
        if (matchedBreak && matchedBreak.discount != null) {
          const base = variant?.price || product.basePrice;
          price = base * (1 - matchedBreak.discount / 100);
        }
      } catch (e) {}
    }

    const existingIndex = items.findIndex(i => 
      i.productId === product.id && 
      i.variantId === variant?.id
    );

    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
      this.recalculateItemPrice(items[existingIndex]);
    } else {
      const newItem: CartItem = {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        color: variant?.color,
        size: variant?.size,
        price: price, // Initial, will be recalculated
        quantity: quantity,
        imageUrl: variant?.imageUrl || product.imageUrl,
        categoryId: product.categoryId || undefined,
        selected: true,
        isNetTermEligible: product.isNetTermEligible,
        netTermDays: product.netTermDays,
        basePrice: variant?.price || product.basePrice,
        quantityBreaksJson: product.quantityBreaksJson,
        isFixedPrice: false // Always allow recalculation from base
      };
      this.recalculateItemPrice(newItem);
      items.push(newItem);
    }

    this.saveCart(items);
    this.validate().subscribe(results => {
       const failures = results.filter(r => !r.success);
       if (failures.length > 0) {
         failures.forEach(f => {
           this.alerts.open(f.message, { label: 'Cảnh báo Quy định Đơn hàng', appearance: 'warning' }).subscribe();
         });
       } else {
         this.alerts.open('Đã thêm sản phẩm vào giỏ hàng', { label: 'Thành công', appearance: 'success' }).subscribe();
       }
    });
  }

  /** Chỉ kiểm tra các dòng được chọn (đồng bộ với tổng tiền checkout). */
  validate(): Observable<any[]> {
    const selectedItems = this.cartSubject.value.filter(i => i.selected !== false);
    if (selectedItems.length === 0) return of([]);

    const clientResults = this.validateClientSide(selectedItems);
    
    // Still call server-side as backup, but return client results immediately if any failures found there
    return this.auth.user$.pipe(
      switchMap(user => this.api.validateCart(user?.id, selectedItems.map(i => ({
        productId: i.productId,
        categoryId: i.categoryId,
        quantity: i.quantity,
        price: i.price
      })))),
      map(serverResults => {
          // Merge results if needed, but usually server matches client
          return serverResults; 
      }),
      // Default to client results if server is slow or failed (optional)
      startWith(clientResults)
    );
  }

  public validateClientSide(items: CartItem[]): any[] {
    const results: any[] = [];
    const user = this.auth.currentUserValue;
    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    // Filter and sort active rules by priority (lower is higher priority)
    const activeLimits = this.orderLimits
      .filter(l => l.status === 'ACTIVE')
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));

    // Helper to check if a rule is already overridden by a higher priority rule for the same "axis" (QTY/AMT)
    const axisWinners: Set<string> = new Set();

    // 1. Check Order-Level (PER_ORDER)
    const orderLimits = activeLimits.filter(l => l.limitLevel === 'PER_ORDER' && this.isCustomerMatch(l, user));
    
    for (const rule of orderLimits) {
      const isQty = rule.limitType === 'MIN_ORDER_QUANTITY' || rule.limitType === 'MIN_ORDER_QTY' || rule.limitType === 'MAX_ORDER_QUANTITY' || rule.limitType === 'MAX_ORDER_QTY';
      const isAmt = rule.limitType === 'MIN_ORDER_VALUE' || rule.limitType === 'MIN_ORDER_VAL' || rule.limitType === 'MIN_ORDER_AMOUNT' || rule.limitType === 'MAX_ORDER_AMOUNT';
      
      const axisKey = isQty ? 'ORDER_QTY' : (isAmt ? 'ORDER_AMT' : null);
      if (!axisKey || axisWinners.has(axisKey)) continue;

      // Handle MIN
      if (rule.limitType.startsWith('MIN')) {
          if (isQty && totalQuantity < rule.limitValue) {
            results.push({ success: false, message: `Tổng số lượng sản phẩm tối thiểu là ${rule.limitValue}. Hiện tại: ${totalQuantity} (theo "${rule.name}")` });
          } else if (isAmt && totalAmount < rule.limitValue) {
            results.push({ success: false, message: `Giá trị đơn hàng tối thiểu là ${rule.limitValue.toLocaleString()} ₫. Hiện tại: ${totalAmount.toLocaleString()} ₫ (theo "${rule.name}")` });
          }
      }
      // Handle MAX
      if (rule.limitType.startsWith('MAX')) {
          if (isQty && totalQuantity > rule.limitValue) {
            results.push({ success: false, message: `Tổng số lượng vượt tối đa ${rule.limitValue}. Hiện tại: ${totalQuantity} (theo "${rule.name}")` });
          } else if (isAmt && totalAmount > rule.limitValue) {
            results.push({ success: false, message: `Giá trị đơn hàng vượt tối đa ${rule.limitValue.toLocaleString()} ₫. (theo "${rule.name}")` });
          }
      }
      
      // If we applied a rule for this axis, assume it's the winner for PER_ORDER (simplified)
      axisWinners.add(axisKey);
    }

    // 2. Check Line-Level (PER_PRODUCT / PER_VARIANT)
    items.forEach(item => {
        const itemWinners = new Set<string>();
        const productLimits = activeLimits.filter(l => 
            (l.limitLevel === 'PER_PRODUCT' || l.limitLevel === 'PER_VARIANT') && 
            this.isCustomerMatch(l, user) && 
            this.isProductMatch(l, item.productId, item.categoryId || null)
        );

        for (const rule of productLimits) {
            const isQty = rule.limitType.includes('QTY') || rule.limitType.includes('QUANTITY');
            const isAmt = rule.limitType.includes('VAL') || rule.limitType.includes('VALUE') || rule.limitType.includes('AMOUNT');
            const axisKey = isQty ? 'ITEM_QTY' : (isAmt ? 'ITEM_AMT' : null);
            
            if (!axisKey || itemWinners.has(axisKey)) continue;

            if (rule.limitType.startsWith('MIN')) {
                if (isQty && item.quantity < rule.limitValue) {
                    results.push({ success: false, message: `Sản phẩm "${item.name}" cần tối thiểu ${rule.limitValue} chiếc.` });
                } else if (isAmt && (item.price * item.quantity) < rule.limitValue) {
                    results.push({ success: false, message: `Sản phẩm "${item.name}" cần giá trị tối thiểu ${rule.limitValue.toLocaleString()} ₫.` });
                }
            } else if (rule.limitType.startsWith('MAX')) {
                if (isQty && item.quantity > rule.limitValue) {
                    results.push({ success: false, message: `Sản phẩm "${item.name}" tối đa chỉ được mua ${rule.limitValue} chiếc.` });
                } else if (isAmt && (item.price * item.quantity) > rule.limitValue) {
                    results.push({ success: false, message: `Sản phẩm "${item.name}" tối đa chỉ được mua giá trị ${rule.limitValue.toLocaleString()} ₫.` });
                }
            }
            itemWinners.add(axisKey);
        }
    });

    return results;
  }

  updateQuantity(productId: number, variantId: number | undefined, quantity: number): Observable<void> {
    if (quantity < 1) {
      this.removeItem(productId, variantId);
      return of(undefined);
    }
    
    // Create an observable for the update process
    return new Observable<void>(observer => {
      (async () => {
        // If variant known, validate against current stock before updating
        if (variantId != null) {
          try {
            const variants = await firstValueFrom(this.api.getProductVariantsByProduct(productId));
            const variant = (variants || []).find((v: any) => v.id === variantId);
            if (variant && variant.stockQuantity != null) {
              if (variant.stockQuantity < quantity) {
                this.alerts.open(`Chỉ còn ${variant.stockQuantity} chiếc khả dụng cho biến thể này.`, { label: 'Số lượng vượt quá', appearance: 'warning' }).subscribe();
                observer.complete();
                return;
              }
            }
          } catch (e) {
            // ignore API errors and allow update as fallback
          }
        }

        const items = this.currentItems;
        const idx = items.findIndex(i => i.productId === productId && i.variantId === variantId);
        if (idx > -1) {
          items[idx].quantity = quantity;
          this.recalculateItemPrice(items[idx]); // Update unit price for bulk
          this.saveCart(items);
        }
        observer.next();
        observer.complete();
      })();
    });
  }

  private recalculateItemPrice(item: CartItem) {
    if (item.basePrice == null) return;
    const result = this.calculatePrice(
      item.productId,
      item.categoryId,
      item.basePrice,
      item.quantity,
      item.quantityBreaksJson
    );
    item.price = result.finalPrice;

    // Set notification label for UI
    if (result.appliedQBBreak) {
       item.discountLabel = `Ưu đãi mua sỉ (-${result.appliedQBBreak.discount}%)`;
    } else if (result.appliedB2BRule) {
       item.discountLabel = result.appliedB2BRule.ruleName || result.appliedB2BRule.name || 'Giá ưu đãi';
    } else {
       item.discountLabel = undefined;
    }
  }

  calculatePrice(
    productId: number,
    categoryId: number | null | undefined,
    basePrice: number,
    quantity: number,
    quantityBreaksJson?: string
  ): PriceCalculationResult {
    let finalPrice = basePrice;
    let appliedB2BRule = null;
    let appliedQBBreak = null;
    const user = this.auth.currentUserValue;

    // 1. Get all matching rules, sorted by priority (1 is highest)
    const matchingRules = this.pricingRules
      .filter(r => this.isCustomerMatch(r, user) && this.isProductMatch(r, productId, categoryId || null))
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));

    // 2. Best Rule Discovery
    const bestRule = matchingRules[0];

    // 3. Fallback/Discovery for Quantity Tiers (shown in UI)
    let tiers: any[] = [];
    if (quantityBreaksJson) {
       try { 
         const parsed = JSON.parse(quantityBreaksJson); 
         tiers = Array.isArray(parsed) ? parsed : (parsed.brackets || parsed.breaks || parsed.quantityBreaks || parsed.tiers || []);
       } catch(e) {}
    }

    // 4. Determine base deduction from Best Rule
    if (bestRule && bestRule.ruleType === 'QUANTITY_BREAK') {
      try {
        const config = JSON.parse(bestRule.actionConfig);
        const ruleTiers = Array.isArray(config) ? config : (config.brackets || config.breaks || config.quantityBreaks || config.tiers || []);
        if (ruleTiers.length > 0) tiers = ruleTiers; 
      } catch(e) {}
    } else if (bestRule) {
      // Best rule is a standard discount (B2B Price)
      appliedB2BRule = bestRule;
      let dv = bestRule.discountValue;
      let dt = bestRule.discountType;
      
      if (dv == null && bestRule.actionConfig) {
        try {
          const config = JSON.parse(bestRule.actionConfig);
          dv = config.discountValue;
          dt = config.discountType;
        } catch(e) {}
      }

      if (dt === 'PERCENTAGE' && dv != null) {
        finalPrice = finalPrice * (1 - dv / 100);
      } else if ((dt === 'FIXED' || dt === 'FIXED_AMOUNT') && dv != null) {
        finalPrice = Math.max(0, finalPrice - dv);
      }
    }

    // 5. Apply Quantity Tiers if the best rule is the one providing them, or if no higher priority B2B rule exists.
    // However, if bestRule is a B2B rule, we respect STRICT PRIORITY: higher priority rule wins.
    if (tiers.length > 0) {
      const matchedTier = tiers.find((b: any) => {
        const min = b.min ?? 1;
        const max = b.max ?? 999999999;
        return quantity >= min && quantity <= max;
      });
      
      if (matchedTier && matchedTier.discount != null) {
        const qbPrice = basePrice * (1 - matchedTier.discount / 100);
        
        // Strict Priority Logic:
        // Use QB price ONLY IF:
        // 1. A QB rule is the actual "Best Rule" by priority
        // 2. OR if NO best rule was found (fallback to product-level QB)
        // 3. OR if QB price is BETTER than B2B price (Optional: user seems to want hierarchy, 
        //    but let's favor QB if it's better for now UNLESS bestRule is higher priority B2B)
        
        const isBestRuleQB = bestRule?.ruleType === 'QUANTITY_BREAK';
        const isBestRuleB2B = bestRule?.ruleType === 'B2B_PRICE';
        
        if (isBestRuleQB || !bestRule) {
           finalPrice = qbPrice;
           appliedQBBreak = matchedTier;
        } else if (isBestRuleB2B) {
           // Strict Hierarchy: B2B wins. We do NOT set appliedQBBreak.
           appliedQBBreak = null; 
        }
      } else {
        appliedQBBreak = null;
      }
    } else {
      appliedQBBreak = null;
    }

    return {
      finalPrice,
      basePrice,
      appliedB2BRule,
      appliedQBBreak
    };
  }

  public getQuantityBreaks(item: any, user: any): any[] {
    let productId = item.productId || item.id;
    let categoryId = item.categoryId || null;
    let fallbackJson = item.quantityBreaksJson;

    let tiers: any[] = [];
    if (fallbackJson) {
       try { 
         const parsed = JSON.parse(fallbackJson); 
         tiers = Array.isArray(parsed) ? parsed : (parsed.brackets || parsed.breaks || parsed.quantityBreaks || parsed.tiers || []);
       } catch(e) {}
    }

    const matchingRules = this.pricingRules
      .filter(r => this.isCustomerMatch(r, user) && this.isProductMatch(r, productId, categoryId))
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));

    const bestQBRule = matchingRules.find(r => r.ruleType === 'QUANTITY_BREAK');
    if (bestQBRule) {
       try {
         const config = JSON.parse(bestQBRule.actionConfig);
         const ruleTiers = Array.isArray(config) ? config : (config.brackets || config.breaks || config.quantityBreaks || config.tiers || []);
         if (ruleTiers.length > 0) tiers = ruleTiers; 
       } catch(e) {}
    }

    return tiers;
  }

  public findBestPricingRule(productId: number, categoryId: number | null, user: any): any | null {
    return this.pricingRules
      .filter(r => this.isCustomerMatch(r, user))
      .filter(r => this.isProductMatch(r, productId, categoryId))
      .sort((a, b) => a.priority - b.priority)[0] || null;
  }

  public isCustomerMatch(rule: any, user: any): boolean {
    if (!rule.applyCustomerType || rule.applyCustomerType === 'ALL') return true;
    if (rule.applyCustomerType === 'GUEST') return !user;
    if (rule.applyCustomerType === 'LOGGED_IN') return !!user;
    if (rule.applyCustomerType === 'GROUP' && rule.applyCustomerValue) {
      if (!user || !user.customerGroup) return false;
      try {
        const val = JSON.parse(rule.applyCustomerValue);
        const groupIds = val.groupIds || [];
        return groupIds.includes(user.customerGroup.id);
      } catch (e) { return false; }
    }
    return false;
  }

  public isProductMatch(rule: any, productId: number, categoryId: number | null): boolean {
    if (!rule.applyProductType || rule.applyProductType === 'ALL') return true;
    if (!rule.applyProductValue) return false;
    try {
      const val = JSON.parse(rule.applyProductValue);
      if (rule.applyProductType === 'CATEGORY' || rule.applyProductType === 'GROUP') {
        const categoryIds = val.categoryIds || [];
        return categoryId !== null && categoryIds.includes(categoryId);
      }
      if (rule.applyProductType === 'SPECIFIC') {
        const productIds = val.productIds || [];
        return productIds.includes(productId);
      }
    } catch (e) { return false; }
    return false;
  }

  removeItem(productId: number, variantId: number | undefined) {
    const items = this.currentItems.filter(i => 
      !(i.productId === productId && i.variantId === variantId)
    );
    this.saveCart(items);
  }

  clear() {
    this.saveCart([]);
  }

  clearSelected() {
    const remaining = this.currentItems.filter(i => !i.selected);
    this.saveCart(remaining);
  }

  toggleItemSelection(productId: number, variantId: number | undefined, selected: boolean) {
    const items = this.currentItems;
    const idx = items.findIndex(i => i.productId === productId && i.variantId === variantId);
    if (idx > -1) {
      items[idx].selected = !!selected;
      this.saveCart(items);
    }
  }

  toggleAll(selected: boolean) {
    const items = this.currentItems.map(i => ({ ...i, selected }));
    this.saveCart(items);
  }

  get totalItems(): number {
    return this.cartSubject.value.reduce((sum, i) => sum + i.quantity, 0);
  }

  get totalPrice$() {
    return this.cart$.pipe(map(items => items.filter(i => i.selected).reduce((sum, i) => sum + (i.price * i.quantity), 0)));
  }

  get cartItems(): CartItem[] {
    return this.cartSubject.value;
  }
}
