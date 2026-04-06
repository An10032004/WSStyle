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
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIProductHelperService {

    private final ProductRepository productRepository;

    @Value("${google.ai.api-key:}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String[] ENDPOINTS = {
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key="
    };

    // ====================================================================
    // ENTRY POINT
    // ====================================================================
    public AIResponse chat(String userMessage) {
        String cleanKey = (apiKey != null) ? apiKey.trim() : "";

        boolean hasValidKey = !cleanKey.isEmpty()
                && cleanKey.matches("^[A-Za-z0-9_\\-]+$")
                && !cleanKey.equalsIgnoreCase("YOUR_API_KEY_HERE");

        if (hasValidKey) {
            log.info("🔑 Sử dụng Gemini AI");
            return chatWithGemini(userMessage, cleanKey);
        } else {
            log.info("🧠 Offline mode");
            return chatOffline(userMessage);
        }
    }

    // ====================================================================
    // OFFLINE MODE — Trả lời thông minh không cần API
    // ====================================================================
    private AIResponse chatOffline(String userMessage) {
        String msg = userMessage.toLowerCase().trim();
        List<Product> allProducts = productRepository.findAll();

        // 1. Chào hỏi
        if (isGreeting(msg)) {
            return new AIResponse(
                    "Chào bạn! 👋 Tôi là Luxe Assistant. Mình có thể giúp bạn:\n" +
                    "• Tìm sản phẩm (VD: \"tìm áo polo\")\n" +
                    "• So sánh giá (VD: \"đắt nhất?\", \"rẻ nhất?\")\n" +
                    "• Tư vấn phối đồ\n" +
                    "• Hỏi về chính sách shop",
                    List.of());
        }

        // 2. Sản phẩm đắt nhất
        if (msg.contains("đắt nhất") || msg.contains("đắt tiền nhất") || msg.contains("cao nhất") || msg.contains("giá cao")) {
            List<Product> sorted = allProducts.stream()
                    .filter(p -> p.getBasePrice() != null)
                    .sorted(Comparator.comparing(p -> p.getBasePrice().doubleValue(), Comparator.reverseOrder()))
                    .limit(6).toList();
            return new AIResponse("Đây là những sản phẩm có giá cao nhất của shop ạ! 💎✨", sorted);
        }

        // 3. Sản phẩm rẻ nhất
        if (msg.contains("rẻ nhất") || msg.contains("giá rẻ") || msg.contains("thấp nhất") || msg.contains("giá thấp") || msg.contains("tiết kiệm")) {
            List<Product> sorted = allProducts.stream()
                    .filter(p -> p.getBasePrice() != null)
                    .sorted(Comparator.comparing(p -> p.getBasePrice().doubleValue()))
                    .limit(6).toList();
            return new AIResponse("Đây là những sản phẩm giá tốt nhất dành cho bạn! 🏷️💰", sorted);
        }

        // 4. Sản phẩm mới
        if (msg.contains("mới") || msg.contains("hot") || msg.contains("phổ biến") || msg.contains("bán chạy") || msg.contains("nổi bật")) {
            List<Product> latest = allProducts.stream()
                    .sorted(Comparator.comparing(Product::getId, Comparator.reverseOrder()))
                    .limit(6).toList();
            return new AIResponse("Đây là những sản phẩm mới nhất của shop! 🔥🆕", latest);
        }

        // 5. Lọc theo giá
        Long maxPrice = extractMaxPrice(msg);
        if (maxPrice != null) {
            List<Product> filtered = allProducts.stream()
                    .filter(p -> p.getBasePrice() != null && p.getBasePrice().doubleValue() <= maxPrice)
                    .sorted(Comparator.comparing(p -> p.getBasePrice().doubleValue(), Comparator.reverseOrder()))
                    .limit(6).toList();
            if (filtered.isEmpty()) {
                return new AIResponse("Xin lỗi, hiện chưa có sản phẩm nào dưới " + formatPrice(maxPrice) + " ạ 😊", List.of());
            }
            return new AIResponse("Đây là các sản phẩm dưới " + formatPrice(maxPrice) + " cho bạn! 💸", filtered);
        }

        // 6. Câu hỏi chung / trò chuyện (KHÔNG phải tìm sản phẩm)
        if (isGeneralChat(msg)) {
            return handleGeneralChat(msg, allProducts);
        }

        // 7. Tìm kiếm theo từ khóa sản phẩm
        String keyword = extractKeyword(msg);
        if (!keyword.isEmpty()) {
            List<Product> found = allProducts.stream()
                    .filter(p -> p.getName().toLowerCase().contains(keyword))
                    .limit(6).toList();

            if (found.isEmpty()) {
                String[] words = keyword.split("\\s+");
                found = allProducts.stream()
                        .filter(p -> {
                            String name = p.getName().toLowerCase();
                            for (String w : words) {
                                if (w.length() >= 2 && name.contains(w)) return true;
                            }
                            return false;
                        })
                        .limit(6).toList();
            }

            if (!found.isEmpty()) {
                return new AIResponse("Mình tìm thấy " + found.size() + " sản phẩm \"" + keyword + "\" đây ạ! 🛍️", found);
            } else {
                List<Product> suggestions = allProducts.stream().limit(4).toList();
                return new AIResponse("Xin lỗi, không tìm thấy \"" + keyword + "\". Xem thử gợi ý nhé! 😊", suggestions);
            }
        }

        // 8. Tổng số sản phẩm
        if (msg.contains("bao nhiêu") && (msg.contains("sản phẩm") || msg.contains("mặt hàng"))) {
            return new AIResponse("Shop hiện có " + allProducts.size() + " sản phẩm ạ! 🛒", List.of());
        }

        // 9. Tất cả
        if (msg.contains("tất cả") || msg.contains("toàn bộ") || msg.contains("xem hết")) {
            List<Product> sample = allProducts.stream().limit(6).toList();
            return new AIResponse("Đây là một số sản phẩm của shop! Tổng cộng " + allProducts.size() + " sản phẩm 🛍️", sample);
        }

        // 10. Fallback
        List<Product> suggestions = allProducts.stream().limit(4).toList();
        return new AIResponse(
                "Mình chưa hiểu rõ lắm 😅 Bạn thử:\n" +
                "• \"Sản phẩm đắt nhất?\"\n" +
                "• \"Tìm áo polo\"\n" +
                "• \"Sản phẩm dưới 500k\"\n" +
                "• \"Tư vấn phối đồ\"",
                suggestions);
    }

    // ====================================================================
    // HELPER: Nhận diện chào hỏi
    // ====================================================================
    private boolean isGreeting(String msg) {
        String[] greetings = {"xin chào", "chào", "hello", "hi", "hey", "alo", "allo", "chao"};
        for (String g : greetings) {
            if (msg.equals(g) || msg.startsWith(g + " ") || msg.startsWith(g + "!") || msg.startsWith(g + ",")) {
                return true;
            }
        }
        return false;
    }

    // ====================================================================
    // HELPER: Nhận diện câu hỏi chung (không phải tìm sản phẩm)
    // ====================================================================
    private boolean isGeneralChat(String msg) {
        String[] chatPatterns = {
                "tư vấn", "giúp tôi", "giúp mình", "cho hỏi",
                "phối đồ", "mặc gì", "nên mặc", "mix đồ", "phong cách",
                "cảm ơn", "thanks", "thank you",
                "tạm biệt", "bye",
                "shop ở đâu", "địa chỉ", "liên hệ", "hotline", "số điện thoại",
                "giao hàng", "freeship", "đổi trả", "bảo hành", "chính sách",
                "bạn là ai", "bạn tên gì",
                "giờ mở cửa", "mấy giờ"
        };
        for (String p : chatPatterns) {
            if (msg.contains(p)) return true;
        }
        return false;
    }

    // ====================================================================
    // HELPER: Xử lý câu hỏi chung
    // ====================================================================
    private AIResponse handleGeneralChat(String msg, List<Product> allProducts) {
        if (msg.contains("tư vấn") || msg.contains("phối đồ") || msg.contains("mặc gì") || msg.contains("phong cách")) {
            List<Product> suggestions = allProducts.stream().limit(4).toList();
            return new AIResponse(
                    "Mình rất sẵn lòng tư vấn cho bạn! 🎨✨\n\n" +
                    "Bạn cho mình biết thêm nhé:\n" +
                    "• Dịp nào? (đi làm, đi chơi, dự tiệc...)\n" +
                    "• Phong cách thích? (thanh lịch, năng động...)\n" +
                    "• Ngân sách tầm bao nhiêu?\n\n" +
                    "Hoặc xem thử sản phẩm nổi bật nhé! 👇",
                    suggestions);
        }

        if (msg.contains("cảm ơn") || msg.contains("thanks")) {
            return new AIResponse("Không có gì ạ! 😊 Rất vui được hỗ trợ bạn. Cần gì thêm cứ hỏi mình nhé! 💕", List.of());
        }

        if (msg.contains("tạm biệt") || msg.contains("bye")) {
            return new AIResponse("Tạm biệt bạn! 👋 Hẹn gặp lại, chúc bạn một ngày tuyệt vời! 🌟", List.of());
        }

        if (msg.contains("shop ở đâu") || msg.contains("địa chỉ") || msg.contains("liên hệ") || msg.contains("hotline")) {
            return new AIResponse("📍 Luxe Store luôn sẵn sàng phục vụ bạn!\nĐặt hàng trực tiếp trên website hoặc nhắn tin cho mình nhé! 🛒", List.of());
        }

        if (msg.contains("giao hàng") || msg.contains("freeship") || msg.contains("đổi trả") || msg.contains("bảo hành") || msg.contains("chính sách")) {
            return new AIResponse(
                    "📦 Chính sách Luxe Store:\n" +
                    "• Giao hàng toàn quốc, freeship từ 500k\n" +
                    "• Đổi trả 7 ngày nếu lỗi\n" +
                    "• Thanh toán: COD, chuyển khoản, ví điện tử\n\n" +
                    "Cần biết thêm gì không ạ? 😊", List.of());
        }

        if (msg.contains("bạn là ai") || msg.contains("bạn tên gì")) {
            return new AIResponse(
                    "Mình là Luxe Assistant 🤖✨\n\n" +
                    "Mình có thể giúp bạn:\n" +
                    "• Tìm sản phẩm theo ý thích\n" +
                    "• Tư vấn phối đồ\n" +
                    "• Trả lời về shop & chính sách\n\n" +
                    "Hỏi mình bất cứ điều gì nhé!", List.of());
        }

        return new AIResponse(
                "Mình hiểu rồi! 😊 Bạn muốn mình hỗ trợ gì ạ?\n\n" +
                "• Tìm sản phẩm (VD: \"tìm áo polo\")\n" +
                "• So sánh giá (VD: \"đắt nhất\")\n" +
                "• Tư vấn phối đồ\n" +
                "• Hỏi về chính sách shop", List.of());
    }

    // ====================================================================
    // HELPER: Trích xuất giá tối đa
    // ====================================================================
    private Long extractMaxPrice(String msg) {
        java.util.regex.Pattern[] patterns = {
                java.util.regex.Pattern.compile("dưới\\s*(\\d+)\\s*k", java.util.regex.Pattern.CASE_INSENSITIVE),
                java.util.regex.Pattern.compile("dưới\\s*(\\d+)\\s*nghìn", java.util.regex.Pattern.CASE_INSENSITIVE),
                java.util.regex.Pattern.compile("dưới\\s*(\\d+)\\s*ngàn", java.util.regex.Pattern.CASE_INSENSITIVE),
                java.util.regex.Pattern.compile("dưới\\s*(\\d+)\\s*triệu", java.util.regex.Pattern.CASE_INSENSITIVE),
                java.util.regex.Pattern.compile("dưới\\s*(\\d+)\\s*tr", java.util.regex.Pattern.CASE_INSENSITIVE),
                java.util.regex.Pattern.compile("tầm\\s*(\\d+)\\s*k", java.util.regex.Pattern.CASE_INSENSITIVE),
                java.util.regex.Pattern.compile("tầm\\s*(\\d+)\\s*triệu", java.util.regex.Pattern.CASE_INSENSITIVE),
                java.util.regex.Pattern.compile("khoảng\\s*(\\d+)\\s*k", java.util.regex.Pattern.CASE_INSENSITIVE),
        };
        long[] multipliers = {1000, 1000, 1000, 1000000, 1000000, 1000, 1000000, 1000};

        for (int i = 0; i < patterns.length; i++) {
            java.util.regex.Matcher matcher = patterns[i].matcher(msg);
            if (matcher.find()) {
                try {
                    return Long.parseLong(matcher.group(1).replaceAll("[,.]", "")) * multipliers[i];
                } catch (NumberFormatException e) { /* skip */ }
            }
        }
        return null;
    }

    private String formatPrice(long price) {
        if (price >= 1000000) return (price / 1000000) + " triệu";
        if (price >= 1000) return (price / 1000) + "k";
        return price + "đ";
    }

    // ====================================================================
    // HELPER: Trích xuất từ khóa sản phẩm
    // ====================================================================
    private String extractKeyword(String msg) {
        String[][] productCategories = {
                {"áo thun", "áo polo", "áo sơ mi", "áo khoác", "áo hoodie", "áo len", "áo vest", "áo dài",
                 "quần jean", "quần jeans", "quần tây", "quần short", "quần kaki", "quần dài",
                 "váy đầm", "đầm dạ hội", "chân váy"},
                {"phụ kiện", "trang sức", "dây chuyền", "vòng cổ", "vòng tay", "nhẫn", "bông tai", "hoa tai",
                 "mắt kính", "kính mát", "thắt lưng", "ví", "túi xách", "balo", "mũ", "nón", "khăn"},
                {"giày thể thao", "giày sneaker", "giày da", "giày cao gót", "giày boot", "dép", "sandal", "giày"},
                {"áo", "quần", "váy", "đầm", "polo", "hoodie", "jacket", "shirt", "dress", "nước hoa"}
        };

        String lowerMsg = msg.toLowerCase();
        String bestMatch = "";
        for (String[] cat : productCategories) {
            for (String kw : cat) {
                if (lowerMsg.contains(kw) && kw.length() > bestMatch.length()) {
                    bestMatch = kw;
                }
            }
        }

        if (!bestMatch.isEmpty()) {
            String gender = "";
            if (lowerMsg.contains(" nam")) gender = "nam";
            else if (lowerMsg.contains(" nữ")) gender = "nữ";
            return gender.isEmpty() ? bestMatch : bestMatch + " " + gender;
        }

        // Fallback: loại bỏ stop words
        String[] stopWords = {
                "tôi", "tui", "mình", "em", "anh", "chị", "bạn",
                "muốn", "cần", "thích", "đang", "sẽ", "hãy", "được",
                "tìm", "kiếm", "xem", "cho", "với", "và", "hoặc",
                "mua", "đặt", "lấy",
                "có", "không", "là", "của", "này", "đó", "ở", "trong",
                "gì", "nào", "sao", "thế", "đâu", "bao", "mấy",
                "rất", "lắm", "quá", "hơn", "nhất",
                "shop", "ơi", "nhé", "nha", "ạ", "vậy", "thì",
                "giúp", "hỏi", "sản phẩm", "món", "cái", "chiếc",
                "tư vấn", "đẹp", "tốt"
        };

        String cleaned = lowerMsg;
        java.util.Arrays.sort(stopWords, (a, b) -> b.length() - a.length());
        for (String sw : stopWords) {
            cleaned = cleaned.replace(sw, " ");
        }
        cleaned = cleaned.replaceAll("[?!.,;:\"'()\\[\\]]", "").replaceAll("\\s+", " ").trim();

        if (cleaned.length() >= 2 && cleaned.length() <= 50) return cleaned;
        return "";
    }

    // ====================================================================
    // GEMINI AI MODE (khi có API key hợp lệ)
    // ====================================================================
    private AIResponse chatWithGemini(String userMessage, String cleanKey) {
        try {
            List<Product> allProducts = productRepository.findAll();
            String context = allProducts.stream().limit(50)
                    .map(p -> p.getName() + " - " + p.getBasePrice() + "₫")
                    .collect(Collectors.joining("\n"));

            String prompt = buildPrompt(userMessage, context);

            String aiRaw = null;
            for (String urlBase : ENDPOINTS) {
                log.info("🔄 Trying: {}", urlBase.substring(0, Math.min(80, urlBase.length())) + "...");
                aiRaw = callGeminiApi(urlBase + cleanKey, prompt);
                if (aiRaw != null && !aiRaw.startsWith("API_ERROR_")) break;
                log.warn("❌ Failed: {}", aiRaw);
            }

            if (aiRaw == null || aiRaw.startsWith("API_ERROR_")) {
                log.warn("⚠️ Gemini thất bại → offline mode");
                return chatOffline(userMessage);
            }

            JsonNode aiJson = parseAI(aiRaw);
            if (aiJson == null) {
                log.warn("⚠️ Parse JSON thất bại → offline mode");
                return chatOffline(userMessage);
            }

            String intent = aiJson.path("intent").asText("chat");
            String message = aiJson.path("message").asText("Mình có thể giúp gì thêm? 😊");

            // Câu hỏi chung → chỉ trả text
            if ("chat".equals(intent)) {
                return new AIResponse(message, List.of());
            }

            // Tìm sản phẩm
            String keyword = aiJson.path("keyword").asText("");
            long maxPrice = aiJson.path("maxPrice").asLong(Long.MAX_VALUE);
            String sortBy = aiJson.path("sortBy").asText("none");

            List<Product> result = allProducts.stream()
                    .filter(p -> keyword.isEmpty() || p.getName().toLowerCase().contains(keyword.toLowerCase()))
                    .filter(p -> p.getBasePrice() == null || p.getBasePrice().doubleValue() <= maxPrice)
                    .collect(Collectors.toList());

            if (result.isEmpty() && !keyword.trim().isEmpty()) {
                String[] words = keyword.toLowerCase().split("\\s+");
                result = allProducts.stream()
                        .filter(p -> {
                            String name = p.getName().toLowerCase();
                            for (String w : words) {
                                if (w.length() >= 2 && name.contains(w)) return true;
                            }
                            return false;
                        })
                        .collect(Collectors.toList());
            }

            if ("price_desc".equals(sortBy)) {
                result.sort(Comparator.comparing(p -> p.getBasePrice() != null ? p.getBasePrice().doubleValue() : 0.0, Comparator.reverseOrder()));
            } else if ("price_asc".equals(sortBy)) {
                result.sort(Comparator.comparing(p -> p.getBasePrice() != null ? p.getBasePrice().doubleValue() : 999999999.0));
            }

            return new AIResponse(message, result.stream().limit(6).toList());

        } catch (Exception e) {
            log.error("AI Service Error", e);
            return chatOffline(userMessage);
        }
    }

    private String buildPrompt(String userMessage, String productContext) {
        return String.format(
                """
                        Bạn là "Luxe Assistant" — trợ lý ảo thông minh của shop thời trang Luxe Store.
                        Bạn trả lời được MỌI câu hỏi: tìm sản phẩm, tư vấn, trò chuyện, hỏi chung.

                        SẢN PHẨM CỦA SHOP:
                        %s

                        KHÁCH HỎI: "%s"

                        LUẬT:
                        1. intent = "product" nếu khách muốn tìm/xem/mua/so sánh sản phẩm
                        2. intent = "chat" nếu khách hỏi chung (chào, tư vấn, chính sách, trò chuyện...)
                        3. Trả lời thân thiện bằng tiếng Việt, có emoji
                        4. Nếu "đắt nhất" → sortBy="price_desc", keyword=""
                        5. Nếu "rẻ nhất" → sortBy="price_asc", keyword=""
                        6. KHÔNG đưa từ "đắt","rẻ","nhất" vào keyword
                        7. CHỈ trả JSON, KHÔNG text ngoài

                        JSON:
                        {
                          "intent": "product" hoặc "chat",
                          "keyword": "từ khóa sản phẩm (rỗng nếu chat hoặc không rõ)",
                          "maxPrice": 999999999,
                          "sortBy": "none" hoặc "price_asc" hoặc "price_desc",
                          "message": "câu trả lời tiếng Việt thân thiện"
                        }
                        """,
                productContext, userMessage);
    }

    // ====================================================================
    // GEMINI API CALL
    // ====================================================================
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
            if (response.statusCode() != 200) {
                log.error("Gemini API Error: {} - {}", response.statusCode(), response.body());
                return "API_ERROR_" + response.statusCode();
            }

            JsonNode resJson = objectMapper.readTree(response.body());
            JsonNode candidates = resJson.path("candidates");
            if (candidates.isMissingNode() || candidates.isEmpty()) return null;

            return candidates.get(0).path("content").path("parts").get(0).path("text").asText();
        } catch (Exception e) {
            log.error("❌ Gemini API Exception: {}", e.getMessage());
            return null;
        }
    }

    private JsonNode parseAI(String jsonText) {
        try {
            if (jsonText == null) return null;
            String clean = jsonText.trim();
            int first = clean.indexOf("{");
            int last = clean.lastIndexOf("}");
            if (first != -1 && last > first) {
                clean = clean.substring(first, last + 1);
            }
            return objectMapper.readTree(clean);
        } catch (Exception e) {
            log.error("Parse AI JSON failed: {}", jsonText);
            return null;
        }
    }
}
