package com.fashionstore.core.dto.request;

import lombok.Data;

@Data
public class ShippingRuleRequest {
    private String name;
    private Integer priority;
    private String status;
    private String baseOn;
    private String rateRanges;
}
