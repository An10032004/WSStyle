package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "inventory_inflow_receipt_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryInflowReceiptLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receipt_id", nullable = false)
    private InventoryInflowReceipt receipt;

    @Column(nullable = false)
    private Integer variantId;

    @Column(nullable = false)
    private Integer quantity;

    @Column(precision = 19, scale = 4)
    private BigDecimal costPrice;
}
