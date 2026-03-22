package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.RuleConflictRequest;
import com.fashionstore.core.repository.PricingRuleRepository;
import com.fashionstore.core.repository.ShippingRuleRepository;
import com.fashionstore.core.repository.CouponRepository;
import com.fashionstore.core.repository.SaleCampaignRepository;
import com.fashionstore.core.service.RuleCoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rules/conflicts")
@RequiredArgsConstructor
public class RuleConflictController {

    private final RuleCoreService ruleCoreService;
    private final PricingRuleRepository pricingRuleRepository;
    private final ShippingRuleRepository shippingRuleRepository;
    private final CouponRepository couponRepository;
    private final SaleCampaignRepository saleCampaignRepository;

    @PostMapping("/check")
    public ResponseEntity<List<String>> checkConflicts(@RequestBody RuleConflictRequest request) {
        List<RuleCoreService.RuleTarget> existingRules = fetchExistingRules(request.getRuleType());
        List<String> conflicts = ruleCoreService.detectConflicts(request.getNewRule(), existingRules);
        return ResponseEntity.ok(conflicts);
    }

    private List<RuleCoreService.RuleTarget> fetchExistingRules(String ruleType) {
        switch (ruleType.toUpperCase()) {
            case "PRICING":
                return pricingRuleRepository.findAll().stream()
                        .map(r -> mapToTarget(r.getName(), r.getApplyProductType(), r.getApplyProductValue(), r.getApplyCustomerType(), r.getApplyCustomerValue(), r.getPriority()))
                        .collect(Collectors.toList());
            case "SHIPPING":
                return shippingRuleRepository.findAll().stream()
                        .map(r -> mapToTarget(r.getName(), r.getApplyProductType(), r.getApplyProductValue(), r.getApplyCustomerType(), r.getApplyCustomerValue(), r.getPriority()))
                        .collect(Collectors.toList());
            case "COUPON":
                return couponRepository.findAll().stream()
                        .map(r -> mapToTarget(r.getCode(), r.getApplyProductType(), r.getApplyProductValue(), r.getApplyCustomerType(), r.getApplyCustomerValue(), 0)) // Coupons might not have priority yet
                        .collect(Collectors.toList());
            case "CAMPAIGN":
                return saleCampaignRepository.findAll().stream()
                        .map(r -> mapToTarget(r.getName(), r.getApplyProductType(), r.getApplyProductValue(), "ALL", "{}", r.getPriority()))
                        .collect(Collectors.toList());
            default:
                return List.of();
        }
    }

    private RuleCoreService.RuleTarget mapToTarget(String name, String pType, String pVal, String cType, String cVal, Integer priority) {
        RuleCoreService.RuleTarget target = new RuleCoreService.RuleTarget();
        target.name = name;
        target.applyProductType = pType;
        target.applyProductValue = pVal;
        target.applyCustomerType = cType;
        target.applyCustomerValue = cVal;
        target.priority = priority != null ? priority : 99;
        return target;
    }
}
