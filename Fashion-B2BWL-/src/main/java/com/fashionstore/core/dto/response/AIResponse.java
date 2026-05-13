package com.fashionstore.core.dto.response;

import java.util.Collections;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
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

    /**
     * Ghi chú kỹ thuật (markdown) cho lượt product_search: biên độ VND trích từ câu, bộ lọc giá, sort DB,
     * thứ tự xếp hạng sau truy vấn — giúp model/người dùng hiểu pipeline mà không đổi thuật toán.
     */
    private String pipelineNotes;

    /**
     * Giới thiệu ngắn (plain text) khi khách hỏi giá sỉ: luôn gửi nếu có ý định sỉ và có kết quả SP — kể cả khi
     * không SP nào có bằng chứng sỉ trên thẻ (khi đó {@link #wholesaleProductLinks} rỗng).
     */
    private String wholesaleLinkIntro;

    /**
     * Chỉ các SP có bằng chứng giá sỉ / bậc SL trên thẻ (quantityBreaksJson, nhãn ưu đãi sỉ, hoặc giá sau rule thấp hơn giá niêm).
     */
    private List<AssistantWholesaleProductLinkDTO> wholesaleProductLinks;

    /**
     * Tóm tắt debug: rule QUANTITY_BREAK/B2B khớp khách + hint id (để FE console.log — không dùng làm copy UI).
     * Luôn serialize JSON (kể cả null) để dễ thấy BE có field hay chưa.
     */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private String assistantPricingToolSummary;

    public AIResponse(String message, List<ProductResponseDTO> products) {
        this(message, products, Collections.emptyList(), null, null, null, Collections.emptyList(), null);
    }

    public AIResponse(String message, List<ProductResponseDTO> products, Long sessionId) {
        this(message, products, Collections.emptyList(), sessionId, null, null, Collections.emptyList(), null);
    }

    /** product_search: kèm combo/bundle gợi ý (sessionId gán sau ở controller nếu có). */
    public AIResponse(String message, List<ProductResponseDTO> products, List<AIBundleSummaryDTO> bundles) {
        this(message, products, bundles, null, null, null, Collections.emptyList(), null);
    }

    public AIResponse(
            String message,
            List<ProductResponseDTO> products,
            List<AIBundleSummaryDTO> bundles,
            Long sessionId) {
        this(message, products, bundles, sessionId, null, null, Collections.emptyList(), null);
    }

    public AIResponse(
            String message,
            List<ProductResponseDTO> products,
            List<AIBundleSummaryDTO> bundles,
            Long sessionId,
            String pipelineNotes) {
        this(message, products, bundles, sessionId, pipelineNotes, null, Collections.emptyList(), null);
    }

    public AIResponse(
            String message,
            List<ProductResponseDTO> products,
            List<AIBundleSummaryDTO> bundles,
            Long sessionId,
            String pipelineNotes,
            String wholesaleLinkIntro,
            List<AssistantWholesaleProductLinkDTO> wholesaleProductLinks) {
        this(message, products, bundles, sessionId, pipelineNotes, wholesaleLinkIntro, wholesaleProductLinks, null);
    }

    public AIResponse(
            String message,
            List<ProductResponseDTO> products,
            List<AIBundleSummaryDTO> bundles,
            Long sessionId,
            String pipelineNotes,
            String wholesaleLinkIntro,
            List<AssistantWholesaleProductLinkDTO> wholesaleProductLinks,
            String assistantPricingToolSummary) {
        this.message = message;
        this.products = products != null ? products : Collections.emptyList();
        this.bundles = bundles != null ? bundles : Collections.emptyList();
        this.sessionId = sessionId;
        this.pipelineNotes = pipelineNotes;
        this.wholesaleLinkIntro = wholesaleLinkIntro;
        this.wholesaleProductLinks =
                wholesaleProductLinks != null ? wholesaleProductLinks : Collections.emptyList();
        this.assistantPricingToolSummary = assistantPricingToolSummary;
    }
}
