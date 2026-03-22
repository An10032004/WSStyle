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
