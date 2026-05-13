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

    /**
     * Khách có ít nhất một rule QUANTITY_BREAK/B2B_PRICE ACTIVE khớp nhóm khách và {@code applyProductType = ALL}.
     * Không đẩy toàn kho vào hint id — chỉ để AI/storefront mô tả phạm vi.
     */
    private boolean wholesaleCoversAllProducts;

    /**
     * Tên danh mục (kèm id) từ mọi rule GROUP/CATEGORY khớp khách — thứ tự ổn định theo id danh mục.
     */
    @Builder.Default
    private List<String> wholesaleMatchedGroupCategoryLabels = new ArrayList<>();
}
