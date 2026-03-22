package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sale_campaigns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaleCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Builder.Default
    @Column(name = "shop_id", nullable = false)
    private Integer shopId = 1;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "banner_url", columnDefinition = "TEXT")
    private String bannerUrl;

    @Column(name = "discount_percentage")
    private Integer discountPercentage;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "priority")
    private Integer priority = 0;

    @Builder.Default
    @Column(name = "status", length = 20)
    private String status = "ACTIVE";

    @Builder.Default
    @Column(name = "apply_product_type", length = 50)
    private String applyProductType = "ALL";

    @Column(name = "apply_product_value", columnDefinition = "TEXT")
    private String applyProductValue;

    @Builder.Default
    @Column(name = "apply_customer_type", length = 50)
    private String applyCustomerType = "ALL";

    @Column(name = "apply_customer_value", columnDefinition = "TEXT")
    private String applyCustomerValue;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (shopId == null) shopId = 1;
        if (isActive == null) isActive = true;
    }
}
