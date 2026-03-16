package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingRule {

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

    @Column(name = "rule_type", nullable = false, length = 50)
    private String ruleType;

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

    @Column(name = "action_config", columnDefinition = "json")
    private String actionConfig;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;
}
