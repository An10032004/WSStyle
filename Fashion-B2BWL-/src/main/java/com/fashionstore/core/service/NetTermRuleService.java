package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.NetTermRuleRequest;
import com.fashionstore.core.dto.response.NetTermQuoteResponse;
import com.fashionstore.core.model.NetTermRule;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.NetTermRuleRepository;
import com.fashionstore.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NetTermRuleService {

    private final NetTermRuleRepository netTermRuleRepository;
    private final RuleCoreService ruleCoreService;
    private final UserRepository userRepository;

    public List<NetTermRule> getAllRules() {
        return netTermRuleRepository.findAll();
    }

    public NetTermRule getRuleById(Integer id) {
        return netTermRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Net term rule not found with id: " + id));
    }

    @Transactional
    public NetTermRule createRule(NetTermRuleRequest request) {
        request.setApplyCustomerType("GROUP");
        if (!ruleCoreService.isPriorityUnique("NET_TERM", request.getPriority(), -1)) {
            throw new RuntimeException("Priority " + request.getPriority() + " is already taken for NET Term Rules.");
        }
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
        request.setApplyCustomerType("GROUP");
        if (!ruleCoreService.isPriorityUnique("NET_TERM", request.getPriority(), id)) {
            throw new RuntimeException("Priority " + request.getPriority() + " is already taken for NET Term Rules.");
        }
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

    @Transactional(readOnly = true)
    public NetTermQuoteResponse quote(Integer userId) {
        if (userId == null) {
            return NetTermQuoteResponse.builder().eligible(false).build();
        }
        User user = userRepository.findByIdWithCustomerGroup(userId).orElse(null);
        if (user == null) {
            return NetTermQuoteResponse.builder().eligible(false).build();
        }

        List<NetTermRule> rules = netTermRuleRepository.findAll().stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .filter(r -> "GROUP".equals(r.getApplyCustomerType()))
                .sorted(Comparator.comparing(NetTermRule::getPriority, Comparator.nullsLast(Integer::compareTo)))
                .toList();

        for (NetTermRule rule : rules) {
            String val = rule.getApplyCustomerValue() != null ? rule.getApplyCustomerValue() : "{}";
            if (!ruleCoreService.isCustomerMatch("GROUP", val, user)) {
                continue;
            }
            return NetTermQuoteResponse.builder()
                    .eligible(true)
                    .netTermDays(rule.getNetTermDays())
                    .ruleName(rule.getName())
                    .build();
        }
        return NetTermQuoteResponse.builder().eligible(false).build();
    }
}
