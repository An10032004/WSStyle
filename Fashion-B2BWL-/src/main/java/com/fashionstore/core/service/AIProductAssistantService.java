package com.fashionstore.core.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fashionstore.core.dto.response.AIResponse;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIProductAssistantService {

    private final ProductRepository productRepository;

    @Value("${ai.api.key:}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String[] ENDPOINTS = {
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=",
        "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key="
    };

    /**
     * Hàm chat chính theo kiến trúc chuẩn
     */
    public AIResponse chat(String userMessage) {
        String cleanKey = (apiKey != null) ? apiKey.trim() : "";
        if (cleanKey.isEmpty() || cleanKey.equals("YOUR_API_KEY_HERE")) {
            return new AIResponse("Chào bạn! Tôi là trợ lý Luxe. Hãy hỏi tôi về sản phẩm nhé!", List.of());
        }

        try {
            // 1. Chuẩn bị ngữ cảnh sản phẩm (lấy mẫu 50 cái để AI hiểu dải sản phẩm)
            List<Product> allProducts = productRepository.findAll();
            String context = allProducts.stream().limit(50)
                    .map(p -> p.getName() + " - " + p.getBasePrice() + "₫")
                    .collect(Collectors.joining("\n"));

            // 2. Xây dựng prompt ép AI trả JSON
            String prompt = buildPrompt(userMessage, context);

            // 3. Gọi AI với cơ chế fallback
            String aiRaw = null;
            for (String urlBase : ENDPOINTS) {
                aiRaw = callGeminiApi(urlBase + cleanKey, prompt);
                if (aiRaw != null && !aiRaw.startsWith("API_ERROR_")) break;
            }

            // 4. Parse JSON từ AI
            JsonNode aiJson = parseAI(aiRaw);
            if (aiJson == null) {
                return new AIResponse("Xin lỗi, tôi chưa hiểu rõ yêu cầu. Bạn có thể nói chi tiết hơn không? 😢", List.of());
            }

            // 5. Query DB thật dựa trên chỉ dẫn của AI
            String keyword = aiJson.path("keyword").asText("");
            long maxPrice = aiJson.path("maxPrice").asLong(Long.MAX_VALUE);
            String message = aiJson.path("message").asText("Đây là một số gợi ý cho bạn 👇");

            List<Product> result = allProducts.stream()
                    .filter(p -> p.getName().toLowerCase().contains(keyword.toLowerCase()))
                    .filter(p -> p.getBasePrice() == null || p.getBasePrice().doubleValue() <= maxPrice)
                    .limit(6)
                    .toList();

            return new AIResponse(message, result);

        } catch (Exception e) {
            log.error("AI Service Error", e);
            return new AIResponse("Rất tiếc, hệ thống đang bận. Bạn vui lòng thử lại sau nhé!", List.of());
        }
    }

    private String buildPrompt(String userMessage, String productContext) {
        return String.format("""
            Bạn là trợ lý ảo bán hàng thông minh của shop thời trang cao cấp Luxe Store.
            
            DANH SÁCH SẢN PHẨM MẪU:
            %s
            
            YÊU CẦU CỦA KHÁCH: "%s"
            
            NHIỆM VỤ:
            1. Phân tích ý định của khách (tìm sản phẩm gì, ngân sách bao nhiêu).
            2. Trả về đúng định dạng JSON bên dưới. KHÔNG TRẢ LỜI THÊM VĂN BẢN NGOÀI JSON.
            
            ĐỊNH DẠNG JSON:
            {
              "keyword": "từ khóa tìm kiếm sản phẩm",
              "maxPrice": con số tối đa (ví dụ 1000000, nếu không có thì để 999999999),
              "message": "câu trả lời thân thiện cho khách (ví dụ: Mình tìm thấy vài mẫu áo đẹp cho bạn đây!)"
            }
            """, productContext, userMessage);
    }

    private String callGeminiApi(String fullUrl, String prompt) {
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
            com.fasterxml.jackson.databind.node.ObjectNode rootNode = objectMapper.createObjectNode();
            rootNode.putArray("contents").addObject()
                    .putArray("parts").addObject()
                    .put("text", prompt);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fullUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(rootNode), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) return "API_ERROR_" + response.statusCode();
            
            JsonNode resJson = objectMapper.readTree(response.body());
            return resJson.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        } catch (Exception e) {
            return null;
        }
    }

    private JsonNode parseAI(String jsonText) {
        try {
            if (jsonText == null) return null;
            // Xử lý trường hợp AI trả về text kèm markdown ```json ... ```
            String cleanJson = jsonText.trim();
            if (cleanJson.startsWith("```json")) {
                cleanJson = cleanJson.substring(7, cleanJson.length() - 3).trim();
            } else if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.substring(3, cleanJson.length() - 3).trim();
            }
            return objectMapper.readTree(cleanJson);
        } catch (Exception e) {
            log.error("Parse AI JSON failed: " + jsonText);
            return null;
        }
    }
}
