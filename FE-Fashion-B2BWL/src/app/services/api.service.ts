import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Category {
  id: number;
  name: string;
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
}

export interface ProductVariant {
  id: number;
  productId?: number | null;
  sku: string;
  attributes?: string;
  stockQuantity: number;
  priceAdjustment?: number;
  imageUrl?: string;
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
}
