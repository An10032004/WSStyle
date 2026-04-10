package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bundles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bundle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private BundleStatus status = BundleStatus.ACTIVE;

    @Column(name = "discount_value")
    private BigDecimal discountValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 20)
    private DiscountType discountType;

    @Column(name = "old_price")
    private BigDecimal oldPrice;
    
    @Column(name = "new_price")
    private BigDecimal newPrice;
    
    @Column(name = "customer_type")
    private String customerType;

    @OneToMany(mappedBy = "bundle", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BundleItem> items = new ArrayList<>();

    public enum BundleStatus {
        ACTIVE, INACTIVE
    }

    public enum DiscountType {
        PERCENTAGE, FIXED
    }
}
