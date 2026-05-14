package com.fashionstore.core.model;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("variants")
    private Product product;

    // Read-only mapping to prevent N+1 queries when reading product ID
    @Column(name = "product_id", insertable = false, updatable = false)
    private Integer productId;

    @Column(nullable = false, unique = true)
    private String sku;

    // Removed JSON attributes column as we use specific fields

    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity;

    @Column(name = "price_adjustment", precision = 15, scale = 2)
    private BigDecimal priceAdjustment;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "image_urls", columnDefinition = "TEXT")
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

    /**
     * Tag tìm kiếm / AI — chuỗi do quản trị nhập (vd. comma-separated: {@code áo,nam,giá-rẻ}).
     * Dùng trong LIKE search; không ảnh hưởng giá hay tồn.
     */
    @Column(name = "search_tags", columnDefinition = "TEXT")
    private String searchTags;

    /** Trạng thái sản phẩm cha (JSON, không cột DB) — FE / giỏ hàng biết SKU ngừng theo SP. */
    @JsonProperty("productStatus")
    public String getProductStatus() {
        try {
            Product p = this.product;
            if (p == null) {
                return "ACTIVE";
            }
            String s = p.getStatus();
            if (s == null || s.isBlank()) {
                return "ACTIVE";
            }
            return s.strip().toUpperCase();
        } catch (Exception e) {
            return "ACTIVE";
        }
    }
}
