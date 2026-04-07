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
public class ShippingQuoteResponse {
    private BigDecimal fee;
    /** Phí theo khoảng trước khi áp dụng FREE/FLAT/PERCENTAGE */
    private BigDecimal tierFeeBeforeDiscount;
    private String ruleName;
    private String baseOn;
    /** Có quy tắc ACTIVE nào khớp loại khách không */
    private boolean matched;
}
