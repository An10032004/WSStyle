package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "net_terms_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NetTermRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer priority;

    @Column(nullable = false)
    private String status;

    @Column(name = "apply_customer_type")
    private String applyCustomerType;

    @Column(name = "apply_customer_value", columnDefinition = "json")
    private String applyCustomerValue;

    @Column(name = "condition_type", length = 50)
    private String conditionType;

    @Column(name = "net_term_days", nullable = false)
    private Integer netTermDays;
}
