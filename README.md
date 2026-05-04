# WSStyle - Fashion B2BWL Platform

[![Backend - Spring Boot](https://img.shields.io/badge/Backend-Spring%20Boot%204.0.3-brightgreen?style=for-the-badge&logo=springboot)](./Fashion-B2BWL-)
[![Frontend - Angular 21](https://img.shields.io/badge/Frontend-Angular%2021-red?style=for-the-badge&logo=angular)](./FE-Fashion-B2BWL)
[![Database - MySQL](https://img.shields.io/badge/Database-MySQL%208.0-blue?style=for-the-badge&logo=mysql)](https://www.mysql.com/)
[![UI Framework - Taiga UI](https://img.shields.io/badge/UI-Taiga%20UI-orange?style=for-the-badge&logo=angular)](https://taiga-ui.dev/)

**WSStyle (Fashion-B2BWL)** là một hệ sinh thái quản lý thương mại điện tử B2B (Business-to-Business) toàn diện. Được thiết kế dành riêng cho ngành thời trang, nền tảng này cung cấp các công cụ mạnh mẽ để quản lý đại lý, quy tắc giá phức tạp và đồng bộ dữ liệu thông minh qua AI.

---

## Kiến Trúc Hệ Thống (Architecture)

Dự án được xây dựng theo mô hình **Client-Server Separation**:

1.  **Backend (Fashion-B2BWL-):** Đóng vai trò là Core Engine, cung cấp RESTful APIs bảo mật cao, xử lý logic Rule Engine và tích hợp AI.
2.  **Frontend (FE-Fashion-B2BWL):** Dashboard quản trị hiện đại, tập trung vào trải nghiệm người dùng (UX) và khả năng xử lý dữ liệu lớn (Big Data Rendering).

---

## Stack Công Nghệ Chi Tiết

### Backend
*   **Java 17 & Spring Boot 4.0.3**: Nền tảng lõi vững chắc và hiệu năng.
*   **Spring Security & JWT**: Cơ chế bảo mật Stateless, phân quyền theo vai trò (Admin, Staff, Customer).
*   **JPA / Hibernate**: Quản lý quan hệ thực thể dữ liệu mạnh mẽ.
*   **Redis**: Tăng tốc độ hệ thống thông qua Caching và quản lý phiên làm việc.
*   **MySQL**: Lưu trữ dữ liệu quan hệ ổn định.
*   **Lombok**: Tối ưu hóa mã nguồn Java (Clean code).

### Frontend
*   **Angular 21**: Framework Frontend mới nhất, hỗ trợ Standalone Components và tối ưu hóa Bundle size.
*   **Taiga UI**: Hệ thống thư viện giao diện (UI Kit) đẳng cấp, đảm bảo tính thẩm mỹ và đồng nhất.
*   **AG Grid**: Thư viện bảng dữ liệu mạnh mẽ nhất thế giới, dùng cho quản lý danh sách sản phẩm và đơn hàng.
*   **Transloco**: Hỗ trợ đa ngôn ngữ (Tiếng Việt & Tiếng Anh) hoàn hảo.
*   **RxJS**: Xử lý luồng dữ liệu bất đồng bộ mượt mà.

---

## Các Chức Năng Chính

### 1. Quản lý Quy tắc (Rule Engine)
Đây là "trái tim" của hệ thống B2B:
*   **Pricing Rules**: Tự động áp dụng giá bán buôn dựa trên số lượng mua hoặc cấp bậc đại lý.
*   **Tax & Shipping Rules**: Cấu hình quy tắc thuế (VAT) và phí vận chuyển theo vùng địa lý hoặc loại sản phẩm.
*   **Hide Price Logic**: Bảo vệ quyền lợi đại lý bằng cách ẩn giá công khai với khách vãng lai.

### 2. Đồng bộ & Báo cáo AI (AI Sync & Intelligence)
*   **AI Sync**: Tự động hóa việc cập nhật dữ liệu từ các nguồn cung ứng hoặc xu hướng thị trường.
*   **Advanced Reports**: Cung cấp cái nhìn sâu sắc về doanh số, tồn kho và hiệu quả của các chiến dịch Sale thông qua dashboard trực quan.

### 3. Quản trị Đối tác & Nhân sự
*   **B2B Partner Registration**: Quy trình phê duyệt đối tác mới chuyên nghiệp (Become a partner).
*   **Customer Groups**: Phân loại khách hàng để áp dụng các chính sách ưu đãi riêng biệt.
*   **Permission Management**: Phân quyền chi tiết đến từng Module cho nhân viên (Staff).

### 4. Vận hành Thương mại
*   **Variant Management**: Quản lý hàng ngàn SKU với đa dạng thuộc tính (Size, Color, Material).
*   **Coupon & Sale Campaigns**: Tạo mã giảm giá và các đợt khuyến mãi định kỳ.
*   **Order Limits**: Thiết lập giới hạn đặt hàng tối thiểu/tối đa cho từng loại khách hàng.

---

---

## Mô hình Dữ liệu & Thực thể (Database Schema & Entity Model)

Hệ thống được thiết kế với cấu trúc dữ liệu quan hệ chặt chẽ cho các thực thể cốt lõi, kết hợp với mô hình linh hoạt cho lõi quy tắc (Rule Engine).

### 1. Nhóm Hệ thống & Người dùng

#### Chi tiết bảng app_roles (Vai trò & Phân quyền)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã vai trò (Khóa chính) |
| **name** | varchar(50) | Tên vai trò (ADMIN, STAFF, v.v.) |
| **description** | varchar(255) | Mô tả chi tiết vai trò |
| **is_admin** | tinyint(1) | Đánh dấu quyền quản trị tối cao |
| **permissions_json**| json | Danh sách các quyền chi tiết dưới dạng JSON |
| **created_at** | datetime(6) | Thời gian khởi tạo vai trò |

#### Chi tiết bảng customer_groups (Nhóm khách hàng)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã nhóm khách hàng (Khóa chính) |
| **shop_id** | int | Mã chi nhánh (Tenant ID) |
| **name** | varchar(255) | Tên nhóm khách hàng |
| **default_discount_rate** | decimal(5,2) | Tỷ lệ chiết khấu mặc định cho nhóm |

#### Chi tiết bảng users (Tài khoản người dùng)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã người dùng (Khóa chính) |
| **shop_id** | int | Mã chi nhánh/tenant |
| **email** | varchar(255) | Địa chỉ email (Dùng đăng nhập) |
| **password_hash** | varchar(255) | Mật khẩu đã được mã hóa |
| **full_name** | varchar(255) | Họ và tên đầy đủ |
| **phone** | varchar(20) | Số điện thoại liên lạc |
| **role** | varchar(20) | Vai trò gán trực tiếp (RETAIL, WHOLESALE...) |
| **customer_group_id**| int | Liên kết nhóm khách hàng (FK) |
| **tags** | json | Gắn thẻ phân loại người dùng |
| **registration_status**| varchar(20) | Trạng thái đăng ký (PENDING, APPROVED...) |
| **company_name** | varchar(255) | Tên công ty/đại lý |
| **tax_code** | varchar(64) | Mã số thuế doanh nghiệp |
| **active** | tinyint(1) | Trạng thái kích hoạt (1: active, 0: inactive) |
| **account_status** | varchar(20) | Trạng thái tài khoản (ACTIVE, SUSPENDED) |
| **deleted_at** | datetime(6) | Thời gian xóa mềm |
| **shipping_address_json**| text | Địa chỉ giao hàng mặc định (JSON) |

#### Chi tiết bảng password_reset_tokens (Mã khôi phục mật khẩu)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | bigint | Mã token (Khóa chính) |
| **user_id** | int | Mã người dùng yêu cầu (FK) |
| **token** | varchar(128) | Chuỗi token bảo mật (Unique) |
| **expires_at** | datetime(6) | Thời gian hết hạn của token |
| **used_at** | datetime(6) | Thời gian token được sử dụng |

#### Chi tiết bảng b2b_registration_forms (Đơn đăng ký đối tác)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã đơn đăng ký (Khóa chính) |
| **shop_id** | int | Mã chi nhánh |
| **user_id** | int | Mã người dùng đăng ký (FK) |
| **form_data** | text | Dữ liệu chi tiết đơn đăng ký (JSON/TEXT) |

---

### 2. Nhóm Sản phẩm & Thương mại

#### Chi tiết bảng categories (Danh mục sản phẩm)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã danh mục (Khóa chính) |
| **shop_id** | int | Mã chi nhánh |
| **parent_id** | int | Mã danh mục cha (Tự tham chiếu) |
| **name** | varchar(255) | Tên danh mục |

#### Chi tiết bảng products (Sản phẩm)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã sản phẩm (Khóa chính) |
| **shop_id** | int | Mã chi nhánh |
| **category_id** | int | Mã danh mục sản phẩm (FK) |
| **product_code** | varchar(128) | Mã sản phẩm (Unique) |
| **name** | varchar(512) | Tên sản phẩm |
| **base_price** | decimal(15,2) | Giá bán lẻ cơ sở |
| **image_url** | varchar(1024) | Ảnh đại diện chính |
| **brand** | varchar(255) | Thương hiệu sản phẩm |
| **is_sale** | tinyint(1) | Đánh dấu sản phẩm đang giảm giá |
| **variant_dimension_labels**| text | Nhãn cho các chiều biến thể (JSON) |

#### Chi tiết bảng product_variants (Biến thể sản phẩm)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã biến thể (Khóa chính) |
| **product_id** | int | Mã sản phẩm cha (FK) |
| **sku** | varchar(128) | Mã kho hàng (Unique) |
| **stock_quantity** | int | Số lượng tồn kho hiện tại |
| **price** | decimal(15,2) | Giá bán cụ thể cho biến thể |
| **color** | varchar(128) | Thuộc tính màu sắc |
| **size** | varchar(128) | Thuộc tính kích thước |
| **weight** | varchar(64) | Thuộc tính cân nặng |
| **status** | varchar(32) | Trạng thái (ACTIVE, INACTIVE) |

#### Chi tiết bảng bundles (Gói sản phẩm)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | bigint | Mã gói combo (Khóa chính) |
| **name** | varchar(255) | Tên gói combo |
| **status** | varchar(20) | Trạng thái gói |
| **discount_type** | varchar(20) | Loại giảm giá (PERCENTAGE, FIXED) |
| **discount_value** | decimal(15,2) | Giá trị giảm giá |
| **new_price** | decimal(15,2) | Giá sau cùng của gói |

#### Chi tiết bảng bundle_items (Sản phẩm trong gói)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | bigint | Mã bản ghi chi tiết (Khóa chính) |
| **bundle_id** | bigint | Liên kết tới gói combo (FK) |
| **variant_id** | bigint | Liên kết tới biến thể sản phẩm (FK) |
| **quantity** | int | Số lượng của biến thể trong gói |

#### Chi tiết bảng coupons (Mã giảm giá)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã coupon (Khóa chính) |
| **shop_id** | int | Mã chi nhánh |
| **code** | varchar(255) | Mã giảm giá (Unique) |
| **discount_type** | varchar(32) | Loại giảm (FIXED_AMOUNT, PERCENTAGE) |
| **discount_value** | decimal(15,2) | Giá trị giảm giá |
| **start_date** | datetime(6) | Ngày bắt đầu hiệu lực |
| **end_date** | datetime(6) | Ngày hết hạn |
| **used_count** | int | Số lần mã đã được sử dụng |
| **status** | varchar(20) | Trạng thái (ACTIVE, EXPIRED, DISABLED) |

#### Chi tiết bảng product_reviews (Đánh giá sản phẩm)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã đánh giá (Khóa chính) |
| **product_id** | int | Mã sản phẩm được đánh giá |
| **user_id** | int | Mã người dùng đánh giá |
| **rating** | int | Điểm đánh giá (1-5 sao) |
| **comment** | text | Nội dung nhận xét |
| **reply_message** | text | Phản hồi từ quản trị viên |
| **is_pinned** | tinyint(1) | Đánh dấu đánh giá nổi bật |

#### Chi tiết bảng ai_product_sync (Đồng bộ dữ liệu AI)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã bản ghi (Khóa chính) |
| **product_id** | int | Mã sản phẩm đồng bộ (FK) |
| **content** | text | Nội dung dữ liệu đã xử lý để AI học |
| **vector_id** | varchar(255) | ID của vector trong cơ sở dữ liệu Vector |
| **last_synced_at** | datetime(6) | Thời gian đồng bộ cuối cùng |

---

### 3. Hệ thống Quy tắc (Flexible Rule Engine)

#### Chi tiết bảng pricing_rules (Quy tắc giá)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã quy tắc (Khóa chính) |
| **name** | varchar(255) | Tên quy tắc giá |
| **priority** | int | Độ ưu tiên áp dụng |
| **status** | varchar(32) | Trạng thái (ACTIVE, DISABLED) |
| **rule_type** | varchar(50) | Loại quy tắc (QUANTITY, B2B...) |
| **discount_value** | decimal(15,2) | Giá trị giảm |
| **discount_type** | varchar(32) | Cách giảm (PERCENT, FIXED, OVERRIDE) |
| **apply_customer_type**| varchar(64) | Đối tượng khách (GROUP, TAG, ID...) |
| **apply_product_type** | varchar(64) | Đối tượng sản phẩm (CAT, TAG, ID...) |

#### Chi tiết bảng order_limits (Giới hạn đơn hàng)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã giới hạn (Khóa chính) |
| **name** | varchar(255) | Tên quy tắc giới hạn |
| **limit_level** | varchar(50) | Cấp độ (ORDER, LINE_ITEM) |
| **limit_type** | varchar(50) | Loại giới hạn (MIN_QUANTITY, MIN_AMOUNT...) |
| **limit_value** | decimal(15,2) | Giá trị giới hạn |

#### Chi tiết bảng hide_price_rules (Quy tắc ẩn giá)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã quy tắc (Khóa chính) |
| **hide_price** | tinyint(1) | Ẩn giá bán sản phẩm |
| **hide_add_to_cart** | tinyint(1) | Ẩn nút thêm vào giỏ hàng |
| **replacement_text** | varchar(512) | Văn bản hiển thị thay thế giá |

#### Chi tiết bảng tax_display_rules (Quy tắc hiển thị thuế)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã quy tắc (Khóa chính) |
| **tax_display_type** | varchar(50) | Loại thuế (VAT, GST) |
| **display_type** | varchar(50) | Cách hiển thị (Gồm thuế/Chưa thuế) |
| **design_config** | json | Cấu hình màu sắc, font chữ hiển thị |

#### Chi tiết bảng shipping_rules (Quy tắc vận chuyển)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã quy tắc (Khóa chính) |
| **base_on** | varchar(50) | Tính dựa trên (WEIGHT, PRICE, QUANTITY) |
| **rate_ranges** | text | Cấu hình các khoảng giá cước |
| **discount_type** | varchar(50) | Loại ưu đãi ship (FREE, FLAT, PERCENT) |

#### Chi tiết bảng net_terms_rules (Quy tắc trả sau)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã quy tắc (Khóa chính) |
| **name** | varchar(255) | Tên quy tắc (ví dụ: Net 30 cho VIP) |
| **net_term_days** | int | Số ngày được phép nợ |
| **condition_type** | varchar(50) | Điều kiện áp dụng |

#### Chi tiết bảng shipping_zones (Vùng vận chuyển)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã vùng (Khóa chính) |
| **name** | varchar(255) | Tên vùng (Nội thành, Ngoại tỉnh...) |
| **province_codes** | text | Danh sách mã tỉnh/thành thuộc vùng (JSON) |
| **standard_fee** | decimal(15,2) | Phí giao hàng tiêu chuẩn |
| **express_fee** | decimal(15,2) | Phí giao hàng hỏa tốc |

---

### 4. Giao dịch & Hội thoại

#### Chi tiết bảng orders (Đơn hàng)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã đơn hàng (Khóa chính) |
| **user_id** | int | Mã khách hàng đặt hàng (FK) |
| **status** | varchar(50) | Trạng thái đơn (PENDING, PROCESSING...) |
| **payment_method** | varchar(50) | Phương thức (COD, VNPAY, NET_TERMS) |
| **total_amount** | decimal(15,2) | Tổng giá trị đơn hàng |
| **shipping_fee** | decimal(15,2) | Phí vận chuyển |
| **tax_amount** | decimal(15,2) | Tiền thuế |
| **paid_amount** | decimal(15,2) | Số tiền đã thanh toán |
| **debt_amount** | decimal(15,2) | Số tiền còn nợ |
| **created_at** | datetime(6) | Ngày khởi tạo đơn hàng |

#### Chi tiết bảng order_items (Chi tiết dòng hàng)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã dòng hàng (Khóa chính) |
| **order_id** | int | Liên kết đơn hàng (FK) |
| **variant_id** | int | Liên kết biến thể sản phẩm (FK) |
| **quantity** | int | Số lượng mua |
| **unit_price** | decimal(15,2) | Giá bán chốt tại thời điểm đặt |
| **pricing_note** | text | Ghi chú về cách tính giá |

#### Chi tiết bảng chat_messages (Tin nhắn hỗ trợ)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | int | Mã tin nhắn (Khóa chính) |
| **sender_id** | int | Mã người gửi |
| **receiver_id** | int | Mã người nhận |
| **message** | text | Nội dung tin nhắn |
| **is_read** | tinyint(1) | Trạng thái đã đọc (1: rồi, 0: chưa) |
| **created_at** | datetime(6) | Thời gian gửi tin |

#### Chi tiết bảng luxe_assistant_sessions (Phiên tư vấn AI)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | bigint | Mã phiên (Khóa chính) |
| **user_id** | int | Mã người dùng tham gia tư vấn |
| **title** | varchar(220) | Tiêu đề tóm tắt phiên tư vấn |
| **created_at** | datetime(6) | Thời gian bắt đầu phiên |

#### Chi tiết bảng luxe_assistant_turns (Lượt hội thoại AI)
| Tên trường | Kiểu dữ liệu | Ghi chú |
| :--- | :--- | :--- |
| **id** | bigint | Mã lượt chat (Khóa chính) |
| **session_id** | bigint | Liên kết phiên tư vấn (FK) |
| **role** | varchar(20) | Vai trò (USER hoặc ASSISTANT) |
| **content** | text | Nội dung tin nhắn |
| **product_ids_json**| text | Danh sách sản phẩm được AI gợi ý (JSON) |

---

**Tại sao không có Khóa ngoại (FK) cho một số bảng?**

Trong hệ thống này, một số quan hệ không được nối cứng bằng FK trong Database vì các lý do tối ưu và nghiệp vụ sau:

1. **Hệ thống Quy tắc (Rules)**:
    - **Phạm vi đa dạng (Scope)**: Một quy tắc có thể áp dụng cho **Toàn bộ** danh mục, một **Nhóm** khách hàng, hoặc một danh sách các **ID cụ thể**.
    - **Lưu trữ linh hoạt**: Các tiêu chí áp dụng được lưu dưới dạng **JSON hoặc Text** thay vì bảng trung gian.
    - **Rule Engine xử lý**: Logic khớp quy tắc (Matching) được thực hiện bởi **Core Engine (Java)** tại Runtime để đảm bảo tính linh hoạt tối đa.

2. **Vai trò người dùng (app_roles)**:
    - **Tối ưu hiệu năng**: Bảng `users` lưu vai trò dưới dạng **String** (ví dụ: "ADMIN", "STAFF") thay vì lưu ID. Điều này giúp hệ thống kiểm tra quyền cực nhanh (Stateless) mà không cần JOIN SQL mỗi lần xác thực người dùng.

3. **Mã giảm giá (coupons)**:
    - **Lưu vết lịch sử (Audit Trail)**: Đơn hàng (`orders`) lưu mã giảm giá bằng **chữ** (`coupon_code`). Điều này đảm bảo khi một mã Coupon bị xóa hoặc thay đổi trong tương lai, dữ liệu đơn hàng cũ vẫn hiển thị chính xác mã mà khách đã sử dụng tại thời điểm đặt hàng.

---

## Cấu Trúc Mã Nguồn

```text
D:\WSStyle
├── Fashion-B2BWL-           # Java Spring Boot Backend
│   ├── src/main/java/com/fashionstore/  # Controller, Service, Repository, Entity
│   ├── src/main/resources/              # application.properties, SQL scripts
│   └── pom.xml                          # Maven Configuration
└── FE-Fashion-B2BWL        # Angular Frontend
    ├── src/app/pages/                   # Business Modules (Dashboard, Rule, Users...)
    ├── src/app/services/                # API communication logic
    ├── src/app/shared/                  # Reusable components & utilities
    ├── package.json                     # Frontend dependencies
    └── angular.json                     # Angular CLI config
```

---

## Hướng Dẫn Chạy Dự Án

### Backend
1. Đảm bảo đã cài đặt Java 17+ và MySQL.
2. Cấu hình Database trong `Fashion-B2BWL-/src/main/resources/application.properties`.
3. Chạy lệnh:
   ```bash
   mvn clean spring-boot:run
   ```

### Frontend
1. Cài đặt Node.js 20+.
2. Di chuyển vào thư mục: `cd FE-Fashion-B2BWL`.
3. Cài đặt thư viện: `npm install`.
4. Chạy ứng dụng: `npm start`.
5. Truy cập: `http://localhost:4000`.

---

## Tầm Nhìn
**WSStyle** hướng tới việc trở thành giải pháp White-label hàng đầu cho các doanh nghiệp thời trang muốn chuyển đổi số quy trình bán buôn, mang lại sự minh bạch, tốc độ và hiệu quả tối đa.

---
*© 2026 WSStyle Project - Professional Fashion Management.*
