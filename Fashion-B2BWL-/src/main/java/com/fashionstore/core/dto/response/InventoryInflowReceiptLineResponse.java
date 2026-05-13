package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryInflowReceiptLineResponse {
    private Long lineId;
    private Integer variantId;
    private String sku;
    private Integer quantity;
    private BigDecimal costPrice;
}
