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
    /** Phiên lưu DB (lịch sử); FE gửi lại ở lần chat tiếp theo. */
    private Long sessionId;

    public AIResponse(String message, List<ProductResponseDTO> products) {
        this.message = message;
        this.products = products != null ? products : Collections.emptyList();
        this.sessionId = null;
    }

    public AIResponse(String message, List<ProductResponseDTO> products, Long sessionId) {
        this.message = message;
        this.products = products != null ? products : Collections.emptyList();
        this.sessionId = sessionId;
    }
}
