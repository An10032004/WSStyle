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
    private Integer productId;
    private Integer quantity;
    private BigDecimal unitPrice;
    private Integer appliedRuleId;
    /** Mô tả ưu đãi áp dụng khi đặt (lưu cùng đơn để đối chiếu khi reorder). */
    private String pricingNote;
}
