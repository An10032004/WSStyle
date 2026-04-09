package com.fashionstore.core.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRequest {

    @NotNull(message = "Category ID không được để trống")
    private Integer categoryId;

    @NotBlank(message = "Mã sản phẩm không được để trống")
    private String productCode;

    @NotBlank(message = "Tên sản phẩm không được để trống")
    private String name;

    private BigDecimal basePrice;

    private String material;
    private String origin;

    @NotBlank(message = "Thương hiệu không được để trống")
    private String brand;

    private String imageUrl;

    private String imageUrls;
}
