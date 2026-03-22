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

    /**
     * JSON string chứa thuộc tính biến thể, ví dụ: {"size":"M","color":"Đỏ"}
     */
    private String attributes;

    @NotNull(message = "Số lượng tồn kho không được để trống")
    @Min(value = 0, message = "Số lượng tồn kho phải >= 0")
    private Integer stockQuantity;

    /**
     * Giá điều chỉnh so với giá gốc (có thể âm hoặc dương)
     */
    private BigDecimal priceAdjustment;

    private BigDecimal price;
    private BigDecimal discountPrice;

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
}
