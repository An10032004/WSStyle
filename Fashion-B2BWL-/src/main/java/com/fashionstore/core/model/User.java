package com.fashionstore.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    @JsonIgnore
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;

    private String phone;

    @Column(length = 20)
    private String role; // ADMIN, STAFF, RETAIL, WHOLESALE, GUEST

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_group_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private CustomerGroup customerGroup;

    @Column(columnDefinition = "JSON")
    private String tags;

    @Column(name = "registration_status", length = 20)
    private String registrationStatus; // PENDING, APPROVED, REJECTED

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "tax_code")
    private String taxCode;

    /**
     * Giữ khớp với cột {@code active} đã tồn tại trên MySQL (NOT NULL). Nếu thiếu field này sau khi revert code,
     * Hibernate chèn NULL → lỗi "Column 'active' cannot be null" khi đăng ký / tạo user.
     */
    @Builder.Default
    @Column(name = "active", nullable = false)
    private boolean active = true;

    /** Ngừng hoạt động theo nghiệp vụ (admin). Đăng nhập bị chặn khi {@code SUSPENDED} cùng với {@code active} / xóa mềm. */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "account_status", length = 20)
    private AccountStatus accountStatus = AccountStatus.ACTIVE;

    /** Xóa mềm: có giá trị thì tài khoản coi như đã xóa, không đăng nhập được. */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    /**
     * Địa chỉ giao hàng mặc định (JSON): mã & tên tỉnh/quận/phường, chi tiết số nhà… — dùng cho checkout.
     */
    @Column(name = "shipping_address_json", columnDefinition = "TEXT")
    private String shippingAddressJson;

    /** Được phép đăng nhập storefront / refresh token. */
    public boolean isLoginAllowed() {
        return deletedAt == null
                && active
                && accountStatus != AccountStatus.SUSPENDED;
    }

    /** Còn hiển thị trong danh sách quản trị (chưa xóa mềm). */
    public boolean isNotSoftDeleted() {
        return deletedAt == null;
    }
}
