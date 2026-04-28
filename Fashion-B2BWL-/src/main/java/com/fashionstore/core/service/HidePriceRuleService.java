package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.HidePriceRuleRequest;
import com.fashionstore.core.model.HidePriceRule;
import com.fashionstore.core.repository.HidePriceRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class HidePriceRuleService {

    private static final Set<String> ALLOWED_CUSTOMER_TYPES =
            new HashSet<>(Arrays.asList("ALL", "GUEST", "LOGGED_IN", "GROUP"));

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
        validateHidePriceRuleRequest(request);
        if (!ruleCoreService.isPriorityUnique("HIDE_PRICE", request.getPriority(), -1)) {
            throw new IllegalArgumentException("Quy tắc trùng mức độ ưu tiên");
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
        validateHidePriceRuleRequest(request);
        if (!ruleCoreService.isPriorityUnique("HIDE_PRICE", request.getPriority(), id)) {
            throw new IllegalArgumentException("Quy tắc trùng mức độ ưu tiên");
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

    private void validateHidePriceRuleRequest(HidePriceRuleRequest request) {
        String name = request.getName() == null ? "" : request.getName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Tên quy tắc không được để trống");
        }
        request.setName(name);

        Integer priority = request.getPriority();
        if (priority == null || priority < 0) {
            throw new IllegalArgumentException("Dữ liệu không hợp lệ");
        }

        boolean hidePrice = Boolean.TRUE.equals(request.getHidePrice());
        boolean hideAddToCart = Boolean.TRUE.equals(request.getHideAddToCart());
        if (!hidePrice && !hideAddToCart) {
            throw new IllegalArgumentException("Quy tắc phải có ít nhất một hành động ẩn");
        }

        String customerType = request.getApplyCustomerType() == null ? "" : request.getApplyCustomerType().trim().toUpperCase();
        if (!ALLOWED_CUSTOMER_TYPES.contains(customerType)) {
            throw new IllegalArgumentException("Loại đối tượng không hợp lệ");
        }
    }
}
