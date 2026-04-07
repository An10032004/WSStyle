package com.fashionstore.core.service;

import com.fashionstore.core.model.*;
import com.fashionstore.core.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuleCoreService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PricingRuleRepository pricingRuleRepository;
    private final HidePriceRuleRepository hidePriceRuleRepository;
    private final SaleCampaignRepository saleCampaignRepository;
    private final TaxDisplayRuleRepository taxDisplayRuleRepository;
    private final NetTermRuleRepository netTermRuleRepository;

    /**
     * Common interface-like data holder for rule targeting
     */
    public static class RuleTarget {
        public String applyProductType; // ALL, CATEGORY, SPECIFIC
        public String applyProductValue; // JSON: { categoryIds: [], productIds: [] }
        public String applyCustomerType; // ALL, GUEST, LOGGED_IN, GROUP
        public String applyCustomerValue; // JSON: { groupIds: [] }
        public Integer priority;
        public String name;
    }

    public boolean isCustomerMatch(String applyCustomerType, String applyCustomerValue, User user) {
        if (applyCustomerType == null || applyCustomerType.equals("ALL")) return true;
        
        if (applyCustomerType.equals("GUEST")) {
            return user == null;
        }
        
        if (applyCustomerType.equals("LOGGED_IN")) {
            return user != null;
        }
        
        if (applyCustomerType.equals("GROUP")) {
            if (user == null || user.getCustomerGroup() == null) return false;
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> val = objectMapper.readValue(applyCustomerValue, Map.class);
                @SuppressWarnings("unchecked")
                List<Integer> groupIds = (List<Integer>) val.get("groupIds");
                return groupIds != null && groupIds.contains(user.getCustomerGroup().getId());
            } catch (Exception e) {
                log.error("Error parsing customer targeting value: {}", applyCustomerValue);
                return false;
            }
        }
        
        return false;
    }

    public boolean isProductMatch(String applyProductType, String applyProductValue, Integer productId, Integer categoryId) {
        if (applyProductType == null || applyProductType.equals("ALL")) return true;
        
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> val = objectMapper.readValue(applyProductValue, Map.class);
            if (applyProductType.equals("CATEGORY") || applyProductType.equals("GROUP")) {
                @SuppressWarnings("unchecked")
                List<Integer> categoryIds = (List<Integer>) val.get("categoryIds");
                return categoryIds != null && categoryIds.contains(categoryId);
            }
            if (applyProductType.equals("SPECIFIC")) {
                @SuppressWarnings("unchecked")
                List<Integer> productIds = (List<Integer>) val.get("productIds");
                return productIds != null && productIds.contains(productId);
            }
        } catch (Exception e) {
            log.error("Error parsing product targeting value: {}", applyProductValue);
            return false;
        }
        
        return false;
    }

    /**
     * Check if a new rule is "blocked" by any existing rule with higher priority (lower number)
     */
    public List<String> detectConflicts(RuleTarget newRule, List<RuleTarget> existingRules) {
        List<String> conflicts = new ArrayList<>();
        
        for (RuleTarget existing : existingRules) {
            // A conflict occurs if:
            // 1. Their product targeting overlaps
            // 2. Their customer targeting overlaps
            // 3. ONE of them has higher priority (lower number)
            
            boolean productOverlap = checkProductOverlap(newRule, existing);
            boolean customerOverlap = checkCustomerOverlap(newRule, existing);
            
            if (productOverlap && customerOverlap) {
                if (existing.priority < newRule.priority) {
                    conflicts.add("BỊ CHẶN: Quy tắc này sẽ BỊ BỎ QUA do trùng điều kiện áp dụng với '" + existing.name + "' (quy tắc kia có mức ưu tiên cao hơn: " + existing.priority + ")");
                } else if (existing.priority > newRule.priority) {
                    conflicts.add("CẢNH BÁO: Quy tắc này sẽ GHI ĐÈ lên '" + existing.name + "' ở những phần trùng điều kiện, do nó có mức ưu tiên cao hơn (" + newRule.priority + ")");
                } else if (existing.priority.equals(newRule.priority)) {
                    conflicts.add("LỖI ƯU TIÊN: Quy tắc này có cùng mức ưu tiên (" + newRule.priority + ") với '" + existing.name + "'. Hệ thống sẽ không biệt áp dụng cái nào trước, vui lòng đổi mức ưu tiên!");
                }
            }
        }
        
        return conflicts;
    }

    /** CATEGORY và GROUP đều lọc theo {@code categoryIds} trong JSON (đồng bộ OrderLimit / Pricing). */
    private static boolean isProductCategoryLike(String applyProductType) {
        return "CATEGORY".equals(applyProductType) || "GROUP".equals(applyProductType);
    }

    private boolean checkProductOverlap(RuleTarget r1, RuleTarget r2) {
        if (r1.applyProductType.equals("ALL") || r2.applyProductType.equals("ALL")) return true;

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> v1 = objectMapper.readValue(r1.applyProductValue, Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> v2 = objectMapper.readValue(r2.applyProductValue, Map.class);

            if (r1.applyProductType.equals(r2.applyProductType)) {
                String key = isProductCategoryLike(r1.applyProductType) ? "categoryIds" : "productIds";
                @SuppressWarnings("unchecked")
                List<Integer> ids1 = (List<Integer>) v1.get(key);
                @SuppressWarnings("unchecked")
                List<Integer> ids2 = (List<Integer>) v2.get(key);
                return ids1 != null && ids2 != null && !Collections.disjoint(ids1, ids2);
            }
            // Hai loại khác nhau nhưng cùng lọc theo danh mục (CATEGORY vs GROUP): so sánh tập categoryIds.
            if (isProductCategoryLike(r1.applyProductType) && isProductCategoryLike(r2.applyProductType)) {
                @SuppressWarnings("unchecked")
                List<Integer> ids1 = (List<Integer>) v1.get("categoryIds");
                @SuppressWarnings("unchecked")
                List<Integer> ids2 = (List<Integer>) v2.get("categoryIds");
                return ids1 != null && ids2 != null && !Collections.disjoint(ids1, ids2);
            }
            // CATEGORY/GROUP vs SPECIFIC: có thể giao nhau — giữ an toàn.
            if (isProductCategoryLike(r1.applyProductType) && "SPECIFIC".equals(r2.applyProductType)) return true;
            if ("SPECIFIC".equals(r1.applyProductType) && isProductCategoryLike(r2.applyProductType)) return true;
            return true;
        } catch (Exception e) {
            return true; // Overlap on error
        }
    }

    private boolean checkCustomerOverlap(RuleTarget r1, RuleTarget r2) {
        if (r1.applyCustomerType.equals("ALL") || r2.applyCustomerType.equals("ALL")) return true;
        
        // LOGGED_IN overlaps with any specific GROUP
        if (r1.applyCustomerType.equals("LOGGED_IN") && r2.applyCustomerType.equals("GROUP")) return true;
        if (r2.applyCustomerType.equals("LOGGED_IN") && r1.applyCustomerType.equals("GROUP")) return true;
        
        if (r1.applyCustomerType.equals(r2.applyCustomerType) && r1.applyCustomerType.equals("GROUP")) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> v1 = objectMapper.readValue(r1.applyCustomerValue, Map.class);
                @SuppressWarnings("unchecked")
                Map<String, Object> v2 = objectMapper.readValue(r2.applyCustomerValue, Map.class);
                @SuppressWarnings("unchecked")
                List<Integer> g1 = (List<Integer>) v1.get("groupIds");
                @SuppressWarnings("unchecked")
                List<Integer> g2 = (List<Integer>) v2.get("groupIds");
                return g1 != null && g2 != null && !Collections.disjoint(g1, g2);
            } catch (Exception e) {
                return true;
            }
        }
        
        return r1.applyCustomerType.equals(r2.applyCustomerType);
    }

    /**
     * Hai quy tắc giới hạn đơn hàng có phạm vi KH + SP chồng lên nhau (giống logic detectConflicts / bảng giá).
     * Dùng để chỉ giữ quy tắc có priority nhỏ hơn khi cùng kiểu cạnh tranh (ví dụ hai MAX cùng cấp).
     */
    public boolean orderLimitTargetingOverlaps(OrderLimit a, OrderLimit b) {
        if (a == null || b == null) {
            return false;
        }
        RuleTarget ta = ruleTargetFromOrderLimit(a);
        RuleTarget tb = ruleTargetFromOrderLimit(b);
        return checkProductOverlap(ta, tb) && checkCustomerOverlap(ta, tb);
    }

    private static RuleTarget ruleTargetFromOrderLimit(OrderLimit r) {
        RuleTarget t = new RuleTarget();
        t.applyCustomerType = r.getApplyCustomerType() != null ? r.getApplyCustomerType() : "ALL";
        t.applyCustomerValue = r.getApplyCustomerValue();
        t.applyProductType = r.getApplyProductType() != null ? r.getApplyProductType() : "ALL";
        t.applyProductValue = r.getApplyProductValue();
        return t;
    }

    public List<PricingRule> getAllActivePricingRules() {
        return pricingRuleRepository.findAll().stream().filter(r -> "ACTIVE".equals(r.getStatus())).toList();
    }

    public List<HidePriceRule> getAllActiveHidePriceRules() {
        return hidePriceRuleRepository.findAll().stream().filter(r -> "ACTIVE".equals(r.getStatus())).toList();
    }

    public List<NetTermRule> getAllActiveNetTermRules() {
        return netTermRuleRepository.findAll().stream().filter(r -> "ACTIVE".equals(r.getStatus())).toList();
    }

    public List<SaleCampaign> getAllActiveSaleCampaigns() {
        return saleCampaignRepository.findAll().stream().filter(r -> "ACTIVE".equals(r.getStatus())).toList();
    }

    public List<TaxDisplayRule> getAllActiveTaxRules() {
        return taxDisplayRuleRepository.findAll().stream().filter(r -> "ACTIVE".equals(r.getStatus())).toList();
    }

    public Optional<PricingRule> findBestPricingRule(Integer productId, Integer categoryId, User user, List<PricingRule> rules) {
        return rules.stream()
                .filter(r -> isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .filter(r -> isProductMatch(r.getApplyProductType(), r.getApplyProductValue(), productId, categoryId))
                .min(Comparator.comparing(PricingRule::getPriority));
    }

    public Optional<PricingRule> findBestPricingRule(Integer productId, Integer categoryId, User user) {
        return findBestPricingRule(productId, categoryId, user, getAllActivePricingRules());
    }

    public Optional<HidePriceRule> findBestHidePriceRule(Integer productId, Integer categoryId, User user, List<HidePriceRule> rules) {
        return rules.stream()
                .filter(r -> isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .filter(r -> isProductMatch(r.getApplyProductType(), r.getApplyProductValue(), productId, categoryId))
                .min(Comparator.comparing(HidePriceRule::getPriority));
    }

    public Optional<HidePriceRule> findBestHidePriceRule(Integer productId, Integer categoryId, User user) {
        return findBestHidePriceRule(productId, categoryId, user, getAllActiveHidePriceRules());
    }

    public Optional<NetTermRule> findBestNetTermRule(User user, List<NetTermRule> rules) {
        return rules.stream()
                .filter(r -> isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .min(Comparator.comparing(NetTermRule::getPriority));
    }

    public Optional<NetTermRule> findBestNetTermRule(User user) {
        return findBestNetTermRule(user, getAllActiveNetTermRules());
    }

    public Optional<SaleCampaign> findBestSaleCampaign(Integer productId, Integer categoryId, User user, List<SaleCampaign> rules) {
        return rules.stream()
                .filter(r -> isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .filter(r -> isProductMatch(r.getApplyProductType(), r.getApplyProductValue(), productId, categoryId))
                .min(Comparator.comparing(SaleCampaign::getPriority));
    }

    public Optional<SaleCampaign> findBestSaleCampaign(Integer productId, Integer categoryId, User user) {
        return findBestSaleCampaign(productId, categoryId, user, getAllActiveSaleCampaigns());
    }

    public Optional<TaxDisplayRule> findBestTaxRule(Integer productId, Integer categoryId, User user, List<TaxDisplayRule> rules) {
        return rules.stream()
                .filter(r -> isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .filter(r -> isProductMatch(r.getApplyProductType(), r.getApplyProductValue(), productId, categoryId))
                .min(Comparator.comparing(TaxDisplayRule::getPriority));
    }

    public Optional<TaxDisplayRule> findBestTaxRule(Integer productId, Integer categoryId, User user) {
        return findBestTaxRule(productId, categoryId, user, getAllActiveTaxRules());
    }

    public boolean isPriorityUnique(String ruleType, Integer priority, Integer excludeId) {
        boolean exists = false;
        switch (ruleType) {
            case "PRICING":
                exists = pricingRuleRepository.findAll().stream()
                        .anyMatch(r -> r.getPriority().equals(priority) && !r.getId().equals(excludeId));
                break;
            case "HIDE_PRICE":
                exists = hidePriceRuleRepository.findAll().stream()
                        .anyMatch(r -> r.getPriority().equals(priority) && !r.getId().equals(excludeId));
                break;
            case "NET_TERM":
                exists = netTermRuleRepository.findAll().stream()
                        .anyMatch(r -> r.getPriority().equals(priority) && !r.getId().equals(excludeId));
                break;
            case "SALE":
                exists = saleCampaignRepository.findAll().stream()
                        .anyMatch(r -> r.getPriority().equals(priority) && !r.getId().equals(excludeId));
                break;
        }
        return !exists;
    }
}
