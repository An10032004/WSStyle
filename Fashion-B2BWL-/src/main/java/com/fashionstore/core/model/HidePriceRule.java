package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "hide_price_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HidePriceRule {

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

    @Column(name = "hide_price")
    private Boolean hidePrice;

    @Column(name = "hide_add_to_cart")
    private Boolean hideAddToCart;

    @Column(name = "replacement_text")
    private String replacementText;

    @Column(name = "apply_customer_type")
    private String applyCustomerType;

    @Column(name = "apply_customer_value", columnDefinition = "json")
    private String applyCustomerValue;

    @Column(name = "apply_product_type")
    private String applyProductType;

    @Column(name = "apply_product_value", columnDefinition = "json")
    private String applyProductValue;
}
