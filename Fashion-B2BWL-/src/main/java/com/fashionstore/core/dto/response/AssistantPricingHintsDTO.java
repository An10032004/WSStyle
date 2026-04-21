package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Phạm vi sản phẩm/danh mục thuộc rule giá sỉ (QB/B2B) khớp khách — dùng cho trợ lý AI.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantPricingHintsDTO {

    @Builder.Default
    private List<Integer> pricingHintProductIds = new ArrayList<>();

    @Builder.Default
    private List<Integer> pricingHintCategoryIds = new ArrayList<>();
}
