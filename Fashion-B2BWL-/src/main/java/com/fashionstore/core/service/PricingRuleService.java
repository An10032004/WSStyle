package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.PricingRuleRequest;
import com.fashionstore.core.model.PricingRule;
import com.fashionstore.core.repository.PricingRuleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PricingRuleService {

    private final PricingRuleRepository pricingRuleRepository;
    private final RuleCoreService ruleCoreService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<PricingRule> getAllRules() {
        return pricingRuleRepository.findAll();
    }

    public PricingRule getRuleById(Integer id) {
        return pricingRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pricing rule not found with id: " + id));
    }

    @Transactional
    public PricingRule createRule(PricingRuleRequest request) {
        validatePricingRuleRequest(request);
        if (!ruleCoreService.isPriorityUnique("PRICING", request.getPriority(), -1)) {
            throw new IllegalArgumentException("Mức độ ưu tiên đã tồn tại.");
        }
        PricingRule rule = PricingRule.builder()
                .name(request.getName())
                .priority(request.getPriority())
                .status(request.getStatus())
                .ruleType(request.getRuleType())
                .applyCustomerType(request.getApplyCustomerType())
                .applyCustomerValue(request.getApplyCustomerValue())
                .excludeCustomerOption(request.getExcludeCustomerOption())
                .excludeCustomerValue(request.getExcludeCustomerValue())
                .applyProductType(request.getApplyProductType())
                .applyProductValue(request.getApplyProductValue())
                .excludeProductOption(request.getExcludeProductOption())
                .excludeProductValue(request.getExcludeProductValue())
                .actionConfig(request.getActionConfig())
                .discountValue(request.getDiscountValue())
                .discountType(request.getDiscountType())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .build();
        return pricingRuleRepository.save(rule);
    }

    @Transactional
    public PricingRule updateRule(Integer id, PricingRuleRequest request) {
        validatePricingRuleRequest(request);
        if (!ruleCoreService.isPriorityUnique("PRICING", request.getPriority(), id)) {
            throw new IllegalArgumentException("Mức độ ưu tiên đã tồn tại.");
        }
        PricingRule rule = getRuleById(id);
        rule.setName(request.getName());
        rule.setPriority(request.getPriority());
        rule.setStatus(request.getStatus());
        rule.setRuleType(request.getRuleType());
        rule.setApplyCustomerType(request.getApplyCustomerType());
        rule.setApplyCustomerValue(request.getApplyCustomerValue());
        rule.setExcludeCustomerOption(request.getExcludeCustomerOption());
        rule.setExcludeCustomerValue(request.getExcludeCustomerValue());
        rule.setApplyProductType(request.getApplyProductType());
        rule.setApplyProductValue(request.getApplyProductValue());
        rule.setExcludeProductOption(request.getExcludeProductOption());
        rule.setExcludeProductValue(request.getExcludeProductValue());
        rule.setActionConfig(request.getActionConfig());
        rule.setDiscountValue(request.getDiscountValue());
        rule.setDiscountType(request.getDiscountType());
        rule.setStartDate(request.getStartDate());
        rule.setEndDate(request.getEndDate());
        return pricingRuleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Integer id) {
        pricingRuleRepository.deleteById(id);
    }

    private void validatePricingRuleRequest(PricingRuleRequest request) {
        String name = request.getName() == null ? "" : request.getName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập tên quy tắc.");
        }
        request.setName(name);

        Integer priority = request.getPriority();
        if (priority == null || priority < 0) {
            throw new IllegalArgumentException("Vui lòng nhập mức độ ưu tiên hợp lệ (>= 0).");
        }

        String ruleType = request.getRuleType() == null ? "" : request.getRuleType().trim().toUpperCase();
        if (ruleType.isEmpty()) {
            throw new IllegalArgumentException("Thiếu loại quy tắc.");
        }
        validateApplyTarget(request);

        if ("B2B_PRICE".equals(ruleType)) {
            validateB2BDiscount(request);
            return;
        }
        if ("QUANTITY_BREAK".equals(ruleType)) {
            validateQuantityBreakConfig(request.getActionConfig());
        }
    }

    private void validateB2BDiscount(PricingRuleRequest request) {
        BigDecimal discountValue = request.getDiscountValue();
        if (discountValue == null || discountValue.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Chiết khấu không hợp lệ");
        }
        String discountType = request.getDiscountType() == null ? "" : request.getDiscountType().trim().toUpperCase();
        if (discountType.isEmpty()) {
            throw new IllegalArgumentException("Thiếu loại chiết khấu.");
        }
        if ("PERCENTAGE".equals(discountType) && discountValue.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Chiết khấu không hợp lệ");
        }
    }

    private void validateApplyTarget(PricingRuleRequest request) {
        String applyType = request.getApplyProductType() == null ? "" : request.getApplyProductType().trim().toUpperCase();
        if ("CATEGORY".equals(applyType) || "GROUP".equals(applyType)) {
            try {
                JsonNode node = objectMapper.readTree(request.getApplyProductValue() == null ? "{}" : request.getApplyProductValue());
                JsonNode ids = node.path("categoryIds");
                if (!ids.isArray() || ids.isEmpty()) {
                    throw new IllegalArgumentException("Phải chọn đối tượng áp dụng");
                }
            } catch (IllegalArgumentException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new IllegalArgumentException("Phải chọn đối tượng áp dụng");
            }
            return;
        }
        if ("SPECIFIC".equals(applyType)) {
            try {
                JsonNode node = objectMapper.readTree(request.getApplyProductValue() == null ? "{}" : request.getApplyProductValue());
                JsonNode productIds = node.path("productIds");
                JsonNode variantIds = node.path("variantIds");
                boolean hasProducts = productIds.isArray() && !productIds.isEmpty();
                boolean hasVariants = variantIds.isArray() && !variantIds.isEmpty();
                if (!hasProducts && !hasVariants) {
                    throw new IllegalArgumentException("Phải chọn đối tượng áp dụng");
                }
            } catch (IllegalArgumentException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new IllegalArgumentException("Phải chọn đối tượng áp dụng");
            }
        }
    }

    private void validateQuantityBreakConfig(String actionConfig) {
        if (actionConfig == null || actionConfig.isBlank()) {
            throw new IllegalArgumentException("Cấu hình JSON không hợp lệ");
        }
        try {
            JsonNode root = objectMapper.readTree(actionConfig);
            JsonNode brackets = root.path("brackets");
            if (!brackets.isArray() || brackets.isEmpty()) {
                throw new IllegalArgumentException("Cấu hình JSON không hợp lệ");
            }

            Integer prevMax = null;
            for (JsonNode b : brackets) {
                JsonNode minNode = b.get("min");
                if (minNode == null || !minNode.isNumber() || minNode.asInt() < 1) {
                    throw new IllegalArgumentException("Mốc số lượng không hợp lệ");
                }

                int min = minNode.asInt();
                JsonNode maxNode = b.get("max");
                Integer max = null;
                if (maxNode != null && !maxNode.isNull()) {
                    if (!maxNode.isNumber() || maxNode.asInt() < min) {
                        throw new IllegalArgumentException("Mốc số lượng không hợp lệ");
                    }
                    max = maxNode.asInt();
                }

                if (prevMax != null && min <= prevMax) {
                    throw new IllegalArgumentException("Dải số lượng không được chồng lấn");
                }

                JsonNode discountNode = b.get("discount");
                if (discountNode == null || !discountNode.isNumber()) {
                    throw new IllegalArgumentException("Chiết khấu không hợp lệ");
                }
                BigDecimal discount = discountNode.decimalValue();
                if (discount.compareTo(BigDecimal.ZERO) <= 0 || discount.compareTo(BigDecimal.valueOf(100)) > 0) {
                    throw new IllegalArgumentException("Chiết khấu không hợp lệ");
                }

                prevMax = max;
            }
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Cấu hình JSON không hợp lệ");
        }
    }
}
