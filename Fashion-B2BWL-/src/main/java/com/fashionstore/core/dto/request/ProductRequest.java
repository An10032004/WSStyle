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

    @NotNull(message = "Giá gốc không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá gốc phải lớn hơn 0")
    private BigDecimal basePrice;

    /**
     * JSON string chứa thông số kỹ thuật, ví dụ: {"material":"Cotton","origin":"Vietnam"}
     */
    private String specifications;
}
