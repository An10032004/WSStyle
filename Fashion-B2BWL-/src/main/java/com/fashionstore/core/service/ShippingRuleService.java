package com.fashionstore.core.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fashionstore.core.dto.request.ShippingRuleRequest;
import com.fashionstore.core.dto.response.ShippingQuoteResponse;
import com.fashionstore.core.model.ShippingRule;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.ShippingRuleRepository;
import com.fashionstore.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShippingRuleService {

    private final ShippingRuleRepository shippingRuleRepository;
    private final RuleCoreService ruleCoreService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<ShippingRule> getAllRules() {
        return shippingRuleRepository.findAll();
    }

    /**
     * Ước tính phí vận chuyển cho giỏ hàng / checkout: chỉ theo loại khách + tổng tiền (hoặc tổng SL),
     * không lọc theo sản phẩm (đồng bộ hiển thị storefront).
     */
    @Transactional(readOnly = true)
    public ShippingQuoteResponse quote(Integer userId, BigDecimal orderAmount, int totalQuantity) {
        BigDecimal amount = orderAmount != null ? orderAmount.max(BigDecimal.ZERO) : BigDecimal.ZERO;
        User user = null;
        if (userId != null) {
            user = userRepository.findByIdWithCustomerGroup(userId).orElse(null);
        }

        List<ShippingRule> rules = shippingRuleRepository.findAll().stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .sorted(Comparator.comparing(ShippingRule::getPriority, Comparator.nullsLast(Integer::compareTo)))
                .collect(Collectors.toList());

        for (ShippingRule rule : rules) {
            String custVal = rule.getApplyCustomerValue() != null ? rule.getApplyCustomerValue() : "{}";
            if (!ruleCoreService.isCustomerMatch(rule.getApplyCustomerType(), custVal, user)) {
                continue;
            }
            BigDecimal tier = resolveTierFee(rule, amount, totalQuantity);
            if (tier == null) {
                // Rule này không match khoảng phí nào -> thử rule kế tiếp theo priority.
                continue;
            }
            // Tạm thời: chỉ dùng phí theo khoảng (rateRanges), không áp chiết khấu phí ship trên quote/đơn.
            BigDecimal fee = tier;
            return ShippingQuoteResponse.builder()
                    .fee(fee.setScale(0, RoundingMode.HALF_UP))
                    .tierFeeBeforeDiscount(tier.setScale(0, RoundingMode.HALF_UP))
                    .ruleName(rule.getName())
                    .baseOn(rule.getBaseOn())
                    .matched(true)
                    .build();
        }

        return ShippingQuoteResponse.builder()
                .fee(BigDecimal.ZERO)
                .tierFeeBeforeDiscount(BigDecimal.ZERO)
                .matched(false)
                .build();
    }

    private BigDecimal resolveTierFee(ShippingRule rule, BigDecimal orderAmount, int totalQuantity) {
        String json = rule.getRateRanges();
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JsonNode arr = objectMapper.readTree(json);
            if (!arr.isArray()) {
                return null;
            }
            boolean amountBase = !"QUANTITY_RANGE".equals(rule.getBaseOn());
            BigDecimal val = amountBase ? orderAmount : BigDecimal.valueOf(totalQuantity);
            for (JsonNode node : arr) {
                BigDecimal from = readBound(node, "from", "min", BigDecimal.ZERO);
                BigDecimal to = readBound(node, "to", "max", new BigDecimal("999999999999999"));
                if (val.compareTo(from) >= 0 && val.compareTo(to) <= 0) {
                    JsonNode rateNode = node.get("rate");
                    if (rateNode == null || rateNode.isNull()) {
                        return BigDecimal.ZERO;
                    }
                    if (rateNode.isNumber()) {
                        return rateNode.decimalValue();
                    }
                    return new BigDecimal(rateNode.asText().replace(",", "").trim());
                }
            }
        } catch (Exception e) {
            log.warn("resolveTierFee: {}", e.getMessage());
        }
        return null;
    }

    private static BigDecimal readBound(JsonNode node, String a, String b, BigDecimal defaultVal) {
        if (node.has(a) && !node.get(a).isNull()) {
            return node.get(a).decimalValue();
        }
        if (node.has(b) && !node.get(b).isNull()) {
            return node.get(b).decimalValue();
        }
        return defaultVal;
    }

    public ShippingRule getRuleById(Integer id) {
        return shippingRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shipping rule not found with id: " + id));
    }

    @Transactional
    public ShippingRule createRule(ShippingRuleRequest request) {
        ShippingRule rule = ShippingRule.builder()
                .name(request.getName())
                .priority(request.getPriority())
                .status(request.getStatus())
                .baseOn(request.getBaseOn())
                .rateRanges(request.getRateRanges())
                .applyCustomerType(request.getApplyCustomerType())
                .applyCustomerValue(request.getApplyCustomerValue())
                .applyProductType(request.getApplyProductType())
                .applyProductValue(request.getApplyProductValue())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .build();
        return shippingRuleRepository.save(rule);
    }

    @Transactional
    public ShippingRule updateRule(Integer id, ShippingRuleRequest request) {
        ShippingRule rule = getRuleById(id);
        rule.setName(request.getName());
        rule.setPriority(request.getPriority());
        rule.setStatus(request.getStatus());
        rule.setBaseOn(request.getBaseOn());
        rule.setRateRanges(request.getRateRanges());
        rule.setApplyCustomerType(request.getApplyCustomerType());
        rule.setApplyCustomerValue(request.getApplyCustomerValue());
        rule.setApplyProductType(request.getApplyProductType());
        rule.setApplyProductValue(request.getApplyProductValue());
        rule.setDiscountType(request.getDiscountType());
        rule.setDiscountValue(request.getDiscountValue());
        return shippingRuleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Integer id) {
        shippingRuleRepository.deleteById(id);
    }
}
