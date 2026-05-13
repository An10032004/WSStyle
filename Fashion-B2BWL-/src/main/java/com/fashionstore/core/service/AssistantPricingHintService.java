package com.fashionstore.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fashionstore.core.dto.response.AssistantPricingHintsDTO;
import com.fashionstore.core.model.Category;
import com.fashionstore.core.model.PricingRule;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.CategoryRepository;
import com.fashionstore.core.repository.PricingRuleRepository;
import com.fashionstore.core.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Tính danh sách gợi ý giá sỉ cho AI — đồng bộ với {@link RuleCoreService} (gồm SPECIFIC theo {@code variantIds}).
 */
@Service
@RequiredArgsConstructor
public class AssistantPricingHintService {

    /** Giới hạn gửi AI / gộp request — public để {@link AIProductHelperService} union cùng mức trần. */
    public static final int MAX_HINT_PRODUCT_IDS = 80;
    public static final int MAX_HINT_CATEGORY_IDS = 30;

    private static final int MAX_PRODUCTS = MAX_HINT_PRODUCT_IDS;
    private static final int MAX_CATEGORIES = MAX_HINT_CATEGORY_IDS;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PricingRuleRepository pricingRuleRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CategoryRepository categoryRepository;
    private final RuleCoreService ruleCoreService;
    private final UserService userService;

    public AssistantPricingHintsDTO computeHints(Integer storefrontUserId) {
        User user = null;
        if (storefrontUserId != null) {
            try {
                user = userService.getUserById(storefrontUserId);
            } catch (Exception ignored) {
                user = null;
            }
        }

        LinkedHashSet<Integer> productIds = new LinkedHashSet<>();
        LinkedHashSet<Integer> categoryIds = new LinkedHashSet<>();
        List<Integer> variantIdsToResolve = new ArrayList<>();
        boolean wholesaleCoversAllProducts = false;

        for (PricingRule rule : pricingRuleRepository.findAll()) {
            if (rule.getStatus() == null || !"ACTIVE".equalsIgnoreCase(rule.getStatus().trim())) {
                continue;
            }
            String rt = rule.getRuleType();
            if (!isWholesaleHintRuleType(rt)) {
                continue;
            }
            if (!ruleCoreService.isCustomerMatch(rule.getApplyCustomerType(), rule.getApplyCustomerValue(), user)) {
                continue;
            }
            String apt = rule.getApplyProductType();
            String apv = rule.getApplyProductValue();
            if (apt != null && "ALL".equalsIgnoreCase(apt.trim())) {
                wholesaleCoversAllProducts = true;
                continue;
            }
            if (apv == null || apv.isBlank()) {
                continue;
            }
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> val = objectMapper.readValue(apv, Map.class);
                if ("CATEGORY".equalsIgnoreCase(apt) || "GROUP".equalsIgnoreCase(apt)) {
                    for (Integer cid : readIntList(val, "categoryIds")) {
                        if (cid != null && cid > 0 && categoryIds.size() < MAX_CATEGORIES) {
                            categoryIds.add(cid);
                        }
                    }
                } else if ("SPECIFIC".equalsIgnoreCase(apt)) {
                    for (Integer pid : readIntList(val, "productIds")) {
                        if (pid != null && pid > 0 && productIds.size() < MAX_PRODUCTS) {
                            productIds.add(pid);
                        }
                    }
                    variantIdsToResolve.addAll(readIntList(val, "variantIds"));
                }
            } catch (Exception ignored) {
                // skip malformed JSON
            }
        }

        if (!variantIdsToResolve.isEmpty()) {
            List<Integer> distinct = variantIdsToResolve.stream()
                    .filter(Objects::nonNull)
                    .filter(v -> v > 0)
                    .distinct()
                    .toList();
            if (!distinct.isEmpty()) {
                for (ProductVariant pv : productVariantRepository.findAllById(distinct)) {
                    Integer pid = pv.getProductId();
                    if (pid != null && pid > 0 && productIds.size() < MAX_PRODUCTS) {
                        productIds.add(pid);
                    }
                }
            }
        }

        List<String> groupCategoryLabels = resolveCategoryLabels(takeFirst(categoryIds, MAX_CATEGORIES));

        return AssistantPricingHintsDTO.builder()
                .pricingHintProductIds(takeFirst(productIds, MAX_PRODUCTS))
                .pricingHintCategoryIds(takeFirst(categoryIds, MAX_CATEGORIES))
                .wholesaleCoversAllProducts(wholesaleCoversAllProducts)
                .wholesaleMatchedGroupCategoryLabels(groupCategoryLabels)
                .build();
    }

    private List<String> resolveCategoryLabels(List<Integer> orderedCategoryIds) {
        if (orderedCategoryIds == null || orderedCategoryIds.isEmpty()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (Integer cid : orderedCategoryIds) {
            if (cid == null || cid <= 0) {
                continue;
            }
            categoryRepository
                    .findById(cid)
                    .map(Category::getName)
                    .filter(n -> n != null && !n.isBlank())
                    .ifPresentOrElse(
                            name -> out.add(name.trim() + " (id=" + cid + ")"),
                            () -> out.add("(danh mục id=" + cid + ")"));
        }
        return out;
    }

    /**
     * Chuỗi debug (markdown ngắn) mô tả rule QUANTITY_BREAK/B2B ACTIVE khớp khách + hint id gộp — để FE {@code console.log}.
     */
    public String buildAssistantPricingToolSummary(
            Integer storefrontUserId,
            AssistantPricingHintsDTO serverHints,
            List<Integer> mergedProductIds,
            List<Integer> mergedCategoryIds,
            boolean wholesaleEffective,
            boolean hintsNonEmpty) {
        User user = null;
        if (storefrontUserId != null) {
            try {
                user = userService.getUserById(storefrontUserId);
            } catch (Exception ignored) {
                user = null;
            }
        }
        StringBuilder sb = new StringBuilder();
        sb.append("**assistant_pricing_tool**\n");
        sb.append("- userId: ").append(storefrontUserId != null ? storefrontUserId : "null").append('\n');
        sb.append("- wholesaleEffective (currentMsg || conversationCarryover): ").append(wholesaleEffective).append('\n');
        sb.append("- hintsNonEmpty (merged FE+server): ").append(hintsNonEmpty).append('\n');
        sb.append("- serverHintProductIds: ").append(idsPreview(serverHints != null ? serverHints.getPricingHintProductIds() : null)).append('\n');
        sb.append("- serverHintCategoryIds: ").append(idsPreview(serverHints != null ? serverHints.getPricingHintCategoryIds() : null)).append('\n');
        sb.append("- mergedHintProductIds: ").append(idsPreview(mergedProductIds)).append('\n');
        sb.append("- mergedHintCategoryIds: ").append(idsPreview(mergedCategoryIds)).append('\n');
        if (serverHints != null) {
            sb.append("- wholesaleCoversAllProducts: ").append(serverHints.isWholesaleCoversAllProducts()).append('\n');
            List<String> labels = serverHints.getWholesaleMatchedGroupCategoryLabels();
            if (labels != null && !labels.isEmpty()) {
                sb.append("- wholesaleMatchedGroupCategoryLabels: ")
                        .append(String.join(" | ", labels.stream().map(l -> l.replace('\n', ' ')).toList()))
                        .append('\n');
            } else {
                sb.append("- wholesaleMatchedGroupCategoryLabels: (none)\n");
            }
        }

        List<String> matchedRules = new ArrayList<>();
        for (PricingRule rule : pricingRuleRepository.findAll()) {
            if (rule.getStatus() == null || !"ACTIVE".equalsIgnoreCase(rule.getStatus().trim())) {
                continue;
            }
            String rt = rule.getRuleType();
            if (!isWholesaleHintRuleType(rt)) {
                continue;
            }
            if (!ruleCoreService.isCustomerMatch(rule.getApplyCustomerType(), rule.getApplyCustomerValue(), user)) {
                continue;
            }
            String name = rule.getName() != null ? rule.getName() : "";
            matchedRules.add(
                    String.format(
                            Locale.ROOT,
                            "id=%d type=%s name=%s applyProductType=%s",
                            rule.getId() != null ? rule.getId() : -1,
                            rt,
                            name.replace('\n', ' ').trim(),
                            rule.getApplyProductType() != null ? rule.getApplyProductType() : ""));
        }
        sb.append("- matchedActiveWholesaleRulesForCustomer: ").append(matchedRules.size()).append('\n');
        int maxLines = 25;
        for (int i = 0; i < matchedRules.size() && i < maxLines; i++) {
            sb.append("  - ").append(matchedRules.get(i)).append('\n');
        }
        if (matchedRules.size() > maxLines) {
            sb.append("  - … (+").append(matchedRules.size() - maxLines).append(" more)\n");
        }
        return sb.toString();
    }

    private static String idsPreview(List<Integer> ids) {
        if (ids == null || ids.isEmpty()) {
            return "[]";
        }
        int n = Math.min(20, ids.size());
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < n; i++) {
            if (i > 0) {
                b.append(',');
            }
            b.append(ids.get(i));
        }
        if (ids.size() > n) {
            b.append(",…(+").append(ids.size() - n).append(')');
        }
        b.append(']');
        return b.toString();
    }

    /** Chuẩn hoá {@code rule_type} (tránh lệch nếu DB có khoảng trắng / biến thể). */
    private static boolean isWholesaleHintRuleType(String ruleType) {
        if (ruleType == null) {
            return false;
        }
        String n = ruleType.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "_").replaceAll("_+", "_");
        return "QUANTITY_BREAK".equals(n) || "B2B_PRICE".equals(n);
    }

    private static List<Integer> readIntList(Map<String, Object> val, String key) {
        Object raw = val.get(key);
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Integer> out = new ArrayList<>();
        for (Object o : list) {
            if (o instanceof Number n) {
                out.add(n.intValue());
            }
        }
        return out;
    }

    private static List<Integer> takeFirst(Set<Integer> set, int max) {
        List<Integer> out = new ArrayList<>();
        for (Integer id : set) {
            if (out.size() >= max) {
                break;
            }
            out.add(id);
        }
        return out;
    }
}
