# Tài liệu hệ thống Fashion B2B / WSSTYLE — Backend & Frontend

Tài liệu mô tả **kiến trúc hiện tại**, **luồng dữ liệu file → file**, **hàm / quy tắc chính**, và **cách backend kết nối với frontend**. Đường dẫn gốc workspace: `D:\WSStyle`.

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Backend Spring Boot](#2-backend-spring-boot)
3. [Frontend Angular](#3-frontend-angular)
4. [Kết nối HTTP & bảo mật](#4-kết-nối-http--bảo-mật)
5. [Luồng xác thực & phiên](#5-luồng-xác-thực--phiên)
6. [Luồng sản phẩm & giá (API → DTO → UI)](#6-luồng-sản-phẩm--giá-api--dto--ui)
7. [Luồng quy tắc giá (B2B vs Quantity Break)](#7-luồng-quy-tắc-giá-b2b-vs-quantity-break)
8. [Luồng giỏ hàng & tái tính giá](#8-luồng-giỏ-hàng--tái-tính-giá)
9. [Luồng giới hạn đơn hàng (Order limits)](#9-luồng-giới-hạn-đơn-hàng-order-limits)
10. [Luồng đặt hàng & thanh toán](#10-luồng-đặt-hàng--thanh-toán)
11. [Luồng phí ship & thuế (quote)](#11-luồng-phí-ship--thuế-quote)
12. [Luồng đánh giá sản phẩm](#12-luồng-đánh-giá-sản-phẩm)
13. [Luồng combo / bundle](#13-luồng-combo--bundle)
14. [Admin: routing, guard, sidebar](#14-admin-routing-guard-sidebar)
15. [Storefront: routing & trang chính](#15-storefront-routing--trang-chính)
16. [Bảng tham chiếu API ↔ file](#16-bảng-tham-chiếu-api--file)

---

## 1. Tổng quan dự án

| Thành phần | Đường dẫn | Vai trò |
|-------------|-----------|---------|
| **Backend** | `Fashion-B2BWL-/` | Spring Boot 4.x, REST API prefix `/api`, MySQL (JPA), JWT (phát hành qua auth; Security hiện `permitAll` cho `/api/**` trong môi trường dev) |
| **Frontend** | `FE-Fashion-B2BWL/` | Angular 21, standalone components, Taiga UI, Transloco |
| **Cấu hình chạy dev** | `FE-Fashion-B2BWL/proxy.conf.json` | Proxy `/api` → `http://localhost:8080`, `changeOrigin: true` (khi `ng serve` kèm `--proxy-config`) |
| **Cấu hình BE** | `Fashion-B2BWL-/src/main/resources/application.properties` | DB, Jackson timezone, feature flags (vd. công nợ) |

**Luồng request điển hình (dev):**

`Trình duyệt → http://localhost:4000` (Angular) → HTTP `GET/POST /api/...` → **proxy** chuyển tới `http://localhost:8080/api/...` → `DispatcherServlet` → `@RestController` → `Service` → `Repository` / DB → JSON `ApiResponse<T>` hoặc DTO tùy endpoint.

---

## 2. Backend Spring Boot

### 2.1 Entry & quét component

| File | Nội dung |
|------|-----------|
| `Fashion-B2BWL-/src/main/java/com/fashionstore/core/FashionB2BwlBackendApplication.java` | `@SpringBootApplication` — quét bean trong `com.fashionstore.core` và con |

### 2.2 Cấu hình bảo mật & CORS

| File | Chức năng |
|------|-----------|
| `.../config/SecurityConfig.java` | `SecurityFilterChain`: tắt CSRF, session STATELESS, `permitAll` cho `/api/**` và `OPTIONS /**`, bật **CORS** (`corsConfigurationSource()` đăng ký `/api/**`) |
| `.../config/SecurityConfig.java` | Bean `PasswordEncoder` (BCrypt) — dùng khi đăng ký / đổi mật khẩu |

### 2.3 Lớp API (Controllers)

Tất cả controller REST nằm dưới `com.fashionstore.core.controller`, mapping cơ sở đã liệt kê trong [mục 16](#16-bảng-tham-chiếu-api--file).

**Định dạng phản hồi thường gặp:**

- `ApiResponse<T>`: `Fashion-B2BWL-/.../dto/response/ApiResponse.java` — `success`, `message`, `data`.
- Một số endpoint auth trả `AuthResponse` trực tiếp (không bọc `ApiResponse`).

### 2.4 Lớp nghiệp vụ (Services) — trích các service “xương sống”

| Service | Vai trò chính |
|---------|----------------|
| `UserService` | CRUD user, `authenticate`, `register`, `changePassword` |
| `JwtService` / `RefreshTokenService` | Token access / refresh (gắn với `AuthController`) |
| `ProductService` | CRUD sản phẩm, tìm kiếm phân trang, brands |
| `ProductMapperService` | **Entity Product → ProductResponseDTO**: áp hide price, campaign, **pricing rules**, tax display, net term… |
| `RuleCoreService` | Khớp KH/SP, `findBestPricingRule`, hide price, sale campaign, tax, net term… |
| `ProductVariantService` | Biến thể theo product / SKU |
| `OrderService` | Tạo đơn, cập nhật trạng thái, công nợ, gọi `OrderLimitService.validateCart`, quote tax ship nội bộ |
| `OrderLimitService` | MOQ/MOV/MAX…, `validateCart`, phát hiện conflict |
| `ShippingRuleService` | `quote(userId, orderAmount, totalQuantity)` — tính phí ship |
| `TaxDisplayRuleService` | `quoteTax(userId, orderAmount)` |
| `PricingRuleService` (và repository) | CRUD pricing rules (admin + nạp cho mapper) |
| `BundleService` | Combo / bundle |
| `CouponService` | Mã giảm giá |
| `ReportService` / các rule khác | Báo cáo, cấu hình nâng cao |

### 2.5 Persistence

- `.../repository/*Repository.java` — Spring Data JPA.
- `.../model/*.java` — entity.
- `.../dto/request/*`, `.../dto/response/*` — contract API.

---

## 3. Frontend Angular

### 3.1 Khởi động ứng dụng

| File | Nội dung |
|------|-----------|
| `FE-Fashion-B2BWL/src/main.ts` | `bootstrapApplication(AppComponent, appConfig)` |
| `FE-Fashion-B2BWL/src/app/app.config.ts` | `provideRouter(routes)`, `provideHttpClient(withInterceptors([authInterceptor]))`, Taiga, Transloco |
| `FE-Fashion-B2BWL/src/app/app.ts` | Shell app (router-outlet) |
| `FE-Fashion-B2BWL/src/app/app.routes.ts` | **Toàn bộ route** admin + storefront |

### 3.2 HTTP & dịch vụ lõi

| File | Vai trò |
|------|---------|
| `FE-Fashion-B2BWL/src/app/services/api.service.ts` | `HttpClient`, `base = '/api'`, **mọi** gọi REST (products, orders, rules, quote shipping/tax, …) |
| `FE-Fashion-B2BWL/src/app/services/auth.service.ts` | Login/register/refresh, lưu `localStorage` (`auth_user`, `auth_token`, `refresh_token`), `BehaviorSubject` user |
| `FE-Fashion-B2BWL/src/app/services/cart.service.ts` | Giỏ **client-side**: state, `addToCart`, `calculatePrice`, `validate` → gọi API order-limits, đồng bộ pricing rules, coupon, drawer |

### 3.3 Interceptor

| File | Hành vi |
|------|---------|
| `FE-Fashion-B2BWL/src/app/interceptors/auth.interceptor.ts` | Gắn header `Authorization: Bearer <auth_token>` nếu có; **401** (trừ login) → `AuthService.refreshToken()` rồi retry; thất bại refresh → `logout()` |

---

## 4. Kết nối HTTP & bảo mật

1. **Dev:** `ng serve` (vd. port 4000) + `proxy.conf.json` → request `/api/...` không đụng Angular static, được chuyển tới backend 8080.
2. **Header JWT:** Mọi request qua `HttpClient` đều có thể mang Bearer token nếu user đã login (interceptor).
3. **Backend:** `SecurityConfig` hiện cho phép toàn bộ `/api/**` không cần role (phục vụ dev); **JWT vẫn được phát** khi login — khi siết security sau này, filter JWT sẽ đọc header này.

---

## 5. Luồng xác thực & phiên

### 5.1 Đăng ký

1. **UI:** `pages/register/register.ts` (form) → `AuthService.register(userData)`.
2. **HTTP:** `POST /api/auth/register` — `AuthController.register` → `UserService.register` → lưu user (hash password qua `PasswordEncoder`).
3. **Phản hồi:** `AuthResponse` — `AuthService.setSession` lưu user + token nếu `success`.

### 5.2 Đăng nhập

1. **UI:** `pages/login/login.ts` → `AuthService.login(credentials)`.
2. **HTTP:** `POST /api/auth/login` — `AuthController.login` → `UserService.authenticate` → `JwtService.generateToken`, `RefreshTokenService.createRefreshToken`.
3. **FE:** `setSession` → sidebar / guard đọc `AuthService.currentUserValue` hoặc `user$`.

### 5.3 Refresh token

- **HTTP:** `POST /api/auth/refresh-token` — `AuthController` + body `TokenRefreshRequest`.
- **Gọi tự động:** `auth.interceptor.ts` khi 401.

### 5.4 Đổi mật khẩu (storefront / profile)

1. **UI:** `pages/profile/profile.ts` — form reactive → `ApiService.changePassword({ email, currentPassword, newPassword })`.
2. **HTTP:** `POST /api/auth/change-password` — `AuthController.changePassword` → `UserService.changePassword`.
3. **GET cùng path:** `AuthController` có `GET /change-password` trả **405** + JSON hướng dẫn (tránh lỗi “static resource” khi mở URL bằng trình duyệt).

### 5.5 Bảo vệ route admin

| File | Logic |
|------|--------|
| `FE-Fashion-B2BWL/src/app/guards/auth.guard.ts` | `canActivate`: bắt buộc đăng nhập; role `ADMIN`/`Administrator`/… bypass; không thì so khớp `expectedRoles` hoặc **permissions** (map `module` → chuỗi quyền tiếng Việt) |

**Route admin:** `app.routes.ts` — `path: 'admin'`, `component: LayoutComponent`, `canActivate: [authGuard]`, `children: [...]`.

---

## 6. Luồng sản phẩm & giá (API → DTO → UI)

### 6.1 Danh sách / tìm kiếm sản phẩm

**Backend**

1. `ProductController.getAllProducts(userId?)` hoặc `searchProducts(..., userId?)`.
2. `ProductService` lấy entity `Product`.
3. `ProductMapperService.toDTOs(..., user)` — **mỗi** sản phẩm:
   - `RuleCoreService.findBestHidePriceRule` → ẩn giá / nút mua / text thay thế.
   - `findBestSaleCampaign` → giảm % lên `calculatedPrice`, `discountLabel`.
   - Pricing: tìm rule **QUANTITY_BREAK** tốt nhất → gán `quantityBreaksJson` từ `actionConfig`; sau đó `findBestPricingRule` → nếu B2B thì chỉnh `calculatedPrice` theo %/FIXED; nếu QB chỉ gắn nhãn “Ưu đãi mua sỉ”.
   - `findBestTaxRule` → tax display + có thể chỉnh giá thêm.
   - Net term, v.v.

**Frontend**

1. `ApiService.getProducts(userId?)` / `searchProducts` / `getProductById(id, userId?)` — đều gửi `userId` khi đã login để backend áp rule theo user (nhóm KH, v.v.).
2. **Shop / storefront:** `pages/shop/shop.ts`, `pages/storefront/storefront.ts`, `pages/product-list/*` (admin) — subscribe `ApiService`.

### 6.2 Chi tiết sản phẩm (PDP)

**Luồng file**

1. **Route:** `app.routes.ts` → `path: 'product/:id'` → `ProductDetailComponent`.
2. **Load SP:** `product-detail.ts` → `loadProduct()` → `ApiService.getProductById(id, userId)` → `ProductController.getProductById` → `ProductMapperService.toDTO` (cùng pipeline giá như trên).
3. **Biến thể:** `loadVariants` → `ApiService.getProductVariantsByProduct` → `ProductVariantController` / `ProductVariantService`.
4. **Pricing rules trên client (đồng bộ giỏ):** `CartService` load `getPricingRules()` khi khởi tạo / đăng nhập; `product-detail.ts` subscribe `cart.pricingRules$` → `loadPricingRules(productId, categoryId)`:
   - Lọc rule: `utils/rule-targeting.ts` — `ruleMatchesTargeting`.
   - Sắp `priority` → `winner = allMatches[0]`.
   - `winnerType`: `'QB' | 'B2B' | 'NONE'` — điều khiển **UI** (badge, bảng bậc).
   - Bảng bậc hiển thị: `cart.getQuantityBreaks({ productId, categoryId, quantityBreaksJson }, user)` + component `shared/components/quantity-break-table/`.
5. **Giá hiển thị realtime theo SL:** getter `currentPrice` → `CartService.calculatePrice(productId, categoryId, basePrice, quantity, quantityBreaksJson)` — **cùng công thức với giỏ** (xem [mục 7](#7-luồng-quy-tắc-giá-b2b-vs-quantity-break)).

---

## 7. Luồng quy tắc giá (B2B vs Quantity Break)

### 7.1 Backend — chọn “một rule thắng”

**File:** `RuleCoreService.java` — `findBestPricingRule(productId, categoryId, user, rules)`:

- Lọc `isCustomerMatch`, `isProductMatch`.
- **`.min(Comparator.comparing(PricingRule::getPriority))`** → **priority số nhỏ = ưu tiên cao hơn** (thắng).

**File:** `ProductMapperService.java`:

- Gán `quantityBreaksJson` từ rule **QUANTITY_BREAK** khớp (rule QB có priority tốt nhất trong các rule QB).
- Áp **một** `findBestPricingRule` cho `calculatedPrice` / `discountLabel` như mô tả ở mục 6.

### 7.2 Frontend — `CartService.calculatePrice(...)`

**File:** `FE-Fashion-B2BWL/src/app/services/cart.service.ts` — hàm `calculatePrice`:

1. Lọc `pricingRules` theo `isCustomerMatch` + `isProductMatch`, sort `priority` tăng dần → `bestRule = matchingRules[0]`.
2. Chuẩn bị **tiers** (bậc SL): từ `quantityBreaksJson` của sản phẩm; nếu `bestRule.ruleType === 'QUANTITY_BREAK'` thì parse tiers từ `actionConfig` của rule (ghi đè nguồn tiers).
3. Nếu `bestRule` là **B2B_PRICE**: áp % hoặc FIXED lên `finalPrice`, set `appliedB2BRule`.
4. Nếu có tiers và khớp `quantity`:
   - Nếu **bestRule là QUANTITY_BREAK** **hoặc** **không có bestRule** → dùng giá bậc `qbPrice`, set `appliedQBBreak`.
   - Nếu **bestRule là B2B_PRICE** → **không** áp QB lên giá (`appliedQBBreak = null`) — **B2B thắng tuyệt đối** so với bậc SP.

5. `recalculateItemPrice` dùng `calculatePrice` và gán `item.discountLabel` theo QB hoặc B2B.

### 7.3 Tiện ích priority toàn cục (order limits / rule engine)

**File:** `FE-Fashion-B2BWL/src/app/utils/rule-priority.ts` — `pickSingleBestRule`, `GLOBAL_BLOCKING_PRIORITY`, overlap — dùng cho **order limits** và màn rule engine, khác biệt nhỏ với sort đơn giản trên PDP nhưng cùng tinh thần **priority**.

---

## 8. Luồng giỏ hàng & tái tính giá

### 8.1 Nguồn state

**File:** `cart.service.ts`

- `BehaviorSubject<CartItem[]>` — `cart$`.
- Persist: key theo user (localStorage) — đồng bộ khi login (`syncOnLogin`).
- `loadPricingRules()` / `getOrderLimits()` từ `ApiService` → cache trong `BehaviorSubject`.

### 8.2 Thêm sản phẩm

**Hàm:** `addToCart(product, variant, quantity, unitPrice?, lockUnitPrice?, bundleId?, silent?, bundleLabel?, cartOpts?)`

- Kiểm tra tồn kho, trùng combo (`bundleId`), giá variant, quantity breaks khi không khóa giá.
- `saveCart` → có thể `validate()` — gọi server + client validation.

### 8.3 Drawer giỏ (header)

**File:** `shared/components/cart-drawer/*` + `storefront-header.*` — `CartService.toggleCartDrawer` / `openCartDrawer` / `closeCartDrawer`.

### 8.4 Trang giỏ đầy đủ

**File:** `pages/cart/cart.ts` + `cart.html`:

- `cartLayout$` — nhóm `bundleId` vs hàng lẻ (hàm `buildBundleGroups`).
- `shippingQuote$` / `taxQuote$` — `combineLatest` + `ApiService.quoteShipping` / `quoteTax`.
- Coupon: `CartService.applyCoupon` → `ApiService.validateCoupon`.

---

## 9. Luồng giới hạn đơn hàng (Order limits)

### Backend

| Bước | File / hàm |
|------|------------|
| Endpoint | `OrderLimitController` — `POST /api/order-limits/validate` |
| Body | `ValidateCartRequest`: `userId`, `items` (danh sách `CartItemDTO`) |
| Xử lý | `OrderLimitService.validateCart(user, items)` — trả `List<ValidationResult>` (success/message) |

### Frontend

| Bước | File / hàm |
|------|------------|
| Gọi khi thêm / cập nhật giỏ | `CartService.validate()` — `switchMap` user → `api.validateCart` |
| Client trước | `CartService.validateClientSide` — MOQ/MOV/MAX… |
| PDP / policy | `product-detail.ts` — `loadOrderLimits`, getters `isMoqViolation`, `activeOrderLimit`, … |

### Đặt hàng (server-side)

**File:** `OrderService.java` — khi `createOrder`, gọi lại `orderLimitService.validateCart` với snapshot giỏ từ request để **không tin client**.

---

## 10. Luồng đặt hàng & thanh toán

### 10.1 Checkout UI

**File:** `pages/checkout/checkout.ts` + `checkout.html`:

- Form địa chỉ, phương thức thanh toán, `CartService.cart$`.
- Tổng phụ / ship / tax / coupon — observable kết hợp (tương tự cart).

### 10.2 Submit đơn

1. **FE:** `ApiService.createOrder(OrderRequest)` → `POST /api/orders`.
2. **BE:** `OrderController.createOrder` → `OrderService.createOrder(OrderRequest)`.
3. **OrderService (logic cần biết):**
   - Map items, áp giá / thuế / ship từ **quote server** (tránh sửa tay từ client) — trong code có gọi `validateCart`, `quoteTax`, và logic ship (xem service để chi tiết từng bước).
4. **Sau thành công:** FE thường navigate `/profile` hoặc clear giỏ (tùy implementation trong `checkout.ts`).

---

## 11. Luồng phí ship & thuế (quote)

### Shipping

| Tầng | Chi tiết |
|------|----------|
| **BE** | `ShippingRuleController` — `POST /api/shipping-rules/quote` + `ShippingQuoteRequest` → `ShippingRuleService.quote(userId, orderAmount, totalQuantity)` |
| **FE** | `ApiService.quoteShipping(...)` — gọi từ `cart.ts`, `checkout.ts` (combineLatest với giỏ + user + coupon) |

### Tax

| Tầng | Chi tiết |
|------|----------|
| **BE** | `TaxDisplayRuleController` — `POST /api/tax-display-rules/quote` (body map) → `TaxDisplayRuleService.quoteTax(userId, orderAmount)` |
| **FE** | `ApiService.quoteTax(...)` |

---

## 12. Luồng đánh giá sản phẩm

| Tầng | File / endpoint |
|------|------------------|
| **BE** | `ProductReviewController` — `/api/reviews` (CRUD / theo product — xem controller đầy đủ) |
| **FE PDP** | `product-detail.ts` — `loadReviews`, `submitNewReview` / update → `ApiService` tương ứng |
| **Admin** | `admin/reviews` → `pages/reviews/reviews.ts` |

---

## 13. Luồng combo / bundle

| Tầng | File |
|------|------|
| **BE** | `BundleController` — `/api/bundles`; `BundleService` |
| **FE PDP** | `product-detail.ts` — `refreshProductBundles` → `ApiService.getBundlesContainingVariant` |
| **FE bundle page** | `app.routes.ts` — `bundle/:id` → `bundle-detail.ts` — thêm combo vào giỏ với `bundleId`, giá khóa |

**Giỏ:** `CartItem.bundleId`, `bundleLabel` — `cart.ts` / `cart-drawer` nhóm theo `bundleId`; `CartService.updateQuantity` **bỏ qua** dòng có `bundleId` (chỉnh trên trang giỏ đầy đủ / xóa cả combo).

---

## 14. Admin: routing, guard, sidebar

### 14.1 Layout admin

| File | Vai trò |
|------|---------|
| `layout/layout.ts` | Shell: sidebar + `router-outlet` cho children |
| `layout/sidebar/sidebar.ts` | `canSee(module)` — **cùng mapping permission** với `auth.guard.ts` (chuỗi tiếng Việt trong mảng `permissions` của user) |
| `layout/sidebar/sidebar.html` | `routerLink` tới `/admin/...` |

### 14.2 Danh sách route con `/admin/*` (theo `app.routes.ts`)

| Path | `data.module` (granular) | Ghi chú guard |
|------|--------------------------|---------------|
| `dashboard` | `dashboard` | — |
| `categories` | `categories` | — |
| `products` | `products` | — |
| `product-variants` | `variants` | — |
| `bundles` | `bundles` | — |
| `rule-engine` | `rule-engine` | `authGuard` + role ADMIN |
| `users` | `users` | `authGuard` + role ADMIN |
| `customer-groups` | `customer-groups` | `authGuard` + role ADMIN |
| `registration-forms` | `registration-forms` | `authGuard` + role ADMIN |
| `orders` | `orders` | — |
| `ai-sync` | `ai-sync` | — |
| `staff` | `staff` | `authGuard` + role ADMIN |
| `banner-manager` | `home-settings` | — |
| `coupons` | `coupons` | `authGuard` + role ADMIN |
| `sale-campaigns` | `sale-campaigns` | — |
| `wallets` | `wallets` | `authGuard` + role ADMIN |
| `advanced-reports` | `advanced-reports` | `authGuard` + role ADMIN |
| `messages` | `messages` | — |
| `reviews` | `reviews` | — |
| `permissions` | `permissions` | `authGuard` + role ADMIN |

Redirect tiện ích: `Administrator` → `admin`, `dashboard` → `admin/dashboard`, v.v.

### 14.3 Một số module admin → API

| Route (child của `/admin`) | Component (lazy) | API chính (qua `api.service.ts`) |
|----------------------------|-------------------|-----------------------------------|
| `products` | `product-list` | `/api/products` |
| `product-variants` | `variant-list` | `/api/product-variants` |
| `bundles` | `bundles` | `/api/bundles` |
| `categories` | `category-list` | `/api/categories` |
| `orders` | `orders` | `/api/orders` |
| `rule-engine` | `rule-engine` | pricing, order limits, hide price, tax, net term, shipping, conflicts — tùy tab |
| `users` | `users` | `/api/users` |
| `customer-groups` | `customer-groups` | `/api/customer-groups` |
| `coupons` | `coupons` | `/api/coupons` |
| `messages` | `messages` | `/api/messages` |
| `home-settings` / banner | `banner-manager` | `/api/home-settings` |
| … | … | (mở rộng theo `api.service.ts`) |

**Rule engine / pricing admin:** `pages/pricing-rules/pricing-rules.ts` — submit → `createPricingRule` / `updatePricingRule` — body gồm `ruleType` (`B2B_PRICE` | `QUANTITY_BREAK`), `priority`, `actionConfig` JSON, targeting KH/SP.

---

## 15. Storefront: routing & trang chính

| Path | Component | Ghi chú |
|------|-----------|--------|
| `''` | `LandingComponent` | Trang đích |
| `storefront` | `StorefrontComponent` | Showcase |
| `shop`, `shop/category/:id` | `ShopComponent` | Danh mục / lọc |
| `product/:id` | `ProductDetailComponent` | PDP đầy đủ pricing + reviews + bundles |
| `bundle/:id` | `BundleDetailComponent` | Combo |
| `cart` | `CartComponent` | Giỏ đầy đủ |
| `checkout` | `CheckoutComponent` | Đặt hàng |
| `login` / `register` | `login` / `register` | Auth |
| `profile` | `ProfileComponent` | guard — đơn hàng, công nợ, đổi MK |
| `quick-order` | `QuickOrderFormComponent` | Đặt nhanh |
| `become-a-partner` | `b2b-register` | Form B2B |
| `support` | `SupportComponent` | Hỗ trợ |
| `**` | redirect `storefront` | |

**Header chung storefront:** `shared/components/storefront-header/` — tìm kiếm, mega menu, **cart drawer**, user dropdown.

---

## 16. Bảng tham chiếu API ↔ file

| Prefix | Controller |
|--------|------------|
| `/api/auth` | `AuthController.java` |
| `/api/users` | `UserController.java` |
| `/api/categories` | `CategoryController.java` |
| `/api/products` | `ProductController.java` |
| `/api/product-variants` | `ProductVariantController.java` |
| `/api/bundles` | `BundleController.java` |
| `/api/orders` | `OrderController.java` |
| `/api/pricing-rules` | `PricingRuleController.java` |
| `/api/order-limits` | `OrderLimitController.java` |
| `/api/hide-price-rules` | `HidePriceRuleController.java` |
| `/api/tax-display-rules` | `TaxDisplayRuleController.java` |
| `/api/shipping-rules` | `ShippingRuleController.java` (có `POST .../quote`) |
| `/api/net-term-rules` | `NetTermRuleController.java` |
| `/api/coupons` | `CouponController.java` |
| `/api/reviews` | `ProductReviewController.java` |
| `/api/messages` | `ChatMessageController.java` |
| `/api/customer-groups` | `CustomerGroupController.java` |
| `/api/roles` | `RoleController.java` |
| `/api/translations` | `TranslationController.java` |
| `/api/home-settings` | `HomeSettingController.java` |
| `/api/b2b-registration-forms` | `B2BRegistrationFormController.java` |
| `/api/reports` | `ReportController.java` |
| `/api/reports/expenses` | `ExpenseController.java` |
| `/api/wallets` | `WalletController.java` |
| `/api/sale-campaigns` | `SaleCampaignController.java` |
| `/api/ai` | `AIChatController.java` |
| `/api/ai-sync` | `AIProductSyncController.java` |
| `/api/rules/conflicts` | `RuleConflictController.java` |
| `/api/attribute-templates` | `AttributeTemplateController.java` |

**Frontend:** mỗi nhóm endpoint được bọc trong **`api.service.ts`** (tìm theo chuỗi `` `/api/...` `` hoặc `` `${this.base}/...` ``).

---

## Phụ lục A — Cây thư mục gợi ý khi đọc code

```
Fashion-B2BWL-/
  src/main/java/com/fashionstore/core/
    FashionB2BwlBackendApplication.java
    config/          → Security, (khác nếu có)
    controller/      → REST
    service/         → Nghiệp vụ
    repository/      → JPA
    model/           → Entity
    dto/request|response/
FE-Fashion-B2BWL/
  src/app/
    app.routes.ts
    app.config.ts
    services/        → api, auth, cart, language
    interceptors/
    guards/
    pages/           → Mỗi route lazy load một folder
    shared/components/
    utils/           → rule-priority, rule-targeting, order-limit-precedence, …
  proxy.conf.json
```

---

## Phụ lục B — Ghi chú vận hành

1. **Luôn gửi `userId` query** khi gọi API sản phẩm nếu user đã đăng nhập — để `ProductMapperService` áp đúng nhóm KH / rule.
2. **Giá trên PDP và giỏ** thống nhất qua `CartService.calculatePrice` (sau khi đã nạp `pricingRules` từ API).
3. **Order limits** được kiểm tra cả client (`CartService`) và server (`OrderService` khi tạo đơn).
4. **Maven / JDK:** backend dùng Java 17 (theo `pom.xml`); cần Maven đủ mới để build.

---

*Tài liệu được tạo để mô tả kiến trúc và luồng tại thời điểm chỉnh sửa trong repo. Khi thêm module mới, nên cập nhật mục 14–16 và bảng `ApiService`.*
