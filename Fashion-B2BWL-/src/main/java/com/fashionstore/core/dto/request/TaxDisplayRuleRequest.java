package com.fashionstore.core.dto.request;

import lombok.Data;

@Data
public class TaxDisplayRuleRequest {
    private String name;
    private Integer priority;
    private String status;
    private String taxDisplayType;
    private String displayType;
    private String designConfig;
    private String applyCustomerType;
    private String applyCustomerValue;
    private String applyProductType;
    private String applyProductValue;
}
