package com.fashionstore.core.dto.request;

import lombok.Data;

@Data
public class HidePriceRuleRequest {
    private String name;
    private Integer priority;
    private String status;
    private Boolean hidePrice;
    private Boolean hideAddToCart;
    private String replacementText;
    private String applyCustomerType;
    private String applyCustomerValue;
    private String applyProductType;
    private String applyProductValue;
}
