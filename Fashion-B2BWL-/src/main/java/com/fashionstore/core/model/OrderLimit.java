package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_limits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer priority;

    @Column(nullable = false)
    private String status;

    @Column(name = "limit_level", nullable = false, length = 50)
    private String limitLevel;

    @Column(name = "limit_type", nullable = false, length = 50)
    private String limitType;

    @Column(name = "apply_customer_type")
    private String applyCustomerType;

    @Column(name = "apply_customer_value", columnDefinition = "json")
    private String applyCustomerValue;

    @Column(name = "exclude_customer_option")
    private String excludeCustomerOption;

    @Column(name = "exclude_customer_value", columnDefinition = "json")
    private String excludeCustomerValue;

    @Column(name = "apply_product_type")
    private String applyProductType;

    @Column(name = "apply_product_value", columnDefinition = "json")
    private String applyProductValue;

    @Column(name = "exclude_product_option")
    private String excludeProductOption;

    @Column(name = "exclude_product_value", columnDefinition = "json")
    private String excludeProductValue;

    @Column(name = "limit_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal limitValue;
}
