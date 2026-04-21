package com.fashionstore.core.dto.response;

import java.util.Collections;
import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class AIResponse {
    private String message;
    /** Giá đã áp rule engine + thuế hiển thị (cùng logic trang shop) khi gửi kèm userId. */
    private List<ProductResponseDTO> products;
    /** Combo/bundle ACTIVE gợi ý kèm (tên + giá + link /bundle/:id trên FE). */
    private List<AIBundleSummaryDTO> bundles;
    /** Phiên lưu DB (lịch sử); FE gửi lại ở lần chat tiếp theo. */
    private Long sessionId;

    public AIResponse(String message, List<ProductResponseDTO> products) {
        this(message, products, Collections.emptyList(), null);
    }

    public AIResponse(String message, List<ProductResponseDTO> products, Long sessionId) {
        this(message, products, Collections.emptyList(), sessionId);
    }

    /** product_search: kèm combo/bundle gợi ý (sessionId gán sau ở controller nếu có). */
    public AIResponse(String message, List<ProductResponseDTO> products, List<AIBundleSummaryDTO> bundles) {
        this(message, products, bundles, null);
    }

    public AIResponse(
            String message,
            List<ProductResponseDTO> products,
            List<AIBundleSummaryDTO> bundles,
            Long sessionId) {
        this.message = message;
        this.products = products != null ? products : Collections.emptyList();
        this.bundles = bundles != null ? bundles : Collections.emptyList();
        this.sessionId = sessionId;
    }
}
