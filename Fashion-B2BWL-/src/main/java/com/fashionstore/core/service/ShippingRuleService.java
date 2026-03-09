package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.ShippingRuleRequest;
import com.fashionstore.core.model.ShippingRule;
import com.fashionstore.core.repository.ShippingRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShippingRuleService {

    private final ShippingRuleRepository shippingRuleRepository;

    public List<ShippingRule> getAllRules() {
        return shippingRuleRepository.findAll();
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
        return shippingRuleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Integer id) {
        shippingRuleRepository.deleteById(id);
    }
}
