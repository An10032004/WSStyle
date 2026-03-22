package com.fashionstore.core.dto.request;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PricingRuleRequest {
    private String name;
    private Integer priority;
    private String status;
    private String ruleType;
    private String applyCustomerType;
    private String applyCustomerValue;
    private String excludeCustomerOption;
    private String excludeCustomerValue;
    private String applyProductType;
    private String applyProductValue;
    private String excludeProductOption;
    private String excludeProductValue;
    private String actionConfig;
    private java.math.BigDecimal discountValue;
    private String discountType;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
}
