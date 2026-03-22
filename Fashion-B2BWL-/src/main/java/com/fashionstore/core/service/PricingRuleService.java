package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.PricingRuleRequest;
import com.fashionstore.core.model.PricingRule;
import com.fashionstore.core.repository.PricingRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PricingRuleService {

    private final PricingRuleRepository pricingRuleRepository;

    public List<PricingRule> getAllRules() {
        return pricingRuleRepository.findAll();
    }

    public PricingRule getRuleById(Integer id) {
        return pricingRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pricing rule not found with id: " + id));
    }

    @Transactional
    public PricingRule createRule(PricingRuleRequest request) {
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
}
