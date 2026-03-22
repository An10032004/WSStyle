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
            Map<String, Object> val = objectMapper.readValue(applyProductValue, Map.class);
            if (applyProductType.equals("CATEGORY")) {
                List<Integer> categoryIds = (List<Integer>) val.get("categoryIds");
                return categoryIds != null && categoryIds.contains(categoryId);
            }
            if (applyProductType.equals("SPECIFIC")) {
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
                    conflicts.add("BLOCKED: This rule will be ignored for overlapping targets because '" + existing.name + "' has higher priority (" + existing.priority + ")");
                } else if (existing.priority > newRule.priority) {
                    conflicts.add("WARNING: This rule will OVERRIDE '" + existing.name + "' for overlapping targets because it has higher priority (" + newRule.priority + ")");
                } else if (existing.priority.equals(newRule.priority)) {
                    conflicts.add("CRITICAL: Same priority (" + newRule.priority + ") as '" + existing.name + "'. Application order is undefined!");
                }
            }
        }
        
        return conflicts;
    }

    private boolean checkProductOverlap(RuleTarget r1, RuleTarget r2) {
        if (r1.applyProductType.equals("ALL") || r2.applyProductType.equals("ALL")) return true;
        
        try {
            Map<String, Object> v1 = objectMapper.readValue(r1.applyProductValue, Map.class);
            Map<String, Object> v2 = objectMapper.readValue(r2.applyProductValue, Map.class);
            
            if (r1.applyProductType.equals(r2.applyProductType)) {
                String key = r1.applyProductType.equals("CATEGORY") ? "categoryIds" : "productIds";
                List<Integer> ids1 = (List<Integer>) v1.get(key);
                List<Integer> ids2 = (List<Integer>) v2.get(key);
                return !Collections.disjoint(ids1, ids2);
            }
            // If one is CATEGORY and one is SPECIFIC, it's complex. Assume possible overlap for safety.
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
                Map<String, Object> v1 = objectMapper.readValue(r1.applyCustomerValue, Map.class);
                Map<String, Object> v2 = objectMapper.readValue(r2.applyCustomerValue, Map.class);
                List<Integer> g1 = (List<Integer>) v1.get("groupIds");
                List<Integer> g2 = (List<Integer>) v2.get("groupIds");
                return !Collections.disjoint(g1, g2);
            } catch (Exception e) {
                return true;
            }
        }
        
        return r1.applyCustomerType.equals(r2.applyCustomerType);
    }

    public Optional<PricingRule> findBestPricingRule(Integer productId, Integer categoryId, User user) {
        return pricingRuleRepository.findAll().stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .filter(r -> isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .filter(r -> isProductMatch(r.getApplyProductType(), r.getApplyProductValue(), productId, categoryId))
                .min(Comparator.comparing(PricingRule::getPriority));
    }

    public Optional<HidePriceRule> findBestHidePriceRule(Integer productId, Integer categoryId, User user) {
        return hidePriceRuleRepository.findAll().stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .filter(r -> isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .filter(r -> isProductMatch(r.getApplyProductType(), r.getApplyProductValue(), productId, categoryId))
                .min(Comparator.comparing(HidePriceRule::getPriority));
    }

    public Optional<SaleCampaign> findBestSaleCampaign(Integer productId, Integer categoryId, User user) {
        return saleCampaignRepository.findAll().stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                // For campaigns, if customer targeting is added later, check here. 
                // Currently campaigns have applyCustomerType as well.
                .filter(r -> isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .filter(r -> isProductMatch(r.getApplyProductType(), r.getApplyProductValue(), productId, categoryId))
                .min(Comparator.comparing(SaleCampaign::getPriority));
    }

    public Optional<TaxDisplayRule> findBestTaxRule(Integer productId, Integer categoryId, User user) {
        return taxDisplayRuleRepository.findAll().stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .filter(r -> isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .filter(r -> isProductMatch(r.getApplyProductType(), r.getApplyProductValue(), productId, categoryId))
                .min(Comparator.comparing(TaxDisplayRule::getPriority));
    }
}
