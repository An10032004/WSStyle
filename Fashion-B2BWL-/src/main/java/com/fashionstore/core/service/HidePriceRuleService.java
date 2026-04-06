package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.HidePriceRuleRequest;
import com.fashionstore.core.model.HidePriceRule;
import com.fashionstore.core.repository.HidePriceRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HidePriceRuleService {

    private final HidePriceRuleRepository hidePriceRuleRepository;
    private final RuleCoreService ruleCoreService;

    public List<HidePriceRule> getAllRules() {
        return hidePriceRuleRepository.findAll();
    }

    public HidePriceRule getRuleById(Integer id) {
        return hidePriceRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hide price rule not found with id: " + id));
    }

    @Transactional
    public HidePriceRule createRule(HidePriceRuleRequest request) {
        if (!ruleCoreService.isPriorityUnique("HIDE_PRICE", request.getPriority(), -1)) {
            throw new RuntimeException("Priority " + request.getPriority() + " is already taken for Hide Price Rules.");
        }
        HidePriceRule rule = HidePriceRule.builder()
                .name(request.getName())
                .priority(request.getPriority())
                .status(request.getStatus())
                .hidePrice(request.getHidePrice())
                .hideAddToCart(request.getHideAddToCart())
                .replacementText(request.getReplacementText())
                .applyCustomerType(request.getApplyCustomerType())
                .applyCustomerValue(request.getApplyCustomerValue())
                .applyProductType(request.getApplyProductType())
                .applyProductValue(request.getApplyProductValue())
                .build();
        return hidePriceRuleRepository.save(rule);
    }

    @Transactional
    public HidePriceRule updateRule(Integer id, HidePriceRuleRequest request) {
        if (!ruleCoreService.isPriorityUnique("HIDE_PRICE", request.getPriority(), id)) {
            throw new RuntimeException("Priority " + request.getPriority() + " is already taken for Hide Price Rules.");
        }
        HidePriceRule rule = getRuleById(id);
        rule.setName(request.getName());
        rule.setPriority(request.getPriority());
        rule.setStatus(request.getStatus());
        rule.setHidePrice(request.getHidePrice());
        rule.setHideAddToCart(request.getHideAddToCart());
        rule.setReplacementText(request.getReplacementText());
        rule.setApplyCustomerType(request.getApplyCustomerType());
        rule.setApplyCustomerValue(request.getApplyCustomerValue());
        rule.setApplyProductType(request.getApplyProductType());
        rule.setApplyProductValue(request.getApplyProductValue());
        return hidePriceRuleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Integer id) {
        hidePriceRuleRepository.deleteById(id);
    }
}
