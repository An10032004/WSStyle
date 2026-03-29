package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.OrderLimitRequest;
import com.fashionstore.core.model.OrderLimit;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.OrderLimitRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderLimitService {

    private final OrderLimitRepository orderLimitRepository;
    private final RuleCoreService ruleCoreService;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItemDTO {
        private Integer productId;
        private Integer categoryId;
        private Integer quantity;
        private BigDecimal price;
    }

    @Data
    @AllArgsConstructor
    public static class ValidationResult {
        private String ruleName;
        private boolean success;
        private String message;
    }

    public List<OrderLimit> getAllRules() {
        return orderLimitRepository.findAll();
    }

    public OrderLimit getRuleById(Integer id) {
        return orderLimitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order limit rule not found with id: " + id));
    }

    @Transactional
    public OrderLimit createRule(OrderLimitRequest request) {
        OrderLimit rule = OrderLimit.builder()
                .name(request.getName())
                .priority(request.getPriority())
                .status(request.getStatus())
                .limitLevel(request.getLimitLevel())
                .limitType(request.getLimitType())
                .applyCustomerType(request.getApplyCustomerType())
                .applyCustomerValue(request.getApplyCustomerValue())
                .excludeCustomerOption(request.getExcludeCustomerOption())
                .excludeCustomerValue(request.getExcludeCustomerValue())
                .applyProductType(request.getApplyProductType())
                .applyProductValue(request.getApplyProductValue())
                .excludeProductOption(request.getExcludeProductOption())
                .excludeProductValue(request.getExcludeProductValue())
                .limitValue(request.getLimitValue())
                .build();
        return orderLimitRepository.save(rule);
    }

    @Transactional
    public OrderLimit updateRule(Integer id, OrderLimitRequest request) {
        OrderLimit rule = getRuleById(id);
        rule.setName(request.getName());
        rule.setPriority(request.getPriority());
        rule.setStatus(request.getStatus());
        rule.setLimitLevel(request.getLimitLevel());
        rule.setLimitType(request.getLimitType());
        rule.setApplyCustomerType(request.getApplyCustomerType());
        rule.setApplyCustomerValue(request.getApplyCustomerValue());
        rule.setExcludeCustomerOption(request.getExcludeCustomerOption());
        rule.setExcludeCustomerValue(request.getExcludeCustomerValue());
        rule.setApplyProductType(request.getApplyProductType());
        rule.setApplyProductValue(request.getApplyProductValue());
        rule.setExcludeProductOption(request.getExcludeProductOption());
        rule.setExcludeProductValue(request.getExcludeProductValue());
        rule.setLimitValue(request.getLimitValue());
        return orderLimitRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Integer id) {
        orderLimitRepository.deleteById(id);
    }

    public List<ValidationResult> validateCart(User user, List<CartItemDTO> items) {
        List<OrderLimit> activeRules = orderLimitRepository.findAll().stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .collect(Collectors.toList());

        List<ValidationResult> results = new ArrayList<>();

        for (OrderLimit rule : activeRules) {
            // 1. Check Customer Match
            if (!ruleCoreService.isCustomerMatch(rule.getApplyCustomerType(), rule.getApplyCustomerValue(), user)) {
                continue;
            }

            // 2. Filter items that match the product targeting of this rule
            List<CartItemDTO> targetItems = items.stream()
                    .filter(item -> ruleCoreService.isProductMatch(rule.getApplyProductType(), rule.getApplyProductValue(), item.getProductId(), item.getCategoryId()))
                    .collect(Collectors.toList());

            if (targetItems.isEmpty() && !"ALL".equals(rule.getApplyProductType())) {
                continue;
            }

            // 3. Evaluate Rule
            if ("MIN_ORDER_QTY".equals(rule.getLimitType())) {
                int totalQty = targetItems.stream().mapToInt(CartItemDTO::getQuantity).sum();
                if (totalQty < rule.getLimitValue().intValue()) {
                    results.add(new ValidationResult(rule.getName(), false, 
                        "Tổng số lượng sản phẩm áp dụng hiện tại là " + totalQty + ", cần tối thiểu " + rule.getLimitValue() + " để đạt MOQ."));
                }
            } else if ("MIN_ORDER_VALUE".equals(rule.getLimitType())) {
                BigDecimal totalValue = targetItems.stream()
                        .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                if (totalValue.compareTo(rule.getLimitValue()) < 0) {
                    results.add(new ValidationResult(rule.getName(), false, 
                        "Tổng giá trị đơn hàng áp dụng là " + totalValue + " VNĐ, cần tối thiểu " + rule.getLimitValue() + " VNĐ để đạt MOV."));
                }
            }
        }

        return results;
    }
}
