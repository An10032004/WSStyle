package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id", nullable = false)
    private Integer shopId = 1;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(name = "discount_type", nullable = false)
    private String discountType; // FIXED_AMOUNT, PERCENTAGE

    @Column(name = "discount_value", precision = 15, scale = 2, nullable = false)
    private BigDecimal discountValue;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(name = "used_count")
    private Integer usedCount = 0;

    @Column(length = 20)
    private String status; // ACTIVE, EXPIRED, DISABLED

    @Column(name = "apply_product_type", length = 50)
    private String applyProductType = "ALL";

    @Column(name = "apply_product_value", columnDefinition = "TEXT")
    private String applyProductValue;

    @Column(name = "apply_customer_type", length = 50)
    private String applyCustomerType = "ALL";

    @Column(name = "apply_customer_value", columnDefinition = "TEXT")
    private String applyCustomerValue;

    @Column(name = "priority")
    private Integer priority = 99;

    /**
     * Số đơn hàng tối thiểu khách đã mua (không tính CANCELLED/REJECTED) để thấy/áp dụng mã.
     * 0 = không yêu cầu (mọi khách đăng nhập đủ điều kiện khác vẫn thấy mã).
     */
    @Column(name = "minimum_prior_orders")
    private Integer minimumPriorOrders = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (shopId == null) shopId = 1;
        if (usedCount == null) usedCount = 0;
        if (status == null) status = "ACTIVE";
        if (minimumPriorOrders == null) {
            minimumPriorOrders = 0;
        }
    }
}
