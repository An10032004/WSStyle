package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shipping_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer priority;

    @Column(nullable = false)
    private String status;

    @Column(name = "base_on", nullable = false, length = 50)
    private String baseOn;

    @Column(name = "rate_ranges", columnDefinition = "json")
    private String rateRanges;

    @Column(name = "apply_customer_type", length = 50)
    private String applyCustomerType = "ALL";

    @Column(name = "apply_customer_value", columnDefinition = "TEXT")
    private String applyCustomerValue;

    @Column(name = "apply_product_type", length = 50)
    private String applyProductType = "ALL";

    @Column(name = "apply_product_value", columnDefinition = "TEXT")
    private String applyProductValue;

    @Column(name = "discount_type", length = 50)
    private String discountType = "FIXED"; // FREE, FLAT, PERCENTAGE

    @Column(name = "discount_value")
    private Double discountValue = 0.0;
}
