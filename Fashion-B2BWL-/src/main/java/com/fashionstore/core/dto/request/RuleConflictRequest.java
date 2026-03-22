package com.fashionstore.core.dto.request;

import com.fashionstore.core.service.RuleCoreService;
import lombok.Data;

@Data
public class RuleConflictRequest {
    private String ruleType;
    private RuleCoreService.RuleTarget newRule;
}
