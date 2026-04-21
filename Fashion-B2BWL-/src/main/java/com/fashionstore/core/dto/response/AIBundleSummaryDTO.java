package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Combo/bundle gợi ý kèm trả lời AI (storefront). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIBundleSummaryDTO {
    private Long id;
    private String name;
    private BigDecimal newPrice;
    private BigDecimal oldPrice;
    private String imageUrl;
}
