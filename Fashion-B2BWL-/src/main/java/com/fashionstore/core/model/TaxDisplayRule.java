package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tax_display_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaxDisplayRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId = 1;

    @Builder.Default
    @Column(name = "priority")
    private Integer priority = 0;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String status;

    @Column(name = "tax_display_type", nullable = false, length = 50)
    private String taxDisplayType; // 'VAT', 'GST'

    @Column(name = "display_type", nullable = false, length = 50)
    private String displayType; // 'BOTH_PRICES', 'EXCLUDE_TAX_ONLY', 'INCLUDE_TAX_ONLY'

    @Column(name = "design_config", columnDefinition = "json")
    private String designConfig; // Color, Font size, etc.

    @Column(name = "apply_customer_type")
    private String applyCustomerType;

    @Column(name = "apply_customer_value", columnDefinition = "json")
    private String applyCustomerValue;

    @Column(name = "apply_product_type")
    private String applyProductType;

    @Column(name = "apply_product_value", columnDefinition = "json")
    private String applyProductValue;

    @Column(name = "discount_rate")
    private Double discountRate;
}
