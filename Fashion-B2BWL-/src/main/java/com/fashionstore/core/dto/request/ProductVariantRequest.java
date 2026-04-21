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



    private Integer stockQuantity;
    
    private BigDecimal price;

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
