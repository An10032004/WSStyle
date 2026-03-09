package com.fashionstore.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryRequest {

    @NotBlank(message = "Tên danh mục không được để trống")
    private String name;

    /**
     * ID danh mục cha (null = danh mục gốc)
     */
    private Integer parentId;
}
