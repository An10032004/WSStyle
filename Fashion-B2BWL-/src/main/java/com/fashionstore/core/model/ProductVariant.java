package com.fashionstore.core.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "product_variants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId;

    // --- Quan hệ N-1 với Product ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Product product;

    @JsonProperty("productId")
    public Integer getProductId() {
        return product != null ? product.getId() : null;
    }

    @Column(nullable = false, unique = true)
    private String sku;

    // Lưu JSON string, ví dụ: {"size":"M","color":"Đỏ"}
    @Column(columnDefinition = "json")
    private String attributes;

    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity;

    @Column(name = "price_adjustment", precision = 15, scale = 2)
    private BigDecimal priceAdjustment;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "image_urls", columnDefinition = "json")
    private String imageUrls;

    @Column(name = "color")
    private String color;

    @Column(name = "size")
    private String size;

    @Column(name = "weight")
    private String weight;

    @Column(name = "length")
    private BigDecimal length;

    @Column(name = "width")
    private BigDecimal width;

    @Column(name = "height")
    private BigDecimal height;

    @Column(name = "cost_price", precision = 15, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "price", precision = 15, scale = 2)
    private BigDecimal price;

    @Column(name = "discount_price", precision = 15, scale = 2)
    private BigDecimal discountPrice;

    @Column(name = "status")
    private String status; // ACTIVE, INACTIVE

    @Column(name = "barcode")
    private String barcode;
}
