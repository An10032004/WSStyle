package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.TaxDisplayRuleRequest;
import com.fashionstore.core.model.TaxDisplayRule;
import com.fashionstore.core.repository.TaxDisplayRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TaxDisplayRuleService {

    private final TaxDisplayRuleRepository taxDisplayRuleRepository;

    public List<TaxDisplayRule> getAllRules() {
        return taxDisplayRuleRepository.findAll();
    }

    public TaxDisplayRule getRuleById(Integer id) {
        return taxDisplayRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tax display rule not found with id: " + id));
    }

    @Transactional
    public TaxDisplayRule createRule(TaxDisplayRuleRequest request) {
        TaxDisplayRule rule = TaxDisplayRule.builder()
                .name(request.getName())
                .status(request.getStatus())
                .taxDisplayType(request.getTaxDisplayType())
                .displayType(request.getDisplayType())
                .designConfig(request.getDesignConfig())
                .applyCustomerType(request.getApplyCustomerType())
                .applyCustomerValue(request.getApplyCustomerValue())
                .applyProductType(request.getApplyProductType())
                .applyProductValue(request.getApplyProductValue())
                .build();
        return taxDisplayRuleRepository.save(rule);
    }

    @Transactional
    public TaxDisplayRule updateRule(Integer id, TaxDisplayRuleRequest request) {
        TaxDisplayRule rule = getRuleById(id);
        rule.setName(request.getName());
        rule.setStatus(request.getStatus());
        rule.setTaxDisplayType(request.getTaxDisplayType());
        rule.setDisplayType(request.getDisplayType());
        rule.setDesignConfig(request.getDesignConfig());
        rule.setApplyCustomerType(request.getApplyCustomerType());
        rule.setApplyCustomerValue(request.getApplyCustomerValue());
        rule.setApplyProductType(request.getApplyProductType());
        rule.setApplyProductValue(request.getApplyProductValue());
        return taxDisplayRuleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Integer id) {
        taxDisplayRuleRepository.deleteById(id);
    }
}
