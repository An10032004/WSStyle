package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "subscription_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(name = "monthly_price", precision = 15, scale = 2)
    private BigDecimal monthlyPrice;

    @Column(name = "yearly_price", precision = 15, scale = 2)
    private BigDecimal yearlyPrice;

    @Column(columnDefinition = "json")
    private String features; // JSON: {"max_orders": 1000, "has_quantity_break": true}

    @Column(length = 20)
    private String status; // ACTIVE, INACTIVE
}
