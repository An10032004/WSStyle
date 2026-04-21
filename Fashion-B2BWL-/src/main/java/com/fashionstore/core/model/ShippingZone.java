package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "shipping_zones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId;

    @Column(nullable = false)
    private String name;

    @Builder.Default
    @Column(nullable = false)
    private Integer priority = 0;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    /**
     * JSON mảng mã tỉnh/thành (theo provinces.open-api.vn), ví dụ: ["79","48"]
     */
    @Column(name = "province_codes", columnDefinition = "TEXT", nullable = false)
    private String provinceCodes;

    @Column(name = "standard_fee", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal standardFee = BigDecimal.ZERO;

    @Column(name = "express_fee", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal expressFee = BigDecimal.ZERO;
}
