package com.fashionstore.core.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fashionstore.core.dto.response.AIBundleSummaryDTO;
import com.fashionstore.core.dto.response.AIResponse;
import com.fashionstore.core.dto.response.ProductResponseDTO;
import com.fashionstore.core.model.Bundle;
import com.fashionstore.core.model.Category;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.BundleRepository;
import com.fashionstore.core.repository.CategoryRepository;
import com.fashionstore.core.repository.ProductRepository;
import com.fashionstore.core.repository.ProductVariantRepository;
import com.fashionstore.core.repository.specification.ProductSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIProductHelperService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BundleRepository bundleRepository;
    private final ProductVariantRepository productVariantRepository;
    private final AiSiteContextLoader siteContextLoader;
    private final ProductMapperService productMapperService;
    private final UserService userService;
    private final AssistantPricingHintService assistantPricingHintService;

    @Value("${google.ai.api-key:}")
    private String apiKey;

    /**
     * URL đầy đủ tới {@code :generateContent} — được thử trước mọi fallback.
     * Đổi model bằng cách đổi đoạn {@code models/MODEL_ID:generateContent} (cùng property {@code google.ai.url} với {@link AiSyncService}).
     */
    @Value("${google.ai.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent}")
    private String geminiGenerateUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Fallback khi endpoint cấu hình trả lỗi HTTP (429, 404, …).
     * Chỉ dùng model còn hỗ trợ {@code generateContent} trên v1beta (danh sách: ai.google.dev/gemini-api/docs/models).
     * Không dùng {@code gemini-1.5-flash} / {@code gemini-pro} (thường 404 trên API mới).
     */
    private static final String[] GEMINI_ENDPOINT_FALLBACKS = {
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    };

    private record VndRange(BigDecimal min, BigDecimal max) {}

    /** Kết quả tìm SP + chuỗi dùng xếp hạng độ liên quan (có thể khác LIKE cuối khi fallback). */
    private record ProductSearchOutcome(List<Product> products, String rankingQuery) {}

    /** Thứ tự: {@code google.ai.url} trước, sau đó fallback (bỏ trùng). */
    private List<String> geminiEndpointCandidates() {
        LinkedHashSet<String> set = new LinkedHashSet<>();
        String primary = geminiGenerateUrl != null ? geminiGenerateUrl.trim() : "";
        if (!primary.isEmpty()) {
            set.add(primary);
        }
        for (String u : GEMINI_ENDPOINT_FALLBACKS) {
            set.add(u);
        }
        return new ArrayList<>(set);
    }

    /**
     * Chat / tìm kiếm ngữ nghĩa — Gemini + truy vấn DB; sản phẩm trả về có thể map theo user (giá rule).
     *
     * @param storefrontUserId id user đăng nhập (optional) — map giá qua {@link ProductMapperService}
     * @param storefrontContext đoạn markdown/text do FE gửi (thuế demo, nhóm B2B, …) đưa vào prompt
     * @param pricingHintProductIds id SP thuộc rule QUANTITY_BREAK/B2B khớp khách (FE — cùng logic giỏ)
     * @param pricingHintCategoryIds id danh mục tương tự
     */
    @Transactional(readOnly = true)
    public AIResponse chat(String userMessage, Integer storefrontUserId, String storefrontContext) {
        return chat(userMessage, storefrontUserId, storefrontContext, Collections.emptyList(), Collections.emptyList());
    }

    @Transactional(readOnly = true)
    public AIResponse chat(
            String userMessage,
            Integer storefrontUserId,
            String storefrontContext,
            List<Integer> pricingHintProductIds,
            List<Integer> pricingHintCategoryIds) {
        String cleanKey = (apiKey != null) ? apiKey.trim() : "";
        boolean hasValidKey = cleanKey.length() >= 8
                && !cleanKey.equalsIgnoreCase("YOUR_API_KEY_HERE")
                && !cleanKey.startsWith("${");

        if (!hasValidKey) {
            return new AIResponse(
                    "Trợ lý AI chưa được cấu hình (thiếu hoặc sai google.ai.api-key). Vui lòng liên hệ quản trị hệ thống.",
                    Collections.emptyList());
        }

        try {
            String categoryCatalog = buildCategoryCatalog();
            String siteCtx = siteContextLoader.getSiteMarkdown();
            String prompt = buildPrompt(userMessage, siteCtx, categoryCatalog, storefrontContext);

            String aiRaw = null;
            for (String urlBase : geminiEndpointCandidates()) {
                log.debug("Gemini try: {}", urlBase);
                aiRaw = callGeminiApi(urlBase, cleanKey, prompt);
                if (aiRaw != null && !aiRaw.startsWith("API_ERROR_")) {
                    break;
                }
            }

            if (aiRaw == null || aiRaw.startsWith("API_ERROR_")) {
                log.warn("Gemini unavailable: {}", aiRaw);
                return new AIResponse(
                        "Hiện không kết nối được dịch vụ AI. Bạn vui lòng thử lại sau.",
                        Collections.emptyList());
            }

            JsonNode aiJson = parseAiJson(aiRaw);
            if (aiJson == null) {
                return new AIResponse(
                        "Trợ lý nhận được phản hồi không đúng định dạng. Bạn thử diễn đạt lại câu hỏi nhé.",
                        Collections.emptyList());
            }

            JsonNode decisionJson = maybeForceProductSearch(userMessage, aiJson);
            String intent = decisionJson.path("intent").asText("site_help").trim().toLowerCase();
            String message = decisionJson.path("message").asText("Mình có thể giúp gì thêm?");

            return switch (intent) {
                case "product_search" -> {
                    ProductSearchOutcome outcome = runProductSearch(decisionJson, userMessage);
                    List<Product> ranked = rankProductsForAi(outcome.products(), userMessage, outcome.rankingQuery());
                    var serverHints = assistantPricingHintService.computeHints(storefrontUserId);
                    List<Integer> mergedProductHints = unionIntIds(
                            pricingHintProductIds,
                            serverHints.getPricingHintProductIds(),
                            AssistantPricingHintService.MAX_HINT_PRODUCT_IDS);
                    List<Integer> mergedCategoryHints = unionIntIds(
                            pricingHintCategoryIds,
                            serverHints.getPricingHintCategoryIds(),
                            AssistantPricingHintService.MAX_HINT_CATEGORY_IDS);
                    List<Product> merged = mergePricingHints(
                            ranked,
                            userMessage,
                            decisionJson,
                            mergedProductHints,
                            mergedCategoryHints);
                    List<ProductResponseDTO> dtos = mapProductsForStorefront(merged, storefrontUserId);
                    List<AIBundleSummaryDTO> bundles = resolveBundles(merged, userMessage, decisionJson);
                    String msg = message;
                    if (dtos.isEmpty()) {
                        msg = message
                                + "<br><br><small><i>Chưa có sản phẩm khớp từ khóa trong kho. "
                                + "Thử từ ngắn hơn (vd. chỉ \"áo\") hoặc vào <b>Shop</b> để lọc tay.</i></small>";
                    }
                    yield new AIResponse(msg, dtos, bundles, null);
                }
                case "chat", "site_help" -> new AIResponse(message, Collections.emptyList());
                default -> new AIResponse(message, Collections.emptyList());
            };
        } catch (Exception e) {
            log.error("AI chat error", e);
            return new AIResponse(
                    "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.",
                    Collections.emptyList());
        }
    }

    /** Tương thích gọi cũ — không user / không ngữ cảnh FE. */
    @Transactional(readOnly = true)
    public AIResponse chat(String userMessage) {
        return chat(userMessage, null, null, Collections.emptyList(), Collections.emptyList());
    }

    /**
     * Gộp SP từ gợi ý rule giá (FE gửi — khớp CartService) khi hỏi giá sỉ / B2B, để DB không cần cột "có sỉ".
     */
    private List<Product> mergePricingHints(
            List<Product> ranked,
            String userMessage,
            JsonNode decisionJson,
            List<Integer> hintProductIds,
            List<Integer> hintCategoryIds) {
        boolean hasHints = (hintProductIds != null && !hintProductIds.isEmpty())
                || (hintCategoryIds != null && !hintCategoryIds.isEmpty());
        if (!hasHints) {
            return ranked;
        }
        boolean wholesaleFocus = looksLikeWholesaleIntent(userMessage);
        String q = firstNonBlank(decisionJson.path("search").asText(""), extractProductSearchHint(userMessage))
                .trim()
                .toLowerCase(Locale.ROOT);

        LinkedHashMap<Integer, Product> byId = new LinkedHashMap<>();
        if (hintProductIds != null) {
            for (Product p : productRepository.findAllById(hintProductIds)) {
                if (p.getId() == null) {
                    continue;
                }
                if (!wholesaleFocus || q.isEmpty() || productMatchesLooseQuery(p, q)) {
                    byId.put(p.getId(), p);
                }
            }
        }
        if (hintCategoryIds != null && !hintCategoryIds.isEmpty()) {
            var page = productRepository.findAll(
                    ProductSpecification.filterProducts(null, hintCategoryIds, null, null, List.of(), null),
                    PageRequest.of(0, 40, Sort.by(Sort.Direction.DESC, "id")));
            for (Product p : page.getContent()) {
                if (p.getId() == null) {
                    continue;
                }
                if (!wholesaleFocus || q.isEmpty() || productMatchesLooseQuery(p, q)) {
                    byId.putIfAbsent(p.getId(), p);
                }
            }
        }
        if (byId.isEmpty()) {
            return ranked;
        }

        List<Product> hintPool = new ArrayList<>(byId.values());
        List<Product> hintRanked = rankProductsForAi(hintPool, userMessage, q);

        if (wholesaleFocus) {
            // Khách hỏi giá sỉ + có phạm vi rule: chỉ liệt kê SP thuộc rule, không trộn kết quả search chung.
            // Không lọc theo cả câu khách (vd. "sản phẩm đang áp dụng giá sỉ") — dễ loại nhầm mọi SP; xếp hạng đã dùng userMessage.
            if (!hintRanked.isEmpty()) {
                return hintRanked.size() > 40 ? new ArrayList<>(hintRanked.subList(0, 40)) : new ArrayList<>(hintRanked);
            }
            return ranked;
        }

        LinkedHashSet<Integer> seen = new LinkedHashSet<>();
        List<Product> out = new ArrayList<>();
        for (Product p : hintRanked) {
            if (out.size() >= 8) {
                break;
            }
            if (p.getId() != null && seen.add(p.getId())) {
                out.add(p);
            }
        }
        for (Product p : ranked) {
            if (p.getId() != null && seen.add(p.getId())) {
                out.add(p);
            }
        }
        return out;
    }

    private static boolean looksLikeWholesaleIntent(String msg) {
        if (msg == null) {
            return false;
        }
        String m = msg.toLowerCase(Locale.ROOT);
        return m.contains("giá sỉ")
                || m.contains("gia si")
                || m.contains("áp dụng giá sỉ")
                || m.contains("ap dung gia si")
                || m.contains("mua sỉ")
                || m.contains("mua si")
                || m.contains("bậc giá")
                || m.contains("bac gia")
                || m.contains("sỉ ")
                || m.contains(" si ")
                || m.contains("theo số lượng")
                || m.contains("theo so luong")
                || m.contains("quantity break")
                || m.contains("bulk ");
    }

    /** Gộp id gợi ý từ FE + từ server (trùng lặc giữ thứ tự). */
    private static List<Integer> unionIntIds(List<Integer> fromRequest, List<Integer> fromServer, int max) {
        LinkedHashSet<Integer> set = new LinkedHashSet<>();
        if (fromRequest != null) {
            for (Integer id : fromRequest) {
                if (id != null && id > 0) {
                    set.add(id);
                    if (set.size() >= max) {
                        return new ArrayList<>(set);
                    }
                }
            }
        }
        if (fromServer != null) {
            for (Integer id : fromServer) {
                if (id != null && id > 0) {
                    set.add(id);
                    if (set.size() >= max) {
                        break;
                    }
                }
            }
        }
        return new ArrayList<>(set);
    }

    private static boolean productMatchesLooseQuery(Product p, String q) {
        if (q.isEmpty()) {
            return true;
        }
        String hay = ((p.getName() != null ? p.getName() : "") + " " + (p.getProductCode() != null ? p.getProductCode() : ""))
                .toLowerCase(Locale.ROOT);
        if (q.length() >= 2 && hay.contains(q)) {
            return true;
        }
        for (String part : q.split("\\s+")) {
            if (part.length() >= 2 && hay.contains(part)) {
                return true;
            }
        }
        return false;
    }

    private List<ProductResponseDTO> mapProductsForStorefront(List<Product> products, Integer storefrontUserId) {
        if (products == null || products.isEmpty()) {
            return Collections.emptyList();
        }
        User user = null;
        if (storefrontUserId != null) {
            try {
                user = userService.getUserById(storefrontUserId);
            } catch (Exception e) {
                log.debug("AI chat: bỏ qua map giá — userId không hợp lệ: {}", storefrontUserId);
            }
        }
        return productMapperService.toDTOs(products, user);
    }

    private String buildCategoryCatalog() {
        List<Category> all = categoryRepository.findAll();
        return all.stream()
                .limit(80)
                .map(c -> c.getId() + ": " + c.getName())
                .collect(Collectors.joining("\n"));
    }

    private ProductSearchOutcome runProductSearch(JsonNode aiJson, String userMessageFallback) {
        String search = firstNonBlank(
                aiJson.path("search").asText(""),
                aiJson.path("keyword").asText("")
        ).trim();

        List<Integer> categoryIds = parseCategoryIds(aiJson);

        BigDecimal minPrice = parseMoney(aiJson, "minPrice");
        BigDecimal maxPrice = parseMoney(aiJson, "maxPrice");
        VndRange fromMsg = extractVndRangeFromMessage(userMessageFallback);
        if (fromMsg != null) {
            if (minPrice == null) {
                minPrice = fromMsg.min();
            }
            if (maxPrice == null) {
                maxPrice = fromMsg.max();
            }
        }

        List<String> brands = parseBrands(aiJson);

        if (search.isEmpty() && userMessageFallback != null) {
            boolean hasStructuredFilters = minPrice != null || maxPrice != null
                    || !categoryIds.isEmpty()
                    || !brands.isEmpty();
            if (hasStructuredFilters) {
                // Tránh LIKE trên cả câu tiếng Việt (không khớp tên SP → 0 kết quả dù có khoảng giá).
                search = "";
            } else {
                String fb = userMessageFallback.replace("[Tìm kiếm cửa hàng]", "").trim();
                if (fb.length() > 200) {
                    fb = fb.substring(0, 200);
                }
                search = fb;
            }
        }

        String sortBy = aiJson.path("sortBy").asText("none").trim().toLowerCase();

        Sort sort = switch (sortBy) {
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "basePrice").and(Sort.by(Sort.Direction.DESC, "id"));
            case "price_asc" -> Sort.by(Sort.Direction.ASC, "basePrice").and(Sort.by(Sort.Direction.DESC, "id"));
            default -> Sort.by(Sort.Direction.DESC, "id");
        };

        Specification<Product> baseSpec = ProductSpecification.filterProducts(
                search.isEmpty() ? null : search,
                categoryIds,
                minPrice,
                maxPrice,
                brands,
                null);

        String rankingBase = search.isBlank()
                ? extractProductSearchHint(userMessageFallback != null ? userMessageFallback : "")
                : search.trim();

        var page = productRepository.findAll(baseSpec, PageRequest.of(0, 20, sort));
        List<Product> found = page.getContent();
        if (!found.isEmpty()) {
            return new ProductSearchOutcome(found, rankingBase);
        }

        LinkedHashSet<String> attempts = new LinkedHashSet<>();
        if (userMessageFallback != null) {
            String hint = extractProductSearchHint(userMessageFallback);
            if (!hint.isBlank()) {
                attempts.add(hint);
                for (String t : hint.split("\\s+")) {
                    if (t.length() >= 2) {
                        attempts.add(t);
                    }
                }
            }
        }
        if (!search.isBlank()) {
            for (String t : search.trim().split("\\s+")) {
                if (t.length() >= 2) {
                    attempts.add(t);
                }
            }
        }
        for (String att : attempts) {
            if (att == null || att.isBlank()) {
                continue;
            }
            if (att.equalsIgnoreCase(search.trim())) {
                continue;
            }
            var page2 = productRepository.findAll(
                    ProductSpecification.filterProducts(att, categoryIds, minPrice, maxPrice, brands, null),
                    PageRequest.of(0, 20, sort));
            if (!page2.getContent().isEmpty()) {
                log.debug("AI product_search fallback hit: search '{}' → {} rows", att, page2.getContent().size());
                return new ProductSearchOutcome(page2.getContent(), att.trim());
            }
        }
        return new ProductSearchOutcome(Collections.emptyList(), rankingBase);
    }

    /** Ưu tiên tên/mã khớp từ khóa, sau đó tồn kho cao hơn (ít “random” theo id). */
    private List<Product> rankProductsForAi(List<Product> products, String userMessage, String primarySearch) {
        if (products == null || products.isEmpty()) {
            return products;
        }
        String q = mergeRankingQuery(primarySearch, userMessage);
        List<Integer> ids = products.stream().map(Product::getId).filter(Objects::nonNull).toList();
        Map<Integer, Integer> stock = new HashMap<>();
        if (!ids.isEmpty()) {
            List<Object[]> rows = productVariantRepository.sumSellableStockByProductIds(ids);
            if (rows != null) {
                for (Object[] row : rows) {
                    if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                        stock.put(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
                    }
                }
            }
        }
        List<Product> copy = new ArrayList<>(products);
        copy.sort(Comparator
                .comparingInt((Product p) -> relevanceScore(p, q)).reversed()
                .thenComparingInt((Product p) -> stock.getOrDefault(p.getId(), 0)).reversed()
                .thenComparingInt((Product p) -> p.getId() != null ? p.getId() : 0).reversed());
        return copy;
    }

    private static String mergeRankingQuery(String primarySearch, String userMessage) {
        String p = primarySearch != null ? primarySearch.trim().toLowerCase(Locale.ROOT) : "";
        String hint = extractProductSearchHint(userMessage != null ? userMessage : "");
        if (!p.isEmpty() && !hint.isEmpty()) {
            return (p + " " + hint).trim();
        }
        return !p.isEmpty() ? p : hint;
    }

    private static int relevanceScore(Product p, String q) {
        if (q == null || q.isBlank()) {
            return 0;
        }
        String name = (p.getName() != null ? p.getName() : "").toLowerCase(Locale.ROOT);
        String code = (p.getProductCode() != null ? p.getProductCode() : "").toLowerCase(Locale.ROOT);
        String hay = name + " " + code;
        int score = 0;
        String norm = q.trim().toLowerCase(Locale.ROOT);
        if (norm.length() >= 2 && hay.contains(norm)) {
            score += 50;
        }
        for (String part : norm.split("\\s+")) {
            if (part.length() < 2) {
                continue;
            }
            if (name.startsWith(part)) {
                score += 8;
            }
            if (hay.contains(part)) {
                score += 4;
            }
        }
        return score;
    }

    private List<AIBundleSummaryDTO> resolveBundles(List<Product> products, String userMessage, JsonNode aiJson) {
        LinkedHashSet<Long> seen = new LinkedHashSet<>();
        List<AIBundleSummaryDTO> out = new ArrayList<>();
        List<String> tokens = bundleSearchTokens(userMessage, aiJson);
        for (String tok : tokens) {
            if (tok.length() < 2) {
                continue;
            }
            Page<Bundle> page = bundleRepository.findByStatusAndNameContainingIgnoreCaseOrderByIdDesc(
                    Bundle.BundleStatus.ACTIVE, tok, PageRequest.of(0, 4));
            for (Bundle b : page.getContent()) {
                if (seen.add(b.getId())) {
                    out.add(toBundleSummary(b));
                }
                if (out.size() >= 6) {
                    return out;
                }
            }
        }
        if (products != null) {
            int cap = Math.min(products.size(), 10);
            for (int i = 0; i < cap; i++) {
                Product p = products.get(i);
                if (p == null || p.getId() == null) {
                    continue;
                }
                for (Bundle b : bundleRepository.findActiveContainingProductId(p.getId())) {
                    if (seen.add(b.getId())) {
                        out.add(toBundleSummary(b));
                    }
                    if (out.size() >= 6) {
                        return out;
                    }
                }
            }
        }
        return out;
    }

    private static AIBundleSummaryDTO toBundleSummary(Bundle b) {
        return AIBundleSummaryDTO.builder()
                .id(b.getId())
                .name(b.getName())
                .newPrice(b.getNewPrice())
                .oldPrice(b.getOldPrice())
                .imageUrl(b.getImageUrl())
                .build();
    }

    private static List<String> bundleSearchTokens(String userMessage, JsonNode aiJson) {
        String a = firstNonBlank(aiJson.path("search").asText(""), aiJson.path("keyword").asText(""));
        String raw = ((userMessage != null ? userMessage : "") + " " + a).toLowerCase(Locale.ROOT);
        raw = raw.replace("[tìm kiếm cửa hàng]", " ");
        String[] parts = raw.split("\\s+");
        LinkedHashSet<String> uniq = new LinkedHashSet<>();
        for (String p : parts) {
            String t = p.replaceAll("[^\\p{L}\\p{N}]+", "").trim();
            if (t.length() >= 2) {
                uniq.add(t);
            }
        }
        List<String> list = new ArrayList<>(uniq);
        list.sort(Comparator.comparingInt(String::length).reversed());
        return list;
    }

    /**
     * Trích khoảng giá từ câu khách (vd: {@code 100000 - 2000000}, {@code 100.000 đến 2.000.000}).
     */
    private static VndRange extractVndRangeFromMessage(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.replace("[Tìm kiếm cửa hàng]", "").trim();
        Pattern p1 = Pattern.compile("(\\d[\\d\\s\\.,]*)\\s*[-–—]+\\s*(\\d[\\d\\s\\.,]*)");
        Matcher m1 = p1.matcher(s);
        if (m1.find()) {
            BigDecimal a = parseLooseVndNumber(m1.group(1));
            BigDecimal b = parseLooseVndNumber(m1.group(2));
            if (a != null && b != null) {
                return a.compareTo(b) <= 0 ? new VndRange(a, b) : new VndRange(b, a);
            }
        }
        Pattern p2 = Pattern.compile(
                "(\\d[\\d\\s\\.,]*)\\s+(?:đến|tới)\\s+(\\d[\\d\\s\\.,]*)",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        Matcher m2 = p2.matcher(s);
        if (m2.find()) {
            BigDecimal a = parseLooseVndNumber(m2.group(1));
            BigDecimal b = parseLooseVndNumber(m2.group(2));
            if (a != null && b != null) {
                return a.compareTo(b) <= 0 ? new VndRange(a, b) : new VndRange(b, a);
            }
        }
        return null;
    }

    private static BigDecimal parseLooseVndNumber(String g) {
        if (g == null) {
            return null;
        }
        String t = g.trim().replace(",", "").replace(" ", "").replace("đ", "").replace("₫", "");
        if (t.matches("\\d{1,3}(\\.\\d{3})+")) {
            t = t.replace(".", "");
        }
        if (t.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(t);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static List<Integer> parseCategoryIds(JsonNode aiJson) {
        List<Integer> out = new ArrayList<>();
        JsonNode arr = aiJson.path("categoryIds");
        if (arr.isArray()) {
            for (JsonNode n : arr) {
                if (n.isNumber()) {
                    out.add(n.asInt());
                } else if (n.isTextual()) {
                    try {
                        out.add(Integer.parseInt(n.asText().trim()));
                    } catch (NumberFormatException ignored) {
                        // skip
                    }
                }
            }
        }
        JsonNode single = aiJson.path("categoryId");
        if (single.isNumber()) {
            out.add(single.asInt());
        } else if (single.isTextual()) {
            try {
                out.add(Integer.parseInt(single.asText().trim()));
            } catch (NumberFormatException ignored) {
                // skip
            }
        }
        return out.isEmpty() ? Collections.emptyList() : out;
    }

    private static List<String> parseBrands(JsonNode aiJson) {
        JsonNode arr = aiJson.path("brands");
        if (!arr.isArray()) {
            String one = aiJson.path("brand").asText("").trim();
            return one.isEmpty() ? Collections.emptyList() : List.of(one);
        }
        return StreamSupport.stream(arr.spliterator(), false)
                .filter(JsonNode::isTextual)
                .map(n -> n.asText("").trim())
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private static BigDecimal parseMoney(JsonNode root, String field) {
        JsonNode n = root.path(field);
        if (n.isMissingNode() || n.isNull()) {
            return null;
        }
        if (n.isNumber()) {
            return BigDecimal.valueOf(n.asDouble());
        }
        String s = n.asText("").trim().replace(",", "").replace(" ", "");
        if (s.matches("\\d{1,3}(\\.\\d{3})+")) {
            s = s.replace(".", "");
        }
        if (s.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        return b != null ? b : "";
    }

    private String buildPrompt(String userMessage, String siteMarkdown, String categoryCatalog, String storefrontContext) {
        String site = (siteMarkdown == null || siteMarkdown.isBlank())
                ? "(Chưa có tài liệu site-context.)"
                : siteMarkdown;
        String ctxBlock = (storefrontContext == null || storefrontContext.isBlank())
                ? "(Không có ngữ cảnh phiên từ frontend.)"
                : storefrontContext.trim();
        return String.format(
                """
                        Bạn là "Luxe Assistant" — trợ lý ảo của shop thời trang WSSTYLE (B2B + storefront).

                        ## TÀI LIỆU VỀ WEB (RAG tĩnh — chỉ trả lời site_help dựa trên đây, không bịa thêm tính năng)
                        %s

                        ## DANH MỤC (id: tên) — dùng khi product_search
                        %s

                        ## NGỮ CẢNH PHIÊN (do frontend gửi — chỉ diễn đạt lịch sự, không bịa số nếu khối này nói "không có dữ liệu")
                        %s

                        ## CÂU KHÁCH
                        "%s"

                        ## QUY TẮC
                        1. Trả về **duy nhất** một JSON hợp lệ; không bọc JSON trong markdown code fence; không thêm ký tự ngoài JSON. Trường **message** là chuỗi JSON — bên trong **có thể** có HTML an toàn: `<a href="...">`, `<strong>`, `<em>`, `<br>`, `<small>` (để link storefront).
                        2. intent:
                           - "site_help" — hỏi về cách dùng web, luồng mua hàng, đăng nhập, đăng ký đối tác… (dựa tài liệu). **Không** dùng site_help để hướng dẫn quản trị nội bộ.
                           - "product_search" — muốn xem/tìm/mua/lọc sản phẩm, giá, thương hiệu, danh mục, **màu sắc**, **cỡ/size**, hỏi shop **có bán … không** (bắt buộc dùng product_search, không dùng chat/site_help thay cho tra cứu hàng).
                           - "chat" — chào hỏi, cảm ơn, trò chuyện ngắn không cần DB.
                        3. message (tiếng Việt, thân thiện; emoji nhẹ được):
                           - **Tên mục trước, đường dẫn sau**: khi chỉ đường, gọi **tên trang / tên menu** (vd. "Giỏ hàng", "Thanh toán", "Hồ sơ & đơn hàng", "Shop", "Đánh giá sản phẩm", "Hỗ trợ", "Trợ lý AI"). **Hạn chế** viết `/cart` hoặc `/checkout` **trần** ở đầu câu hoặc lặp lại nhiều lần không có ngữ cảnh.
                           - **Link storefront**: dùng `<a href="/đúng-đường-dẫn-từ-bảng-site-context">Tên mục</a>`; `href` chỉ từ tài liệu site-context (storefront), **không** `/admin`.
                           - **Luồng mua / sau khi gợi ý sản phẩm**: trong message nên có **2–4** gợi ý liên quan khi phù hợp (vd. thêm vào giỏ → **Giỏ hàng**; thanh toán → **Thanh toán**; xem đơn → **Hồ sơ & đơn hàng** tại `/profile`; xem thêm SP → **Shop** `/shop`; đọc đánh giá → **Đánh giá** `/customer-reviews`; cần trợ giúp → **Hỗ trợ** `/support`).
                           - **product_search**: ngoài mô tả, có thể thêm 1 dòng gợi ý bước tiếp (Giỏ hàng / Thanh toán / Shop) bằng thẻ `<a>` như trên.
                        4. product_search:
                           - Điền search/keyword chỉ khi có **từ khóa ngắn** (tên, mã, thương hiệu, màu, size). Nếu khách chỉ lọc theo **khoảng giá** hoặc "vài sản phẩm" trong khoảng giá → đặt search và keyword là **chuỗi rỗng** "" và điền **minPrice**, **maxPrice** (số VNĐ, ví dụ 100000 và 2000000).
                           - categoryId / categoryIds, minPrice, maxPrice (VNĐ), brands, sortBy: none | price_asc | price_desc.
                        5. Không đưa giá cụ thể từng SKU trong message trừ khi ngữ cảnh phiên có số rõ ràng; giá trên thẻ sản phẩm do hệ thống hiển thị sau truy vấn.
                        6. **Quản trị /admin**: Nếu khách hỏi panel admin, rule nội bộ, API key, SQL, nhân viên, dữ liệu người khác → intent **chat**, message từ chối lịch sự; **không** đưa link `/admin`; gợi **Hỗ trợ** hoặc liên hệ shop.
                        7. Nếu không chắc intent → site_help hoặc chat, message hỏi lại ngắn gọn.
                        8. **product_search — tồn kho:** API trả mỗi sản phẩm thêm `totalStock` (tổng tồn SKU đang bán). Trong message, nêu rõ: **hết hàng** nếu 0; **còn hàng** nếu >0; có thể nói **sắp hết** nếu số rất thấp (vd. dưới 5) và hợp ngữ cảnh.
                        9. **product_search — giá sỉ / B2B:** Giá trên thẻ (`calculatedPrice`) đã theo tài khoản & rule khi backend map được. **Không** viết câu kiểu «toàn bộ sản phẩm hiển thị đã áp giá sỉ / đã chiết khấu nhóm B2B» trừ khi **từng** mục trong mảng `products` có bằng chứng ưu đãi: `discountLabel`, hoặc `quantityBreaksJson` không rỗng, hoặc (khi có cả hai) `calculatedPrice` rõ ràng thấp hơn `basePrice`. Nếu không có dấu hiệu đó trên thẻ, nói đúng là giá niêm yết / giá theo rule hiển thị thuế, không suy diễn thêm.
                        10. **product_search — combo/bundle:** Response có thể có mảng `bundles` (id, tên, giá). Khi có, trong message giới thiệu 1–2 combo liên quan và dùng `<a href="/bundle/{id}">Tên combo</a>` (id từ payload `bundles`).
                        11. **Gợi ý giá sỉ (FE + BE):** Request có thể kèm `pricingHintProductIds` / `pricingHintCategoryIds` (mảng số). Backend tính từ rule ACTIVE (QUANTITY_BREAK, B2B_PRICE) khớp khách, **gồm** rule SPECIFIC theo `variantIds` (map sang productId). Khi khách hỏi giá sỉ / mua sỉ, danh sách `products` trả về đã ưu tiên đúng phạm vi đó — trong message chỉ nêu các SP thực sự có trong payload, không mở rộng sang cả catalog.
                        12. **Nhóm khách B2B:** Thuộc nhóm B2B không có nghĩa mọi SKU đều đang giảm; chỉ SP nằm trong rule (và có dấu hiệu trên thẻ như mục 9) mới mô tả là có ưu đãi sỉ / B2B.

                        ## JSON SCHEMA
                        {
                          "intent": "site_help" | "product_search" | "chat",
                          "message": "string",
                          "search": "string hoặc rỗng",
                          "keyword": "alias của search, có thể rỗng",
                          "categoryId": null,
                          "categoryIds": [],
                          "minPrice": null,
                          "maxPrice": null,
                          "brand": "string hoặc rỗng",
                          "brands": [],
                          "sortBy": "none" | "price_asc" | "price_desc"
                        }
                        """,
                site,
                categoryCatalog.isBlank() ? "(Không có danh mục.)" : categoryCatalog,
                ctxBlock,
                userMessage.replace("\"", "'"));
    }

    /**
     * Gọi Gemini: auth qua header {@code x-goog-api-key} (khuyến nghị Google; hỗ trợ key có ký tự {@code .}).
     */
    private String callGeminiApi(String url, String apiKey, String prompt) {
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
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
                log.error("Gemini HTTP {}: {}", response.statusCode(), response.body());
                return "API_ERROR_" + response.statusCode();
            }

            JsonNode resJson = objectMapper.readTree(response.body());
            JsonNode candidates = resJson.path("candidates");
            if (candidates.isMissingNode() || candidates.isEmpty()) {
                return null;
            }
            return candidates.get(0).path("content").path("parts").get(0).path("text").asText();
        } catch (Exception e) {
            log.error("Gemini API exception: {}", e.getMessage());
            return null;
        }
    }

    private JsonNode parseAiJson(String jsonText) {
        try {
            if (jsonText == null) {
                return null;
            }
            String clean = jsonText.trim();
            int first = clean.indexOf('{');
            int last = clean.lastIndexOf('}');
            if (first != -1 && last > first) {
                clean = clean.substring(first, last + 1);
            }
            return objectMapper.readTree(clean);
        } catch (Exception e) {
            log.warn("Parse AI JSON failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Nếu model trả chat/site_help nhưng câu khách rõ ràng là hỏi hàng → ép product_search + gợi ý search
     * (tránh chỉ có text "sẽ tìm giúp bạn" mà không có danh sách sản phẩm).
     */
    private JsonNode maybeForceProductSearch(String userMessage, JsonNode aiJson) {
        String intent = aiJson.path("intent").asText("").trim().toLowerCase();
        if ("product_search".equals(intent)) {
            return aiJson;
        }
        if (userMessage == null || !looksLikeProductCatalogQuestion(userMessage)) {
            return aiJson;
        }
        String hint = "";
        try {
            ObjectNode o = (ObjectNode) objectMapper.readTree(aiJson.toString());
            o.put("intent", "product_search");
            hint = extractProductSearchHint(userMessage);
            if (!hint.isBlank()) {
                o.put("search", hint);
                o.put("keyword", hint);
            }
            log.debug("AI: ép product_search từ intent={}, hint={}", intent, hint);
            return o;
        } catch (Exception e) {
            log.warn("maybeForceProductSearch: {}", e.getMessage());
            return aiJson;
        }
    }

    private static boolean looksLikeProductCatalogQuestion(String msg) {
        String m = msg.toLowerCase();
        if (m.contains("sản phẩm") || m.contains("san pham")) {
            return true;
        }
        if (m.contains("mua ") || m.contains("mua áo") || m.contains("tìm ") || m.contains("tim ")) {
            return true;
        }
        if (m.contains("có ") && (m.contains("không") || m.contains("ko") || m.contains("k "))) {
            return true;
        }
        if (m.contains("áo") || m.contains("quần") || m.contains("quan") || m.contains("váy")
                || m.contains("vay") || m.contains("giày") || m.contains("giay") || m.contains("túi") || m.contains("tui")) {
            return true;
        }
        if (m.contains("màu") || m.contains("mau") || m.contains("size") || m.contains("navy")
                || m.contains("đen") || m.contains("den") || m.contains("trắng") || m.contains("trang")) {
            return true;
        }
        if (m.contains("combo") || m.contains("bundle") || m.contains("gói") || m.contains(" goi")
                || m.contains("giá sỉ") || m.contains("gia si") || m.contains(" sỉ") || m.contains(" si ")
                || m.contains("tồn") || m.contains(" ton ") || m.contains("kho ")) {
            return true;
        }
        return m.contains("shop ") && (m.contains("bán") || m.contains("ban"));
    }

    /** Bỏ từ dừng tiếng Việt, giữ cụm từ khóa tìm kiếm ngắn. */
    private static String extractProductSearchHint(String userMessage) {
        String s = userMessage.replace("[Tìm kiếm cửa hàng]", "").trim();
        s = s.toLowerCase()
                .replaceAll("\\?+", " ")
                .replaceAll("\\s+", " ")
                .trim();
        s = s.replaceAll(
                "(?i)\\b(shop|bạn|ban|cho|tôi|toi|mình|minh|co|không|khong|ko|\\bk\\b|có|hang|hàng|mua|tìm|tim|"
                        + "giúp|giup|giùm|gium|với|voi|nào|nao|ạ|\\ba\\b|nhé|nhe|luôn|luon|được|duoc|bán|ban|"
                        + "một|mot|vài|vai|some|any|màu|mau)\\b",
                " ");
        s = s.replaceAll("(?i)\\b(combo|bundle|gói|goi|set|bộ|bo)\\b", " ");
        s = s.replaceAll("\\s+", " ").trim();
        if (s.length() > 80) {
            s = s.substring(0, 80).trim();
        }
        return s;
    }
}
