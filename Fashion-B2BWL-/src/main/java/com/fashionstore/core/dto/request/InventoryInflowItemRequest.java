package com.fashionstore.core.dto.request;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class InventoryInflowItemRequest {
    private Integer variantId;
    private Integer quantity;
    private BigDecimal costPrice;
}
