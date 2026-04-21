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

    /** null = mặc định false khi tạo; khi cập nhật null = giữ nguyên giá trị cũ. */
    private Boolean isSale;

    /** JSON mảng nhãn 3 chiều (color/size/weight); null khi cập nhật = không đổi cột DB. */
    private String variantDimensionLabels;
}
