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
    private final com.fashionstore.core.repository.UserRepository userRepository;

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
                .priority(request.getPriority())
                .status(request.getStatus())
                .taxDisplayType(request.getTaxDisplayType())
                .displayType(request.getDisplayType())
                .designConfig(request.getDesignConfig())
                .applyCustomerType(request.getApplyCustomerType())
                .applyCustomerValue(request.getApplyCustomerValue())
                .applyProductType(request.getApplyProductType())
                .applyProductValue(request.getApplyProductValue())
                .discountRate(request.getDiscountRate())
                .build();
        return taxDisplayRuleRepository.save(rule);
    }

    @Transactional
    public TaxDisplayRule updateRule(Integer id, TaxDisplayRuleRequest request) {
        TaxDisplayRule rule = getRuleById(id);
        rule.setName(request.getName());
        rule.setPriority(request.getPriority());
        rule.setStatus(request.getStatus());
        rule.setTaxDisplayType(request.getTaxDisplayType());
        rule.setDisplayType(request.getDisplayType());
        rule.setDesignConfig(request.getDesignConfig());
        rule.setApplyCustomerType(request.getApplyCustomerType());
        rule.setApplyCustomerValue(request.getApplyCustomerValue());
        rule.setApplyProductType(request.getApplyProductType());
        rule.setApplyProductValue(request.getApplyProductValue());
        rule.setDiscountRate(request.getDiscountRate());
        return taxDisplayRuleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Integer id) {
        taxDisplayRuleRepository.deleteById(id);
    }

    public java.util.Map<String, Object> quoteTax(Integer userId, java.math.BigDecimal orderAmount) {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        if (orderAmount == null || orderAmount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            res.put("applied", false);
            res.put("taxAmount", 0);
            return res;
        }

        java.util.List<TaxDisplayRule> rules = taxDisplayRuleRepository.findAll();
        rules.sort((a,b) -> Integer.compare(b.getPriority(), a.getPriority()));

        com.fashionstore.core.model.User user = null;
        if (userId != null) {
            user = userRepository.findById(userId).orElse(null);
        }

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        for (TaxDisplayRule rule : rules) {
            if (!"ACTIVE".equals(rule.getStatus())) continue;
            
            boolean customerMatch = evaluateCustomerCondition(rule, user, mapper);
            if (customerMatch) {
                Double rate = rule.getDiscountRate() != null ? rule.getDiscountRate() : 0.0;
                java.math.BigDecimal taxAmount = orderAmount.multiply(java.math.BigDecimal.valueOf(rate / 100.0));
                
                res.put("applied", true);
                res.put("taxRate", rate);
                res.put("taxDisplayType", rule.getTaxDisplayType());
                res.put("taxAmount", taxAmount);
                return res;
            }
        }

        res.put("applied", false);
        res.put("taxAmount", 0);
        return res;
    }

    private boolean evaluateCustomerCondition(TaxDisplayRule rule, com.fashionstore.core.model.User user, com.fasterxml.jackson.databind.ObjectMapper mapper) {
        if (rule.getApplyCustomerType() == null || rule.getApplyCustomerType().equals("ALL")) {
            return true;
        }
        String customerType = rule.getApplyCustomerType();
        String customerValueStr = rule.getApplyCustomerValue();
        if (customerValueStr == null || customerValueStr.isEmpty() || customerValueStr.equals("{}")) {
             return false;
        }

        java.util.List<Integer> values = new java.util.ArrayList<>();
        try {
            java.util.Map<String, Object> valMap = mapper.readValue(customerValueStr, new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {});
            Object groupIdsObj = valMap.get("groupIds");
            if (groupIdsObj instanceof java.util.List) {
                for (Object idObj : (java.util.List<?>) groupIdsObj) {
                    if (idObj instanceof Integer) {
                        values.add((Integer) idObj);
                    } else if (idObj instanceof String) {
                        values.add(Integer.parseInt((String) idObj));
                    }
                }
            }
        } catch (Exception e) {
            return false;
        }

        if (user == null) {
            return "GUEST".equals(customerType);
        }

        if ("GROUP".equals(customerType)) {
            if (user.getCustomerGroup() != null) {
                return values.contains(user.getCustomerGroup().getId());
            }
        } 
        return false;
    }
}
