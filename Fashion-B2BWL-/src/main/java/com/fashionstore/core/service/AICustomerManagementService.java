package com.fashionstore.core.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fashionstore.core.dto.response.AICustomerInsightResponse;
import com.fashionstore.core.dto.response.AssistantTurnDTO;
import com.fashionstore.core.model.Order;
import com.fashionstore.core.model.OrderItem;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.OrderRepository;
import com.fashionstore.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AICustomerManagementService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final LuxeAssistantHistoryService assistantHistoryService;

    @Value("${google.ai.api-key:}")
    private String apiKey;

    @Value("${google.ai.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent}")
    private String geminiGenerateUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public AICustomerInsightResponse getCustomerInsight(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khách hàng."));

        // Lấy 5 đơn hàng gần nhất
        List<Order> lastOrders = orderRepository.findByUserId(userId, PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
        
        // Lấy 20 lượt chat gần nhất
        List<AssistantTurnDTO> lastChats = new ArrayList<>();
        assistantHistoryService.listSessions(userId, 3).forEach(s -> {
            lastChats.addAll(assistantHistoryService.listTurns(s.getId(), userId));
        });

        String context = buildCustomerContext(user, lastOrders, lastChats);
        String prompt = buildPrompt(context);

        String aiRaw = callGeminiApi(geminiGenerateUrl, apiKey, prompt);
        JsonNode aiJson = parseAiJson(aiRaw);

        if (aiJson == null) {
            return AICustomerInsightResponse.builder()
                    .insight("Hiện tại trợ lý AI không thể phân tích dữ liệu của khách hàng này. Vui lòng thử lại sau.")
                    .sentiment("NEUTRAL")
                    .suggestedActions(List.of("Kiểm tra lại thông tin khách hàng thủ công", "Liên hệ khách hàng để tìm hiểu nhu cầu"))
                    .predictedInterests(List.of("Chưa xác định"))
                    .build();
        }

        List<String> actions = new ArrayList<>();
        aiJson.path("suggestedActions").forEach(n -> actions.add(n.asText()));

        List<String> interests = new ArrayList<>();
        aiJson.path("predictedInterests").forEach(n -> interests.add(n.asText()));

        return AICustomerInsightResponse.builder()
                .insight(aiJson.path("insight").asText())
                .sentiment(aiJson.path("sentiment").asText("NEUTRAL"))
                .suggestedActions(actions)
                .predictedInterests(interests)
                .build();
    }

    private String buildCustomerContext(User user, List<Order> orders, List<AssistantTurnDTO> chats) {
        StringBuilder sb = new StringBuilder();
        sb.append("KHÁCH HÀNG: ").append(user.getFullName()).append("\n");
        sb.append("EMAIL: ").append(user.getEmail()).append("\n");
        sb.append("NHÓM: ").append(user.getCustomerGroup() != null ? user.getCustomerGroup().getName() : "Mặc định").append("\n");
        sb.append("VAI TRÒ: ").append(user.getRole()).append("\n");
        sb.append("CÔNG TY: ").append(user.getCompanyName() != null ? user.getCompanyName() : "Cá nhân").append("\n\n");

        sb.append("LỊCH SỬ ĐƠN HÀNG (Mới nhất):\n");
        if (orders.isEmpty()) sb.append("- Chưa có giao dịch.\n");
        for (Order o : orders) {
            sb.append("- Đơn #").append(o.getId()).append(": ").append(o.getTotalAmount()).append("đ, Trạng thái: ").append(o.getStatus()).append("\n");
            if (o.getItems() != null) {
                for (OrderItem item : o.getItems()) {
                    sb.append("  + ").append(item.getQuantity()).append("x SP-ID:").append(item.getProductVariant() != null ? item.getProductVariant().getId() : "N/A").append("\n");
                }
            }
        }

        sb.append("\nLỊCH SỬ HỘI THOẠI VỚI AI (Client):\n");
        if (chats.isEmpty()) sb.append("- Không có dữ liệu chat.\n");
        int start = Math.max(0, chats.size() - 15);
        for (int i = start; i < chats.size(); i++) {
            AssistantTurnDTO t = chats.get(i);
            sb.append("- ").append(t.getRole()).append(": ").append(t.getContent()).append("\n");
        }

        return sb.toString();
    }

    private String buildPrompt(String context) {
        return String.format(
            """
            Bạn là một trợ lý phân tích CRM cao cấp cho shop thời trang WSStyle.
            Nhiệm vụ: Phân tích dữ liệu khách hàng để giúp Quản trị viên hiểu rõ khách hàng này và đưa ra hành động phù hợp.

            ## DỮ LIỆU KHÁCH HÀNG
            %s

            ## YÊU CẦU ĐẦU RA (JSON)
            Trả về duy nhất 1 đối tượng JSON:
            {
              "insight": "Phân tích tâm lý, thói quen và tiềm năng của khách (Tiếng Việt, sâu sắc).",
              "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "ANGRY",
              "suggestedActions": ["Hành động cụ thể 1", "Hành động cụ thể 2", ...],
              "predictedInterests": ["Màu sắc/Kiểu dáng/Chất liệu khách thích", ...]
            }

            LƯU Ý: 
            - Nếu khách hỏi nhiều về giá sỉ -> Phân tích họ là khách buôn tiềm năng.
            - Nếu khách có đơn bị Hủy -> Đánh giá cảm xúc cẩn thận.
            - Phân tích dựa trên dữ liệu thật, không bịa đặt.
            """,
            context
        );
    }

    private String callGeminiApi(String url, String apiKey, String prompt) {
        if (apiKey == null || apiKey.isBlank() || apiKey.startsWith("${")) {
            log.warn("AI API Key is missing.");
            return null;
        }
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build();
            var rootNode = objectMapper.createObjectNode();
            rootNode.putArray("contents").addObject()
                    .putArray("parts").addObject()
                    .put("text", prompt);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(
                            objectMapper.writeValueAsString(rootNode), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.error("Gemini Error {}: {}", response.statusCode(), response.body());
                return null;
            }

            JsonNode resJson = objectMapper.readTree(response.body());
            return resJson.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        } catch (Exception e) {
            log.error("Gemini execution error", e);
            return null;
        }
    }

    private JsonNode parseAiJson(String jsonText) {
        try {
            if (jsonText == null) return null;
            String clean = jsonText.trim();
            if (clean.startsWith("```json")) clean = clean.substring(7);
            if (clean.endsWith("```")) clean = clean.substring(0, clean.length() - 3);
            clean = clean.trim();
            int first = clean.indexOf('{');
            int last = clean.lastIndexOf('}');
            if (first != -1 && last > first) {
                clean = clean.substring(first, last + 1);
            }
            return objectMapper.readTree(clean);
        } catch (Exception e) {
            return null;
        }
    }
}
