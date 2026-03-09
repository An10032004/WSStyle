package com.fashionstore.core.dto.request;

import lombok.Data;

@Data
public class NetTermRuleRequest {
    private String name;
    private Integer priority;
    private String status;
    private String applyCustomerType;
    private String applyCustomerValue;
    private String conditionType;
    private Integer netTermDays;
}
