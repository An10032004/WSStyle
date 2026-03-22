import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
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
  specifications?: string;
  imageUrl?: string;
  imageUrls?: string;
  brand?: string;
}

export interface ProductVariant {
  id: number;
  productId?: number | null;
  sku: string;
  attributes?: string;
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
  content: string; // JSON string
}

export interface TranslationRequest {
  resourceId: number;
  resourceType: string;
  languageCode: string;
  content: string; // JSON string
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
  defaultDiscountRate?: number;
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

export interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  bestSellers: { name: string; quantity: number; revenue: number }[];
  revenueByDate: { date: string; amount: number }[];
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
  userId: number;
  rating: number;
  comment?: string;
  replyMessage?: string;
  isPinned: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api';

  constructor(private http: HttpClient) {}

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

  // ─── Products ──────────────────────────────────────────
  getProducts(): Observable<Product[]> {
    return this.http.get<ApiResponse<Product[]>>(`${this.base}/products`).pipe(map(r => r.data));
  }
  getProductById(id: number): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.base}/products/${id}`).pipe(map(r => r.data));
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
    return this.http.delete<ApiResponse<void>>(`${this.base}/order-limits/${id}`).pipe(map(r => r.data));
  }

  // ─── Shipping Rules ────────────────────────────────────
  getShippingRules(): Observable<ShippingRule[]> {
    return this.http.get<ApiResponse<ShippingRule[]>>(`${this.base}/shipping-rules`).pipe(map(r => r.data));
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

  getOrderById(id: number): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.base}/orders/${id}`).pipe(map(r => r.data));
  }

  updateOrderStatus(id: number, status: string): Observable<Order> {
    return this.http.patch<ApiResponse<Order>>(`${this.base}/orders/${id}/status?status=${status}`, {}).pipe(map(r => r.data));
  }

  updatePaymentStatus(id: number, status: string): Observable<Order> {
    return this.http.patch<ApiResponse<Order>>(`${this.base}/orders/${id}/payment-status?paymentStatus=${status}`, {}).pipe(map(r => r.data));
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

  // ─── Reports & Analytics ──────────────────────────────
  getSalesReport(startDate?: string, endDate?: string): Observable<SalesReport> {
    return this.http.get<ApiResponse<SalesReport>>(`${this.base}/reports/sales`, { params: { startDate: startDate || '', endDate: endDate || '' } }).pipe(map(r => r.data));
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

  deleteCoupon(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/coupons/${id}`);
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
    return this.http.get<ProductReview[]>(`${this.base}/reviews`);
  }

  replyToReview(reviewId: number, message: string): Observable<ProductReview> {
    return this.http.post<ProductReview>(`${this.base}/reviews/${reviewId}/reply`, message);
  }

  // ─── Messaging ─────────────────────────────────────────
  getChat(user1: number, user2: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/messages/chat/${user1}/${user2}`);
  }

  sendMessage(message: Partial<ChatMessage>): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/messages`, message);
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
}
