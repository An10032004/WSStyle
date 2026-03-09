package com.fashionstore.core.dto.request;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class OrderLimitRequest {
    private String name;
    private Integer priority;
    private String status;
    private String limitLevel;
    private String limitType;
    private String applyCustomerType;
    private String applyCustomerValue;
    private String excludeCustomerOption;
    private String excludeCustomerValue;
    private String applyProductType;
    private String applyProductValue;
    private String excludeProductOption;
    private String excludeProductValue;
    private BigDecimal limitValue;
}
