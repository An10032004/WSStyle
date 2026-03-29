package com.fashionstore.core.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponseDTO {
    private Integer id;
    private Integer categoryId;
    private String productCode;
    private String name;
    private BigDecimal basePrice;
    private BigDecimal calculatedPrice;
    private String discountLabel;
    private String imageUrl;
    private String imageUrls;
    private String brand;
    private String material;
    private String origin;
    
    // Rule results
    private Boolean hidePrice;
    private Boolean hideAddToCart;
    private String replacementText;
    
    // Tax Info
    private String taxDisplayType;
    private String taxDisplayLabel;
    
    // Campaign Info
    private String campaignBanner;
    private String campaignName;

    // Bulk Info
    private String quantityBreaksJson;
}
