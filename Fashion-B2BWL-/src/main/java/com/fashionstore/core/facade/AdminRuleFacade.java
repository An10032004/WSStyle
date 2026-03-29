package com.fashionstore.core.facade;

import com.fashionstore.core.dto.request.PricingRuleRequest;
import com.fashionstore.core.dto.request.ShippingRuleRequest;
import com.fashionstore.core.dto.request.OrderLimitRequest;
import com.fashionstore.core.dto.request.UserRequest;
import com.fashionstore.core.model.PricingRule;
import com.fashionstore.core.model.ShippingRule;
import com.fashionstore.core.model.OrderLimit;
import com.fashionstore.core.model.User;
import com.fashionstore.core.service.*;
import com.fashionstore.core.service.RuleCoreService.RuleTarget;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminRuleFacade {

    private final PricingRuleService pricingRuleService;
    private final ShippingRuleService shippingRuleService;
    private final OrderLimitService orderLimitService;
    private final UserService userService;
    private final RuleCoreService ruleCoreService;

    // --- Pricing Rules ---

    public PricingRule savePricingRule(PricingRuleRequest request, Integer id) {
        log.info("Facade: Orchestrating Pricing Rule save. Name: {}", request.getName());
        
        // 1. Conflict Check (Optional: Add enforcement logic here if needed)
        RuleTarget target = mapToRuleTarget(request.getName(), request.getPriority(), 
                request.getApplyProductType(), request.getApplyProductValue(),
                request.getApplyCustomerType(), request.getApplyCustomerValue());
        
        List<RuleTarget> existings = pricingRuleService.getAllRules().stream()
                .filter(r -> id == null || !r.getId().equals(id))
                .map(r -> mapToRuleTarget(r.getName(), r.getPriority(), 
                        r.getApplyProductType(), r.getApplyProductValue(),
                        r.getApplyCustomerType(), r.getApplyCustomerValue()))
                .collect(Collectors.toList());

        List<String> conflicts = ruleCoreService.detectConflicts(target, existings);
        if (!conflicts.isEmpty()) {
            log.warn("Rule Conflicts Detected for Pricing Rule '{}': {}", request.getName(), conflicts);
        }

        // 2. Delegate to Service
        return id != null ? pricingRuleService.updateRule(id, request) : pricingRuleService.createRule(request);
    }

    // --- Shipping Rules ---

    public ShippingRule saveShippingRule(ShippingRuleRequest request, Integer id) {
        log.info("Facade: Orchestrating Shipping Rule save. Name: {}", request.getName());

        RuleTarget target = mapToRuleTarget(request.getName(), request.getPriority(), 
                request.getApplyProductType(), request.getApplyProductValue(),
                request.getApplyCustomerType(), request.getApplyCustomerValue());

        List<RuleTarget> existings = shippingRuleService.getAllRules().stream()
                .filter(r -> id == null || !r.getId().equals(id))
                .map(r -> mapToRuleTarget(r.getName(), r.getPriority(), 
                        r.getApplyProductType(), r.getApplyProductValue(),
                        r.getApplyCustomerType(), r.getApplyCustomerValue()))
                .collect(Collectors.toList());

        List<String> conflicts = ruleCoreService.detectConflicts(target, existings);
        if (!conflicts.isEmpty()) {
            log.warn("Rule Conflicts Detected for Shipping Rule '{}': {}", request.getName(), conflicts);
        }

        return id != null ? shippingRuleService.updateRule(id, request) : shippingRuleService.createRule(request);
    }

    // --- Order Limits ---

    public OrderLimit saveOrderLimit(OrderLimitRequest request, Integer id) {
        return id != null ? orderLimitService.updateRule(id, request) : orderLimitService.createRule(request);
    }

    // --- Users ---

    public User saveUser(UserRequest request, Integer id) {
        // Here we could add logic to auto-assign default groups or validate roles
        return id != null ? userService.updateUser(id, request) : userService.createUser(request);
    }

    // --- Private Helpers ---

    private RuleTarget mapToRuleTarget(String name, Integer priority, String pType, String pVal, String cType, String cVal) {
        RuleTarget target = new RuleTarget();
        target.name = name;
        target.priority = priority;
        target.applyProductType = pType;
        target.applyProductValue = pVal;
        target.applyCustomerType = cType;
        target.applyCustomerValue = cVal;
        return target;
    }
}
