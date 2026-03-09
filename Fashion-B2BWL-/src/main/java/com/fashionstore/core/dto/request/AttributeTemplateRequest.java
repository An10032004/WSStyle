package com.fashionstore.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttributeTemplateRequest {

    @NotNull(message = "Category ID không được để trống")
    private Integer categoryId;

    @NotBlank(message = "Required attributes không được để trống")
    private String requiredAttributes;
}
