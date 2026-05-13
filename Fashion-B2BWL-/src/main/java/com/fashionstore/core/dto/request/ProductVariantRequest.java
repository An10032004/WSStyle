package com.fashionstore.core.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariantRequest {

    @NotNull(message = "Product ID không được để trống")
    private Integer productId;

    @NotBlank(message = "SKU không được để trống")
    private String sku;

    @NotNull(message = "Giá không được để trống")
    @DecimalMin(value = "0.01", message = "Giá không hợp lệ")
    private BigDecimal price;

    private Integer stockQuantity;

    private String imageUrl;
    private String imageUrls;

    private String color;
    private String size;
    private String weight;

    private BigDecimal length;
    private BigDecimal width;
    private BigDecimal height;
    private BigDecimal costPrice;
    private String status;
    private String barcode;

    /** Tag tìm kiếm / AI (tùy chọn). */
    private String searchTags;

    /**
     * Khi {@code true}, cập nhật cột {@code search_tags} theo {@link #searchTags} (chuỗi rỗng = xóa tag).
     * Khi {@code null/false}, giữ nguyên tag hiện có trên DB (PUT từ form cũ không làm mất tag).
     */
    private Boolean applySearchTagsPatch;
}
