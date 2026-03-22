package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "customer_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId;

    @Column(nullable = false)
    private String name;

    @Column(name = "default_discount_rate", precision = 5, scale = 2)
    private BigDecimal defaultDiscountRate;
}
