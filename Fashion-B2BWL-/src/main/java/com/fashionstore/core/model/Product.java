package com.fashionstore.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId;

    // --- Quan hệ N-1 với Category ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    @JsonIgnore
    private Category category;

    // Read-only mapping to prevent N+1 queries when reading category ID
    @Column(name = "category_id", insertable = false, updatable = false)
    private Integer categoryId;

    @Column(name = "product_code", nullable = false, unique = true)
    private String productCode;

    @Column(nullable = false)
    private String name;

    @Column(name = "base_price", nullable = true, precision = 15, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "image_urls", columnDefinition = "TEXT")
    private String imageUrls;

    @Column(name = "brand")
    private String brand;

    @Column(name = "material")
    private String material;

    @Column(name = "origin")
    private String origin;

    /** Cột bắt buộc trên DB (MySQL strict): phải map và gán mặc định khi tạo sản phẩm. */
    @Column(name = "is_sale", nullable = false)
    @Builder.Default
    private Boolean isSale = false;

    // --- Quan hệ 1-N với ProductVariant ---
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("product")
    @Builder.Default
    private List<ProductVariant> variants = new ArrayList<>();
}
