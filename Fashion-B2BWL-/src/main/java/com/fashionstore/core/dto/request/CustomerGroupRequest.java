package com.fashionstore.core.dto.request;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CustomerGroupRequest {
    private String name;
    private BigDecimal defaultDiscountRate;
}
