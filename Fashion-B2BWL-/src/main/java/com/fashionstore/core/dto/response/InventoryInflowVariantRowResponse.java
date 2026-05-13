package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Cột tối thiểu cho màn nhập kho — tránh tải toàn bộ entity ProductVariant. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryInflowVariantRowResponse {
    private Integer id;
    private String sku;
    private Integer stockQuantity;
    private BigDecimal costPrice;
    private String imageUrl;
    private String color;
    private String size;
}
