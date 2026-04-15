import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface OrderItemRequest {
  variantId?: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  appliedRuleId?: number;
  /** Ghi chú ưu đãi tại thời điểm đặt (QB/B2B/combo…). */
  pricingNote?: string;
}

export interface OrderRequest {
  userId?: number;
  orderType: 'RETAIL' | 'WHOLESALE';
  paymentMethod: 'COD' | 'VNPAY' | 'NET_TERMS';
  fullName: string;
  phone: string;
  shippingAddress: string;
  note?: string;
  shippingFee?: number;
  taxAmount?: number;
  couponCode?: string;
  discountAmount?: number;
  items: OrderItemRequest[];
}

export interface RuleTarget {
  applyProductType: string;
  applyProductValue: string;
  applyCustomerType: string;
  applyCustomerValue: string;
  priority: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  parentId?: number | null;
  parent?: Category;
  children?: Category[];
}

export interface Product {
  id: number;
  categoryId?: number | null;
  productCode: string;
  name: string;
  basePrice: number;
  imageUrl?: string;
  imageUrls?: string;
  brand?: string;
  material?: string;
  origin?: string;
  calculatedPrice?: number;
  discountLabel?: string;
  hidePrice?: boolean;
  hideAddToCart?: boolean;
  replacementText?: string;
  taxDisplayType?: string;
  taxDisplayLabel?: string;
  priceExclTax?: number;
  taxAmount?: number;
  campaignBanner?: string;
  campaignName?: string;
  quantityBreaksJson?: string;
  /** Khớp cột DB `is_sale` (tạo/cập nhật sản phẩm). */
  isSale?: boolean;
  isNetTermEligible?: boolean;
  netTermDays?: number;
  images?: any[];
  description?: string;
}

export interface ProductVariant {
  id: number;
  productId?: number | null;
  sku: string;
  stockQuantity: number;
  priceAdjustment?: number;
  imageUrl?: string;
  color?: string;
  size?: string;
  weight?: string;
  length?: number;
  width?: number;
  height?: number;
  costPrice?: number;
  price?: number;
  discountPrice?: number;
  imageUrls?: string;
  status?: string;
  barcode?: string;
}

export interface Translation {
  id: number;
  resourceId: number;
  resourceType: string;
  languageCode: string;
  translatedName?: string;
  translatedDescription?: string;
  translatedData?: string;
}

export interface TranslationRequest {
  resourceId: number;
  resourceType: string;
  languageCode: string;
  translatedName?: string;
  translatedDescription?: string;
  translatedData?: string;
}

export interface AIResponse {
  message: string;
  products: Product[];
}

export interface PricingRule {
  id: number;
  name: string;
  priority: number;
  status: string;
  ruleType: string;
  applyCustomerType?: string;
  applyCustomerValue?: string;
  excludeCustomerOption?: string;
  excludeCustomerValue?: string;
  applyProductType?: string;
  applyProductValue?: string;
  excludeProductOption?: string;
  excludeProductValue?: string;
  actionConfig?: string;
  discountValue?: number;
  discountType?: string;
  startDate?: string;
  endDate?: string;
}

export interface OrderLimit {
  id: number;
  name: string;
  priority: number;
  status: string;
  limitLevel: string;
  limitType: string;
  applyCustomerType?: string;
  applyCustomerValue?: string;
  excludeCustomerOption?: string;
  excludeCustomerValue?: string;
  applyProductType?: string;
  applyProductValue?: string;
  excludeProductOption?: string;
  excludeProductValue?: string;
  limitValue: number;
}

export interface ShippingRule {
  id: number;
  name: string;
  priority: number;
  status: string;
  baseOn: string;
  rateRanges?: string;
  applyCustomerType?: string;
  applyCustomerValue?: string;
  applyProductType?: string;
  applyProductValue?: string;
  discountType?: string;
  discountValue?: number;
}

/** Phản hồi POST /api/shipping-rules/quote — theo tổng đơn + loại khách, không lọc SP. */
export interface ShippingQuote {
  fee: number;
  tierFeeBeforeDiscount?: number;
  ruleName?: string;
  baseOn?: string;
  matched: boolean;
}

export interface NetTermRule {
  id: number;
  name: string;
  priority: number;
  status: string;
  applyCustomerType?: string;
  applyCustomerValue?: string;
  conditionType?: string;
  netTermDays: number;
}

export interface NetTermQuote {
  eligible: boolean;
  netTermDays?: number;
  ruleName?: string;
}

export interface DebtOrderReportRow {
  orderId: number;
  customerName?: string;
  customerGroupName?: string;
  createdAt?: string;
  dueDate?: string;
  daysLeft: number;
  debtStatus: 'CON_HAN' | 'SAP_DEN_HAN' | 'QUA_HAN';
  paymentStatus?: string;
  /** Tổng tiền đơn NET_TERMS (backend BigDecimal → number). */
  totalAmount?: number;
}

export interface DebtSummary {
  blocked: boolean;
  overdueCount: number;
  items: DebtOrderReportRow[];
}

export interface TaxDisplayRule {
  id: number;
  name: string;
  status: string;
  taxDisplayType: string;
  displayType: string;
  designConfig?: string;
  applyCustomerType?: string;
  applyCustomerValue?: string;
  applyProductType?: string;
  applyProductValue?: string;
  discountRate?: number;
}

export interface HidePriceRule {
  id: number;
  name: string;
  priority: number;
  status: string;
  hidePrice: boolean;
  hideAddToCart: boolean;
  replacementText?: string;
  applyCustomerType?: string;
  applyCustomerValue?: string;
  applyProductType?: string;
  applyProductValue?: string;
}

export interface CustomerGroup {
  id: number;
  name: string;
}

export interface Role {
  id?: number;
  name: string;
  description?: string;
  isAdmin?: boolean;
  permissionsJson: string; // JSON string array
}

export interface User {
  id: number;
  email: string;
  fullName?: string;
  phone?: string;
  role: string;
  // Computed roles: primary (`role`) + secondary roles parsed from `tags` (if any)
  roles?: string[];
  // Human-friendly joined roles for display in templates (e.g. "ADMIN / WHOLESALE")
  displayRoles?: string;
  // Optional separate assigned permission role (stored in user.tags.assignedRole)
  assignedRole?: string;
  customerGroup?: CustomerGroup;
  tags?: string;
  registrationStatus?: string;
  companyName?: string;
  taxCode?: string;
  permissions?: string; // JSON string array from backend
}

export interface B2BRegistrationForm {
  id: number;
  user: User;
  formData: string; // JSON string
}

export interface B2BRegistrationFormRequest {
  userId: number;
  formData: string;
}

export interface Order {
  id: number;
  user: User;
  orderType: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  shippingFee: number;
  taxAmount: number;
  paidAmount: number;
  debtAmount: number;
  dueDate: string;
  /** Admin đánh dấu đã chuyển khoản hoàn tiền (đơn hủy + QR/CK). */
  refundProcessedAt?: string | null;
  /** Khách xác nhận đã nhận lại tiền hoàn. */
  refundConfirmedByCustomerAt?: string | null;
  fullName?: string;
  phone?: string;
  shippingAddress?: string;
  note?: string;
  couponCode?: string;
  discountAmount?: number;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  variantId: number;
  productVariant?: any;
  quantity: number;
  unitPrice: number;
  appliedRuleId?: number;
  /** Ưu đãi/ghi chú giá đã áp khi mua (đối chiếu khi reorder). */
  pricingNote?: string;
}

export interface PaymentTransaction {
  id: number;
  orderId: number;
  provider: string;
  transactionReference: string;
  providerTransactionNo: string;
  amount: number;
  bankCode: string;
  responseCode: string;
  status: string;
  payDate: string;
}

export interface AIProductSync {
  id: number;
  product: Product;
  content: string;
  vectorId: string;
  lastSyncedAt: string;
  shopId: number;
}

export interface SalesReportPaidOrderLine {
  orderId: number;
  customerLabel: string;
  amount: number;
}

export interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  bestSellers: { name: string; quantity: number; revenue: number }[];
  /** Mỗi ngày có đơn PAID: doanh thu + số đơn + tổng SL dòng hàng. */
  revenueByDate: {
    date: string;
    amount: number;
    paidOrderCount?: number;
    itemsSoldQuantity?: number;
    /** Mỗi đơn PAID một dòng: #id · tên · tiền. */
    paidOrdersSummary?: string;
    /** Danh sách đơn (mở Quản lý đơn theo orderId). */
    paidOrders?: SalesReportPaidOrderLine[];
  }[];
}

export interface VariantReportRow {
  variantId: number;
  sku?: string;
  productName?: string;
  soldQuantity?: number;
  revenue?: number;
  currentStock?: number;
}

export interface VariantReport {
  items: VariantReportRow[];
}

export interface Expense {
  id: number;
  category: 'INVENTORY' | 'SHIPPING' | 'MARKETING' | 'SALARY' | 'OPERATIONS' | 'OTHER';
  amount: number;
  date: string;
  description?: string;
  shopId: number;
}

export interface VatReport {
  collectedVat: number;
  payableVat: number;
  netVat: number;
}

export interface HomeSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  shopId: number;
}

export interface Coupon {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usedCount: number;
  status: string;
  applyProductType?: string;
  applyProductValue?: string;
  applyCustomerType?: string;
  applyCustomerValue?: string;
  priority: number;
}

export interface SaleCampaign {
  id: number;
  name: string;
  description?: string;
  bannerUrl?: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  priority: number;
  status: string;
  applyProductType?: string;
  applyProductValue?: string;
  applyCustomerType?: string;
  applyCustomerValue?: string;
}

export interface Wallet {
  id: number;
  userId: number;
  balance: number;
  currency: string;
  updatedAt: string;
  status?: string;
  metadata?: string;
}

export interface WalletTransaction {
  id: number;
  walletId: number;
  amount: number;
  type: 'TOP_UP' | 'PAYMENT' | 'REFUND' | 'WITHDRAW';
  description?: string;
  createdAt: string;
}

export interface ProductReview {
  id: number;
  productId: number;
  userName?: string;
  productName?: string;
  productImage?: string;
  rating: number;
  comment: string;
  replyMessage?: string;
  isPinned?: boolean;
  createdAt?: string;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  otherUserId: number;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  hasUnread: boolean;
}

export interface Bundle {
  id: number;
  imageUrl?: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  discountValue: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  oldPrice: number;
  newPrice: number;
  applyCustomerType: string;
  items: BundleItem[];
}

export interface BundleItem {
  id?: number;
  bundleId?: number;
  variantId: number;
  variant?: ProductVariant;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api';
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // ─── Orders ────────────────────────────────────────────
  createOrder(request: OrderRequest): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.base}/orders`, request).pipe(map(r => r.data));
  }


  // ─── Categories ────────────────────────────────────────
  getCategories(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(`${this.base}/categories`).pipe(map(r => r.data));
  }
  createCategory(body: Partial<Category>): Observable<Category> {
    return this.http.post<ApiResponse<Category>>(`${this.base}/categories`, body).pipe(map(r => r.data));
  }
  updateCategory(id: number, body: Partial<Category>): Observable<Category> {
    return this.http.put<ApiResponse<Category>>(`${this.base}/categories/${id}`, body).pipe(map(r => r.data));
  }
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/categories/${id}`).pipe(map(r => r.data));
  }

  // ─── Auth ─────────────────────────────────────────────
  checkEmail(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.base}/auth/check-email`, { params: { email } });
  }

  checkPhone(phone: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.base}/auth/check-phone`, { params: { phone } });
  }

  changePassword(payload: {
    email: string;
    currentPassword: string;
    newPassword: string;
  }): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/auth/change-password`, payload);
  }

  // ─── Products ──────────────────────────────────────────
  getProducts(userId?: number): Observable<Product[]> {
    const url = userId ? `${this.apiUrl}/products?userId=${userId}` : `${this.apiUrl}/products`;
    return this.http.get<ApiResponse<Product[]>>(url).pipe(
      map(res => res.data)
    );
  }

  searchProducts(searchParams: any): Observable<{content: Product[], totalElements: number, totalPages: number}> {
    let params = new HttpParams();
    Object.keys(searchParams).forEach(key => {
        if (searchParams[key] !== null && searchParams[key] !== undefined && searchParams[key] !== '') {
            // For arrays like categoryIds and brands, Spring Boot can take comma-separated
            if (Array.isArray(searchParams[key])) {
                params = params.set(key, searchParams[key].join(','));
            } else {
                params = params.set(key, searchParams[key]);
            }
        }
    });
    return this.http.get<ApiResponse<any>>(`${this.base}/products/search`, { params })
        .pipe(map(r => r.data));
  }

  getProductBrands(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/products/brands`).pipe(map(r => r.data));
  }
  getProductById(id: number, userId?: number): Observable<Product> {
    const url = userId ? `${this.base}/products/${id}?userId=${userId}` : `${this.base}/products/${id}`;
    return this.http.get<ApiResponse<Product>>(url).pipe(map(r => r.data));
  }

  getProductsByCategory(categoryId: number, userId?: number): Observable<Product[]> {
    const q = userId != null ? `?userId=${userId}` : '';
    return this.http
      .get<ApiResponse<Product[]>>(`${this.base}/products/category/${categoryId}${q}`)
      .pipe(map(r => r.data || []));
  }
  createProduct(body: Partial<Product>): Observable<Product> {
    return this.http.post<ApiResponse<Product>>(`${this.base}/products`, body).pipe(map(r => r.data));
  }
  updateProduct(id: number, body: Partial<Product>): Observable<Product> {
    return this.http.put<ApiResponse<Product>>(`${this.base}/products/${id}`, body).pipe(map(r => r.data));
  }
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/products/${id}`).pipe(map(r => r.data));
  }

  // ─── ProductVariants ───────────────────────────────────
  getProductVariants(): Observable<ProductVariant[]> {
    return this.http.get<ApiResponse<ProductVariant[]>>(`${this.base}/product-variants`).pipe(map(r => r.data));
  }
  getProductVariantsByProduct(productId: number): Observable<ProductVariant[]> {
    return this.http.get<ApiResponse<ProductVariant[]>>(`${this.base}/product-variants/product/${productId}`).pipe(map(r => r.data));
  }
  getProductVariant(id: number): Observable<ProductVariant> {
    return this.http.get<ApiResponse<ProductVariant>>(`${this.base}/product-variants/${id}`).pipe(map(r => r.data));
  }
  createProductVariant(body: Partial<ProductVariant>): Observable<ProductVariant> {
    return this.http.post<ApiResponse<ProductVariant>>(`${this.base}/product-variants`, body).pipe(map(r => r.data));
  }
  updateProductVariant(id: number, body: Partial<ProductVariant>): Observable<ProductVariant> {
    return this.http.put<ApiResponse<ProductVariant>>(`${this.base}/product-variants/${id}`, body).pipe(map(r => r.data));
  }
  deleteProductVariant(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/product-variants/${id}`).pipe(map(r => r.data));
  }

  // ─── Translations ──────────────────────────────────────
  getTranslations(resourceType: string, resourceId: number): Observable<Translation[]> {
    return this.http.get<ApiResponse<Translation[]>>(`${this.base}/translations/${resourceType}/${resourceId}`).pipe(map(r => r.data));
  }

  getTranslationByLang(resourceType: string, resourceId: number, lang: string): Observable<Translation> {
    return this.http.get<ApiResponse<Translation>>(`${this.base}/translations/${resourceType}/${resourceId}/${lang}`).pipe(map(r => r.data));
  }

  getTranslationsByTypeAndLang(resourceType: string, lang: string): Observable<Translation[]> {
    return this.http.get<ApiResponse<Translation[]>>(`${this.base}/translations/${resourceType}/lang/${lang}`).pipe(map(r => r.data));
  }

  saveTranslation(request: TranslationRequest): Observable<Translation> {
    return this.http.post<ApiResponse<Translation>>(`${this.base}/translations`, request).pipe(map(r => r.data));
  }

  deleteTranslation(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/translations/${id}`).pipe(map(r => r.data));
  }

  // ─── Pricing Rules ─────────────────────────────────────
  getPricingRules(): Observable<PricingRule[]> {
    return this.http.get<ApiResponse<PricingRule[]>>(`${this.base}/pricing-rules`).pipe(map(r => r.data));
  }
  createPricingRule(body: Partial<PricingRule>): Observable<PricingRule> {
    return this.http.post<ApiResponse<PricingRule>>(`${this.base}/pricing-rules`, body).pipe(map(r => r.data));
  }
  updatePricingRule(id: number, body: Partial<PricingRule>): Observable<PricingRule> {
    return this.http.put<ApiResponse<PricingRule>>(`${this.base}/pricing-rules/${id}`, body).pipe(map(r => r.data));
  }
  deletePricingRule(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/pricing-rules/${id}`).pipe(map(r => r.data));
  }

  // ─── Order Limits ──────────────────────────────────────
  getOrderLimits(): Observable<OrderLimit[]> {
    return this.http.get<ApiResponse<OrderLimit[]>>(`${this.base}/order-limits`).pipe(map(r => r.data));
  }
  createOrderLimit(body: Partial<OrderLimit>): Observable<OrderLimit> {
    return this.http.post<ApiResponse<OrderLimit>>(`${this.base}/order-limits`, body).pipe(map(r => r.data));
  }
  updateOrderLimit(id: number, body: Partial<OrderLimit>): Observable<OrderLimit> {
    return this.http.put<ApiResponse<OrderLimit>>(`${this.base}/order-limits/${id}`, body).pipe(map(r => r.data));
  }
  deleteOrderLimit(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/order-limits/${id}`).pipe(map(() => void 0));
  }

  validateCart(userId: number | undefined, items: any[]): Observable<any[]> {
    return this.http.post<ApiResponse<any[]>>(`${this.base}/order-limits/validate`, { userId, items }).pipe(map(r => r.data));
  }

  /** Cảnh báo trùng ưu tiên / trùng phạm vi MOQ-MOV (backend OrderLimitService.detectConflicts). */
  checkOrderLimitConflicts(draft: Partial<OrderLimit>, excludeRuleId: number | null | undefined): Observable<string[]> {
    return this.http.post<string[]>(`${this.base}/order-limits/conflicts`, {
      draft,
      excludeRuleId: excludeRuleId ?? null,
    });
  }

  // ─── Shipping Rules ────────────────────────────────────
  getShippingRules(): Observable<ShippingRule[]> {
    return this.http.get<ApiResponse<ShippingRule[]>>(`${this.base}/shipping-rules`).pipe(map(r => r.data));
  }

  quoteShipping(body: { userId?: number | null; orderAmount: number; totalQuantity: number }): Observable<ShippingQuote> {
    return this.http
      .post<ApiResponse<ShippingQuote>>(`${this.base}/shipping-rules/quote`, {
        userId: body.userId ?? null,
        orderAmount: body.orderAmount,
        totalQuantity: body.totalQuantity,
      })
      .pipe(map(r => r.data));
  }
  createShippingRule(body: Partial<ShippingRule>): Observable<ShippingRule> {
    return this.http.post<ApiResponse<ShippingRule>>(`${this.base}/shipping-rules`, body).pipe(map(r => r.data));
  }
  updateShippingRule(id: number, body: Partial<ShippingRule>): Observable<ShippingRule> {
    return this.http.put<ApiResponse<ShippingRule>>(`${this.base}/shipping-rules/${id}`, body).pipe(map(r => r.data));
  }
  deleteShippingRule(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/shipping-rules/${id}`).pipe(map(r => r.data));
  }

  // ─── Net Term Rules ───────────────────────────────────
  getNetTermRules(): Observable<NetTermRule[]> {
    return this.http.get<ApiResponse<NetTermRule[]>>(`${this.base}/net-term-rules`).pipe(map(r => r.data));
  }
  createNetTermRule(body: Partial<NetTermRule>): Observable<NetTermRule> {
    return this.http.post<ApiResponse<NetTermRule>>(`${this.base}/net-term-rules`, body).pipe(map(r => r.data));
  }
  updateNetTermRule(id: number, body: Partial<NetTermRule>): Observable<NetTermRule> {
    return this.http.put<ApiResponse<NetTermRule>>(`${this.base}/net-term-rules/${id}`, body).pipe(map(r => r.data));
  }
  deleteNetTermRule(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/net-term-rules/${id}`).pipe(map(r => r.data));
  }
  quoteNetTerm(userId?: number | null): Observable<NetTermQuote> {
    const params: any = {};
    if (userId != null) params.userId = userId;
    return this.http.get<ApiResponse<NetTermQuote>>(`${this.base}/net-term-rules/quote`, { params }).pipe(map(r => r.data));
  }

  // ─── Tax Display Rules ──────────────────────────────────
  getTaxDisplayRules(): Observable<TaxDisplayRule[]> {
    return this.http.get<ApiResponse<TaxDisplayRule[]>>(`${this.base}/tax-display-rules`).pipe(map(r => r.data));
  }
  createTaxDisplayRule(body: Partial<TaxDisplayRule>): Observable<TaxDisplayRule> {
    return this.http.post<ApiResponse<TaxDisplayRule>>(`${this.base}/tax-display-rules`, body).pipe(map(r => r.data));
  }
  updateTaxDisplayRule(id: number, body: Partial<TaxDisplayRule>): Observable<TaxDisplayRule> {
    return this.http.put<ApiResponse<TaxDisplayRule>>(`${this.base}/tax-display-rules/${id}`, body).pipe(map(r => r.data));
  }
  deleteTaxDisplayRule(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/tax-display-rules/${id}`).pipe(map(r => r.data));
  }
  quoteTax(body: { userId?: number | null; orderAmount: number }): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.base}/tax-display-rules/quote`, {
      userId: body.userId ?? null,
      orderAmount: body.orderAmount
    }).pipe(map(r => r.data));
  }

  // ─── Hide Price Rules ───────────────────────────────────
  getHidePriceRules(): Observable<HidePriceRule[]> {
    return this.http.get<ApiResponse<HidePriceRule[]>>(`${this.base}/hide-price-rules`).pipe(map(r => r.data));
  }
  createHidePriceRule(body: Partial<HidePriceRule>): Observable<HidePriceRule> {
    return this.http.post<ApiResponse<HidePriceRule>>(`${this.base}/hide-price-rules`, body).pipe(map(r => r.data));
  }
  updateHidePriceRule(id: number, body: Partial<HidePriceRule>): Observable<HidePriceRule> {
    return this.http.put<ApiResponse<HidePriceRule>>(`${this.base}/hide-price-rules/${id}`, body).pipe(map(r => r.data));
  }
  deleteHidePriceRule(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/hide-price-rules/${id}`).pipe(map(r => r.data));
  }

  // ─── Customer Groups ───────────────────────────────────
  getCustomerGroups(): Observable<CustomerGroup[]> {
    return this.http.get<ApiResponse<CustomerGroup[]>>(`${this.base}/customer-groups`).pipe(map(r => r.data));
  }
  createCustomerGroup(body: Partial<CustomerGroup>): Observable<CustomerGroup> {
    return this.http.post<ApiResponse<CustomerGroup>>(`${this.base}/customer-groups`, body).pipe(map(r => r.data));
  }
  updateCustomerGroup(id: number, body: Partial<CustomerGroup>): Observable<CustomerGroup> {
    return this.http.put<ApiResponse<CustomerGroup>>(`${this.base}/customer-groups/${id}`, body).pipe(map(r => r.data));
  }
  deleteCustomerGroup(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/customer-groups/${id}`).pipe(map(r => r.data));
  }

  // ─── Users ─────────────────────────────────────────────
  getUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.base}/users`).pipe(map(r => r.data));
  }
  getUsersByRoles(roles: string[]): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.base}/users/roles`, { params: { roles: roles.join(',') } }).pipe(map(r => r.data));
  }
  getUserById(id: number): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.base}/users/${id}`).pipe(map(r => r.data));
  }
  createUser(body: any): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.base}/users`, body).pipe(map(r => r.data));
  }
  updateUser(id: number, body: any): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.base}/users/${id}`, body).pipe(map(r => r.data));
  }
  deleteUser(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/users/${id}`).pipe(map(r => r.data));
  }

  // ─── B2B Registration Forms ────────────────────────────
  getB2BRegistrationForms(): Observable<B2BRegistrationForm[]> {
    return this.http.get<ApiResponse<B2BRegistrationForm[]>>(`${this.base}/b2b-registration-forms`).pipe(map(r => r.data));
  }

  // ─── Orders ─────────────────────────────────────────────
  getOrders(): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(`${this.base}/orders`).pipe(map(r => r.data));
  }

  getOrdersByUser(userId: number): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(`${this.base}/orders/user/${userId}`).pipe(map(r => r.data));
  }

  getDebtSummary(userId: number): Observable<DebtSummary> {
    return this.http.get<ApiResponse<DebtSummary>>(`${this.base}/orders/user/${userId}/debt-summary`).pipe(map(r => r.data));
  }

  getDebtReport(startDate?: string, endDate?: string): Observable<DebtOrderReportRow[]> {
    return this.http.get<ApiResponse<DebtOrderReportRow[]>>(`${this.base}/orders/debt-report`, {
      params: { startDate: startDate || '', endDate: endDate || '' }
    }).pipe(map(r => r.data));
  }

  getOrdersByUserPaged(userId: number, page: number = 0, size: number = 10): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.base}/orders/paged`, {
      params: { userId: userId.toString(), page: page.toString(), size: size.toString() }
    }).pipe(map(r => r.data));
  }

  getReviewsByProduct(productId: number): Observable<ProductReview[]> {
    return this.http.get<ApiResponse<ProductReview[]>>(`${this.base}/reviews/product/${productId}`).pipe(map(r => r.data));
  }

  submitReview(review: any): Observable<ProductReview> {
    return this.http.post<ApiResponse<ProductReview>>(`${this.base}/reviews`, review).pipe(map(r => r.data));
  }

  updateReview(id: number, review: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.base}/reviews/${id}`, review).pipe(map(r => r.data));
  }

  deleteReview(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/reviews/${id}`).pipe(map(r => r.data));
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.base}/orders/${id}`).pipe(map(r => r.data));
  }

  updateOrderStatus(id: number, status: string): Observable<Order> {
    return this.http.patch<ApiResponse<Order>>(`${this.base}/orders/${id}/status?status=${status}`, {}).pipe(map(r => r.data));
  }

  updatePaymentStatus(id: number, status: string): Observable<Order> {
    return this.http.patch<ApiResponse<Order>>(`${this.base}/orders/${id}/payment-status?paymentStatus=${status}`, {}).pipe(map(r => r.data));
  }

  markRefundProcessed(id: number): Observable<Order> {
    return this.http.patch<ApiResponse<Order>>(`${this.base}/orders/${id}/refund-processed`, {}).pipe(map(r => r.data));
  }

  confirmRefundReceived(orderId: number, userId: number): Observable<Order> {
    return this.http
      .patch<ApiResponse<Order>>(`${this.base}/orders/${orderId}/confirm-refund-received?userId=${userId}`, {})
      .pipe(map(r => r.data));
  }

  // ─── Payments ───────────────────────────────────────────
  getTransactionsByOrder(orderId: number): Observable<PaymentTransaction[]> {
    return this.http.get<ApiResponse<PaymentTransaction[]>>(`${this.base}/payments/order/${orderId}/transactions`).pipe(map(r => r.data));
  }

  // ─── AI Sync (Module 5) ──────────────────────────────
  getAiSyncStatus(): Observable<AIProductSync[]> {
    return this.http.get<ApiResponse<AIProductSync[]>>(`${this.base}/ai-sync/status`).pipe(map(r => r.data));
  }
  syncProductAi(productId: number): Observable<AIProductSync> {
    return this.http.post<ApiResponse<AIProductSync>>(`${this.base}/ai-sync/sync/${productId}`, {}).pipe(map(r => r.data));
  }

  generateAiDescriptions(): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.base}/ai-sync/generate-descriptions`, {}).pipe(map(r => r.data));
  }

  // ─── Reports & Analytics ──────────────────────────────
  getSalesReport(startDate?: string, endDate?: string): Observable<SalesReport> {
    return this.http
      .get<ApiResponse<SalesReport>>(`${this.base}/reports/sales`, { params: { startDate: startDate || '', endDate: endDate || '' } })
      .pipe(map((r) => this.normalizeSalesReport(r.data)));
  }

  /** Chuẩn hóa snake_case / thiếu field từ API cũ. */
  private normalizeSalesReport(raw: SalesReport | undefined): SalesReport {
    if (!raw) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        bestSellers: [],
        revenueByDate: [],
      };
    }
    const rows = raw.revenueByDate;
    if (!rows?.length) return raw;
    return {
      ...raw,
      revenueByDate: rows.map((row) => {
        const r = row as Record<string, unknown>;
        const paid = r['paidOrderCount'] ?? r['paid_order_count'];
        const items = r['itemsSoldQuantity'] ?? r['items_sold_quantity'];
        const summary = r['paidOrdersSummary'] ?? r['paid_orders_summary'];
        const paidOrdersRaw = r['paidOrders'] ?? r['paid_orders'];
        let paidOrders: SalesReportPaidOrderLine[] | undefined;
        if (Array.isArray(paidOrdersRaw) && paidOrdersRaw.length) {
          paidOrders = paidOrdersRaw.map((line) => {
            const o = line as Record<string, unknown>;
            const id = o['orderId'] ?? o['order_id'];
            const label = o['customerLabel'] ?? o['customer_label'] ?? '';
            const amt = o['amount'];
            return {
              orderId: Number(id),
              customerLabel: String(label),
              amount: amt != null && amt !== '' ? Number(amt) : 0,
            };
          });
        }
        return {
          date: String(row.date ?? ''),
          amount: Number(row.amount ?? 0),
          paidOrderCount: paid != null && paid !== '' ? Number(paid) : (row.paidOrderCount ?? 0),
          itemsSoldQuantity: items != null && items !== '' ? Number(items) : (row.itemsSoldQuantity ?? 0),
          paidOrdersSummary:
            summary != null && summary !== ''
              ? String(summary)
              : row.paidOrdersSummary,
          paidOrders: paidOrders ?? row.paidOrders,
        };
      }),
    };
  }

  getVariantReport(startDate?: string, endDate?: string): Observable<VariantReport> {
    return this.http.get<ApiResponse<VariantReport>>(`${this.base}/reports/variants`, { params: { startDate: startDate || '', endDate: endDate || '' } }).pipe(map(r => r.data));
  }

  getExpenses(): Observable<Expense[]> {
    return this.http.get<ApiResponse<Expense[]>>(`${this.base}/reports/expenses`).pipe(map(r => r.data));
  }

  createExpense(body: Partial<Expense>): Observable<Expense> {
    return this.http.post<ApiResponse<Expense>>(`${this.base}/reports/expenses`, body).pipe(map(r => r.data));
  }

  getVatReport(): Observable<VatReport> {
    return this.http.get<ApiResponse<VatReport>>(`${this.base}/reports/vat`).pipe(map(r => r.data));
  }

  // ─── Home Settings (Banners) ──────────────────────────
  getHomeSettings(): Observable<HomeSetting[]> {
    return this.http.get<ApiResponse<HomeSetting[]>>(`${this.base}/home-settings`).pipe(map(r => r.data));
  }
  getHomeSetting(key: string): Observable<HomeSetting> {
    return this.http.get<ApiResponse<HomeSetting>>(`${this.base}/home-settings/${key}`).pipe(map(r => r.data));
  }
  updateHomeSetting(body: { settingKey: string; settingValue: string }): Observable<HomeSetting> {
    return this.http.post<ApiResponse<HomeSetting>>(`${this.base}/home-settings`, body).pipe(map(r => r.data));
  }

  // ─── Coupons ───────────────────────────────────────────
  getCoupons(): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(`${this.base}/coupons`); // Note: Backend uses simple List skip ApiResponse for now per my implementation
  }

  createCoupon(body: Partial<Coupon>): Observable<Coupon> {
    return this.http.post<Coupon>(`${this.base}/coupons`, body);
  }

  updateCoupon(id: number, body: Partial<Coupon>): Observable<Coupon> {
    return this.http.put<Coupon>(`${this.base}/coupons/${id}`, body);
  }

  deleteCoupon(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/coupons/${id}`);
  }

  validateCoupon(code: string): Observable<Coupon> {
    return this.http.get<Coupon>(`${this.base}/coupons/validate/${code}`);
  }

  // ─── Sale Campaigns ────────────────────────────────────
  getSaleCampaigns(): Observable<SaleCampaign[]> {
    return this.http.get<SaleCampaign[]>(`${this.base}/sale-campaigns`);
  }

  createSaleCampaign(body: Partial<SaleCampaign>): Observable<SaleCampaign> {
    return this.http.post<SaleCampaign>(`${this.base}/sale-campaigns`, body);
  }

  deleteSaleCampaign(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/sale-campaigns/${id}`);
  }

  // ─── Wallets ───────────────────────────────────────────
  getWallets(): Observable<Wallet[]> {
    return this.http.get<Wallet[]>(`${this.base}/wallets`);
  }

  getWalletByUserId(userId: number): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.base}/wallets/${userId}`);
  }

  getWalletTransactions(walletId: number): Observable<WalletTransaction[]> {
    return this.http.get<WalletTransaction[]>(`${this.base}/wallets/${walletId}/transactions`);
  }

  // ─── Reviews ───────────────────────────────────────────
  getReviews(): Observable<ProductReview[]> {
    return this.http.get<ApiResponse<ProductReview[]>>(`${this.base}/reviews`).pipe(map(r => r.data));
  }

  replyToReview(reviewId: number, message: string): Observable<ProductReview> {
    return this.http.post<ApiResponse<ProductReview>>(`${this.base}/reviews/${reviewId}/reply`, message).pipe(map(r => r.data));
  }

  // ─── Messaging ─────────────────────────────────────────
  getChat(user1: number, user2: number): Observable<ChatMessage[]> {
    return this.http.get<ApiResponse<ChatMessage[]>>(`${this.base}/messages/chat/${user1}/${user2}`).pipe(map(r => r.data));
  }

  sendMessage(message: Partial<ChatMessage>): Observable<ChatMessage> {
    return this.http.post<ApiResponse<ChatMessage>>(`${this.base}/messages`, message).pipe(map(r => r.data));
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<ApiResponse<Conversation[]>>(`${this.base}/messages/conversations`).pipe(map(r => r.data));
  }

  markMessagesAsRead(senderId: number, receiverId: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.base}/messages/read-all/${senderId}/${receiverId}`, {}).pipe(map(r => r.data));
  }

  // ─── RBAC / Roles ──────────────────────────────────────
  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(`${this.base}/roles`).pipe(map(r => r.data));
  }

  saveRole(role: Role): Observable<Role> {
    return this.http.post<ApiResponse<Role>>(`${this.base}/roles`, role).pipe(map(r => r.data));
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/roles/${id}`).pipe(map(r => r.data));
  }

  // ─── B2B Registration Forms ────────────────────────────
  getB2BForms(): Observable<B2BRegistrationForm[]> {
    return this.http.get<ApiResponse<B2BRegistrationForm[]>>(`${this.base}/b2b-registration-forms`).pipe(map(r => r.data));
  }
  createB2BForm(body: B2BRegistrationFormRequest): Observable<B2BRegistrationForm> {
    return this.http.post<ApiResponse<B2BRegistrationForm>>(`${this.base}/b2b-registration-forms`, body).pipe(map(r => r.data));
  }
  checkRuleConflicts(ruleType: string, newRule: RuleTarget): Observable<string[]> {
    return this.http.post<string[]>(`${this.base}/rules/conflicts/check`, { ruleType, newRule });
  }

  // ─── AI Assistant ────────────────────────────
  chatWithAI(message: string): Observable<AIResponse> {
    return this.http.post<ApiResponse<AIResponse>>(`${this.base}/ai/chat`, { message })
      .pipe(map(res => res.data));
  }

  // ─── Bundles ──────────────────────────────────────────
  getBundles(): Observable<Bundle[]> {
    return this.http.get<ApiResponse<Bundle[]>>(`${this.base}/bundles`).pipe(map(r => r.data));
  }

  /** Combo ACTIVE có chứa biến thể của sản phẩm (bất kỳ variant nào của SP). */
  getBundlesContainingProduct(productId: number): Observable<Bundle[]> {
    return this.http
      .get<ApiResponse<Bundle[]>>(`${this.base}/bundles/containing-product/${productId}`)
      .pipe(map(r => r.data || []));
  }

  /** Combo ACTIVE có item trỏ đúng biến thể đang chọn (trang chi tiết SP). */
  getBundlesContainingVariant(variantId: number): Observable<Bundle[]> {
    return this.http
      .get<ApiResponse<Bundle[]>>(`${this.base}/bundles/containing-variant/${variantId}`)
      .pipe(map(r => r.data || []));
  }

  getBundleById(id: number): Observable<Bundle> {
    return this.http.get<ApiResponse<Bundle>>(`${this.base}/bundles/${id}`).pipe(map(r => r.data));
  }
  createBundle(body: Partial<Bundle>): Observable<Bundle> {
    return this.http.post<ApiResponse<Bundle>>(`${this.base}/bundles`, body).pipe(map(r => r.data));
  }
  updateBundle(id: number, body: Partial<Bundle>): Observable<Bundle> {
    return this.http.put<ApiResponse<Bundle>>(`${this.base}/bundles/${id}`, body).pipe(map(r => r.data));
  }
  deleteBundle(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/bundles/${id}`).pipe(map(r => r.data));
  }
}
