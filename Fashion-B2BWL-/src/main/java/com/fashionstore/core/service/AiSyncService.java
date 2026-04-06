package com.fashionstore.core.service;

import com.fashionstore.core.model.AIProductSync;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.repository.AIProductSyncRepository;
import com.fashionstore.core.dto.request.GeminiRequest;
import com.fashionstore.core.dto.response.GeminiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class AiSyncService {

    @Autowired
    private AIProductSyncRepository syncRepository;

    @Autowired
    private WebClient geminiClient;

    /**
     * Hàm chính: Quét bảng sync và nhờ AI viết mô tả cho những mục chưa có
     */
    @Transactional
    public void generateDescriptionsForEmptyEntries() {
        List<AIProductSync> syncEntries = syncRepository.findByContentIsNull();

        if (syncEntries.isEmpty()) {
            log.info("Tất cả bản ghi trong bảng sync đã có nội dung, không cần chạy AI.");
            return;
        }

        log.info("🤖 Đã tìm thấy {} mục cần AI viết mô tả...", syncEntries.size());

        for (AIProductSync sync : syncEntries) {
            Product product = sync.getProduct();
            if (product == null) continue;

            String prompt = buildPrompt(product);

            try {
                log.debug("Đang gửi yêu cầu AI cho sản phẩm: {}", product.getName());
                String aiDescription = callGeminiApi(prompt).block();

                if (aiDescription != null && !aiDescription.isBlank()) {
                    sync.setContent(aiDescription.trim());
                    sync.setLastSyncedAt(LocalDateTime.now());
                    syncRepository.save(sync);
                    log.info("✅ Đã cập nhật mô tả AI cho SP: {}", product.getName());
                } else {
                    log.warn("⚠️ AI không trả về nội dung cho sản phẩm: {}", product.getName());
                }
            } catch (Exception e) {
                log.error("❌ Lỗi khi xử lý AI sync cho sản phẩm {}: {}", product.getProductCode(), e.getMessage());
            }
        }
    }

    /**
     * Hàm gọi API sang Google AI Studio
     */
    private Mono<String> callGeminiApi(String prompt) {
        return geminiClient.post()
                .uri(uriBuilder -> uriBuilder.queryParam("key", "{key}").build())
                .bodyValue(new GeminiRequest(prompt))
                .retrieve()
                .bodyToMono(GeminiResponse.class)
                .map(res -> {
                    String text = res.getGeneratedText();
                    return (text != null) ? text : "";
                });
    }

    /**
     * Hàm viết Prompt dựa trên thông tin thực tế của sản phẩm
     */
    private String buildPrompt(Product product) {
        StringBuilder specs = new StringBuilder();
        if (product.getMaterial() != null) specs.append("Chất liệu: ").append(product.getMaterial()).append(". ");
        if (product.getOrigin() != null) specs.append("Xuất xứ: ").append(product.getOrigin()).append(". ");
        if (product.getBrand() != null) specs.append("Thương hiệu: ").append(product.getBrand()).append(". ");

        return String.format(
                "Bạn là một chuyên gia Content Marketing thời trang. " +
                "Dựa trên thông tin sản phẩm dưới đây, hãy viết một đoạn mô tả hấp dẫn, chuyên nghiệp, chuẩn SEO bằng tiếng Việt. " +
                "Độ dài khoảng 100-150 từ. Chỉ trả về đoạn văn mô tả, không kèm tiêu đề.\n\n" +
                "Tên sản phẩm: %s\n" +
                "Thông tin chi tiết: %s",
                product.getName(),
                specs.length() > 0 ? specs.toString() : "Thông tin cơ bản"
        );
    }
}