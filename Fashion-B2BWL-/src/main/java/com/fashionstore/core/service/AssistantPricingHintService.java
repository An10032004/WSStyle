package com.fashionstore.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fashionstore.core.dto.response.AssistantPricingHintsDTO;
import com.fashionstore.core.model.PricingRule;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.PricingRuleRepository;
import com.fashionstore.core.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
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

        for (PricingRule rule : pricingRuleRepository.findAll()) {
            if (rule.getStatus() == null || !"ACTIVE".equalsIgnoreCase(rule.getStatus().trim())) {
                continue;
            }
            String rt = rule.getRuleType();
            if (rt == null || (!"QUANTITY_BREAK".equals(rt) && !"B2B_PRICE".equals(rt))) {
                continue;
            }
            if (!ruleCoreService.isCustomerMatch(rule.getApplyCustomerType(), rule.getApplyCustomerValue(), user)) {
                continue;
            }
            String apt = rule.getApplyProductType();
            String apv = rule.getApplyProductValue();
            if (apt == null || "ALL".equalsIgnoreCase(apt) || apv == null || apv.isBlank()) {
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

        return AssistantPricingHintsDTO.builder()
                .pricingHintProductIds(takeFirst(productIds, MAX_PRODUCTS))
                .pricingHintCategoryIds(takeFirst(categoryIds, MAX_CATEGORIES))
                .build();
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
