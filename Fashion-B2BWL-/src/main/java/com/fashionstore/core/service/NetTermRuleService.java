package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.NetTermRuleRequest;
import com.fashionstore.core.model.NetTermRule;
import com.fashionstore.core.repository.NetTermRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NetTermRuleService {

    private final NetTermRuleRepository netTermRuleRepository;

    public List<NetTermRule> getAllRules() {
        return netTermRuleRepository.findAll();
    }

    public NetTermRule getRuleById(Integer id) {
        return netTermRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Net term rule not found with id: " + id));
    }

    @Transactional
    public NetTermRule createRule(NetTermRuleRequest request) {
        NetTermRule rule = NetTermRule.builder()
                .name(request.getName())
                .priority(request.getPriority())
                .status(request.getStatus())
                .applyCustomerType(request.getApplyCustomerType())
                .applyCustomerValue(request.getApplyCustomerValue())
                .conditionType(request.getConditionType())
                .netTermDays(request.getNetTermDays())
                .build();
        return netTermRuleRepository.save(rule);
    }

    @Transactional
    public NetTermRule updateRule(Integer id, NetTermRuleRequest request) {
        NetTermRule rule = getRuleById(id);
        rule.setName(request.getName());
        rule.setPriority(request.getPriority());
        rule.setStatus(request.getStatus());
        rule.setApplyCustomerType(request.getApplyCustomerType());
        rule.setApplyCustomerValue(request.getApplyCustomerValue());
        rule.setConditionType(request.getConditionType());
        rule.setNetTermDays(request.getNetTermDays());
        return netTermRuleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Integer id) {
        netTermRuleRepository.deleteById(id);
    }
}
