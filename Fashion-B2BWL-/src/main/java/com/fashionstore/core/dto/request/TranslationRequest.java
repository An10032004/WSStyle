package com.fashionstore.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TranslationRequest {

    @NotNull(message = "Resource ID is required")
    private Integer resourceId;

    @NotBlank(message = "Resource Type is required")
    private String resourceType; // 'PRODUCT' or 'CATEGORY'

    @NotBlank(message = "Language code is required")
    private String languageCode; // 'en', 'vi', etc.

    @NotBlank(message = "Content JSON string is required")
    private String content; // The actual translations mapped as a JSON string
}
