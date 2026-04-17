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
    /** Phí áp dụng theo {@code shippingSelection} (RULE / STANDARD / EXPRESS). */
    private BigDecimal fee;
    /** Phí theo khoảng trước khi áp dụng FREE/FLAT/PERCENTAGE */
    private BigDecimal tierFeeBeforeDiscount;
    private String ruleName;
    private String baseOn;
    /** Có quy tắc shipping rule ACTIVE nào khớp loại khách và khoảng giá không */
    private boolean matched;

    /** Phí nếu chọn RULE (giống {@link #fee} khi selection = RULE) */
    private BigDecimal ruleFee;

    private boolean zoneMatched;
    private Integer zoneId;
    private String zoneName;
    private BigDecimal zoneStandardFee;
    private BigDecimal zoneExpressFee;
}
