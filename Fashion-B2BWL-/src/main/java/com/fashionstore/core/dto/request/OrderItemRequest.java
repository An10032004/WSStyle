package com.fashionstore.core.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemRequest {
    private Integer variantId;
    private Integer quantity;
    private BigDecimal unitPrice;
    private Integer appliedRuleId;
}
