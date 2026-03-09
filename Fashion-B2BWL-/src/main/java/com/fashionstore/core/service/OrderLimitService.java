package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.OrderLimitRequest;
import com.fashionstore.core.model.OrderLimit;
import com.fashionstore.core.repository.OrderLimitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderLimitService {

    private final OrderLimitRepository orderLimitRepository;

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
}
