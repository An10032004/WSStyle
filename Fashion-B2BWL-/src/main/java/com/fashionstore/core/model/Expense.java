package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private ExpenseCategory category;

    private BigDecimal amount;

    private LocalDateTime date;

    private String description;

    @Column(name = "shop_id")
    private Long shopId;

    public enum ExpenseCategory {
        INVENTORY, SHIPPING, MARKETING, SALARY, OPERATIONS, OTHER
    }
}
